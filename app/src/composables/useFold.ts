// 入力欄が大きい項目の畳み方（ui-and-nonfunctional.md §2-2、判断ポイント54）。
// ①指定のときだけ開き（値が空の未完成 S5 も開く）、それ以外は畳む。「一覧を開く」ボタンは状態とは独立に開閉する。
// 開いても選ばないまま畳んだ場合は、状態を変えない。畳んでいる間も、値は編集中のデータに残る（一時保持。判断ポイント30）
import { ref, watch, type Ref } from 'vue'

export function useFold(isSpecified: () => boolean): {
  open: Ref<boolean>
  toggle(): void
  /** ボタンの文言 */
  label: () => string
} {
  const open = ref(isSpecified())
  // 状態が変わったら、①なら開き、それ以外なら畳む
  watch(isSpecified, (v) => (open.value = v))
  return {
    open,
    toggle: () => (open.value = !open.value),
    label: () => (open.value ? '一覧を閉じる' : '一覧を開く'),
  }
}
