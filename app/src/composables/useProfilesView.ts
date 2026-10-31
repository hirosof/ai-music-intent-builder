// プロファイル管理の画面の、画面の中でだけ覚える状態（ui-and-nonfunctional.md 判断ポイント67 の細部 (i)）。
// 管理画面を離れて戻っても保つが、保存はしない（ブラウザを開き直すと初期値に戻る）
import { ref } from 'vue'
import type { SearchTarget } from '@/domain/storage/manage'

/** 検索の対象（初期値は「両方」） */
const searchTarget = ref<SearchTarget>('both')

export function useProfilesView() {
  return { searchTarget }
}

/** テスト用: 初期値に戻す */
export function resetProfilesView(): void {
  searchTarget.value = 'both'
}
