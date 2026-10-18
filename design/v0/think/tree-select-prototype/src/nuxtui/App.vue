<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import genreJson from '../data/genre.json'
import { buildCategoryRows, norm } from '../shared/tree'
import { STATE_LABELS, useSelection } from '../shared/selection'
import type { GenreFile, State } from '../shared/types'

const genre = genreJson as unknown as GenreFile
const query = ref('')
const showHidden = ref(false)
const selection = useSelection()

/** UTable の1行。カテゴリは children を持ち、語は持たない */
interface Row {
  key: string
  kind: 'category' | 'item'
  id: string
  label: string
  termEn?: string
  hidden?: boolean
  /** 検索用の列。正規化済みの「名前・別名・英語表記・所属カテゴリ名」。語の行にはカテゴリ名も入れ、カテゴリ名の一致で配下がすべて残るようにする */
  search: string
  children?: Row[]
}

const rows = computed<Row[]>(() =>
  buildCategoryRows(genre, { showHidden: showHidden.value }).map((cat) => {
    const catText = [cat.label, ...cat.aliases]
    return {
      key: cat.key,
      kind: 'category' as const,
      id: cat.id,
      label: cat.label,
      search: norm(catText.join(' ')),
      children: cat.children.map((c) => ({
        key: c.key,
        kind: 'item' as const,
        id: c.id,
        label: c.label,
        termEn: c.termEn,
        hidden: c.hidden,
        search: norm([c.label, c.termEn ?? '', ...c.aliases, ...catText].join(' ')),
      })),
    }
  }),
)

const columns: TableColumn<Row>[] = [
  { accessorKey: 'label', header: '名前' },
  { id: 'state', header: '状態' },
  { accessorKey: 'search', header: '検索用' }, // 非表示の列。グローバルフィルタの対象になる
]
const columnVisibility = ref({ search: false })

// 検索語は正規化して渡す（全角半角・大小・ひらがな/カタカナを区別しない）
const globalFilter = computed(() => norm(query.value))
// 開閉の状態。検索を始めたら、カテゴリをすべて開く。検索を消したら、検索前の開閉状態に戻す。
// 「非表示の語も表示」を切り替えても、開閉の状態は変えない（検索中だけ、残るカテゴリが変わるので開き直す）。
// `true`（すべて展開）にすると、語（葉）の行の直後にも空の展開行が作られるので、カテゴリの key だけを渡す
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

// UTable は、展開した行の直後に、展開用の空の行（colspan の <td>）を1行足す。
// 公式の tree data の例と同じ指定で、空のセルの余白と罫線を消す
const tableUi = {
  base: 'border-separate border-spacing-0',
  tbody: '[&>tr]:last:[&>td]:border-b-0',
  tr: 'group',
  td: 'empty:p-0 group-has-[td:not(:empty)]:border-b border-default',
}

const stateOptions = Object.entries(STATE_LABELS) as [State, string][]
</script>

<template>
  <UApp>
    <div class="mx-auto my-6 max-w-3xl px-4">
      <h1 class="text-xl font-bold">試作: Nuxt UI（Table の tree data）</h1>
      <p class="my-2 text-sm text-muted">
        ジャンル（<code>genre.json</code>）を、カテゴリ → 語の2段で表示。1列目をクリックで開閉、右の列で3値を切り替える。検索は「検索用」の非表示の列に対するグローバルフィルタ。
      </p>

      <div class="my-3 flex items-center gap-4">
        <UInput v-model="query" placeholder="検索（別名・英語表記・カテゴリ名。例: シティポップ）" class="w-96" />
        <UCheckbox v-model="showHidden" label="非表示の語も表示（辞典）" />
      </div>

      <UTable
        v-model:expanded="expanded"
        v-model:column-visibility="columnVisibility"
        :data="rows"
        :columns="columns"
        :get-sub-rows="(row: Row) => row.children"
        :get-row-id="(row: Row) => row.key"
        :global-filter="globalFilter"
        :global-filter-options="{ filterFromLeafRows: true }"
        :ui="tableUi"
        sticky
        class="h-[520px] border border-default"
      >
        <template #label-cell="{ row }">
          <div
            class="flex items-center gap-1"
            :class="row.original.kind === 'category' ? 'cursor-pointer font-semibold' : row.original.hidden ? 'ps-6 text-dimmed' : 'ps-6'"
            :data-testid="`name-${row.original.key}`"
            @click="row.getCanExpand() && row.toggleExpanded()"
          >
            <UIcon
              v-if="row.original.kind === 'category'"
              :name="row.getIsExpanded() ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
              class="size-4 shrink-0"
            />
            <span>{{ row.original.label }}</span>
            <span v-if="row.original.kind === 'category'" class="text-xs font-normal text-dimmed">（{{ row.original.children?.length }}）</span>
            <span v-else-if="row.original.termEn && row.original.termEn !== row.original.label" class="ms-1 text-xs text-dimmed">{{ row.original.termEn }}</span>
            <span v-if="row.original.hidden" class="ms-1 rounded border px-1 text-[11px] text-warning">非表示の語</span>
          </div>
        </template>

        <template #state-cell="{ row }">
          <UFieldGroup v-if="row.original.kind === 'item'" :data-testid="`state-${row.original.key}`">
            <UButton
              v-for="[value, text] in stateOptions"
              :key="value"
              size="xs"
              color="neutral"
              :variant="selection.get(row.original.id) === value ? 'solid' : 'outline'"
              :data-active="selection.get(row.original.id) === value"
              @click="selection.set(row.original.id, value)"
            >{{ text }}</UButton>
          </UFieldGroup>
        </template>
      </UTable>

      <div class="mt-3 text-sm leading-7" data-testid="summary">
        <div><b>使用する</b>（{{ selection.used.value.length }}）: {{ selection.used.value.join(', ') || '—' }}</div>
        <div><b>使用しない</b>（{{ selection.avoided.value.length }}）: {{ selection.avoided.value.join(', ') || '—' }}</div>
      </div>
    </div>
  </UApp>
</template>
