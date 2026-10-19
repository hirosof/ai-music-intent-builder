<script setup lang="ts">
// 自由記述の項目（状態の切り替え＋入力欄。A1。①以外は入力欄を無効にする）
import { computed } from 'vue'
import { spec } from '@/data/spec'
import { currentState, setState, setText, stateOptions } from '@/domain/editor/edit'
import type { FieldDef } from '@/domain/types/fields'
import type { SongRequest } from '@/domain/types/song'
import StateToggle from './StateToggle.vue'

const props = defineProps<{ field: FieldDef; request: SongRequest }>()
const state = computed(() => currentState(props.request, props.field))
const text = computed(() => {
  const v = props.request.axes[props.field.id]?.value
  return typeof v === 'string' ? v : ''
})
</script>

<template>
  <div class="space-y-2">
    <StateToggle
      :options="stateOptions(spec, field)"
      :model-value="state"
      :testid="`state-${field.id}`"
      @update:model-value="(s) => setState(request, field, s)"
    />
    <UTextarea
      :model-value="text"
      :disabled="state !== 'specified'"
      :rows="3"
      autoresize
      class="w-full"
      :data-testid="`text-${field.id}`"
      @update:model-value="(v: string) => setText(request, field, v)"
    />
  </div>
</template>
