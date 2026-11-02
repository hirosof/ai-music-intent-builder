<script setup lang="ts">
// 曲の構成（U4b の決定 K6。UI 判断ポイント74〜76・79）: 並びの行ごとに「上へ」「下へ」「削除」のメニュー（…）、末尾に「追加」。
// 行の先頭のハンドルからドラッグでも並び替えられる（判断ポイント76）。
// 空の並びはデータに入れない（最後の1つは消せない。①をやめるときは状態を切り替える）。
// 歌ありのときだけ、各行に歌の印の切り替えを出す（押すと歌あり／歌なしが入れ替わる）。追加の選択肢は語彙のグループごとに見出しを付ける。
// 「ひな型として保存」「ひな型から読み込む」は判断ポイント75。入力欄の下に、その場で開く（ダイアログを重ねない。細部 (c')）
import type { DropdownMenuItem } from '@nuxt/ui'
import { useSortable } from '@vueuse/integrations/useSortable'
import type { SortableEvent } from 'sortablejs'
import { computed, ref, useTemplateRef, watch } from 'vue'
import { spec } from '@/data/spec'
import { usePendingSpecified } from '@/composables/usePendingSpecified'
import {
  moveSection,
  moveSectionTo,
  newSection,
  removeSection,
  selectMenu,
  setSpecifiedValue,
  stateOptions,
  toggleSung,
} from '@/domain/editor/edit'
import { displaySections, termLabel } from '@/domain/editor/display'
import {
  sectionsForTemplate,
  sectionsFromTemplate,
  type StructureTemplate,
} from '@/domain/storage/structure-templates'
import type { FieldDef } from '@/domain/types/fields'
import type { SectionElement, SongRequest } from '@/domain/types/song'
import StateToggle from './StateToggle.vue'
import TemplateLoadPanel from './TemplateLoadPanel.vue'
import TemplateSavePanel from './TemplateSavePanel.vue'

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

// 行の操作のメニュー（判断ポイント79。「削除」は区切り線の後ろ。端の行の移動と、最後の1つの削除は無効の項目）
function rowMenu(i: number): DropdownMenuItem[][] {
  return [
    [
      { label: '上へ', disabled: i === 0, onSelect: () => write(moveSection(list.value, i, -1)) },
      {
        label: '下へ',
        disabled: i === list.value.length - 1,
        onSelect: () => write(moveSection(list.value, i, 1)),
      },
    ],
    [
      {
        label: '削除',
        color: 'error',
        disabled: list.value.length <= 1,
        onSelect: () => write(removeSection(list.value, i)),
      },
    ],
  ]
}

// ドラッグでの並び替え（判断ポイント76）。Sortable が動かした行を元の位置に戻してから値を書き、DOM は Vue に任せる。
// 末尾の行は v-for の終わりの目印の前に戻す（目印より後ろに置くと、次の追加で順序が崩れる）
function onDragUpdate(e: SortableEvent) {
  const { item, from, oldIndex, newIndex } = e
  if (oldIndex === undefined || newIndex === undefined) return
  item.remove()
  from.insertBefore(item, from.children[oldIndex] ?? from.lastElementChild?.nextSibling ?? null)
  write(moveSectionTo(list.value, oldIndex, newIndex))
}
const listEl = useTemplateRef<HTMLElement>('listEl')
const { option: sortableOption } = useSortable(listEl, list, {
  handle: '[data-drag-handle]',
  animation: 150,
  // マウスでもタッチと同じ動きにする（ポップアップの中でネイティブの DnD に頼らない）
  forceFallback: true,
  disabled: disabled.value,
  onUpdate: onDragUpdate,
})
watch(disabled, (v) => sortableOption('disabled', v))

// 構成のひな型（判断ポイント75）。開いている範囲は1つだけ（片方を開くと、もう片方は閉じる）
const panel = ref<'save' | 'load' | null>(null)
function togglePanel(p: 'save' | 'load') {
  panel.value = panel.value === p ? null : p
}
const canSaveTemplate = computed(() => !disabled.value && list.value.length > 0)
// 保存の範囲を開いたまま①指定をやめたら閉じる（保存は①指定のときだけ）
watch(canSaveTemplate, (can) => {
  if (!can && panel.value === 'save') panel.value = null
})
const templateSections = computed(() =>
  sectionsForTemplate(spec, list.value, props.request.vocalMode),
)
const label = (sections: readonly SectionElement[]) =>
  displaySections(spec, props.field, sections, vocal.value)
function templateLabel(t: StructureTemplate) {
  return label(sectionsFromTemplate(spec, t.sections, props.request.vocalMode))
}
function applyTemplate(t: StructureTemplate) {
  write(sectionsFromTemplate(spec, t.sections, props.request.vocalMode))
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
    <!-- Sortable を要素に結び付けたままにするため、v-if にしない -->
    <ol
      v-show="list.length"
      ref="listEl"
      class="space-y-1"
      :class="disabled && 'opacity-50'"
      :data-testid="`sections-${field.id}`"
    >
      <li
        v-for="(section, i) in list"
        :key="`${i}-${section.id}`"
        class="flex flex-wrap items-center gap-2 bg-default"
      >
        <!-- つかむ所（判断ポイント76）。キーボード・読み上げはメニューの「上へ」「下へ」で操作するので、読み上げからは隠す。
             data-vaul-no-drag: スマホ幅のドロワーが、ここからのドラッグを閉じる操作と取り違えないように -->
        <span
          data-drag-handle
          data-vaul-no-drag
          aria-hidden="true"
          title="ドラッグで並び替え"
          class="flex size-7 shrink-0 touch-none items-center justify-center rounded text-muted"
          :class="disabled ? 'cursor-not-allowed' : 'cursor-grab hover:bg-elevated'"
          :data-testid="`handle-${field.id}-${i}`"
        >
          <UIcon name="i-lucide-grip-vertical" class="size-4" />
        </span>
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
        <UDropdownMenu :items="rowMenu(i)" :disabled="disabled" :content="{ align: 'end' }">
          <UButton
            size="xs"
            color="neutral"
            variant="outline"
            label="…"
            :aria-label="`${i + 1}番目（${termLabel(spec, field, section.id)}）の操作`"
            :data-testid="`actions-${field.id}-${i}`"
          />
        </UDropdownMenu>
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
    <div class="flex flex-wrap gap-2">
      <UButton
        size="xs"
        color="neutral"
        :variant="panel === 'save' ? 'subtle' : 'outline'"
        icon="i-lucide-bookmark-plus"
        label="ひな型として保存"
        :disabled="!canSaveTemplate"
        :aria-expanded="panel === 'save'"
        data-testid="template-save-open"
        @click="togglePanel('save')"
      />
      <UButton
        size="xs"
        color="neutral"
        :variant="panel === 'load' ? 'subtle' : 'outline'"
        icon="i-lucide-bookmark"
        label="ひな型から読み込む"
        :aria-expanded="panel === 'load'"
        data-testid="template-load-open"
        @click="togglePanel('load')"
      />
    </div>
    <TemplateSavePanel
      v-if="panel === 'save'"
      :sections="templateSections"
      :label="label(list)"
      @close="panel = null"
    />
    <TemplateLoadPanel
      v-if="panel === 'load'"
      :has-current="list.length > 0"
      :label-of="templateLabel"
      @select="applyTemplate"
      @close="panel = null"
    />
  </div>
</template>
