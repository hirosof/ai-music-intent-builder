<script setup lang="ts">
// 階層のある単一選択（主ジャンル。U4c の決定 L1）: テーブルの上に「お任せ／（一覧から選ばない）」、各語の行に「選ぶ」。
// 今の選択はテーブルの上に1行で示す。自由記述はテーブルの下（①指定のときだけ入力できる）
import { computed } from 'vue'
import { spec } from '@/data/spec'
import { termLabel } from '@/domain/editor/display'
import {
  selectValue,
  setFreeText,
  setSelect,
  transferToFreeText,
  SELECT_DELEGATED,
  SELECT_NONE,
} from '@/domain/editor/edit'
import type { FieldDef } from '@/domain/types/fields'
import type { SongRequest } from '@/domain/types/song'
import TreeTable from './TreeTable.vue'

const props = defineProps<{ field: FieldDef; request: SongRequest }>()

const value = computed(() => selectValue(props.request, props.field))
const specified = computed(() => props.request.axes[props.field.id]?.state === 'specified')
const keep = computed(() => new Set(value.value.startsWith('__') ? [] : [value.value]))
const current = computed(() => {
  if (value.value === SELECT_DELEGATED) return 'お任せ'
  if (value.value === SELECT_NONE) return '一覧から選ばない（自由記述だけ）'
  return termLabel(spec, props.field, value.value)
})
const pseudo = [
  { value: SELECT_DELEGATED, label: 'お任せ' },
  { value: SELECT_NONE, label: '（一覧から選ばない）' },
]
</script>

<template>
  <div class="space-y-2">
    <div class="flex flex-wrap items-center gap-3">
      <UFieldGroup size="sm" :data-testid="`pseudo-${field.id}`">
        <UButton
          v-for="p in pseudo"
          :key="p.value"
          :label="p.label"
          :color="value === p.value ? 'primary' : 'neutral'"
          :variant="value === p.value ? 'solid' : 'outline'"
          :data-testid="`pseudo-${field.id}-${p.value}`"
          @click="setSelect(request, field, p.value)"
        />
      </UFieldGroup>
      <span class="text-sm"
        >今の選択: <b :data-testid="`current-${field.id}`">{{ current }}</b></span
      >
    </div>
    <TreeTable
      :vocabulary-id="field.vocabulary!"
      :keep="keep"
      :action-columns="[{ id: 'pick', header: '選ぶ' }]"
      :testid="`tree-${field.id}`"
      @transfer="(t) => transferToFreeText(request, field, t)"
    >
      <template #cell-pick="{ item }">
        <UButton
          size="xs"
          :label="value === item.id ? '選択中' : '選ぶ'"
          :color="value === item.id ? 'primary' : 'neutral'"
          :variant="value === item.id ? 'solid' : 'outline'"
          :data-testid="`pick-${field.id}-${item.id}`"
          @click="setSelect(request, field, item.id)"
        />
      </template>
    </TreeTable>
    <UTextarea
      v-if="field.freeText"
      :model-value="request.axes[field.id]?.freeText ?? ''"
      :disabled="!specified"
      :rows="2"
      autoresize
      class="w-full"
      placeholder="自由記述（一覧にないものや、補足）"
      :data-testid="`free-${field.id}`"
      @update:model-value="(v: string) => setFreeText(request, field, v)"
    />
  </div>
</template>
