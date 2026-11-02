<script setup lang="ts">
// 「ひな型から読み込む」（UI 判断ポイント75 の (3)・細部 (c')）。「曲の構成」の入力欄の下に、その場で開く（ダイアログを重ねない。判断ポイント8）。
// 一覧に名前と並びを出し、各行で読み込む・名前の変更・削除を行う。確認と名前の入力は、同じ範囲の中で切り替える
import { useToast } from '@nuxt/ui/composables'
import { computed, ref } from 'vue'
import { useStructureTemplates } from '@/composables/useStructureTemplates'
import {
  deleteTemplate,
  renameTemplate,
  templateRenameError,
  type StructureTemplate,
} from '@/domain/storage/structure-templates'

const props = defineProps<{
  /** 今の並びが空でないか（空でないときは、置き換えてよいかを確認する） */
  hasCurrent: boolean
  /** ひな型の並びの表示（今のモードに合わせた形） */
  labelOf: (t: StructureTemplate) => string
}>()
const emit = defineEmits<{ select: [template: StructureTemplate]; close: [] }>()

const templates = useStructureTemplates()
const toast = useToast()

type Pending =
  | { kind: 'replace'; template: StructureTemplate }
  | { kind: 'rename'; template: StructureTemplate }
  | { kind: 'delete'; template: StructureTemplate }
const pending = ref<Pending | null>(null)
const nameInput = ref('')
const failure = ref<string[]>([])

/** 一覧は名前順（ストアの並びは変えない） */
const rows = computed(() =>
  [...(templates.store.value?.templates ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'ja')),
)
const nameError = computed(() => {
  const p = pending.value
  const store = templates.store.value
  return p?.kind === 'rename' && store
    ? templateRenameError(store, p.template.id, nameInput.value.trim())
    : null
})
const title = computed(() => {
  switch (pending.value?.kind) {
    case 'replace':
      return '曲の構成を置き換える'
    case 'rename':
      return 'ひな型の名前を変更'
    case 'delete':
      return 'ひな型を削除'
    default:
      return 'ひな型から読み込む'
  }
})

const description = computed(() => {
  switch (pending.value?.kind) {
    case 'replace':
      return 'ひな型の並びで置き換えます。'
    case 'rename':
      return '並びは変わりません。'
    case 'delete':
      return '今の曲の構成は変わりません。'
    default:
      return '保存したひな型の一覧です。'
  }
})

function apply(template: StructureTemplate) {
  emit('select', template)
  toast.add({ title: `ひな型「${template.name}」を読み込みました`, color: 'success' })
  emit('close')
}
function choose(template: StructureTemplate) {
  if (props.hasCurrent) pending.value = { kind: 'replace', template }
  else apply(template)
}
function startRename(template: StructureTemplate) {
  nameInput.value = template.name
  failure.value = []
  pending.value = { kind: 'rename', template }
}
function startDelete(template: StructureTemplate) {
  failure.value = []
  pending.value = { kind: 'delete', template }
}
function submit() {
  const p = pending.value
  const store = templates.store.value
  if (!p) return
  if (p.kind === 'replace') {
    apply(p.template)
    return
  }
  if (!store || nameError.value) return
  const c = templates.commit(
    p.kind === 'rename'
      ? renameTemplate(store, p.template.id, nameInput.value.trim())
      : deleteTemplate(store, p.template.id),
  )
  if (!c.ok) {
    failure.value = c.errors
    return
  }
  failure.value = []
  pending.value = null
}
</script>

<template>
  <div
    role="group"
    :aria-label="title"
    class="space-y-3 rounded-md border border-default p-3"
    data-testid="template-load-panel"
  >
    <div>
      <p class="text-sm font-medium">{{ title }}</p>
      <p class="text-xs text-muted">{{ description }}</p>
    </div>
    <p
      v-if="pending?.kind === 'replace'"
      class="text-sm wrap-anywhere"
      data-testid="template-confirm-replace"
    >
      今の曲の構成を「{{ pending.template.name }}」で置き換えますか？
    </p>
    <p
      v-else-if="pending?.kind === 'delete'"
      class="text-sm wrap-anywhere"
      data-testid="template-confirm-delete"
    >
      ひな型「{{ pending.template.name }}」を削除しますか？
    </p>
    <UFormField
      v-else-if="pending?.kind === 'rename'"
      label="名前"
      required
      :error="nameError ?? undefined"
    >
      <UInput
        v-model="nameInput"
        class="w-full"
        autofocus
        data-testid="template-rename-name"
        @keydown.enter="submit"
      />
    </UFormField>
    <template v-else>
      <UAlert
        v-if="templates.rejectedErrors.value.length"
        color="warning"
        variant="subtle"
        title="ひな型を読み込めませんでした"
        :description="templates.rejectedErrors.value.join('\n')"
        data-testid="template-load-rejected"
      />
      <p v-else-if="rows.length === 0" class="text-sm text-muted" data-testid="template-empty">
        保存したひな型はありません。
      </p>
      <ul v-else class="divide-y divide-default" data-testid="template-list">
        <li
          v-for="t in rows"
          :key="t.id"
          class="space-y-1 py-2 first:pt-0"
          :data-testid="`template-row-${t.name}`"
        >
          <div class="text-sm font-medium wrap-anywhere">{{ t.name }}</div>
          <div class="text-sm text-muted wrap-anywhere">{{ labelOf(t) }}</div>
          <div class="flex flex-wrap justify-end gap-2">
            <UButton size="xs" label="読み込む" data-testid="template-select" @click="choose(t)" />
            <UButton
              size="xs"
              color="neutral"
              variant="outline"
              label="名前の変更"
              data-testid="template-rename"
              @click="startRename(t)"
            />
            <UButton
              size="xs"
              color="error"
              variant="outline"
              label="削除"
              data-testid="template-delete"
              @click="startDelete(t)"
            />
          </div>
        </li>
      </ul>
    </template>
    <UAlert
      v-if="failure.length"
      color="error"
      variant="subtle"
      title="保存できませんでした"
      :description="failure.join('\n')"
      data-testid="template-load-failure"
    />
    <!-- 実行するボタンを左、やめるボタンを右（利用者の判断 (a)） -->
    <div class="flex justify-end gap-2">
      <UButton
        v-if="pending"
        size="sm"
        :label="
          pending.kind === 'replace'
            ? '置き換える'
            : pending.kind === 'delete'
              ? '削除する'
              : '変更する'
        "
        :color="
          pending.kind === 'rename' ? 'primary' : pending.kind === 'delete' ? 'error' : 'warning'
        "
        :disabled="!!nameError"
        data-testid="template-submit"
        @click="submit"
      />
      <UButton
        size="sm"
        :label="pending ? 'キャンセル' : '一覧を閉じる'"
        color="neutral"
        variant="outline"
        data-testid="template-cancel"
        @click="pending ? (pending = null) : emit('close')"
      />
    </div>
  </div>
</template>
