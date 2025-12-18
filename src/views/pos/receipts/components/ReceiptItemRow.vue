<script setup lang="ts">
// src/views/pos/receipts/components/ReceiptItemRow.vue
// Sprint 6: POS Receipt Module - Receipt Item Row with Package Support
// Matches backoffice EditableReceiptItemsWidget.vue functionality

import { computed, ref } from 'vue'
import type { ReceiptFormItem } from '@/stores/pos/receipts'
import { formatIDR, parseIDR } from '@/utils/currency'

interface Props {
  item: ReceiptFormItem
  disabled?: boolean
}

interface Emits {
  (e: 'update:quantity', itemId: string, quantity: number): void
  (e: 'update:packageQuantity', itemId: string, packageQuantity: number): void
  (e: 'update:price', itemId: string, price: number): void
  (e: 'update:packagePrice', itemId: string, packagePrice: number): void
  (e: 'update:lineTotal', itemId: string, lineTotal: number | undefined): void
  (e: 'change-package', itemId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

const emit = defineEmits<Emits>()

// =============================================
// LOCAL STATE FOR FORMATTED INPUTS
// =============================================

const formattedPackagePrice = ref<string>('')
const formattedLineTotal = ref<string>('')

// Track if user is actively editing (focused on input)
const isEditingPackagePrice = ref(false)
const isEditingLineTotal = ref(false)

// =============================================
// COMPUTED PROPERTIES
// =============================================

// Has package info
const hasPackage = computed(() => !!props.item.packageId && !!props.item.packageSize)

// Display effective price (actual if set, otherwise ordered)
const effectivePackagePrice = computed(() => {
  return props.item.actualPrice ?? props.item.orderedPrice
})

const effectiveBaseCost = computed(() => {
  return props.item.actualBaseCost ?? props.item.orderedBaseCost
})

// Discrepancy color based on type
const discrepancyColor = computed(() => {
  if (!props.item.hasDiscrepancy) return 'success'
  if (props.item.discrepancyType === 'both') return 'error'
  return 'warning'
})

// Discrepancy icon
const discrepancyIcon = computed(() => {
  if (!props.item.hasDiscrepancy) return 'mdi-check-circle'
  if (props.item.discrepancyType === 'both') return 'mdi-alert-circle'
  return 'mdi-alert'
})

// Quantity difference text
const quantityDiff = computed(() => {
  const diff = props.item.receivedQuantity - props.item.orderedQuantity
  if (Math.abs(diff) < 0.001) return ''
  return diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)
})

// Package quantity difference
const packageQtyDiff = computed(() => {
  if (!hasPackage.value) return ''
  const ordered = props.item.orderedPackageQuantity ?? 0
  const received = props.item.receivedPackageQuantity ?? 0
  const diff = received - ordered
  if (Math.abs(diff) < 0.001) return ''
  return diff > 0 ? `+${diff}` : `${diff}`
})

// Price difference text
const priceDiff = computed(() => {
  const actualPrice = props.item.actualPrice ?? props.item.orderedPrice
  const diff = actualPrice - props.item.orderedPrice
  if (Math.abs(diff) < 0.01) return ''
  return diff > 0 ? `+${formatIDR(diff)}` : formatIDR(diff)
})

// Has manual line total adjustment
const hasLineTotalAdjustment = computed(() => {
  return props.item.actualLineTotal !== undefined
})

// =============================================
// EVENT HANDLERS - PACKAGE QUANTITY
// =============================================

function handlePackageQuantityChange(value: number | string) {
  const qty = Number(value)
  if (qty < 0) return
  emit('update:packageQuantity', props.item.orderItemId, qty)
}

// =============================================
// EVENT HANDLERS - BASE QUANTITY (for non-package items)
// =============================================

function handleQuantityChange(value: number | string) {
  const qty = Number(value)
  if (qty < 0) return
  emit('update:quantity', props.item.orderItemId, qty)
}

// =============================================
// EVENT HANDLERS - PACKAGE PRICE
// =============================================

function handlePackagePriceFocus() {
  isEditingPackagePrice.value = true
  // Pre-fill with current value (without formatting)
  const currentPrice = props.item.actualPrice ?? props.item.orderedPrice
  if (currentPrice && currentPrice > 0) {
    formattedPackagePrice.value = new Intl.NumberFormat('id-ID').format(currentPrice)
  } else {
    formattedPackagePrice.value = ''
  }
}

function handlePackagePriceInput(value: string) {
  formattedPackagePrice.value = value
}

function handlePackagePriceBlur() {
  isEditingPackagePrice.value = false
  const trimmed = formattedPackagePrice.value.trim()

  // If empty, reset to ordered price (clear manual override)
  if (!trimmed || trimmed === '') {
    emit('update:packagePrice', props.item.orderItemId, props.item.orderedPrice || 0)
    formattedPackagePrice.value = ''
    return
  }

  const parsed = parseIDR(`Rp ${trimmed}`)
  if (parsed > 0) {
    emit('update:packagePrice', props.item.orderItemId, parsed)
  }
  // Reset formatted value
  formattedPackagePrice.value = ''
}

// =============================================
// EVENT HANDLERS - LINE TOTAL (Market Rounding)
// =============================================

function handleLineTotalFocus() {
  isEditingLineTotal.value = true
  // Pre-fill with current value (without formatting)
  if (props.item.actualTotal && props.item.actualTotal > 0) {
    formattedLineTotal.value = new Intl.NumberFormat('id-ID').format(props.item.actualTotal)
  } else {
    formattedLineTotal.value = ''
  }
}

function handleLineTotalInput(value: string) {
  formattedLineTotal.value = value
}

function handleLineTotalBlur() {
  isEditingLineTotal.value = false
  const trimmed = formattedLineTotal.value.trim()

  // If empty, clear manual override and return to calculated value
  if (!trimmed || trimmed === '') {
    emit('update:lineTotal', props.item.orderItemId, undefined)
    formattedLineTotal.value = ''
    return
  }

  const parsed = parseIDR(`Rp ${trimmed}`)
  if (parsed > 0) {
    emit('update:lineTotal', props.item.orderItemId, parsed)
  } else {
    // Clear manual adjustment if invalid/zero
    emit('update:lineTotal', props.item.orderItemId, undefined)
  }
  // Reset formatted value
  formattedLineTotal.value = ''
}

function clearLineTotalAdjustment() {
  emit('update:lineTotal', props.item.orderItemId, undefined)
}

// =============================================
// FORMATTING HELPERS
// =============================================

function formatPriceForInput(price: number): string {
  if (!price || price === 0) return ''
  return new Intl.NumberFormat('id-ID').format(price)
}

// Get display value for package price input
const displayPackagePrice = computed(() => {
  // If user is actively editing, show their input (including empty string)
  if (isEditingPackagePrice.value) {
    return formattedPackagePrice.value
  }
  // Otherwise show formatted current value
  return formatPriceForInput(effectivePackagePrice.value)
})

// Get display value for line total input
const displayLineTotal = computed(() => {
  // If user is actively editing, show their input (including empty string)
  if (isEditingLineTotal.value) {
    return formattedLineTotal.value
  }
  // Otherwise show formatted current value
  return formatPriceForInput(props.item.actualTotal)
})
</script>

<template>
  <tr class="receipt-item-row" :class="{ 'has-discrepancy': item.hasDiscrepancy }">
    <!-- Status Icon -->
    <td class="text-center status-col">
      <v-icon :color="discrepancyColor" size="small">
        {{ discrepancyIcon }}
      </v-icon>
    </td>

    <!-- Product Name & Unit -->
    <td class="product-col">
      <div class="font-weight-medium text-body-2">{{ item.productName }}</div>
      <div class="text-caption text-grey">Ordered: {{ item.orderedQuantity }} {{ item.unit }}</div>
    </td>

    <!-- Package Info (if applicable) -->
    <td v-if="hasPackage" class="package-col">
      <v-chip
        color="primary"
        size="small"
        variant="tonal"
        class="mb-1 cursor-pointer"
        :disabled="disabled"
        @click="!disabled && emit('change-package', item.orderItemId)"
      >
        {{ item.packageName || 'Package' }}
        <v-icon v-if="!disabled" end size="14">mdi-pencil</v-icon>
      </v-chip>
      <div class="text-caption text-medium-emphasis">
        {{ item.packageSize }} {{ item.unit }}/pkg
      </div>
    </td>
    <td v-else class="package-col">
      <div class="text-caption text-grey">No package</div>
    </td>

    <!-- Received Packages / Quantity -->
    <td class="qty-col">
      <!-- Package-based input -->
      <template v-if="hasPackage">
        <v-text-field
          :model-value="item.receivedPackageQuantity"
          type="number"
          min="0"
          step="1"
          variant="outlined"
          density="compact"
          hide-details
          :disabled="disabled"
          :class="{ 'qty-changed': packageQtyDiff }"
          class="qty-input"
          @update:model-value="handlePackageQuantityChange"
        />
        <div class="text-caption text-grey mt-1">= {{ item.receivedQuantity }} {{ item.unit }}</div>
        <div
          v-if="packageQtyDiff"
          class="text-caption mt-1"
          :class="
            (item.receivedPackageQuantity ?? 0) > (item.orderedPackageQuantity ?? 0)
              ? 'text-success'
              : 'text-error'
          "
        >
          {{ packageQtyDiff }} pkg
        </div>
      </template>

      <!-- Base unit input (no package) -->
      <template v-else>
        <v-text-field
          :model-value="item.receivedQuantity"
          type="number"
          min="0"
          step="0.01"
          variant="outlined"
          density="compact"
          hide-details
          :disabled="disabled"
          :class="{ 'qty-changed': quantityDiff }"
          class="qty-input"
          @update:model-value="handleQuantityChange"
        />
        <div class="text-caption text-grey mt-1">{{ item.unit }}</div>
        <div
          v-if="quantityDiff"
          class="text-caption mt-1"
          :class="item.receivedQuantity > item.orderedQuantity ? 'text-success' : 'text-error'"
        >
          {{ quantityDiff }} {{ item.unit }}
        </div>
      </template>
    </td>

    <!-- Price per Package / Unit -->
    <td class="price-col">
      <v-text-field
        :model-value="displayPackagePrice"
        type="text"
        variant="outlined"
        density="compact"
        hide-details
        prefix="Rp"
        :disabled="disabled"
        :placeholder="formatPriceForInput(item.orderedPrice)"
        :class="{ 'price-changed': priceDiff }"
        class="price-input"
        @focus="handlePackagePriceFocus"
        @update:model-value="handlePackagePriceInput"
        @blur="handlePackagePriceBlur"
      />
      <div class="text-caption text-grey mt-1">
        {{ hasPackage ? 'per pkg' : `per ${item.unit}` }}
      </div>
      <div v-if="hasPackage" class="text-caption text-medium-emphasis">
        {{ formatIDR(effectiveBaseCost) }}/{{ item.unit }}
      </div>
      <div
        v-if="priceDiff"
        class="text-caption mt-1"
        :class="
          (item.actualPrice ?? item.orderedPrice) > item.orderedPrice
            ? 'text-error'
            : 'text-success'
        "
      >
        {{ priceDiff }}
      </div>
    </td>

    <!-- Line Total (Editable for market rounding) -->
    <td class="total-col">
      <v-text-field
        :model-value="displayLineTotal"
        type="text"
        variant="outlined"
        density="compact"
        hide-details
        prefix="Rp"
        :disabled="disabled"
        :class="{ 'line-total-adjusted': hasLineTotalAdjustment }"
        class="total-input"
        @focus="handleLineTotalFocus"
        @update:model-value="handleLineTotalInput"
        @blur="handleLineTotalBlur"
      />

      <!-- Show adjustment indicator -->
      <div v-if="hasLineTotalAdjustment" class="d-flex align-center gap-1 mt-1">
        <v-chip size="x-small" color="info" variant="tonal">
          <v-icon size="10" start>mdi-pencil</v-icon>
          adjusted
        </v-chip>
        <v-btn
          icon="mdi-close"
          size="x-small"
          variant="text"
          density="compact"
          :disabled="disabled"
          @click="clearLineTotalAdjustment"
        />
      </div>

      <!-- Show ordered total for comparison -->
      <div v-if="item.hasDiscrepancy" class="text-caption text-grey mt-1">
        was {{ formatIDR(item.orderedTotal) }}
      </div>
    </td>
  </tr>
</template>

<style scoped lang="scss">
.receipt-item-row {
  &.has-discrepancy {
    background: rgba(var(--v-theme-warning), 0.05);
  }

  td {
    padding: 12px 8px;
    vertical-align: top;
  }
}

.cursor-pointer {
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.02);
  }
}

.status-col {
  width: 50px;
}

.product-col {
  min-width: 150px;
}

.package-col {
  width: 120px;
}

.qty-col {
  width: 120px;
}

.price-col {
  width: 140px;
}

.total-col {
  width: 140px;
}

.qty-input,
.price-input,
.total-input {
  :deep(.v-field__input) {
    text-align: right;
    padding-right: 8px;
  }
}

.qty-changed :deep(.v-field) {
  background: rgba(var(--v-theme-warning), 0.1);
  border-left: 3px solid rgb(var(--v-theme-warning));
}

.price-changed :deep(.v-field) {
  background: rgba(var(--v-theme-warning), 0.1);
  border-left: 3px solid rgb(var(--v-theme-error));
}

.line-total-adjusted :deep(.v-field) {
  background: rgba(var(--v-theme-info), 0.1);
  border-left: 3px solid rgb(var(--v-theme-info));
}

/* Compact prefix styling */
:deep(.v-field__prefix) {
  padding-right: 4px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .receipt-item-row td {
    padding: 8px 4px;
    font-size: 0.85rem;
  }

  .product-col {
    min-width: 100px;
  }

  .package-col,
  .qty-col,
  .price-col,
  .total-col {
    width: auto;
  }
}
</style>
