<script setup lang="ts">
// U0 の仮の画面。仕様の JSON を読めることを確かめるだけで、U4 で置き換える
import { specSummary } from '@/data/spec'
</script>

<template>
  <UApp>
    <main class="p-6 space-y-4">
      <h1 class="text-2xl font-bold">AI Music Intent Builder</h1>
      <p>読み込んだ仕様（design/v0/docs/specifications/）</p>
      <ul class="list-disc pl-6" data-testid="spec-summary">
        <li data-testid="song-fields">楽曲の項目: {{ specSummary.songFields }}</li>
        <li data-testid="output-fields">出力の項目: {{ specSummary.outputFields }}</li>
        <li data-testid="vocabularies">語彙: {{ specSummary.vocabularies }}</li>
        <li data-testid="tool-profiles">ツールプロファイル: {{ specSummary.toolProfiles }}</li>
      </ul>
      <UButton label="Nuxt UI の動作確認" />
    </main>
  </UApp>
</template>
