<script setup lang="ts">
// 曲の種類（判断ポイント48）: ボーカル区分、作詞の主体（歌ありのみ。既定値なし）、依頼文の範囲（歌ありのみ）。
// 切り替えで隠れる項目の値は、編集中のデータに残る（一時保持。K8）
import { computed } from 'vue'
import { spec } from '@/data/spec'
import { LYRICS_AUTHOR_LABELS, VOCAL_MODE_LABELS } from '@/domain/editor/display'
import { UNFINISHED_MESSAGES } from '@/domain/editor/incomplete'
import type { LyricsAuthor, RequestScope, SongRequest, VocalMode } from '@/domain/types/song'

const props = defineProps<{ request: SongRequest }>()

const vocalModes = (Object.keys(VOCAL_MODE_LABELS) as VocalMode[]).map((v) => ({
  value: v,
  label: VOCAL_MODE_LABELS[v],
}))
const authors = (Object.keys(LYRICS_AUTHOR_LABELS) as LyricsAuthor[]).map((v) => ({
  value: v,
  label: LYRICS_AUTHOR_LABELS[v],
}))
const scopes = computed(() =>
  (spec.outputById.get('requestScope')?.options ?? []).map((o) => ({
    value: o.id,
    label: o.label,
  })),
)
const vocal = computed(() => props.request.vocalMode === 'vocal')
const scope = computed(
  () => (props.request.output.requestScope as RequestScope | undefined) ?? 'combined',
)

function setVocalMode(v: VocalMode) {
  // eslint-disable-next-line vue/no-mutating-props -- 編集中の依頼（リアクティブ）を直接書き換える
  props.request.vocalMode = v
}
function setAuthor(v: LyricsAuthor) {
  // eslint-disable-next-line vue/no-mutating-props
  props.request.lyricsAuthor = v
}
function setScope(v: RequestScope) {
  // eslint-disable-next-line vue/no-mutating-props
  props.request.output.requestScope = v
}
</script>

<template>
  <div class="space-y-5">
    <UFormField label="ボーカル区分">
      <URadioGroup
        :model-value="request.vocalMode"
        :items="vocalModes"
        orientation="horizontal"
        data-testid="input-vocalMode"
        @update:model-value="(v: unknown) => setVocalMode(v as VocalMode)"
      />
    </UFormField>
    <template v-if="vocal">
      <UFormField
        label="作詞の主体"
        :error="request.lyricsAuthor === null ? UNFINISHED_MESSAGES.lyricsAuthorMissing : undefined"
      >
        <URadioGroup
          :model-value="request.lyricsAuthor ?? undefined"
          :items="authors"
          data-testid="input-lyricsAuthor"
          @update:model-value="(v: unknown) => setAuthor(v as LyricsAuthor)"
        />
      </UFormField>
      <UFormField label="依頼文の範囲">
        <URadioGroup
          :model-value="scope"
          :items="scopes"
          orientation="horizontal"
          data-testid="input-requestScope"
          @update:model-value="(v: unknown) => setScope(v as RequestScope)"
        />
      </UFormField>
    </template>
  </div>
</template>
