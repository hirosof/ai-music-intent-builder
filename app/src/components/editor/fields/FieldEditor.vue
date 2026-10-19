<script setup lang="ts">
// 項目の入力（種類ごとに部品を選ぶ）。階層のある語彙（ジャンル・楽器）の項目は U4c
import { computed } from 'vue'
import { spec } from '@/data/spec'
import { isOutOfScope } from '@/domain/editor/cards'
import type { FieldDef } from '@/domain/types/fields'
import type { SongRequest } from '@/domain/types/song'
import BpmField from './BpmField.vue'
import LengthField from './LengthField.vue'
import SectionListField from './SectionListField.vue'
import SelectField from './SelectField.vue'
import TextField from './TextField.vue'
import TriSelectFlatField from './TriSelectFlatField.vue'

const props = defineProps<{ field: FieldDef; request: SongRequest; scopeRequest: SongRequest }>()

/** 階層のある語彙（カテゴリを持つ）。U4c で階層テーブルにする */
const hierarchical = computed(() => {
  const v = props.field.vocabulary ? spec.vocabularyById.get(props.field.vocabulary) : undefined
  return (v?.categories?.length ?? 0) > 0
})
const outOfScope = computed(() => isOutOfScope(spec, props.scopeRequest, props.field.id))
</script>

<template>
  <div class="space-y-2" :data-testid="`editor-${field.id}`">
    <div class="flex flex-wrap items-baseline gap-2">
      <h4 class="text-sm font-semibold">{{ field.label }}</h4>
      <span v-if="outOfScope" class="text-xs text-muted"
        >（依頼文の範囲により、依頼文に出ません）</span
      >
    </div>
    <p v-if="hierarchical" class="text-sm text-muted" data-testid="pending-u4c">
      この項目の入力（階層のある一覧）は、次の段階で作ります。
    </p>
    <SelectField v-else-if="field.kind === 'select'" :field="field" :request="request" />
    <TriSelectFlatField v-else-if="field.kind === 'triSelect'" :field="field" :request="request" />
    <TextField v-else-if="field.kind === 'text'" :field="field" :request="request" />
    <BpmField v-else-if="field.kind === 'bpm'" :field="field" :request="request" />
    <LengthField v-else-if="field.kind === 'length'" :field="field" :request="request" />
    <SectionListField v-else-if="field.kind === 'sectionList'" :field="field" :request="request" />
  </div>
</template>
