// ユーザープロファイルのストア（アプリで1つ）。最初に使うときに localStorage から開く。
// 拒否したストアには書き込まない（判断ポイント44。commitProfileStore が守る）
import { computed, shallowRef } from 'vue'
import {
  commitProfileStore,
  openProfileStore,
  type ProfileStoreState,
  type StoreCommit,
} from '@/data/storage'
import type { ProfileStore } from '@/domain/types/song'

const state = shallowRef<ProfileStoreState | null>(null)

export function useProfileStore() {
  state.value ??= openProfileStore()
  const current = computed(() => state.value!)
  /** 読めたストア（拒否なら null） */
  const store = computed<ProfileStore | null>(() =>
    current.value.status === 'ok' ? current.value.store : null,
  )
  /** 書き込む。成功したら状態を更新する */
  function commit(next: ProfileStore): StoreCommit {
    const c = commitProfileStore(current.value, next)
    if (c.ok) state.value = c.state
    return c
  }
  return { state: current, store, commit }
}

/** テスト用: 次の useProfileStore で開き直す */
export function resetProfileStore(): void {
  state.value = null
}
