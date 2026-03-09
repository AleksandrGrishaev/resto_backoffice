<!-- src/core/watchdog/WatchdogConfirmDialog.vue -->
<!-- Pre-save confirmation dialog when watchdog detects unusual quantities or prices -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="520"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center pa-4 bg-warning-lighten-4">
        <v-icon icon="mdi-alert" color="warning" class="mr-2" />
        <span>Unusual Values Detected</span>
      </v-card-title>

      <v-card-text class="pa-4">
        <p class="text-body-2 text-medium-emphasis mb-4">
          The following values are significantly different from recent history. Please confirm they
          are correct.
        </p>

        <!-- Quantity Warnings -->
        <div v-for="w in result.quantityWarnings" :key="'q-' + w.itemId" class="warning-item mb-3">
          <div class="d-flex align-center mb-1">
            <v-icon
              :icon="w.severity === 'critical' ? 'mdi-alert-circle' : 'mdi-alert'"
              :color="w.severity === 'critical' ? 'error' : 'warning'"
              size="18"
              class="mr-2"
            />
            <span class="font-weight-bold text-body-2">{{ w.itemName }}</span>
            <v-chip
              :color="w.severity === 'critical' ? 'error' : 'warning'"
              size="x-small"
              class="ml-2"
            >
              {{ w.multiplier }}x
            </v-chip>
          </div>
          <div class="comparison-grid ml-7">
            <div class="d-flex justify-space-between text-caption">
              <span class="text-medium-emphasis">You entered:</span>
              <span class="font-weight-bold">{{ formatQty(w.enteredQuantity, w.unit) }}</span>
            </div>
            <div class="d-flex justify-space-between text-caption">
              <span class="text-medium-emphasis">Average:</span>
              <span>{{ formatQty(w.averageQuantity, w.unit) }}</span>
            </div>
            <div class="d-flex justify-space-between text-caption">
              <span class="text-medium-emphasis">Max seen:</span>
              <span>{{ formatQty(w.maxHistoricalQuantity, w.unit) }}</span>
            </div>
          </div>
        </div>

        <!-- Price Warnings -->
        <div v-for="w in result.priceWarnings" :key="'p-' + w.itemId" class="warning-item mb-3">
          <div class="d-flex align-center mb-1">
            <v-icon
              :icon="w.severity === 'critical' ? 'mdi-alert-circle' : 'mdi-alert'"
              :color="w.severity === 'critical' ? 'error' : 'warning'"
              size="18"
              class="mr-2"
            />
            <span class="font-weight-bold text-body-2">{{ w.itemName }}</span>
            <v-chip
              :color="w.severity === 'critical' ? 'error' : 'warning'"
              size="x-small"
              class="ml-2"
            >
              +{{ w.percentChange }}%
            </v-chip>
          </div>
          <div class="comparison-grid ml-7">
            <div class="d-flex justify-space-between text-caption">
              <span class="text-medium-emphasis">New price:</span>
              <span class="font-weight-bold">
                {{ formatPrice(w.enteredCostPerUnit) }}/{{ w.unit }}
              </span>
            </div>
            <div class="d-flex justify-space-between text-caption">
              <span class="text-medium-emphasis">Average:</span>
              <span>{{ formatPrice(w.averageCostPerUnit) }}/{{ w.unit }}</span>
            </div>
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn variant="outlined" color="primary" @click="handleGoBack">
          <v-icon start>mdi-arrow-left</v-icon>
          Go Back & Fix
        </v-btn>
        <v-spacer />
        <v-btn
          :color="result.hasCritical ? 'error' : 'warning'"
          variant="tonal"
          @click="handleConfirm"
        >
          <v-icon start>mdi-check</v-icon>
          Confirm & Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type { PreCheckResult } from './preCheck'
import { formatIDR } from '@/utils'

interface Props {
  modelValue: boolean
  result: PreCheckResult
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

function formatQty(value: number, unit: string): string {
  if (unit === 'gram' || unit === 'g') {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}kg` : `${Math.round(value)}g`
  }
  if (unit === 'ml') {
    return value >= 1000 ? `${(value / 1000).toFixed(1)}L` : `${Math.round(value)}ml`
  }
  return `${Math.round(value)} ${unit}`
}

function formatPrice(value: number): string {
  return formatIDR(value)
}

function handleConfirm() {
  emit('confirm')
  emit('update:modelValue', false)
}

function handleGoBack() {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>

<style scoped>
.warning-item {
  background: rgba(var(--v-theme-warning), 0.05);
  border-radius: 8px;
  padding: 10px 12px;
  border-left: 3px solid rgb(var(--v-theme-warning));
}

.comparison-grid {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
</style>
