import { defineStore } from 'pinia'
import { ref } from 'vue'
import { dbService } from '../services/indexeddb'
import { dynamoDBService } from '../services/dynamodb'
import { cryptoService } from '../services/crypto'
import { useAuthStore } from './auth'

export const useLocationStore = defineStore('location', () => {
  const records = ref([])
  const loading = ref(false)
  const error = ref(null)
  const syncing = ref(false)

  // 現在地を記録
  const recordLocation = async () => {
    loading.value = true
    error.value = null

    try {
      // 位置情報を取得
      const position = await getCurrentPosition()

      // 向き（デバイスの方位）を取得（可能な場合）
      const heading = await getDeviceHeading()

      // 記録データを作成
      const record = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        heading: heading,
        comment: '',
        createdAt: new Date().toISOString()
      }

      // 暗号化
      const encrypted = await cryptoService.encrypt(JSON.stringify(record))

      // IndexedDBに保存（record.idを渡す）
      await dbService.addRecord(encrypted, record.id)

      // メモリ上のリストに追加（復号化済み）
      records.value.unshift(record)

      // 認証済みの場合、DynamoDBにも保存
      const authStore = useAuthStore()
      if (authStore.isAuthenticated) {
        await dynamoDBService.saveRecord(encrypted, record.id)
      }

      return record
    } catch (err) {
      error.value = err.message || '位置情報の取得に失敗しました'
      console.error('Record location error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // 現在位置を取得
  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('このブラウザは位置情報に対応していません'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        (err) => {
          reject(new Error(`位置情報の取得に失敗しました: ${err.message}`))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      )
    })
  }

  // デバイスの向きを取得
  const getDeviceHeading = () => {
    return new Promise((resolve) => {
      if ('ondeviceorientationabsolute' in window) {
        const handler = (event) => {
          window.removeEventListener('deviceorientationabsolute', handler)
          resolve(event.alpha || 0)
        }
        window.addEventListener('deviceorientationabsolute', handler)
        setTimeout(() => {
          window.removeEventListener('deviceorientationabsolute', handler)
          resolve(0)
        }, 1000)
      } else if ('ondeviceorientation' in window) {
        const handler = (event) => {
          window.removeEventListener('deviceorientation', handler)
          resolve(event.alpha || 0)
        }
        window.addEventListener('deviceorientation', handler)
        setTimeout(() => {
          window.removeEventListener('deviceorientation', handler)
          resolve(0)
        }, 1000)
      } else {
        resolve(0)
      }
    })
  }

  // 記録一覧を読み込み
  const loadRecords = async () => {
    loading.value = true
    error.value = null

    try {
      const encryptedRecords = await dbService.getAllRecords()

      // 復号化
      const decryptedRecords = await Promise.all(
        encryptedRecords.map(async (encrypted) => {
          try {
            // IndexedDBから取得したレコード全体を渡す（{ data: "...", encrypted: true } の形式）
            const decrypted = await cryptoService.decrypt({
              data: encrypted.data,
              encrypted: encrypted.encrypted
            })
            return JSON.parse(decrypted)
          } catch (err) {
            console.error('Decryption error:', err)
            return null
          }
        })
      )

      // nullを除外してソート
      records.value = decryptedRecords
        .filter(r => r !== null)
        .sort((a, b) => b.timestamp - a.timestamp)
    } catch (err) {
      error.value = err.message || '記録の読み込みに失敗しました'
      console.error('Load records error:', err)
    } finally {
      loading.value = false
    }
  }

  // コメントを更新
  const updateComment = async (id, comment) => {
    try {
      const record = records.value.find(r => r.id === id)
      if (!record) throw new Error('記録が見つかりません')

      record.comment = comment

      // 暗号化して保存
      const encrypted = await cryptoService.encrypt(JSON.stringify(record))
      await dbService.updateRecord(id, encrypted)

      // 認証済みの場合、DynamoDBも更新
      const authStore = useAuthStore()
      if (authStore.isAuthenticated) {
        await dynamoDBService.updateRecord(id, encrypted)
      }

      return true
    } catch (err) {
      console.error('Update comment error:', err)
      throw err
    }
  }

  // 記録を削除
  const deleteRecord = async (id) => {
    try {
      await dbService.deleteRecord(id)

      // 認証済みの場合、DynamoDBからも削除
      const authStore = useAuthStore()
      if (authStore.isAuthenticated) {
        await dynamoDBService.deleteRecord(id)
      }

      records.value = records.value.filter(r => r.id !== id)
      return true
    } catch (err) {
      console.error('Delete record error:', err)
      throw err
    }
  }

  // クラウドと同期
  const syncWithCloud = async () => {
    const authStore = useAuthStore()
    if (!authStore.isAuthenticated) {
      throw new Error('ログインが必要です')
    }

    syncing.value = true
    try {
      // クラウドから取得
      const cloudRecords = await dynamoDBService.getAllRecords()

      // ローカルのレコードと統合
      const localRecords = await dbService.getAllRecords()
      const mergedRecords = await mergeRecords(localRecords, cloudRecords)

      // IndexedDBに保存
      await dbService.clear()
      for (const record of mergedRecords) {
        // recordからIDを取得するために一度復号化
        const decrypted = await cryptoService.decrypt({
          data: record.data,
          encrypted: record.encrypted
        })
        const parsed = JSON.parse(decrypted)
        await dbService.addRecord(record, parsed.id)
      }

      // 再読み込み
      await loadRecords()
    } catch (err) {
      console.error('Sync error:', err)
      throw err
    } finally {
      syncing.value = false
    }
  }

  // レコードをマージ（重複を除外）
  const mergeRecords = async (local, cloud) => {
    const map = new Map()

    // ローカルを追加
    for (const record of local) {
      try {
        const decrypted = await cryptoService.decrypt({
          data: record.data,
          encrypted: record.encrypted
        })
        const parsed = JSON.parse(decrypted)
        map.set(parsed.id, record)
      } catch (err) {
        console.error('Merge error:', err)
      }
    }

    // クラウドを追加（上書き）
    for (const record of cloud) {
      try {
        const decrypted = await cryptoService.decrypt({
          data: record.data,
          encrypted: record.encrypted
        })
        const parsed = JSON.parse(decrypted)
        map.set(parsed.id, record)
      } catch (err) {
        console.error('Merge error:', err)
      }
    }

    return Array.from(map.values())
  }

  return {
    records,
    loading,
    error,
    syncing,
    recordLocation,
    loadRecords,
    updateComment,
    deleteRecord,
    syncWithCloud
  }
})
