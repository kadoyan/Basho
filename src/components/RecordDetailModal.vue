<template>
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    @click.self="emit('close')"
  >
    <div class="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
      <!-- ヘッダー -->
      <div class="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
        <h2 class="text-2xl font-bold text-gray-800">記録詳細</h2>
        <button
          @click="emit('close')"
          class="text-gray-500 hover:text-gray-700 text-2xl leading-none"
        >
          &times;
        </button>
      </div>

      <!-- コンテンツ -->
      <div class="p-6 space-y-4">
        <!-- 日時 -->
        <div>
          <div class="text-sm font-medium text-gray-500 mb-1">日時</div>
          <div class="text-lg text-gray-800">
            {{ formattedDateTime }}
          </div>
        </div>

        <!-- 位置情報 -->
        <div>
          <div class="text-sm font-medium text-gray-500 mb-1">位置情報</div>
          <div class="text-gray-800 space-y-1">
            <div>緯度: {{ record.latitude.toFixed(6) }}</div>
            <div>経度: {{ record.longitude.toFixed(6) }}</div>
            <div>精度: {{ record.accuracy.toFixed(0) }} m</div>
            <div v-if="record.heading">
              向き: {{ record.heading.toFixed(0) }}°
            </div>
          </div>
        </div>

        <!-- コメント -->
        <div>
          <label class="text-sm font-medium text-gray-500 block mb-2">
            コメント
          </label>
          <textarea
            v-model="comment"
            rows="4"
            class="input"
            placeholder="コメントを入力..."
          ></textarea>
          <button
            @click="handleSaveComment"
            class="btn btn-primary w-full mt-2"
          >
            コメントを保存
          </button>
        </div>

        <!-- アクションボタン -->
        <div class="space-y-2 pt-4 border-t border-gray-200">
          <button
            @click="openGoogleMaps"
            class="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            <span>🗺️</span>
            <span>Google Mapで開く</span>
          </button>

          <button
            @click="handleDelete"
            class="btn btn-danger w-full"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  record: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['close', 'update', 'delete'])

const comment = ref(props.record.comment || '')

const formattedDateTime = computed(() => {
  const date = new Date(props.record.timestamp)
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})

const handleSaveComment = () => {
  emit('update', props.record.id, comment.value)
}

const handleDelete = () => {
  emit('delete', props.record.id)
}

const openGoogleMaps = () => {
  const url = `https://www.google.com/maps?q=${props.record.latitude},${props.record.longitude}`
  window.open(url, '_blank')
}
</script>
