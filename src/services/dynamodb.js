/**
 * DynamoDBサービス
 * AWS DynamoDBとの統合
 */

import { post, get, del, put } from 'aws-amplify/api'
import { useAuthStore } from '../stores/auth'

class DynamoDBService {
  constructor() {
    this.apiName = 'LocationLoggerAPI'
  }

  /**
   * 記録を保存
   */
  async saveRecord(encryptedData, recordId = null) {
    try {
      const authStore = useAuthStore()
      const token = await authStore.getIdToken()

      if (!token) {
        throw new Error('Authentication required')
      }

      const body = {
        data: encryptedData.data,
        encrypted: encryptedData.encrypted,
        timestamp: Date.now()
      }

      // recordIdがある場合は含める
      if (recordId) {
        body.recordId = recordId
      }

      const response = await post({
        apiName: this.apiName,
        path: '/records',
        options: {
          body,
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }).response

      const result = await response.body.json()
      return result
    } catch (err) {
      console.error('Save record to DynamoDB error:', err)
      throw err
    }
  }

  /**
   * すべての記録を取得
   */
  async getAllRecords() {
    try {
      const authStore = useAuthStore()
      const token = await authStore.getIdToken()

      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await get({
        apiName: this.apiName,
        path: '/records',
        options: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }).response

      const result = await response.body.json()
      return result.items || []
    } catch (err) {
      console.error('Get records from DynamoDB error:', err)
      throw err
    }
  }

  /**
   * 記録を更新
   */
  async updateRecord(recordId, encryptedData) {
    try {
      const authStore = useAuthStore()
      const token = await authStore.getIdToken()

      if (!token) {
        throw new Error('Authentication required')
      }

      if (!recordId) {
        throw new Error('recordId is required for update')
      }

      const response = await put({
        apiName: this.apiName,
        path: `/records/${recordId}`,
        options: {
          body: {
            data: encryptedData.data,
            encrypted: encryptedData.encrypted,
            timestamp: Date.now()
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }).response

      const result = await response.body.json()
      return result
    } catch (err) {
      console.error('Update record in DynamoDB error:', err)
      throw err
    }
  }

  /**
   * 記録を削除
   */
  async deleteRecord(recordId) {
    try {
      const authStore = useAuthStore()
      const token = await authStore.getIdToken()

      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await del({
        apiName: this.apiName,
        path: `/records/${recordId}`,
        options: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }).response

      const result = await response.body.json()
      return result
    } catch (err) {
      console.error('Delete record from DynamoDB error:', err)
      throw err
    }
  }

}

export const dynamoDBService = new DynamoDBService()
