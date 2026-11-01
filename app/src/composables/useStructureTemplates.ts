// 構成のひな型のストア（アプリで1つ）。最初に使うときに localStorage から開く。
// 拒否したストアには書き込まない（判断ポイント75。commitTemplateStore が守る）
import { computed, shallowRef } from 'vue'
import {
  commitTemplateStore,
  openTemplateStore,
  type TemplateCommit,
  type TemplateStoreState,
} from '@/data/storage'
import type { StructureTemplateStore } from '@/domain/storage/structure-templates'

const state = shallowRef<TemplateStoreState | null>(null)

export function useStructureTemplates() {
  state.value ??= openTemplateStore()
  const current = computed(() => state.value!)
  /** 読めたストア（拒否なら null） */
  const store = computed<StructureTemplateStore | null>(() =>
    current.value.status === 'ok' ? current.value.store : null,
  )
  /** 拒否の理由（読めたら空） */
  const rejectedErrors = computed(() =>
    current.value.status === 'rejected' ? current.value.errors : [],
  )
  /** 書き込む。成功したら状態を更新する */
  function commit(next: StructureTemplateStore): TemplateCommit {
    const c = commitTemplateStore(current.value, next)
    if (c.ok) state.value = c.state
    return c
  }
  return { store, rejectedErrors, commit }
}

/** テスト用: 次の useStructureTemplates で開き直す */
export function resetStructureTemplates(): void {
  state.value = null
}
