<!-- src/views/products/components/ProductsList.vue - SAFE VERSION -->
<template>
  <div class="products-list">
    <!-- Empty state -->
    <div v-if="!loading && products.length === 0" class="text-center pa-8">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-package-variant-off</v-icon>
      <h3 class="text-h6 text-medium-emphasis mb-2">No products found</h3>
      <p class="text-body-2 text-medium-emphasis">
        Try changing the search parameters or adding a new product
      </p>
    </div>

    <!-- Products table -->
    <div v-else>
      <v-data-table
        :headers="tableHeaders"
        :items="products"
        :loading="loading"
        item-key="id"
        class="elevation-0"
        :items-per-page="25"
        :search="undefined"
        show-current-page
        hover
      >
        <!-- Product name -->
        <template #[`item.name`]="{ item }">
          <div class="product-name-cell">
            <div class="font-weight-medium">{{ item.name }}</div>
          </div>
        </template>

        <!-- Category -->
        <template #[`item.category`]="{ item }">
          <v-chip :color="getCategoryColor(item.category)" size="small" variant="tonal">
            {{ getCategoryLabel(item.category) }}
          </v-chip>
        </template>

        <!-- ✅ ДОБАВИТЬ: Departments column -->
        <template #[`item.usedInDepartments`]="{ item }">
          <div class="d-flex gap-1">
            <v-chip
              v-for="dept in item.usedInDepartments"
              :key="dept"
              size="small"
              :color="getDepartmentColor(dept)"
              :prepend-icon="getDepartmentIcon(dept)"
              variant="tonal"
            >
              {{ getDepartmentLabel(dept) }}
            </v-chip>
          </div>
        </template>

        <!-- Measurement unit -->
        <template #[`item.unit`]="{ item }">
          <v-chip size="small" variant="outlined">
            {{ formatUnit(item) }}
          </v-chip>
        </template>

        <!-- Cost -->
        <template #[`item.costPerUnit`]="{ item }">
          <div class="text-end">
            <div class="font-weight-medium">{{ formatCurrency(item.costPerUnit) }}</div>
          </div>
        </template>

        <!-- Yield percentage -->
        <template #[`item.yieldPercentage`]="{ item }">
          <div class="text-center">
            <v-chip :color="getYieldColor(item.yieldPercentage)" size="small" variant="tonal">
              {{ item.yieldPercentage }}%
            </v-chip>
          </div>
        </template>

        <!-- Status -->
        <template #[`item.isActive`]="{ item }">
          <v-chip :color="item.isActive ? 'success' : 'error'" size="small" variant="tonal">
            {{ item.isActive ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>

        <!-- Actions -->
        <template #[`item.actions`]="{ item }">
          <div class="d-flex align-center ga-1">
            <v-btn
              icon="mdi-eye"
              size="small"
              variant="text"
              color="info"
              density="comfortable"
              @click="$emit('view-details', item)"
            >
              <v-icon>mdi-eye</v-icon>
              <v-tooltip activator="parent">Details</v-tooltip>
            </v-btn>

            <v-btn
              icon="mdi-pencil"
              size="small"
              variant="text"
              color="primary"
              density="comfortable"
              @click="$emit('edit', item)"
            >
              <v-icon>mdi-pencil</v-icon>
              <v-tooltip activator="parent">Edit</v-tooltip>
            </v-btn>

            <v-btn
              :icon="item.isActive ? 'mdi-pause' : 'mdi-play'"
              size="small"
              variant="text"
              :color="item.isActive ? 'warning' : 'success'"
              density="comfortable"
              :loading="loading"
              @click="$emit('toggle-active', item)"
            >
              <v-icon>{{ item.isActive ? 'mdi-pause' : 'mdi-play' }}</v-icon>
              <v-tooltip activator="parent">
                {{ item.isActive ? 'Deactivate' : 'Activate' }}
              </v-tooltip>
            </v-btn>
          </div>
        </template>
      </v-data-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Product, Department } from '@/stores/productsStore'
import { useProductsStore } from '@/stores/productsStore'
import { getUnitShortName } from '@/types/measurementUnits'

const productsStore = useProductsStore()

// Props
interface Props {
  products: Product[]
  loading?: boolean
}

defineProps<Props>()

// Emits
interface Emits {
  (e: 'edit', product: Product): void
  (e: 'toggle-active', product: Product): void
  (e: 'view-details', product: Product): void
}

defineEmits<Emits>()

// Simplified table headers
const tableHeaders = computed(() => [
  {
    title: 'Name',
    key: 'name',
    align: 'start' as const,
    sortable: true,
    width: '25%'
  },
  {
    title: 'Category',
    key: 'category',
    align: 'center' as const,
    sortable: true,
    width: '15%'
  },
  {
    title: 'Departments',
    key: 'usedInDepartments',
    align: 'start' as const,
    sortable: false,
    width: '15%'
  },
  {
    title: 'Unit',
    key: 'unit',
    align: 'center' as const,
    sortable: true,
    width: '12%'
  },
  {
    title: 'Cost',
    key: 'costPerUnit',
    align: 'end' as const,
    sortable: true,
    width: '15%'
  },
  {
    title: '%',
    key: 'yieldPercentage',
    align: 'center' as const,
    sortable: true,
    width: '10%'
  },
  {
    title: 'Status',
    key: 'isActive',
    align: 'center' as const,
    sortable: true,
    width: '13%'
  },
  {
    title: 'Actions',
    key: 'actions',
    align: 'center' as const,
    sortable: false,
    width: '10%'
  }
])

// ✅ UPDATED: Get category label from store
const getCategoryLabel = (categoryId: string): string => {
  return productsStore.getCategoryName(categoryId)
}

/**
 * ✅ CORRECTED: Safe measurement unit formatting
 */
const formatUnit = (product: Product): string => {
  // Check different possible fields for measurement unit
  const unit = product.unit || (product as any).baseUnit || (product as any).measurementUnit

  if (!unit) {
    // If no measurement unit, return placeholder
    return 'N/A'
  }

  // Use safe getUnitShortName function
  return getUnitShortName(unit)
}

const formatCurrency = (amount: number | undefined | null): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0 IDR'
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// ✅ UPDATED: Get category color from store
const getCategoryColor = (categoryId: string): string => {
  return productsStore.getCategoryColor(categoryId)
}

const getYieldColor = (percentage: number | undefined | null): string => {
  if (typeof percentage !== 'number' || isNaN(percentage)) {
    return 'grey'
  }

  if (percentage >= 90) return 'success'
  if (percentage >= 75) return 'warning'
  return 'error'
}

// Add these functions
const getDepartmentColor = (dept: Department): string => {
  return dept === 'kitchen' ? 'success' : 'primary'
}

const getDepartmentIcon = (dept: Department): string => {
  return dept === 'kitchen' ? 'mdi-silverware-fork-knife' : 'mdi-coffee'
}

const getDepartmentLabel = (dept: Department): string => {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}
</script>

<style scoped>
.products-list {
  min-height: 200px;
}

.product-name-cell {
  min-width: 150px;
}
</style>
