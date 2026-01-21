/**
 * マスターキー管理サービス
 *
 * PBKDF2でパスワードからKEK（Key Encryption Key）を導出し、
 * ランダム生成したマスターキーをラップ（暗号化）して保存します。
 *
 * アーキテクチャ:
 * パスワード → PBKDF2 → KEK → マスターキーをラップ → DynamoDB保存
 * マスターキー（不変） → データを暗号化/復号化
 */

/**
 * パスワードからKEK（Key Encryption Key）を導出
 * @param {string} password - ユーザーのパスワード
 * @param {Uint8Array} salt - Salt（ユーザーIDから生成）
 * @returns {Promise<CryptoKey>} KEK
 */
async function deriveKEK(password, salt) {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(password)

  // パスワードから鍵マテリアルを生成
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  )

  // PBKDF2でKEKを導出（100,000回反復でブルートフォース攻撃を困難に）
  const kek = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  )

  return kek
}

/**
 * ユーザーIDからSaltを生成
 * @param {string} userId - ユーザーID
 * @returns {Uint8Array} Salt
 */
function generateSalt(userId) {
  const encoder = new TextEncoder()
  return encoder.encode(`location-logger-salt-${userId}`)
}

class MasterKeyService {
  constructor() {
    this.masterKey = null
    this.salt = null
  }

  /**
   * ランダムなマスターキーを生成
   * @returns {Promise<CryptoKey>} マスターキー
   */
  async generateMasterKey() {
    return await crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: 256
      },
      true, // extractable（ラップ可能にする）
      ['encrypt', 'decrypt']
    )
  }

  /**
   * マスターキーをKEKでラップ（暗号化）
   * @param {CryptoKey} masterKey - マスターキー
   * @param {string} password - ユーザーのパスワード
   * @param {string} userId - ユーザーID
   * @returns {Promise<{wrappedKey: string, iv: string}>} ラップされたマスターキーとIV
   */
  async wrapMasterKey(masterKey, password, userId) {
    const salt = generateSalt(userId)
    const kek = await deriveKEK(password, salt)

    // IVを生成
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // マスターキーをラップ
    const wrappedKey = await crypto.subtle.wrapKey(
      'raw',
      masterKey,
      kek,
      {
        name: 'AES-GCM',
        iv: iv
      }
    )

    return {
      wrappedKey: arrayBufferToBase64(wrappedKey),
      iv: arrayBufferToBase64(iv)
    }
  }

  /**
   * ラップされたマスターキーをアンラップ（復号化）
   * @param {string} wrappedKeyBase64 - Base64エンコードされたラップ済みマスターキー
   * @param {string} ivBase64 - Base64エンコードされたIV
   * @param {string} password - ユーザーのパスワード
   * @param {string} userId - ユーザーID
   * @returns {Promise<CryptoKey>} マスターキー
   */
  async unwrapMasterKey(wrappedKeyBase64, ivBase64, password, userId) {
    const salt = generateSalt(userId)
    const kek = await deriveKEK(password, salt)

    const wrappedKey = base64ToArrayBuffer(wrappedKeyBase64)
    const iv = base64ToArrayBuffer(ivBase64)

    // マスターキーをアンラップ
    const masterKey = await crypto.subtle.unwrapKey(
      'raw',
      wrappedKey,
      kek,
      {
        name: 'AES-GCM',
        iv: iv
      },
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )

    return masterKey
  }

  /**
   * 新規ユーザーのマスターキーをセットアップ
   * @param {string} password - ユーザーのパスワード
   * @param {string} userId - ユーザーID
   * @returns {Promise<{wrappedKey: string, iv: string}>} ラップされたマスターキー
   */
  async setupNewUser(password, userId) {
    // 新しいマスターキーを生成
    const masterKey = await this.generateMasterKey()

    // メモリに保持
    this.masterKey = masterKey

    // ラップして返す
    const wrapped = await this.wrapMasterKey(masterKey, password, userId)

    return wrapped
  }

  /**
   * ログイン時にマスターキーを復号化
   * @param {string} wrappedKeyBase64 - Base64エンコードされたラップ済みマスターキー
   * @param {string} ivBase64 - Base64エンコードされたIV
   * @param {string} password - ユーザーのパスワード
   * @param {string} userId - ユーザーID
   * @returns {Promise<CryptoKey>} マスターキー
   */
  async loginUser(wrappedKeyBase64, ivBase64, password, userId) {
    // マスターキーをアンラップ
    const masterKey = await this.unwrapMasterKey(wrappedKeyBase64, ivBase64, password, userId)

    // メモリに保持
    this.masterKey = masterKey

    return masterKey
  }

  /**
   * パスワード変更時にマスターキーを再ラップ
   * @param {string} newPassword - 新しいパスワード
   * @param {string} userId - ユーザーID
   * @returns {Promise<{wrappedKey: string, iv: string}>} 新しくラップされたマスターキー
   */
  async changePassword(newPassword, userId) {
    if (!this.masterKey) {
      throw new Error('マスターキーが読み込まれていません')
    }

    // 既存のマスターキーを新しいパスワードで再ラップ
    const wrapped = await this.wrapMasterKey(this.masterKey, newPassword, userId)

    return wrapped
  }

  /**
   * メモリからマスターキーを取得
   * @returns {CryptoKey|null} マスターキー
   */
  getMasterKey() {
    return this.masterKey
  }

  /**
   * メモリからマスターキーをクリア（ログアウト時）
   */
  clearMasterKey() {
    this.masterKey = null
    this.salt = null
  }
}

/**
 * ArrayBufferをBase64文字列に変換
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Base64文字列をArrayBufferに変換
 * @param {string} base64
 * @returns {ArrayBuffer}
 */
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

export const masterKeyService = new MasterKeyService()
