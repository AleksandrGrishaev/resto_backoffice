<!-- src/views/backoffice/inventory/InventoryValuationView.vue -->
<template>
  <div class="inventory-valuation-view">
    <!-- Page Header -->
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold">Inventory Valuation</h1>
        <p class="text-body-2 text-medium-emphasis mt-2">
          Current inventory value calculated using FIFO (First In, First Out) method
        </p>
      </div>

      <!-- Actions -->
      <div class="d-flex gap-2">
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-refresh"
          :loading="loading"
          @click="calculateValuation"
        >
          Recalculate
        </v-btn>

        <v-btn
          color="success"
          variant="flat"
          prepend-icon="mdi-download"
          :disabled="!currentValuation"
          @click="exportReport"
        >
          Export Report
        </v-btn>
      </div>
    </div>

    <!-- Error Alert -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      class="mb-4"
      closable
      @click:close="error = null"
    >
      <template #prepend>
        <v-icon icon="mdi-alert-circle" />
      </template>
      <strong>Error calculating valuation</strong>
      <div class="text-caption">{{ error }}</div>
    </v-alert>

    <!-- Last Calculated Info -->
    <v-alert v-if="currentValuation" type="info" variant="tonal" density="compact" class="mb-4">
      <div class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon icon="mdi-clock-outline" class="mr-2" />
          <span>
            Last calculated:
            <strong>{{ formatDateTime(currentValuation.calculatedAt) }}</strong>
          </span>
        </div>
        <span class="text-caption">
          Total Batches: {{ totalBatchCount }} | Total Items: {{ totalItemCount }}
        </span>
      </div>
    </v-alert>

    <!-- Summary Cards -->
    <v-row v-if="currentValuation" class="mb-6">
      <!-- Total Value -->
      <v-col cols="12" md="3">
        <v-card>
          <v-card-text>
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-medium-emphasis">Total Inventory Value</span>
              <v-icon icon="mdi-warehouse" color="primary" size="20" />
            </div>
            <div class="text-h4 font-weight-bold text-primary">
              {{ formatCurrency(currentValuation.totalValue) }}
            </div>
            <div class="text-caption text-medium-emphasis mt-1">FIFO method</div>
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Products Value -->
      <v-col cols="12" md="3">
        <v-card>
          <v-card-text>
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-medium-emphasis">Products</span>
              <v-icon icon="mdi-package-variant" color="blue" size="20" />
            </div>
            <div class="text-h5 font-weight-bold">
              {{ formatCurrency(currentValuation.byType.products.value) }}
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              {{ currentValuation.byType.products.itemCount }} items •
              {{ currentValuation.byType.products.batchCount }} batches
            </div>
            <v-progress-linear
              :model-value="getPercentage(currentValuation.byType.products.value)"
              color="blue"
              height="4"
              class="mt-2"
              rounded
            />
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Preparations Value -->
      <v-col cols="12" md="3">
        <v-card>
          <v-card-text>
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-caption text-medium-emphasis">Preparations</span>
              <v-icon icon="mdi-pot-mix" color="orange" size="20" />
            </div>
            <div class="text-h5 font-weight-bold">
              {{ formatCurrency(currentValuation.byType.preparations.value) }}
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              {{ currentValuation.byType.preparations.itemCount }} items •
              {{ currentValuation.byType.preparations.batchCount }} batches
            </div>
            <v-progress-linear
              :model-value="getPercentage(currentValuation.byType.preparations.value)"
              color="orange"
              height="4"
              class="mt-2"
              rounded
            />
          </v-card-text>
        </v-card>
      </v-col>

      <!-- Type Breakdown Chart -->
      <v-col cols="12" md="3">
        <v-card>
          <v-card-text>
            <div class="text-caption text-medium-emphasis mb-2">Value Distribution</div>
            <div class="d-flex align-center justify-center" style="height: 100px">
              <div class="text-center">
                <div class="text-h6 font-weight-bold text-blue">
                  {{ formatPercentage(currentValuation.byType.products.value) }}%
                </div>
                <div class="text-caption">Products</div>
              </div>
              <v-divider vertical class="mx-4" />
              <div class="text-center">
                <div class="text-h6 font-weight-bold text-orange">
                  {{ formatPercentage(currentValuation.byType.preparations.value) }}%
                </div>
                <div class="text-caption">Preparations</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Department Breakdown -->
    <v-row v-if="currentValuation" class="mb-6">
      <v-col cols="12">
        <v-card>
          <v-card-title class="d-flex align-center">
            <v-icon icon="mdi-store" class="mr-2" />
            By Department
          </v-card-title>
          <v-card-text>
            <v-row>
              <!-- Kitchen -->
              <v-col cols="12" md="4">
                <div class="d-flex flex-column">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <div class="d-flex align-center">
                      <v-icon
                        icon="mdi-silverware-fork-knife"
                        color="orange"
                        size="24"
                        class="mr-2"
                      />
                      <span class="text-h6 font-weight-medium">Kitchen</span>
                    </div>
                    <span class="text-h6 font-weight-bold">
                      {{ formatCurrency(currentValuation.byDepartment.kitchen) }}
                    </span>
                  </div>
                  <v-progress-linear
                    :model-value="getPercentage(currentValuation.byDepartment.kitchen)"
                    color="orange"
                    height="12"
                    rounded
                  />
                  <div class="text-caption text-medium-emphasis mt-1">
                    {{ formatPercentage(currentValuation.byDepartment.kitchen) }}% of total
                  </div>
                </div>
              </v-col>

              <!-- Bar -->
              <v-col cols="12" md="4">
                <div class="d-flex flex-column">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <div class="d-flex align-center">
                      <v-icon icon="mdi-coffee" color="blue" size="24" class="mr-2" />
                      <span class="text-h6 font-weight-medium">Bar</span>
                    </div>
                    <span class="text-h6 font-weight-bold">
                      {{ formatCurrency(currentValuation.byDepartment.bar) }}
                    </span>
                  </div>
                  <v-progress-linear
                    :model-value="getPercentage(currentValuation.byDepartment.bar)"
                    color="blue"
                    height="12"
                    rounded
                  />
                  <div class="text-caption text-medium-emphasis mt-1">
                    {{ formatPercentage(currentValuation.byDepartment.bar) }}% of total
                  </div>
                </div>
              </v-col>

              <!-- Kitchen & Bar (Both) -->
              <v-col cols="12" md="4">
                <div class="d-flex flex-column">
                  <div class="d-flex align-center justify-space-between mb-2">
                    <div class="d-flex align-center">
                      <v-icon icon="mdi-food-fork-drink" color="purple" size="24" class="mr-2" />
                      <span class="text-h6 font-weight-medium">Kitchen & Bar</span>
                    </div>
                    <span class="text-h6 font-weight-bold">
                      {{ formatCurrency(currentValuation.byDepartment.kitchenAndBar) }}
                    </span>
                  </div>
                  <v-progress-linear
                    :model-value="getPercentage(currentValuation.byDepartment.kitchenAndBar)"
                    color="purple"
                    height="12"
                    rounded
                  />
                  <div class="text-caption text-medium-emphasis mt-1">
                    {{ formatPercentage(currentValuation.byDepartment.kitchenAndBar) }}% of total
                  </div>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Inventory Items Table -->
    <v-card v-if="currentValuation">
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-format-list-bulleted" class="mr-2" />
        All Inventory Items
        <v-chip class="ml-2" size="small" color="primary" variant="tonal">
          {{ currentValuation.topItems.length }} items
        </v-chip>
      </v-card-title>
      <v-card-text>
        <inventory-top-items-table
          :items="currentValuation.topItems"
          :total-inventory-value="currentValuation.totalValue"
          :loading="loading"
        />
      </v-card-text>
    </v-card>

    <!-- Empty State -->
    <v-card v-else-if="!loading">
      <v-card-text class="text-center py-12">
        <v-icon icon="mdi-warehouse" size="80" class="text-medium-emphasis mb-4" />
        <div class="text-h5 text-medium-emphasis mb-2">No Valuation Data</div>
        <div class="text-body-2 text-medium-emphasis mb-6">
          Click "Recalculate" to generate current inventory valuation
        </div>
        <v-btn
          color="primary"
          variant="flat"
          prepend-icon="mdi-calculator"
          @click="calculateValuation"
        >
          Calculate Valuation
        </v-btn>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useInventoryValuationStore } from '@/stores/analytics/inventoryValuationStore'
import InventoryTopItemsTable from './components/inventory/InventoryTopItemsTable.vue'
import { TimeUtils } from '@/utils'

// Store
const inventoryValuationStore = useInventoryValuationStore()
const { currentValuation, loading, error } = storeToRefs(inventoryValuationStore)

// Computed
const totalBatchCount = computed(() => {
  if (!currentValuation.value) return 0
  return (
    currentValuation.value.byType.products.batchCount +
    currentValuation.value.byType.preparations.batchCount
  )
})

const totalItemCount = computed(() => {
  if (!currentValuation.value) return 0
  return (
    currentValuation.value.byType.products.itemCount +
    currentValuation.value.byType.preparations.itemCount
  )
})

// Methods
async function calculateValuation() {
  try {
    await inventoryValuationStore.calculateValuation()
  } catch (err) {
    console.error('Failed to calculate valuation:', err)
  }
}

function exportReport() {
  if (!currentValuation.value) return

  const json = inventoryValuationStore.exportValuationToJSON(currentValuation.value)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `inventory-valuation-${TimeUtils.getCurrentLocalISO()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function getPercentage(value: number): number {
  if (!currentValuation.value || currentValuation.value.totalValue === 0) return 0
  return (value / currentValuation.value.totalValue) * 100
}

function formatPercentage(value: number): string {
  if (!currentValuation.value || currentValuation.value.totalValue === 0) return '0.00'
  return ((value / currentValuation.value.totalValue) * 100).toFixed(2)
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function formatDateTime(dateString: string): string {
  return TimeUtils.formatDateTimeForDisplay(dateString)
}

// Lifecycle
onMounted(() => {
  // Calculate valuation on mount if not already calculated
  if (!currentValuation.value) {
    calculateValuation()
  }
})
</script>

<style lang="scss" scoped>
.inventory-valuation-view {
  .gap-2 {
    gap: 8px;
  }

  .gap-3 {
    gap: 12px;
  }
}
</style>
