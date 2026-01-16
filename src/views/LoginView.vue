<template>
	<div class="min-h-screen flex items-center justify-center p-4">
		<div class="card max-w-md w-full p-8">
			<h1><span>BASHO</span></h1>

			<form @submit.prevent="handleSubmit" class="mt-8 space-y-6">
				<div>
					<label
						for="email"
						class="block text-sm font-medium text-gray-700 mb-2"
					>
						メールアドレス
					</label>
					<input
						id="email"
						v-model="email"
						type="email"
						required
						autocomplete="email"
						class="input"
						placeholder="email@example.com"
					/>
				</div>

				<div>
					<label
						for="password"
						class="block text-sm font-medium text-gray-700 mb-2"
					>
						パスワード
					</label>
					<input
						id="password"
						v-model="password"
						type="password"
						required
						autocomplete="current-password"
						class="input"
						placeholder="••••••••"
					/>
				</div>

				<div v-if="authStore.error" class="text-red-500 text-sm text-center">
					{{ authStore.error }}
				</div>

				<div class="space-y-2">
					<button
						type="submit"
						:disabled="authStore.loading"
						class="btn btn-primary w-full"
					>
						{{ authStore.loading ? "処理中..." : "ログイン" }}
					</button>

					<button
						type="button"
						@click="handleSignup"
						:disabled="authStore.loading"
						class="btn btn-secondary w-full"
					>
						新規登録
					</button>
				</div>
			</form>
		</div>
	</div>
</template>

<script setup>
import { ref, defineEmits } from "vue";
import { useAuthStore } from "../stores/auth";

const emit = defineEmits(['show-confirm']);

const authStore = useAuthStore();
const email = ref("");
const password = ref("");

const handleSubmit = async () => {
	const success = await authStore.login(email.value, password.value);
	if (success) {
		email.value = "";
		password.value = "";
	}
};

const handleSignup = async () => {
	if (!email.value || !password.value) {
		alert("メールアドレスとパスワードを入力してください");
		return;
	}

	const success = await authStore.signup(email.value, password.value);
	if (success) {
		alert("登録が完了しました。確認コードをメールでお送りしました。");
		// 確認画面を表示
		emit('show-confirm', email.value);
	}
};
</script>
