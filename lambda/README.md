# Lambda関数デプロイガイド

## セットアップ

### 1. 依存関係のインストール

```bash
cd lambda
npm install
```

### 2. デプロイパッケージの作成

```bash
zip -r function.zip .
```

### 3. Lambda関数の作成

AWS CLIを使用:

```bash
aws lambda create-function \
  --function-name LocationLoggerAPI \
  --runtime nodejs20.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --environment Variables={TABLE_NAME=LocationRecords} \
  --timeout 10 \
  --memory-size 256
```

### 4. IAMロールの作成

Lambda実行ロールに必要な権限:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:DeleteItem"
      ],
      "Resource": "arn:aws:dynamodb:ap-northeast-1:YOUR_ACCOUNT_ID:table/LocationRecords"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

### 5. API Gatewayの設定

1. REST APIを作成
2. Cognito Authorizerを設定
3. リソースとメソッドを作成:
   - `GET /records` - 記録一覧取得
   - `POST /records` - 記録保存
   - `POST /records/update` - 記録更新
   - `DELETE /records/{id}` - 記録削除
4. CORS を有効化
5. Lambda統合を設定
6. デプロイステージを作成（例: prod）

### 6. Cognito Authorizerの設定

1. API Gatewayで新しいAuthorizerを作成
2. タイプ: Cognito
3. Cognito User Poolを選択
4. トークンソース: Authorization
5. 各メソッドでAuthorizerを有効化

## 更新

Lambda関数を更新:

```bash
zip -r function.zip .
aws lambda update-function-code \
  --function-name LocationLoggerAPI \
  --zip-file fileb://function.zip
```

## テスト

ローカルテスト用のイベント例:

```json
{
  "httpMethod": "POST",
  "resource": "/records",
  "requestContext": {
    "authorizer": {
      "claims": {
        "sub": "test-user-id"
      }
    }
  },
  "body": "{\"data\":\"encrypted-data\",\"encrypted\":true,\"timestamp\":1234567890}"
}
```

## モニタリング

CloudWatch Logsでログを確認:

```bash
aws logs tail /aws/lambda/LocationLoggerAPI --follow
```
