// src/components/payment-settings/TaxList.vue
<template>
  <v-card class="tax-list">
    <v-card-title class="text-h6 px-4 py-3">Налоги</v-card-title>

    <v-list class="py-2">
      <v-list-item
        v-for="tax in taxes"
        :key="tax.id"
        :class="{
          'tax-item--inactive': !tax.isActive
        }"
      >
        <template #prepend>
          <v-icon icon="mdi-percent" size="24" />
        </template>

        <v-list-item-title class="d-flex align-center justify-space-between">
          <span>{{ tax.name }}</span>
          <span class="text-medium-emphasis">{{ formatPercentage(tax.percentage) }}</span>
        </v-list-item-title>

        <template #append>
          <div class="d-flex align-center">
            <v-chip v-if="!tax.isActive" size="small" color="warning" variant="flat" class="mr-2">
              Неактивен
            </v-chip>

            <v-btn icon size="small" variant="text" color="primary" @click.stop="emit('edit', tax)">
              <v-icon icon="mdi-pencil" size="20" />
            </v-btn>
          </div>
        </template>
      </v-list-item>

      <v-list-item v-if="taxes.length === 0">
        <v-list-item-title class="text-center text-medium-emphasis">Нет налогов</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
import type { Tax } from '@/types/tax'

defineProps<{
  taxes: Tax[]
}>()

const emit = defineEmits<{
  edit: [tax: Tax]
}>()

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`
}
</script>

<style lang="scss" scoped>
.tax-list {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.tax-item {
  &--inactive {
    opacity: 0.7;
  }
}
</style>
