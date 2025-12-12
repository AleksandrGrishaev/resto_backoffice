<!-- src/views/backoffice/settings/KpiSettingsView.vue -->
<template>
  <v-container fluid class="kpi-settings-view">
    <!-- Header -->
    <v-row class="mb-4">
      <v-col cols="12">
        <h1 class="text-h5 mb-1">KPI Settings</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Configure Food Cost targets and product department assignments
        </p>
      </v-col>
    </v-row>

    <!-- Tabs -->
    <v-tabs v-model="activeTab" color="primary" class="mb-4">
      <v-tab value="targets">
        <v-icon start>mdi-target</v-icon>
        Targets
      </v-tab>
      <v-tab value="products">
        <v-icon start>mdi-package-variant</v-icon>
        Product Departments
        <v-chip v-if="productsNeedingAssignment > 0" size="small" color="warning" class="ml-2">
          {{ productsNeedingAssignment }}
        </v-chip>
      </v-tab>
    </v-tabs>

    <!-- Targets Tab -->
    <div v-if="activeTab === 'targets'">
      <v-row>
        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>
              <v-icon start color="orange">mdi-chef-hat</v-icon>
              Kitchen Target
            </v-card-title>
            <v-card-text>
              <v-text-field
                v-model.number="targets.kitchen"
                label="Target COGS %"
                type="number"
                suffix="%"
                variant="outlined"
                :rules="[v => (v >= 0 && v <= 100) || 'Must be 0-100']"
              />
              <p class="text-body-2 text-medium-emphasis">
                Target Food Cost percentage for kitchen products. Items exceeding this will be
                flagged in KPI reports.
              </p>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" md="6">
          <v-card>
            <v-card-title>
              <v-icon start color="purple">mdi-glass-cocktail</v-icon>
              Bar Target
            </v-card-title>
            <v-card-text>
              <v-text-field
                v-model.number="targets.bar"
                label="Target COGS %"
                type="number"
                suffix="%"
                variant="outlined"
                :rules="[v => (v >= 0 && v <= 100) || 'Must be 0-100']"
              />
              <p class="text-body-2 text-medium-emphasis">
                Target Food Cost percentage for bar products (beverages). Typically lower than
                kitchen due to higher margins.
              </p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row class="mt-4">
        <v-col cols="12">
          <v-btn color="primary" :loading="savingTargets" @click="saveTargets">
            <v-icon start>mdi-content-save</v-icon>
            Save Targets
          </v-btn>
          <v-chip class="ml-4" variant="tonal" color="info">
            Currently using hardcoded values. Database storage coming soon.
          </v-chip>
        </v-col>
      </v-row>
    </div>

    <!-- Products Tab -->
    <div v-if="activeTab === 'products'">
      <!-- Info -->
      <v-alert v-if="productsNeedingAssignment > 0" type="info" variant="tonal" class="mb-4">
        <strong>{{ productsNeedingAssignment }}</strong>
        products are available in both Kitchen and Bar. Choose which department to assign their COGS
        to.
      </v-alert>
      <v-alert v-else type="success" variant="tonal" class="mb-4">
        All products have single department assignment. No action needed.
      </v-alert>

      <!-- Filters -->
      <v-row class="mb-4">
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            v-model="productSearch"
            label="Search products"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="categoryFilter"
            :items="categoryOptions"
            label="Filter by category"
            variant="outlined"
            density="compact"
            hide-details
            clearable
          />
        </v-col>
      </v-row>

      <!-- Products Table -->
      <v-card>
        <v-data-table
          :headers="productHeaders"
          :items="filteredProducts"
          :loading="loadingProducts"
          :search="productSearch"
          :items-per-page="20"
          class="elevation-0"
        >
          <template #[`item.name`]="{ item }">
            <div class="d-flex align-center">
              <span class="font-weight-medium">{{ item.name }}</span>
            </div>
          </template>

          <template #[`item.category`]="{ item }">
            <v-chip size="small" variant="tonal">
              {{ getCategoryName(item.category) }}
            </v-chip>
          </template>

          <template #[`item.kpiDepartment`]="{ item }">
            <v-btn-toggle
              :model-value="getKpiDepartment(item)"
              mandatory
              density="compact"
              @update:model-value="val => updateProductKpiDepartment(item, val)"
            >
              <v-btn
                value="kitchen"
                size="small"
                :color="getKpiDepartment(item) === 'kitchen' ? 'orange' : undefined"
                :variant="getKpiDepartment(item) === 'kitchen' ? 'flat' : 'outlined'"
              >
                <v-icon start size="16">mdi-chef-hat</v-icon>
                Kitchen
              </v-btn>
              <v-btn
                value="bar"
                size="small"
                :color="getKpiDepartment(item) === 'bar' ? 'purple' : undefined"
                :variant="getKpiDepartment(item) === 'bar' ? 'flat' : 'outlined'"
              >
                <v-icon start size="16">mdi-glass-cocktail</v-icon>
                Bar
              </v-btn>
            </v-btn-toggle>
          </template>

          <template #[`item.unit`]="{ item }">
            {{ item.unit }}
          </template>

          <template #no-data>
            <div class="text-center py-8">
              <v-icon size="48" color="grey">mdi-package-variant</v-icon>
              <p class="text-medium-emphasis mt-2">No products found</p>
            </div>
          </template>
        </v-data-table>
      </v-card>
    </div>

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSuccess" color="success" timeout="3000" location="top">
      <v-icon start>mdi-check-circle</v-icon>
      {{ successMessage }}
    </v-snackbar>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showError" color="error" timeout="5000" location="top">
      <v-icon start>mdi-alert-circle</v-icon>
      {{ errorMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { FOOD_COST_TARGETS } from '@/stores/kitchenKpi/types'
import { DebugUtils } from '@/utils'
import type { Product } from '@/stores/productsStore/types'

const MODULE_NAME = 'KpiSettingsView'

// =============================================
// STORES
// =============================================

const productsStore = useProductsStore()

// =============================================
// STATE
// =============================================

const activeTab = ref<'targets' | 'products'>('targets')

// Targets
const targets = ref({
  kitchen: FOOD_COST_TARGETS.kitchen,
  bar: FOOD_COST_TARGETS.bar
})
const savingTargets = ref(false)

// Products
const productSearch = ref('')
const categoryFilter = ref<string | null>(null)
const loadingProducts = ref(false)

// Notifications
const showSuccess = ref(false)
const showError = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// =============================================
// COMPUTED
// =============================================

const categoryOptions = computed(() => {
  const categoryIds = new Set<string>()
  dualDepartmentProducts.value.forEach(p => {
    if (p.category) categoryIds.add(p.category)
  })

  return Array.from(categoryIds)
    .map(id => {
      const cat = productsStore.categories.find(c => c.id === id)
      return { title: cat?.name || id, value: id }
    })
    .sort((a, b) => a.title.localeCompare(b.title))
})

/**
 * Get category name by ID
 */
const getCategoryName = (categoryId: string): string => {
  if (!categoryId) return 'Uncategorized'
  const cat = productsStore.categories.find(c => c.id === categoryId)
  return cat?.name || 'Unknown'
}

/**
 * Products that have BOTH departments and need manual decision
 * These are the only ones shown in this settings page
 */
const dualDepartmentProducts = computed(() => {
  return productsStore.products.filter(p => {
    const deps = p.usedInDepartments || []
    // Show products that have both departments OR no departments
    return deps.length === 2 || deps.length === 0
  })
})

const productsNeedingAssignment = computed(() => {
  return dualDepartmentProducts.value.length
})

const filteredProducts = computed(() => {
  let result = [...dualDepartmentProducts.value]

  // Filter by category
  if (categoryFilter.value) {
    result = result.filter(p => p.category === categoryFilter.value)
  }

  return result
})

const productHeaders = [
  { title: 'Product Name', key: 'name', sortable: true },
  { title: 'Category', key: 'category', sortable: true },
  { title: 'Unit', key: 'baseUnit', sortable: true },
  { title: 'KPI Department', key: 'kpiDepartment', sortable: false, width: '250px' }
]

/**
 * Get the KPI department for a product
 * For dual-department products, use the first one as default
 */
const getKpiDepartment = (product: Product): 'kitchen' | 'bar' => {
  const deps = product.usedInDepartments || []
  // Return first department or default to kitchen
  return deps[0] || 'kitchen'
}

// =============================================
// METHODS
// =============================================

const saveTargets = async () => {
  savingTargets.value = true
  try {
    // TODO: Save to database when settings table is implemented
    DebugUtils.info(MODULE_NAME, 'Saving targets', targets.value)

    // For now, just show success (values are hardcoded in types.ts)
    await new Promise(resolve => setTimeout(resolve, 500))

    successMessage.value = 'Targets saved (note: currently using hardcoded values)'
    showSuccess.value = true
  } catch (error) {
    errorMessage.value = 'Failed to save targets'
    showError.value = true
    DebugUtils.error(MODULE_NAME, 'Failed to save targets', { error })
  } finally {
    savingTargets.value = false
  }
}

/**
 * Update product KPI department by reordering usedInDepartments
 * The first element is used as the "primary" for KPI calculations
 */
const updateProductKpiDepartment = async (product: Product, department: 'kitchen' | 'bar') => {
  try {
    const currentDeps = product.usedInDepartments || ['kitchen', 'bar']

    // Reorder: put selected department first
    const newDeps: ('kitchen' | 'bar')[] =
      department === 'kitchen' ? ['kitchen', 'bar'] : ['bar', 'kitchen']

    DebugUtils.info(MODULE_NAME, 'Updating product KPI department', {
      productId: product.id,
      productName: product.name,
      from: currentDeps,
      to: newDeps
    })

    await productsStore.updateProduct({ id: product.id, usedInDepartments: newDeps })

    successMessage.value = `${product.name} COGS assigned to ${department}`
    showSuccess.value = true
  } catch (error) {
    errorMessage.value = `Failed to update ${product.name}`
    showError.value = true
    DebugUtils.error(MODULE_NAME, 'Failed to update product KPI department', { error })
  }
}

const loadProducts = async () => {
  loadingProducts.value = true
  try {
    // ProductsStore uses loadProducts() not initialize()
    if (productsStore.products.length === 0) {
      await productsStore.loadProducts()
    }
  } catch (error) {
    errorMessage.value = 'Failed to load products'
    showError.value = true
    DebugUtils.error(MODULE_NAME, 'Failed to load products', { error })
  } finally {
    loadingProducts.value = false
  }
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  loadProducts()
})
</script>

<style scoped lang="scss">
.kpi-settings-view {
  padding: var(--spacing-lg);
}
</style>
