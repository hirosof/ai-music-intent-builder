<script setup lang="ts">
// 依頼文のカード（ui-and-nonfunctional.md §3・§3-1、判断ポイント33・55）。他のカードと同じ形（枠・見出し行）で、
// 見出し行に「依頼文」と「コピー」。依頼文は常に表示し、入力に応じて作り直す（判断ポイント3。表示のボタンとスクロールは廃止）。
// 未完成（S5・F12。判断ポイント43）のときは依頼文を作らず、カードの中に理由（項目ごと）を示し、コピーを無効にする。
// 依頼文の下に注意書き（U5）: 文字数超過（§3-3。判断ポイント42）を先に、チップ化の案内（§3-2。判断ポイント41）をその下に。
// どちらも情報色の UAlert で、閉じるボタンは付けない（閉じた状態を保存しない）
import { useClipboard } from '@vueuse/core'
import { computed } from 'vue'
import type { GeneratedText } from '@/composables/useSongEditor'
import { spec } from '@/data/spec'
import { UNFINISHED_MESSAGES, type Incomplete } from '@/domain/editor/incomplete'
import { CHIP_NOTICE, chipNotice, lengthNotice, lengthNoticeText } from '@/domain/editor/notices'
import type { SongRequest } from '@/domain/types/song'

const props = defineProps<{
  generated: GeneratedText
  /** 保存する形の依頼（注意書きの条件に使う） */
  request: SongRequest
  incomplete: Incomplete
}>()

// legacy: HTTP のローカル IIS（localhost 以外）では Clipboard API が使えないため（判断ポイント33）
const { copy, copied } = useClipboard({ legacy: true })
const phraseClipboard = useClipboard({ legacy: true })

const text = computed(() => (props.generated.ok ? props.generated.text : ''))
const errorMessage = computed(() =>
  !props.generated.ok && props.generated.reason === 'error' ? props.generated.message : '',
)
/** 未完成の理由（項目名つき） */
const reasons = computed(() => [
  ...props.incomplete.emptyFields.map(
    (id) => `${spec.fieldById.get(id)?.label ?? id}: ${UNFINISHED_MESSAGES.emptyField}`,
  ),
  ...(props.incomplete.lyricsAuthorMissing ? [UNFINISHED_MESSAGES.lyricsAuthorMissing] : []),
])
const length = computed(() => {
  const n = lengthNotice(spec, props.request)
  return n && lengthNoticeText(n)
})
const chip = computed(() => chipNotice(props.request))
</script>

<template>
  <UCard data-testid="request-area" :ui="{ header: 'py-3', body: 'space-y-3' }">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="font-semibold">依頼文</h2>
        <UButton
          :label="copied ? 'コピーしました' : 'コピー'"
          size="sm"
          :disabled="!generated.ok"
          data-testid="copy-request"
          @click="copy(text)"
        />
      </div>
    </template>
    <UAlert
      v-if="!generated.ok && generated.reason === 'incomplete'"
      color="error"
      variant="subtle"
      title="未完成の項目があるため、依頼文を作れません"
      data-testid="request-incomplete"
    >
      <template #description>
        <ul class="list-disc ps-5">
          <li v-for="(r, i) in reasons" :key="i" data-testid="request-incomplete-reason">
            {{ r }}
          </li>
        </ul>
      </template>
    </UAlert>
    <UAlert
      v-else-if="!generated.ok"
      color="error"
      variant="subtle"
      title="この組み合わせの依頼文は、まだ作れません"
      :description="errorMessage"
      data-testid="request-error"
    />
    <template v-else>
      <pre
        class="max-h-[70vh] overflow-auto rounded-md border border-default bg-elevated p-4 text-sm whitespace-pre-wrap"
        data-testid="request-text"
        >{{ text }}</pre>
      <UAlert
        v-if="length"
        color="info"
        variant="subtle"
        :title="length.title"
        data-testid="notice-length"
      >
        <template #description>
          <p v-for="(line, i) in length.lines" :key="i">{{ line }}</p>
        </template>
      </UAlert>
      <UAlert
        v-if="chip"
        color="info"
        variant="subtle"
        :title="CHIP_NOTICE.title"
        data-testid="notice-chip"
      >
        <template #description>
          <div class="space-y-2">
            <p v-for="(line, i) in CHIP_NOTICE.before" :key="i">{{ line }}</p>
            <div class="flex flex-wrap items-center gap-2">
              <code class="rounded bg-default px-2 py-1" data-testid="chip-phrase">{{
                CHIP_NOTICE.phrase
              }}</code>
              <UButton
                size="xs"
                :label="phraseClipboard.copied.value ? 'コピーしました' : 'コピー'"
                data-testid="copy-chip-phrase"
                @click="phraseClipboard.copy(CHIP_NOTICE.phrase)"
              />
            </div>
            <p>{{ CHIP_NOTICE.after }}</p>
          </div>
        </template>
      </UAlert>
    </template>
  </UCard>
</template>
