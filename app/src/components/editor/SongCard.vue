<script setup lang="ts">
// 一覧のカード（ui-and-nonfunctional.md §1・§1-2）。②お任せも省略せずに出し、①指定以外は淡く表示する。
// 依頼文の範囲で依頼文に出ない項目は、淡く表示して「依頼文に出ません」を添える（判断ポイント48・53）。
// 「変更」でポップアップを開く（CardEditor。U4b）
import { computed } from 'vue'
import { spec } from '@/data/spec'
import {
  cardSections,
  isOutOfScope,
  requestScopeLabel,
  requestScopeOf,
  type CardDef,
} from '@/domain/editor/cards'
import {
  displayAxis,
  displayOutput,
  LYRICS_AUTHOR_LABELS,
  outputCardItems,
  stateCounts,
  VOCAL_MODE_LABELS,
} from '@/domain/editor/display'
import { UNFINISHED_MESSAGES, type Incomplete } from '@/domain/editor/incomplete'
import type { SongRequest } from '@/domain/types/song'

const props = defineProps<{ card: CardDef; request: SongRequest; incomplete: Incomplete }>()
const emit = defineEmits<{ edit: [] }>()

interface Row {
  id: string
  label: string
  text: string
  muted: boolean
  outOfScope: boolean
  problem?: string
}
interface Section {
  label?: string
  rows: Row[]
}

const sections = computed<Section[]>(() => {
  const req = props.request
  const out = (id: string) => isOutOfScope(spec, req, id)
  if (props.card.id === 'songType') {
    const rows: Row[] = [
      {
        id: 'vocalMode',
        label: 'ボーカル区分',
        text: VOCAL_MODE_LABELS[req.vocalMode],
        muted: false,
        outOfScope: false,
      },
    ]
    if (req.vocalMode === 'vocal') {
      rows.push({
        id: 'lyricsAuthor',
        label: '作詞の主体',
        text: req.lyricsAuthor ? LYRICS_AUTHOR_LABELS[req.lyricsAuthor] : '未選択',
        muted: req.lyricsAuthor === null,
        outOfScope: out('lyricsAuthor'),
        problem: props.incomplete.lyricsAuthorMissing
          ? UNFINISHED_MESSAGES.lyricsAuthorMissing
          : undefined,
      })
      rows.push({
        id: 'requestScope',
        label: spec.outputById.get('requestScope')?.label ?? '依頼文の範囲',
        text: requestScopeLabel(spec, requestScopeOf(req)),
        muted: false,
        outOfScope: false,
      })
    }
    return [{ rows }]
  }
  if (props.card.id === 'output') {
    const rows = outputCardItems(spec).map((o) => ({
      id: o.id,
      label: o.label,
      text: displayOutput(spec, req, o),
      muted: false,
      outOfScope: out(o.id),
    }))
    return [{ rows }]
  }
  return cardSections(spec, props.card, req).map((s) => ({
    label: s.label,
    rows: s.fieldIds.map((id) => {
      const f = spec.fieldById.get(id)!
      const d = displayAxis(spec, f, req.axes[id])
      return {
        id,
        label: f.label,
        text: d.text,
        muted: d.muted,
        outOfScope: out(id),
        problem: props.incomplete.emptyFields.includes(id)
          ? UNFINISHED_MESSAGES.emptyField
          : undefined,
      }
    }),
  }))
})

const counts = computed(() =>
  props.card.showCounts
    ? stateCounts(
        spec,
        props.request,
        cardSections(spec, props.card, props.request).flatMap((s) => s.fieldIds),
      )
    : '',
)

const allOutOfScope = computed(() => {
  const rows = sections.value.flatMap((s) => s.rows)
  return rows.length > 0 && rows.every((r) => r.outOfScope)
})
</script>

<template>
  <UCard :data-testid="`card-${card.id}`" :ui="{ header: 'py-3', body: 'py-3' }">
    <template #header>
      <div class="flex items-center justify-between gap-2">
        <h2 class="font-semibold">{{ card.label }}</h2>
        <div class="flex items-center gap-3">
          <span v-if="counts" class="text-sm text-muted" data-testid="counts">{{ counts }}</span>
          <UButton
            label="変更"
            size="sm"
            variant="outline"
            :data-testid="`edit-${card.id}`"
            @click="emit('edit')"
          />
        </div>
      </div>
    </template>
    <p v-if="allOutOfScope" class="mb-2 text-sm text-muted" data-testid="scope-note">
      依頼文の範囲が「{{
        requestScopeLabel(spec, requestScopeOf(request))
      }}」のため、このカードの項目は依頼文に出ません（値は残ります）
    </p>
    <div v-for="(section, i) in sections" :key="i" class="not-first:mt-3">
      <h3 v-if="section.label" class="mb-1 text-xs font-semibold text-muted">
        {{ section.label }}
      </h3>
      <dl class="grid grid-cols-[7rem_1fr] sm:grid-cols-[10rem_1fr] gap-x-4 gap-y-1 text-sm">
        <template v-for="row in section.rows" :key="row.id">
          <dt
            :class="['text-muted', row.outOfScope && 'opacity-50']"
            :data-testid="`label-${row.id}`"
          >
            {{ row.label }}
          </dt>
          <dd
            :class="[row.outOfScope && 'opacity-50', 'min-w-0 break-words']"
            :data-testid="`row-${row.id}`"
            :data-out-of-scope="row.outOfScope || undefined"
          >
            <span :class="row.muted ? 'text-muted' : 'text-highlighted'">{{ row.text }}</span>
            <span v-if="row.outOfScope && !allOutOfScope" class="ml-2 text-xs text-muted"
              >（依頼文に出ません）</span
            >
            <span
              v-if="row.problem"
              class="block text-xs text-error"
              :data-testid="`problem-${row.id}`"
              >{{ row.problem }}</span
            >
          </dd>
        </template>
      </dl>
    </div>
  </UCard>
</template>
