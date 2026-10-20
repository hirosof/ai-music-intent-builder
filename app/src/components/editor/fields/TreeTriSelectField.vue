<script setup lang="ts">
// 階層のある3値選択（副ジャンル）: 状態の切り替え（A1）、階層テーブルの各語に「使用する／使用しない／—」、
// 自由記述（判断ポイント49: 「使用する」側の追記）と、選択の一覧（U4c の決定 L6）。
// 畳み方（判断ポイント54）: 「指定」を押すと開き、それ以外の状態では畳む。「一覧を開く」で状態とは独立に開閉できる。
// 開いた一覧で語を選ぶ・自由記述を書くと①指定になる（畳んでいる間も値は残る）
import { computed } from 'vue'
import { useFold } from '@/composables/useFold'
import { spec } from '@/data/spec'
import { termLabel } from '@/domain/editor/display'
import {
  currentState,
  setChoice,
  setFreeText,
  setState,
  stateOptions,
  transferToFreeText,
} from '@/domain/editor/edit'
import type { FieldDef } from '@/domain/types/fields'
import type { Choice, SongRequest } from '@/domain/types/song'
import StateToggle from './StateToggle.vue'
import TreeTable from './TreeTable.vue'

const props = defineProps<{ field: FieldDef; request: SongRequest }>()

const state = computed(() => currentState(props.request, props.field))
const specified = computed(() => state.value === 'specified')
const fold = useFold(() => specified.value)
const choices = computed(() => props.request.axes[props.field.id]?.choices ?? {})
const keep = computed(() => new Set(Object.keys(choices.value)))
const CHOICES: { value: Choice | null; label: string }[] = [
  { value: 'use', label: '使用する' },
  { value: 'exclude', label: '使用しない' },
  { value: null, label: '—' },
]
const choiceOf = (id: string): Choice | null => choices.value[id] ?? null
const listOf = (c: Choice) =>
  Object.entries(choices.value)
    .filter(([, v]) => v === c)
    .map(([id]) => termLabel(spec, props.field, id))
    .join(', ') || '—'
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
      <div :class="!specified && 'opacity-60'">
        <TreeTable
          :vocabulary-id="field.vocabulary!"
          :keep="keep"
          :action-columns="[{ id: 'choice', header: '指定' }]"
          :testid="`tree-${field.id}`"
          @transfer="(t) => transferToFreeText(request, field, t)"
        >
          <template #cell-choice="{ item }">
            <UFieldGroup size="xs">
              <UButton
                v-for="c in CHOICES"
                :key="String(c.value)"
                :label="c.label"
                :color="
                  choiceOf(item.id) === c.value
                    ? c.value === 'exclude'
                      ? 'error'
                      : 'primary'
                    : 'neutral'
                "
                :variant="choiceOf(item.id) === c.value ? 'solid' : 'outline'"
                :data-testid="`choice-${field.id}-${item.id}-${c.value ?? 'none'}`"
                @click="setChoice(request, field, item.id, c.value)"
              />
            </UFieldGroup>
          </template>
        </TreeTable>
      </div>
      <p class="text-sm" :data-testid="`summary-${field.id}`">
        <b>使用する:</b> {{ listOf('use') }} ／ <b>使用しない:</b> {{ listOf('exclude') }}
      </p>
      <template v-if="field.freeText">
        <UTextarea
          :model-value="request.axes[field.id]?.freeText ?? ''"
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
