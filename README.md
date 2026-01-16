# Location Logger

位置情報を記録・管理するWebアプリケーション。クライアントサイド暗号化により、位置情報をセキュアに保存します。

## 機能

- 📍 **位置情報記録**: ボタンを押すだけで現在地、向き、時刻を記録
- 💬 **コメント機能**: 各記録にあとからコメントを追加可能
- 🗺️ **Google Maps連携**: 記録した位置をGoogle Mapで開ける
- 🔐 **セキュア**: クライアントサイドでAES-GCM暗号化
- ☁️ **クラウド同期**: DynamoDBとの自動同期
- 🔒 **認証**: AWS Cognitoによるメール/パスワード認証
- 💾 **オフライン対応**: IndexedDBでローカルに保存

## 技術スタック

### フロントエンド
- **Vue 3** - Composition API
- **Tailwind CSS** - スタイリング
- **Pinia** - 状態管理
- **Vite** - ビルドツール

### バックエンド/インフラ
- **AWS Cognito** - ユーザー認証（メール確認対応）
- **AWS DynamoDB** - データベース（テーブル名: LocationRecords）
- **AWS API Gateway** - REST API
- **AWS Lambda** - サーバーレス関数（Node.js 20.x）
- **AWS S3 + CloudFront** - 静的ホスティング + CDN

### セキュリティ
- **Web Crypto API** - クライアントサイド暗号化
- **AES-GCM** - 暗号化アルゴリズム
- **IndexedDB** - 暗号化キーの安全な保存

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. AWS設定

#### 2.1 AWS Cognitoのセットアップ

1. AWS Management ConsoleでCognitoユーザープールを作成
2. アプリクライアントを作成（クライアントシークレットなし）
3. メール認証を有効化

#### 2.2 DynamoDBのセットアップ

テーブル名: `LocationRecords`

パーティションキー: `userId` (String)
ソートキー: `recordId` (String)

グローバルセカンダリインデックス:
- インデックス名: `timestamp-index`
- パーティションキー: `userId`
- ソートキー: `timestamp` (Number)

#### 2.3 API Gatewayのセットアップ

Lambda関数の例:

```javascript
// GET /records - 記録一覧を取得
exports.getRecords = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  // DynamoDBから取得
};

// POST /records - 記録を保存
exports.saveRecord = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const body = JSON.parse(event.body);
  // DynamoDBに保存
};

// DELETE /records/{id} - 記録を削除
exports.deleteRecord = async (event) => {
  const userId = event.requestContext.authorizer.claims.sub;
  const recordId = event.pathParameters.id;
  // DynamoDBから削除
};
```

#### 2.4 AWS設定ファイルの作成

`public/aws-config.json` を作成:

```json
{
  "userPoolId": "ap-northeast-1_XXXXXXXXX",
  "userPoolClientId": "xxxxxxxxxxxxxxxxxxxxxxxxxx",
  "region": "ap-northeast-1",
  "apiEndpoint": "https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/1stTest"
}
```

このファイルは `.gitignore` に含まれているため、各環境で個別に作成してください。

### 3. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアクセス

### 4. ビルド

```bash
npm run build
```

ビルド成果物は `dist/` フォルダに出力されます。

## デプロイ

### オプション1: AWS Amplify Hosting

1. AWS Amplify Consoleで新しいアプリを作成
2. GitHubリポジトリを接続
3. ビルド設定は `amplify.yml` を使用
4. デプロイ

### オプション2: S3 + CloudFront

1. S3バケットを作成（静的ウェブサイトホスティングを有効化）
2. ビルド成果物をアップロード:
   ```bash
   npm run build
   aws s3 sync dist/ s3://your-bucket-name/
   ```
3. CloudFrontディストリビューションを作成
4. HTTPSを設定

## セキュリティについて

このアプリケーションは、ユーザーのプライバシーを最優先に設計されています:

1. **クライアントサイド暗号化**: すべての位置情報はブラウザ内でAES-GCM暗号化されます
2. **鍵の管理**: 暗号化キーはユーザーのブラウザ内のIndexedDBに安全に保存されます
3. **サーバー側**: DynamoDBには暗号化されたデータのみが保存されます
4. **管理者でも読めない**: 暗号化キーがクライアント側のみに存在するため、管理者でもユーザーの記録を復号化できません

## 使い方

1. **新規登録**: メールアドレスとパスワードで登録
2. **メール確認**: 受信した6桁の確認コードを入力
3. **ログイン**: 登録したメールアドレスとパスワードでログイン
4. **位置情報記録**: 「現在地を記録」ボタンをタップ
5. **記録一覧**: 保存された位置情報の一覧を表示・管理

## ブラウザ互換性

- Chrome 87+
- Safari 14+
- Firefox 90+
- Edge 87+

位置情報APIとWeb Crypto APIが必要です。

## トラブルシューティング

### 位置情報が取得できない

- ブラウザの位置情報権限を確認してください
- HTTPSでアクセスしているか確認してください（localhostを除く）

### 同期が失敗する

- AWS設定が正しいか確認してください
- インターネット接続を確認してください
- API GatewayとLambda関数が正しく設定されているか確認してください

### 暗号化エラー

- ブラウザがWeb Crypto APIをサポートしているか確認してください
- プライベートブラウジングモードでないか確認してください

## プロジェクト構造

```
Location-Logger2/
├── src/
│   ├── components/      # Vueコンポーネント
│   ├── services/        # ビジネスロジック
│   │   ├── crypto.js    # 暗号化サービス
│   │   └── dynamodb.js  # DynamoDB API
│   ├── stores/          # Piniaストア
│   │   └── auth.js      # 認証ストア
│   ├── views/           # ページコンポーネント
│   │   ├── LoginView.vue
│   │   ├── ConfirmSignupView.vue
│   │   └── MainView.vue
│   ├── App.vue          # ルートコンポーネント
│   └── main.js          # エントリーポイント
├── lambda/
│   ├── index.js         # Lambda関数
│   └── package.json
├── public/
│   └── aws-config.json  # AWS設定（gitignore対象）
└── README.md
```

## 注意事項

- **暗号化キーはデバイス固有**: 暗号化キーはブラウザのIndexedDBに保存されるため、別のデバイスやブラウザからは同じデータを復号化できません
- **ブラウザデータの削除に注意**: ブラウザのキャッシュやIndexedDBをクリアすると、暗号化キーが失われます
- **HTTPS必須**: 位置情報APIはHTTPS環境でのみ動作します（localhost除く）

## ライセンス

MIT
