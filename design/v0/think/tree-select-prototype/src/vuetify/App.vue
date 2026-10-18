<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { mdiChevronDown, mdiChevronRight } from '@mdi/js'
import genreJson from '../data/genre.json'
import { buildCategoryRows, flatMatches, flatten } from '../shared/tree'
import { STATE_LABELS, useSelection } from '../shared/selection'
import type { FlatRow, GenreFile, State } from '../shared/types'

const genre = genreJson as unknown as GenreFile
const query = ref('')
const showHidden = ref(false)
const selection = useSelection()

// 同じ語は所属カテゴリの数だけ行にする（グループ化は1行が1グループにしか属せないため）
const items = computed(() => flatten(buildCategoryRows(genre, { showHidden: showHidden.value })))
const headers = [
  { title: '名前', key: 'label', sortable: false },
  { title: '状態', key: 'state', sortable: false, width: 300 },
]
// グループの並びはキー（order を前置）の昇順。行の並びは元のまま（itemOrder）
const groupBy = [{ key: 'categoryKey', order: 'asc' as const }]

// 検索は DataTable の search / custom-filter に任せる（カテゴリ名一致なら配下すべて）
const customFilter = (_value: unknown, q: string | null, item?: { raw: FlatRow }) =>
  !q || !item ? true : flatMatches(item.raw, q)

// 開閉の状態（グループ id の一覧。v-model:opened で、利用者の操作も自動で反映される）。グループ id は既定で `root_categoryKey_<値>`
const opened = ref<string[]>([])
const groupId = (categoryKey: string) => `root_categoryKey_${categoryKey}`
const searchOpen = () => [...new Set(items.value.filter((r) => flatMatches(r, query.value)).map((r) => groupId(r.categoryKey)))]
let beforeSearch: string[] = []

// 検索を始めたら、該当グループをすべて開く。検索を消したら、検索前の開閉状態に戻す。
// 「非表示の語も表示」を切り替えても、開閉の状態は変えない（検索中だけ、残るグループが変わるので開き直す）
watch(query, (q, old) => {
  const was = !!old?.trim()
  const now = !!q.trim()
  if (now && !was) beforeSearch = [...opened.value]
  if (now) opened.value = searchOpen()
  else if (was) opened.value = beforeSearch
})
watch(showHidden, () => {
  if (query.value.trim()) opened.value = searchOpen()
})

const stateOptions = Object.entries(STATE_LABELS) as [State, string][]
const label = (categoryKey: string) => items.value.find((r) => r.categoryKey === categoryKey)?.categoryLabel ?? categoryKey
const count = (categoryKey: string) => items.value.filter((r) => r.categoryKey === categoryKey).length
</script>

<template>
  <v-app>
    <v-main>
      <div class="page">
        <h1>試作: Vuetify（DataTable のグループ化）</h1>
        <p class="note">
          ジャンル（<code>genre.json</code>）を、カテゴリ（グループ）→ 語の2段で表示。グループ見出しをクリックで開閉、右の列で3値を切り替える。
        </p>

        <div class="toolbar">
          <v-text-field
            v-model="query"
            placeholder="検索（別名・英語表記・カテゴリ名。例: シティポップ）"
            clearable hide-details density="compact" variant="outlined" style="max-width: 360px"
          />
          <v-checkbox v-model="showHidden" label="非表示の語も表示（辞典）" hide-details density="compact" />
        </div>

        <v-data-table
          v-model:opened="opened"
          :headers="headers"
          :items="items"
          item-value="key"
          :group-by="groupBy"
          :search="query"
          :custom-filter="customFilter"
          :items-per-page="-1"
          hide-default-footer
          density="compact"
          height="520"
          fixed-header
          class="genre-table"
        >
          <template #group-header="{ item, columns, toggleGroup, isGroupOpen }">
            <tr class="group-row">
              <td :colspan="columns.length" class="group-cell" :data-testid="`group-${item.value}`" @click="toggleGroup(item)">
                <v-icon :icon="isGroupOpen(item) ? mdiChevronDown : mdiChevronRight" size="small" />
                <b>{{ label(item.value as string) }}</b>
                <span class="count">（{{ count(item.value as string) }}）</span>
              </td>
            </tr>
          </template>

          <template #item.label="{ item }">
            <span :class="{ hidden: item.hidden }" :data-testid="`name-${item.key}`">{{ item.label }}</span>
            <span v-if="item.termEn && item.termEn !== item.label" class="en">{{ item.termEn }}</span>
            <span v-if="item.hidden" class="tag">非表示の語</span>
          </template>

          <template #item.state="{ item }">
            <v-btn-toggle
              :model-value="selection.get(item.id)"
              density="compact" variant="outlined" divided mandatory
              :data-testid="`state-${item.key}`"
              @update:model-value="(v: State) => selection.set(item.id, v)"
            >
              <v-btn v-for="[value, text] in stateOptions" :key="value" :value="value" size="small">{{ text }}</v-btn>
            </v-btn-toggle>
          </template>
        </v-data-table>

        <div class="summary" data-testid="summary">
          <div><b>使用する</b>（{{ selection.used.value.length }}）: {{ selection.used.value.join(', ') || '—' }}</div>
          <div><b>使用しない</b>（{{ selection.avoided.value.length }}）: {{ selection.avoided.value.join(', ') || '—' }}</div>
        </div>
      </div>
    </v-main>
  </v-app>
</template>

<style scoped>
.page { max-width: 820px; margin: 24px auto; padding: 0 16px; }
.note { color: #666; font-size: 13px; }
.toolbar { display: flex; gap: 16px; align-items: center; margin: 12px 0; }
.group-cell { cursor: pointer; background: rgba(0, 0, 0, 0.04); }
.count { color: #888; margin-left: 4px; font-size: 12px; }
.en { color: #888; margin-left: 8px; font-size: 12px; }
.hidden { color: #999; }
.tag { margin-left: 8px; font-size: 11px; color: #a60; border: 1px solid #e5b; border-radius: 3px; padding: 0 4px; }
.summary { margin-top: 12px; font-size: 13px; line-height: 1.7; }
</style>
