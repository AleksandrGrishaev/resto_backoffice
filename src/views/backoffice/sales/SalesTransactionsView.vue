<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <h1 class="text-h4 mb-4">Sales Transactions</h1>
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
              v-model="filters.paymentMethod"
              :items="paymentMethods"
              label="Payment Method"
              variant="outlined"
              density="compact"
              clearable
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

    <!-- Transactions Table -->
    <v-card>
      <v-card-text>
        <v-data-table
          :headers="headers"
          :items="transactions"
          :loading="loading"
          :items-per-page="25"
          density="compact"
        >
          <template #[`item.soldAt`]="{ item }">
            {{ formatDateTime(item.soldAt) }}
          </template>

          <template #[`item.menuItemName`]="{ item }">
            <div>
              <div class="font-weight-bold">{{ item.menuItemName }}</div>
              <div v-if="item.variantName" class="text-caption text-grey">
                {{ item.variantName }}
              </div>
            </div>
          </template>

          <template #[`item.quantity`]="{ item }">
            <v-chip size="small">{{ item.quantity }}</v-chip>
          </template>

          <template #[`item.totalPrice`]="{ item }">
            {{ formatCurrency(item.totalPrice) }}
          </template>

          <template #[`item.finalRevenue`]="{ item }">
            {{ formatCurrency(item.profitCalculation.finalRevenue) }}
          </template>

          <template #[`item.cost`]="{ item }">
            {{ formatCurrency(item.profitCalculation.ingredientsCost) }}
          </template>

          <template #[`item.profit`]="{ item }">
            <span class="text-success font-weight-bold">
              {{ formatCurrency(item.profitCalculation.profit) }}
            </span>
          </template>

          <template #[`item.margin`]="{ item }">
            <v-chip :color="getMarginColor(item.profitCalculation.profitMargin)" size="small">
              {{ formatPercent(item.profitCalculation.profitMargin) }}
            </v-chip>
          </template>

          <template #[`item.paymentMethod`]="{ item }">
            <v-chip size="small" class="text-capitalize">
              {{ item.paymentMethod }}
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
    <v-dialog v-model="detailsDialog" max-width="800">
      <v-card v-if="selectedTransaction">
        <v-card-title>
          <span class="text-h5">Transaction Details</span>
          <v-spacer />
          <v-btn icon="mdi-close" variant="text" @click="detailsDialog = false" />
        </v-card-title>

        <v-divider />

        <v-card-text>
          <!-- General Info -->
          <v-row>
            <v-col cols="12" md="6">
              <div class="mb-2">
                <span class="text-caption text-grey">Item:</span>
                <div class="font-weight-bold">
                  {{ selectedTransaction.menuItemName }}
                  <span v-if="selectedTransaction.variantName">
                    - {{ selectedTransaction.variantName }}
                  </span>
                </div>
              </div>
              <div class="mb-2">
                <span class="text-caption text-grey">Quantity:</span>
                <div class="font-weight-bold">{{ selectedTransaction.quantity }}</div>
              </div>
              <div class="mb-2">
                <span class="text-caption text-grey">Sold At:</span>
                <div class="font-weight-bold">
                  {{ formatDateTime(selectedTransaction.soldAt) }}
                </div>
              </div>
              <div class="mb-2">
                <span class="text-caption text-grey">Payment Method:</span>
                <div class="font-weight-bold text-capitalize">
                  {{ selectedTransaction.paymentMethod }}
                </div>
              </div>
            </v-col>

            <v-col cols="12" md="6">
              <div class="mb-2">
                <span class="text-caption text-grey">Department:</span>
                <div class="font-weight-bold text-capitalize">
                  {{ selectedTransaction.department }}
                </div>
              </div>
              <div class="mb-2">
                <span class="text-caption text-grey">Processed By:</span>
                <div class="font-weight-bold">{{ selectedTransaction.processedBy }}</div>
              </div>
              <div class="mb-2">
                <span class="text-caption text-grey">Order ID:</span>
                <div class="text-caption">{{ selectedTransaction.orderId }}</div>
              </div>
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <!-- Profit Calculation -->
          <h3 class="text-h6 mb-3">Profit Calculation</h3>
          <v-row>
            <v-col cols="12" md="6">
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title>Original Price</v-list-item-title>
                  <template #append>
                    {{ formatCurrency(selectedTransaction.profitCalculation.originalPrice) }}
                  </template>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Item Discount</v-list-item-title>
                  <template #append>
                    -{{ formatCurrency(selectedTransaction.profitCalculation.itemOwnDiscount) }}
                  </template>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>Bill Discount (allocated)</v-list-item-title>
                  <template #append>
                    -{{
                      formatCurrency(selectedTransaction.profitCalculation.allocatedBillDiscount)
                    }}
                  </template>
                </v-list-item>
                <v-divider class="my-2" />
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Final Revenue</v-list-item-title>
                  <template #append>
                    <span class="font-weight-bold">
                      {{ formatCurrency(selectedTransaction.profitCalculation.finalRevenue) }}
                    </span>
                  </template>
                </v-list-item>
              </v-list>
            </v-col>

            <v-col cols="12" md="6">
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title>Ingredients Cost</v-list-item-title>
                  <template #append>
                    {{ formatCurrency(selectedTransaction.profitCalculation.ingredientsCost) }}
                  </template>
                </v-list-item>
                <v-divider class="my-2" />
                <v-list-item>
                  <v-list-item-title class="font-weight-bold text-success">
                    Profit
                  </v-list-item-title>
                  <template #append>
                    <span class="font-weight-bold text-success">
                      {{ formatCurrency(selectedTransaction.profitCalculation.profit) }}
                    </span>
                  </template>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title class="font-weight-bold">Profit Margin</v-list-item-title>
                  <template #append>
                    <span class="font-weight-bold">
                      {{ formatPercent(selectedTransaction.profitCalculation.profitMargin) }}
                    </span>
                  </template>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <!-- Decomposition -->
          <h3 class="text-h6 mb-3">Ingredients Used (FIFO Cost)</h3>
          <v-data-table
            :headers="ingredientHeaders"
            :items="actualCostItems"
            density="compact"
            :items-per-page="10"
          >
            <template #[`item.quantity`]="{ item }">{{ item.quantity }} {{ item.unit }}</template>
            <template #[`item.costPerUnit`]="{ item }">
              {{ formatCurrency(item.costPerUnit) }}
            </template>
            <template #[`item.totalCost`]="{ item }">
              {{ formatCurrency(item.totalCost) }}
            </template>
          </v-data-table>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
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
import { ref, computed, onMounted } from 'vue'
import { useSalesStore } from '@/stores/sales'
import type { SalesTransaction, SalesFilters } from '@/stores/sales'

const salesStore = useSalesStore()

// State
const loading = ref(false)
const showError = ref(false)
const errorMessage = ref('')
const transactions = ref<SalesTransaction[]>([])
const detailsDialog = ref(false)
const selectedTransaction = ref<SalesTransaction | null>(null)

// ✅ Computed: Combine actualCost items for display
const actualCostItems = computed(() => {
  if (!selectedTransaction.value?.actualCost) {
    // Fallback to decomposition summary for old transactions
    return selectedTransaction.value?.decompositionSummary?.decomposedItems || []
  }

  const actualCost = selectedTransaction.value.actualCost
  const items: any[] = []

  // Add preparation costs
  if (actualCost.preparationCosts) {
    actualCost.preparationCosts.forEach(prep => {
      items.push({
        productName: prep.preparationName,
        quantity: prep.quantity,
        unit: prep.unit,
        costPerUnit: prep.averageCostPerUnit,
        totalCost: prep.totalCost,
        type: 'preparation'
      })
    })
  }

  // Add product costs
  if (actualCost.productCosts) {
    actualCost.productCosts.forEach(product => {
      items.push({
        productName: product.productName,
        quantity: product.quantity,
        unit: product.unit,
        costPerUnit: product.averageCostPerUnit,
        totalCost: product.totalCost,
        type: 'product'
      })
    })
  }

  return items
})

// Filters
const filters = ref<SalesFilters>({
  dateFrom: getDefaultDateFrom(),
  dateTo: getDefaultDateTo()
})

const paymentMethods = [
  { title: 'Cash', value: 'cash' },
  { title: 'Card', value: 'card' },
  { title: 'QR', value: 'qr' }
]

const departments = [
  { title: 'Kitchen', value: 'kitchen' },
  { title: 'Bar', value: 'bar' }
]

// Table headers
const headers = [
  { title: 'Date & Time', key: 'soldAt', sortable: true },
  { title: 'Item', key: 'menuItemName', sortable: true },
  { title: 'Qty', key: 'quantity', sortable: true },
  { title: 'Original', key: 'totalPrice', sortable: true },
  { title: 'Revenue', key: 'finalRevenue', sortable: true },
  { title: 'Cost', key: 'cost', sortable: true },
  { title: 'Profit', key: 'profit', sortable: true },
  { title: 'Margin', key: 'margin', sortable: true },
  { title: 'Payment', key: 'paymentMethod', sortable: true },
  { title: 'Dept', key: 'department', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false }
]

const ingredientHeaders = [
  { title: 'Product', key: 'productName' },
  { title: 'Quantity', key: 'quantity' },
  { title: 'Cost/Unit', key: 'costPerUnit' },
  { title: 'Total Cost', key: 'totalCost' }
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

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date)
}

function getMarginColor(margin: number): string {
  if (margin >= 70) return 'success'
  if (margin >= 50) return 'info'
  if (margin >= 30) return 'warning'
  return 'error'
}

async function applyFilters() {
  loading.value = true
  showError.value = false

  try {
    const result = await salesStore.fetchTransactions(filters.value)
    transactions.value = result
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Failed to load transactions'
    showError.value = true
  } finally {
    loading.value = false
  }
}

function clearFilters() {
  filters.value = {
    dateFrom: getDefaultDateFrom(),
    dateTo: getDefaultDateTo()
  }
  applyFilters()
}

function showDetails(transaction: SalesTransaction) {
  selectedTransaction.value = transaction
  detailsDialog.value = true
}

// Initialize
onMounted(async () => {
  await applyFilters()
})
</script>

<style scoped>
.text-success {
  color: rgb(var(--v-theme-success));
}
</style>
