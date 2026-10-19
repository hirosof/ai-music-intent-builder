<script setup lang="ts" generic="ColumnId extends string">
// 階層テーブル（presets.md §4-2〜§4-4・§11、U4c の決定 L3〜L5・L7）。試作 think/tree-select-prototype の Nuxt UI 版を移植。
// カテゴリ → 語の2段、1列目のクリックで開閉、検索（非表示の「検索用」の列へのグローバルフィルタ）、「非表示の語も表示」。
// 操作の列は呼び出し側が差し込む（スロット `cell-<列 id>`）。選べない語（軸が違う語・保留の語）は、操作の代わりに「自由記述へ転記」
import type { TableColumn } from '@nuxt/ui'
import { computed, ref, watch } from 'vue'
import { spec } from '@/data/spec'
import { useUiSettings } from '@/composables/useUiSettings'
import { buildTree, norm, type TreeCategory, type TreeItem } from '@/domain/editor/tree'

const props = defineProps<{
  vocabularyId: string
  /** 非表示でも出す語（指定中の語） */
  keep: ReadonlySet<string>
  /** 操作の列 */
  actionColumns: { id: ColumnId; header: string }[]
  testid: string
}>()
const emit = defineEmits<{ transfer: [label: string] }>()
defineSlots<Record<`cell-${ColumnId}`, (p: { item: TreeItem }) => unknown>>()

const { isVisible } = useUiSettings()
const query = ref('')
const showHidden = ref(false)

type Row = TreeCategory | TreeItem
const rows = computed<Row[]>(() =>
  buildTree(spec, props.vocabularyId, {
    showHidden: showHidden.value,
    isVisible: (id) => isVisible(props.vocabularyId, id),
    keep: props.keep,
  }),
)

const columns = computed<TableColumn<Row>[]>(() => [
  { accessorKey: 'label', header: '名前' },
  ...props.actionColumns.map((c) => ({ id: c.id, header: c.header })),
  { accessorKey: 'search', header: '検索用' }, // 非表示の列。グローバルフィルタの対象になる
])
const columnVisibility = ref({ search: false })

// 検索語は正規化して渡す。開閉: 検索を始めたらカテゴリをすべて開き、消したら検索前に戻す。
// 「非表示の語も表示」を切り替えても開閉は保つ（検索中だけ開き直す）。
// `true`（すべて展開）は語の行にも空の展開行を作るので、カテゴリの key だけを渡す（試作で目視して見つけた不具合）
const globalFilter = computed(() => norm(query.value))
const expanded = ref<Record<string, boolean>>({})
const allCategories = () => Object.fromEntries(rows.value.map((r) => [r.key, true]))
let beforeSearch: Record<string, boolean> = {}
watch(globalFilter, (q, old) => {
  if (q && !old) beforeSearch = { ...expanded.value }
  if (q) expanded.value = allCategories()
  else if (old) expanded.value = beforeSearch
})
watch(showHidden, () => {
  if (globalFilter.value) expanded.value = allCategories()
})

// filterFromLeafRows（子が一致すれば親を残す）は、型の上では列の絞り込みの設定。実行時は同じ表の設定に入る（試作は global-filter-options に渡していた）
// 公式の tree data の例と同じ指定で、展開用の空のセルの余白と罫線を消す
const tableUi = {
  base: 'border-separate border-spacing-0',
  tbody: '[&>tr]:last:[&>td]:border-b-0',
  tr: 'group',
  th: 'whitespace-nowrap',
  td: 'empty:p-0 group-has-[td:not(:empty)]:border-b border-default py-1.5',
}

const tooltip = (item: TreeItem) =>
  [item.termEn && item.termEn !== item.label ? item.termEn : '', ...item.aliases]
    .filter(Boolean)
    .join(' ／ ')
const asItem = (r: Row) => r as TreeItem
</script>

<template>
  <div class="space-y-2" :data-testid="testid">
    <div class="flex flex-wrap items-center gap-3">
      <UInput
        v-model="query"
        placeholder="検索（別名・英語表記・カテゴリ名も）"
        class="w-full sm:w-72"
        :data-testid="`${testid}-search`"
      />
      <UCheckbox
        v-model="showHidden"
        label="非表示の語も表示"
        :data-testid="`${testid}-show-hidden`"
      />
    </div>
    <UTable
      v-model:expanded="expanded"
      v-model:column-visibility="columnVisibility"
      :data="rows"
      :columns="columns"
      :get-sub-rows="(row: Row) => (row.kind === 'category' ? (row.children as Row[]) : undefined)"
      :get-row-id="(row: Row) => row.key"
      :global-filter="globalFilter"
      :column-filters-options="{ filterFromLeafRows: true }"
      :ui="tableUi"
      sticky
      class="h-[55vh] rounded-md border border-default"
    >
      <template #label-cell="{ row }">
        <div
          v-if="row.original.kind === 'category'"
          class="flex cursor-pointer items-center gap-1 font-semibold"
          :data-testid="`${testid}-cat-${row.original.id}`"
          @click="row.toggleExpanded()"
        >
          <UIcon
            :name="row.getIsExpanded() ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
            class="size-4 shrink-0"
          />
          <span>{{ row.original.label }}</span>
          <span class="text-xs font-normal text-dimmed"
            >（{{ row.original.children.length }}）</span
          >
        </div>
        <div v-else class="ps-5" :data-testid="`${testid}-row-${row.original.key}`">
          <div class="flex flex-wrap items-center gap-1">
            <UTooltip
              :text="tooltip(asItem(row.original))"
              :disabled="!tooltip(asItem(row.original))"
            >
              <span :class="row.original.hidden && 'text-dimmed'">{{ row.original.label }}</span>
            </UTooltip>
            <span
              v-if="row.original.hidden"
              class="rounded border border-warning px-1 text-[11px] text-warning"
              >非表示の語</span
            >
            <UButton
              v-if="!asItem(row.original).selectable"
              size="xs"
              variant="link"
              label="自由記述へ転記"
              :data-testid="`${testid}-transfer-${row.original.id}`"
              @click="emit('transfer', row.original.label)"
            />
          </div>
          <details
            v-if="row.original.hidden && asItem(row.original).exclusion"
            class="text-xs text-muted"
          >
            <summary class="cursor-pointer">非表示の理由</summary>
            <p v-if="asItem(row.original).exclusion?.note">
              {{ asItem(row.original).exclusion?.note }}
            </p>
            <p v-if="asItem(row.original).exclusion?.substitute">
              代替: {{ asItem(row.original).exclusion?.substitute }}
            </p>
            <p v-if="asItem(row.original).exclusion?.targetAxis">
              行き先: {{ asItem(row.original).exclusion?.targetAxis }}
            </p>
          </details>
        </div>
      </template>
      <template v-for="c in actionColumns" :key="c.id" #[`${c.id}-cell`]="{ row }">
        <slot
          v-if="row.original.kind === 'item' && asItem(row.original).selectable"
          :name="`cell-${c.id}`"
          :item="asItem(row.original)"
        />
      </template>
    </UTable>
  </div>
</template>
