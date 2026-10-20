<script setup lang="ts">
// 構成（セクションの並び。U4b の決定 K6）: 並びの行ごとに「上へ」「下へ」「削除」、末尾に「追加」。ドラッグはしない。
// 空の並びはデータに入れない（最後の1つは消せない。①をやめるときは状態を切り替える）
import { computed, ref } from 'vue'
import { spec } from '@/data/spec'
import { usePendingSpecified } from '@/composables/usePendingSpecified'
import { moveSection, removeSection, setSpecifiedValue, stateOptions } from '@/domain/editor/edit'
import { termLabel } from '@/domain/editor/display'
import type { FieldDef } from '@/domain/types/fields'
import type { SongRequest } from '@/domain/types/song'
import StateToggle from './StateToggle.vue'

const props = defineProps<{ field: FieldDef; request: SongRequest }>()

const list = computed<string[]>(() => {
  const v = props.request.axes[props.field.id]?.value
  return Array.isArray(v) ? v : []
})
const { shownState, isPending, selectState, settle } = usePendingSpecified(
  () => props.request,
  () => props.field,
  () => list.value.length > 0,
)
const disabled = computed(() => shownState.value !== 'specified')
const items = computed(() =>
  (spec.vocabularyById.get(props.field.vocabulary!)?.items ?? []).map((i) => ({
    label: termLabel(spec, props.field, i.id),
    value: i.id,
  })),
)
const adding = ref<string | undefined>(undefined)

function write(next: string[]) {
  setSpecifiedValue(props.request, props.field, next)
  settle()
}
function add(id: string) {
  write([...list.value, id])
  adding.value = undefined
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
    <ol
      v-if="list.length"
      class="space-y-1"
      :class="disabled && 'opacity-50'"
      :data-testid="`sections-${field.id}`"
    >
      <li v-for="(id, i) in list" :key="`${i}-${id}`" class="flex items-center gap-2">
        <span class="w-6 text-right text-sm text-muted">{{ i + 1 }}.</span>
        <span class="flex-1 text-sm">{{ termLabel(spec, field, id) }}</span>
        <UButton
          size="xs"
          color="neutral"
          variant="outline"
          label="上へ"
          :disabled="disabled || i === 0"
          :data-testid="`up-${field.id}-${i}`"
          @click="write(moveSection(list, i, -1))"
        />
        <UButton
          size="xs"
          color="neutral"
          variant="outline"
          label="下へ"
          :disabled="disabled || i === list.length - 1"
          :data-testid="`down-${field.id}-${i}`"
          @click="write(moveSection(list, i, 1))"
        />
        <UButton
          size="xs"
          color="error"
          variant="outline"
          label="削除"
          :disabled="disabled || list.length <= 1"
          :data-testid="`remove-${field.id}-${i}`"
          @click="write(removeSection(list, i))"
        />
      </li>
    </ol>
    <USelect
      :model-value="adding"
      :items="items"
      :disabled="disabled"
      placeholder="セクションを追加"
      class="w-full sm:w-64"
      :data-testid="`add-${field.id}`"
      @update:model-value="(v: string) => add(v)"
    />
    <p v-if="isPending" class="text-xs text-muted" :data-testid="`pending-hint-${field.id}`">
      値を入力すると指定になります
    </p>
  </div>
</template>
