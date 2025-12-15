<!-- src/views/kitchen/request/components/ItemSearchWidget.vue -->
<!-- Copy from supplier_2 for Kitchen Monitor -->
<template>
  <v-card variant="outlined" class="item-search-widget">
    <v-card-text class="pa-4">
      <!-- Search and Filters Header -->
      <div class="d-flex gap-3 mb-4 flex-wrap">
        <!-- Search Field -->
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          placeholder="Search by product name..."
          variant="outlined"
          density="compact"
          hide-details
          clearable
          class="flex-grow-1"
          style="min-width: 200px"
        />

        <!-- Category Filter -->
        <v-select
          v-model="selectedCategory"
          :items="categoryOptions"
          item-title="label"
          item-value="value"
          label="Category"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          prepend-inner-icon="mdi-filter-variant"
          style="min-width: 180px"
        >
          <template #item="{ props, item }">
            <v-list-item v-bind="props">
              <template #prepend>
                <v-icon :color="item.raw.color" size="20">{{ item.raw.icon }}</v-icon>
              </template>
              <v-list-item-title>{{ item.raw.label }}</v-list-item-title>
              <v-list-item-subtitle>{{ item.raw.count }} items</v-list-item-subtitle>
            </v-list-item>
          </template>
        </v-select>

        <!-- Supplier Filter (if provided) -->
        <v-select
          v-if="showSupplierFilter && suppliers.length > 0"
          v-model="selectedSupplier"
          :items="supplierOptions"
          label="Supplier"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          prepend-inner-icon="mdi-truck"
          style="min-width: 180px"
        />

        <!-- Stock Status Filter -->
        <v-select
          v-if="showStockFilter"
          v-model="selectedStockStatus"
          :items="stockStatusOptions"
          label="Stock Status"
          variant="outlined"
          density="compact"
          hide-details
          clearable
          prepend-inner-icon="mdi-package-variant"
          style="min-width: 160px"
        />
      </div>

      <!-- Results Summary -->
      <div class="d-flex align-center justify-space-between mb-3 flex-wrap gap-2">
        <div class="text-body-2 text-medium-emphasis">
          <template v-if="filteredProducts.length === products.length">
            Showing all {{ filteredProducts.length }} products
          </template>
          <template v-else>
            {{ filteredProducts.length }} of {{ products.length }} products
          </template>
        </div>

        <!-- Sort Options -->
        <v-btn-toggle v-model="sortBy" size="small" variant="outlined" divided mandatory>
          <v-btn value="name" size="small">
            <v-icon size="18">mdi-sort-alphabetical-ascending</v-icon>
            <span class="ml-1 d-none d-sm-inline">Name</span>
          </v-btn>
          <v-btn value="stock" size="small">
            <v-icon size="18">mdi-package-variant</v-icon>
            <span class="ml-1 d-none d-sm-inline">Stock</span>
          </v-btn>
          <v-btn value="category" size="small">
            <v-icon size="18">mdi-shape</v-icon>
            <span class="ml-1 d-none d-sm-inline">Category</span>
          </v-btn>
        </v-btn-toggle>
      </div>

      <!-- Product List -->
      <div class="products-list">
        <div
          v-for="product in paginatedProducts"
          :key="product.id"
          class="product-item pa-3 mb-2"
          :class="{
            selected: selectedProduct?.id === product.id,
            'already-added': isProductAlreadyAdded(product.id)
          }"
          @click="selectProduct(product)"
        >
          <div class="d-flex align-center justify-space-between">
            <!-- Product Info -->
            <div class="d-flex align-center flex-grow-1">
              <v-avatar
                :color="getCategoryColor(product.category)"
                variant="tonal"
                size="40"
                class="mr-3"
              >
                <v-icon :icon="getCategoryIcon(product.category)" size="20" />
              </v-avatar>

              <div class="flex-grow-1">
                <div class="d-flex align-center gap-2 mb-1 flex-wrap">
                  <span class="font-weight-bold text-body-1">{{ product.name }}</span>
                  <v-chip
                    v-if="isProductAlreadyAdded(product.id)"
                    size="x-small"
                    color="success"
                    variant="tonal"
                    prepend-icon="mdi-check"
                  >
                    Added
                  </v-chip>
                </div>
                <div class="text-caption text-medium-emphasis d-flex align-center gap-2 flex-wrap">
                  <v-chip size="x-small" :color="getCategoryColor(product.category)">
                    {{ getCategoryLabel(product.category) }}
                  </v-chip>
                  <span>{{ getDisplayUnit(product) }}</span>
                  <span v-if="product.primarySupplierId" class="d-flex align-center">
                    <v-icon size="12" class="mr-1">mdi-truck</v-icon>
                    {{ getSupplierName(product.primarySupplierId) }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Stock & Price Info -->
            <div class="text-right ml-4">
              <div class="text-body-2 font-weight-bold">
                {{ formatCurrency(product.baseCostPerUnit) }}/{{ product.baseUnit }}
              </div>
              <div v-if="showStockInfo" class="text-caption" :class="getStockStatusClass(product)">
                <v-icon size="12" :class="getStockStatusClass(product)">
                  {{ getStockStatusIcon(product) }}
                </v-icon>
                {{ getStockStatus(product) }}
              </div>
            </div>

            <!-- Add Button -->
            <v-btn
              v-if="!isProductAlreadyAdded(product.id)"
              color="success"
              variant="tonal"
              size="small"
              class="ml-3"
              prepend-icon="mdi-plus"
              @click.stop="selectProduct(product)"
            >
              Add
            </v-btn>
            <v-icon v-else icon="mdi-check-circle" color="success" class="ml-3" />
          </div>
        </div>

        <!-- No Results -->
        <div v-if="filteredProducts.length === 0" class="text-center pa-8">
          <v-icon icon="mdi-package-variant-closed" size="64" color="grey-lighten-1" class="mb-3" />
          <div class="text-h6 mb-1">No Products Found</div>
          <div class="text-body-2 text-medium-emphasis">Try adjusting your search or filters</div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="d-flex align-center justify-center mt-4">
        <v-pagination v-model="currentPage" :length="totalPages" :total-visible="5" size="small" />
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import type { Product } from '@/stores/productsStore/types'

interface Props {
  products: Product[]
  existingItemIds?: string[]
  suppliers?: Array<{ id: string; name: string }>
  showSupplierFilter?: boolean
  showStockFilter?: boolean
  showStockInfo?: boolean
  itemsPerPage?: number
}

interface Emits {
  (e: 'product-selected', product: Product): void
  (e: 'add-to-request', product: Product): void
}

const props = withDefaults(defineProps<Props>(), {
  existingItemIds: () => [],
  suppliers: () => [],
  showSupplierFilter: false,
  showStockFilter: true,
  showStockInfo: true,
  itemsPerPage: 10
})

const emits = defineEmits<Emits>()

const productsStore = useProductsStore()

// Local State
const searchQuery = ref('')
const selectedCategory = ref<string | null>(null)
const selectedSupplier = ref<string | null>(null)
const selectedStockStatus = ref<string | null>(null)
const selectedProduct = ref<Product | null>(null)
const sortBy = ref<'name' | 'stock' | 'category'>('name')
const currentPage = ref(1)

// Category Options
const categoryOptions = computed(() => {
  const categories = new Map<string, { count: number; category: any }>()

  props.products.forEach(product => {
    const existing = categories.get(product.category)
    if (existing) {
      existing.count++
    } else {
      categories.set(product.category, { count: 1, category: product.category })
    }
  })

  return Array.from(categories.entries()).map(([id, { count }]) => ({
    value: id,
    label: getCategoryLabel(id),
    icon: getCategoryIcon(id),
    color: getCategoryColor(id),
    count
  }))
})

// Supplier Options
const supplierOptions = computed(() => {
  return [
    { title: 'All Suppliers', value: null },
    ...props.suppliers.map(s => ({ title: s.name, value: s.id }))
  ]
})

// Stock Status Options
const stockStatusOptions = [
  { title: 'All', value: null },
  { title: 'In Stock', value: 'in_stock' },
  { title: 'Low Stock', value: 'low_stock' },
  { title: 'Out of Stock', value: 'out_of_stock' }
]

// Filtered Products
const filteredProducts = computed(() => {
  let result = [...props.products]

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p => p.name.toLowerCase().includes(query))
  }

  // Category filter
  if (selectedCategory.value) {
    result = result.filter(p => p.category === selectedCategory.value)
  }

  // Supplier filter
  if (selectedSupplier.value) {
    result = result.filter(p => p.primarySupplierId === selectedSupplier.value)
  }

  // Stock status filter
  if (selectedStockStatus.value) {
    result = result.filter(p => {
      const status = getStockStatusValue(p)
      return status === selectedStockStatus.value
    })
  }

  // Sort
  result.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'stock': {
        const aStock = (a.minStock || 0) - (a.currentStock || 0)
        const bStock = (b.minStock || 0) - (b.currentStock || 0)
        return bStock - aStock // Descending (most urgent first)
      }
      case 'category':
        return getCategoryLabel(a.category).localeCompare(getCategoryLabel(b.category))
      default:
        return 0
    }
  })

  return result
})

// Pagination
const totalPages = computed(() => Math.ceil(filteredProducts.value.length / props.itemsPerPage))

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * props.itemsPerPage
  const end = start + props.itemsPerPage
  return filteredProducts.value.slice(start, end)
})

// Reset pagination when filters change
watch([searchQuery, selectedCategory, selectedSupplier, selectedStockStatus], () => {
  currentPage.value = 1
})

// Methods
function selectProduct(product: Product) {
  selectedProduct.value = product
  emits('product-selected', product)
}

function isProductAlreadyAdded(productId: string): boolean {
  return props.existingItemIds?.includes(productId) ?? false
}

function getDisplayUnit(product: Product): string {
  const unitMap: Record<string, string> = {
    piece: 'pcs',
    kg: 'kg',
    liter: 'L',
    gram: 'g',
    ml: 'ml'
  }
  return unitMap[product.baseUnit] || product.baseUnit
}

function getCategoryIcon(categoryId: string): string {
  const category = productsStore.categories.find(c => c.id === categoryId)
  return category?.icon || 'mdi-package-variant'
}

function getCategoryColor(categoryId: string): string {
  const category = productsStore.categories.find(c => c.id === categoryId)
  return category?.color || 'grey'
}

function getCategoryLabel(categoryId: string): string {
  return productsStore.getCategoryName(categoryId)
}

function getSupplierName(supplierId: string): string {
  const supplier = props.suppliers.find(s => s.id === supplierId)
  return supplier?.name || 'Unknown'
}

function getStockStatusValue(product: Product): string {
  const current = product.currentStock || 0
  const min = product.minStock || 0

  if (current <= 0) return 'out_of_stock'
  if (current <= min) return 'low_stock'
  return 'in_stock'
}

function getStockStatus(product: Product): string {
  const current = product.currentStock || 0
  const min = product.minStock || 0

  if (current <= 0) return 'Out of stock'
  if (current <= min) return `Low (${current})`
  return `In stock (${current})`
}

function getStockStatusClass(product: Product): string {
  const status = getStockStatusValue(product)
  if (status === 'out_of_stock') return 'text-error'
  if (status === 'low_stock') return 'text-warning'
  return 'text-success'
}

function getStockStatusIcon(product: Product): string {
  const status = getStockStatusValue(product)
  if (status === 'out_of_stock') return 'mdi-alert-circle'
  if (status === 'low_stock') return 'mdi-alert'
  return 'mdi-check-circle'
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

<style scoped lang="scss">
.item-search-widget {
  .products-list {
    max-height: 500px;
    overflow-y: auto;
  }

  .product-item {
    border-radius: 8px;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    background-color: rgb(var(--v-theme-surface));
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border-color: rgb(var(--v-theme-primary));
    }

    &.selected {
      border-color: rgb(var(--v-theme-primary));
      background-color: rgba(var(--v-theme-primary), 0.05);
    }

    &.already-added {
      background-color: rgba(var(--v-theme-success), 0.03);
      border-color: rgba(var(--v-theme-success), 0.2);

      &:hover {
        border-color: rgba(var(--v-theme-success), 0.4);
      }
    }
  }
}

.text-medium-emphasis {
  opacity: 0.7;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}
</style>
