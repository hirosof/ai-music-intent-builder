<script setup lang="ts">
// カードの「変更」で開くポップアップ（ui-and-nonfunctional.md §2）。即時反映で、閉じるボタンだけ。
// デスクトップ幅は UModal、768px 未満は UDrawer（判断ポイント38、U4 の決定 J7）
import UDrawer from '@nuxt/ui/components/Drawer.vue'
import UModal from '@nuxt/ui/components/Modal.vue'
import { useMediaQuery } from '@vueuse/core'
import { computed } from 'vue'
import { spec } from '@/data/spec'
import { cardSections, type CardDef } from '@/domain/editor/cards'
import type { SongRequest } from '@/domain/types/song'
import FieldEditor from './fields/FieldEditor.vue'
import OutputEditor from './OutputEditor.vue'
import SongTypeEditor from './SongTypeEditor.vue'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{
  card: CardDef
  /** 編集中の依頼（画面上の形。直接書き換える） */
  request: SongRequest
  /** 正規化した依頼（依頼文の範囲の判定に使う。K9） */
  scopeRequest: SongRequest
}>()

const desktop = useMediaQuery('(min-width: 768px)')
const sections = computed(() => cardSections(spec, props.card, props.request))
const title = computed(() => `${props.card.label}の変更`)
const Popup = computed(() => (desktop.value ? UModal : UDrawer))
</script>

<template>
  <component
    :is="Popup"
    v-model:open="open"
    :title="title"
    description="変更はすぐに反映されます。"
    :scrollable="desktop || undefined"
    :should-scale-background="desktop ? undefined : true"
    :ui="desktop ? { content: 'sm:max-w-2xl' } : undefined"
  >
    <template #body>
      <div :data-testid="`editor-card-${card.id}`">
        <SongTypeEditor v-if="card.id === 'songType'" :request="request" />
        <OutputEditor
          v-else-if="card.id === 'output'"
          :request="request"
          :scope-request="scopeRequest"
        />
        <div v-else class="space-y-6">
          <section v-for="(s, i) in sections" :key="i" class="space-y-4">
            <h3 v-if="s.label" class="border-b border-default pb-1 text-sm font-bold text-muted">
              {{ s.label }}
            </h3>
            <FieldEditor
              v-for="id in s.fieldIds"
              :key="id"
              :field="spec.fieldById.get(id)!"
              :request="request"
              :scope-request="scopeRequest"
            />
          </section>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex w-full justify-end">
        <UButton label="閉じる" data-testid="editor-close" @click="open = false" />
      </div>
    </template>
  </component>
</template>
