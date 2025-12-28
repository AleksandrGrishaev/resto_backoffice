<!-- src/views/supplier_2/components/receipts/receipt-edit/EditableReceiptItemsWidget.vue -->
<template>
  <div class="editable-receipt-items-widget">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-3">
      <div class="text-subtitle-1 font-weight-bold">Receipt Items ({{ items.length }})</div>

      <div class="d-flex align-center gap-2">
        <v-chip
          v-if="hasDiscrepancies"
          size="small"
          color="warning"
          variant="tonal"
          prepend-icon="mdi-alert-triangle"
        >
          {{ discrepancyCount }} Discrepancies
        </v-chip>

        <v-btn
          v-if="!isCompleted"
          color="info"
          variant="outlined"
          size="small"
          prepend-icon="mdi-auto-fix"
          @click="autoFillFromOrder"
        >
          Auto Fill
        </v-btn>
      </div>
    </div>

    <!-- Items Table -->
    <v-data-table
      :headers="headers"
      :items="items"
      density="compact"
      :items-per-page="-1"
      hide-default-footer
      class="receipt-items-table"
    >
      <!-- Item Name Column -->
      <template #[`item.itemName`]="{ item }">
        <div class="d-flex align-center gap-2">
          <v-avatar color="primary" size="32" variant="tonal">
            <v-icon size="18">mdi-package-variant</v-icon>
          </v-avatar>
          <div>
            <div class="text-body-2 font-weight-medium">{{ item.itemName }}</div>
            <div class="text-caption text-medium-emphasis">
              Ordered: {{ item.orderedQuantity }} {{ item.unit }}
            </div>
          </div>
        </div>
      </template>

      <!-- Package Column - Can change if received different -->
      <template #[`item.package`]="{ item, index }">
        <div>
          <v-chip
            color="primary"
            size="small"
            variant="tonal"
            class="mb-1"
            :class="{ 'cursor-pointer': !isCompleted }"
            @click="!isCompleted ? openPackageSelector(item, index) : null"
          >
            {{ getPackageName(item) }}
            <v-icon v-if="!isCompleted" end size="14" class="ml-1">mdi-pencil</v-icon>
          </v-chip>
          <div class="text-caption text-medium-emphasis">
            {{ getPackageQuantity(item) }} × {{ getPackageUnit(item) }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ getPackageSize(item) }} {{ item.unit }}/pkg
          </div>
        </div>
      </template>

      <!-- Received Packages - EDITABLE -->
      <template #[`item.receivedPackages`]="{ item }">
        <div class="text-right">
          <NumericInputField
            v-if="!isCompleted"
            :model-value="getReceivedPackageQuantity(item)"
            :min="0"
            :max="9999"
            :allow-decimal="true"
            :decimal-places="6"
            variant="outlined"
            density="compact"
            hide-details
            style="width: 80px"
            :class="{ 'qty-discrepancy': hasQuantityDiscrepancy(item) }"
            @update:model-value="updateReceivedPackages(item, $event)"
          />
          <div v-else class="text-body-2 font-weight-medium">
            {{ getReceivedPackageQuantity(item) }}
          </div>
        </div>
      </template>

      <!-- Received Quantity - Calculated from packages -->
      <template #[`item.receivedQuantity`]="{ item }">
        <div class="text-right">
          <div
            class="text-body-2 font-weight-medium"
            :class="{ 'text-warning': hasQuantityDiscrepancy(item) }"
          >
            {{ item.receivedQuantity }}
          </div>
          <div class="text-caption text-medium-emphasis">{{ item.unit }}</div>

          <!-- Discrepancy indicator -->
          <div v-if="hasQuantityDiscrepancy(item)" class="text-caption text-warning mt-1">
            <v-icon size="12">mdi-alert</v-icon>
            {{ getQuantityDifference(item) }}
          </div>
        </div>
      </template>

      <!-- Actual Price per Package - EDITABLE with IDR formatting -->
      <template #[`item.actualPackagePrice`]="{ item }">
        <div class="text-right">
          <NumericInputField
            v-if="!isCompleted"
            :model-value="getActualPackagePrice(item)"
            :min="0"
            :max="999999999"
            :format-as-currency="true"
            variant="outlined"
            density="compact"
            hide-details
            style="width: 150px"
            prefix="Rp"
            :class="{ 'price-discrepancy': hasPriceDiscrepancy(item) }"
            @update:model-value="updateActualPackagePrice(item, $event)"
          />
          <div v-else>
            <div class="text-body-2 font-weight-medium">
              {{ formatCurrency(getActualPackagePrice(item)) }}
            </div>
            <div class="text-caption text-medium-emphasis">per package</div>
          </div>
        </div>
      </template>

      <!-- Price per Unit - Calculated -->
      <template #[`item.actualPrice`]="{ item }">
        <div class="text-right">
          <div
            class="text-caption text-medium-emphasis"
            :class="{ 'text-error': hasPriceDiscrepancy(item) }"
          >
            {{ formatCurrency(getActualPricePerUnit(item)) }}
          </div>
          <div class="text-caption text-medium-emphasis">per {{ item.unit }}</div>

          <!-- Price change indicator -->
          <v-chip
            v-if="hasPriceDiscrepancy(item)"
            size="x-small"
            color="error"
            variant="tonal"
            class="mt-1"
          >
            {{ getPriceChangePercent(item) }}
          </v-chip>
        </div>
      </template>

      <!-- Line Total - EDITABLE for market rounding adjustments -->
      <template #[`item.lineTotal`]="{ item }">
        <div class="text-right">
          <!-- Editable mode -->
          <template v-if="!isCompleted">
            <NumericInputField
              :model-value="calculateActualLineTotal(item)"
              :min="0"
              :max="999999999"
              :format-as-currency="true"
              variant="outlined"
              density="compact"
              hide-details
              style="width: 140px"
              prefix="Rp"
              :class="{ 'line-total-adjusted': hasLineTotalAdjustment(item) }"
              @update:model-value="updateLineTotal(item, $event)"
            />
          </template>

          <!-- Read-only mode -->
          <template v-else>
            <div class="text-body-1 font-weight-bold" :class="getLineTotalClass(item)">
              {{ formatCurrency(calculateActualLineTotal(item)) }}
            </div>
            <div
              v-if="hasLineDiscrepancy(item)"
              class="text-caption mt-1"
              :class="getLineDifferenceClass(item)"
            >
              {{ formatLineDifference(item) }}
            </div>
          </template>
        </div>
      </template>

      <!-- Status Column -->
      <template #[`item.status`]="{ item }">
        <v-chip :color="getItemStatusColor(item)" size="small" variant="flat">
          <v-icon v-if="hasAnyDiscrepancy(item)" start size="14">mdi-alert</v-icon>
          {{ getItemStatusText(item) }}
        </v-chip>
      </template>

      <!-- Notes Column -->
      <template #[`item.notes`]="{ item }">
        <v-text-field
          v-if="!isCompleted"
          :model-value="item.notes"
          placeholder="Notes..."
          variant="outlined"
          density="compact"
          hide-details
          @update:model-value="updateItemNotes(item, $event)"
        />
        <div v-else class="text-body-2">{{ item.notes || '-' }}</div>
      </template>
    </v-data-table>

    <!-- Summary -->
    <div class="d-flex justify-space-between mt-4 pa-3 rounded bg-surface">
      <div>
        <div class="text-caption text-medium-emphasis mb-1">Total Items:</div>
        <div class="text-h6 font-weight-bold">{{ items.length }}</div>
      </div>

      <div class="text-right">
        <div class="text-caption text-medium-emphasis mb-1">Ordered Total:</div>
        <div class="text-body-1">{{ formatCurrency(orderedTotal) }}</div>
      </div>

      <div class="text-right">
        <div class="text-caption text-medium-emphasis mb-1">Actual Total:</div>
        <div class="text-body-1">
          {{ formatCurrency(actualTotal) }}
        </div>
      </div>

      <div v-if="taxAmount && taxAmount > 0" class="text-right">
        <div class="text-caption text-medium-emphasis mb-1">Tax (included):</div>
        <div class="text-body-1 text-info">
          {{ formatCurrency(taxAmount) }}
        </div>
      </div>

      <div v-if="taxAmount && taxAmount > 0" class="text-right">
        <div class="text-caption text-medium-emphasis mb-1">Total with Tax:</div>
        <div class="text-h6 font-weight-bold text-primary">
          {{ formatCurrency(totalWithTax) }}
        </div>
      </div>

      <div v-if="hasFinancialImpact" class="text-right">
        <div class="text-caption text-medium-emphasis mb-1">Adjustment:</div>
        <div
          class="text-h6 font-weight-bold"
          :class="financialImpact >= 0 ? 'text-error' : 'text-success'"
        >
          {{ formatFinancialImpact() }}
        </div>
      </div>
    </div>

    <!-- Package Selector Dialog -->
    <v-dialog v-model="showPackageSelectorDialog" max-width="600px">
      <v-card v-if="selectedItemForPackageChange">
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Change Package for {{ selectedItemForPackageChange.itemName }}</span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="closePackageSelector" />
        </v-card-title>

        <v-card-text class="pa-4">
          <v-alert type="info" variant="tonal" class="mb-4">
            <div class="text-body-2">
              Select the package type you actually received. The quantity will be recalculated
              automatically.
            </div>
          </v-alert>

          <PackageSelector
            :product-id="selectedItemForPackageChange.itemId"
            :required-base-quantity="selectedItemForPackageChange.receivedQuantity"
            :selected-package-id="selectedItemForPackageChange.packageId"
            mode="change"
            @package-selected="handlePackageChange"
          />
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { isUnitDivisible } from '@/types/measurementUnits'
import { DebugUtils } from '@/utils'
import { formatIDR, parseIDR } from '@/utils/currency'
import type { ReceiptItem } from '@/stores/supplier_2/types'
import PackageSelector from '../../shared/package/PackageSelector.vue'

const MODULE_NAME = 'EditableReceiptItemsWidget'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  items: ReceiptItem[]
  isCompleted: boolean
  taxAmount?: number
  taxPercentage?: number
}

interface Emits {
  (e: 'item-changed', item: ReceiptItem, index: number): void
  (e: 'auto-fill'): void
}

const props = withDefaults(defineProps<Props>(), {
  isCompleted: false
})

const emits = defineEmits<Emits>()

// =============================================
// STORES
// =============================================

const productsStore = useProductsStore()

// =============================================
// LOCAL STATE
// =============================================

const showPackageSelectorDialog = ref(false)
const selectedItemForPackageChange = ref<ReceiptItem | null>(null)
const selectedItemIndex = ref(-1)

// Formatted price inputs (for display in text fields with Rp prefix)
const formattedPrices = ref<Map<string, string>>(new Map())

// Formatted line totals (for manual adjustment of market rounding)
const formattedLineTotals = ref<Map<string, string>>(new Map())

// Actual line totals (when user manually adjusts the line total)
const actualLineTotals = ref<Map<string, number>>(new Map())

// =============================================
// TABLE CONFIGURATION
// =============================================

const headers = computed(() => [
  {
    title: 'Item',
    key: 'itemName',
    sortable: false,
    width: '200px'
  },
  {
    title: 'Package',
    key: 'package',
    sortable: false,
    width: '150px'
  },
  {
    title: 'Recv. Pkgs',
    key: 'receivedPackages',
    sortable: false,
    width: '100px',
    align: 'end' as const
  },
  {
    title: 'Received Qty',
    key: 'receivedQuantity',
    sortable: false,
    width: '120px',
    align: 'end' as const
  },
  {
    title: 'Price/Package',
    key: 'actualPackagePrice',
    sortable: false,
    width: '160px',
    align: 'end' as const
  },
  {
    title: 'Price/Unit',
    key: 'actualPrice',
    sortable: false,
    width: '120px',
    align: 'end' as const
  },
  {
    title: 'Line Total',
    key: 'lineTotal',
    sortable: false,
    width: '140px',
    align: 'end' as const
  },
  {
    title: 'Status',
    key: 'status',
    sortable: false,
    width: '120px',
    align: 'center' as const
  },
  {
    title: 'Notes',
    key: 'notes',
    sortable: false,
    width: '200px'
  }
])

// =============================================
// COMPUTED
// =============================================

const hasDiscrepancies = computed(() => {
  return props.items.some(item => hasAnyDiscrepancy(item))
})

const discrepancyCount = computed(() => {
  return props.items.filter(item => hasAnyDiscrepancy(item)).length
})

/**
 * Ordered Total = ordered quantity × ordered base cost
 * What was originally ordered (before any changes)
 */
const orderedTotal = computed(() => {
  return props.items.reduce((sum, item) => {
    return sum + item.orderedQuantity * (item.orderedBaseCost || 0)
  }, 0)
})

/**
 * Expected Total = received quantity × ordered base cost
 * What we WOULD pay for received goods at ORDERED prices (no price change)
 * Shows the cost impact of quantity changes only
 */
const expectedTotal = computed(() => {
  return props.items.reduce((sum, item) => {
    return sum + item.receivedQuantity * (item.orderedBaseCost || 0)
  }, 0)
})

/**
 * Actual Total = sum of actual line totals (with price adjustments)
 */
const actualTotal = computed(() => {
  return props.items.reduce((sum, item) => {
    return sum + calculateActualLineTotal(item)
  }, 0)
})

/**
 * Financial Impact = actual - ordered
 * Positive = we pay MORE than originally ordered (quantity up or price up)
 * Negative = we pay LESS than originally ordered (quantity down or price down)
 */
const financialImpact = computed(() => {
  return actualTotal.value - orderedTotal.value
})

const hasFinancialImpact = computed(() => {
  // Show adjustment even for small amounts (market rounding)
  return Math.abs(financialImpact.value) > 100
})

/**
 * Tax per item (proportional distribution)
 * Tax is INCLUDED in prices, distributed proportionally to item totals
 */
const taxPerItem = computed(() => {
  const taxMap = new Map<string, number>()

  if (!props.taxAmount || props.taxAmount <= 0) {
    return taxMap
  }

  const total = actualTotal.value
  if (total <= 0) {
    return taxMap
  }

  props.items.forEach(item => {
    const lineTotal = calculateActualLineTotal(item)
    const proportion = lineTotal / total
    const itemTax = Math.round(props.taxAmount! * proportion)
    taxMap.set(item.id, itemTax)
  })

  return taxMap
})

/**
 * Get tax amount for a specific item
 */
function getItemTax(item: ReceiptItem): number {
  return taxPerItem.value.get(item.id) || 0
}

/**
 * Total with tax (for display in summary)
 * This is the full amount to pay including VAT
 */
const totalWithTax = computed(() => {
  if (props.taxAmount && props.taxAmount > 0) {
    return actualTotal.value + props.taxAmount
  }
  return actualTotal.value
})

// =============================================
// PACKAGE METHODS
// =============================================

function getPackageName(item: ReceiptItem): string {
  if (!item.packageId) return 'No package'

  const pkg = productsStore.getPackageById(item.packageId)
  return pkg?.packageName || 'Unknown'
}

function getPackageUnit(item: ReceiptItem): string {
  if (!item.packageId) return ''

  const pkg = productsStore.getPackageById(item.packageId)
  return pkg?.packageUnit || ''
}

function getPackageSize(item: ReceiptItem): number {
  if (!item.packageId) return 0

  const pkg = productsStore.getPackageById(item.packageId)
  if (!pkg) return 0

  return pkg.packageSize
}

function getPackageQuantity(item: ReceiptItem): number {
  const packageSize = getPackageSize(item)
  if (!packageSize) return 0

  // Для делимых единиц (gram, kg, ml, liter) - разрешаем дробные упаковки
  // Для неделимых (piece, pack) - округляем вверх
  const rawQty = item.orderedQuantity / packageSize
  return isUnitDivisible(item.unit) ? Math.round(rawQty * 100) / 100 : Math.ceil(rawQty)
}

function getReceivedPackageQuantity(item: ReceiptItem): number {
  if (!item.receivedPackageQuantity) {
    // Calculate from received quantity
    const packageSize = getPackageSize(item)
    if (!packageSize) return 0

    // Для делимых единиц (gram, kg, ml, liter) - разрешаем дробные упаковки
    // Для неделимых (piece, pack) - округляем вверх
    const rawQty = item.receivedQuantity / packageSize
    return isUnitDivisible(item.unit) ? Math.round(rawQty * 100) / 100 : Math.ceil(rawQty)
  }

  return item.receivedPackageQuantity
}

function getOrderedPackagePrice(item: ReceiptItem): number {
  if (!item.packageId) return item.orderedPrice

  const pkg = productsStore.getPackageById(item.packageId)
  if (!pkg) return item.orderedPrice

  return pkg.packagePrice || pkg.baseCostPerUnit * pkg.packageSize
}

function getActualPackagePrice(item: ReceiptItem): number {
  if (item.actualPackagePrice !== undefined) {
    return item.actualPackagePrice
  }

  // Fallback to ordered package price
  return getOrderedPackagePrice(item)
}

function getActualPricePerUnit(item: ReceiptItem): number {
  // ✅ FIXED: Use actualBaseCost which is already per unit
  if (item.actualBaseCost !== undefined && item.actualBaseCost > 0) {
    return item.actualBaseCost
  }

  // Calculate from package price
  const packagePrice = getActualPackagePrice(item)
  const packageSize = getPackageSize(item)

  if (!packageSize) {
    // Fallback to orderedBaseCost (per unit), not orderedPrice (per package)
    return item.orderedBaseCost || 0
  }

  return packagePrice / packageSize
}

// =============================================
// PRICE FORMATTING METHODS
// =============================================

function getFormattedPrice(item: ReceiptItem): string {
  const key = item.id
  if (formattedPrices.value.has(key)) {
    return formattedPrices.value.get(key)!
  }
  return formatPriceForInput(getActualPackagePrice(item))
}

function formatPriceForInput(price: number): string {
  if (!price || price === 0) return ''
  return new Intl.NumberFormat('id-ID').format(price)
}

function updateFormattedPrice(item: ReceiptItem, value: string) {
  formattedPrices.value.set(item.id, value)
}

function validateAndUpdatePrice(item: ReceiptItem) {
  const formattedValue = formattedPrices.value.get(item.id) || ''
  const parsed = parseIDR(`Rp ${formattedValue}`)

  if (parsed > 0) {
    updateActualPackagePrice(item, parsed)
  }

  // Update formatted value to reflect actual stored price
  formattedPrices.value.set(item.id, formatPriceForInput(getActualPackagePrice(item)))
}

function formatCurrency(amount: number): string {
  return formatIDR(amount)
}

// =============================================
// LINE TOTAL EDITING METHODS (for market rounding)
// =============================================

/**
 * Get the formatted line total for display in the input field
 */
function getFormattedLineTotal(item: ReceiptItem): string {
  const key = item.id
  if (formattedLineTotals.value.has(key)) {
    return formattedLineTotals.value.get(key)!
  }
  // If we have a stored actual line total, use that
  if (actualLineTotals.value.has(key)) {
    return formatPriceForInput(actualLineTotals.value.get(key)!)
  }
  // Otherwise calculate from current prices
  return formatPriceForInput(calculateActualLineTotal(item))
}

/**
 * Update the formatted line total as user types
 */
function updateFormattedLineTotal(item: ReceiptItem, value: string) {
  formattedLineTotals.value.set(item.id, value)
}

/**
 * Validate and update line total, recalculating the price per unit
 */
function validateAndUpdateLineTotal(item: ReceiptItem) {
  const formattedValue = formattedLineTotals.value.get(item.id) || ''
  const parsed = parseIDR(`Rp ${formattedValue}`)

  if (parsed > 0 && item.receivedQuantity > 0) {
    // Store the actual line total
    actualLineTotals.value.set(item.id, parsed)

    // ✅ КРИТИЧНО: Рассчитываем цену за базовую единицу (для расчётов)
    // newBaseCost = lineTotal / receivedQuantity (в базовых единицах)
    const newBaseCost = parsed / item.receivedQuantity
    item.actualBaseCost = newBaseCost

    // Also update package price if we have package info
    const packageSize = getPackageSize(item)
    if (packageSize > 0) {
      item.actualPackagePrice = newBaseCost * packageSize
      item.actualPrice = newBaseCost * packageSize // actualPrice = price per package
      // Update the formatted package price too
      formattedPrices.value.set(item.id, formatPriceForInput(item.actualPackagePrice))
    }

    DebugUtils.info(MODULE_NAME, 'Line total adjusted (market rounding)', {
      itemName: item.itemName,
      newLineTotal: parsed,
      expectedLineTotal: calculateExpectedLineTotal(item),
      difference: parsed - calculateExpectedLineTotal(item),
      newBaseCost,
      newPackagePrice: item.actualPackagePrice
    })

    emitItemChange(item)
  }

  // Update formatted value to reflect the stored total
  const storedTotal = actualLineTotals.value.get(item.id)
  if (storedTotal) {
    formattedLineTotals.value.set(item.id, formatPriceForInput(storedTotal))
  } else {
    formattedLineTotals.value.set(item.id, formatPriceForInput(calculateActualLineTotal(item)))
  }
}

/**
 * Calculate the expected line total based on ordered prices
 * ✅ FIXED: Use BaseCost (per unit), not Price (per package)
 * (what the system would calculate without adjustments)
 */
function calculateExpectedLineTotal(item: ReceiptItem): number {
  // Use ordered base cost × received quantity (in base units)
  return item.receivedQuantity * (item.orderedBaseCost || 0)
}

/**
 * Check if the line total has been manually adjusted
 */
function hasLineTotalAdjustment(item: ReceiptItem): boolean {
  const storedTotal = actualLineTotals.value.get(item.id)
  if (!storedTotal) return false

  const expectedTotal = calculateExpectedLineTotal(item)
  return Math.abs(storedTotal - expectedTotal) > 100 // More than Rp 100 difference
}

/**
 * Format the line total adjustment (difference from expected)
 */
function formatLineTotalAdjustment(item: ReceiptItem): string {
  const storedTotal = actualLineTotals.value.get(item.id)
  if (!storedTotal) return ''

  const expectedTotal = calculateExpectedLineTotal(item)
  const diff = storedTotal - expectedTotal
  const sign = diff >= 0 ? '+' : ''
  return `${sign}${formatCurrency(diff)}`
}

// =============================================
// EDITING METHODS
// =============================================

function updateReceivedPackages(item: ReceiptItem, value: number | null) {
  if (value === null || value < 0) return
  const newPackageQty = value

  const packageSize = getPackageSize(item)
  if (!packageSize) return

  // Update item
  item.receivedPackageQuantity = newPackageQty
  item.receivedQuantity = newPackageQty * packageSize

  // ✅ КРИТИЧНО: Пересчитываем Line Total при изменении количества
  // Если установлена цена (actualPackagePrice), пересчитываем total = qty × price
  const actualPkgPrice = item.actualPackagePrice || getOrderedPackagePrice(item)
  if (actualPkgPrice > 0) {
    const newLineTotal = newPackageQty * actualPkgPrice
    actualLineTotals.value.set(item.id, newLineTotal)
    formattedLineTotals.value.set(item.id, formatPriceForInput(newLineTotal))

    DebugUtils.info(MODULE_NAME, 'Line total recalculated on qty change', {
      itemName: item.itemName,
      receivedPackages: newPackageQty,
      packagePrice: actualPkgPrice,
      newLineTotal
    })
  }

  DebugUtils.info(MODULE_NAME, 'Received packages updated', {
    itemName: item.itemName,
    receivedPackages: newPackageQty,
    receivedQuantity: item.receivedQuantity
  })

  emitItemChange(item)
}

/**
 * Update line total directly (for NumericInputField)
 */
function updateLineTotal(item: ReceiptItem, value: number | null) {
  if (value === null || value < 0) return

  // Store the actual line total
  actualLineTotals.value.set(item.id, value)

  // Recalculate base cost from line total
  if (item.receivedQuantity > 0) {
    const newBaseCost = value / item.receivedQuantity
    item.actualBaseCost = newBaseCost

    // Also update package price if we have package info
    const packageSize = getPackageSize(item)
    if (packageSize > 0) {
      item.actualPackagePrice = newBaseCost * packageSize
      item.actualPrice = newBaseCost * packageSize
    }

    DebugUtils.info(MODULE_NAME, 'Line total updated directly', {
      itemName: item.itemName,
      newLineTotal: value,
      newBaseCost,
      newPackagePrice: item.actualPackagePrice
    })

    emitItemChange(item)
  }
}

function updateActualPackagePrice(item: ReceiptItem, value: number | null) {
  if (value === null || value < 0) return
  const newPrice = value

  const packageSize = getPackageSize(item)
  if (!packageSize) return

  // Update item prices
  item.actualPackagePrice = newPrice
  item.actualPrice = newPrice // actualPrice = price per package
  item.actualBaseCost = newPrice / packageSize // ✅ КРИТИЧНО: baseCost = цена за единицу

  // ✅ КРИТИЧНО: Пересчитываем Line Total при изменении цены
  // Line Total = qty × price
  const pkgQty = getReceivedPackageQuantity(item)
  if (pkgQty > 0) {
    const newLineTotal = pkgQty * newPrice
    actualLineTotals.value.set(item.id, newLineTotal)
    formattedLineTotals.value.set(item.id, formatPriceForInput(newLineTotal))

    DebugUtils.info(MODULE_NAME, 'Line total recalculated on price change', {
      itemName: item.itemName,
      packagePrice: newPrice,
      receivedPackages: pkgQty,
      newLineTotal
    })
  }

  DebugUtils.info(MODULE_NAME, 'Actual package price updated', {
    itemName: item.itemName,
    actualPackagePrice: newPrice,
    actualPrice: item.actualPrice
  })

  emitItemChange(item)
}

function updateItemNotes(item: ReceiptItem, notes: string) {
  item.notes = notes
  emitItemChange(item)
}

function openPackageSelector(item: ReceiptItem, index: number) {
  selectedItemForPackageChange.value = item
  selectedItemIndex.value = index
  showPackageSelectorDialog.value = true
}

function closePackageSelector() {
  showPackageSelectorDialog.value = false
  selectedItemForPackageChange.value = null
  selectedItemIndex.value = -1
}

function handlePackageChange(data: {
  packageId: string
  packageQuantity: number
  resultingBaseQuantity: number
  totalCost: number
}) {
  if (selectedItemIndex.value < 0) return

  const item = props.items[selectedItemIndex.value]
  const pkg = productsStore.getPackageById(data.packageId)

  if (!pkg) {
    DebugUtils.error(MODULE_NAME, 'Package not found', { packageId: data.packageId })
    return
  }

  // Update item with new package
  item.packageId = pkg.id
  item.receivedPackageQuantity = data.packageQuantity
  item.receivedQuantity = data.resultingBaseQuantity

  // Update prices
  // ✅ FIXED: actualPrice = price per PACKAGE, actualBaseCost = price per UNIT
  const packagePrice = pkg.packagePrice || pkg.baseCostPerUnit * pkg.packageSize
  item.actualPackagePrice = packagePrice
  item.actualPrice = packagePrice // price per package, not per unit
  item.actualBaseCost = pkg.baseCostPerUnit // price per unit

  DebugUtils.info(MODULE_NAME, 'Package changed', {
    itemName: item.itemName,
    newPackage: pkg.packageName,
    receivedQuantity: item.receivedQuantity
  })

  emitItemChange(item)
  closePackageSelector()
}

function autoFillFromOrder() {
  DebugUtils.info(MODULE_NAME, 'Auto-filling from order')
  emits('auto-fill')
}

function emitItemChange(item: ReceiptItem) {
  const index = props.items.findIndex(i => i.id === item.id)
  if (index >= 0) {
    emits('item-changed', item, index)
  }
}

// =============================================
// DISCREPANCY ANALYSIS
// =============================================

function hasQuantityDiscrepancy(item: ReceiptItem): boolean {
  const diff = Math.abs(item.receivedQuantity - item.orderedQuantity)
  return diff > 0.001
}

function hasPriceDiscrepancy(item: ReceiptItem): boolean {
  if (!item.actualBaseCost && !item.actualPackagePrice) return false

  // ✅ FIXED: Compare BaseCost values (per unit), not Price (per package)
  const actualBaseCost = item.actualBaseCost || getActualPricePerUnit(item)
  const orderedBaseCost = item.orderedBaseCost || 0
  const diff = Math.abs(actualBaseCost - orderedBaseCost)
  return diff > 0.01
}

function hasLineDiscrepancy(item: ReceiptItem): boolean {
  const diff = Math.abs(calculateActualLineTotal(item) - calculateOrderedLineTotal(item))
  return diff > 1000
}

function hasAnyDiscrepancy(item: ReceiptItem): boolean {
  return hasQuantityDiscrepancy(item) || hasPriceDiscrepancy(item)
}

function getQuantityDifference(item: ReceiptItem): string {
  const diff = item.receivedQuantity - item.orderedQuantity
  const sign = diff >= 0 ? '+' : ''
  // Format with up to 6 decimals, remove trailing zeros
  const formatted = diff.toFixed(6).replace(/\.?0+$/, '')
  return `${sign}${formatted}`
}

function getPriceChangePercent(item: ReceiptItem): string {
  // ✅ FIXED: Compare BaseCost values (per unit), not Price (per package)
  const actualBaseCost = item.actualBaseCost || getActualPricePerUnit(item)
  const orderedBaseCost = item.orderedBaseCost || 0
  if (!orderedBaseCost) return '0%'

  const diff = actualBaseCost - orderedBaseCost
  const percent = (diff / orderedBaseCost) * 100
  const sign = percent >= 0 ? '+' : ''
  return `${sign}${percent.toFixed(1)}%`
}

function getItemStatusColor(item: ReceiptItem): string {
  if (!hasAnyDiscrepancy(item)) return 'success'
  if (hasQuantityDiscrepancy(item) && hasPriceDiscrepancy(item)) return 'error'
  if (hasQuantityDiscrepancy(item)) return 'warning'
  return 'info'
}

function getItemStatusText(item: ReceiptItem): string {
  if (!hasAnyDiscrepancy(item)) return 'OK'
  if (hasQuantityDiscrepancy(item) && hasPriceDiscrepancy(item)) return 'Qty & Price'
  if (hasQuantityDiscrepancy(item)) return 'Quantity'
  return 'Price'
}

// =============================================
// CALCULATION METHODS
// =============================================

function calculateOrderedLineTotal(item: ReceiptItem): number {
  // ✅ FIXED: Use BaseCost (per unit), not Price (per package)
  return item.orderedQuantity * (item.orderedBaseCost || 0)
}

function calculateActualLineTotal(item: ReceiptItem): number {
  // If we have a manually set line total (market rounding), use that
  const storedTotal = actualLineTotals.value.get(item.id)
  if (storedTotal !== undefined) {
    return storedTotal
  }
  // Otherwise calculate from price
  const price = getActualPricePerUnit(item)
  return item.receivedQuantity * price
}

function formatLineDifference(item: ReceiptItem): string {
  const diff = calculateActualLineTotal(item) - calculateOrderedLineTotal(item)
  const sign = diff >= 0 ? '+' : ''
  return `${sign}${formatCurrency(Math.abs(diff))}`
}

function getLineTotalClass(item: ReceiptItem): string {
  if (!hasLineDiscrepancy(item)) return 'text-success'

  const diff = calculateActualLineTotal(item) - calculateOrderedLineTotal(item)
  return diff > 0 ? 'text-error' : 'text-success'
}

function getLineDifferenceClass(item: ReceiptItem): string {
  const diff = calculateActualLineTotal(item) - calculateOrderedLineTotal(item)
  return diff >= 0 ? 'text-error' : 'text-success'
}

function formatFinancialImpact(): string {
  const impact = financialImpact.value
  const sign = impact >= 0 ? '+' : ''
  return `${sign}${formatCurrency(Math.abs(impact))}`
}
</script>

<style scoped>
.editable-receipt-items-widget {
  /* Table styling */
  :deep(.receipt-items-table) {
    border: 1px solid rgba(var(--v-border-color), 0.12);
    border-radius: 4px;
  }

  :deep(.v-data-table__thead) {
    background-color: rgba(var(--v-theme-surface-variant), 0.3);
  }

  :deep(.v-data-table__tr:hover) {
    background-color: rgba(var(--v-theme-primary), 0.04) !important;
  }

  /* Compact spacing */
  :deep(.v-data-table__td),
  :deep(.v-data-table__th) {
    padding: 8px 12px !important;
  }

  /* Editable fields */
  :deep(.v-text-field) {
    .v-field__input {
      text-align: right;
      padding-right: 8px;
    }
  }

  /* Price input field styling */
  :deep(.v-field__prefix) {
    padding-right: 4px;
    color: rgba(var(--v-theme-on-surface), 0.6);
  }

  /* Discrepancy highlighting */
  .qty-discrepancy {
    :deep(.v-field) {
      border-left: 3px solid rgb(var(--v-theme-warning));
    }
  }

  .price-discrepancy {
    :deep(.v-field) {
      border-left: 3px solid rgb(var(--v-theme-error));
    }
  }

  /* Line total adjusted (market rounding) */
  .line-total-adjusted {
    :deep(.v-field) {
      border-left: 3px solid rgb(var(--v-theme-info));
      background-color: rgba(var(--v-theme-info), 0.05);
    }
  }
}

.cursor-pointer {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.cursor-pointer:hover {
  transform: scale(1.05);
}

@media (max-width: 768px) {
  .editable-receipt-items-widget {
    :deep(.v-data-table__td),
    :deep(.v-data-table__th) {
      padding: 6px 8px !important;
      font-size: 0.8rem;
    }
  }
}
</style>
