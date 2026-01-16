/**
 * ユーザーフィードバック用ユーティリティ
 */

// 音声ファイルをインポート
import addSound from '@/assets/voice/add.wav'
import doneSound from '@/assets/voice/done.wav'

// Audioインスタンスをキャッシュ（パフォーマンス向上）
const audioCache = {}

/**
 * 音声ファイルを読み込み
 * @param {string} src - 音声ファイルのパス
 * @returns {HTMLAudioElement}
 */
const getAudio = (src) => {
  if (!audioCache[src]) {
    audioCache[src] = new Audio(src)
    audioCache[src].preload = 'auto'
  }
  return audioCache[src]
}

/**
 * バイブレーション（触覚フィードバック）
 * @param {number|number[]} pattern - バイブレーションパターン（ミリ秒）
 */
export const vibrate = (pattern = 50) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

/**
 * 成功時のバイブレーション
 */
export const vibrateSuccess = () => {
  vibrate([50, 30, 50]) // 短-短-短
}

/**
 * エラー時のバイブレーション
 */
export const vibrateError = () => {
  vibrate([100, 50, 100, 50, 100]) // 長-長-長
}

/**
 * タップ時のバイブレーション
 */
export const vibrateTap = () => {
  vibrate(30) // 短い
}

/**
 * 音声ファイルを再生
 * @param {string} soundFile - 音声ファイルのパス
 */
export const playSound = (soundFile) => {
  try {
    const audio = getAudio(soundFile)
    // 既に再生中の場合は最初から再生
    audio.currentTime = 0
    audio.play().catch(err => {
      // 自動再生がブロックされた場合は無視（ユーザー操作後は再生される）
      console.debug('Audio playback blocked:', err)
    })
  } catch (err) {
    console.error('Failed to play sound:', err)
  }
}

/**
 * タップ時のフィードバック（ボタンを押した時）
 */
export const feedbackTap = () => {
  vibrateTap()
  playSound(addSound) // add.wav を再生
}

/**
 * 成功時のフィードバック（保存完了時）
 */
export const feedbackSuccess = () => {
  vibrateSuccess()
  playSound(doneSound) // done.wav を再生
}

/**
 * エラー時のフィードバック
 */
export const feedbackError = () => {
  vibrateError()
  // エラー音は add.wav を使用（または別途エラー音を追加可能）
  playSound(addSound)
}
