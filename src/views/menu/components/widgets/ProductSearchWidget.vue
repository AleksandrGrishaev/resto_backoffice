<!-- src/views/menu/components/widgets/ProductSearchWidget.vue -->
<template>
  <v-card variant="outlined" class="product-search-widget">
    <v-card-text class="pa-4">
      <!-- Search and Filters -->
      <div class="d-flex gap-3 mb-4">
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
          style="min-width: 200px"
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
      </div>

      <!-- Results Summary -->
      <div class="d-flex align-center justify-space-between mb-3">
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
            <span class="ml-1">Name</span>
          </v-btn>
          <v-btn value="category" size="small">
            <v-icon size="18">mdi-shape</v-icon>
            <span class="ml-1">Category</span>
          </v-btn>
        </v-btn-toggle>
      </div>

      <!-- Product List -->
      <div class="products-list">
        <div
          v-for="product in displayedProducts"
          :key="product.id"
          class="product-item pa-3 mb-2"
          :class="{ selected: selectedProduct?.id === product.id }"
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
                <div class="font-weight-bold text-body-1 mb-1">{{ product.name }}</div>
                <div class="text-caption text-medium-emphasis d-flex align-center gap-2">
                  <v-chip size="x-small" :color="getCategoryColor(product.category)">
                    {{ getCategoryLabel(product.category) }}
                  </v-chip>
                  <span>{{ getDisplayUnit(product.unit) }}</span>
                </div>
              </div>
            </div>

            <!-- Price Info -->
            <div class="text-right ml-4">
              <div class="text-body-2 font-weight-bold">
                {{ formatCurrency(product.costPerUnit) }}/{{ getDisplayUnit(product.unit) }}
              </div>
            </div>

            <!-- Selection Indicator -->
            <v-icon
              v-if="selectedProduct?.id === product.id"
              icon="mdi-check-circle"
              color="primary"
              class="ml-3"
            />
          </div>
        </div>

        <!-- No Results -->
        <div v-if="filteredProducts.length === 0" class="text-center pa-8">
          <v-icon icon="mdi-package-variant-closed" size="64" color="grey-lighten-1" class="mb-3" />
          <div class="text-h6 mb-1">No Products Found</div>
          <div class="text-body-2 text-medium-emphasis">Try adjusting your search or filters</div>
        </div>

        <!-- Load More Trigger -->
        <div v-if="hasMore" v-intersect="onIntersect" class="text-center pa-4">
          <v-progress-circular indeterminate color="primary" size="32" />
        </div>

        <!-- End of Results -->
        <div v-else-if="displayedProducts.length > 0" class="text-center pa-2">
          <div class="text-caption text-medium-emphasis">
            All {{ filteredProducts.length }} products shown
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProductsStore } from '@/stores/productsStore'

interface ProductOption {
  id: string
  name: string
  category: string
  unit: string
  costPerUnit: number
}

interface Props {
  products: ProductOption[]
  itemsPerPage?: number
}

interface Emits {
  (e: 'product-selected', product: ProductOption): void
}

const props = withDefaults(defineProps<Props>(), {
  itemsPerPage: 20
})

const emits = defineEmits<Emits>()

const productsStore = useProductsStore()

// Local State
const searchQuery = ref('')
const selectedCategory = ref<string | null>(null)
const selectedProduct = ref<ProductOption | null>(null)
const sortBy = ref<'name' | 'category'>('name')
const displayCount = ref(props.itemsPerPage)

// Category Options
const categoryOptions = computed(() => {
  const categories = new Map<string, { count: number; category: string }>()

  props.products.forEach(product => {
    const existing = categories.get(product.category)
    if (existing) {
      existing.count++
    } else {
      categories.set(product.category, { count: 1, category: product.category })
    }
  })

  return Array.from(categories.entries()).map(([id, { count, category }]) => ({
    value: id,
    label: getCategoryLabel(id),
    icon: getCategoryIcon(id),
    color: getCategoryColor(id),
    count
  }))
})

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

  // Sort
  result.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'category':
        return getCategoryLabel(a.category).localeCompare(getCategoryLabel(b.category))
      default:
        return 0
    }
  })

  return result
})

// Lazy Loading
const displayedProducts = computed(() => {
  return filteredProducts.value.slice(0, displayCount.value)
})

const hasMore = computed(() => {
  return displayCount.value < filteredProducts.value.length
})

// Reset display count when filters change
watch([searchQuery, selectedCategory], () => {
  displayCount.value = props.itemsPerPage
})

// Methods
function selectProduct(product: ProductOption) {
  selectedProduct.value = product
  emits('product-selected', product)
}

function onIntersect(isIntersecting: boolean) {
  if (isIntersecting && hasMore.value) {
    displayCount.value += props.itemsPerPage
  }
}

function getDisplayUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    piece: 'pcs',
    kg: 'kg',
    liter: 'L',
    gram: 'g',
    ml: 'ml'
  }
  return unitMap[unit] || unit
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
.product-search-widget {
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
  }
}
</style>
