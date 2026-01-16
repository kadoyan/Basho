/**
 * IndexedDBサービス
 * ローカルストレージに位置情報記録を保存
 */

class IndexedDBService {
  constructor() {
    this.dbName = 'LocationLoggerDB'
    this.version = 1
    this.storeName = 'records'
    this.db = null
  }

  /**
   * データベースを開く
   */
  async openDB() {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => {
        console.error('IndexedDB error:', request.error)
        reject(request.error)
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve(this.db)
      }

      request.onupgradeneeded = (event) => {
        const db = event.target.result

        // recordsストアを作成
        if (!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, {
            keyPath: 'id',
            autoIncrement: true
          })

          // インデックスを作成
          objectStore.createIndex('timestamp', 'timestamp', { unique: false })
          objectStore.createIndex('recordId', 'recordId', { unique: true })
        }
      }
    })
  }

  /**
   * 記録を追加
   * @param {Object} encryptedData - { data: string, encrypted: boolean }
   * @param {string} recordId - レコードのID（復号化後のrecord.id）
   */
  async addRecord(encryptedData, recordId) {
    const db = await this.openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)

      // 暗号化されたデータにメタデータを追加
      const record = {
        ...encryptedData,
        timestamp: Date.now(),
        recordId: recordId
      }

      const request = store.add(record)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * すべての記録を取得
   */
  async getAllRecords() {
    const db = await this.openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly')
      const store = transaction.objectStore(this.storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 記録を更新
   */
  async updateRecord(recordId, encryptedData) {
    const db = await this.openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('recordId')
      const getRequest = index.get(recordId)

      getRequest.onsuccess = () => {
        const record = getRequest.result
        if (!record) {
          reject(new Error('Record not found'))
          return
        }

        // 暗号化されたデータで更新
        const updatedRecord = {
          ...record,
          ...encryptedData,
          timestamp: Date.now()
        }

        const updateRequest = store.put(updatedRecord)
        updateRequest.onsuccess = () => resolve(updateRequest.result)
        updateRequest.onerror = () => reject(updateRequest.error)
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * 記録を削除
   */
  async deleteRecord(recordId) {
    const db = await this.openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const index = store.index('recordId')
      const getRequest = index.getKey(recordId)

      getRequest.onsuccess = () => {
        const key = getRequest.result
        if (!key) {
          reject(new Error('Record not found'))
          return
        }

        const deleteRequest = store.delete(key)
        deleteRequest.onsuccess = () => resolve()
        deleteRequest.onerror = () => reject(deleteRequest.error)
      }

      getRequest.onerror = () => reject(getRequest.error)
    })
  }

  /**
   * すべての記録を削除
   */
  async clear() {
    const db = await this.openDB()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite')
      const store = transaction.objectStore(this.storeName)
      const request = store.clear()

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

export const dbService = new IndexedDBService()
