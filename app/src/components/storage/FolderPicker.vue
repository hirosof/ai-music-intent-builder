<script setup lang="ts">
// フォルダを選ぶ部品（木の形。ui-and-nonfunctional.md 判断ポイント67・69・70）。
// 保存先・取り込み先の選択と、管理画面の移動先の選択で共通に使う。ダイアログの中に置き、モーダルは重ねない。
// 選んだフォルダの id を v-model で返す（null はルート）。disabled のフォルダは選べない（移動で、自分自身・配下を外すため）
import { computed } from 'vue'
import { folderRows } from '@/domain/storage/folders'
import type { Folder } from '@/domain/types/song'

const selected = defineModel<string | null>({ required: true })
const props = withDefaults(
  defineProps<{
    folders: readonly Folder[]
    disabled?: ReadonlySet<string | null>
    /** data-testid の接頭辞（同じ画面に2つ置くとき用） */
    testid?: string
  }>(),
  { disabled: () => new Set(), testid: 'folder' },
)

const rows = computed(() => [
  { id: null, name: 'ルート', depth: 0 },
  ...folderRows(props.folders).map((r) => ({
    id: r.folder.id as string | null,
    name: r.folder.name,
    depth: r.depth + 1,
  })),
])
</script>

<template>
  <ul
    role="radiogroup"
    class="max-h-48 overflow-y-auto rounded-md border border-default p-1"
    :data-testid="`${testid}-picker`"
  >
    <li v-for="r in rows" :key="r.id ?? ''">
      <button
        type="button"
        role="radio"
        :aria-checked="selected === r.id"
        :disabled="disabled.has(r.id)"
        class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50 aria-checked:bg-primary/10 aria-checked:font-medium aria-checked:text-primary"
        :style="{ paddingLeft: `${0.5 + r.depth * 1.25}rem` }"
        :data-testid="`${testid}-option-${r.id ?? 'root'}`"
        @click="selected = r.id"
      >
        <UIcon
          :name="r.id === null ? 'i-lucide-house' : 'i-lucide-folder'"
          class="size-4 shrink-0"
        />
        <span class="break-all">{{ r.name }}</span>
      </button>
    </li>
  </ul>
</template>
