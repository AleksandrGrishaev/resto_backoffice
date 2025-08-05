<!-- src/views/storage/components/InventoryItemRow.vue - ОБНОВЛЕННАЯ ВЕРСИЯ -->
<template>
  <v-card variant="outlined" class="inventory-item-row" :class="getRowClass()">
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

        <!-- ✅ ДОБАВЛЕНО: Кнопка подтверждения -->
        <v-col cols="6" md="1">
          <div class="text-center">
            <v-btn
              :color="isConfirmedOrChanged ? 'success' : 'default'"
              :variant="isConfirmedOrChanged ? 'flat' : 'outlined'"
              size="small"
              icon="mdi-check"
              @click="toggleConfirmed"
            >
              <v-icon />
              <v-tooltip activator="parent" location="top">
                {{ getConfirmTooltip() }}
              </v-tooltip>
            </v-btn>
          </div>
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
              class="text-body-1 font-weight-medium"
              :class="getDifferenceColor(modelValue.valueDifference)"
            >
              {{ formatCurrency(modelValue.valueDifference) }}
            </div>
            <!-- ✅ ДОБАВЛЕНО: Показываем кто считал под значением -->
            <div v-if="modelValue.countedBy" class="text-caption text-medium-emphasis mt-1">
              by {{ modelValue.countedBy }}
            </div>
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
            placeholder="Add notes about discrepancy or confirmation..."
            @update:model-value="updateNotes"
          />
        </div>
      </v-expand-transition>

      <!-- Toggle Notes Button -->
      <div v-if="modelValue.difference !== 0 || showNotes" class="text-center mt-2">
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

// Computed
const isConfirmedOrChanged = computed(
  () =>
    props.modelValue.confirmed === true ||
    Math.abs(props.modelValue.actualQuantity - props.modelValue.systemQuantity) > 0.001 ||
    !!props.modelValue.countedBy
)

const hasBeenTouched = computed(() => isConfirmedOrChanged.value || !!props.modelValue.notes)

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
  if (Math.abs(amount) < 1) return '0'

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
  if (props.modelValue.confirmed) return 'mdi-check-circle'
  if (props.modelValue.countedBy) return 'mdi-account-check'
  if (props.modelValue.difference > 0) return 'mdi-plus-circle'
  if (props.modelValue.difference < 0) return 'mdi-minus-circle'
  return 'mdi-help-circle-outline'
}

function getStatusColor(): string {
  if (props.modelValue.confirmed || props.modelValue.countedBy) return 'success'
  if (props.modelValue.difference > 0) return 'success'
  if (props.modelValue.difference < 0) return 'error'
  return 'warning'
}

function getRowClass(): string {
  if (props.modelValue.confirmed || props.modelValue.countedBy) return 'confirmed-row'
  if (Math.abs(props.modelValue.difference) > 0.001) return 'discrepancy-row'
  return 'default-row'
}

function getConfirmTooltip(): string {
  if (props.modelValue.confirmed) return 'Quantity confirmed as correct'
  if (Math.abs(props.modelValue.difference) > 0.001) return 'Discrepancy noted'
  if (props.modelValue.countedBy) return `Counted by ${props.modelValue.countedBy}`
  return 'Click to confirm quantity is correct'
}

function toggleConfirmed() {
  const wasConfirmed = props.modelValue.confirmed
  const newConfirmed = !wasConfirmed

  // Если подтверждаем и еще никто не считал, отмечаем текущего пользователя
  const countedBy =
    newConfirmed && !props.modelValue.countedBy ? 'User' : props.modelValue.countedBy

  emit('update:modelValue', {
    ...props.modelValue,
    confirmed: newConfirmed,
    countedBy: countedBy || ''
  })
}

function updateActualQuantity(value: string | number) {
  const actualQuantity = typeof value === 'string' ? parseFloat(value) : value
  const quantity = actualQuantity || 0
  const difference = quantity - props.modelValue.systemQuantity
  const valueDifference = difference * props.modelValue.averageCost

  // Если пользователь изменил количество, автоматически отмечаем как пересчитанное
  const countedBy = !props.modelValue.countedBy ? 'User' : props.modelValue.countedBy

  emit('update:modelValue', {
    ...props.modelValue,
    actualQuantity: quantity,
    difference,
    valueDifference,
    countedBy,
    confirmed: Math.abs(difference) > 0.001 ? false : props.modelValue.confirmed
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

  // ✅ ДОБАВЛЕНО: Стили для разных состояний строки
  &.confirmed-row {
    border-left: 4px solid rgb(var(--v-theme-success));
    background-color: rgba(var(--v-theme-success), 0.02);
  }

  &.discrepancy-row {
    border-left: 4px solid rgb(var(--v-theme-warning));
    background-color: rgba(var(--v-theme-warning), 0.02);
  }

  &.default-row {
    border-left: 4px solid rgba(var(--v-theme-outline), 0.2);
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
