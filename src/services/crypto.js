/**
 * クライアントサイド暗号化サービス
 * Web Crypto APIを使用してAES-GCM暗号化を実装
 */

class CryptoService {
  constructor() {
    this.keyName = 'location-logger-encryption-key'
    this.key = null
  }

  /**
   * 暗号化キーを初期化または取得
   */
  async initKey() {
    if (this.key) {
      return this.key
    }

    // 既存のキーを取得
    const storedKey = await this.getStoredKey()
    if (storedKey) {
      this.key = storedKey
      return this.key
    }

    // 新しいキーを生成
    this.key = await this.generateKey()
    await this.storeKey(this.key)
    return this.key
  }

  /**
   * AES-GCMキーを生成
   */
  async generateKey() {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true, // extractable
      ['encrypt', 'decrypt']
    )
  }

  /**
   * キーをIndexedDBに保存
   */
  async storeKey(key) {
    try {
      const exported = await crypto.subtle.exportKey('jwk', key)

      const db = await this.openKeyDB()
      const transaction = db.transaction(['keys'], 'readwrite')
      const store = transaction.objectStore('keys')

      await new Promise((resolve, reject) => {
        const request = store.put({ name: this.keyName, key: exported })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (err) {
      console.error('Store key error:', err)
      throw err
    }
  }

  /**
   * IndexedDBからキーを取得
   */
  async getStoredKey() {
    try {
      const db = await this.openKeyDB()
      const transaction = db.transaction(['keys'], 'readonly')
      const store = transaction.objectStore('keys')

      // Promiseでラップ
      const result = await new Promise((resolve, reject) => {
        const request = store.get(this.keyName)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      if (result && result.key) {
        return await crypto.subtle.importKey(
          'jwk',
          result.key,
          { name: 'AES-GCM' },
          true,
          ['encrypt', 'decrypt']
        )
      }
      return null
    } catch (err) {
      console.error('Get stored key error:', err)
      return null
    }
  }

  /**
   * キー保存用のIndexedDBを開く
   * @deprecated マスターキーサービスで管理されるため、直接使用しない
   */
  openKeyDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('LocationLoggerKeys', 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        if (!db.objectStoreNames.contains('keys')) {
          db.createObjectStore('keys', { keyPath: 'name' })
        }
      }
    })
  }

  /**
   * データを暗号化
   */
  async encrypt(plaintext) {
    const key = await this.initKey()
    const encoder = new TextEncoder()
    const data = encoder.encode(plaintext)

    // ランダムなIV（初期化ベクトル）を生成
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // 暗号化
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      data
    )

    // IVと暗号文を結合してBase64エンコード
    const combined = new Uint8Array(iv.length + ciphertext.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(ciphertext), iv.length)

    return {
      data: this.arrayBufferToBase64(combined),
      encrypted: true
    }
  }

  /**
   * データを復号化
   */
  async decrypt(encryptedData) {
    if (!encryptedData || typeof encryptedData !== 'object') {
      throw new Error('Invalid encrypted data format: not an object')
    }

    if (!encryptedData.encrypted) {
      throw new Error('Invalid encrypted data format: encrypted flag missing or false')
    }

    const key = await this.initKey()
    const combined = this.base64ToArrayBuffer(encryptedData.data)

    // IVと暗号文を分離
    const iv = combined.slice(0, 12)
    const ciphertext = combined.slice(12)

    // 復号化
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  }

  /**
   * ArrayBufferをBase64文字列に変換
   */
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  /**
   * Base64文字列をArrayBufferに変換
   */
  base64ToArrayBuffer(base64) {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }
}

export const cryptoService = new CryptoService()
