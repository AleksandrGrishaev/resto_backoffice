<!-- ArrivalConflictDialog.vue — warns about inventory surplus conflicts when receipt arrival time predates an inventory count -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="620"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center pa-4 bg-warning-lighten-4">
        <v-icon icon="mdi-swap-horizontal-bold" color="warning" class="mr-2" />
        <span>Inventory Conflict Detected</span>
      </v-card-title>

      <v-card-text class="pa-4">
        <p class="text-body-2 text-medium-emphasis mb-4">
          These products were already counted as surplus in a later inventory. The delivery arrived
          before the inventory count but was entered after it. Adjusting will reduce the surplus
          correction batches to avoid double-counting.
        </p>

        <!-- Conflict groups by inventory document -->
        <div
          v-for="conflict in conflicts"
          :key="conflict.inventoryDocId"
          class="conflict-group mb-4"
        >
          <div class="d-flex align-center mb-2">
            <v-icon icon="mdi-clipboard-check" size="18" color="info" class="mr-2" />
            <span class="font-weight-bold text-body-2">
              Inventory {{ conflict.inventoryDocNumber }}
            </span>
            <v-chip size="x-small" class="ml-2" color="info" variant="tonal">
              {{ formatDate(conflict.inventoryDate) }}
            </v-chip>
          </div>

          <!-- Items table -->
          <v-table density="compact" class="conflict-table">
            <thead>
              <tr>
                <th class="text-left">Product</th>
                <th class="text-right">Receipt Qty</th>
                <th class="text-right">Inv. Surplus</th>
                <th class="text-right">Will Adjust</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in conflict.items" :key="item.itemId">
                <td class="text-body-2">{{ item.itemName }}</td>
                <td class="text-right text-body-2">
                  {{ formatQty(item.receiptQuantity, item.unit) }}
                </td>
                <td class="text-right text-body-2 text-warning">
                  +{{ formatQty(item.inventorySurplus, item.unit) }}
                </td>
                <td class="text-right text-body-2 font-weight-bold text-error">
                  -{{ formatQty(item.adjustableAmount, item.unit) }}
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <v-alert type="info" variant="tonal" density="compact" class="mt-2">
          <strong>{{ totalAdjustments }}</strong>
          item(s) will have surplus batches reduced. This prevents the same stock from being counted
          twice.
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn variant="outlined" @click="handleSkip">
          <v-icon start>mdi-debug-step-over</v-icon>
          Skip (No Adjustment)
        </v-btn>
        <v-spacer />
        <v-btn color="warning" variant="tonal" :loading="isApplying" @click="handleAdjust">
          <v-icon start>mdi-auto-fix</v-icon>
          Adjust Inventory
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ArrivalConflict } from '@/stores/storage/composables/useReceiptArrivalConflict'

interface Props {
  modelValue: boolean
  conflicts: ArrivalConflict[]
  isApplying?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'adjust'): void
  (e: 'skip'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const totalAdjustments = computed(() => props.conflicts.reduce((sum, c) => sum + c.items.length, 0))

function formatQty(value: number, unit: string): string {
  if (unit === 'gram' || unit === 'g') {
    return value >= 1000 ? `${(value / 1000).toFixed(1)} kg` : `${Math.round(value)} g`
  }
  if (unit === 'ml') {
    return value >= 1000 ? `${(value / 1000).toFixed(1)} L` : `${Math.round(value)} ml`
  }
  return `${Number(value.toFixed(2))} ${unit}`
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateString
  }
}

function handleAdjust() {
  emit('adjust')
}

function handleSkip() {
  emit('skip')
  emit('update:modelValue', false)
}
</script>

<style scoped>
.conflict-group {
  background: rgba(var(--v-theme-warning), 0.05);
  border-radius: 8px;
  padding: 12px;
  border-left: 3px solid rgb(var(--v-theme-warning));
}

.conflict-table {
  background: transparent !important;
}

.conflict-table th {
  font-size: 0.75rem !important;
  padding: 4px 8px !important;
}

.conflict-table td {
  padding: 4px 8px !important;
}
</style>
