<!-- src/views/counteragents/components/counteragents/CounteragentFilters.vue -->
<template>
  <v-card class="mb-4">
    <v-card-title class="pb-2">
      <v-icon start>mdi-filter</v-icon>
      Filters and Search
      <v-spacer />
      <v-chip v-if="hasActiveFilters" color="primary" size="small" variant="tonal">
        {{ activeFiltersCount }} active
      </v-chip>
    </v-card-title>

    <v-card-text>
      <v-row>
        <!-- Search -->
        <v-col cols="12" md="3">
          <v-text-field
            v-model="localFilters.search"
            label="Search counteragents"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            clearable
            placeholder="Enter name, contact, email..."
            @input="debouncedSearch"
          />
        </v-col>

        <!-- Type -->
        <v-col cols="12" md="2">
          <v-select
            v-model="localFilters.type"
            :items="typeOptions"
            label="Type"
            variant="outlined"
            density="compact"
            @update:model-value="updateTypeFilter"
          >
            <template #prepend-inner>
              <v-icon>mdi-shape</v-icon>
            </template>
          </v-select>
        </v-col>

        <!-- Status -->
        <v-col cols="12" md="2">
          <v-select
            v-model="localFilters.isActive"
            :items="statusOptions"
            label="Status"
            variant="outlined"
            density="compact"
            @update:model-value="updateActiveFilter"
          >
            <template #prepend-inner>
              <v-icon>mdi-check-circle</v-icon>
            </template>
          </v-select>
        </v-col>

        <!-- Preferred Status -->
        <v-col cols="12" md="2">
          <v-select
            v-model="localFilters.isPreferred"
            :items="preferredOptions"
            label="Preferred"
            variant="outlined"
            density="compact"
            @update:model-value="updatePreferredFilter"
          >
            <template #prepend-inner>
              <v-icon>mdi-star</v-icon>
            </template>
          </v-select>
        </v-col>

        <!-- Product Categories -->
        <v-col cols="12" md="2">
          <v-select
            v-model="localFilters.productCategories"
            :items="categoryOptions"
            label="Categories"
            variant="outlined"
            density="compact"
            multiple
            chips
            closable-chips
            @update:model-value="updateCategoryFilter"
          >
            <template #prepend-inner>
              <v-icon>mdi-package-variant</v-icon>
            </template>
            <template #chip="{ props, item }">
              <v-chip v-bind="props" :prepend-icon="getCategoryIcon(item.raw.value)" size="small">
                {{ item.title }}
              </v-chip>
            </template>
          </v-select>
        </v-col>

        <!-- Reset button -->
        <v-col cols="12" md="1" class="d-flex align-center">
          <v-btn
            variant="outlined"
            color="primary"
            block
            :disabled="!hasActiveFilters"
            @click="clearAllFilters"
          >
            <v-icon>mdi-refresh</v-icon>
            <v-tooltip activator="parent">Reset</v-tooltip>
          </v-btn>
        </v-col>
      </v-row>

      <!-- Advanced Filters Toggle -->
      <v-row class="mt-2">
        <v-col>
          <v-btn
            variant="text"
            size="small"
            color="primary"
            @click="showAdvancedFilters = !showAdvancedFilters"
          >
            <v-icon start>
              {{ showAdvancedFilters ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
            </v-icon>
            {{ showAdvancedFilters ? 'Hide' : 'Show' }} advanced filters
          </v-btn>
        </v-col>
      </v-row>

      <!-- Advanced Filters -->
      <v-row v-if="showAdvancedFilters" class="mt-2">
        <v-col cols="12" md="3">
          <v-select
            v-model="localFilters.paymentTerms"
            :items="paymentOptions"
            label="Payment Terms"
            variant="outlined"
            density="compact"
            @update:model-value="updatePaymentFilter"
          >
            <template #prepend-inner>
              <v-icon>mdi-credit-card</v-icon>
            </template>
          </v-select>
        </v-col>

        <!-- Quick Filters as chips -->
        <v-col cols="12" md="9">
          <div class="d-flex align-center flex-wrap ga-2">
            <span class="text-caption text-medium-emphasis">Quick filters:</span>

            <v-chip
              :variant="quickFilter === 'preferred' ? 'flat' : 'outlined'"
              :color="quickFilter === 'preferred' ? 'warning' : 'default'"
              size="small"
              @click="applyQuickFilter('preferred')"
            >
              <v-icon start>mdi-star</v-icon>
              Preferred Only
            </v-chip>

            <v-chip
              :variant="quickFilter === 'suppliers' ? 'flat' : 'outlined'"
              :color="quickFilter === 'suppliers' ? 'primary' : 'default'"
              size="small"
              @click="applyQuickFilter('suppliers')"
            >
              <v-icon start>mdi-truck</v-icon>
              Suppliers Only
            </v-chip>

            <v-chip
              :variant="quickFilter === 'services' ? 'flat' : 'outlined'"
              :color="quickFilter === 'services' ? 'secondary' : 'default'"
              size="small"
              @click="applyQuickFilter('services')"
            >
              <v-icon start>mdi-tools</v-icon>
              Services Only
            </v-chip>

            <v-chip
              :variant="store.viewSettings.showInactive ? 'flat' : 'outlined'"
              :color="store.viewSettings.showInactive ? 'error' : 'default'"
              size="small"
              @click="store.toggleShowInactive()"
            >
              <v-icon start>mdi-eye</v-icon>
              Include Inactive
            </v-chip>
          </div>
        </v-col>
      </v-row>

      <!-- Active Filters Summary -->
      <v-row v-if="activeFiltersSummary.length > 0" class="mt-2">
        <v-col>
          <div class="d-flex align-center flex-wrap ga-2">
            <span class="text-caption text-medium-emphasis">Active filters:</span>

            <v-chip
              v-for="filter in activeFiltersSummary"
              :key="filter.key"
              size="small"
              color="primary"
              variant="outlined"
              closable
              @click:close="removeFilter(filter.key)"
            >
              {{ filter.label }}
            </v-chip>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCounteragentsStore } from '@/stores/counteragents'
import {
  COUNTERAGENT_TYPE_LABELS,
  PRODUCT_CATEGORY_LABELS,
  PAYMENT_TERMS_LABELS
} from '@/stores/counteragents'
import type { CounteragentType, ProductCategory, PaymentTerms } from '@/stores/counteragents'

const store = useCounteragentsStore()

// Local filters state
const localFilters = ref({
  search: store.filters.search,
  type: store.filters.type,
  isActive: store.filters.isActive,
  isPreferred: store.filters.isPreferred,
  productCategories: [...store.filters.productCategories],
  paymentTerms: store.filters.paymentTerms
})

const quickFilter = ref<string>()
const showAdvancedFilters = ref(false)

// Options for dropdowns
const typeOptions = [
  { title: 'All Types', value: 'all' },
  { title: 'Suppliers', value: 'supplier' },
  { title: 'Services', value: 'service' },
  { title: 'Other', value: 'other' }
]

const statusOptions = [
  { title: 'All Status', value: 'all' },
  { title: 'Active Only', value: true },
  { title: 'Inactive Only', value: false }
]

const preferredOptions = [
  { title: 'All', value: 'all' },
  { title: 'Preferred Only', value: true },
  { title: 'Regular Only', value: false }
]

const categoryOptions = Object.entries(PRODUCT_CATEGORY_LABELS).map(([value, title]) => ({
  title,
  value
}))

const paymentOptions = [
  { title: 'All Payment Terms', value: 'all' },
  ...Object.entries(PAYMENT_TERMS_LABELS).map(([value, title]) => ({
    title,
    value
  }))
]

// Computed properties
const hasActiveFilters = computed(() => {
  return (
    localFilters.value.search !== '' ||
    localFilters.value.type !== 'all' ||
    localFilters.value.isActive !== 'all' ||
    localFilters.value.isPreferred !== 'all' ||
    localFilters.value.productCategories.length > 0 ||
    localFilters.value.paymentTerms !== 'all'
  )
})

const activeFiltersCount = computed(() => {
  let count = 0
  if (localFilters.value.search) count++
  if (localFilters.value.type !== 'all') count++
  if (localFilters.value.isActive !== 'all') count++
  if (localFilters.value.isPreferred !== 'all') count++
  if (localFilters.value.productCategories.length > 0) count++
  if (localFilters.value.paymentTerms !== 'all') count++
  return count
})

const activeFiltersSummary = computed(() => {
  const summary = []

  if (localFilters.value.search) {
    summary.push({ key: 'search', label: `Search: "${localFilters.value.search}"` })
  }

  if (localFilters.value.type !== 'all') {
    const typeLabel = COUNTERAGENT_TYPE_LABELS[localFilters.value.type as CounteragentType]
    summary.push({ key: 'type', label: `Type: ${typeLabel}` })
  }

  if (localFilters.value.isActive !== 'all') {
    const statusLabel = localFilters.value.isActive ? 'Active' : 'Inactive'
    summary.push({ key: 'isActive', label: `Status: ${statusLabel}` })
  }

  if (localFilters.value.isPreferred !== 'all') {
    const preferredLabel = localFilters.value.isPreferred ? 'Preferred' : 'Regular'
    summary.push({ key: 'isPreferred', label: `${preferredLabel}` })
  }

  if (localFilters.value.productCategories.length > 0) {
    const count = localFilters.value.productCategories.length
    summary.push({ key: 'productCategories', label: `${count} Categories` })
  }

  if (localFilters.value.paymentTerms !== 'all') {
    const termsLabel = PAYMENT_TERMS_LABELS[localFilters.value.paymentTerms as PaymentTerms]
    summary.push({ key: 'paymentTerms', label: `Payment: ${termsLabel}` })
  }

  return summary
})

// Methods
const debounce = (func: (...args: any[]) => void, wait: number) => {
  let timeout: NodeJS.Timeout
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

const debouncedSearch = debounce((value: string) => {
  store.setSearchFilter(value || '')
}, 300)

const updateTypeFilter = (value: CounteragentType | 'all') => {
  store.setTypeFilter(value)
}

const updateActiveFilter = (value: boolean | 'all') => {
  store.setActiveFilter(value)
}

const updatePreferredFilter = (value: boolean | 'all') => {
  store.setPreferredFilter(value)
}

const updateCategoryFilter = (value: ProductCategory[]) => {
  store.setCategoryFilter(value)
}

const updatePaymentFilter = (value: PaymentTerms | 'all') => {
  store.setPaymentTermsFilter(value)
}

const applyQuickFilter = (value: string) => {
  // Clear previous quick filter if same
  if (quickFilter.value === value) {
    quickFilter.value = undefined
    clearAllFilters()
    return
  }

  quickFilter.value = value

  switch (value) {
    case 'preferred':
      localFilters.value.isPreferred = true
      updatePreferredFilter(true)
      break
    case 'suppliers':
      localFilters.value.type = 'supplier'
      updateTypeFilter('supplier')
      break
    case 'services':
      localFilters.value.type = 'service'
      updateTypeFilter('service')
      break
  }
}

const removeFilter = (key: string) => {
  switch (key) {
    case 'search':
      localFilters.value.search = ''
      store.setSearchFilter('')
      break
    case 'type':
      localFilters.value.type = 'all'
      updateTypeFilter('all')
      break
    case 'isActive':
      localFilters.value.isActive = 'all'
      updateActiveFilter('all')
      break
    case 'isPreferred':
      localFilters.value.isPreferred = 'all'
      updatePreferredFilter('all')
      break
    case 'productCategories':
      localFilters.value.productCategories = []
      updateCategoryFilter([])
      break
    case 'paymentTerms':
      localFilters.value.paymentTerms = 'all'
      updatePaymentFilter('all')
      break
  }
}

const clearAllFilters = () => {
  localFilters.value = {
    search: '',
    type: 'all',
    isActive: 'all',
    isPreferred: 'all',
    productCategories: [],
    paymentTerms: 'all'
  }
  quickFilter.value = undefined
  store.clearFilters()
  store.viewSettings.showInactive = false
}

const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    meat: 'mdi-food-steak',
    vegetables: 'mdi-carrot',
    dairy: 'mdi-cow',
    beverages: 'mdi-bottle-soda',
    spices: 'mdi-shaker',
    equipment: 'mdi-tools',
    cleaning: 'mdi-spray-bottle',
    other: 'mdi-package-variant'
  }
  return icons[category] || 'mdi-circle'
}

// Watch store filters and sync with local state
watch(
  () => store.filters,
  newFilters => {
    localFilters.value = {
      search: newFilters.search,
      type: newFilters.type,
      isActive: newFilters.isActive,
      isPreferred: newFilters.isPreferred,
      productCategories: [...newFilters.productCategories],
      paymentTerms: newFilters.paymentTerms
    }
  },
  { deep: true }
)
</script>

<style scoped>
/* Minimal styling - inherits from Vuetify theme */
</style>
