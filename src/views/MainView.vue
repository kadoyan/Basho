<template>
	<div class="container mx-auto max-w-4xl">
		<!-- ヘッダー -->
		<div class="card p-4">
			<header class="flex justify-between items-center">
				<h1 class="text-2xl font-bold"><span>BASHO</span></h1>
				<button @click="authStore.logout" class="btn btn-secondary text-sm">
					ログアウト
				</button>
			</header>
			<!-- 記録ボタン -->
			<div class="card mt-6 text-center">
				<button
					@click="handleRecord"
					:disabled="locationStore.loading"
					class="btn btn-primary w-full py-6 text-lg flex items-center justify-center gap-3"
				>
					<span class="text-2xl">📍</span>
					<span>{{
						locationStore.loading ? "記録中..." : "現在地を記録"
					}}</span>
				</button>
				<div
					v-if="recordStatus"
					class="mt-4 text-sm"
					:class="recordStatusClass"
				>
					{{ recordStatus }}
				</div>
			</div>
			<!-- 同期コントロール -->
			<div class="mt-6">
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-semibold">記録一覧</h2>
					<button
						@click="handleSync"
						:disabled="locationStore.syncing"
						class="btn btn-secondary text-sm flex items-center gap-2"
					>
						<span>🔄</span>
						<span>{{
							locationStore.syncing ? "同期中..." : "クラウドのデータと統合"
						}}</span>
					</button>
				</div>
			</div>
		</div>

		<!-- 記録一覧 -->
		<div class="card">
			<div v-if="locationStore.loading" class="text-center py-8 text-gray-500">
				読み込み中...
			</div>

			<div
				v-else-if="locationStore.records.length === 0"
				class="text-center py-8 text-gray-500"
			>
				記録がありません。「現在地を記録」ボタンで記録を開始してください。
			</div>

			<div v-else class="space-y-3 max-h-[500px] overflow-y-auto">
				<RecordItem
					v-for="record in locationStore.records"
					:key="record.id"
					:record="record"
					@click="openDetail(record)"
				/>
			</div>
		</div>

		<!-- 詳細モーダル -->
		<RecordDetailModal
			v-if="selectedRecord"
			:record="selectedRecord"
			@close="closeDetail"
			@update="handleUpdate"
			@delete="handleDelete"
		/>
	</div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useAuthStore } from "../stores/auth";
import { useLocationStore } from "../stores/location";
import RecordItem from "../components/RecordItem.vue";
import RecordDetailModal from "../components/RecordDetailModal.vue";
import { feedbackSuccess, feedbackError, feedbackTap } from "../utils/feedback";

const authStore = useAuthStore();
const locationStore = useLocationStore();
const selectedRecord = ref(null);
const recordStatus = ref("");
const recordStatusClass = ref("text-gray-600");

onMounted(() => {
	locationStore.loadRecords();
});

const handleRecord = async () => {
	try {
		feedbackTap(); // ボタンタップ時の即座フィードバック
		recordStatus.value = "";
		await locationStore.recordLocation();

		feedbackSuccess(); // 成功時のフィードバック
		recordStatus.value = "記録が保存されました！";
		recordStatusClass.value = "text-green-600";

		setTimeout(() => {
			recordStatus.value = "";
		}, 3000);
	} catch (err) {
		feedbackError(); // エラー時のフィードバック
		recordStatus.value = err.message || "記録に失敗しました";
		recordStatusClass.value = "text-red-600";
	}
};

const handleSync = async () => {
	try {
		feedbackTap(); // ボタンタップ時のフィードバック
		await locationStore.syncWithCloud();
		feedbackSuccess(); // 成功時のフィードバック
		alert("同期が完了しました");
	} catch (err) {
		feedbackError(); // エラー時のフィードバック
		alert(`同期に失敗しました: ${err.message}`);
	}
};

const openDetail = (record) => {
	selectedRecord.value = record;
};

const closeDetail = () => {
	selectedRecord.value = null;
};

const handleUpdate = async (id, comment) => {
	try {
		await locationStore.updateComment(id, comment);
		feedbackSuccess(); // 成功時のフィードバック
		closeDetail();
	} catch (err) {
		feedbackError(); // エラー時のフィードバック
		alert(`更新に失敗しました: ${err.message}`);
	}
};

const handleDelete = async (id) => {
	if (!confirm("この記録を削除しますか？")) return;

	try {
		await locationStore.deleteRecord(id);
		feedbackSuccess(); // 成功時のフィードバック
		closeDetail();
	} catch (err) {
		feedbackError(); // エラー時のフィードバック
		alert(`削除に失敗しました: ${err.message}`);
	}
};
</script>
