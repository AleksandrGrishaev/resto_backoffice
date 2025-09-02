<!-- src/views/storage/components/writeoff/ProductSelectorWidget.vue -->
<template>
  <div class="product-selector-widget">
    <!-- Search and Filters Bar -->
    <div class="selector-header mb-4">
      <v-row>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="searchTerm"
            label="Search products..."
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-select
            v-model="categoryFilter"
            :items="categoryOptions"
            label="Filter by category"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-select
            v-model="statusFilter"
            :items="statusFilterOptions"
            label="Filter by status"
            variant="outlined"
            density="comfortable"
            hide-details
            clearable
          />
        </v-col>
      </v-row>
    </div>

    <!-- Department Badge -->
    <div class="department-badge mb-3">
      <v-chip
        :color="department === 'kitchen' ? 'success' : 'primary'"
        variant="tonal"
        size="large"
        :prepend-icon="department === 'kitchen' ? 'mdi-silverware-fork-knife' : 'mdi-coffee'"
      >
        {{
          department === 'kitchen'
            ? '🍳 Kitchen Department - Raw Materials Only'
            : '🍺 Bar Department - Beverages Only'
        }}
      </v-chip>
    </div>

    <!-- Quick Filter Chips -->
    <div class="quick-filters mb-4">
      <v-chip-group>
        <v-chip
          :color="quickFilter === 'all' ? 'primary' : 'default'"
          :variant="quickFilter === 'all' ? 'flat' : 'outlined'"
          @click="quickFilter = 'all'"
        >
          All ({{ filteredProducts.length }})
        </v-chip>
        <v-chip
          :color="quickFilter === 'expired' ? 'error' : 'default'"
          :variant="quickFilter === 'expired' ? 'flat' : 'outlined'"
          @click="quickFilter = 'expired'"
        >
          Expired ({{ expiredProducts.length }})
        </v-chip>
        <v-chip
          :color="quickFilter === 'expiring' ? 'warning' : 'default'"
          :variant="quickFilter === 'expiring' ? 'flat' : 'outlined'"
          @click="quickFilter = 'expiring'"
        >
          Expiring ({{ expiringProducts.length }})
        </v-chip>
        <v-chip
          :color="quickFilter === 'low_stock' ? 'info' : 'default'"
          :variant="quickFilter === 'low_stock' ? 'flat' : 'outlined'"
          @click="quickFilter = 'low_stock'"
        >
          Low Stock ({{ lowStockProducts.length }})
        </v-chip>
      </v-chip-group>
    </div>

    <!-- Bulk Actions for Expired -->
    <div v-if="expiredProducts.length > 0" class="bulk-actions mb-4">
      <v-alert type="error" variant="tonal">
        <template #prepend>
          <v-icon icon="mdi-alert-circle" />
        </template>
        <div class="d-flex align-center justify-space-between">
          <div>
            <strong>{{ expiredProducts.length }} expired products found</strong>
            <div class="text-body-2">Quick action to write off all expired items</div>
          </div>
          <v-btn
            color="error"
            variant="flat"
            prepend-icon="mdi-delete-sweep"
            @click="writeOffAllExpired"
          >
            Write Off All Expired
          </v-btn>
        </div>
      </v-alert>
    </div>

    <!-- Debug Info (только в dev mode) -->
    <v-alert
      v-if="showDebugInfo"
      type="info"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="showDebugInfo = false"
    >
      <v-alert-title>Debug Info</v-alert-title>
      <div class="text-body-2">
        <strong>Available for {{ department }}:</strong>
        {{ availableProducts.length }} products
        <br />
        <strong>Product Balances:</strong>
        {{ productBalances.length }} balances
        <br />
        <strong>After Filters:</strong>
        {{ displayedProducts.length }} products
        <br />
        <strong>Store State:</strong>
        {{ storageStore?.state?.value ? 'Initialized' : 'Not initialized' }}
      </div>
      <template #append>
        <v-btn size="small" variant="outlined" @click="forceRefresh">
          <v-icon icon="mdi-refresh" class="mr-1" />
          Force Refresh
        </v-btn>
      </template>
    </v-alert>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" class="mb-2" />
      <div class="text-body-1">Loading {{ department }} products...</div>
      <div class="text-body-2 text-medium-emphasis">{{ loadingMessage }}</div>
    </div>

    <!-- Error State -->
    <v-alert v-else-if="storageStore?.state?.value?.error" type="error" class="mb-4">
      {{ storageStore.state.value.error }}
      <template #append>
        <v-btn variant="text" size="small" @click="forceRefresh">Retry</v-btn>
      </template>
    </v-alert>

    <!-- Products List -->
    <div v-else class="products-list">
      <div v-if="displayedProducts.length === 0" class="text-center py-8">
        <v-icon icon="mdi-package-variant" size="48" class="text-medium-emphasis mb-2" />
        <div class="text-h6 text-medium-emphasis">No products found</div>
        <div class="text-body-2 text-medium-emphasis">{{ getEmptyStateMessage() }}</div>
        <div class="mt-4 d-flex gap-2 justify-center">
          <v-btn v-if="hasFilters" variant="outlined" @click="clearAllFilters">Clear Filters</v-btn>
          <v-btn variant="outlined" color="primary" @click="forceRefresh">
            <v-icon icon="mdi-refresh" class="mr-1" />
            Refresh Data
          </v-btn>
        </div>
      </div>

      <!-- Product Rows -->
      <div v-else class="products-table">
        <v-list class="pa-0">
          <product-list-row
            v-for="product in sortedDisplayedProducts"
            :key="product.id"
            :product="product"
            :department="department"
            :is-selected="isSelected(product.id)"
            @click="handleProductClick(product)"
          />
        </v-list>
      </div>
    </div>

    <!-- Selection Summary -->
    <div v-if="selectedProducts.length > 0 && showSelectionSummary" class="selection-summary mt-4">
      <v-card variant="tonal" color="primary">
        <v-card-title class="pa-3 pb-2">
          <div class="d-flex align-center justify-space-between">
            <span class="text-h6">Selected for Write-off ({{ selectedProducts.length }})</span>
            <v-btn variant="text" prepend-icon="mdi-close" size="small" @click="clearSelection">
              Clear All
            </v-btn>
          </div>
        </v-card-title>

        <v-card-text class="pa-3 pt-0">
          <div class="selected-products-compact">
            <v-list class="pa-0" density="compact">
              <v-list-item
                v-for="(product, index) in selectedProducts"
                :key="product.id"
                class="selected-item px-0 py-1"
                :class="{ 'mb-1': index < selectedProducts.length - 1 }"
              >
                <template #prepend>
                  <v-icon
                    :icon="getProductStatusIcon(product.id)"
                    :color="getProductStatusColor(product.id)"
                    size="16"
                    class="mr-2"
                  />
                </template>

                <v-list-item-title class="text-body-1 font-weight-medium">
                  {{ product.name }}
                </v-list-item-title>

                <v-list-item-subtitle class="text-body-2 text-medium-emphasis">
                  {{ getProductStock(product.id) }} {{ getProductUnit(product.id) }} •
                  {{ formatIDR(getProductValue(product.id)) }}
                  <v-chip
                    v-if="getProductExpiryStatus(product.id)"
                    :color="getProductExpiryColor(product.id)"
                    size="x-small"
                    variant="flat"
                    class="ml-1"
                  >
                    {{ getProductExpiryStatus(product.id) }}
                  </v-chip>
                </v-list-item-subtitle>

                <template #append>
                  <v-btn
                    icon="mdi-close"
                    variant="text"
                    size="x-small"
                    color="error"
                    @click="removeFromSelection(index)"
                  />
                </template>
              </v-list-item>
            </v-list>
          </div>

          <v-divider class="my-2" />
          <div class="d-flex align-center justify-space-between">
            <span class="text-body-1 font-weight-medium">Total Value:</span>
            <span class="text-h6 font-weight-bold">{{ formatIDR(selectedTotalValue) }}</span>
          </div>
        </v-card-text>

        <v-card-actions class="pa-3 pt-0">
          <v-spacer />
          <v-btn
            color="error"
            variant="flat"
            prepend-icon="mdi-delete-sweep"
            @click="writeOffSelected"
          >
            Process Write-off
          </v-btn>
        </v-card-actions>
      </v-card>
    </div>

    <!-- Quantity Input Dialog with proper closing -->
    <write-off-quantity-dialog
      v-model="showQuantityDialog"
      :product="selectedProduct"
      :department="department"
      @confirm="handleQuantityConfirm"
      @cancel="handleQuantityCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useStorageStore } from '@/stores/storage'
import { useProductsStore } from '@/stores/productsStore'
import { formatIDR } from '@/utils/currency'
import { DebugUtils } from '@/utils'
import ProductListRow from './ProductListRow.vue'
import WriteOffQuantityDialog from './WriteOffQuantityDialog.vue'
import type { StorageDepartment } from '@/stores/storage/types'

const MODULE_NAME = 'ProductSelectorWidget'

interface Product {
  id: string
  name: string
  unit: string
  category?: string
  isActive: boolean
}

interface Props {
  department: StorageDepartment
  canSelect?: boolean
  multiSelect?: boolean
  showSelectionSummary?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canSelect: true,
  multiSelect: true,
  showSelectionSummary: true
})

const emit = defineEmits<{
  'selection-changed': [products: Product[]]
  'product-selected': [product: Product]
  'quick-write-off': [product: Product, quantity: number, notes: string]
}>()

// Stores
const storageStore = useStorageStore()
const productsStore = useProductsStore()

// State
const searchTerm = ref('')
const categoryFilter = ref<string>('')
const statusFilter = ref<string>('')
const quickFilter = ref<'all' | 'expired' | 'expiring' | 'low_stock'>('all')
const selectedProducts = ref<Product[]>([])
const showDebugInfo = ref(import.meta.env.DEV)
const isInitialized = ref(false)
const loadingMessage = ref('Initializing...')

// Quantity dialog state
const showQuantityDialog = ref(false)
const selectedProduct = ref<Product | null>(null)

// Options
const statusFilterOptions = [
  { title: 'All Status', value: '' },
  { title: 'Available', value: 'available' },
  { title: 'Expiring Soon', value: 'expiring' },
  { title: 'Expired', value: 'expired' },
  { title: 'Low Stock', value: 'low_stock' }
]

// =============================================
// COMPUTED PROPERTIES - ИСПРАВЛЕНЫ
// =============================================

const availableProducts = computed(() => {
  try {
    if (!productsStore?.products || productsStore.products.length === 0) {
      return []
    }

    let departmentProducts: any[] = []

    if (props.department === 'kitchen') {
      departmentProducts = productsStore.products.filter(
        product =>
          product.isActive &&
          !product.canBeSold &&
          [
            'meat',
            'vegetables',
            'dairy',
            'spices',
            'cereals',
            'fruits',
            'seafood',
            'other'
          ].includes(product.category)
      )
    } else if (props.department === 'bar') {
      departmentProducts = productsStore.products.filter(
        product => product.isActive && product.canBeSold && ['beverages'].includes(product.category)
      )
    }

    return departmentProducts.map(product => ({
      id: product.id,
      name: product.name,
      unit: product.unit,
      category: product.category,
      isActive: product.isActive
    }))
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to compute available products', { error })
    return []
  }
})

const categoryOptions = computed(() => {
  const categories = [...new Set(availableProducts.value.map(p => p.category).filter(Boolean))]
  return [
    { title: 'All Categories', value: '' },
    ...categories.map(cat => ({
      title: cat.charAt(0).toUpperCase() + cat.slice(1),
      value: cat
    }))
  ]
})

// ГЛАВНОЕ ИСПРАВЛЕНИЕ: безопасное получение балансов
const productBalances = computed(() => {
  try {
    if (!storageStore?.initialized || typeof storageStore.departmentBalances !== 'function') {
      return []
    }

    const balances = storageStore.departmentBalances(props.department)
    return Array.isArray(balances) ? balances : []
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to get department balances', { error })
    return []
  }
})

const filteredProducts = computed(() => {
  let products = [...availableProducts.value]

  if (searchTerm.value) {
    const searchLower = searchTerm.value.toLowerCase()
    products = products.filter(product => product.name.toLowerCase().includes(searchLower))
  }

  if (categoryFilter.value) {
    products = products.filter(product => product.category === categoryFilter.value)
  }

  if (statusFilter.value) {
    products = products.filter(product => {
      const balance = productBalances.value?.find(b => b?.itemId === product.id)
      if (!balance) return statusFilter.value === 'available' ? false : true

      switch (statusFilter.value) {
        case 'available':
          return balance.totalQuantity > 0 && !balance.hasExpired && !balance.hasNearExpiry
        case 'expiring':
          return balance.hasNearExpiry
        case 'expired':
          return balance.hasExpired
        case 'low_stock':
          return balance.belowMinStock
        default:
          return true
      }
    })
  }

  return products
})

const displayedProducts = computed(() => {
  let products = [...filteredProducts.value]

  switch (quickFilter.value) {
    case 'expired':
      products = products.filter(product => {
        const balance = productBalances.value?.find(b => b?.itemId === product.id)
        return balance?.hasExpired || false
      })
      break
    case 'expiring':
      products = products.filter(product => {
        const balance = productBalances.value?.find(b => b?.itemId === product.id)
        return balance?.hasNearExpiry || false
      })
      break
    case 'low_stock':
      products = products.filter(product => {
        const balance = productBalances.value?.find(b => b?.itemId === product.id)
        return balance?.belowMinStock || false
      })
      break
    default:
      break
  }

  return products
})

const sortedDisplayedProducts = computed(() => {
  return [...displayedProducts.value].sort((a, b) => {
    const balanceA = productBalances.value?.find(bal => bal?.itemId === a.id)
    const balanceB = productBalances.value?.find(bal => bal?.itemId === b.id)

    const getPriority = (product: Product, balance: any) => {
      if (!balance || balance.totalQuantity === 0) return 4
      if (balance.hasExpired) return 1
      if (balance.hasNearExpiry) return 2
      return 3
    }

    const priorityA = getPriority(a, balanceA)
    const priorityB = getPriority(b, balanceB)

    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }

    return a.name.localeCompare(b.name)
  })
})

const expiredProducts = computed(() => {
  return availableProducts.value.filter(product => {
    const balance = productBalances.value?.find(b => b?.itemId === product.id)
    return balance?.hasExpired || false
  })
})

const expiringProducts = computed(() => {
  return availableProducts.value.filter(product => {
    const balance = productBalances.value?.find(b => b?.itemId === product.id)
    return balance?.hasNearExpiry || false
  })
})

const lowStockProducts = computed(() => {
  return availableProducts.value.filter(product => {
    const balance = productBalances.value?.find(b => b?.itemId === product.id)
    return balance?.belowMinStock || false
  })
})

const selectedTotalValue = computed(() => {
  return selectedProducts.value.reduce((sum, product) => {
    const balance = productBalances.value?.find(b => b?.itemId === product.id)
    return sum + (balance?.totalValue || 0)
  }, 0)
})

const hasFilters = computed(() => {
  return (
    searchTerm.value || categoryFilter.value || statusFilter.value || quickFilter.value !== 'all'
  )
})

// ИСПРАВЛЕНИЕ isLoading - безопасная проверка состояния
const isLoading = computed(() => {
  try {
    // ✅ ИСПРАВИТЬ доступ к Pinia store:
    const storeLoading = storageStore?.state?.loading?.balances || false // без .value
    const productsLoading = productsStore?.loading || false
    const notInitialized = !isInitialized.value

    return storeLoading || productsLoading || notInitialized
  } catch (error) {
    DebugUtils.warn(MODULE_NAME, 'Error checking loading state', { error })
    return true
  }
})

// =============================================
// METHODS
// =============================================

function isSelected(productId: string): boolean {
  return selectedProducts.value.some(p => p.id === productId)
}

function handleProductClick(product: Product) {
  selectedProduct.value = product
  showQuantityDialog.value = true
}

function handleQuantityConfirm(product: Product, quantity: number, notes: string) {
  DebugUtils.info(MODULE_NAME, 'Quantity confirmed', {
    productId: product.id,
    quantity,
    notes
  })

  emit('quick-write-off', product, quantity, notes)

  // Add to selection for summary
  if (!isSelected(product.id)) {
    selectedProducts.value.push(product)
    emit('selection-changed', [...selectedProducts.value])
  }

  // Close the quantity dialog
  showQuantityDialog.value = false
  selectedProduct.value = null
}

function handleQuantityCancel() {
  // Close the quantity dialog
  showQuantityDialog.value = false
  selectedProduct.value = null
}

function writeOffAllExpired() {
  DebugUtils.info(MODULE_NAME, 'Writing off all expired products', {
    count: expiredProducts.value.length
  })

  expiredProducts.value.forEach(product => {
    const balance = productBalances.value?.find(b => b?.itemId === product.id)
    const stock = balance?.totalQuantity || 0

    if (stock > 0) {
      emit('quick-write-off', product, stock, 'Bulk write-off: expired products')

      if (!isSelected(product.id)) {
        selectedProducts.value.push(product)
      }
    }
  })

  emit('selection-changed', [...selectedProducts.value])
}

// Helper methods for selection summary - ВСЕ С БЕЗОПАСНЫМИ ПРОВЕРКАМИ
function getProductStock(productId: string): number {
  const balance = productBalances.value?.find(b => b?.itemId === productId)
  return balance?.totalQuantity || 0
}

function getProductUnit(productId: string): string {
  const balance = productBalances.value?.find(b => b?.itemId === productId)
  return balance?.unit || 'kg'
}

function getProductValue(productId: string): number {
  const balance = productBalances.value?.find(b => b?.itemId === productId)
  return balance?.totalValue || 0
}

function removeFromSelection(index: number) {
  const removedProduct = selectedProducts.value[index]
  selectedProducts.value.splice(index, 1)
  emit('selection-changed', [...selectedProducts.value])

  DebugUtils.info(MODULE_NAME, 'Product removed from selection', {
    productId: removedProduct.id,
    productName: removedProduct.name
  })
}

function getProductStatusIcon(productId: string): string {
  const balance = productBalances.value?.find(b => b?.itemId === productId)

  if (!balance || balance.totalQuantity === 0) return 'mdi-package-variant-closed'
  if (balance.hasExpired) return 'mdi-alert-circle'
  if (balance.hasNearExpiry) return 'mdi-clock-alert'
  if (balance.belowMinStock) return 'mdi-package-down'
  return 'mdi-package-variant'
}

function getProductStatusColor(productId: string): string {
  const balance = productBalances.value?.find(b => b?.itemId === productId)

  if (!balance || balance.totalQuantity === 0) return 'grey'
  if (balance.hasExpired) return 'error'
  if (balance.hasNearExpiry) return 'warning'
  if (balance.belowMinStock) return 'info'
  return 'success'
}

function getProductExpiryStatus(productId: string): string | null {
  const balance = productBalances.value?.find(b => b?.itemId === productId)

  if (balance?.hasExpired) return 'Expired'
  if (balance?.hasNearExpiry) return 'Expiring'
  return null
}

function getProductExpiryColor(productId: string): string {
  const balance = productBalances.value?.find(b => b?.itemId === productId)

  if (balance?.hasExpired) return 'error'
  if (balance?.hasNearExpiry) return 'warning'
  return 'success'
}

function clearSelection() {
  selectedProducts.value = []
  emit('selection-changed', [])
}

function writeOffSelected() {
  selectedProducts.value.forEach(product => {
    const balance = productBalances.value?.find(b => b?.itemId === product.id)
    const stock = balance?.totalQuantity || 0
    if (stock > 0) {
      emit('quick-write-off', product, stock, 'Selected for bulk write-off')
    }
  })
  clearSelection()
}

function clearAllFilters() {
  searchTerm.value = ''
  categoryFilter.value = ''
  statusFilter.value = ''
  quickFilter.value = 'all'
}

async function forceRefresh() {
  try {
    loadingMessage.value = 'Refreshing products...'
    await productsStore.loadProducts(true)

    loadingMessage.value = 'Refreshing balances...'
    await storageStore.fetchBalances(props.department)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Force refresh failed', { error })
  }
}

function getEmptyStateMessage(): string {
  if (hasFilters.value) {
    return `Try adjusting your search or filters for ${props.department} products`
  }
  if (isLoading.value) {
    return `Loading ${props.department} products...`
  }
  if (availableProducts.value.length === 0) {
    return `No products available for ${props.department} department`
  }
  return 'No products match your criteria'
}

// =============================================
// LIFECYCLE - ИСПРАВЛЕНА ИНИЦИАЛИЗАЦИЯ
// =============================================

async function initializeForDepartment(department: StorageDepartment) {
  try {
    DebugUtils.info(MODULE_NAME, 'Store state check', {
      hasStorageStore: !!storageStore,
      storeInitialized: storageStore?.initialized,
      storeState: !!storageStore?.state,
      storeBalances: storageStore?.state?.balances?.length || 0
    })

    // ✅ Store уже инициализирован глобально
    if (!storageStore || !storageStore.initialized) {
      DebugUtils.warn(MODULE_NAME, 'Storage store not ready', {
        hasStore: !!storageStore,
        initialized: storageStore?.initialized,
        department
      })
      return
    }

    // ✅ Только ожидаем готовности данных, не перезагружаем
    await nextTick()

    isInitialized.value = true

    DebugUtils.info(MODULE_NAME, 'ProductSelector ready', {
      department,
      availableProducts: availableProducts.value.length,
      productBalances: productBalances.value.length
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to prepare ProductSelector', { error, department })
  }
}
watch(
  () => props.department,
  async (newDepartment, oldDepartment) => {
    if (newDepartment === oldDepartment) return

    clearSelection()
    clearAllFilters()
    isInitialized.value = false
    await initializeForDepartment(newDepartment)
  }
)

onMounted(async () => {
  // Исправляем потенциальную проблему с blockScrollStrategy
  try {
    if (typeof window !== 'undefined' && !window.blockScrollStrategy) {
      window.blockScrollStrategy = {
        block: target => {
          const element = target || document.body
          if (element && element.classList) {
            element.classList.add('v-overlay-scroll-blocked')
          }
        },
        unblock: target => {
          const element = target || document.body
          if (element && element.classList) {
            element.classList.remove('v-overlay-scroll-blocked')
          }
        }
      }
    }
  } catch (error) {
    DebugUtils.warn(MODULE_NAME, 'Could not fix blockScrollStrategy', { error })
  }

  await initializeForDepartment(props.department)
})
</script>

<style lang="scss" scoped>
.product-selector-widget {
  .department-badge {
    display: flex;
    justify-content: center;

    .v-chip {
      font-weight: 600;
      font-size: 0.875rem;
    }
  }

  .quick-filters {
    .v-chip-group {
      gap: 8px;
    }
  }

  .products-list {
    min-height: 200px;
  }

  .selection-summary {
    position: sticky;
    bottom: 0;
    z-index: 10;
  }

  .bulk-actions {
    .v-alert {
      border-radius: 12px;
    }
  }

  .selected-products-compact {
    max-height: 180px;
    overflow-y: auto;

    .selected-item {
      border-radius: 6px;
      transition: background-color 0.2s ease;

      &:hover {
        background-color: rgba(var(--v-theme-on-surface), 0.04);
      }

      &.mb-1 {
        border-bottom: 1px solid rgba(var(--v-theme-outline), 0.1);
      }

      .v-list-item-title {
        font-size: 0.9rem;
        line-height: 1.2;
      }

      .v-list-item-subtitle {
        font-size: 0.8rem;
        line-height: 1.1;
        margin-top: 2px;
      }
    }

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background-color: rgba(var(--v-theme-on-surface), 0.2);
      border-radius: 2px;
    }
  }
}

@media (max-width: 960px) {
  .product-selector-widget {
    .selector-header .v-row {
      gap: 8px;
    }

    .quick-filters .v-chip-group {
      flex-wrap: wrap;
      gap: 4px;
    }

    .selection-summary .d-flex {
      flex-direction: column;
      gap: 12px;

      .d-flex.gap-2 {
        justify-content: center;
      }
    }
  }
}
</style>
