<script setup lang="ts">
// 「ひな型として保存」（UI 判断ポイント75 の (3)）。名前を入れ、同じ名前があれば同じダイアログの中で上書きの確認を出す
import { useToast } from '@nuxt/ui/composables'
import { computed, ref, watch } from 'vue'
import { useStructureTemplates } from '@/composables/useStructureTemplates'
import { findTemplateByName, saveTemplate } from '@/domain/storage/structure-templates'
import type { SectionElement } from '@/domain/types/song'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{
  /** 保存する要素（今のモードに合わせた形） */
  sections: SectionElement[]
  /** 並びの表示（表示名を「 → 」でつないだもの） */
  label: string
}>()

const templates = useStructureTemplates()
const toast = useToast()

const name = ref('')
const confirmOverwrite = ref(false)
const failure = ref<string[]>([])
watch(open, (v) => {
  if (!v) return
  name.value = ''
  confirmOverwrite.value = false
  failure.value = []
})

const trimmed = computed(() => name.value.trim())
const canSubmit = computed(() => trimmed.value !== '' && templates.store.value !== null)

function submit() {
  const store = templates.store.value
  if (!canSubmit.value || !store) return
  if (findTemplateByName(store, trimmed.value) && !confirmOverwrite.value) {
    confirmOverwrite.value = true
    return
  }
  const c = templates.commit(saveTemplate(store, trimmed.value, props.sections, new Date()))
  if (!c.ok) {
    confirmOverwrite.value = false
    failure.value = c.errors
    return
  }
  toast.add({ title: `ひな型「${trimmed.value}」を保存しました`, color: 'success' })
  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="ひな型として保存"
    description="今の曲の構成に名前を付けて保存します。"
  >
    <template #body>
      <p v-if="confirmOverwrite" data-testid="template-save-confirm">
        「{{ trimmed }}」はすでにあります。今の曲の構成で上書きしますか？
      </p>
      <div v-else class="space-y-3">
        <UFormField label="名前" required>
          <UInput
            v-model="name"
            class="w-full"
            autofocus
            data-testid="template-save-name"
            @keydown.enter="submit"
          />
        </UFormField>
        <p class="text-sm text-muted" data-testid="template-save-sections">{{ label }}</p>
        <UAlert
          v-if="templates.rejectedErrors.value.length"
          color="warning"
          variant="subtle"
          title="ひな型を読み込めなかったため、保存できません"
          :description="templates.rejectedErrors.value.join('\n')"
          data-testid="template-save-rejected"
        />
        <UAlert
          v-if="failure.length"
          color="error"
          variant="subtle"
          title="保存できませんでした"
          :description="failure.join('\n')"
          data-testid="template-save-failure"
        />
      </div>
    </template>
    <template #footer>
      <!-- 実行するボタンを左、やめるボタンを右（利用者の判断 (a)） -->
      <div class="flex w-full justify-end gap-2">
        <UButton
          :label="confirmOverwrite ? '上書きする' : '保存'"
          :color="confirmOverwrite ? 'warning' : 'primary'"
          :disabled="!canSubmit"
          data-testid="template-save-submit"
          @click="submit"
        />
        <UButton
          label="キャンセル"
          color="neutral"
          variant="outline"
          data-testid="template-save-cancel"
          @click="confirmOverwrite ? (confirmOverwrite = false) : (open = false)"
        />
      </div>
    </template>
  </UModal>
</template>
