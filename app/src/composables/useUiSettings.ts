// UI 設定（語ごとの表示の有無。song-file.md §5）。アプリで1つ。編集は辞典設定（U4e）、反映は選択の画面すべて（N4）
import { shallowRef } from 'vue'
import { spec } from '@/data/spec'
import { loadUiSettingsFromStorage, saveUiSettings } from '@/data/storage'
import {
  defaultUiSettings,
  isTermVisible,
  setTermVisibility,
  type UiSettings,
} from '@/domain/storage/ui-settings'

const settings = shallowRef<UiSettings>(defaultUiSettings())
let loaded = false

const defaultVisibleOf = (vocabularyId: string, termId: string) =>
  spec.vocabularyById.get(vocabularyId)?.items.find((i) => i.id === termId)?.defaultVisible !==
  false

export function useUiSettings() {
  if (!loaded) {
    loaded = true
    settings.value = loadUiSettingsFromStorage().settings
  }
  /** 語の表示の有無（UI 設定 → 語彙の既定値） */
  const isVisible = (vocabularyId: string, termId: string): boolean =>
    isTermVisible(settings.value, vocabularyId, termId, defaultVisibleOf(vocabularyId, termId))

  /** 語の表示を変えて、すぐ保存する。既定値と同じになった語は設定から除く */
  function setVisible(
    vocabularyId: string,
    termIds: readonly string[],
    visible: boolean | 'default',
  ) {
    let next = settings.value
    for (const t of termIds) {
      const d = defaultVisibleOf(vocabularyId, t)
      next = setTermVisibility(next, vocabularyId, t, visible === 'default' ? d : visible, d)
    }
    settings.value = next
    saveUiSettings(next)
  }
  return { settings, isVisible, setVisible }
}

/** テスト用: 次の useUiSettings で読み直す */
export function resetUiSettings(): void {
  loaded = false
  settings.value = defaultUiSettings()
}
