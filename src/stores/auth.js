import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Amplify } from 'aws-amplify'
import { signIn, signUp, signOut, getCurrentUser, fetchAuthSession, confirmSignUp, resendSignUpCode } from 'aws-amplify/auth'
import { masterKeyService } from '../services/masterKey'
import { dynamoDBService } from '../services/dynamodb'

export const useAuthStore = defineStore('auth', () => {
  const isAuthenticated = ref(false)
  const user = ref(null)
  const error = ref(null)
  const loading = ref(false)
  const configured = ref(false)

  // AWS Amplifyの設定（後で設定ファイルから読み込む）
  const configureAmplify = (config) => {
    Amplify.configure({
      Auth: {
        Cognito: config
      }
    })
    configured.value = true
  }

  // 認証状態の確認
  const checkAuth = async () => {
    // Amplifyが設定されていない場合はスキップ
    if (!configured.value) {
      console.log('⏳ Waiting for AWS Amplify configuration...')
      return
    }

    try {
      const currentUser = await getCurrentUser()
      console.log('✅ Current user:', currentUser)
      user.value = currentUser
      isAuthenticated.value = true
    } catch (err) {
      console.log('ℹ️ No authenticated user:', err.message)
      isAuthenticated.value = false
      user.value = null
    }
  }

  // ログイン
  const login = async (email, password) => {
    loading.value = true
    error.value = null
    try {
      const result = await signIn({
        username: email,
        password: password
      })

      console.log('🔐 SignIn result:', result)
      console.log('🔐 isSignedIn:', result.isSignedIn)
      console.log('🔐 nextStep:', result.nextStep)

      if (result.isSignedIn) {
        await checkAuth()

        // ユーザーIDを取得
        const currentUser = await getCurrentUser()
        const userId = currentUser.userId

        // マスターキーを取得して復号化
        try {
          const masterKeyData = await dynamoDBService.getMasterKey()
          if (masterKeyData && masterKeyData.wrappedKey && masterKeyData.iv) {
            // マスターキーをアンラップ（復号化）
            await masterKeyService.loginUser(
              masterKeyData.wrappedKey,
              masterKeyData.iv,
              password,
              userId
            )
            console.log('🔑 Master key loaded successfully')
          } else {
            // マスターキーが存在しない場合は新規作成（初回ログイン時）
            console.log('🔑 No master key found, creating new one...')
            const wrapped = await masterKeyService.setupNewUser(password, userId)
            await dynamoDBService.saveMasterKey(wrapped.wrappedKey, wrapped.iv)
            console.log('🔑 Master key created and saved successfully')
          }
        } catch (keyErr) {
          console.error('❌ Failed to load/create master key:', keyErr)
          // マスターキーの読み込みに失敗してもログインは成功とする
        }

        isAuthenticated.value = true
        return true
      }

      // isSignedIn が false の場合、追加のステップが必要
      if (result.nextStep) {
        console.warn('⚠️ Additional step required:', result.nextStep)
        error.value = `追加の認証が必要です: ${result.nextStep.signInStep}`
        return false
      }

      return false
    } catch (err) {
      error.value = err.message || 'ログインに失敗しました'
      console.error('❌ Login error:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  // サインアップ
  const signup = async (email, password) => {
    loading.value = true
    error.value = null
    try {
      await signUp({
        username: email,
        password: password,
        options: {
          userAttributes: {
            email: email
          }
        }
      })

      return true
    } catch (err) {
      error.value = err.message || '登録に失敗しました'
      console.error('Signup error:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  // ログアウト
  const logout = async () => {
    try {
      await signOut()
      isAuthenticated.value = false
      user.value = null

      // マスターキーをクリア
      masterKeyService.clearMasterKey()
      console.log('🔑 Master key cleared')
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  // IDトークンの取得
  const getIdToken = async () => {
    try {
      const session = await fetchAuthSession()
      return session.tokens?.idToken?.toString()
    } catch (err) {
      console.error('Get token error:', err)
      return null
    }
  }

  // サインアップの確認（確認コード入力）
  const confirmSignup = async (email, code) => {
    loading.value = true
    error.value = null
    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code
      })
      return true
    } catch (err) {
      error.value = err.message || '確認に失敗しました'
      console.error('Confirm signup error:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  // 確認コードを再送信
  const resendConfirmationCode = async (email) => {
    loading.value = true
    error.value = null
    try {
      await resendSignUpCode({
        username: email
      })
      return true
    } catch (err) {
      error.value = err.message || '確認コードの再送信に失敗しました'
      console.error('Resend code error:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  return {
    isAuthenticated,
    user,
    error,
    loading,
    configured,
    configureAmplify,
    checkAuth,
    login,
    signup,
    logout,
    getIdToken,
    confirmSignup,
    resendConfirmationCode
  }
})
