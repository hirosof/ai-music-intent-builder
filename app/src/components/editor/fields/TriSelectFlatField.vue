<script setup lang="ts">
// 階層のない3値選択（地域・文化の様式、基調となる情緒。U4b の決定 K3）。
// 状態の切り替え（A1）と、語ごとの「使用する／使用しない／—」、自由記述（判断ポイント49: 「使用する」側の追記）。
// 畳み方（判断ポイント54）: 「指定」で開き、それ以外は畳む。「一覧を開く」で独立に開閉。開いた一覧で選ぶと①指定になる
import { computed } from 'vue'
import { spec } from '@/data/spec'
import { useFold } from '@/composables/useFold'
import { useUiSettings } from '@/composables/useUiSettings'
import { currentState, setChoice, setFreeText, setState, stateOptions } from '@/domain/editor/edit'
import { termLabel } from '@/domain/editor/display'
import type { FieldDef } from '@/domain/types/fields'
import type { Choice, SongRequest } from '@/domain/types/song'
import StateToggle from './StateToggle.vue'

const props = defineProps<{ field: FieldDef; request: SongRequest }>()

const { isVisible } = useUiSettings()
const state = computed(() => currentState(props.request, props.field))
const specified = computed(() => state.value === 'specified')
const fold = useFold(() => specified.value)
const a = computed(() => props.request.axes[props.field.id])
const terms = computed(() => {
  const vocab = spec.vocabularyById.get(props.field.vocabulary!)
  const chosen = a.value?.choices ?? {}
  // 既定で表示の語と、非表示でも指定中の語（presets.md §11-3 の 4）
  return (vocab?.items ?? [])
    .filter((i) => isVisible(props.field.vocabulary!, i.id) || chosen[i.id])
    .map((i) => ({
      id: i.id,
      label: termLabel(spec, props.field, i.id),
      hidden: !isVisible(props.field.vocabulary!, i.id),
    }))
})
const CHOICES: { value: Choice | null; label: string }[] = [
  { value: 'use', label: '使用する' },
  { value: 'exclude', label: '使用しない' },
  { value: null, label: '—' },
]
const choiceOf = (id: string): Choice | null => a.value?.choices?.[id] ?? null
</script>

<template>
  <div class="space-y-2">
    <div class="flex flex-wrap items-center gap-2">
      <StateToggle
        :options="stateOptions(spec, field)"
        :model-value="state"
        :testid="`state-${field.id}`"
        @update:model-value="(s) => setState(request, field, s)"
      />
      <UButton
        size="sm"
        color="neutral"
        variant="outline"
        :label="fold.label()"
        :data-testid="`fold-${field.id}`"
        @click="fold.toggle()"
      />
    </div>
    <template v-if="fold.open.value">
      <ul
        class="divide-y divide-default rounded-md border border-default"
        :class="!specified && 'opacity-50'"
      >
        <li
          v-for="t in terms"
          :key="t.id"
          class="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5"
          :data-testid="`term-${field.id}-${t.id}`"
        >
          <span class="text-sm"
            >{{ t.label
            }}<span v-if="t.hidden" class="ml-1 text-xs text-muted">（非表示の語）</span></span
          >
          <UFieldGroup size="xs">
            <UButton
              v-for="c in CHOICES"
              :key="String(c.value)"
              :label="c.label"
              :color="
                choiceOf(t.id) === c.value
                  ? c.value === 'exclude'
                    ? 'error'
                    : 'primary'
                  : 'neutral'
              "
              :variant="choiceOf(t.id) === c.value ? 'solid' : 'outline'"
              :aria-pressed="choiceOf(t.id) === c.value"
              :data-testid="`choice-${field.id}-${t.id}-${c.value ?? 'none'}`"
              @click="setChoice(request, field, t.id, c.value)"
            />
          </UFieldGroup>
        </li>
      </ul>
      <template v-if="field.freeText">
        <UTextarea
          :model-value="a?.freeText ?? ''"
          :rows="2"
          autoresize
          class="w-full"
          placeholder="一覧にないもの（使用するものとして追加）"
          :data-testid="`free-${field.id}`"
          @update:model-value="(v: string) => setFreeText(request, field, v)"
        />
        <p class="text-xs text-muted">
          自由記述は「使用する」ものとして追加されます。除外したいものは、上の一覧で「使用しない」にするか、「除外・補足」カードの「除外したい要素」に書いてください。
        </p>
      </template>
    </template>
  </div>
</template>
