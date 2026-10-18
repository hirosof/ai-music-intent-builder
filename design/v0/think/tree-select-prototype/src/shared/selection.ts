import { computed, reactive } from 'vue'
import type { State } from './types'

/** 選択状態は id で持つ。同じ語が複数のカテゴリに出ても、どこで操作しても同じ状態が変わる（§4-4） */
export function useSelection() {
  const states = reactive<Record<string, State>>({})
  const get = (id: string): State => states[id] ?? 'unset'
  const set = (id: string, s: State) => {
    if (s === 'unset') delete states[id]
    else states[id] = s
  }
  const used = computed(() => Object.keys(states).filter((k) => states[k] === 'use'))
  const avoided = computed(() => Object.keys(states).filter((k) => states[k] === 'avoid'))
  return { get, set, used, avoided }
}

export const STATE_LABELS: Record<State, string> = { use: '使用する', avoid: '使用しない', unset: '未指定' }
