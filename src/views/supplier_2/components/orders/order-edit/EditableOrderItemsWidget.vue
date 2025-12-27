<!-- src/views/supplier_2/components/orders/order-edit/EditableOrderItemsWidget.vue -->
<template>
  <div class="editable-order-items-widget">
    <!-- Header -->
    <div class="d-flex align-center justify-space-between mb-3">
      <div class="text-subtitle-1 font-weight-bold">Order Items ({{ items.length }})</div>

      <div class="d-flex align-center gap-2">
        <v-chip
          v-if="hasChanges"
          size="small"
          color="warning"
          variant="tonal"
          prepend-icon="mdi-pencil"
        >
          Unsaved Changes
        </v-chip>
      </div>
    </div>

    <!-- Items Table -->
    <v-data-table
      :headers="headers"
      :items="items"
      density="compact"
      :items-per-page="-1"
      hide-default-footer
      class="order-items-table"
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
              {{ item.orderedQuantity }} {{ item.unit }}
            </div>
          </div>
        </div>
      </template>

      <!-- Package Column - EDITABLE -->
      <template #[`item.package`]="{ item, index }">
        <div>
          <v-chip
            color="primary"
            size="small"
            variant="tonal"
            class="mb-1"
            :class="{ 'cursor-pointer': canEdit && !isItemReceived(item) }"
            @click="canEdit && !isItemReceived(item) ? openPackageSelector(item, index) : null"
          >
            {{ item.packageName || 'No package' }}
            <v-icon v-if="canEdit && !isItemReceived(item)" end size="14" class="ml-1">
              mdi-pencil
            </v-icon>
          </v-chip>
          <div class="text-caption text-medium-emphasis">
            {{ item.packageQuantity }} × {{ item.packageUnit }}
          </div>
          <div class="text-caption text-medium-emphasis">
            {{ getPackageSize(item) }} {{ item.unit }}/pkg
          </div>
        </div>
      </template>

      <!-- Ordered Quantity Column - READ ONLY -->
      <template #[`item.orderedQuantity`]="{ item }">
        <div class="text-right">
          <div class="text-body-2 font-weight-medium">{{ item.orderedQuantity }}</div>
          <div class="text-caption text-medium-emphasis">{{ item.unit }}</div>
        </div>
      </template>

      <!-- Package Quantity Column - EDITABLE -->
      <template #[`item.packageQuantity`]="{ item }">
        <div class="text-right">
          <NumericInputField
            v-if="canEdit && !isItemReceived(item)"
            :model-value="item.packageQuantity"
            :min="1"
            :max="9999"
            variant="outlined"
            density="compact"
            hide-details
            style="width: 80px"
            @update:model-value="updatePackageQuantity(item, $event)"
          />
          <div v-else class="text-body-2 font-weight-medium">
            {{ item.packageQuantity }}
          </div>
        </div>
      </template>

      <!-- Received Quantity Column -->
      <template #[`item.receivedQuantity`]="{ item }">
        <div class="text-right">
          <div v-if="item.receivedQuantity" class="text-body-2 font-weight-medium">
            {{ item.receivedQuantity }}
          </div>
          <div v-else class="text-caption text-medium-emphasis">-</div>

          <!-- Discrepancy indicator -->
          <div
            v-if="item.receivedQuantity && item.receivedQuantity !== item.orderedQuantity"
            class="text-caption text-warning"
          >
            <v-icon size="12">mdi-alert</v-icon>
            {{ item.receivedQuantity - item.orderedQuantity }}
          </div>
        </div>
      </template>

      <!-- Price per Package Column - EDITABLE -->
      <template #[`item.packagePrice`]="{ item }">
        <div class="text-right">
          <NumericInputField
            v-if="canEdit && !isItemReceived(item)"
            :model-value="item.packagePrice"
            :min="0"
            :max="999999999"
            :format-as-currency="true"
            variant="outlined"
            density="compact"
            hide-details
            style="width: 120px"
            @update:model-value="updatePackagePrice(item, $event)"
          />
          <div v-else>
            <div class="text-body-2 font-weight-medium">
              {{ formatCurrency(item.packagePrice) }}
            </div>
            <div class="text-caption text-medium-emphasis">per package</div>
          </div>
        </div>
      </template>

      <!-- Price per Unit Column -->
      <template #[`item.pricePerUnit`]="{ item }">
        <div class="text-right">
          <div class="text-caption text-medium-emphasis">
            {{ formatCurrency(item.pricePerUnit) }}
          </div>
          <div class="text-caption text-medium-emphasis">per {{ item.unit }}</div>

          <!-- Estimated price indicator -->
          <v-chip
            v-if="item.isEstimatedPrice"
            size="x-small"
            color="warning"
            variant="tonal"
            class="mt-1"
          >
            Est.
          </v-chip>
        </div>
      </template>

      <!-- Total Price Column -->
      <template #[`item.totalPrice`]="{ item }">
        <div class="text-right">
          <div class="text-body-1 font-weight-bold text-success">
            {{ formatCurrency(item.totalPrice) }}
          </div>
        </div>
      </template>

      <!-- Status Column -->
      <template #[`item.status`]="{ item }">
        <v-chip :color="getStatusColor(item.status)" size="small" variant="flat">
          <v-icon v-if="item.status === 'received'" start size="14">mdi-check</v-icon>
          {{ item.status }}
        </v-chip>
      </template>

      <!-- Actions Column -->
      <template #[`item.actions`]="{ item, index }">
        <div class="d-flex justify-center gap-1">
          <v-btn
            v-if="canEdit && !isItemReceived(item)"
            icon="mdi-package-variant"
            size="x-small"
            variant="text"
            color="primary"
            @click="openPackageSelector(item, index)"
          >
            <v-icon>mdi-package-variant</v-icon>
            <v-tooltip activator="parent">Change Package</v-tooltip>
          </v-btn>

          <v-btn
            v-if="canEdit && !isItemReceived(item)"
            icon="mdi-delete"
            size="x-small"
            variant="text"
            color="error"
            @click="$emit('remove-item', index)"
          >
            <v-icon>mdi-delete</v-icon>
            <v-tooltip activator="parent">Remove Item</v-tooltip>
          </v-btn>

          <v-chip v-if="isItemReceived(item)" size="x-small" color="success" variant="tonal">
            Received
          </v-chip>
        </div>
      </template>
    </v-data-table>

    <!-- Order Total -->
    <div class="d-flex justify-end mt-4 pa-3 rounded bg-surface">
      <div class="mr-8">
        <div class="text-caption text-medium-emphasis mb-1">Total Packages:</div>
        <div class="text-h6 font-weight-bold">{{ totalPackages }}</div>
      </div>
      <div>
        <div class="text-caption text-medium-emphasis mb-1">Order Total:</div>
        <div class="text-h6 font-weight-bold text-primary">
          {{ formatCurrency(orderTotal) }}
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
          <PackageSelector
            :product-id="selectedItemForPackageChange.itemId"
            :required-base-quantity="selectedItemForPackageChange.orderedQuantity"
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
import type { OrderItem } from '@/stores/supplier_2/types'
import PackageSelector from '../../shared/package/PackageSelector.vue'
import { DebugUtils } from '@/utils'
// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  items: OrderItem[]
  canEdit: boolean
  receivedItemIds?: string[] // IDs of items that have been received
}

interface Emits {
  (e: 'update:items', items: OrderItem[]): void
  (e: 'item-changed', item: OrderItem, index: number): void
  (e: 'remove-item', index: number): void
}

const props = withDefaults(defineProps<Props>(), {
  canEdit: false,
  receivedItemIds: () => []
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
const selectedItemForPackageChange = ref<OrderItem | null>(null)
const selectedItemIndex = ref(-1)
const originalItemsJson = ref('')

// =============================================
// TABLE CONFIGURATION
// =============================================

const headers = computed(() => {
  const baseHeaders = [
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
      title: 'Base Quantity',
      key: 'orderedQuantity',
      sortable: false,
      width: '120px',
      align: 'end' as const
    },
    {
      title: 'Packages',
      key: 'packageQuantity',
      sortable: false,
      width: '100px',
      align: 'end' as const
    },
    {
      title: 'Received',
      key: 'receivedQuantity',
      sortable: false,
      width: '100px',
      align: 'end' as const
    },
    {
      title: 'Price/Package',
      key: 'packagePrice',
      sortable: false,
      width: '140px',
      align: 'end' as const
    },
    {
      title: 'Price/Unit',
      key: 'pricePerUnit',
      sortable: false,
      width: '120px',
      align: 'end' as const
    },
    {
      title: 'Total',
      key: 'totalPrice',
      sortable: false,
      width: '130px',
      align: 'end' as const
    },
    {
      title: 'Status',
      key: 'status',
      sortable: false,
      width: '100px',
      align: 'center' as const
    }
  ]

  if (props.canEdit) {
    baseHeaders.push({
      title: 'Actions',
      key: 'actions',
      sortable: false,
      width: '100px',
      align: 'center' as const
    })
  }

  return baseHeaders
})

// =============================================
// COMPUTED
// =============================================

const hasChanges = computed(() => {
  return originalItemsJson.value !== JSON.stringify(props.items)
})

const totalPackages = computed(() => {
  return props.items.reduce((sum, item) => sum + (item.packageQuantity || 0), 0)
})

const orderTotal = computed(() => {
  return props.items.reduce((sum, item) => sum + item.totalPrice, 0)
})

// =============================================
// METHODS
// =============================================

function getPackageSize(item: OrderItem): number {
  if (!item.packageQuantity) return 0
  return Math.round((item.orderedQuantity / item.packageQuantity) * 100) / 100
}

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    ordered: 'grey',
    received: 'success',
    cancelled: 'error'
  }
  return colorMap[status] || 'grey'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function isItemReceived(item: OrderItem): boolean {
  return props.receivedItemIds?.includes(item.id) || item.status === 'received'
}

// =============================================
// EDITING METHODS
// =============================================

function updatePackageQuantity(item: OrderItem, value: string | number) {
  const newQuantity = Number(value)
  if (newQuantity < 1) return

  const pkg = productsStore.getPackageById(item.packageId!)
  if (!pkg) return

  // Обновляем количество упаковок
  item.packageQuantity = newQuantity

  // Пересчитываем базовое количество
  item.orderedQuantity = newQuantity * pkg.packageSize

  // Пересчитываем общую стоимость
  const packagePrice = item.packagePrice || pkg.baseCostPerUnit * pkg.packageSize
  item.totalPrice = newQuantity * packagePrice

  emitItemChange(item)
}

function updatePackagePrice(item: OrderItem, value: string | number) {
  const newPrice = Number(value)
  if (newPrice < 0) return

  const pkg = productsStore.getPackageById(item.packageId!)
  if (!pkg) return

  // Обновляем цену за упаковку
  item.packagePrice = newPrice

  // Пересчитываем цену за базовую единицу
  item.pricePerUnit = newPrice / pkg.packageSize

  // Пересчитываем общую стоимость
  item.totalPrice = (item.packageQuantity || 1) * newPrice

  emitItemChange(item)
}

function openPackageSelector(item: OrderItem, index: number) {
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
    DebugUtils.error('EditableOrderItemsWidget', 'Package not found', { packageId: data.packageId })
    return
  }

  // Обновляем все поля товара с новой упаковкой
  item.packageId = pkg.id
  item.packageName = pkg.packageName
  item.packageQuantity = data.packageQuantity
  item.packageUnit = pkg.packageUnit
  item.orderedQuantity = data.resultingBaseQuantity

  // Обновляем цены
  const packagePrice = pkg.packagePrice || pkg.baseCostPerUnit * pkg.packageSize
  item.packagePrice = packagePrice
  item.pricePerUnit = pkg.baseCostPerUnit
  item.totalPrice = data.totalCost

  emitItemChange(item)
  closePackageSelector()
}

function emitItemChange(item: OrderItem) {
  const index = props.items.findIndex(i => i.id === item.id)
  if (index >= 0) {
    emits('item-changed', item, index)
  }
}

// =============================================
// INITIALIZATION
// =============================================

// Store original state for change detection
originalItemsJson.value = JSON.stringify(props.items)
</script>

<style scoped>
.editable-order-items-widget {
  /* Table styling */
  :deep(.order-items-table) {
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
}

.cursor-pointer {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.cursor-pointer:hover {
  transform: scale(1.05);
}

@media (max-width: 768px) {
  .editable-order-items-widget {
    :deep(.v-data-table__td),
    :deep(.v-data-table__th) {
      padding: 6px 8px !important;
      font-size: 0.8rem;
    }
  }
}
</style>
