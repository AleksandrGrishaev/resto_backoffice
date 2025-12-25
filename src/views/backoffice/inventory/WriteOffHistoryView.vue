<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Write-off History</h1>
      </v-col>
    </v-row>

    <!-- Filters -->
    <v-card class="mb-4">
      <v-card-text>
        <v-row>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="filters.dateFrom"
              label="Date From"
              type="date"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field
              v-model="filters.dateTo"
              label="Date To"
              type="date"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="filters.operationType"
              :items="operationTypes"
              label="Operation Type"
              variant="outlined"
              density="compact"
              hide-details
            />
          </v-col>
          <v-col cols="12" md="3">
            <v-select
              v-model="filters.department"
              :items="departments"
              label="Department"
              variant="outlined"
              density="compact"
              clearable
              hide-details
            />
          </v-col>
        </v-row>
        <v-row class="mt-2">
          <v-col cols="12">
            <v-btn color="primary" :loading="loading" @click="applyFilters">Apply Filters</v-btn>
            <v-btn variant="outlined" class="ml-2" @click="clearFilters">Clear</v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Summary Cards -->
    <v-row class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="text-caption text-grey">Total Write-offs</div>
            <div class="text-h5 mt-2">{{ summary?.totalWriteOffs || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="text-caption text-grey">Total Cost</div>
            <div class="text-h5 mt-2">{{ formatCurrency(summary?.totalCost || 0) }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="text-caption text-grey">Auto Sales Write-offs</div>
            <div class="text-h5 mt-2">{{ summary?.byType?.auto_sales_writeoff?.count || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text>
            <div class="text-caption text-grey">Total Items</div>
            <div class="text-h5 mt-2">{{ summary?.totalItems || 0 }}</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Write-offs Table -->
    <v-card>
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="writeOffs"
          :loading="loading"
          :items-per-page="25"
          density="compact"
        >
          <template #[`item.performedAt`]="{ item }">
            {{ formatDateTime(item.performedAt) }}
          </template>

          <template #[`item.menuItemId`]="{ item }">
            <div>
              <div class="font-weight-bold">{{ getMenuItemName(item.menuItemId) }}</div>
              <div v-if="item.variantId" class="text-caption text-grey">
                Variant: {{ getVariantName(item.menuItemId, item.variantId) }}
              </div>
            </div>
          </template>

          <template #[`item.soldQuantity`]="{ item }">
            <v-chip size="small">{{ item.soldQuantity }} portion(s)</v-chip>
          </template>

          <template #[`item.itemsCount`]="{ item }">
            <v-chip size="small" color="info">{{ item.writeOffItems.length }} items</v-chip>
          </template>

          <template #[`item.totalCost`]="{ item }">
            {{ formatCurrency(getTotalCost(item)) }}
          </template>

          <template #[`item.operationType`]="{ item }">
            <v-chip size="small" color="success">
              {{ item.operationType === 'auto_sales_writeoff' ? 'Auto (Sales)' : 'Manual' }}
            </v-chip>
          </template>

          <template #[`item.department`]="{ item }">
            <v-chip size="small" :color="item.department === 'kitchen' ? 'orange' : 'blue'">
              {{ item.department }}
            </v-chip>
          </template>

          <template #[`item.actions`]="{ item }">
            <v-btn
              size="small"
              variant="text"
              icon="mdi-eye"
              density="compact"
              @click="showDetails(item)"
            />
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Details Dialog -->
    <v-dialog v-model="detailsDialog" max-width="900">
      <v-card v-if="selectedWriteOff">
        <v-card-title>
          <span class="text-h5">Write-off Details</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="detailsDialog = false" />
        </v-card-title>

        <v-divider />

        <v-card-text>
          <!-- General Info -->
          <v-row>
            <v-col cols="12" md="6">
              <div class="mb-2">
                <span class="text-caption text-grey">Menu Item:</span>
                <div class="font-weight-bold">
                  {{ getMenuItemName(selectedWriteOff.menuItemId) }}
                </div>
              </div>
              <div class="mb-2">
                <span class="text-caption text-grey">Sold Quantity:</span>
                <div class="font-weight-bold">{{ selectedWriteOff.soldQuantity }} portion(s)</div>
              </div>
              <div class="mb-2">
                <span class="text-caption text-grey">Performed At:</span>
                <div class="font-weight-bold">
                  {{ formatDateTime(selectedWriteOff.performedAt) }}
                </div>
              </div>
            </v-col>

            <v-col cols="12" md="6">
              <div class="mb-2">
                <span class="text-caption text-grey">Department:</span>
                <div class="font-weight-bold text-capitalize">
                  {{ selectedWriteOff.department }}
                </div>
              </div>
              <div class="mb-2">
                <span class="text-caption text-grey">Operation Type:</span>
                <div class="font-weight-bold">
                  {{
                    selectedWriteOff.operationType === 'auto_sales_writeoff'
                      ? 'Auto (Sales)'
                      : 'Manual'
                  }}
                </div>
              </div>
              <div class="mb-2">
                <span class="text-caption text-grey">Performed By:</span>
                <div class="font-weight-bold">{{ selectedWriteOff.performedBy }}</div>
              </div>
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <!-- Write-off Items -->
          <h3 class="text-h6 mb-3">
            Written Off Items
            <v-chip
              v-if="actualCostData"
              size="small"
              color="success"
              class="ml-2"
              title="Using actual FIFO costs from batches"
            >
              FIFO Cost
            </v-chip>
            <v-chip
              v-else
              size="small"
              color="warning"
              class="ml-2"
              title="Using estimated costs from recipe decomposition"
            >
              Estimated Cost
            </v-chip>
          </h3>
          <v-data-table
            :headers="itemHeaders"
            :items="displayItems"
            density="compact"
            :items-per-page="20"
          >
            <template #[`item.quantityPerPortion`]="{ item }">
              {{ item.quantityPerPortion }} {{ item.unit }}
            </template>
            <template #[`item.totalQuantity`]="{ item }">
              <span class="font-weight-bold">{{ item.totalQuantity }} {{ item.unit }}</span>
            </template>
            <template #[`item.costPerUnit`]="{ item }">
              {{ formatCurrency(item.costPerUnit) }}
            </template>
            <template #[`item.totalCost`]="{ item }">
              <span class="font-weight-bold">{{ formatCurrency(item.totalCost) }}</span>
            </template>
            <template #[`item.batchIds`]="{ item }">
              <div v-if="item.batchIds && item.batchIds.length > 0">
                <v-chip v-for="batchId in item.batchIds" :key="batchId" size="x-small" class="ma-1">
                  {{ batchId.substring(0, 8) }}
                </v-chip>
              </div>
              <span v-else class="text-grey">-</span>
            </template>
          </v-data-table>

          <v-row class="mt-4">
            <v-col cols="12">
              <v-divider />
              <div class="text-right mt-2">
                <span class="text-h6">Total Cost:</span>
                <span class="text-h5 font-weight-bold ml-2">
                  {{ formatCurrency(getTotalCost(selectedWriteOff)) }}
                </span>
              </div>
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <!-- Decomposition Path (для отладки) -->
          <h3 class="text-h6 mb-3">Decomposition Details</h3>
          <v-expansion-panels>
            <v-expansion-panel>
              <v-expansion-panel-title>Show Decomposition Trace</v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-data-table
                  :headers="decompHeaders"
                  :items="selectedWriteOff.decomposedItems"
                  density="compact"
                  :items-per-page="20"
                >
                  <template #[`item.path`]="{ item }">
                    <div class="text-caption">{{ item.path.join(' → ') }}</div>
                  </template>
                </v-data-table>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            v-if="selectedWriteOff.salesTransactionId"
            variant="outlined"
            @click="viewSalesTransaction"
          >
            View Sales Transaction
          </v-btn>
          <v-btn variant="text" @click="detailsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showError" color="error" :timeout="5000">
      {{ errorMessage }}
      <template #actions>
        <v-btn variant="text" @click="showError = false">Close</v-btn>
      </template>
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRecipeWriteOffStore } from '@/stores/sales'
import { useMenuStore } from '@/stores/menu/menuStore'
import { supabase } from '@/supabase'
import type { RecipeWriteOff, WriteOffFilters, WriteOffSummary } from '@/stores/sales'

const recipeWriteOffStore = useRecipeWriteOffStore()
const menuStore = useMenuStore()

// State
const loading = ref(false)
const showError = ref(false)
const errorMessage = ref('')
const writeOffs = ref<RecipeWriteOff[]>([])
const summary = ref<WriteOffSummary | null>(null)
const detailsDialog = ref(false)
const selectedWriteOff = ref<RecipeWriteOff | null>(null)
const actualCostData = ref<any>(null) // Store actual_cost from sales_transactions (for details dialog)
const actualCostCache = ref<Map<string, number>>(new Map()) // Cache actual costs for table display

// Filters
const filters = ref<WriteOffFilters>({
  dateFrom: getDefaultDateFrom(),
  dateTo: getDefaultDateTo(),
  operationType: 'all'
})

const operationTypes = [
  { title: 'All', value: 'all' },
  { title: 'Auto (Sales)', value: 'auto_sales_writeoff' },
  { title: 'Manual', value: 'manual' }
]

const departments = [
  { title: 'Kitchen', value: 'kitchen' },
  { title: 'Bar', value: 'bar' }
]

// Table headers
const headers = [
  { title: 'Date & Time', key: 'performedAt', sortable: true },
  { title: 'Menu Item', key: 'menuItemId', sortable: true },
  { title: 'Qty Sold', key: 'soldQuantity', sortable: true },
  { title: 'Items Count', key: 'itemsCount', sortable: false },
  { title: 'Total Cost', key: 'totalCost', sortable: true },
  { title: 'Type', key: 'operationType', sortable: true },
  { title: 'Department', key: 'department', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]

const itemHeaders = [
  { title: 'Item Name', key: 'itemName' },
  { title: 'Per Portion', key: 'quantityPerPortion' },
  { title: 'Total Qty', key: 'totalQuantity' },
  { title: 'Cost/Unit', key: 'costPerUnit' },
  { title: 'Total Cost', key: 'totalCost' },
  { title: 'Batches', key: 'batchIds' }
]

const decompHeaders = [
  { title: 'Product', key: 'productName' },
  { title: 'Quantity', key: 'quantity' },
  { title: 'Unit', key: 'unit' },
  { title: 'Path', key: 'path' }
]

// Methods
function getDefaultDateFrom(): string {
  const date = new Date()
  date.setDate(date.getDate() - 7)
  return date.toISOString()
}

function getDefaultDateTo(): string {
  return new Date().toISOString()
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value)
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date)
}

function getMenuItemName(menuItemId: string): string {
  const menuItem = menuStore.menuItems.find(item => item.id === menuItemId)
  return menuItem?.name || menuItemId
}

function getVariantName(menuItemId: string, variantId: string): string {
  const menuItem = menuStore.menuItems.find(item => item.id === menuItemId)
  if (!menuItem) return variantId

  const variant = menuItem.variants?.find((v: any) => v.id === variantId)
  return variant?.name || variantId
}

// Computed property for displaying items with actual FIFO costs
const displayItems = computed(() => {
  if (!selectedWriteOff.value) {
    return []
  }

  // Check if actualCostData has any items
  const actualCost = actualCostData.value
  const hasActualCostItems =
    actualCost && (actualCost.preparationCosts?.length > 0 || actualCost.productCosts?.length > 0)

  // Fallback to writeOffItems if actual_cost is empty or has no items
  if (!hasActualCostItems) {
    return selectedWriteOff.value?.writeOffItems || []
  }

  const items: any[] = []

  // Map preparation costs
  if (actualCost.preparationCosts) {
    for (const prep of actualCost.preparationCosts) {
      // 🐛 DEBUG: Log preparation cost data
      console.log('🔍 Preparation cost from actual_cost:', {
        preparationId: prep.preparationId,
        preparationName: prep.preparationName,
        quantity: prep.quantity,
        unit: prep.unit,
        soldQuantity: selectedWriteOff.value?.soldQuantity,
        calculated_quantityPerPortion: prep.quantity / (selectedWriteOff.value?.soldQuantity || 1),
        calculated_totalQuantity: prep.quantity
      })

      items.push({
        itemName: prep.preparationName,
        quantityPerPortion: prep.quantity / (selectedWriteOff.value?.soldQuantity || 1),
        totalQuantity: prep.quantity,
        unit: prep.unit,
        costPerUnit: prep.averageCostPerUnit,
        totalCost: prep.totalCost,
        batchIds: prep.batchAllocations?.map((a: any) => a.batchId) || [],
        itemType: 'preparation'
      })
    }
  }

  // Map product costs
  if (actualCost.productCosts) {
    for (const prod of actualCost.productCosts) {
      items.push({
        itemName: prod.productName,
        quantityPerPortion: prod.quantity / (selectedWriteOff.value?.soldQuantity || 1),
        totalQuantity: prod.quantity,
        unit: prod.unit,
        costPerUnit: prod.averageCostPerUnit,
        totalCost: prod.totalCost,
        batchIds: prod.batchAllocations?.map((a: any) => a.batchId) || [],
        itemType: 'product'
      })
    }
  }

  return items
})

function getTotalCost(writeOff: RecipeWriteOff): number {
  // Calculate from writeOffItems (most reliable source)
  const writeOffItemsCost = writeOff.writeOffItems.reduce(
    (sum: number, item: any) => sum + (item.totalCost || 0),
    0
  )

  // If this is the selected write-off and we have actual cost data with value > 0, use it
  if (selectedWriteOff.value?.id === writeOff.id && actualCostData.value?.totalCost > 0) {
    return actualCostData.value.totalCost
  }

  // Check cache for actual cost (only if > 0)
  const cachedCost = actualCostCache.value.get(writeOff.id)
  if (cachedCost && cachedCost > 0) {
    return cachedCost
  }

  // Fallback to writeOffItems cost
  return writeOffItemsCost
}

async function loadActualCost(salesTransactionId: string) {
  try {
    const { data, error } = await supabase
      .from('sales_transactions')
      .select('actual_cost')
      .eq('id', salesTransactionId)
      .single()

    if (error) {
      console.error('Error loading actual cost:', error)
      actualCostData.value = null
      return
    }

    actualCostData.value = data?.actual_cost || null
    console.log('✅ Loaded actual cost from sales_transactions:', actualCostData.value)
  } catch (err) {
    console.error('Failed to load actual cost:', err)
    actualCostData.value = null
  }
}

async function loadActualCostsForAll(writeOffs: RecipeWriteOff[]) {
  // Get all sales transaction IDs
  const transactionIds = writeOffs.filter(w => w.salesTransactionId).map(w => w.salesTransactionId)

  if (transactionIds.length === 0) return

  try {
    // Load actual costs in batch
    const { data, error } = await supabase
      .from('sales_transactions')
      .select('id, actual_cost')
      .in('id', transactionIds)

    if (error) {
      console.error('Error loading actual costs:', error)
      return
    }

    // Build cache: writeOffId -> totalCost
    const newCache = new Map<string, number>()

    for (const writeOff of writeOffs) {
      if (!writeOff.salesTransactionId) continue

      const transaction = data?.find(t => t.id === writeOff.salesTransactionId)
      if (transaction?.actual_cost?.totalCost) {
        newCache.set(writeOff.id, transaction.actual_cost.totalCost)
      }
    }

    actualCostCache.value = newCache
    console.log(`✅ Loaded actual costs for ${newCache.size} write-offs`)
  } catch (err) {
    console.error('Failed to load actual costs:', err)
  }
}

async function applyFilters() {
  loading.value = true
  showError.value = false

  try {
    // Load write-offs
    const writeOffService = await import('@/stores/sales/recipeWriteOff/services')
    const result = await writeOffService.RecipeWriteOffService.getWriteOffs(filters.value)

    if (result.success && result.data) {
      writeOffs.value = result.data

      // Load actual costs for table display
      await loadActualCostsForAll(result.data)
    }

    // Load summary
    const summaryResult = await recipeWriteOffStore.getSummary(filters.value)
    if (summaryResult) {
      summary.value = summaryResult
    }
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to load write-offs'
    showError.value = true
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  filters.value = {
    dateFrom: getDefaultDateFrom(),
    dateTo: getDefaultDateTo(),
    operationType: 'all'
  }
  applyFilters()
}

async function showDetails(writeOff: RecipeWriteOff) {
  selectedWriteOff.value = writeOff
  detailsDialog.value = true
  actualCostData.value = null // Reset

  // Load actual cost from sales_transactions if available
  if (writeOff.salesTransactionId) {
    await loadActualCost(writeOff.salesTransactionId)
  }
}

function viewSalesTransaction() {
  // TODO: Navigate to sales transaction view with filter
  console.log('Navigate to sales transaction:', selectedWriteOff.value?.salesTransactionId)
}

// Initialize
onMounted(async () => {
  await applyFilters()
})
</script>
