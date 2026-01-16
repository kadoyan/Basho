<template>
  <div class="min-h-screen p-4">
    <ConfirmSignupView
      v-if="showConfirmSignup"
      :email="confirmEmail"
      @cancel="showConfirmSignup = false"
      @confirmed="handleConfirmed"
    />
    <LoginView v-else-if="!authStore.isAuthenticated" @show-confirm="handleShowConfirm" />
    <MainView v-else />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useAuthStore } from './stores/auth'
import LoginView from './views/LoginView.vue'
import MainView from './views/MainView.vue'
import ConfirmSignupView from './views/ConfirmSignupView.vue'

const authStore = useAuthStore()
const showConfirmSignup = ref(false)
const confirmEmail = ref('')

onMounted(() => {
  // 認証状態を確認（設定済みの場合）
  authStore.checkAuth()
})

// Amplifyが設定されたら認証状態を確認
watch(() => authStore.configured, (newValue) => {
  if (newValue) {
    authStore.checkAuth()
  }
})

const handleShowConfirm = (email) => {
  confirmEmail.value = email
  showConfirmSignup.value = true
}

const handleConfirmed = () => {
  showConfirmSignup.value = false
  confirmEmail.value = ''
}
</script>
