<script setup lang="ts">
// 出力設定（input-items.md §3）。依頼文の範囲は曲の種類カード、曲名案の言語は出さない（判断ポイント48・50）。
// 数は 1〜10（K7）。推奨値は、ツールプロファイルで requestRole が recommend で、この依頼のモードにあるパラメータ
import { computed, nextTick, ref } from 'vue'
import { spec } from '@/data/spec'
import { isOutOfScope } from '@/domain/editor/cards'
import { COUNT_RANGE } from '@/domain/editor/edit'
import { diffAxisNotice } from '@/domain/editor/notices'
import type { SongRequest } from '@/domain/types/song'

const props = defineProps<{ request: SongRequest; scopeRequest: SongRequest }>()

// 省略された項目は既定値。`in` で調べる: Vue は hasOwnProperty による確認を追わないため、
// 省略されていた項目（ファクトリーの曲名案・推奨値など）をあとで足しても、画面が更新されなかった（利用者の目視で判明）
const out = (id: string) =>
  id in props.request.output ? props.request.output[id] : spec.outputById.get(id)?.default
function set(id: string, v: unknown) {
  // eslint-disable-next-line vue/no-mutating-props -- 編集中の依頼（リアクティブ）を直接書き換える
  props.request.output[id] = v
}
const hidden = (id: string) => isOutOfScope(spec, props.scopeRequest, id)
// 選択肢の説明（description）は、ドロップダウンの中に出す（UI 判断ポイント63 (A)。いまは diffAxis だけが持つ）
const options = (id: string) =>
  (spec.outputById.get(id)?.options ?? []).map((o) => ({
    value: o.id,
    label: o.label,
    ...(o.description ? { description: o.description } : {}),
  }))
// 説明は既定では1行で切れる（truncate）ため、折り返して全文を出し、一覧の幅と高さを広げる
const DESCRIBED_SELECT_UI = {
  itemDescription: 'whitespace-normal',
  content:
    'min-w-[min(26rem,calc(100vw-2rem))] max-h-[min(28rem,var(--reka-select-content-available-height,28rem))]',
}
// 案ごとの差が付きにくいときの案内（UI 判断ポイント63 (B)）
const diffNotice = computed(() => diffAxisNotice(spec, props.request, props.scopeRequest))
const profile = computed(() => spec.toolProfileById.get(props.request.toolId))
const variationItems = computed(() => {
  const p = profile.value?.params.find(
    (x) => x.id === spec.outputById.get('variation')?.optionsFrom?.param,
  )
  return (p?.values ?? []).map((v) => ({ value: v.id, label: v.label }))
})
const recommendItems = computed(() => {
  const mode = profile.value?.modes.find((m) => m.generationType === props.request.generationType)
  return (profile.value?.params ?? []).filter(
    (p) => p.requestRole === 'recommend' && (!mode || p.modes.includes(mode.id)),
  )
})
const recommendOn = (id: string) =>
  (out('recommendParams') as Record<string, boolean>)?.[id] === true
function setRecommend(id: string, on: boolean) {
  const next = { ...(out('recommendParams') as Record<string, boolean> | undefined) }
  if (on) next[id] = true
  else delete next[id]
  set('recommendParams', next)
}
const granularity = computed(() => (out('granularity') as string[]) ?? [])
function toggleGranularity(id: string, on: boolean) {
  const g = new Set(granularity.value)
  if (on) g.add(id)
  else g.delete(id)
  // 定義の順に並べる
  set(
    'granularity',
    options('granularity')
      .map((o) => o.value)
      .filter((x) => g.has(x)),
  )
}

// 数の入力（判断ポイント56）: UInputNumber。範囲外は部品が範囲内に収める。
// 空にしたとき（null）は書き込まず、入力欄を離れたときに最後の有効な値へ戻す（必須の整数のため）。
// 戻すのは nextTick で: UInputNumber は blur で入力欄の文字（空）を値に当て直すので、その後に戻す
const countDraft = ref<Record<string, number | null>>({
  variantCount: out('variantCount') as number,
  titleCount: out('titleCount') as number,
})
function onCount(id: string, v: number | null) {
  countDraft.value[id] = v
  if (typeof v === 'number') set(id, v)
}
function onCountBlur(id: string) {
  if (countDraft.value[id] == null) countDraft.value[id] = out(id) as number
}
const fieldLabel = (id: string) => spec.outputById.get(id)?.label ?? id
const scopeNote = '（依頼文の範囲により、依頼文に出ません）'
</script>

<template>
  <div class="space-y-5">
    <UFormField
      :label="fieldLabel('variantCount')"
      :hint="hidden('variantCount') ? scopeNote : undefined"
    >
      <UInputNumber
        :model-value="countDraft.variantCount"
        :min="COUNT_RANGE.min"
        :max="COUNT_RANGE.max"
        :step="1"
        disable-wheel-change
        class="w-32"
        data-testid="input-variantCount"
        @update:model-value="(v: number | null) => onCount('variantCount', v)"
        @blur="nextTick(() => onCountBlur('variantCount'))"
      />
      <span class="ml-2 text-sm text-muted">{{ COUNT_RANGE.min }}〜{{ COUNT_RANGE.max }}</span>
    </UFormField>
    <UFormField :label="fieldLabel('diffAxis')" :hint="hidden('diffAxis') ? scopeNote : undefined">
      <USelect
        :model-value="out('diffAxis') as string"
        :items="options('diffAxis')"
        :ui="DESCRIBED_SELECT_UI"
        class="w-full sm:w-64"
        data-testid="input-diffAxis"
        @update:model-value="(v: string) => set('diffAxis', v)"
      />
      <p v-if="diffNotice" class="mt-1 text-xs text-muted" data-testid="notice-diffAxis">
        {{ diffNotice }}
      </p>
    </UFormField>
    <UFormField
      :label="fieldLabel('granularity')"
      :hint="hidden('granularity') ? scopeNote : undefined"
    >
      <div class="flex gap-4" data-testid="input-granularity">
        <UCheckbox
          v-for="o in options('granularity')"
          :key="o.value"
          :label="o.label"
          :model-value="granularity.includes(o.value)"
          :id="`granularity-${o.value}`"
          :data-testid="`granularity-${o.value}`"
          @update:model-value="(v: unknown) => toggleGranularity(o.value, v === true)"
        />
      </div>
    </UFormField>
    <UFormField
      :label="fieldLabel('variation')"
      :hint="hidden('variation') ? scopeNote : undefined"
    >
      <USelect
        :model-value="out('variation') as string"
        :items="variationItems"
        class="w-full sm:w-64"
        data-testid="input-variation"
        @update:model-value="(v: string) => set('variation', v)"
      />
    </UFormField>
    <UFormField
      :label="fieldLabel('outputLanguage')"
      :hint="hidden('outputLanguage') ? scopeNote : undefined"
    >
      <USelect
        :model-value="out('outputLanguage') as string"
        :items="options('outputLanguage')"
        class="w-full sm:w-64"
        data-testid="input-outputLanguage"
        @update:model-value="(v: string) => set('outputLanguage', v)"
      />
    </UFormField>
    <UFormField
      :label="fieldLabel('titleSuggestions')"
      :hint="hidden('titleSuggestions') ? scopeNote : undefined"
      description="曲名案は日本語で出します（言語は選べません）。"
    >
      <div class="flex flex-wrap items-center gap-4">
        <USwitch
          :model-value="out('titleSuggestions') === true"
          data-testid="input-titleSuggestions"
          @update:model-value="(v: boolean) => set('titleSuggestions', v)"
        />
        <UFormField :label="fieldLabel('titleCount')" orientation="horizontal">
          <UInputNumber
            :model-value="countDraft.titleCount"
            :disabled="out('titleSuggestions') !== true"
            :min="COUNT_RANGE.min"
            :max="COUNT_RANGE.max"
            :step="1"
            disable-wheel-change
            class="w-32"
            data-testid="input-titleCount"
            @update:model-value="(v: number | null) => onCount('titleCount', v)"
            @blur="nextTick(() => onCountBlur('titleCount'))"
          />
        </UFormField>
      </div>
    </UFormField>
    <UFormField
      :label="fieldLabel('recommendParams')"
      :hint="hidden('recommendParams') ? scopeNote : undefined"
    >
      <div class="flex flex-wrap gap-4" data-testid="input-recommendParams">
        <UCheckbox
          v-for="p in recommendItems"
          :key="p.id"
          :label="p.label"
          :model-value="recommendOn(p.id)"
          :id="`recommend-${p.id}`"
          :data-testid="`recommend-${p.id}`"
          @update:model-value="(v: unknown) => setRecommend(p.id, v === true)"
        />
      </div>
    </UFormField>
  </div>
</template>
