/**
 * AWS設定ファイルの例
 * このファイルをコピーして aws-config.js を作成し、実際の値を設定してください
 */

export const awsConfig = {
  // AWS Cognito設定
  Auth: {
    Cognito: {
      userPoolId: 'ap-northeast-1_WLkqPP0GW', // Cognito User Pool ID
      userPoolClientId: '2e1a0o20kg8s6c0n6f644gdovt', // App Client ID
      region: 'ap-northeast-1',
      loginWith: {
        email: true
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: {
          required: true
        }
      },
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true
      }
    }
  },

  // AWS API Gateway設定
  API: {
    REST: {
      LocationLoggerAPI: {
        endpoint: 'https://vo42foqpqj.execute-api.ap-northeast-1.amazonaws.com/1stTest',
        region: 'ap-northeast-1'
      }
    }
  }
}
