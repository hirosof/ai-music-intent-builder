<script setup lang="ts">
// BPM（U4b の決定 K5）: 「お任せ／指定」、「単一／範囲」と数値の入力欄。誤りは欄の下に出し、データには入れない
import { computed, ref } from 'vue'
import { spec } from '@/data/spec'
import { usePendingSpecified } from '@/composables/usePendingSpecified'
import { parseBpm, parseBpmRange, setSpecifiedValue, stateOptions } from '@/domain/editor/edit'
import type { FieldDef } from '@/domain/types/fields'
import type { SongRequest } from '@/domain/types/song'
import StateToggle from './StateToggle.vue'

const props = defineProps<{ field: FieldDef; request: SongRequest }>()

const stored = computed(() => props.request.axes[props.field.id]?.value)
const isRange = (v: unknown): v is { min: number; max: number } =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const { shownState, selectState, settle } = usePendingSpecified(
  () => props.request,
  () => props.field,
  () => typeof stored.value === 'number' || isRange(stored.value),
)

const mode = ref<'single' | 'range'>(isRange(stored.value) ? 'range' : 'single')
const single = ref(typeof stored.value === 'number' ? String(stored.value) : '')
const min = ref(isRange(stored.value) ? String(stored.value.min) : '')
const max = ref(isRange(stored.value) ? String(stored.value.max) : '')
const error = ref('')

function commit() {
  const r = mode.value === 'single' ? parseBpm(single.value) : parseBpmRange(min.value, max.value)
  error.value = r.ok ? '' : r.message
  if (r.ok) {
    setSpecifiedValue(props.request, props.field, r.value)
    settle()
  }
}
const modes = [
  { value: 'single', label: '単一' },
  { value: 'range', label: '範囲' },
]
const disabled = computed(() => shownState.value !== 'specified')
</script>

<template>
  <div class="space-y-2">
    <StateToggle
      :options="stateOptions(spec, field)"
      :model-value="shownState"
      :testid="`state-${field.id}`"
      @update:model-value="selectState"
    />
    <div class="flex flex-wrap items-center gap-2">
      <URadioGroup
        v-model="mode"
        :items="modes"
        orientation="horizontal"
        :disabled="disabled"
        :data-testid="`bpm-mode-${field.id}`"
        @update:model-value="commit"
      />
      <UInput
        v-if="mode === 'single'"
        v-model="single"
        :disabled="disabled"
        inputmode="decimal"
        placeholder="120"
        class="w-24"
        :data-testid="`bpm-${field.id}`"
        @update:model-value="commit"
      />
      <template v-else>
        <UInput
          v-model="min"
          :disabled="disabled"
          inputmode="decimal"
          placeholder="下限"
          class="w-24"
          :data-testid="`bpm-min-${field.id}`"
          @update:model-value="commit"
        />
        <span>〜</span>
        <UInput
          v-model="max"
          :disabled="disabled"
          inputmode="decimal"
          placeholder="上限"
          class="w-24"
          :data-testid="`bpm-max-${field.id}`"
          @update:model-value="commit"
        />
      </template>
    </div>
    <p v-if="error && !disabled" class="text-xs text-error" :data-testid="`error-${field.id}`">
      {{ error }}
    </p>
  </div>
</template>
