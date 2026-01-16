<template>
  <div
    class="border border-gray-200 rounded-lg p-4 hover:border-primary-500 hover:bg-gray-50 cursor-pointer transition-all"
  >
    <div class="flex justify-between items-start mb-2">
      <div class="font-semibold text-gray-800">
        {{ formattedDate }}
      </div>
      <div class="text-sm text-gray-500">
        {{ formattedTime }}
      </div>
    </div>

    <div class="text-sm text-gray-600 mb-1">
      📍 {{ record.latitude.toFixed(6) }}, {{ record.longitude.toFixed(6) }}
    </div>

    <div class="text-xs text-gray-500 mb-2">
      精度: {{ record.accuracy.toFixed(0) }}m
      <span v-if="record.heading" class="ml-2">
        向き: {{ record.heading.toFixed(0) }}°
      </span>
    </div>

    <div v-if="record.comment" class="text-sm text-gray-700 italic border-l-2 border-primary-300 pl-2">
      {{ record.comment }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  record: {
    type: Object,
    required: true
  }
})

const formattedDate = computed(() => {
  const date = new Date(props.record.timestamp)
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

const formattedTime = computed(() => {
  const date = new Date(props.record.timestamp)
  return date.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
})
</script>
