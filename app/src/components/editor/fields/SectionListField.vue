<script setup lang="ts">
// 曲の構成（U4b の決定 K6。UI 判断ポイント74）: 並びの行ごとに「上へ」「下へ」「削除」、末尾に「追加」。ドラッグはしない。
// 空の並びはデータに入れない（最後の1つは消せない。①をやめるときは状態を切り替える）。
// 歌ありのときだけ、各行に歌の印の切り替えを出す（押すと歌あり／歌なしが入れ替わる）。追加の選択肢は語彙のグループごとに見出しを付ける
import { computed, ref } from 'vue'
import { spec } from '@/data/spec'
import { usePendingSpecified } from '@/composables/usePendingSpecified'
import {
  moveSection,
  newSection,
  removeSection,
  selectMenu,
  setSpecifiedValue,
  stateOptions,
  toggleSung,
} from '@/domain/editor/edit'
import { termLabel } from '@/domain/editor/display'
import type { FieldDef } from '@/domain/types/fields'
import type { SectionElement, SongRequest } from '@/domain/types/song'
import StateToggle from './StateToggle.vue'

const props = defineProps<{ field: FieldDef; request: SongRequest }>()

const list = computed<SectionElement[]>(() => {
  const v = props.request.axes[props.field.id]?.value
  return Array.isArray(v) ? v : []
})
const vocal = computed(() => props.request.vocalMode === 'vocal')
const { shownState, isPending, selectState, settle } = usePendingSpecified(
  () => props.request,
  () => props.field,
  () => list.value.length > 0,
)
const disabled = computed(() => shownState.value !== 'specified')
const items = computed(() =>
  selectMenu(
    spec,
    props.field,
    (spec.vocabularyById.get(props.field.vocabulary!)?.items ?? []).map((i) => ({
      label: termLabel(spec, props.field, i.id),
      value: i.id,
      pseudo: false,
    })),
  ).map((e) =>
    e.type === 'item'
      ? { label: e.option.label, value: e.option.value }
      : e.type === 'label'
        ? { type: 'label' as const, label: e.label }
        : { type: 'separator' as const },
  ),
)
// 選んだあとは選択肢を空に戻す（部品を作り直す。そのままだと部品が選んだ語を覚え、同じ語を続けて足せない）
const addKey = ref(0)

function write(next: SectionElement[]) {
  setSpecifiedValue(props.request, props.field, next)
  settle()
}
function add(id: string) {
  write([...list.value, newSection(spec, props.request, id)])
  addKey.value++
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
      <li
        v-for="(section, i) in list"
        :key="`${i}-${section.id}`"
        class="flex flex-wrap items-center gap-2"
      >
        <span class="w-6 text-right text-sm text-muted">{{ i + 1 }}.</span>
        <span class="min-w-24 flex-1 text-sm">{{ termLabel(spec, field, section.id) }}</span>
        <UButton
          v-if="vocal"
          size="xs"
          :color="section.sung === false ? 'neutral' : 'primary'"
          :variant="section.sung === false ? 'outline' : 'subtle'"
          :label="section.sung === false ? '歌なし' : '歌あり'"
          :aria-pressed="section.sung !== false"
          :disabled="disabled"
          :data-testid="`sung-${field.id}-${i}`"
          @click="write(toggleSung(list, i))"
        />
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
      :key="addKey"
      :items="items"
      :disabled="disabled"
      placeholder="セクションを追加"
      class="w-full sm:w-64"
      :data-testid="`add-${field.id}`"
      @update:model-value="(v: string | undefined) => v !== undefined && add(v)"
    />
    <p v-if="isPending" class="text-xs text-muted" :data-testid="`pending-hint-${field.id}`">
      値を入力すると指定になります
    </p>
  </div>
</template>
