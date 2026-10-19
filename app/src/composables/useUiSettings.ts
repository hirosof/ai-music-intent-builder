// UI 設定（語ごとの表示の有無。song-file.md §5）。アプリで1つ。U4c は読むだけ、編集は辞典設定（U4e）
import { shallowRef } from 'vue'
import { spec } from '@/data/spec'
import { loadUiSettingsFromStorage } from '@/data/storage'
import { defaultUiSettings, isTermVisible, type UiSettings } from '@/domain/storage/ui-settings'

const settings = shallowRef<UiSettings>(defaultUiSettings())
let loaded = false

export function useUiSettings() {
  if (!loaded) {
    loaded = true
    settings.value = loadUiSettingsFromStorage().settings
  }
  /** 語の表示の有無（UI 設定 → 語彙の既定値） */
  const isVisible = (vocabularyId: string, termId: string): boolean => {
    const item = spec.vocabularyById.get(vocabularyId)?.items.find((i) => i.id === termId)
    return isTermVisible(settings.value, vocabularyId, termId, item?.defaultVisible !== false)
  }
  return { settings, isVisible }
}

/** テスト用: 次の useUiSettings で読み直す */
export function resetUiSettings(): void {
  loaded = false
  settings.value = defaultUiSettings()
}
