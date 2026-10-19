<script setup lang="ts">
// 依頼文の表示とコピー（ui-and-nonfunctional.md §3、判断ポイント33）。入力に応じて常に作り直す（J6）。
// 作れないとき（未完成など）は、依頼文の代わりに理由を出し、コピーできないようにする
import { useClipboard } from '@vueuse/core'
import { computed } from 'vue'
import type { GeneratedText } from '@/composables/useSongEditor'

const props = defineProps<{ generated: GeneratedText }>()

// legacy: HTTP のローカル IIS（localhost 以外）では Clipboard API が使えないため（判断ポイント33）
const { copy, copied } = useClipboard({ legacy: true })

const text = computed(() => (props.generated.ok ? props.generated.text : ''))
const errorMessage = computed(() =>
  !props.generated.ok && props.generated.reason === 'error' ? props.generated.message : '',
)
</script>

<template>
  <section class="space-y-3" data-testid="request-area">
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-lg font-semibold">依頼文</h2>
      <UButton
        :label="copied ? 'コピーしました' : 'コピー'"
        :disabled="!generated.ok"
        data-testid="copy-request"
        @click="copy(text)"
      />
    </div>
    <UAlert
      v-if="!generated.ok && generated.reason === 'incomplete'"
      color="error"
      variant="subtle"
      title="未完成の項目があるため、依頼文を作れません"
      description="カードに赤字で示した項目を直してください。"
      data-testid="request-incomplete"
    />
    <UAlert
      v-else-if="!generated.ok"
      color="error"
      variant="subtle"
      title="この組み合わせの依頼文は、まだ作れません"
      :description="errorMessage"
      data-testid="request-error"
    />
    <pre
      v-else
      class="max-h-[70vh] overflow-auto rounded-md border border-default bg-elevated p-4 text-sm whitespace-pre-wrap"
      data-testid="request-text"
      >{{ text }}</pre>
  </section>
</template>
