<script setup lang="ts">
// 長さ（判断ポイント57）: 「指定／ツール任せ（Auto）」と、よく使う長さのチップ（1:00〜5:00）、「分」「秒」の2つの UInputNumber。
// 秒は「＋」「−」で5秒刻み（step-snapping を無効にして、手入力は1秒単位）。範囲は 0:10〜6:00 に収める
// （0分のとき秒の最小は10、6分のとき秒は0）。保存は秒の整数。今の値を「3:00」の形で常に示す（カードの一覧と同じ形）。
// ①指定のときは値が必須なので、空にしたら書き込まず、入力欄を離れたときに最後の有効な値へ戻す。
// まだ値がないときは、①を画面の中だけで仮置きする（usePendingSpecified）
import { computed, nextTick, ref, watch } from 'vue'
import { spec } from '@/data/spec'
import { usePendingSpecified } from '@/composables/usePendingSpecified'
import { displayAxis } from '@/domain/editor/display'
import {
  clampLength,
  formatLength,
  LENGTH_CHIPS,
  lengthParts,
  minuteBounds,
  secondBounds,
  setSpecifiedValue,
  stateOptions,
} from '@/domain/editor/edit'
import { profileParam } from '@/domain/spec'
import type { FieldDef } from '@/domain/types/fields'
import type { SongRequest } from '@/domain/types/song'
import StateToggle from './StateToggle.vue'

const props = defineProps<{ field: FieldDef; request: SongRequest }>()

const range = computed(() => {
  const p = profileParam(
    spec.toolProfileById.get(props.request.toolId),
    props.field.rangeFrom!.param,
  )
  return p?.range ?? { min: 10, max: 360 }
})
const stored = computed(() => {
  const v = props.request.axes[props.field.id]?.value
  return typeof v === 'number' ? v : undefined
})
const { shownState, isPending, selectState, settle } = usePendingSpecified(
  () => props.request,
  () => props.field,
  () => stored.value !== undefined,
)
const disabled = computed(() => shownState.value !== 'specified')
const specifiedValue = computed(() => (!disabled.value ? stored.value : undefined))
/** 今の値（カードの一覧と同じ形）。①で値がまだないときは「—」 */
const current = computed(() => {
  if (shownState.value === 'specified')
    return stored.value !== undefined ? formatLength(stored.value) : '—'
  return displayAxis(spec, props.field, { state: shownState.value }).text
})

const minutes = ref<number | null>(
  stored.value !== undefined ? lengthParts(stored.value).minutes : null,
)
const seconds = ref<number | null>(
  stored.value !== undefined ? lengthParts(stored.value).seconds : null,
)
function syncParts(sec: number) {
  const p = lengthParts(sec)
  minutes.value = p.minutes
  seconds.value = p.seconds
}
// データの値が変わったら（チップ・範囲への収め）、入力欄をそろえる。範囲外の入力は UInputNumber 自身が範囲に収める
watch(stored, (v) => v !== undefined && syncParts(v))
const mBounds = computed(() => minuteBounds(range.value))
const sBounds = computed(() => secondBounds(minutes.value ?? 0, range.value))

function write(sec: number) {
  setSpecifiedValue(props.request, props.field, sec)
  settle()
}
/**
 * 分・秒のどちらかが変わったとき、範囲に収めて書き込む。空の欄があれば書き込まない（入力欄を離れたときに戻す）。
 * ただし、まだ値がないとき（①の仮置き）は、空の欄を0として扱う（分だけ・秒だけでも入れられるように）
 */
function onParts() {
  if (minutes.value == null && seconds.value == null) return
  if (stored.value !== undefined && (minutes.value == null || seconds.value == null)) return
  write(clampLength(minutes.value ?? 0, seconds.value ?? 0, range.value))
}
/** 入力欄を離れたとき、空の欄を最後の有効な値に戻す */
function restore() {
  if (stored.value === undefined) return
  const p = lengthParts(stored.value)
  if (minutes.value == null) minutes.value = p.minutes
  if (seconds.value == null) seconds.value = p.seconds
}
</script>

<template>
  <div class="space-y-2">
    <StateToggle
      :options="stateOptions(spec, field)"
      :model-value="shownState"
      :testid="`state-${field.id}`"
      @update:model-value="selectState"
    />
    <div class="flex flex-wrap gap-1" :data-testid="`length-chips-${field.id}`">
      <UButton
        v-for="c in LENGTH_CHIPS"
        :key="c"
        size="xs"
        :label="formatLength(c)"
        :disabled="disabled"
        :color="specifiedValue === c ? 'primary' : 'neutral'"
        :variant="specifiedValue === c ? 'solid' : 'outline'"
        :aria-pressed="specifiedValue === c"
        :data-testid="`length-chip-${c}`"
        @click="write(c)"
      />
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <UInputNumber
        v-model="minutes"
        :min="mBounds.min"
        :max="mBounds.max"
        :step="1"
        disable-wheel-change
        :disabled="disabled"
        class="w-32"
        :data-testid="`length-minutes-${field.id}`"
        @update:model-value="onParts"
        @blur="nextTick(restore)"
      />
      <span class="text-sm">分</span>
      <UInputNumber
        v-model="seconds"
        :min="sBounds.min"
        :max="sBounds.max"
        :step="5"
        :step-snapping="false"
        disable-wheel-change
        :disabled="disabled"
        class="w-32"
        :data-testid="`length-seconds-${field.id}`"
        @update:model-value="onParts"
        @blur="nextTick(restore)"
      />
      <span class="text-sm">秒</span>
      <span class="text-sm" :data-testid="`length-current-${field.id}`"
        >今の値: <b>{{ current }}</b></span
      >
    </div>
    <p class="text-xs text-muted">{{ formatLength(range.min) }}〜{{ formatLength(range.max) }}</p>
    <p v-if="isPending" class="text-xs text-muted" :data-testid="`pending-hint-${field.id}`">
      値を入力すると指定になります
    </p>
  </div>
</template>
