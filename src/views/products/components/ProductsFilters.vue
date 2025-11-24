<!-- src/views/products/components/ProductsFilters.vue - Simplified version -->
<template>
  <v-card class="mb-4">
    <v-card-text class="py-4">
      <v-row align="center">
        <!-- Search -->
        <v-col cols="12" md="5">
          <v-text-field
            v-model="localFilters.search"
            label="Search products"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            clearable
            :loading="loading"
            placeholder="Enter product name..."
            hide-details
            @input="debouncedUpdate"
          />
        </v-col>

        <!-- Category -->
        <v-col cols="12" md="3">
          <v-select
            v-model="localFilters.category"
            :items="categoryOptions"
            label="Category"
            variant="outlined"
            density="compact"
            :loading="loading"
            hide-details
            @update:model-value="updateFilters"
          >
            <template #prepend-inner>
              <v-icon>mdi-tag</v-icon>
            </template>
          </v-select>
        </v-col>

        <!-- Department Filter -->
        <v-col cols="12" sm="6" md="2">
          <v-select
            v-model="localFilters.department"
            :items="departmentOptions"
            label="Department"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="updateFilters"
          >
            <template #prepend-inner>
              <v-icon :icon="getDepartmentIcon(localFilters.department)" size="small" />
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
            :loading="loading"
            hide-details
            @update:model-value="updateFilters"
          >
            <template #prepend-inner>
              <v-icon>mdi-check-circle</v-icon>
            </template>
          </v-select>
        </v-col>

        <!-- Reset Button -->
        <v-col cols="12" md="2">
          <v-btn
            variant="outlined"
            color="primary"
            block
            :disabled="loading || !hasActiveFilters"
            @click="resetFilters"
          >
            <v-icon start>mdi-refresh</v-icon>
            Reset
          </v-btn>
        </v-col>
      </v-row>

      <!-- Active filters indicator -->
      <v-row v-if="hasActiveFilters" class="mt-2">
        <v-col>
          <div class="d-flex align-center flex-wrap ga-2">
            <span class="text-caption text-medium-emphasis">Active filters:</span>

            <v-chip
              v-if="localFilters.search"
              size="small"
              color="primary"
              variant="outlined"
              closable
              @click:close="clearSearchFilter"
            >
              Search: "{{ localFilters.search }}"
            </v-chip>

            <v-chip
              v-if="localFilters.category !== 'all'"
              size="small"
              color="primary"
              variant="outlined"
              closable
              @click:close="clearCategoryFilter"
            >
              {{ getCategoryLabel(localFilters.category) }}
            </v-chip>

            <v-chip
              v-if="localFilters.isActive !== 'all'"
              size="small"
              color="primary"
              variant="outlined"
              closable
              @click:close="clearStatusFilter"
            >
              {{ getStatusLabel(localFilters.isActive) }}
            </v-chip>

            <v-chip
              v-if="localFilters.department !== 'all'"
              size="small"
              color="primary"
              variant="outlined"
              closable
              @click:close="clearDepartmentFilter"
            >
              {{ getDepartmentLabel(localFilters.department) }}
              <!-- Dynamic value -->
            </v-chip>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Department } from '@/stores/productsStore'
import { useProductsStore } from '@/stores/productsStore'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ProductsFilters'
const productsStore = useProductsStore()

// Simplified filters type
type SimpleFilters = {
  category: string | 'all' // UUID of category or 'all'
  isActive: boolean | 'all'
  search: string
  department: Department | 'all' // Department filter methods
}

// Props
interface Props {
  filters: SimpleFilters
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
interface Emits {
  (e: 'update:filters', filters: SimpleFilters): void
  (e: 'reset'): void
}

const emit = defineEmits<Emits>()

// Local state
const localFilters = ref<SimpleFilters>({
  category: 'all',
  isActive: 'all',
  search: '',
  department: 'all' // Department filter methods
})

// Debounced update for search
let searchTimeout: ReturnType<typeof setTimeout>
const debouncedUpdate = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    updateFilters()
  }, 300)
}

// Department options
const departmentOptions = computed(() => [
  { title: 'All Departments', value: 'all' },
  { title: 'Kitchen', value: 'kitchen' },
  { title: 'Bar', value: 'bar' }
])

// ✅ UPDATED: Options for selects - load from store
const categoryOptions = computed(() => [
  { title: 'All categories', value: 'all' },
  ...productsStore.activeCategories.map(cat => ({
    title: cat.name,
    value: cat.id
  }))
])

const statusOptions = computed(() => [
  { title: 'All', value: 'all' },
  { title: 'Active', value: true },
  { title: 'Inactive', value: false }
])

// Check for active filters
const hasActiveFilters = computed(() => {
  return (
    localFilters.value.search !== '' ||
    localFilters.value.category !== 'all' ||
    localFilters.value.isActive !== 'all' ||
    localFilters.value.department !== 'all'
  )
})

// Track changes in props
watch(
  () => props.filters,
  newFilters => {
    localFilters.value = {
      category: newFilters.category,
      isActive: newFilters.isActive,
      search: newFilters.search,
      department: newFilters.department
    }
  },
  { deep: true, immediate: true }
)

// Methods
const updateFilters = (): void => {
  console.log('📤 ProductsFilters: emitting filters', { ...localFilters.value }) // Department filter methods
  emit('update:filters', { ...localFilters.value })
  DebugUtils.debug(MODULE_NAME, 'Filters updated', { filters: localFilters.value })
}

const resetFilters = (): void => {
  localFilters.value = {
    category: 'all',
    isActive: 'all',
    search: '',
    department: 'all'
  }
  emit('reset')
  DebugUtils.debug(MODULE_NAME, 'Filters reset')
}

// Department filter methods
const clearDepartmentFilter = (): void => {
  localFilters.value.department = 'all'
  updateFilters()
}

// Department filter methods
const getDepartmentLabel = (department: Department | 'all'): string => {
  if (department === 'all') return 'All Departments'
  return department === 'kitchen' ? 'Kitchen' : 'Bar'
}

// Methods очистки отдельных фильтров
const clearSearchFilter = (): void => {
  localFilters.value.search = ''
  updateFilters()
}

const clearCategoryFilter = (): void => {
  localFilters.value.category = 'all'
  updateFilters()
}

const clearStatusFilter = (): void => {
  localFilters.value.isActive = 'all'
  updateFilters()
}

// ✅ UPDATED: Display helper methods - use store
const getCategoryLabel = (category: string | 'all'): string => {
  if (category === 'all') return 'All categories'
  return productsStore.getCategoryName(category)
}

const getStatusLabel = (status: boolean | 'all'): string => {
  if (status === 'all') return 'All'
  return status ? 'Active' : 'Inactive'
}

// Department filter methods helper для иконок
const getDepartmentIcon = (dept: Department | 'all'): string => {
  if (dept === 'kitchen') return 'mdi-silverware-fork-knife'
  if (dept === 'bar') return 'mdi-coffee'
  return 'mdi-filter-outline'
}
</script>

<style scoped>
/* Minimal styles */
</style>
