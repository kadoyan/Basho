# トラブルシューティングガイド

## ログインできない問題

### 症状
- ログインボタンを押すと「処理中...」になる
- その後、またログイン画面に戻る
- エラーメッセージが表示されない

### 診断手順

#### 1. ブラウザの開発者ツールを開く
- Chrome/Edge: F12
- Safari: Command + Option + I
- Firefox: F12

#### 2. Consoleタブでログを確認

**期待されるログ:**
```
✅ AWS Amplify configured successfully
🔐 SignIn result: {...}
🔐 isSignedIn: true
✅ Current user: {...}
```

**問題がある場合のログ:**
```
🔐 SignIn result: {...}
🔐 isSignedIn: false
🔐 nextStep: {...}
⚠️ Additional step required: CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED
```

---

## よくある問題と解決策

### 問題1: `isSignedIn: false` - 初回ログインでパスワード変更が必要

**原因:**
Cognitoで管理者が作成したユーザーは、初回ログイン時に強制的にパスワード変更が必要です。

**解決策A: AWS Consoleで強制パスワード変更を無効化**

1. AWS Console → Cognito → User Pools → あなたのプール
2. Users and groups → ユーザーを選択
3. **Reset password** または **Confirm user**
4. 新しいパスワードを設定（パスワード要件を満たす必要があります）

**解決策B: アプリ側で新パスワード設定フローを実装**

`src/stores/auth.js` に追加:

```javascript
// 新しいパスワードを設定
const completeNewPassword = async (newPassword) => {
  try {
    const result = await confirmSignIn({
      challengeResponse: newPassword
    })

    if (result.isSignedIn) {
      await checkAuth()
      isAuthenticated.value = true
      return true
    }
    return false
  } catch (err) {
    console.error('Complete new password error:', err)
    return false
  }
}
```

---

### 問題2: MFA（多要素認証）が有効

**ログ:**
```
⚠️ Additional step required: CONFIRM_SIGN_IN_WITH_TOTP_CODE
```

**解決策:**
Cognitoコンソールでユーザーまたはプール全体のMFAを無効化

---

### 問題3: メール確認が未完了

**ログ:**
```
❌ Login error: User is not confirmed
```

**解決策:**

1. **確認コードを再送信:**
   ```bash
   aws cognito-idp resend-confirmation-code \
     --client-id YOUR_CLIENT_ID \
     --username user@example.com
   ```

2. **管理者が確認:**
   AWS Console → Cognito → Users → ユーザー選択 → **Confirm user**

---

### 問題4: 認証状態が保存されない

**症状:**
ログインは成功するが、`isAuthenticated` が `true` にならない

**デバッグ:**
```javascript
// src/stores/auth.js の login() 関数を確認
console.log('🔐 isSignedIn:', result.isSignedIn)
console.log('🔐 isAuthenticated:', isAuthenticated.value)
```

**解決策:**
[src/stores/auth.js:55-58](src/stores/auth.js:55-58) を確認:

```javascript
if (result.isSignedIn) {
  await checkAuth()
  isAuthenticated.value = true  // ← これが追加されているか確認
  return true
}
```

---

### 問題5: Amplify設定のタイミング問題

**ログ:**
```
Warning: Amplify has not been configured
```

**解決策:**
すでに修正済みですが、確認のため:

1. `src/main.js` で Amplify.configure() が呼ばれているか
2. `src/stores/auth.js` の `configured` フラグが `true` になっているか
3. `src/App.vue` の `watch` が動作しているか

---

## デバッグコマンド

### ブラウザコンソールでストアの状態を確認

```javascript
// Pinia devtools がある場合
window.$pinia._s.get('auth')

// または直接
import { useAuthStore } from './stores/auth'
const authStore = useAuthStore()
console.log({
  isAuthenticated: authStore.isAuthenticated,
  user: authStore.user,
  configured: authStore.configured,
  error: authStore.error
})
```

### localStorage/sessionStorageを確認

```javascript
// Cognitoのトークンを確認
Object.keys(localStorage).filter(k => k.includes('CognitoIdentityServiceProvider'))
```

---

## Cognitoユーザーの作成方法（推奨）

### 方法1: コンソールで作成（管理者用）

```
1. Cognito User Pool → Users → Create user
2. Email: user@example.com
3. Temporary password: TempPass123!
4. ✅ Mark email as verified
5. ✅ Send an invitation message (optional)
```

**注意:** ユーザーは初回ログイン時にパスワード変更が必要

---

### 方法2: アプリから登録（エンドユーザー用）

アプリの「新規登録」ボタンを使用:

1. メールアドレスとパスワードを入力
2. 確認コードがメールで送信される
3. 確認コード入力画面を実装する（TODO）

---

## 現在の制限事項

このアプリは現在、以下の機能が未実装です：

- [ ] 確認コード入力画面
- [ ] 強制パスワード変更フロー
- [ ] MFAサポート
- [ ] パスワードリセット
- [ ] ログアウト後のセッション管理

これらの機能が必要な場合は、追加実装が必要です。

---

## 推奨設定（開発中）

### Cognito User Pool設定

```yaml
MFA: OFF
Password policy: Custom (最小要件)
Email verification: Required
Sign-up: Allow users to sign themselves up
Attributes: email (required)
```

### App Client設定

```yaml
Auth flows:
  ✅ ALLOW_USER_PASSWORD_AUTH
  ✅ ALLOW_REFRESH_TOKEN_AUTH
  ✅ ALLOW_USER_SRP_AUTH

Generate client secret: ❌ NO

Prevent user existence errors: Enabled (recommended)
```

---

## サポート

問題が解決しない場合:

1. ブラウザのコンソールログをすべてコピー
2. Cognitoユーザーの状態を確認（Confirmed/Unconfirmed）
3. CognitoのCloudWatch Logsを確認

ログを提供していただければ、より具体的なアドバイスが可能です。
