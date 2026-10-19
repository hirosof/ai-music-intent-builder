<script setup lang="ts">
// 編集中の内容を置き換える前の確認（判断ポイント52。「新規」と、プロファイルの読み込みで共通）。
// 保存は促さない。取り消し（元に戻す）は設けない
const open = defineModel<boolean>('open', { required: true })
defineProps<{ title: string; confirmLabel: string }>()
const emit = defineEmits<{ confirm: [] }>()

function confirm() {
  open.value = false
  emit('confirm')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    description="編集中の内容は破棄されます。残したいときは、先に保存または書き出してください。"
  >
    <template #footer>
      <!-- 実行するボタンを左、やめるボタンを右（全ダイアログでそろえる。利用者の判断 (a)） -->
      <div class="flex w-full justify-end gap-2" data-testid="dialog-buttons">
        <UButton :label="confirmLabel" color="error" data-testid="confirm-ok" @click="confirm" />
        <UButton
          label="キャンセル"
          color="neutral"
          variant="outline"
          data-testid="confirm-cancel"
          @click="open = false"
        />
      </div>
    </template>
  </UModal>
</template>
