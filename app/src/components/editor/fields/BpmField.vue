<script setup lang="ts">
// BPM（U4b の決定 K5、判断ポイント56）: 「お任せ／指定」、「単一／範囲」と、数値の入力（UInputNumber。最小1、step 1、
// 「＋」「−」、ホイールでは変えない）。範囲は2つの入力欄を「〜」で結び、最小 ≤ 最大を検査する（誤りは欄の下に出し、データには入れない）。
// 空にしたとき（null）はデータに書かない（BPM の①で値がないと検証は S4 を出し、自動保存の復元で破棄されるため。
// 判断ポイント56 は「空のままにできる」としているが、検証との食い違いを設計スレッドに確認中）。
// 入力欄を離れたとき、空なら最後の有効な値に戻す（nextTick で。UInputNumber が blur で空を当て直した後に）。まだ値がないときは、①を画面の中だけで仮置きする（usePendingSpecified）
import { computed, nextTick, ref } from 'vue'
import { spec } from '@/data/spec'
import { usePendingSpecified } from '@/composables/usePendingSpecified'
import { checkBpmRange, setSpecifiedValue, stateOptions } from '@/domain/editor/edit'
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
const single = ref<number | null>(typeof stored.value === 'number' ? stored.value : null)
const min = ref<number | null>(isRange(stored.value) ? stored.value.min : null)
const max = ref<number | null>(isRange(stored.value) ? stored.value.max : null)
const error = ref('')

function commit() {
  error.value = ''
  if (mode.value === 'single') {
    if (single.value == null) return
    setSpecifiedValue(props.request, props.field, single.value)
    settle()
    return
  }
  if (min.value == null || max.value == null) return
  const r = checkBpmRange(min.value, max.value)
  if (!r.ok) {
    error.value = r.message
    return
  }
  setSpecifiedValue(props.request, props.field, r.value)
  settle()
}
/** 入力欄を離れたとき、空の欄を最後の有効な値に戻す */
function restore() {
  const v = stored.value
  if (single.value == null && typeof v === 'number') single.value = v
  if (isRange(v)) {
    if (min.value == null) min.value = v.min
    if (max.value == null) max.value = v.max
  }
}
const modes = [
  { value: 'single', label: '単一' },
  { value: 'range', label: '範囲' },
]
const disabled = computed(() => shownState.value !== 'specified')
const numberProps = { min: 1, step: 1, disableWheelChange: true, class: 'w-32' }
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
      <UInputNumber
        v-if="mode === 'single'"
        v-model="single"
        v-bind="numberProps"
        :disabled="disabled"
        placeholder="120"
        :data-testid="`bpm-${field.id}`"
        @update:model-value="commit"
        @blur="nextTick(restore)"
      />
      <template v-else>
        <UInputNumber
          v-model="min"
          v-bind="numberProps"
          :disabled="disabled"
          placeholder="下限"
          :data-testid="`bpm-min-${field.id}`"
          @update:model-value="commit"
          @blur="nextTick(restore)"
        />
        <span>〜</span>
        <UInputNumber
          v-model="max"
          v-bind="numberProps"
          :disabled="disabled"
          placeholder="上限"
          :data-testid="`bpm-max-${field.id}`"
          @update:model-value="commit"
          @blur="nextTick(restore)"
        />
      </template>
    </div>
    <p v-if="error && !disabled" class="text-xs text-error" :data-testid="`error-${field.id}`">
      {{ error }}
    </p>
  </div>
</template>
