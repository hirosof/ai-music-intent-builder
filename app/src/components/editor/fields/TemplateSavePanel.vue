<script setup lang="ts">
// 「ひな型として保存」（UI 判断ポイント75 の (3)・細部 (c')）。「曲の構成」の入力欄の下に、その場で開く（ダイアログを重ねない。判断ポイント8）。
// 名前を入れ、同じ名前があれば同じ範囲の中で上書きの確認を出す
import { useToast } from '@nuxt/ui/composables'
import { computed, ref } from 'vue'
import { useStructureTemplates } from '@/composables/useStructureTemplates'
import { findTemplateByName, saveTemplate } from '@/domain/storage/structure-templates'
import type { SectionElement } from '@/domain/types/song'

const props = defineProps<{
  /** 保存する要素（今のモードに合わせた形） */
  sections: SectionElement[]
  /** 並びの表示（表示名を「 → 」でつないだもの） */
  label: string
}>()
const emit = defineEmits<{ close: [] }>()

const templates = useStructureTemplates()
const toast = useToast()

const name = ref('')
const confirmOverwrite = ref(false)
const failure = ref<string[]>([])

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
  emit('close')
}
</script>

<template>
  <div
    role="group"
    aria-label="ひな型として保存"
    class="space-y-3 rounded-md border border-default p-3"
    data-testid="template-save-panel"
  >
    <div>
      <p class="text-sm font-medium">ひな型として保存</p>
      <p class="text-xs text-muted">今の曲の構成に名前を付けて保存します。</p>
    </div>
    <p v-if="confirmOverwrite" class="text-sm wrap-anywhere" data-testid="template-save-confirm">
      「{{ trimmed }}」はすでにあります。今の曲の構成で上書きしますか？
    </p>
    <template v-else>
      <UFormField label="名前" required>
        <UInput
          v-model="name"
          class="w-full"
          autofocus
          data-testid="template-save-name"
          @keydown.enter="submit"
        />
      </UFormField>
      <p class="text-sm text-muted wrap-anywhere" data-testid="template-save-sections">
        {{ label }}
      </p>
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
    </template>
    <!-- 実行するボタンを左、やめるボタンを右（利用者の判断 (a)） -->
    <div class="flex justify-end gap-2">
      <UButton
        size="sm"
        :label="confirmOverwrite ? '上書きする' : '保存'"
        :color="confirmOverwrite ? 'warning' : 'primary'"
        :disabled="!canSubmit"
        data-testid="template-save-submit"
        @click="submit"
      />
      <UButton
        size="sm"
        label="キャンセル"
        color="neutral"
        variant="outline"
        data-testid="template-save-cancel"
        @click="confirmOverwrite ? (confirmOverwrite = false) : emit('close')"
      />
    </div>
  </div>
</template>
