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
                Variant: {{ item.variantId }}
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
          <h3 class="text-h6 mb-3">Written Off Items</h3>
          <v-data-table
            :headers="itemHeaders"
            :items="selectedWriteOff.writeOffItems"
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
import { ref, onMounted } from 'vue'
import { useRecipeWriteOffStore } from '@/stores/sales'
import { useMenuStore } from '@/stores/menu/menuStore'
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

function getTotalCost(writeOff: RecipeWriteOff): number {
  return writeOff.writeOffItems.reduce((sum, item) => sum + item.totalCost, 0)
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

function showDetails(writeOff: RecipeWriteOff) {
  selectedWriteOff.value = writeOff
  detailsDialog.value = true
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
