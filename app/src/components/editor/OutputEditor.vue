<script setup lang="ts">
// 出力設定（input-items.md §3）。依頼文の範囲は曲の種類カード、曲名案の言語は出さない（判断ポイント48・50）。
// 数は 1〜10（K7）。推奨値は、ツールプロファイルで requestRole が recommend で、この依頼のモードにあるパラメータ
import { computed, ref } from 'vue'
import { spec } from '@/data/spec'
import { isOutOfScope } from '@/domain/editor/cards'
import { COUNT_RANGE, parseCount } from '@/domain/editor/edit'
import type { SongRequest } from '@/domain/types/song'

const props = defineProps<{ request: SongRequest; scopeRequest: SongRequest }>()

const out = (id: string) => {
  const has = Object.prototype.hasOwnProperty.call(props.request.output, id)
  return has ? props.request.output[id] : spec.outputById.get(id)?.default
}
function set(id: string, v: unknown) {
  // eslint-disable-next-line vue/no-mutating-props -- 編集中の依頼（リアクティブ）を直接書き換える
  props.request.output[id] = v
}
const hidden = (id: string) => isOutOfScope(spec, props.scopeRequest, id)
const options = (id: string) =>
  (spec.outputById.get(id)?.options ?? []).map((o) => ({ value: o.id, label: o.label }))
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

// 数の入力（誤りは欄の下に出し、データには入れない）
const countInputs = ref<Record<string, string>>({
  variantCount: String(out('variantCount')),
  titleCount: String(out('titleCount')),
})
const countErrors = ref<Record<string, string>>({})
function onCount(id: string, v: string) {
  countInputs.value[id] = v
  const r = parseCount(v)
  countErrors.value[id] = r.ok ? '' : r.message
  if (r.ok) set(id, r.value)
}
const fieldLabel = (id: string) => spec.outputById.get(id)?.label ?? id
const scopeNote = '（依頼文の範囲により、依頼文に出ません）'
</script>

<template>
  <div class="space-y-5">
    <UFormField
      :label="fieldLabel('variantCount')"
      :hint="hidden('variantCount') ? scopeNote : undefined"
      :error="countErrors.variantCount || undefined"
    >
      <UInput
        :model-value="countInputs.variantCount"
        inputmode="numeric"
        class="w-24"
        data-testid="input-variantCount"
        @update:model-value="(v: unknown) => onCount('variantCount', String(v))"
      />
      <span class="ml-2 text-sm text-muted">{{ COUNT_RANGE.min }}〜{{ COUNT_RANGE.max }}</span>
    </UFormField>
    <UFormField :label="fieldLabel('diffAxis')" :hint="hidden('diffAxis') ? scopeNote : undefined">
      <USelect
        :model-value="out('diffAxis') as string"
        :items="options('diffAxis')"
        class="w-full sm:w-64"
        data-testid="input-diffAxis"
        @update:model-value="(v: string) => set('diffAxis', v)"
      />
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
        <UFormField
          :label="fieldLabel('titleCount')"
          orientation="horizontal"
          :error="countErrors.titleCount || undefined"
        >
          <UInput
            :model-value="countInputs.titleCount"
            :disabled="out('titleSuggestions') !== true"
            inputmode="numeric"
            class="w-20"
            data-testid="input-titleCount"
            @update:model-value="(v: unknown) => onCount('titleCount', String(v))"
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
          :data-testid="`recommend-${p.id}`"
          @update:model-value="(v: unknown) => setRecommend(p.id, v === true)"
        />
      </div>
    </UFormField>
  </div>
</template>
