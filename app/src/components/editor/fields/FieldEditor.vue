<script setup lang="ts">
// 項目の入力（種類ごとに部品を選ぶ）。階層のある語彙（カテゴリを持つ）の項目は階層テーブル（U4c）。
// 楽器の3項目は、1つの統合テーブルとして先頭の項目の位置に出し、残りの2項目は出さない（判断ポイント31）
import { computed } from 'vue'
import { spec } from '@/data/spec'
import { isOutOfScope } from '@/domain/editor/cards'
import { linkedInstrumentFields } from '@/domain/editor/edit'
import type { FieldDef } from '@/domain/types/fields'
import type { SongRequest } from '@/domain/types/song'
import BpmField from './BpmField.vue'
import InstrumentTableField from './InstrumentTableField.vue'
import LengthField from './LengthField.vue'
import SectionListField from './SectionListField.vue'
import SelectField from './SelectField.vue'
import TextField from './TextField.vue'
import TreeSelectField from './TreeSelectField.vue'
import TreeTriSelectField from './TreeTriSelectField.vue'
import TriSelectFlatField from './TriSelectFlatField.vue'

const props = defineProps<{ field: FieldDef; request: SongRequest; scopeRequest: SongRequest }>()

/** 階層のある語彙（カテゴリを持つ） */
const hierarchical = computed(() => {
  const v = props.field.vocabulary ? spec.vocabularyById.get(props.field.vocabulary) : undefined
  return (v?.categories?.length ?? 0) > 0
})
const linked = linkedInstrumentFields(spec)
const linkedIndex = computed(() => linked.indexOf(props.field.id))
const label = computed(() =>
  linkedIndex.value === 0 ? '楽器（主旋律・伴奏・リズム）' : props.field.label,
)
const outOfScope = computed(() => isOutOfScope(spec, props.scopeRequest, props.field.id))
</script>

<template>
  <div v-if="linkedIndex <= 0" class="space-y-2" :data-testid="`editor-${field.id}`">
    <div class="flex flex-wrap items-baseline gap-2">
      <h4 class="text-sm font-semibold">{{ label }}</h4>
      <span v-if="outOfScope" class="text-xs text-muted"
        >（依頼文の範囲により、依頼文に出ません）</span
      >
    </div>
    <InstrumentTableField v-if="linkedIndex === 0" :request="request" />
    <TreeSelectField
      v-else-if="hierarchical && field.kind === 'select'"
      :field="field"
      :request="request"
    />
    <TreeTriSelectField
      v-else-if="hierarchical && field.kind === 'triSelect'"
      :field="field"
      :request="request"
    />
    <SelectField v-else-if="field.kind === 'select'" :field="field" :request="request" />
    <TriSelectFlatField v-else-if="field.kind === 'triSelect'" :field="field" :request="request" />
    <TextField v-else-if="field.kind === 'text'" :field="field" :request="request" />
    <BpmField v-else-if="field.kind === 'bpm'" :field="field" :request="request" />
    <LengthField v-else-if="field.kind === 'length'" :field="field" :request="request" />
    <SectionListField v-else-if="field.kind === 'sectionList'" :field="field" :request="request" />
  </div>
</template>
