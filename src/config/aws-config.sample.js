/**
 * AWS設定ファイルの例
 * このファイルをコピーして aws-config.js を作成し、実際の値を設定してください
 */

export const awsConfig = {
	// AWS Cognito設定
	Auth: {
		Cognito: {
			userPoolId: '', // Cognito User Pool ID
			userPoolClientId: '', // App Client ID
			region: '',
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
				endpoint: '',
				region: ''
			}
		}
	}
}
