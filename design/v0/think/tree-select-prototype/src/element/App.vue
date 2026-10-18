<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import genreJson from '../data/genre.json'
import { buildCategoryRows, filterRows } from '../shared/tree'
import { STATE_LABELS, useSelection } from '../shared/selection'
import type { CategoryRow, GenreFile, ItemRow, State } from '../shared/types'

const genre = genreJson as unknown as GenreFile
const query = ref('')
const showHidden = ref(false)
const selection = useSelection()

const allRows = computed(() => buildCategoryRows(genre, { showHidden: showHidden.value }))
const rows = computed(() => filterRows(allRows.value, query.value))

// 開閉の状態。表に渡すキー（expandKeys）と、表の実際の状態（current。表の expand-change で追う）を持つ
const tableRef = ref<{ toggleRowExpansion: (row: unknown, expanded?: boolean) => void } | null>(null)
const expandKeys = ref<string[]>([])
const current = new Set<string>()
let beforeSearch: string[] = []
function setExpanded(keys: string[]) {
  expandKeys.value = keys
  current.clear()
  keys.forEach((k) => current.add(k))
}
function onExpandChange(row: Row, expanded: boolean) {
  if (row.kind !== 'category') return
  if (expanded) current.add(row.key)
  else current.delete(row.key)
}
const searching = () => !!query.value.trim()

// 検索を始めたら、残ったカテゴリをすべて開く。検索を消したら、検索前の開閉状態に戻す。
// 「非表示の語も表示」を切り替えても、開閉の状態は変えない（検索中だけ、残るカテゴリが変わるので開き直す）
watch(query, (q, old) => {
  const was = !!old?.trim()
  const now = !!q.trim()
  if (now && !was) beforeSearch = [...current]
  if (now) setExpanded(rows.value.map((c) => c.key))
  else if (was) setExpanded(beforeSearch)
})
watch(showHidden, () => {
  if (searching()) setExpanded(rows.value.map((c) => c.key))
})

type Row = CategoryRow | ItemRow

/** 1列目のクリックで、カテゴリの子を開閉する（要望） */
function onNameClick(row: Row) {
  if (row.kind === 'category') tableRef.value?.toggleRowExpansion(row)
}

const stateOptions = Object.entries(STATE_LABELS) as [State, string][]
</script>

<template>
  <div class="page">
    <h1>試作: Element Plus（階層テーブル）</h1>
    <p class="note">
      ジャンル（<code>genre.json</code>）を、カテゴリ → 語の2段で表示。1列目をクリックで開閉、右の列で3値を切り替える。
    </p>

    <div class="toolbar">
      <el-input v-model="query" placeholder="検索（別名・英語表記・カテゴリ名。例: シティポップ）" clearable style="max-width: 360px" />
      <el-checkbox v-model="showHidden">非表示の語も表示（辞典）</el-checkbox>
    </div>

    <el-table
      ref="tableRef"
      :data="rows"
      row-key="key"
      :tree-props="{ children: 'children' }"
      :expand-row-keys="expandKeys"
      @expand-change="onExpandChange"
      max-height="520"
      border
      size="small"
      class="genre-table"
    >
      <el-table-column label="名前" min-width="260">
        <template #default="{ row }: { row: Row }">
          <span
            class="name"
            :class="[row.kind, { hidden: row.kind === 'item' && row.hidden }]"
            :data-testid="`name-${row.key}`"
            @click="onNameClick(row)"
          >
            {{ row.label }}
          </span>
          <span v-if="row.kind === 'category'" class="count">（{{ row.children.length }}）</span>
          <span v-else-if="row.termEn && row.termEn !== row.label" class="en">{{ row.termEn }}</span>
          <span v-if="row.kind === 'item' && row.hidden" class="tag">非表示の語</span>
        </template>
      </el-table-column>
      <el-table-column label="状態" width="270">
        <template #default="{ row }: { row: Row }">
          <el-radio-group
            v-if="row.kind === 'item'"
            :model-value="selection.get(row.id)"
            size="small"
            :data-testid="`state-${row.key}`"
            @update:model-value="(v: State) => selection.set(row.id, v)"
          >
            <el-radio-button v-for="[value, label] in stateOptions" :key="value" :value="value">{{ label }}</el-radio-button>
          </el-radio-group>
        </template>
      </el-table-column>
    </el-table>

    <div class="summary" data-testid="summary">
      <div><b>使用する</b>（{{ selection.used.value.length }}）: {{ selection.used.value.join(', ') || '—' }}</div>
      <div><b>使用しない</b>（{{ selection.avoided.value.length }}）: {{ selection.avoided.value.join(', ') || '—' }}</div>
    </div>
  </div>
</template>

<style scoped>
.page { max-width: 820px; margin: 24px auto; padding: 0 16px; font-family: system-ui, sans-serif; }
.note { color: #666; font-size: 13px; }
.toolbar { display: flex; gap: 16px; align-items: center; margin: 12px 0; }
.name { cursor: default; }
.name.category { cursor: pointer; font-weight: 600; }
.name.hidden { color: #999; }
.count { color: #888; margin-left: 4px; font-size: 12px; }
.en { color: #888; margin-left: 8px; font-size: 12px; }
.tag { margin-left: 8px; font-size: 11px; color: #a60; border: 1px solid #e5b; border-radius: 3px; padding: 0 4px; }
.summary { margin-top: 12px; font-size: 13px; line-height: 1.7; }
</style>
