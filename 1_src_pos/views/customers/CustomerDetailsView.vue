<!-- src/views/customers/CustomerDetailsView.vue -->
<template>
  <v-layout>
    <!-- App Bar -->
    <v-app-bar flat>
      <v-container class="d-flex align-center px-4">
        <v-btn icon @click="router.back()">
          <v-icon icon="mdi-arrow-left" />
        </v-btn>
        <v-app-bar-title>Customer Details</v-app-bar-title>
        <v-spacer />
        <v-chip :color="customerStatusColor" size="small">
          {{ customer?.status }}
        </v-chip>
        <v-btn color="primary" class="ml-2" @click="showEditDialog = true">Edit Customer</v-btn>
      </v-container>
    </v-app-bar>

    <!-- Main Content -->
    <v-main>
      <v-container v-if="customer" class="fill-height pa-4 mt-15">
        <!-- Customer Info Card -->
        <v-row>
          <v-col cols="12" md="4">
            <v-card variant="outlined">
              <!-- Customer card content -->
              <v-card-item>
                <div class="d-flex flex-column">
                  <div class="text-h6 mb-2">{{ customer.firstName }} {{ customer.lastName }}</div>
                  <div
                    v-if="customer.phone"
                    class="text-body-2 text-medium-emphasis d-flex align-center mb-1"
                  >
                    <v-icon size="small" start icon="mdi-phone" class="mr-1" />
                    {{ customer.phone }}
                  </div>
                  <div
                    v-if="customer.email"
                    class="text-body-2 text-medium-emphasis d-flex align-center mb-1"
                  >
                    <v-icon size="small" start icon="mdi-email" class="mr-1" />
                    {{ customer.email }}
                  </div>
                  <div class="text-body-2 text-medium-emphasis d-flex align-center">
                    <v-icon size="small" start icon="mdi-calendar" class="mr-1" />
                    Since {{ formatDate(customer.registrationDate) }}
                  </div>
                </div>
              </v-card-item>
              <v-divider />
              <v-card-text class="mt-2">
                <div class="d-flex justify-space-between mb-2">
                  <span class="text-medium-emphasis">Total Spent:</span>
                  <span class="font-weight-medium">
                    {{ formatAmount(customerStats.totalSpent) }}
                  </span>
                </div>
                <div class="d-flex justify-space-between mb-2">
                  <span class="text-medium-emphasis">Average Check:</span>
                  <span class="font-weight-medium">
                    {{ formatAmount(customerStats.averageCheck) }}
                  </span>
                </div>
                <div class="d-flex justify-space-between">
                  <span class="text-medium-emphasis">Visits:</span>
                  <span class="font-weight-medium">{{ customerStats.visitsCount }}</span>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="8">
            <!-- History -->
            <v-card variant="outlined">
              <v-card-title class="px-4 py-3">Order History</v-card-title>
              <v-divider />
              <v-data-table
                :headers="historyHeaders"
                :items="customerBillHistory"
                :loading="loading"
                hover
              >
                <template #[`item.date`]="{ item }">
                  {{ formatDate(item.date) }}
                </template>
                <template #[`item.totalAmount`]="{ item }">
                  {{ formatAmount(item.totalAmount) }}
                </template>
                <template #[`item.actions`]="{ item }">
                  <v-btn
                    icon="mdi-eye"
                    variant="text"
                    size="small"
                    @click="viewBillDetails(item.id)"
                  />
                </template>
              </v-data-table>
            </v-card>
          </v-col>
        </v-row>

        <!-- Favorite Items Section -->
        <v-row class="mt-4">
          <v-col cols="12">
            <v-card variant="outlined">
              <v-card-title class="px-4 py-3">Favorite Items</v-card-title>
              <v-divider />
              <v-data-table
                :headers="favoriteItemsHeaders"
                :items="customerFavoriteItems"
                :loading="loading"
              >
                <template #[`item.totalSpent`]="{ item }">
                  {{ formatAmount(item.totalSpent) }}
                </template>
                <template #[`item.lastOrdered`]="{ item }">
                  {{ formatDate(item.lastOrdered) }}
                </template>
              </v-data-table>
            </v-card>
          </v-col>
        </v-row>
      </v-container>

      <!-- Loading State -->
      <v-container v-else-if="loading" class="d-flex fill-height align-center justify-center">
        <v-progress-circular indeterminate color="primary" />
      </v-container>
    </v-main>

    <!-- Edit Dialog -->
    <customer-dialog
      v-model="showEditDialog"
      :customer="customer"
      @updated="handleCustomerUpdated"
    />
  </v-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/customer.store'
import CustomerDialog from '@/components/customer/CustomerDialog.vue'
import { formatAmount } from '@/utils/formatter'
import { TimeUtils } from '@/utils/time'
import type { CustomerBillHistory, CustomerFavoriteItem, Customer } from '@/types/customer'
import { DebugUtils } from '@/utils'
import { type DataTableHeader } from 'vuetify/labs/VDataTable'

const MODULE_NAME = 'CustomerDetailsView'

// Router
const route = useRoute()
const router = useRouter()

// Store
const customerStore = useCustomerStore()

// State
const loading = ref(true)
const showEditDialog = ref(false)

// Customer Data
const customer = computed(() => customerStore.getCustomerById(route.params.id as string))

const customerStatusColor = computed(() => {
  switch (customer.value?.status) {
    case 'active':
      return 'success'
    case 'inactive':
      return 'warning'
    case 'blacklisted':
      return 'error'
    default:
      return 'grey'
  }
})

/// Define the type for history items and use it
interface HistoryItem {
  id: string
  date: string
  itemsCount: number
  totalAmount: number
}

// Define the type for favorite items and use it
interface FavoriteItem {
  id: string
  name: string
  orderCount: number
  lastOrdered: string
  totalSpent: number
}

const customerStats = ref({
  totalSpent: 0,
  visitsCount: 0,
  averageCheck: 0
})

const formatDate = (date: string) => TimeUtils.formatDateToDisplay(date)

// Table Headers with proper typing
const historyHeaders: DataTableHeader[] = [
  { title: 'Date', align: 'start', key: 'date' },
  { title: 'Items', align: 'center', key: 'itemsCount' },
  { title: 'Total', align: 'end', key: 'totalAmount' },
  { title: 'Actions', align: 'end', key: 'actions', sortable: false }
]

const favoriteItemsHeaders: DataTableHeader[] = [
  { title: 'Item', align: 'start', key: 'name' },
  { title: 'Orders', align: 'center', key: 'orderCount' },
  { title: 'Total Spent', align: 'end', key: 'totalSpent' },
  { title: 'Last Ordered', align: 'end', key: 'lastOrdered' }
]

// Update your data refs to use the types
const customerBillHistory = ref<HistoryItem[]>([])
const customerFavoriteItems = ref<FavoriteItem[]>([])

// Methods
async function loadCustomerData() {
  try {
    loading.value = true
    DebugUtils.debug(MODULE_NAME, 'Loading customer data', { customerId: route.params.id })

    const [history, favorites, stats] = await Promise.all([
      customerStore.getCustomerBillHistory(route.params.id as string),
      customerStore.getCustomerFavoriteItems(route.params.id as string),
      customerStore.getCustomerStatistics(route.params.id as string)
    ])

    customerBillHistory.value = history
    customerFavoriteItems.value = favorites
    customerStats.value = stats
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load customer data', error)
  } finally {
    loading.value = false
  }
}

function viewBillDetails(billId: string) {
  // TODO: Implement bill details view navigation
  DebugUtils.debug(MODULE_NAME, 'Viewing bill details', { billId })
}

function handleCustomerUpdated(_: Customer) {
  showEditDialog.value = false
  loadCustomerData()
}

// Lifecycle
onMounted(() => {
  if (!route.params.id) {
    router.replace({ name: 'customers' })
    return
  }
  loadCustomerData()
})
</script>

<style scoped></style>
