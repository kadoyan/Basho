import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

// 1. アプリとPiniaを作成
const app = createApp(App)
const pinia = createPinia()

// 2. Piniaを先に登録（重要！）
app.use(pinia)

// 3. アプリをマウント
app.mount('#app')

// 4. Piniaが初期化された後にストアを使用してAWS設定を初期化
import { useAuthStore } from './stores/auth'

// AWS設定を読み込んで初期化（非同期で実行）
const initAWS = async () => {
  try {
    const { awsConfig } = await import('./config/aws-config.js')
    const authStore = useAuthStore()

    // Amplify全体の設定（AuthとAPIの両方）
    import('aws-amplify').then(({ Amplify }) => {
      Amplify.configure(awsConfig)
      authStore.configured = true
      console.log('✅ AWS Amplify configured successfully')
    })
  } catch (err) {
    console.warn('⚠️  AWS config not found.')
    console.warn('📝 Please create src/config/aws-config.js')
    console.warn('💡 Copy from src/config/aws-config.example.js and fill in your values')
  }
}

// AWS初期化を実行（アプリの起動をブロックしない）
initAWS()
