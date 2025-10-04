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

      <!-- Ordered Quantity - READ ONLY -->
      <template #[`item.orderedQuantity`]="{ item }">
        <div class="text-right">
          <div class="text-body-2 text-medium-emphasis">{{ item.orderedQuantity }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.unit }}</div>
        </div>
      </template>

      <!-- Received Packages - EDITABLE -->
      <template #[`item.receivedPackages`]="{ item }">
        <div class="text-right">
          <v-text-field
            v-if="!isCompleted"
            :model-value="getReceivedPackageQuantity(item)"
            type="number"
            min="0"
            step="1"
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

      <!-- Actual Price per Package - EDITABLE -->
      <template #[`item.actualPackagePrice`]="{ item }">
        <div class="text-right">
          <v-text-field
            v-if="!isCompleted"
            :model-value="getActualPackagePrice(item)"
            type="number"
            min="0"
            step="100"
            variant="outlined"
            density="compact"
            hide-details
            style="width: 120px"
            :placeholder="formatCurrency(getOrderedPackagePrice(item))"
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

      <!-- Line Total -->
      <template #[`item.lineTotal`]="{ item }">
        <div class="text-right">
          <div class="text-body-1 font-weight-bold" :class="getLineTotalClass(item)">
            {{ formatCurrency(calculateActualLineTotal(item)) }}
          </div>

          <!-- Show difference from ordered -->
          <div
            v-if="hasLineDiscrepancy(item)"
            class="text-caption mt-1"
            :class="getLineDifferenceClass(item)"
          >
            {{ formatLineDifference(item) }}
          </div>
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
        <div class="text-caption text-medium-emphasis mb-1">Original Total:</div>
        <div class="text-body-1">{{ formatCurrency(originalTotal) }}</div>
      </div>

      <div class="text-right">
        <div class="text-caption text-medium-emphasis mb-1">Actual Total:</div>
        <div class="text-h6 font-weight-bold text-primary">
          {{ formatCurrency(actualTotal) }}
        </div>
      </div>

      <div v-if="hasFinancialImpact" class="text-right">
        <div class="text-caption text-medium-emphasis mb-1">Financial Impact:</div>
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
            allow-quantity-edit
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
import { DebugUtils } from '@/utils'
import type { ReceiptItem } from '@/stores/supplier_2/types'
import PackageSelector from '../../shared/PackageSelector.vue'

const MODULE_NAME = 'EditableReceiptItemsWidget'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  items: ReceiptItem[]
  isCompleted: boolean
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
    title: 'Ordered',
    key: 'orderedQuantity',
    sortable: false,
    width: '100px',
    align: 'end' as const
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
    width: '140px',
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

const originalTotal = computed(() => {
  return props.items.reduce((sum, item) => {
    return sum + item.orderedQuantity * item.orderedPrice
  }, 0)
})

const actualTotal = computed(() => {
  return props.items.reduce((sum, item) => {
    return sum + calculateActualLineTotal(item)
  }, 0)
})

const financialImpact = computed(() => {
  return actualTotal.value - originalTotal.value
})

const hasFinancialImpact = computed(() => {
  return Math.abs(financialImpact.value) > 1000
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

  return Math.ceil(item.orderedQuantity / packageSize)
}

function getReceivedPackageQuantity(item: ReceiptItem): number {
  if (!item.receivedPackageQuantity) {
    // Calculate from received quantity
    const packageSize = getPackageSize(item)
    if (!packageSize) return 0
    return Math.ceil(item.receivedQuantity / packageSize)
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
  if (item.actualPrice !== undefined) {
    return item.actualPrice
  }

  // Calculate from package price
  const packagePrice = getActualPackagePrice(item)
  const packageSize = getPackageSize(item)

  if (!packageSize) return item.orderedPrice

  return packagePrice / packageSize
}

// =============================================
// EDITING METHODS
// =============================================

function updateReceivedPackages(item: ReceiptItem, value: string | number) {
  const newPackageQty = Number(value)
  if (newPackageQty < 0) return

  const packageSize = getPackageSize(item)
  if (!packageSize) return

  // Update item
  item.receivedPackageQuantity = newPackageQty
  item.receivedQuantity = newPackageQty * packageSize

  DebugUtils.info(MODULE_NAME, 'Received packages updated', {
    itemName: item.itemName,
    receivedPackages: newPackageQty,
    receivedQuantity: item.receivedQuantity
  })

  emitItemChange(item)
}

function updateActualPackagePrice(item: ReceiptItem, value: string | number) {
  const newPrice = Number(value)
  if (newPrice < 0) return

  const packageSize = getPackageSize(item)
  if (!packageSize) return

  // Update item
  item.actualPackagePrice = newPrice
  item.actualPrice = newPrice / packageSize

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
  const packagePrice = pkg.packagePrice || pkg.baseCostPerUnit * pkg.packageSize
  item.actualPackagePrice = packagePrice
  item.actualPrice = pkg.baseCostPerUnit

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
  if (!item.actualPrice && !item.actualPackagePrice) return false

  const actualPrice = getActualPricePerUnit(item)
  const diff = Math.abs(actualPrice - item.orderedPrice)
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
  return `${sign}${diff.toFixed(2)}`
}

function getPriceChangePercent(item: ReceiptItem): string {
  const actualPrice = getActualPricePerUnit(item)
  const diff = actualPrice - item.orderedPrice
  const percent = (diff / item.orderedPrice) * 100
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
  return item.orderedQuantity * item.orderedPrice
}

function calculateActualLineTotal(item: ReceiptItem): number {
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
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
