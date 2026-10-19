<script setup lang="ts">
// 長さ（U4b の決定 K4）: 「ツール任せ（Auto）／指定」と入力欄。「180」でも「3:00」でも受け付け、表示は m:ss。
// 範囲はツールプロファイルのパラメータから取る。誤りは欄の下に出し、データには入れない
import { computed, ref } from 'vue'
import { spec } from '@/data/spec'
import { usePendingSpecified } from '@/composables/usePendingSpecified'
import { formatLength, parseLength, setSpecifiedValue, stateOptions } from '@/domain/editor/edit'
import { profileParam } from '@/domain/spec'
import type { FieldDef } from '@/domain/types/fields'
import type { SongRequest } from '@/domain/types/song'
import StateToggle from './StateToggle.vue'

const props = defineProps<{ field: FieldDef; request: SongRequest }>()

const range = computed(() => {
  const p = profileParam(
    spec.toolProfileById.get(props.request.toolId),
    props.field.rangeFrom!.param,
  )
  return p?.range ?? { min: 10, max: 360 }
})
const stored = computed(() => {
  const v = props.request.axes[props.field.id]?.value
  return typeof v === 'number' ? v : undefined
})
const { shownState, selectState, settle } = usePendingSpecified(
  () => props.request,
  () => props.field,
  () => stored.value !== undefined,
)

const input = ref(stored.value !== undefined ? formatLength(stored.value) : '')
const error = ref('')

function onInput(v: string) {
  input.value = v
  const r = parseLength(v, range.value)
  error.value = r.ok ? '' : r.message
  if (r.ok) {
    setSpecifiedValue(props.request, props.field, r.value)
    settle()
  }
}
</script>

<template>
  <div class="space-y-2">
    <StateToggle
      :options="stateOptions(spec, field)"
      :model-value="shownState"
      :testid="`state-${field.id}`"
      @update:model-value="selectState"
    />
    <div class="flex items-center gap-2">
      <UInput
        :model-value="input"
        :disabled="shownState !== 'specified'"
        placeholder="3:00"
        class="w-32"
        :data-testid="`length-${field.id}`"
        @update:model-value="(v: unknown) => onInput(String(v))"
      />
      <span class="text-sm text-muted"
        >{{ range.min }}〜{{ range.max }}秒（「180」または「3:00」）</span
      >
    </div>
    <p
      v-if="error && shownState === 'specified'"
      class="text-xs text-error"
      :data-testid="`error-${field.id}`"
    >
      {{ error }}
    </p>
  </div>
</template>
