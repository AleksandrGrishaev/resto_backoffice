<!-- src/views/storage/components/InventoryItemRow.vue -->
<template>
  <v-card variant="outlined" class="inventory-item-row">
    <v-card-text class="pa-3">
      <v-row align="center">
        <!-- Item Info -->
        <v-col cols="12" md="3">
          <div class="d-flex align-center">
            <div class="item-icon mr-2">
              {{ getItemIcon(modelValue.itemType) }}
            </div>
            <div>
              <div class="text-subtitle-2 font-weight-medium">
                {{ modelValue.itemName }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ formatItemType(modelValue.itemType) }}
              </div>
            </div>
          </div>
        </v-col>

        <!-- System Quantity -->
        <v-col cols="6" md="2">
          <div class="text-center">
            <div class="text-caption text-medium-emphasis mb-1">System</div>
            <div class="text-body-1 font-weight-medium">
              {{ modelValue.systemQuantity }} {{ modelValue.unit }}
            </div>
          </div>
        </v-col>

        <!-- Actual Quantity Input -->
        <v-col cols="6" md="2">
          <v-text-field
            :model-value="modelValue.actualQuantity"
            label="Actual"
            type="number"
            min="0"
            step="0.01"
            :suffix="modelValue.unit"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="updateActualQuantity"
            @focus="$event.target.select()"
          />
        </v-col>

        <!-- Difference -->
        <v-col cols="6" md="2">
          <div class="text-center">
            <div class="text-caption text-medium-emphasis mb-1">Difference</div>
            <div
              class="text-body-1 font-weight-medium"
              :class="getDifferenceColor(modelValue.difference)"
            >
              {{ formatDifference(modelValue.difference) }} {{ modelValue.unit }}
            </div>
          </div>
        </v-col>

        <!-- Value Difference -->
        <v-col cols="6" md="2">
          <div class="text-center">
            <div class="text-caption text-medium-emphasis mb-1">Value Impact</div>
            <div
              class="text-body-2 font-weight-medium"
              :class="getDifferenceColor(modelValue.valueDifference)"
            >
              {{ formatCurrency(modelValue.valueDifference) }}
            </div>
          </div>
        </v-col>

        <!-- Status Icon -->
        <v-col cols="12" md="1">
          <div class="text-center">
            <v-icon :icon="getStatusIcon()" :color="getStatusColor()" size="24" />
          </div>
        </v-col>
      </v-row>

      <!-- Notes (expandable) -->
      <v-expand-transition>
        <div v-if="showNotes" class="mt-3">
          <v-textarea
            :model-value="modelValue.notes"
            label="Notes (optional)"
            variant="outlined"
            rows="2"
            density="compact"
            placeholder="Add notes about discrepancy..."
            @update:model-value="updateNotes"
          />
        </div>
      </v-expand-transition>

      <!-- Toggle Notes Button -->
      <div v-if="modelValue.difference !== 0" class="text-center mt-2">
        <v-btn
          size="small"
          variant="text"
          :prepend-icon="showNotes ? 'mdi-chevron-up' : 'mdi-chevron-down'"
          @click="showNotes = !showNotes"
        >
          {{ showNotes ? 'Hide' : 'Add' }} Notes
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { InventoryItem, StorageItemType } from '@/stores/storage'

// Props
interface Props {
  modelValue: InventoryItem
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: InventoryItem]
}>()

// State
const showNotes = ref(false)

// Methods
function getItemIcon(itemType: StorageItemType): string {
  return itemType === 'product' ? '🥩' : '🍲'
}

function formatItemType(itemType: StorageItemType): string {
  return itemType === 'product' ? 'Product' : 'Preparation'
}

function formatDifference(difference: number): string {
  if (difference > 0) return `+${difference}`
  return difference.toString()
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function getDifferenceColor(value: number): string {
  if (value > 0) return 'text-success'
  if (value < 0) return 'text-error'
  return 'text-medium-emphasis'
}

function getStatusIcon(): string {
  if (props.modelValue.difference > 0) return 'mdi-plus-circle'
  if (props.modelValue.difference < 0) return 'mdi-minus-circle'
  return 'mdi-check-circle'
}

function getStatusColor(): string {
  if (props.modelValue.difference > 0) return 'success'
  if (props.modelValue.difference < 0) return 'error'
  return 'success'
}

function updateActualQuantity(value: string | number) {
  const actualQuantity = typeof value === 'string' ? parseFloat(value) : value
  const quantity = actualQuantity || 0
  const difference = quantity - props.modelValue.systemQuantity
  const valueDifference = difference * props.modelValue.averageCost

  emit('update:modelValue', {
    ...props.modelValue,
    actualQuantity: quantity,
    difference,
    valueDifference
  })
}

function updateNotes(notes: string) {
  emit('update:modelValue', {
    ...props.modelValue,
    notes
  })
}
</script>

<style lang="scss" scoped>
.inventory-item-row {
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .item-icon {
    font-size: 20px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--v-theme-primary), 0.1);
    border-radius: 6px;
  }
}
</style>
