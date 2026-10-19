// 長さ・BPM・構成の「①指定」の仮置き（U4b の補完）。
// これらは①指定で値がないと検証が S4 を出し、自動保存の復元で破棄される（判断ポイント43 が許すのは S5・F12 だけ）。
// そこで、正しい値が入るまでは画面の中だけで①を選んだことにし、データの状態は変えない
import { computed, ref, type ComputedRef } from 'vue'
import { currentState, setState } from '@/domain/editor/edit'
import type { FieldDef, StateId } from '@/domain/types/fields'
import type { SongRequest } from '@/domain/types/song'

export function usePendingSpecified(
  request: () => SongRequest,
  field: () => FieldDef,
  /** データに残っている値が、①指定として正しいか（一時保持から戻せるか） */
  hasValidValue: () => boolean,
): { shownState: ComputedRef<StateId>; selectState(s: StateId): void; settle(): void } {
  const pending = ref(false)
  const shownState = computed<StateId>(() =>
    pending.value ? 'specified' : currentState(request(), field()),
  )
  return {
    shownState,
    selectState(s) {
      if (s === 'specified' && !hasValidValue()) {
        pending.value = true
        return
      }
      pending.value = false
      setState(request(), field(), s)
    },
    /** 正しい値を書き込んだあとに呼ぶ */
    settle() {
      pending.value = false
    },
  }
}
