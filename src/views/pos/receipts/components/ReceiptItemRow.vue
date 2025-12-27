<script setup lang="ts">
// src/views/pos/receipts/components/ReceiptItemRow.vue
// Sprint 6: POS Receipt Module - Receipt Item Row with Package Support
// Matches backoffice EditableReceiptItemsWidget.vue functionality

import { computed } from 'vue'
import type { ReceiptFormItem } from '@/stores/pos/receipts'
import { formatIDR } from '@/utils/currency'
import NumericInputField from '@/components/input/NumericInputField.vue'

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

function handlePackagePriceChange(value: number) {
  if (value <= 0) {
    // Reset to ordered price if cleared
    emit('update:packagePrice', props.item.orderItemId, props.item.orderedPrice || 0)
  } else {
    emit('update:packagePrice', props.item.orderItemId, value)
  }
}

// =============================================
// EVENT HANDLERS - LINE TOTAL (Market Rounding)
// =============================================

function handleLineTotalChange(value: number) {
  if (value <= 0) {
    // Clear manual adjustment
    emit('update:lineTotal', props.item.orderItemId, undefined)
  } else {
    emit('update:lineTotal', props.item.orderItemId, value)
  }
}

function clearLineTotalAdjustment() {
  emit('update:lineTotal', props.item.orderItemId, undefined)
}
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
        <NumericInputField
          :model-value="item.receivedPackageQuantity"
          :min="0"
          :max="9999"
          :allow-decimal="false"
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
        <NumericInputField
          :model-value="item.receivedQuantity"
          :min="0"
          :max="99999"
          :allow-decimal="true"
          :decimal-places="2"
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
      <NumericInputField
        :model-value="effectivePackagePrice"
        variant="outlined"
        density="compact"
        hide-details
        prefix="Rp"
        :min="0"
        :max="999999999"
        :format-as-currency="true"
        :disabled="disabled"
        :class="{ 'price-changed': priceDiff }"
        class="price-input"
        @update:model-value="handlePackagePriceChange"
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
      <NumericInputField
        :model-value="item.actualTotal || 0"
        variant="outlined"
        density="compact"
        hide-details
        prefix="Rp"
        :min="0"
        :max="999999999"
        :format-as-currency="true"
        :disabled="disabled"
        :class="{ 'line-total-adjusted': hasLineTotalAdjustment }"
        class="total-input"
        @update:model-value="handleLineTotalChange"
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
  width: 100px;
  min-width: 100px;
}

.price-col {
  width: 150px;
  min-width: 150px;
}

.total-col {
  width: 150px;
  min-width: 150px;
}

.qty-input {
  min-width: 80px;

  :deep(.v-field__input) {
    text-align: right;
    padding-right: 8px;
  }
}

.price-input,
.total-input {
  min-width: 120px;

  :deep(.v-field__input) {
    text-align: right;
    padding-right: 8px;
    min-width: 70px;
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
