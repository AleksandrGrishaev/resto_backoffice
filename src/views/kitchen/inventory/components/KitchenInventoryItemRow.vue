<!-- src/views/kitchen/inventory/components/KitchenInventoryItemRow.vue -->
<!-- Touch-optimized inventory item row for Kitchen/Bar Monitor -->
<template>
  <v-card variant="outlined" class="inventory-item-row mb-3" :class="rowClass">
    <v-card-text class="pa-4">
      <v-row align="center" no-gutters>
        <!-- Item Info -->
        <v-col cols="6" sm="3" class="mb-3 mb-sm-0">
          <div class="d-flex align-center">
            <div class="item-icon mr-3">
              {{ itemIcon }}
            </div>
            <div class="item-info">
              <div class="text-subtitle-1 font-weight-medium item-name">
                {{ modelValue.itemName }}
              </div>
              <div class="text-caption text-medium-emphasis">
                System:
                <strong>{{ modelValue.systemQuantity }}</strong>
                {{ modelValue.unit }}
                <span v-if="modelValue.systemQuantity < 0" class="text-error ml-1">(Neg)</span>
                <span v-else-if="modelValue.systemQuantity === 0" class="text-warning ml-1">
                  (0)
                </span>
              </div>
            </div>
          </div>
        </v-col>

        <!-- Days Since Last Count Column -->
        <v-col cols="2" sm="1" class="text-center mb-3 mb-sm-0">
          <div class="days-column">
            <div class="text-subtitle-2 font-weight-bold" :class="daysTextColor">
              {{ daysSinceLastCount !== null ? daysSinceLastCount : '—' }}
            </div>
            <div class="text-caption text-medium-emphasis">days</div>
          </div>
        </v-col>

        <!-- Quantity Input with +/- buttons -->
        <v-col cols="8" sm="5" class="px-2">
          <div class="quantity-controls d-flex align-center justify-center">
            <v-btn
              icon
              variant="outlined"
              size="large"
              class="quantity-btn"
              :disabled="localQuantity <= 0"
              @click="decrementQuantity"
            >
              <v-icon size="24">mdi-minus</v-icon>
            </v-btn>

            <NumericInputField
              v-model="localQuantity"
              variant="outlined"
              density="comfortable"
              hide-details
              class="quantity-input mx-2"
              :suffix="modelValue.unit"
              :allow-decimal="true"
              :decimal-places="3"
              :min="0"
              force-tablet-mode
              @update:model-value="handleQuantityChange"
            />

            <v-btn
              icon
              variant="outlined"
              size="large"
              class="quantity-btn"
              @click="incrementQuantity"
            >
              <v-icon size="24">mdi-plus</v-icon>
            </v-btn>
          </div>
        </v-col>

        <!-- Confirm Button & Difference -->
        <v-col cols="4" sm="3" class="text-center d-flex flex-column align-center justify-center">
          <v-btn
            :color="isConfirmed ? 'success' : 'default'"
            :variant="isConfirmed ? 'flat' : 'outlined'"
            size="large"
            icon
            class="confirm-btn"
            @click="toggleConfirmed"
          >
            <v-icon size="28">mdi-check</v-icon>
          </v-btn>

          <!-- Difference Display -->
          <div v-if="modelValue.difference !== 0" class="difference-display mt-2">
            <div class="text-caption font-weight-medium" :class="differenceColor">
              {{ formattedDifference }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ formattedValueDiff }}
            </div>
          </div>
        </v-col>
      </v-row>

      <!-- Expandable Notes Section -->
      <v-expand-transition>
        <div v-if="showNotes" class="notes-section mt-4">
          <v-textarea
            v-model="localNotes"
            label="Notes"
            variant="outlined"
            rows="2"
            density="compact"
            placeholder="Add notes about this item..."
            @blur="handleNotesBlur"
          />
        </div>
      </v-expand-transition>

      <!-- Notes Toggle -->
      <div
        v-if="modelValue.difference !== 0 || showNotes || modelValue.notes"
        class="notes-toggle text-center mt-3"
      >
        <v-btn
          size="small"
          variant="text"
          color="primary"
          :prepend-icon="showNotes ? 'mdi-chevron-up' : 'mdi-note-plus-outline'"
          @click="showNotes = !showNotes"
        >
          {{ showNotes ? 'Hide Notes' : modelValue.notes ? 'View Notes' : 'Add Notes' }}
        </v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { InventoryItem } from '@/stores/storage'
import NumericInputField from '@/components/input/NumericInputField.vue'

// =============================================
// PROPS
// =============================================

interface Props {
  modelValue: InventoryItem
  responsiblePerson?: string
}

const props = withDefaults(defineProps<Props>(), {
  responsiblePerson: 'User'
})

// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  'update:modelValue': [value: InventoryItem]
}>()

// =============================================
// STATE
// =============================================

const showNotes = ref(false)
const localQuantity = ref(props.modelValue.actualQuantity)
const localNotes = ref(props.modelValue.notes || '')
const hasUserInteracted = ref(props.modelValue.userInteracted || false)

// =============================================
// COMPUTED
// =============================================

/**
 * Item icon based on type
 */
const itemIcon = computed(() => {
  return props.modelValue.itemType === 'product' ? '🥩' : '🍲'
})

/**
 * Days since last inventory count
 */
const daysSinceLastCount = computed(() => {
  if (!props.modelValue.lastCountedAt) return null
  const lastCounted = new Date(props.modelValue.lastCountedAt)
  const now = new Date()
  return Math.floor((now.getTime() - lastCounted.getTime()) / (1000 * 60 * 60 * 24))
})

/**
 * Text color for days column based on staleness
 */
const daysTextColor = computed(() => {
  const days = daysSinceLastCount.value
  if (days === null) return 'text-grey'
  if (days > 14) return 'text-error'
  if (days > 7) return 'text-warning'
  return 'text-success'
})

/**
 * Check if item is confirmed or has changes
 */
const isConfirmed = computed(() => {
  return (
    props.modelValue.confirmed === true ||
    Math.abs(props.modelValue.actualQuantity - props.modelValue.systemQuantity) > 0.001 ||
    !!props.modelValue.countedBy
  )
})

/**
 * Row class based on status
 */
const rowClass = computed(() => {
  const system = props.modelValue.systemQuantity

  if (system < 0) return 'negative-stock'
  if (system === 0) return 'zero-stock'
  if (props.modelValue.confirmed || props.modelValue.countedBy) return 'confirmed'
  if (Math.abs(props.modelValue.difference) > 0.001) return 'discrepancy'
  return 'default'
})

/**
 * Difference color
 */
const differenceColor = computed(() => {
  const diff = props.modelValue.difference
  if (diff > 0) return 'text-success'
  if (diff < 0) return 'text-error'
  return 'text-medium-emphasis'
})

/**
 * Formatted difference
 */
const formattedDifference = computed(() => {
  const diff = props.modelValue.difference
  const prefix = diff > 0 ? '+' : ''
  return `${prefix}${diff} ${props.modelValue.unit}`
})

/**
 * Formatted value difference
 */
const formattedValueDiff = computed(() => {
  const val = props.modelValue.valueDifference
  if (Math.abs(val) < 1) return ''

  const prefix = val > 0 ? '+' : ''
  return (
    prefix +
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val)
  )
})

// =============================================
// METHODS
// =============================================

/**
 * Increment quantity
 */
function incrementQuantity() {
  hasUserInteracted.value = true
  localQuantity.value++
  emitUpdate()
}

/**
 * Decrement quantity
 */
function decrementQuantity() {
  if (localQuantity.value > 0) {
    hasUserInteracted.value = true
    localQuantity.value--
    emitUpdate()
  }
}

/**
 * Handle quantity change from NumericInputField
 */
function handleQuantityChange(value: number | string) {
  const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value
  if (numValue !== props.modelValue.actualQuantity) {
    hasUserInteracted.value = true
  }
  localQuantity.value = numValue
  emitUpdate()
}

/**
 * Handle notes blur
 */
function handleNotesBlur() {
  if (localNotes.value !== props.modelValue.notes) {
    emit('update:modelValue', {
      ...props.modelValue,
      notes: localNotes.value
    })
  }
}

/**
 * Toggle confirmed state
 */
function toggleConfirmed() {
  hasUserInteracted.value = true
  const wasConfirmed = props.modelValue.confirmed
  const newConfirmed = !wasConfirmed

  emit('update:modelValue', {
    ...props.modelValue,
    confirmed: newConfirmed,
    userInteracted: true,
    countedBy:
      newConfirmed && !props.modelValue.countedBy
        ? props.responsiblePerson
        : props.modelValue.countedBy
  })
}

/**
 * Emit update with calculated values
 */
function emitUpdate() {
  const quantity = localQuantity.value || 0
  const difference = quantity - props.modelValue.systemQuantity
  const valueDifference = difference * props.modelValue.averageCost

  emit('update:modelValue', {
    ...props.modelValue,
    actualQuantity: quantity,
    difference,
    valueDifference,
    userInteracted: hasUserInteracted.value,
    countedBy:
      hasUserInteracted.value && !props.modelValue.countedBy
        ? props.responsiblePerson
        : props.modelValue.countedBy,
    confirmed: props.modelValue.confirmed
  })
}

// =============================================
// WATCHERS
// =============================================

watch(
  () => props.modelValue.actualQuantity,
  newVal => {
    if (newVal !== localQuantity.value) {
      localQuantity.value = newVal
    }
  }
)

watch(
  () => props.modelValue.notes,
  newVal => {
    if (newVal !== localNotes.value) {
      localNotes.value = newVal || ''
    }
  }
)

watch(
  () => props.modelValue.userInteracted,
  newVal => {
    if (newVal !== hasUserInteracted.value) {
      hasUserInteracted.value = newVal || false
    }
  }
)
</script>

<style scoped lang="scss">
.inventory-item-row {
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  // Status styles
  &.negative-stock {
    border-left: 4px solid rgb(var(--v-theme-error));
    background-color: rgba(var(--v-theme-error), 0.03);
  }

  &.zero-stock {
    border-left: 4px solid rgb(var(--v-theme-warning));
    background-color: rgba(var(--v-theme-warning), 0.02);
  }

  &.confirmed {
    border-left: 4px solid rgb(var(--v-theme-success));
    background-color: rgba(var(--v-theme-success), 0.02);
  }

  &.discrepancy {
    border-left: 4px solid rgb(var(--v-theme-warning));
    background-color: rgba(var(--v-theme-warning), 0.02);
  }

  &.default {
    border-left: 4px solid rgba(var(--v-theme-outline), 0.2);
  }
}

.item-icon {
  font-size: 24px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 8px;
  flex-shrink: 0;
}

.item-info {
  min-width: 0;
  flex: 1;
}

.days-column {
  line-height: 1.2;
}

.item-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.quantity-controls {
  gap: var(--spacing-xs);
}

.quantity-btn {
  min-width: 48px !important;
  min-height: 48px !important;
}

.quantity-input {
  max-width: 140px;
  min-width: 100px;

  :deep(input) {
    text-align: center;
    font-size: 1.1rem;
    font-weight: 500;
  }
}

.confirm-btn {
  min-width: 56px !important;
  min-height: 56px !important;
}

.difference-display {
  line-height: 1.2;
}

.notes-section {
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
  padding-top: var(--spacing-sm);
}

/* Mobile adjustments */
@media (max-width: 600px) {
  .quantity-input {
    max-width: 120px;
    min-width: 80px;
  }

  .confirm-btn {
    min-width: 48px !important;
    min-height: 48px !important;
  }
}
</style>
