<script setup lang="ts">
// プロファイルのポップアップ（U4d の決定 M6、判断ポイント37・44・52）。ユーザー／ファクトリーのタブ。
// ユーザー: 名前の検索、並び替え（名前順／更新日時の新しい順）、すべて書き出す、各行に読み込む・上書き保存・名前を変更（判断ポイント66）・書き出す・削除。
// ファクトリー: 各行に読み込む。確認は、同じポップアップの中で一覧の代わりに出す（モーダルを重ねない。判断ポイント8）
import { useToast } from '@nuxt/ui/composables'
import { computed, ref, watch } from 'vue'
import { useProfileStore } from '@/composables/useProfileStore'
import { useSongEditor } from '@/composables/useSongEditor'
import { factoryProfiles } from '@/data/factory'
import { downloadJson, prepareForSave } from '@/data/storage'
import { checkSaved } from '@/data/validation'
import { exportFileName } from '@/domain/storage/file-name'
import {
  buildExportFile,
  deleteProfile,
  renameError,
  renameProfile,
  saveProfile,
} from '@/domain/storage/profiles'
import { formatDisplayTimestamp } from '@/domain/storage/timestamp'
import { norm } from '@/domain/editor/tree'
import type { Profile } from '@/domain/types/song'

const open = defineModel<boolean>('open', { required: true })

const editor = useSongEditor()
const profiles = useProfileStore()
const toast = useToast()

const tab = ref<'user' | 'factory'>('user')
const query = ref('')
const sort = ref<'name' | 'updated'>('updated')
type Pending = {
  kind: 'load' | 'overwrite' | 'delete' | 'rename'
  profile: Profile
  source: 'user' | 'factory'
}
const pending = ref<Pending | null>(null)
const failure = ref<string[]>([])
// 名前の変更の入力（判断ポイント66。一意・空は不可。今と同じなら何もしない）
const newName = ref('')
function askRename(p: Profile) {
  newName.value = p.name
  pending.value = { kind: 'rename', profile: p, source: 'user' }
}
const renameInvalid = computed(() => {
  const p = pending.value
  const store = profiles.store.value
  if (p?.kind !== 'rename' || !store) return null
  return renameError(store, p.profile.name, newName.value.trim())
})
watch(open, (v) => {
  if (v) {
    pending.value = null
    failure.value = []
  }
})

const rejected = computed(() =>
  profiles.state.value.status === 'rejected' ? profiles.state.value.errors : null,
)
const userList = computed(() => {
  const q = norm(query.value)
  const list = (profiles.store.value?.profiles ?? []).filter((p) => !q || norm(p.name).includes(q))
  return [...list].sort((a, b) =>
    sort.value === 'name'
      ? a.name.localeCompare(b.name, 'ja')
      : Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  )
})
const prepared = computed(() => prepareForSave(editor.song.value))
const sortItems = [
  { label: '更新日時の新しい順', value: 'updated' },
  { label: '名前順', value: 'name' },
]
const tabs = [
  { label: 'ユーザー', value: 'user', slot: 'user' as const },
  { label: 'ファクトリー', value: 'factory', slot: 'factory' as const },
]

function exportProfiles(list: readonly Profile[]) {
  const now = new Date()
  downloadJson(exportFileName(list, now), buildExportFile(list, now))
  toast.add({ title: `${list.length} 件を書き出しました`, color: 'success' })
}

function confirm() {
  const p = pending.value
  if (!p) return
  const store = profiles.store.value
  if (p.kind === 'load') {
    editor.replaceSong(p.profile.data, p.source === 'user' ? p.profile.name : null)
    const warnings = checkSaved(JSON.stringify(p.profile.data)).warnings
    toast.add({
      title: `「${p.profile.name}」を読み込みました${warnings.length ? '（注意があります）' : ''}`,
      description: warnings.join('\n') || undefined,
      color: warnings.length ? 'warning' : 'success',
    })
    open.value = false
    return
  }
  if (!store) return
  if (p.kind === 'rename') {
    renameConfirmed(p.profile.name)
    return
  }
  const next =
    p.kind === 'overwrite'
      ? saveProfile(store, p.profile.name, prepared.value.song, new Date())
      : deleteProfile(store, p.profile.name)
  const c = profiles.commit(next)
  if (!c.ok) {
    failure.value = c.errors
    pending.value = null
    return
  }
  if (p.kind === 'overwrite') editor.currentProfileName.value = p.profile.name
  if (p.kind === 'delete' && editor.currentProfileName.value === p.profile.name)
    editor.currentProfileName.value = null
  toast.add({
    title: `「${p.profile.name}」を${p.kind === 'overwrite' ? '上書き保存しました' : '削除しました'}`,
    color: 'success',
  })
  pending.value = null
}

/** 名前を変える。覚えている名前がそのプロファイルなら追従させる。中身と更新日時は変えない */
function renameConfirmed(from: string) {
  const store = profiles.store.value
  const to = newName.value.trim()
  if (!store || renameInvalid.value) return
  if (to === from) {
    pending.value = null
    return
  }
  const c = profiles.commit(renameProfile(store, from, to))
  if (!c.ok) {
    failure.value = c.errors
    pending.value = null
    return
  }
  if (editor.currentProfileName.value === from) editor.currentProfileName.value = to
  toast.add({ title: `「${from}」の名前を「${to}」に変更しました`, color: 'success' })
  pending.value = null
}

const confirmText = computed(() => {
  const p = pending.value
  if (!p) return ''
  if (p.kind === 'load')
    return `「${p.profile.name}」を読み込みます。編集中の内容は破棄されます。残したいときは、先に保存または書き出してください。`
  if (p.kind === 'overwrite') return `「${p.profile.name}」を、編集中の内容で上書きします。`
  if (p.kind === 'rename') return `「${p.profile.name}」の新しい名前を入力してください。`
  return `「${p.profile.name}」を削除します。元に戻せません。`
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="プロファイル"
    scrollable
    :ui="{ content: 'sm:max-w-2xl' }"
    data-testid="profiles-dialog"
  >
    <template #body>
      <div v-if="pending" class="space-y-3" data-testid="profiles-confirm">
        <p>{{ confirmText }}</p>
        <UFormField
          v-if="pending.kind === 'rename'"
          label="新しい名前"
          :error="renameInvalid ?? undefined"
        >
          <UInput
            v-model="newName"
            class="w-full"
            autofocus
            data-testid="profiles-rename-input"
            @keydown.enter="confirm"
          />
        </UFormField>
        <UAlert
          v-if="pending.kind === 'overwrite' && prepared.errors.length"
          color="error"
          variant="subtle"
          title="未完成・誤りがあるため、上書きできません"
          :description="prepared.errors.join('\n')"
          data-testid="profiles-overwrite-errors"
        />
        <!-- 実行するボタンを左、やめるボタンを右（利用者の判断 (a)） -->
        <div class="flex justify-end gap-2" data-testid="dialog-buttons">
          <UButton
            :label="pending.kind === 'rename' ? '変更する' : 'はい'"
            :color="pending.kind === 'delete' ? 'error' : 'primary'"
            :disabled="
              (pending.kind === 'overwrite' && prepared.errors.length > 0) ||
              (pending.kind === 'rename' && !!renameInvalid)
            "
            data-testid="profiles-confirm-yes"
            @click="confirm"
          />
          <UButton
            :label="pending.kind === 'rename' ? 'キャンセル' : 'いいえ'"
            color="neutral"
            variant="outline"
            data-testid="profiles-confirm-no"
            @click="pending = null"
          />
        </div>
      </div>
      <UTabs v-else v-model="tab" :items="tabs" :content="true" data-testid="profiles-tabs">
        <template #user>
          <div class="space-y-3 pt-2" data-testid="profiles-user">
            <UAlert
              v-if="rejected"
              color="warning"
              variant="subtle"
              title="ユーザープロファイルを読み込めなかったため、保存・削除・取り込みはできません"
              :description="rejected.join('\n')"
              data-testid="profiles-rejected"
            />
            <UAlert
              v-if="failure.length"
              color="error"
              variant="subtle"
              title="操作できませんでした"
              :description="failure.join('\n')"
            />
            <div v-if="!rejected" class="flex flex-wrap items-center gap-2">
              <UInput
                v-model="query"
                placeholder="名前で検索"
                class="w-full sm:w-56"
                data-testid="profiles-search"
              />
              <USelect v-model="sort" :items="sortItems" class="w-48" data-testid="profiles-sort" />
              <UButton
                label="すべて書き出す"
                color="neutral"
                variant="outline"
                :disabled="!profiles.store.value?.profiles.length"
                data-testid="profiles-export-all"
                @click="exportProfiles(profiles.store.value!.profiles)"
              />
            </div>
            <p v-if="!rejected && userList.length === 0" class="text-sm text-muted">
              ユーザープロファイルはありません。ヘッダーの「保存」で、編集中の内容を名前を付けて保存できます。
            </p>
            <ul class="divide-y divide-default">
              <li
                v-for="p in userList"
                :key="p.name"
                class="flex flex-wrap items-center justify-between gap-2 py-2"
                :data-testid="`profile-${p.name}`"
              >
                <div class="min-w-0">
                  <div class="truncate font-medium">{{ p.name }}</div>
                  <div class="text-xs text-muted">{{ formatDisplayTimestamp(p.updatedAt) }}</div>
                </div>
                <div class="flex flex-wrap gap-1">
                  <UButton
                    size="xs"
                    label="読み込む"
                    data-testid="profile-load"
                    @click="pending = { kind: 'load', profile: p, source: 'user' }"
                  />
                  <UButton
                    size="xs"
                    label="上書き保存"
                    color="neutral"
                    variant="outline"
                    data-testid="profile-overwrite"
                    @click="pending = { kind: 'overwrite', profile: p, source: 'user' }"
                  />
                  <UButton
                    size="xs"
                    label="名前を変更"
                    color="neutral"
                    variant="outline"
                    data-testid="profile-rename"
                    @click="askRename(p)"
                  />
                  <UButton
                    size="xs"
                    label="書き出す"
                    color="neutral"
                    variant="outline"
                    data-testid="profile-export"
                    @click="exportProfiles([p])"
                  />
                  <UButton
                    size="xs"
                    label="削除"
                    color="error"
                    variant="outline"
                    data-testid="profile-delete"
                    @click="pending = { kind: 'delete', profile: p, source: 'user' }"
                  />
                </div>
              </li>
            </ul>
          </div>
        </template>
        <template #factory>
          <ul class="divide-y divide-default pt-2" data-testid="profiles-factory">
            <li
              v-for="p in factoryProfiles"
              :key="p.name"
              class="flex items-center justify-between gap-2 py-2"
              :data-testid="`factory-${p.name}`"
            >
              <span class="min-w-0 truncate">{{ p.name }}</span>
              <UButton
                size="xs"
                label="読み込む"
                data-testid="factory-load"
                @click="pending = { kind: 'load', profile: p, source: 'factory' }"
              />
            </li>
          </ul>
        </template>
      </UTabs>
    </template>
  </UModal>
</template>
