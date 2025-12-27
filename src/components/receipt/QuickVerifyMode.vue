<!-- src/components/receipt/QuickVerifyMode.vue -->
<!-- Quick Verify Mode: Split-screen field-by-field receipt verification -->
<template>
  <v-dialog
    :model-value="modelValue"
    fullscreen
    persistent
    transition="dialog-bottom-transition"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="quick-verify-container">
      <!-- Header -->
      <v-toolbar color="primary" density="compact">
        <v-btn icon="mdi-arrow-left" variant="text" @click="handleExit" />
        <v-toolbar-title>Quick Verify Receipt</v-toolbar-title>
        <v-spacer />
        <div class="progress-badge">
          <v-chip size="small" variant="flat" color="primary-darken-1">
            Item {{ progress.currentItem }}/{{ progress.totalItems }}
          </v-chip>
          <v-chip size="small" variant="flat" color="primary-darken-2" class="ml-2">
            Field {{ progress.currentField }}/{{ progress.totalFields }}
          </v-chip>
        </div>
      </v-toolbar>

      <!-- Progress Bar -->
      <v-progress-linear :model-value="progress.percentComplete" color="success" height="4" />

      <!-- Main Content: Split Layout -->
      <div class="split-layout">
        <!-- LEFT PANEL: Item Info & Fields -->
        <div class="left-panel">
          <!-- Navigation Button: Previous Item -->
          <div class="nav-area nav-area-left">
            <v-btn
              icon
              size="x-large"
              variant="tonal"
              color="primary"
              :disabled="!canGoToPrevItem"
              class="item-nav-btn"
              @click="handlePrevItem"
            >
              <v-icon size="32">mdi-arrow-left</v-icon>
            </v-btn>
          </div>

          <!-- Item Content -->
          <div class="item-content">
            <div v-if="currentItem" class="item-info-section">
              <!-- Item Header -->
              <div class="item-header">
                <v-icon color="primary" size="24" class="mr-2">mdi-package-variant</v-icon>
                <div class="item-name">{{ currentItem.itemName }}</div>
              </div>

              <!-- Order Info -->
              <div class="order-info">
                <div class="info-row">
                  <span class="info-label">Ordered:</span>
                  <span class="info-value">
                    {{ formatQuantity(currentItem.orderedQuantity) }} {{ currentItem.orderedUnit }}
                  </span>
                </div>
                <div v-if="currentItem.packageName" class="info-row">
                  <span class="info-label">Package:</span>
                  <span class="info-value">
                    {{ currentItem.packageName }}
                    <span class="text-medium-emphasis">
                      ({{ currentItem.packageSize }} {{ currentItem.orderedUnit }}/pkg)
                    </span>
                  </span>
                </div>
              </div>

              <v-divider class="my-4" />

              <!-- Fields List -->
              <div class="fields-list">
                <div
                  v-for="(field, idx) in currentItem.fields"
                  :key="field.key"
                  class="field-row"
                  :class="{
                    'field-active': idx === currentFieldIndex,
                    'field-confirmed': field.isConfirmed,
                    'field-modified': field.isModified
                  }"
                  @click="goToField(idx)"
                >
                  <div class="field-label">
                    <v-icon
                      v-if="field.isConfirmed"
                      :color="field.isModified ? 'warning' : 'success'"
                      size="16"
                      class="mr-1"
                    >
                      {{ field.isModified ? 'mdi-pencil' : 'mdi-check' }}
                    </v-icon>
                    <span :class="{ 'font-weight-bold': idx === currentFieldIndex }">
                      {{ field.label }}
                    </span>
                  </div>
                  <div
                    class="field-value"
                    :class="{ 'field-value-active': idx === currentFieldIndex }"
                  >
                    <span v-if="field.isCurrency">Rp</span>
                    <span v-if="idx === currentFieldIndex" class="current-value">
                      {{ displayValue }}
                    </span>
                    <span v-else>{{ field.displayValue }}</span>
                    <span v-if="field.suffix" class="text-medium-emphasis ml-1">
                      {{ field.suffix }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Calculated Info -->
              <div v-if="currentItem.packageSize" class="calculated-info">
                <div class="calc-row">
                  <span class="calc-label">= Quantity:</span>
                  <span class="calc-value">
                    {{ formatQuantity(calculatedBaseQuantity) }} {{ currentItem.orderedUnit }}
                  </span>
                </div>
                <div class="calc-row">
                  <span class="calc-label">= Price/unit:</span>
                  <span class="calc-value">
                    Rp {{ formatNumber(calculatedPricePerUnit) }}/{{ currentItem.orderedUnit }}
                  </span>
                </div>
              </div>

              <v-divider class="my-4" />

              <!-- Action Buttons (Left Panel) -->
              <div class="action-buttons">
                <v-btn
                  variant="outlined"
                  color="error"
                  size="large"
                  block
                  prepend-icon="mdi-close-circle"
                  class="mb-3"
                  @click="handleNotReceived"
                >
                  Not Received
                </v-btn>
                <v-btn
                  variant="tonal"
                  color="success"
                  size="large"
                  block
                  prepend-icon="mdi-check-all"
                  @click="handleSkipItem"
                >
                  All Correct - Skip Item
                </v-btn>
              </div>
            </div>

            <!-- Completion State -->
            <div v-else class="completion-state">
              <v-icon size="64" color="success" class="mb-4">mdi-check-circle</v-icon>
              <div class="text-h5 mb-2">Verification Complete!</div>
              <div class="text-body-1 text-medium-emphasis mb-4">
                All {{ progress.totalItems }} items have been verified.
              </div>
              <v-btn color="primary" size="large" @click="handleComplete">Apply Changes</v-btn>
            </div>
          </div>

          <!-- Navigation Button: Next Item -->
          <div class="nav-area nav-area-right">
            <v-btn
              icon
              size="x-large"
              variant="tonal"
              color="primary"
              :disabled="!canGoToNextItem"
              class="item-nav-btn"
              @click="handleNextItem"
            >
              <v-icon size="32">mdi-arrow-right</v-icon>
            </v-btn>
          </div>
        </div>

        <!-- RIGHT PANEL: Numeric Keypad -->
        <div class="right-panel">
          <div class="keypad-section">
            <!-- Current Field Display -->
            <div class="keypad-header">
              <div class="keypad-label">{{ currentField?.label || 'Value' }}</div>
              <div class="keypad-display">
                <span v-if="currentField?.isCurrency" class="currency-prefix">Rp</span>
                <span class="display-value">{{ displayValue || '0' }}</span>
                <span v-if="currentField?.suffix" class="value-suffix">
                  {{ currentField.suffix }}
                </span>
              </div>
            </div>

            <!-- Keypad Grid -->
            <div class="keypad-grid">
              <v-btn
                v-for="key in keypadKeys"
                :key="key.value"
                :color="key.color || 'surface-variant'"
                :variant="key.variant || 'flat'"
                size="x-large"
                class="keypad-btn"
                :class="key.class"
                @click="handleKeyPress(key.value)"
              >
                <v-icon v-if="key.icon" :icon="key.icon" size="24" />
                <span v-else class="key-text">{{ key.label }}</span>
              </v-btn>
            </div>

            <!-- Action Buttons (Right Panel) -->
            <div class="keypad-actions">
              <v-btn
                :color="isLastField ? 'primary' : 'success'"
                size="x-large"
                block
                class="confirm-btn"
                @click="isLastField ? handleShowSummary() : handleConfirm()"
              >
                <v-icon start>{{ isLastField ? 'mdi-check-all' : 'mdi-check' }}</v-icon>
                {{ isLastField ? 'Complete' : 'OK - Next Field' }}
              </v-btn>
              <v-btn variant="outlined" size="large" block class="mt-3" @click="handleApply">
                <v-icon start>mdi-calculator</v-icon>
                Recalculate
              </v-btn>
              <v-btn variant="outlined" size="large" block class="mt-2" @click="handleClear">
                <v-icon start>mdi-eraser</v-icon>
                Clear
              </v-btn>
            </div>
          </div>
        </div>
      </div>
    </v-card>

    <!-- Summary Confirmation Dialog -->
    <v-dialog v-model="showSummaryDialog" max-width="450" persistent>
      <v-card>
        <v-card-title class="d-flex align-center bg-primary">
          <v-icon class="mr-2">mdi-clipboard-check</v-icon>
          Receipt Summary
        </v-card-title>

        <v-card-text class="pa-4">
          <div class="summary-stats">
            <div class="stat-row">
              <span class="stat-label">Total Items:</span>
              <span class="stat-value">{{ summaryStats.totalItems }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Modified:</span>
              <span class="stat-value" :class="{ 'text-warning': summaryStats.modifiedItems > 0 }">
                {{ summaryStats.modifiedItems }}
              </span>
            </div>
            <div v-if="summaryStats.notReceivedItems > 0" class="stat-row">
              <span class="stat-label">Not Received:</span>
              <span class="stat-value text-error">{{ summaryStats.notReceivedItems }}</span>
            </div>

            <v-divider class="my-4" />

            <div class="stat-row total-row">
              <span class="stat-label">Receipt Total:</span>
              <span class="stat-value text-h5 font-weight-bold">
                Rp {{ formatNumber(summaryStats.grandTotal) }}
              </span>
            </div>

            <div v-if="summaryStats.totalDifference !== 0" class="stat-row">
              <span class="stat-label">Difference:</span>
              <span
                class="stat-value"
                :class="summaryStats.totalDifference > 0 ? 'text-success' : 'text-error'"
              >
                {{ summaryStats.totalDifference > 0 ? '+' : '' }}Rp
                {{ formatNumber(summaryStats.totalDifference) }}
              </span>
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="pa-4 pt-0">
          <v-btn variant="outlined" @click="showSummaryDialog = false">Back to Edit</v-btn>
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="handleConfirmComplete">
            <v-icon start>mdi-check</v-icon>
            Confirm & Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, toRef } from 'vue'
import {
  useQuickVerifyMode,
  type ReceiptItemInput,
  type ReceiptItemOutput
} from '@/composables/useQuickVerifyMode'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
  items: ReceiptItemInput[]
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'complete', items: ReceiptItemOutput[]): void
  (e: 'exit'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// =============================================
// COMPOSABLE
// =============================================

const itemsRef = toRef(props, 'items')
const {
  items: verifyItems,
  inputBuffer,
  currentItem,
  currentField,
  currentFieldIndex,
  progress,
  displayValue,
  calculatedBaseQuantity,
  calculatedPricePerUnit,
  start,
  exit,
  nextField,
  skipItem,
  markNotReceived,
  goToItem,
  goToField: composableGoToField,
  handleKeyPress: composableKeyPress,
  confirmCurrentField,
  getModifiedItems
} = useQuickVerifyMode(itemsRef)

// =============================================
// LOCAL STATE
// =============================================

const showSummaryDialog = ref(false)

// Current item index for navigation
const currentItemIndex = computed(() => {
  return progress.value.currentItem - 1
})

// Check if we're on the last field of the last item
const isLastField = computed(() => {
  const isLastItem = currentItemIndex.value === verifyItems.value.length - 1
  const isLastFieldInItem = currentFieldIndex.value === (currentItem.value?.fields.length ?? 0) - 1
  return isLastItem && isLastFieldInItem
})

// Summary statistics for the confirmation dialog
const summaryStats = computed(() => {
  let grandTotal = 0
  let originalTotal = 0
  let modifiedItems = 0
  let notReceivedItems = 0

  verifyItems.value.forEach(item => {
    const totalField = item.fields.find(f => f.key === 'lineTotal')
    if (totalField) {
      grandTotal += totalField.value
      originalTotal += totalField.originalValue
    }

    if (item.isNotReceived) {
      notReceivedItems++
    } else if (item.fields.some(f => f.isModified)) {
      modifiedItems++
    }
  })

  return {
    totalItems: verifyItems.value.length,
    modifiedItems,
    notReceivedItems,
    grandTotal,
    originalTotal,
    totalDifference: grandTotal - originalTotal
  }
})

// Navigation checks
const canGoToPrevItem = computed(() => {
  return currentItemIndex.value > 0
})

const canGoToNextItem = computed(() => {
  return currentItemIndex.value < verifyItems.value.length - 1
})

// Keypad configuration
const keypadKeys = computed(() => [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7' },
  { value: '8', label: '8' },
  { value: '9', label: '9' },
  {
    value: '.',
    label: '.',
    color: currentField.value?.allowDecimal ? 'surface-variant' : 'grey-lighten-2',
    class: { disabled: !currentField.value?.allowDecimal }
  },
  { value: '0', label: '0' },
  { value: 'backspace', icon: 'mdi-backspace', color: 'warning' }
])

// =============================================
// WATCHERS
// =============================================

watch(
  () => props.modelValue,
  newValue => {
    if (newValue && props.items.length > 0) {
      start()
    }
  },
  { immediate: true }
)

// =============================================
// METHODS
// =============================================

function handleKeyPress(key: string): void {
  if (key === '.' && !currentField.value?.allowDecimal) return
  composableKeyPress(key)
}

function handleApply(): void {
  // Apply current value and trigger recalculation, but stay on current field
  confirmCurrentField()
}

function handleConfirm(): void {
  nextField()
}

function handleShowSummary(): void {
  // Apply any pending input first
  if (inputBuffer.value !== '') {
    confirmCurrentField()
  }
  showSummaryDialog.value = true
}

function handleConfirmComplete(): void {
  showSummaryDialog.value = false
  handleComplete()
}

function handleClear(): void {
  composableKeyPress('clear')
}

function handleSkipItem(): void {
  skipItem()
}

function handleNotReceived(): void {
  markNotReceived()
}

function handlePrevItem(): void {
  if (canGoToPrevItem.value) {
    goToItem(currentItemIndex.value - 1)
  }
}

function handleNextItem(): void {
  if (canGoToNextItem.value) {
    // Skip current item (confirm all fields) and go to next
    skipItem()
  }
}

function goToField(index: number): void {
  composableGoToField(index)
}

function handleExit(): void {
  // Save any pending input before exit
  if (inputBuffer.value !== '') {
    confirmCurrentField()
  }

  // Return only modified items on exit (partial completion)
  const modifiedItems = getModifiedItems()

  if (modifiedItems.length > 0) {
    emit('complete', modifiedItems)
  }

  exit()
  emit('update:modelValue', false)
  emit('exit')
}

function handleComplete(): void {
  const modifiedItems = getModifiedItems()
  emit('complete', modifiedItems)
  emit('update:modelValue', false)
}

// =============================================
// FORMATTERS
// =============================================

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}
</script>

<style scoped lang="scss">
.quick-verify-container {
  display: flex;
  flex-direction: column;
  height: 100vh; // fallback for older browsers
  height: 100dvh; // dynamic viewport height (accounts for browser UI)
  background: rgb(var(--v-theme-background));
  // Safe area padding for notches, status bars, navigation bars
  padding-top: var(--safe-area-inset-top);
  padding-bottom: var(--safe-area-inset-bottom);
  padding-left: var(--safe-area-inset-left);
  padding-right: var(--safe-area-inset-right);
  box-sizing: border-box;
}

.progress-badge {
  display: flex;
  align-items: center;
}

.split-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  align-items: stretch;
}

// =============================================
// LEFT PANEL (contains nav + content + nav)
// =============================================

.left-panel {
  flex: 1;
  display: flex;
  align-items: center;
  overflow: hidden;
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12);
}

// =============================================
// NAVIGATION AREAS
// =============================================

.nav-area {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  min-width: 80px;
  flex-shrink: 0;
  padding: 0 12px;
}

.nav-area-left {
  justify-content: flex-end;
}

.nav-area-right {
  justify-content: flex-start;
}

.item-nav-btn {
  width: 56px;
  height: 56px;
}

// =============================================
// ITEM CONTENT (center section)
// =============================================

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow-y: auto;
  max-height: 100%;
}

.item-info-section {
  width: 100%;
  max-width: 500px;
}

.item-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.item-name {
  font-size: 1.5rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.order-info {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
  padding: 12px 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.info-label {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.info-value {
  font-weight: 500;
}

// =============================================
// FIELDS LIST
// =============================================

.fields-list {
  margin-top: 16px;
}

.field-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  margin-bottom: 8px;
  border-radius: 12px;
  border: 2px solid transparent;
  background: rgba(var(--v-theme-surface-variant), 0.2);
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(var(--v-theme-surface-variant), 0.4);
  }

  &.field-active {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.1);
  }

  &.field-confirmed {
    background: rgba(var(--v-theme-success), 0.1);
  }

  &.field-modified {
    background: rgba(var(--v-theme-warning), 0.1);
  }
}

.field-label {
  display: flex;
  align-items: center;
  font-size: 1rem;
  color: rgba(var(--v-theme-on-surface), 0.8);
}

.field-value {
  font-size: 1.25rem;
  font-weight: 600;

  &.field-value-active {
    color: rgb(var(--v-theme-primary));
  }
}

.current-value {
  padding: 4px 12px;
  background: rgba(var(--v-theme-primary), 0.15);
  border-radius: 8px;
  min-width: 80px;
  display: inline-block;
  text-align: right;
}

// =============================================
// CALCULATED INFO
// =============================================

.calculated-info {
  margin-top: 16px;
  padding: 12px 16px;
  background: rgba(var(--v-theme-info), 0.1);
  border-radius: 8px;
  border-left: 4px solid rgb(var(--v-theme-info));
}

.calc-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.calc-label {
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.875rem;
}

.calc-value {
  font-weight: 500;
  color: rgb(var(--v-theme-info));
}

// =============================================
// ACTION BUTTONS
// =============================================

.action-buttons {
  margin-top: 24px;
}

// =============================================
// RIGHT PANEL (KEYPAD)
// =============================================

.right-panel {
  width: 340px;
  min-width: 340px;
  padding: 24px;
  background: rgba(var(--v-theme-surface-variant), 0.1);
  display: flex;
  flex-direction: column;
}

.keypad-section {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.keypad-header {
  text-align: center;
  margin-bottom: 24px;
}

.keypad-label {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.keypad-display {
  font-size: 2.5rem;
  font-weight: 700;
  padding: 16px;
  background: rgb(var(--v-theme-surface));
  border-radius: 12px;
  border: 2px solid rgb(var(--v-theme-primary));
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.currency-prefix {
  font-size: 1.5rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-right: 8px;
}

.value-suffix {
  font-size: 1.25rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-left: 8px;
}

// =============================================
// KEYPAD GRID
// =============================================

.keypad-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 24px;
}

.keypad-btn {
  height: 64px !important;
  font-size: 1.5rem !important;
  font-weight: 600 !important;
  border-radius: 12px !important;

  &.disabled {
    opacity: 0.3;
    pointer-events: none;
  }
}

.key-text {
  font-size: 1.5rem;
  font-weight: 600;
}

// =============================================
// KEYPAD ACTIONS
// =============================================

.keypad-actions {
  margin-top: auto;
}

.confirm-btn {
  height: 56px !important;
  font-size: 1.125rem !important;
  font-weight: 600 !important;
  border-radius: 12px !important;
}

// =============================================
// COMPLETION STATE
// =============================================

.completion-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 500px;
  text-align: center;
}

// =============================================
// SUMMARY DIALOG
// =============================================

.summary-stats {
  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;

    &.total-row {
      padding: 16px 0;
    }
  }

  .stat-label {
    color: rgba(var(--v-theme-on-surface), 0.7);
  }

  .stat-value {
    font-weight: 500;
  }
}

// =============================================
// RESPONSIVE
// =============================================

@media (max-width: 768px) {
  .split-layout {
    flex-direction: column;
  }

  .left-panel {
    flex: 1;
    border-right: none;
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
    max-height: 50vh;
  }

  .nav-area {
    width: 56px;
    min-width: 56px;
    padding: 0 8px;
  }

  .item-content {
    padding: 16px;
  }

  .right-panel {
    width: 100%;
    min-width: unset;
    padding: 16px;
  }

  .keypad-display {
    font-size: 2rem;
    min-height: 60px;
    padding: 12px;
  }

  .keypad-btn {
    height: 56px !important;
  }
}
</style>
