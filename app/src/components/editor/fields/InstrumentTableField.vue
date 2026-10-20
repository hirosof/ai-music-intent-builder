<script setup lang="ts">
// 楽器の統合テーブル（判断ポイント31・D1、U4c の決定 L2）。主旋律・伴奏・リズムの3項目を1つのテーブルで見せる。
// 役割ごとの状態の切り替え、役割のチェック（その役割が①のときだけ）、共通の「除外」（①の役割すべてに書く）。
// データは3つの項目（各 choices）のまま。
// 畳み方（判断ポイント54・補完③）: 3項目のいずれかが①指定のときに開き、すべてが①でないときは畳む。「一覧を開く」で独立に開閉
import { computed } from 'vue'
import { useFold } from '@/composables/useFold'
import { spec } from '@/data/spec'
import { termLabel } from '@/domain/editor/display'
import {
  currentState,
  isInstrumentExcluded,
  isRoleUsed,
  linkedInstrumentFields,
  setFreeText,
  setInstrumentExcluded,
  setRoleState,
  setRoleUse,
  stateOptions,
} from '@/domain/editor/edit'
import type { SongRequest } from '@/domain/types/song'
import StateToggle from './StateToggle.vue'
import TreeTable from './TreeTable.vue'

const props = defineProps<{ request: SongRequest }>()

const roles = computed(() => linkedInstrumentFields(spec).map((id) => spec.fieldById.get(id)!))
const ROLE_SHORT: Record<string, string> = {
  leadInstruments: '主旋律',
  accompanimentInstruments: '伴奏',
  rhythmInstruments: 'リズム',
}
const vocabularyId = computed(() => roles.value[0]!.vocabulary!)
const roleSpecified = (id: string) => props.request.axes[id]?.state === 'specified'
const anySpecified = computed(() => roles.value.some((r) => roleSpecified(r.id)))
const fold = useFold(() => anySpecified.value)
const keep = computed(
  () => new Set(roles.value.flatMap((r) => Object.keys(props.request.axes[r.id]?.choices ?? {}))),
)
type Col = 'leadInstruments' | 'accompanimentInstruments' | 'rhythmInstruments' | 'exclude'
const columns = computed<{ id: Col; header: string }[]>(() => [
  ...roles.value.map((r) => ({ id: r.id as Col, header: ROLE_SHORT[r.id] ?? r.label })),
  { id: 'exclude', header: '除外' },
])
const excluded = (termId: string) => isInstrumentExcluded(spec, props.request, termId)
const summary = (roleId: string) =>
  Object.entries(props.request.axes[roleId]?.choices ?? {})
    .filter(([, c]) => c === 'use')
    .map(([id]) => termLabel(spec, roles.value[0]!, id))
    .join(', ') || '—'
const excludedList = computed(
  () =>
    [...keep.value]
      .filter((id) => excluded(id))
      .map((id) => termLabel(spec, roles.value[0]!, id))
      .join(', ') || '—',
)
</script>

<template>
  <div class="space-y-3" data-testid="instrument-table">
    <div class="grid gap-2 sm:grid-cols-3">
      <div v-for="r in roles" :key="r.id" class="space-y-1">
        <div class="text-sm font-semibold">{{ r.label }}</div>
        <StateToggle
          :options="stateOptions(spec, r)"
          :model-value="currentState(request, r)"
          :testid="`state-${r.id}`"
          @update:model-value="(s) => setRoleState(spec, request, r, s)"
        />
      </div>
    </div>
    <UButton
      size="sm"
      color="neutral"
      variant="outline"
      :label="fold.label()"
      data-testid="fold-instruments"
      @click="fold.toggle()"
    />
    <template v-if="fold.open.value">
      <TreeTable
        :vocabulary-id="vocabularyId"
        :keep="keep"
        :action-columns="columns"
        testid="tree-instruments"
      >
        <template v-for="r in roles" :key="r.id" #[`cell-${r.id}`]="{ item }">
          <UCheckbox
            :model-value="isRoleUsed(request, r.id, item.id)"
            :disabled="!roleSpecified(r.id) || excluded(item.id)"
            :aria-label="`${item.label}を${ROLE_SHORT[r.id]}で使う`"
            :data-testid="`use-${r.id}-${item.id}`"
            @update:model-value="(v: unknown) => setRoleUse(request, r, item.id, v === true)"
          />
        </template>
        <template #cell-exclude="{ item }">
          <UButton
            size="xs"
            :label="excluded(item.id) ? '除外中' : '除外'"
            :color="excluded(item.id) ? 'error' : 'neutral'"
            :variant="excluded(item.id) ? 'solid' : 'outline'"
            :disabled="!anySpecified"
            :data-testid="`exclude-${item.id}`"
            @click="setInstrumentExcluded(spec, request, item.id, !excluded(item.id))"
          />
        </template>
      </TreeTable>
      <div class="space-y-1 text-sm" data-testid="summary-instruments">
        <p v-for="r in roles" :key="r.id">
          <b>{{ ROLE_SHORT[r.id] }}:</b> {{ summary(r.id) }}
        </p>
        <p><b>除外:</b> {{ excludedList }}</p>
      </div>
      <p v-if="!anySpecified" class="text-xs text-muted">
        除外は、少なくとも1つの役割を「指定」にすると使えます（すべてお任せのときは、「除外・補足」カードの「除外したい要素」に書いてください）。
      </p>
      <div class="space-y-2">
        <div v-for="r in roles" :key="r.id">
          <UTextarea
            v-if="r.freeText"
            :model-value="request.axes[r.id]?.freeText ?? ''"
            :disabled="!roleSpecified(r.id)"
            :rows="1"
            autoresize
            class="w-full"
            :placeholder="`${ROLE_SHORT[r.id]}の自由記述（一覧にないもの。使用するものとして追加）`"
            :data-testid="`free-${r.id}`"
            @update:model-value="(v: string) => setFreeText(request, r, v)"
          />
        </div>
      </div>
    </template>
  </div>
</template>
