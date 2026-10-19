<script setup lang="ts">
// 状態の切り替え（A1 のセグメントコントロール。Nuxt UI のボタン群で作る。U4b の補完・仮定2）
import type { StateId } from '@/domain/types/fields'

defineProps<{ options: { value: StateId; label: string }[]; modelValue: StateId; testid: string }>()
const emit = defineEmits<{ 'update:modelValue': [StateId] }>()
</script>

<template>
  <div>
    <UFieldGroup size="sm" :data-testid="testid">
      <UButton
        v-for="o in options"
        :key="o.value"
        :label="o.label"
        :color="o.value === modelValue ? 'primary' : 'neutral'"
        :variant="o.value === modelValue ? 'solid' : 'outline'"
        :aria-pressed="o.value === modelValue"
        :data-testid="`${testid}-${o.value}`"
        @click="emit('update:modelValue', o.value)"
      />
    </UFieldGroup>
  </div>
</template>
