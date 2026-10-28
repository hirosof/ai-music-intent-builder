<script setup lang="ts">
// 単一選択（A1: 状態を選択肢に混ぜ込む。B1: 疑似選択肢「既定値（○○）」を強調。U4b の決定 K1・K2）。
// 語彙がグループを持つときは、グループごとに区切り線と見出しを置く（UI 判断ポイント62。並びは selectMenu）。
// 自由記述を持つ項目は、下に入力欄を置く。①指定のときだけ入力できる（A1。自由記述だけで指定するときは「（一覧から選ばない）」）
import { computed } from 'vue'
import { spec } from '@/data/spec'
import { useUiSettings } from '@/composables/useUiSettings'
import {
  selectMenu,
  selectOptions,
  selectValue,
  setFreeText,
  setSelect,
} from '@/domain/editor/edit'
import type { FieldDef } from '@/domain/types/fields'
import type { SongRequest } from '@/domain/types/song'

const props = defineProps<{ field: FieldDef; request: SongRequest }>()

const { isVisible } = useUiSettings()
const value = computed(() => selectValue(props.request, props.field))
const items = computed(() =>
  selectMenu(
    spec,
    props.field,
    selectOptions(spec, props.field, value.value, (id) =>
      props.field.vocabulary ? isVisible(props.field.vocabulary, id) : true,
    ),
  ).map((e) =>
    e.type === 'item'
      ? {
          label: e.option.label,
          value: e.option.value,
          class: e.option.highlight
            ? 'font-semibold text-primary'
            : e.option.pseudo
              ? 'text-muted'
              : undefined,
        }
      : e.type === 'label'
        ? { type: 'label' as const, label: e.label }
        : { type: 'separator' as const },
  ),
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
      @update:model-value="
        (v: string | undefined) => v !== undefined && setSelect(request, field, v)
      "
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
