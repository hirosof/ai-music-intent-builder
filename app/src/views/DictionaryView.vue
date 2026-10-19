<script setup lang="ts">
// 辞典設定（presets.md §11・§11-5、判断ポイント211・212、U4e の決定 N3）。語彙ごとに、語の表示の有無を切り替える。
// 表は、名前・別名・所属カテゴリ・非表示の理由・代替・表示。カテゴリのある語彙は、カテゴリごとに一括で切り替える。
// 表示を切り替えられない語（軸が違う語・保留の語）は切り替えを出さない。変えたらすぐ UI 設定に保存する
import { computed, ref } from 'vue'
import { useUiSettings } from '@/composables/useUiSettings'
import { spec } from '@/data/spec'
import type { VocabularyItem } from '@/domain/types/presets'

const { isVisible, setVisible } = useUiSettings()

/** 単一選択・3値選択の項目が使う語彙（構成のセクションの語彙は除く。U4e の補完3） */
const vocabularies = computed(() => {
  const ids = new Set(
    spec.fieldsDef.fields
      .filter((f) => (f.kind === 'select' || f.kind === 'triSelect') && f.vocabulary)
      .map((f) => f.vocabulary!),
  )
  return [...spec.vocabularyById.values()].filter((v) => ids.has(v.id))
})
const vocabularyId = ref('genre')
const vocab = computed(() => spec.vocabularyById.get(vocabularyId.value)!)
const items = computed(() => vocabularies.value.map((v) => ({ label: v.label, value: v.id })))

const NOT_SWITCHABLE = new Set(['other-axis', 'hold'])
const switchable = (i: VocabularyItem) => !NOT_SWITCHABLE.has(i.exclusion?.kind ?? '')
const KIND_LABELS: Record<string, string> = {
  substitutable: '代替できる',
  'not-instrumental': 'インストでは成立しにくい',
  vocal: '歌唱で区別される語',
  contained: '包含する語',
  count: '数による整理',
  'other-axis': '軸が違う',
  hold: '保留',
}

interface Group {
  id: string
  label: string
  items: VocabularyItem[]
}
const groups = computed<Group[]>(() => {
  const v = vocab.value
  const byId = new Map(v.items.map((i) => [i.id, i]))
  if (!v.categories?.length) return [{ id: '_', label: '', items: v.items }]
  return [...v.categories]
    .sort((a, b) => a.order - b.order)
    .map((c) => ({
      id: c.id,
      label: c.label,
      items: c.itemOrder.map((id) => byId.get(id)).filter((i): i is VocabularyItem => !!i),
    }))
})
const categoryLabels = (i: VocabularyItem) =>
  (i.categories ?? [])
    .map((c) => vocab.value.categories?.find((x) => x.id === c)?.label ?? c)
    .join('、')
const hiddenCount = computed(
  () => vocab.value.items.filter((i) => !isVisible(vocab.value.id, i.id)).length,
)

function setGroup(g: Group, visible: boolean | 'default') {
  setVisible(
    vocab.value.id,
    g.items.filter(switchable).map((i) => i.id),
    visible,
  )
}
</script>

<template>
  <UDashboardPanel id="dictionary">
    <template #header>
      <UDashboardNavbar title="辞典設定" />
    </template>
    <template #body>
      <div class="mx-auto w-full max-w-5xl space-y-4">
        <p class="text-sm text-muted">
          語ごとに、選択の一覧に出すかを切り替えます。非表示にしても、指定済みの語や依頼文には影響しません。
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <USelect
            v-model="vocabularyId"
            :items="items"
            class="w-56"
            data-testid="dict-vocabulary"
          />
          <span class="text-sm text-muted" data-testid="dict-count"
            >{{ vocab.items.length }}語（うち非表示 {{ hiddenCount }}語）</span
          >
        </div>
        <section
          v-for="g in groups"
          :key="g.id"
          class="space-y-2"
          :data-testid="`dict-group-${g.id}`"
        >
          <div v-if="g.label" class="flex flex-wrap items-center gap-2">
            <h2 class="font-semibold">{{ g.label }}</h2>
            <UButton
              size="xs"
              color="neutral"
              variant="outline"
              label="すべて表示"
              :data-testid="`dict-show-${g.id}`"
              @click="setGroup(g, true)"
            />
            <UButton
              size="xs"
              color="neutral"
              variant="outline"
              label="すべて非表示"
              :data-testid="`dict-hide-${g.id}`"
              @click="setGroup(g, false)"
            />
            <UButton
              size="xs"
              color="neutral"
              variant="outline"
              label="既定に戻す"
              :data-testid="`dict-reset-${g.id}`"
              @click="setGroup(g, 'default')"
            />
          </div>
          <div class="overflow-x-auto rounded-md border border-default">
            <table class="w-full text-sm">
              <thead class="bg-elevated text-left">
                <tr>
                  <th class="px-3 py-2 whitespace-nowrap">名前</th>
                  <th class="px-3 py-2 whitespace-nowrap">別名</th>
                  <th v-if="vocab.categories?.length" class="px-3 py-2 whitespace-nowrap">
                    カテゴリ
                  </th>
                  <th class="px-3 py-2 whitespace-nowrap">非表示の理由</th>
                  <th class="px-3 py-2 whitespace-nowrap">代替</th>
                  <th class="px-3 py-2 whitespace-nowrap">表示</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="i in g.items"
                  :key="`${g.id}/${i.id}`"
                  class="border-t border-default align-top"
                  :data-testid="`dict-row-${i.id}`"
                >
                  <td class="px-3 py-1.5">{{ i.label }}</td>
                  <td class="px-3 py-1.5 text-muted">{{ (i.aliases ?? []).join('、') }}</td>
                  <td v-if="vocab.categories?.length" class="px-3 py-1.5 text-muted">
                    {{ categoryLabels(i) }}
                  </td>
                  <td class="px-3 py-1.5 text-muted">
                    <template v-if="i.exclusion">
                      {{ KIND_LABELS[i.exclusion.kind] ?? i.exclusion.kind
                      }}<template v-if="i.exclusion.note">: {{ i.exclusion.note }}</template>
                    </template>
                  </td>
                  <td class="px-3 py-1.5 text-muted">{{ i.exclusion?.substitute ?? '' }}</td>
                  <td class="px-3 py-1.5">
                    <USwitch
                      v-if="switchable(i)"
                      :model-value="isVisible(vocab.id, i.id)"
                      :aria-label="`${i.label}を表示`"
                      :data-testid="`dict-toggle-${i.id}`"
                      @update:model-value="(v: boolean) => setVisible(vocab.id, [i.id], v)"
                    />
                    <span v-else class="text-xs text-muted" :data-testid="`dict-fixed-${i.id}`"
                      >切り替え不可</span
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </template>
  </UDashboardPanel>
</template>
