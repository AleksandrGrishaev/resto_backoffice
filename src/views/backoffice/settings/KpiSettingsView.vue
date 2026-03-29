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
      <v-tab value="writeoff">
        <v-icon start>mdi-delete-variant</v-icon>
        Write-off Reasons
      </v-tab>
      <v-tab value="bonus-pools">
        <v-icon start>mdi-trophy-award</v-icon>
        Bonus Pools
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
          <v-btn
            color="primary"
            :loading="savingTargets"
            :disabled="loadingSettings"
            @click="saveTargets"
          >
            <v-icon start>mdi-content-save</v-icon>
            Save Targets
          </v-btn>
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

    <!-- Write-off Reasons Tab -->
    <div v-if="activeTab === 'writeoff'">
      <WriteOffReasonsSettings />
    </div>

    <!-- Bonus Pools Tab -->
    <div v-if="activeTab === 'bonus-pools'">
      <v-alert type="info" variant="tonal" class="mb-4">
        Configure monthly KPI bonus pools per department. Pool is distributed proportionally by
        hours worked when department meets KPI targets.
      </v-alert>

      <v-row>
        <v-col v-for="dept in ['kitchen', 'bar'] as const" :key="dept" cols="12" md="6">
          <v-card>
            <v-card-title>
              <v-icon start :color="dept === 'kitchen' ? 'orange' : 'purple'">
                {{ dept === 'kitchen' ? 'mdi-chef-hat' : 'mdi-glass-cocktail' }}
              </v-icon>
              {{ dept === 'kitchen' ? 'Kitchen' : 'Bar' }} Bonus Pool
              <v-spacer />
              <v-switch
                v-model="bonusSchemes[dept].isActive"
                hide-details
                density="compact"
                color="success"
              />
            </v-card-title>

            <v-card-text>
              <!-- Pool Type -->
              <v-btn-toggle
                v-model="bonusSchemes[dept].poolType"
                mandatory
                density="compact"
                class="mb-3"
                :disabled="!bonusSchemes[dept].isActive"
                color="primary"
              >
                <v-btn value="fixed" size="small">
                  <v-icon start size="16">mdi-currency-usd</v-icon>
                  Fixed Amount
                </v-btn>
                <v-btn value="percent_revenue" size="small">
                  <v-icon start size="16">mdi-percent</v-icon>
                  % of Revenue
                </v-btn>
              </v-btn-toggle>

              <!-- Fixed: Pool Amount -->
              <v-text-field
                v-if="bonusSchemes[dept].poolType === 'fixed'"
                v-model.number="bonusSchemes[dept].poolAmount"
                label="Pool Amount"
                type="number"
                prefix="Rp"
                variant="outlined"
                density="compact"
                class="mb-3"
                :disabled="!bonusSchemes[dept].isActive"
                :rules="[v => v >= 0 || 'Must be >= 0']"
              />

              <!-- Percent: Pool Percent -->
              <v-text-field
                v-if="bonusSchemes[dept].poolType === 'percent_revenue'"
                v-model.number="bonusSchemes[dept].poolPercent"
                label="Percent of Department Revenue"
                type="number"
                suffix="%"
                variant="outlined"
                density="compact"
                class="mb-3"
                :disabled="!bonusSchemes[dept].isActive"
                :rules="[v => (v >= 0 && v <= 100) || 'Must be 0-100']"
                hint="Pool = department monthly revenue x this %"
                persistent-hint
              />

              <!-- Weights -->
              <p class="text-subtitle-2 mb-2">
                Metric Weights
                <v-chip
                  size="x-small"
                  :color="weightsSum(dept) === 100 ? 'success' : 'error'"
                  class="ml-2"
                >
                  {{ weightsSum(dept) }}/100
                </v-chip>
              </p>

              <v-row dense>
                <v-col cols="4">
                  <v-text-field
                    v-model.number="bonusSchemes[dept].weightFoodCost"
                    label="Food Cost"
                    type="number"
                    suffix="%"
                    variant="outlined"
                    density="compact"
                    :disabled="!bonusSchemes[dept].isActive"
                  />
                </v-col>
                <v-col cols="2">
                  <v-text-field
                    v-model.number="bonusSchemes[dept].thresholdFoodCost"
                    label="Min"
                    type="number"
                    variant="outlined"
                    density="compact"
                    :disabled="!bonusSchemes[dept].isActive"
                    :placeholder="'y/n'"
                    hint="0=grad"
                  />
                </v-col>
                <v-col cols="4">
                  <v-text-field
                    v-model.number="bonusSchemes[dept].weightTime"
                    label="Time KPI"
                    type="number"
                    suffix="%"
                    variant="outlined"
                    density="compact"
                    :disabled="!bonusSchemes[dept].isActive"
                  />
                </v-col>
                <v-col cols="2">
                  <v-text-field
                    v-model.number="bonusSchemes[dept].thresholdTime"
                    label="Min"
                    type="number"
                    variant="outlined"
                    density="compact"
                    :disabled="!bonusSchemes[dept].isActive"
                    hint="0=grad"
                  />
                </v-col>
                <v-col cols="4">
                  <v-text-field
                    v-model.number="bonusSchemes[dept].weightProduction"
                    label="Real Food Cost"
                    type="number"
                    suffix="%"
                    variant="outlined"
                    density="compact"
                    :disabled="!bonusSchemes[dept].isActive"
                  />
                </v-col>
                <v-col cols="2">
                  <v-text-field
                    v-model.number="bonusSchemes[dept].thresholdProduction"
                    label="Min"
                    type="number"
                    variant="outlined"
                    density="compact"
                    :disabled="!bonusSchemes[dept].isActive"
                    hint="0=grad"
                  />
                </v-col>
                <v-col cols="4">
                  <v-text-field
                    v-model.number="bonusSchemes[dept].weightRitual"
                    label="Rituals"
                    type="number"
                    suffix="%"
                    variant="outlined"
                    density="compact"
                    :disabled="!bonusSchemes[dept].isActive"
                  />
                </v-col>
                <v-col cols="2">
                  <v-text-field
                    v-model.number="bonusSchemes[dept].thresholdRitual"
                    label="Min"
                    type="number"
                    variant="outlined"
                    density="compact"
                    :disabled="!bonusSchemes[dept].isActive"
                    hint="0=grad"
                  />
                </v-col>
                <v-col cols="4">
                  <v-text-field
                    v-model.number="bonusSchemes[dept].weightAvgCheck"
                    label="Avg Check"
                    type="number"
                    suffix="%"
                    variant="outlined"
                    density="compact"
                    :disabled="!bonusSchemes[dept].isActive"
                  />
                </v-col>
                <v-col cols="2">
                  <v-text-field
                    v-model.number="bonusSchemes[dept].thresholdAvgCheck"
                    label="Min"
                    type="number"
                    variant="outlined"
                    density="compact"
                    :disabled="!bonusSchemes[dept].isActive"
                    hint="0=grad"
                  />
                </v-col>
              </v-row>

              <!-- Loss Rate Target -->
              <v-text-field
                v-model.number="bonusSchemes[dept].lossRateTarget"
                label="Loss Rate Target"
                type="number"
                suffix="%"
                variant="outlined"
                density="compact"
                hint="Target (spoilage + shortage) / revenue %. Score 100 at target, 0 at target+5%."
                persistent-hint
                class="mb-3"
                :disabled="!bonusSchemes[dept].isActive"
              />

              <!-- Avg Check Target -->
              <v-text-field
                v-model.number="bonusSchemes[dept].avgCheckTarget"
                label="Avg Check Per Guest Target"
                type="number"
                prefix="Rp"
                variant="outlined"
                density="compact"
                hint="Target average bill per guest (dine-in). Score 100 at target, proportional below."
                persistent-hint
                class="mb-3"
                :disabled="!bonusSchemes[dept].isActive"
              />

              <!-- Threshold -->
              <v-text-field
                v-model.number="bonusSchemes[dept].minThreshold"
                label="Min Score Threshold"
                type="number"
                variant="outlined"
                density="compact"
                hint="0 = graduated (pool × score/100). >0 = all-or-nothing cutoff."
                persistent-hint
                :disabled="!bonusSchemes[dept].isActive"
              />
            </v-card-text>

            <v-card-actions>
              <v-btn
                color="primary"
                variant="flat"
                :loading="savingScheme[dept]"
                :disabled="bonusSchemes[dept].isActive && weightsSum(dept) !== 100"
                @click="saveBonusScheme(dept)"
              >
                <v-icon start>mdi-content-save</v-icon>
                Save
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { FOOD_COST_TARGETS } from '@/stores/kitchenKpi/types'
import { getKPISettings, updateKPISettings } from '@/stores/kitchenKpi/services/kpiSettingsService'
import { getAllKpiBonusSchemes, saveKpiBonusScheme } from '@/stores/staff'
import type { KpiDepartment } from '@/stores/staff'
import WriteOffReasonsSettings from './components/WriteOffReasonsSettings.vue'
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

const activeTab = ref<'targets' | 'products' | 'writeoff' | 'bonus-pools'>('targets')

// Targets
const targets = ref({
  kitchen: FOOD_COST_TARGETS.kitchen,
  bar: FOOD_COST_TARGETS.bar
})
const savingTargets = ref(false)
const loadingSettings = ref(false)

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
    await updateKPISettings({ targets: targets.value })
    DebugUtils.info(MODULE_NAME, 'Targets saved', targets.value)
    successMessage.value = 'Targets saved successfully'
    showSuccess.value = true
  } catch (error) {
    errorMessage.value = 'Failed to save targets'
    showError.value = true
    DebugUtils.error(MODULE_NAME, 'Failed to save targets', { error })
  } finally {
    savingTargets.value = false
  }
}

const loadKpiSettings = async () => {
  loadingSettings.value = true
  try {
    const settings = await getKPISettings()
    targets.value = settings.targets
    DebugUtils.info(MODULE_NAME, 'Loaded KPI settings', settings)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load KPI settings, using defaults', { error })
    // Keep default values from FOOD_COST_TARGETS
  } finally {
    loadingSettings.value = false
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

// =============================================
// BONUS POOLS
// =============================================

const defaultScheme = () => ({
  id: '',
  poolType: 'fixed' as 'fixed' | 'percent_revenue',
  poolAmount: 0,
  poolPercent: 0,
  isActive: false,
  weightFoodCost: 20,
  weightTime: 20,
  weightProduction: 40,
  weightRitual: 20,
  weightAvgCheck: 0,
  minThreshold: 0,
  lossRateTarget: 3,
  avgCheckTarget: 0,
  thresholdFoodCost: 100,
  thresholdTime: 80,
  thresholdProduction: 100,
  thresholdRitual: 80,
  thresholdAvgCheck: 0
})

const bonusSchemes = reactive<Record<KpiDepartment, ReturnType<typeof defaultScheme>>>({
  kitchen: defaultScheme(),
  bar: defaultScheme()
})

const savingScheme = reactive<Record<KpiDepartment, boolean>>({ kitchen: false, bar: false })

const weightsSum = (dept: KpiDepartment) => {
  const s = bonusSchemes[dept]
  return (
    (s.weightFoodCost || 0) +
    (s.weightTime || 0) +
    (s.weightProduction || 0) +
    (s.weightRitual || 0) +
    (s.weightAvgCheck || 0)
  )
}

const loadBonusSchemes = async () => {
  try {
    const schemes = await getAllKpiBonusSchemes()
    for (const s of schemes) {
      if (s.department === 'kitchen' || s.department === 'bar') {
        bonusSchemes[s.department] = {
          id: s.id,
          poolType: s.poolType,
          poolAmount: s.poolAmount,
          poolPercent: s.poolPercent,
          isActive: s.isActive,
          weightFoodCost: s.weightFoodCost,
          weightTime: s.weightTime,
          weightProduction: s.weightProduction,
          weightRitual: s.weightRitual,
          weightAvgCheck: s.weightAvgCheck,
          minThreshold: s.minThreshold,
          lossRateTarget: s.lossRateTarget,
          avgCheckTarget: s.avgCheckTarget,
          thresholdFoodCost: s.thresholdFoodCost,
          thresholdTime: s.thresholdTime,
          thresholdProduction: s.thresholdProduction,
          thresholdRitual: s.thresholdRitual,
          thresholdAvgCheck: s.thresholdAvgCheck
        }
      }
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load bonus schemes', { error })
  }
}

const saveBonusScheme = async (dept: KpiDepartment) => {
  savingScheme[dept] = true
  try {
    const s = bonusSchemes[dept]
    const saved = await saveKpiBonusScheme({
      id: s.id || undefined,
      department: dept,
      name: `${dept === 'kitchen' ? 'Kitchen' : 'Bar'} KPI Bonus`,
      poolType: s.poolType,
      poolAmount: s.poolAmount,
      poolPercent: s.poolPercent,
      isActive: s.isActive,
      weightFoodCost: s.weightFoodCost,
      weightTime: s.weightTime,
      weightProduction: s.weightProduction,
      weightRitual: s.weightRitual,
      weightAvgCheck: s.weightAvgCheck,
      minThreshold: s.minThreshold,
      lossRateTarget: s.lossRateTarget,
      avgCheckTarget: s.avgCheckTarget,
      thresholdFoodCost: s.thresholdFoodCost,
      thresholdTime: s.thresholdTime,
      thresholdProduction: s.thresholdProduction,
      thresholdRitual: s.thresholdRitual,
      thresholdAvgCheck: s.thresholdAvgCheck
    })
    bonusSchemes[dept].id = saved.id
    successMessage.value = `${dept === 'kitchen' ? 'Kitchen' : 'Bar'} bonus pool saved`
    showSuccess.value = true
  } catch (error) {
    errorMessage.value = `Failed to save ${dept} bonus pool`
    showError.value = true
    DebugUtils.error(MODULE_NAME, 'Failed to save bonus scheme', { dept, error })
  } finally {
    savingScheme[dept] = false
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
  loadKpiSettings()
  loadProducts()
  loadBonusSchemes()
})
</script>

<style scoped lang="scss">
.kpi-settings-view {
  padding: var(--spacing-lg);
}
</style>
