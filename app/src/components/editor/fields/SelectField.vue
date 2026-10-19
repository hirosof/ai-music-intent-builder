<script setup lang="ts">
// 単一選択（A1: 状態を選択肢に混ぜ込む。B1: 疑似選択肢「既定値（○○）」を強調。U4b の決定 K1・K2）。
// 自由記述を持つ項目は、下に入力欄を置く。①指定のときだけ入力できる（A1。自由記述だけで指定するときは「（一覧から選ばない）」）
import { computed } from 'vue'
import { spec } from '@/data/spec'
import { selectOptions, selectValue, setFreeText, setSelect } from '@/domain/editor/edit'
import type { FieldDef } from '@/domain/types/fields'
import type { SongRequest } from '@/domain/types/song'

const props = defineProps<{ field: FieldDef; request: SongRequest }>()

const value = computed(() => selectValue(props.request, props.field))
const items = computed(() =>
  selectOptions(spec, props.field, value.value).map((o) => ({
    label: o.label,
    value: o.value,
    class: o.highlight ? 'font-semibold text-primary' : o.pseudo ? 'text-muted' : undefined,
  })),
)
const specified = computed(() => props.request.axes[props.field.id]?.state === 'specified')
const freeText = computed(() => props.request.axes[props.field.id]?.freeText ?? '')
</script>

<template>
  <div class="space-y-2">
    <USelect
      :model-value="value"
      :items="items"
      class="w-full sm:w-80"
      :data-testid="`select-${field.id}`"
      @update:model-value="(v: string) => setSelect(request, field, v)"
    />
    <UTextarea
      v-if="field.freeText"
      :model-value="freeText"
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
