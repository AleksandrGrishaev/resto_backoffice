<!-- src/views/backoffice/analytics/FoodCostMenuView.vue -->
<!-- Food Cost Menu Report - Theoretical cost analysis for all menu items -->

<template>
  <div class="food-cost-menu-view">
    <v-container fluid>
      <!-- Header -->
      <v-row>
        <v-col cols="12">
          <h1 class="text-h4 mb-2">Food Cost Menu Report</h1>
          <p class="text-body-2 text-medium-emphasis">
            Theoretical cost analysis for all active menu items (independent of sales data)
          </p>
        </v-col>
      </v-row>

      <!-- Filters -->
      <v-row>
        <v-col cols="12" md="3">
          <v-select
            v-model="selectedDepartment"
            label="Department"
            :items="departmentOptions"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="3">
          <v-select
            v-model="selectedDishType"
            label="Dish Type"
            :items="dishTypeOptions"
            variant="outlined"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="2">
          <v-text-field
            v-model.number="fcThreshold"
            label="FC% Threshold"
            type="number"
            variant="outlined"
            density="compact"
            suffix="%"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="searchQuery"
            label="Search items..."
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-magnify"
            clearable
            hide-details
          />
        </v-col>
      </v-row>

      <v-row>
        <v-col cols="12" md="6">
          <v-checkbox
            v-model="showModifiableOnly"
            label="Show only modifiable items"
            density="compact"
            hide-details
          />
        </v-col>
        <v-col cols="12" md="6" class="text-right">
          <v-btn
            v-if="reportData.length > 0"
            color="secondary"
            variant="outlined"
            @click="handleExportPDF"
          >
            <v-icon left>mdi-file-pdf-box</v-icon>
            Export PDF
          </v-btn>
        </v-col>
      </v-row>

      <!-- Summary Cards -->
      <v-row v-if="reportData.length > 0" class="mt-4">
        <v-col cols="12" md="3">
          <v-card color="primary" variant="tonal">
            <v-card-text>
              <div class="text-caption">Total Items</div>
              <div class="text-h5">{{ reportData.length }}</div>
              <div class="text-caption">Active menu items</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card color="info" variant="tonal">
            <v-card-text>
              <div class="text-caption">Average Base FC%</div>
              <div class="text-h5">{{ averageBaseFoodCost.toFixed(1) }}%</div>
              <div class="text-caption">Without modifiers</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card color="warning" variant="tonal">
            <v-card-text>
              <div class="text-caption">High FC% Items</div>
              <div class="text-h5">{{ highFoodCostCount }}</div>
              <div class="text-caption">> {{ fcThreshold }}%</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card color="secondary" variant="tonal">
            <v-card-text>
              <div class="text-caption">Addon Modifiers</div>
              <div class="text-h5">{{ totalAddonModifiers }}</div>
              <div class="text-caption">Total addon groups</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Main Table -->
      <v-row v-if="reportData.length > 0">
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-title>Cost Analysis Table</v-card-title>
            <v-divider />
            <v-card-text class="pa-0">
              <v-data-table
                v-model:expanded="expanded"
                :headers="tableHeaders"
                :items="filteredReportData"
                :items-per-page="20"
                density="comfortable"
                class="food-cost-table"
                show-expand
              >
                <!-- Index -->
                <template #[`item.index`]="{ index }">
                  {{ index + 1 }}
                </template>

                <!-- Item Name -->
                <template #[`item.menuItemName`]="{ item }">
                  <div class="font-weight-medium">{{ item.menuItemName }}</div>
                  <div class="text-caption text-medium-emphasis">{{ item.department }}</div>
                </template>

                <!-- Base FC% -->
                <template #[`item.baseFoodCostPercent`]="{ item }">
                  <div>
                    <!-- 🆕 Handle null foodCostPercent -->
                    <v-chip
                      v-if="item.base.foodCostPercent !== null"
                      size="small"
                      :color="getFoodCostColor(item.base.foodCostPercent)"
                    >
                      {{ item.base.foodCostPercent.toFixed(1) }}%
                    </v-chip>
                    <span v-else class="text-caption text-medium-emphasis">n/a</span>
                  </div>
                  <div class="text-caption mt-1">Cost: {{ formatIDR(item.base.cost) }}</div>
                  <!-- 🆕 Show note if exists -->
                  <div v-if="item.base.note" class="text-caption text-medium-emphasis mt-1">
                    {{ item.base.note }}
                  </div>
                </template>

                <!-- Required Range -->
                <template #[`item.requiredRange`]="{ item }">
                  <div v-if="item.hasRequiredModifiers" class="text-caption">
                    {{ item.withRequired.minFoodCostPercent.toFixed(1) }}% -
                    {{ item.withRequired.maxFoodCostPercent.toFixed(1) }}%
                  </div>
                  <div v-else class="text-caption text-medium-emphasis">n/a</div>
                </template>

                <!-- Optional Range -->
                <template #[`item.optionalRange`]="{ item }">
                  <div v-if="item.hasOptionalModifiers" class="text-caption">
                    {{ item.withOptional.minFoodCostPercent.toFixed(1) }}% -
                    {{ item.withOptional.maxFoodCostPercent.toFixed(1) }}%
                  </div>
                  <div v-else class="text-caption text-medium-emphasis">n/a</div>
                </template>

                <!-- Full Range -->
                <template #[`item.fullRange`]="{ item }">
                  <div v-if="item.hasModifiers">
                    <v-chip
                      size="small"
                      :color="getFoodCostColor(item.full.maxFoodCostPercent)"
                      variant="outlined"
                    >
                      {{ item.full.minFoodCostPercent.toFixed(1) }}% -
                      {{ item.full.maxFoodCostPercent.toFixed(1) }}%
                    </v-chip>
                  </div>
                  <div v-else class="text-caption text-medium-emphasis">No modifiers</div>
                </template>

                <!-- Expanded Row -->
                <template #[`expanded-row`]="{ item }">
                  <td colspan="8" class="pa-4 expanded-row-bg">
                    <!-- Composition Breakdown -->
                    <div class="mb-4">
                      <div class="text-subtitle-2 mb-2">📦 Composition Breakdown (Base):</div>
                      <table class="composition-table">
                        <tbody>
                          <tr v-for="comp in item.base.composition" :key="comp.id">
                            <td class="text-caption">{{ comp.name }}</td>
                            <td class="text-caption">{{ comp.quantity }} {{ comp.unit }}</td>
                            <td class="text-caption text-right">
                              {{ formatIDR(comp.costPerUnit) }}/{{ comp.unit }}
                            </td>
                            <td class="text-caption text-right font-weight-medium">
                              {{ formatIDR(comp.totalCost) }}
                            </td>
                          </tr>
                          <tr class="font-weight-bold">
                            <td colspan="3" class="text-caption">Total Base Cost:</td>
                            <td class="text-caption text-right">{{ formatIDR(item.base.cost) }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <!-- Modifiers Breakdown (Addon + Replacement) -->
                    <div v-if="item.hasAddonModifiers || item.hasReplacementModifiers">
                      <div class="text-subtitle-2 mb-2">
                        {{ item.hasReplacementModifiers ? '🔄' : '🆕' }} Modifiers Breakdown:
                      </div>
                      <div
                        v-for="modGroup in item.modifiersCostBreakdown"
                        :key="modGroup.groupId"
                        class="mb-3"
                      >
                        <div class="text-caption font-weight-medium mb-1">
                          {{ modGroup.groupName }}
                          <v-chip size="x-small" class="ml-2">
                            {{ modGroup.isRequired ? 'Required' : 'Optional' }}
                          </v-chip>
                          <v-chip
                            size="x-small"
                            class="ml-2"
                            :color="modGroup.groupType === 'replacement' ? 'orange' : 'blue'"
                          >
                            {{ modGroup.groupType }}
                          </v-chip>
                        </div>
                        <table class="modifiers-table">
                          <thead>
                            <tr>
                              <th class="text-caption">Option</th>
                              <th class="text-caption text-right">Cost</th>
                              <th class="text-caption text-right">Price +</th>
                              <th class="text-caption text-right">FC%</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="option in modGroup.options" :key="option.optionId">
                              <td class="text-caption">
                                {{ option.optionName }}
                                <v-chip
                                  v-if="option.isDefault"
                                  size="x-small"
                                  color="info"
                                  variant="outlined"
                                  class="ml-1"
                                >
                                  default
                                </v-chip>
                              </td>
                              <td class="text-caption text-right">{{ formatIDR(option.cost) }}</td>
                              <td class="text-caption text-right">
                                {{ formatIDR(option.priceAdjustment) }}
                              </td>
                              <td class="text-caption text-right">
                                <!-- Display based on displayMode -->
                                <v-chip
                                  v-if="
                                    option.displayMode === 'addon-fc' &&
                                    option.foodCostPercent !== Infinity
                                  "
                                  size="x-small"
                                  :color="getFoodCostColor(option.foodCostPercent)"
                                >
                                  {{ option.foodCostPercent.toFixed(1) }}%
                                </v-chip>
                                <v-chip
                                  v-else-if="option.displayMode === 'final-fc'"
                                  size="x-small"
                                  :color="getFoodCostColor(option.finalFoodCostPercent || 0)"
                                  variant="tonal"
                                >
                                  Final: {{ (option.finalFoodCostPercent || 0).toFixed(1) }}%
                                </v-chip>
                                <v-chip
                                  v-else-if="option.displayMode === 'free-addon'"
                                  size="x-small"
                                  color="success"
                                  variant="outlined"
                                >
                                  Free addon (+{{ formatIDR(option.cost) }})
                                </v-chip>
                                <v-chip
                                  v-else-if="option.displayMode === 'replacement'"
                                  size="x-small"
                                  :color="getFoodCostColor(option.finalFoodCostPercent || 0)"
                                  variant="flat"
                                >
                                  {{ (option.finalFoodCostPercent || 0).toFixed(1) }}%
                                </v-chip>
                                <span v-else class="text-caption text-medium-emphasis">n/a</span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </td>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Loading State -->
      <v-row v-if="loading">
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-text class="text-center py-12">
              <v-progress-circular indeterminate color="primary" size="64" class="mb-4" />
              <div class="text-h6 text-medium-emphasis">Loading menu data...</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Empty State -->
      <v-row v-else-if="reportData.length === 0">
        <v-col cols="12">
          <v-card variant="outlined">
            <v-card-text class="text-center py-12">
              <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-chart-bar</v-icon>
              <div class="text-h6 text-medium-emphasis">No Menu Items Found</div>
              <div class="text-body-2 text-medium-emphasis">
                No active menu items available for analysis
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useMenuStore } from '@/stores/menu/menuStore'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes/recipesStore'
import { analyzeAllMenuItemVariants } from '@/core/cost/menuCostCalculator'
import type { MenuItemCostAnalysis } from '@/core/cost/types'
import { formatIDR } from '@/utils/currency'

// Stores
const menuStore = useMenuStore()
const productsStore = useProductsStore()
const recipesStore = useRecipesStore()

// State
const reportData = ref<MenuItemCostAnalysis[]>([])
const loading = ref(false)
const expanded = ref<MenuItemCostAnalysis[]>([]) // 🆕 Expanded rows state

// Filters
const selectedDepartment = ref<string>('all')
const selectedDishType = ref<string>('all')
const showModifiableOnly = ref(false)
const fcThreshold = ref(40)
const searchQuery = ref('')

// Options
const departmentOptions = [
  { title: 'All Departments', value: 'all' },
  { title: 'Kitchen', value: 'kitchen' },
  { title: 'Bar', value: 'bar' }
]

const dishTypeOptions = [
  { title: 'All Types', value: 'all' },
  { title: 'Simple', value: 'simple' },
  { title: 'Modifiable', value: 'modifiable' },
  { title: 'From Modifiers Only', value: 'from_modifiers_only' }
]

// Table Headers
const tableHeaders = [
  { title: '#', key: 'index', sortable: false, width: '50px' },
  { title: 'Item', key: 'menuItemName', sortable: true },
  { title: 'Variant', key: 'variantName', sortable: true },
  { title: 'Base FC%', key: 'baseFoodCostPercent', sortable: true },
  { title: 'Required Range', key: 'requiredRange', sortable: false },
  { title: 'Optional Range', key: 'optionalRange', sortable: false },
  { title: 'Full Range', key: 'fullRange', sortable: false }
]

// Lifecycle
onMounted(async () => {
  loading.value = true
  try {
    // Ensure stores are initialized
    if (!menuStore.initialized) await menuStore.initialize()
    // ProductsStore and RecipesStore don't have initialize method, they load on import

    // Auto-generate on load
    await handleGenerate()
  } catch (error) {
    console.error('Error initializing Food Cost Menu:', error)
  } finally {
    loading.value = false
  }
})

// Methods
function handleGenerate() {
  reportData.value = []

  const activeItems = menuStore.menuItems.filter(item => item.isActive !== false)

  for (const item of activeItems) {
    // 🆕 Analyze ALL variants at once
    const analyses = analyzeAllMenuItemVariants(item, productsStore, recipesStore)
    reportData.value.push(...analyses)
  }

  console.log('📊 Food Cost Menu Report generated:', reportData.value.length, 'items')
}

function handleExportPDF() {
  // TODO: Implement PDF export (Phase 4)
  console.log('📄 Export PDF - Coming soon!')
}

function getFoodCostColor(percent: number): string {
  if (percent > fcThreshold.value) return 'error'
  if (percent > fcThreshold.value * 0.75) return 'warning'
  return 'success'
}

// Computed
const filteredReportData = computed(() => {
  let filtered = reportData.value

  // Filter by department
  if (selectedDepartment.value !== 'all') {
    filtered = filtered.filter(item => item.department === selectedDepartment.value)
  }

  // Filter by dish type
  if (selectedDishType.value !== 'all') {
    filtered = filtered.filter(item => item.dishType === selectedDishType.value)
  }

  // Filter by modifiable only
  if (showModifiableOnly.value) {
    filtered = filtered.filter(item => item.hasModifiers)
  }

  // Filter by search query
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      item =>
        item.menuItemName.toLowerCase().includes(query) ||
        item.variantName.toLowerCase().includes(query)
    )
  }

  return filtered
})

const averageBaseFoodCost = computed(() => {
  if (filteredReportData.value.length === 0) return 0
  // Filter out items with null foodCostPercent
  const validItems = filteredReportData.value.filter(item => item.base.foodCostPercent !== null)
  if (validItems.length === 0) return 0
  const sum = validItems.reduce((acc, item) => acc + (item.base.foodCostPercent || 0), 0)
  return sum / validItems.length
})

const highFoodCostCount = computed(() => {
  return filteredReportData.value.filter(
    item => item.base.foodCostPercent !== null && item.base.foodCostPercent > fcThreshold.value
  ).length
})

const totalAddonModifiers = computed(() => {
  return filteredReportData.value.reduce((acc, item) => acc + item.modifiersCostBreakdown.length, 0)
})
</script>

<style scoped lang="scss">
.food-cost-menu-view {
  .food-cost-table {
    :deep(.v-data-table__td) {
      padding: 8px 12px;
    }
  }

  // 🆕 Темный фон для раскрывающегося списка
  .expanded-row-bg {
    background-color: rgb(var(--v-theme-surface));
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  }

  // Styling for composition and modifiers tables
  .composition-table,
  .modifiers-table {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
      padding: 4px 8px;
      text-align: left;
    }

    th {
      font-weight: 600;
      border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    }

    tbody tr {
      border-bottom: 1px solid rgba(var(--v-border-color), calc(var(--v-border-opacity) * 0.5));

      &:last-child {
        border-bottom: none;
      }
    }

    .text-right {
      text-align: right;
    }
  }

  .modifiers-table {
    thead {
      background-color: rgba(var(--v-theme-on-surface), 0.03);
    }
  }
}
</style>
