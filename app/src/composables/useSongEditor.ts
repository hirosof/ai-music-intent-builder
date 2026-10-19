// 編集中の楽曲の状態（U4 の決定 J1: Pinia は使わず、モジュールに1つだけ持つ）。
// 一時保持（判断ポイント30）は、編集中のデータに値を残したまま状態だけを変える形で持つ（U4b の決定 K8）。保存時の正規化で落ちる。
// 自動保存（変更から 500ms 後。J4）、復元（判断ポイント43）、初期状態への置き換え（判断ポイント52）、依頼文（J6）を持つ
import { computed, effectScope, ref, shallowRef, type Ref } from 'vue'
import { watchDebounced } from '@vueuse/core'
import { spec } from '@/data/spec'
import { cloneJson } from '@/domain/clone'
import { loadAutosaveFromStorage, saveAutosave } from '@/data/storage'
import { createInitialSong } from '@/domain/editor/initial'
import { findIncomplete, isIncomplete, type Incomplete } from '@/domain/editor/incomplete'
import { GenerationError } from '@/domain/request/errors'
import { generateRequestText } from '@/domain/request/generate'
import type { AutosaveLoad } from '@/domain/storage/autosave'
import { normalizeForSave } from '@/domain/storage/normalize'
import type { SongData, SongRequest } from '@/domain/types/song'

/** 自動保存の遅延（J4） */
export const AUTOSAVE_DELAY_MS = 500

export type GeneratedText =
  | { ok: true; text: string }
  | { ok: false; reason: 'incomplete' }
  | { ok: false; reason: 'error'; message: string }

export interface SongEditor {
  /** 編集中の楽曲データ（画面上の形。保存するときに正規化する） */
  song: Ref<SongData>
  /** 依頼（初版は1件） */
  request: Readonly<Ref<SongRequest>>
  /** 保存する形（判断ポイント45） */
  savedSong: Readonly<Ref<SongData>>
  incomplete: Readonly<Ref<Incomplete>>
  generated: Readonly<Ref<GeneratedText>>
  /**
   * 編集中の内容に対応するユーザープロファイルの名前（読み込んだ、または最後に保存した名前。U4d の決定 M2）。
   * 保存・書き出しの名前の初期値。画面の中だけで覚え、保存しない（開き直すと忘れる）
   */
  currentProfileName: Ref<string | null>
  /** 起動時の自動保存の読み込み結果（通知に使う） */
  restored: Readonly<Ref<AutosaveLoad | null>>
  /** 起動時に1回呼ぶ。自動保存を読み込み、以後の変更を自動保存する */
  start(): void
  /** 編集中の内容を置き換える（新規・プロファイルの読み込み）。一時保持（編集中のデータに残った値）も消え、すぐに自動保存する */
  replaceSong(data: SongData, profileName?: string | null): void
  /** 初期状態に置き換える（判断ポイント52） */
  resetToInitial(): void
  /** 自動保存の監視を止める（テストで、編集状態を作り直すとき） */
  stop(): void
}

export function createSongEditor(): SongEditor {
  const song = ref<SongData>(createInitialSong(spec))
  const restored = shallowRef<AutosaveLoad | null>(null)
  const currentProfileName = ref<string | null>(null)
  let started = false
  const scope = effectScope(true)

  const request = computed(() => song.value.requests[0]!)
  const savedSong = computed(() => normalizeForSave(song.value))
  const incomplete = computed(() => findIncomplete(spec, savedSong.value.requests[0]!))
  const generated = computed<GeneratedText>(() => {
    if (isIncomplete(incomplete.value)) return { ok: false, reason: 'incomplete' }
    try {
      return { ok: true, text: generateRequestText({ spec, req: savedSong.value.requests[0]! }) }
    } catch (e) {
      if (e instanceof GenerationError) return { ok: false, reason: 'error', message: e.message }
      throw e
    }
  })

  function replaceSong(data: SongData, profileName: string | null = null) {
    song.value = cloneJson(data)
    currentProfileName.value = profileName
    saveAutosave(song.value)
  }

  return {
    song,
    request,
    savedSong,
    incomplete,
    generated,
    restored,
    currentProfileName,
    start() {
      if (started) return
      started = true
      const r = loadAutosaveFromStorage()
      restored.value = r
      if (r.status === 'ok') song.value = r.song
      scope.run(() =>
        watchDebounced(song, () => saveAutosave(song.value), {
          debounce: AUTOSAVE_DELAY_MS,
          deep: true,
        }),
      )
    },
    replaceSong,
    resetToInitial() {
      replaceSong(createInitialSong(spec))
    },
    stop() {
      scope.stop()
    },
  }
}

let editor: SongEditor | undefined

/** アプリで1つの編集状態 */
export function useSongEditor(): SongEditor {
  editor ??= createSongEditor()
  return editor
}

/** 編集状態を捨てる（テスト用。次の useSongEditor で作り直す） */
export function resetSongEditor(): void {
  editor?.stop()
  editor = undefined
}
