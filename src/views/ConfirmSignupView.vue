<template>
	<div class="min-h-screen flex items-center justify-center p-4">
		<div class="card max-w-md w-full p-8">
			<h1><span>メール確認</span></h1>

			<p class="mt-4 text-sm text-gray-600">
				{{ props.email }} に確認コードを送信しました。<br />
				メールをご確認ください。
			</p>

			<form @submit.prevent="handleSubmit" class="mt-8 space-y-6">
				<div>
					<label
						for="code"
						class="block text-sm font-medium text-gray-700 mb-2"
					>
						確認コード
					</label>
					<input
						id="code"
						v-model="code"
						type="text"
						required
						autocomplete="off"
						class="input"
						placeholder="123456"
						maxlength="6"
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
						{{ authStore.loading ? "確認中..." : "確認" }}
					</button>

					<button
						type="button"
						@click="handleResend"
						:disabled="authStore.loading"
						class="btn btn-secondary w-full"
					>
						確認コードを再送信
					</button>

					<button
						type="button"
						@click="handleCancel"
						class="btn btn-secondary w-full"
					>
						キャンセル
					</button>
				</div>
			</form>
		</div>
	</div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from "vue";
import { useAuthStore } from "../stores/auth";

const props = defineProps({
	email: {
		type: String,
		required: true
	}
});

const emit = defineEmits(['cancel', 'confirmed']);

const authStore = useAuthStore();
const code = ref("");

const handleSubmit = async () => {
	if (!props.email) {
		authStore.error = "メールアドレスが指定されていません";
		return;
	}

	const success = await authStore.confirmSignup(props.email, code.value);
	if (success) {
		alert("メールアドレスが確認されました。ログインしてください。");
		emit('confirmed');
	}
};

const handleResend = async () => {
	if (!props.email) {
		authStore.error = "メールアドレスが指定されていません";
		return;
	}

	const success = await authStore.resendConfirmationCode(props.email);
	if (success) {
		alert("確認コードを再送信しました");
	}
};

const handleCancel = () => {
	emit('cancel');
};
</script>
