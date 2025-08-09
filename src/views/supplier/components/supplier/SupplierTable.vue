<!-- src/views/supplier/components/supplier/SupplierTable.vue -->
<template>
  <div class="supplier-table">
    <!-- Filters and Actions -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div class="d-flex align-center gap-2">
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Search suppliers..."
          variant="outlined"
          density="compact"
          hide-details
          style="width: 300px"
          clearable
        />

        <v-select
          v-model="typeFilter"
          :items="supplierTypeOptions"
          label="Type"
          variant="outlined"
          density="compact"
          hide-details
          style="width: 150px"
        />

        <v-select
          v-model="reliabilityFilter"
          :items="reliabilityOptions"
          label="Reliability"
          variant="outlined"
          density="compact"
          hide-details
          style="width: 150px"
        />

        <v-btn
          v-if="hasActiveFilters"
          color="warning"
          variant="outlined"
          size="small"
          prepend-icon="mdi-filter-off"
          @click="clearFilters"
        >
          Clear Filters
        </v-btn>
      </div>

      <v-btn
        color="success"
        variant="outlined"
        prepend-icon="mdi-plus"
        @click="$emit('edit-supplier', null)"
      >
        Add Supplier
      </v-btn>
    </div>

    <!-- Active Filters Display -->
    <div v-if="hasActiveFilters" class="mb-3">
      <div class="d-flex align-center gap-2">
        <span class="text-caption text-medium-emphasis">Active filters:</span>

        <v-chip
          v-if="typeFilter !== 'all'"
          size="small"
          closable
          color="primary"
          @click:close="typeFilter = 'all'"
        >
          Type: {{ getSupplierTypeName(typeFilter) }}
        </v-chip>

        <v-chip
          v-if="reliabilityFilter !== 'all'"
          size="small"
          closable
          color="info"
          @click:close="reliabilityFilter = 'all'"
        >
          Reliability: {{ getReliabilityName(reliabilityFilter) }}
        </v-chip>

        <v-chip
          v-if="statusFilter !== 'all'"
          size="small"
          closable
          :color="statusFilter === 'active' ? 'success' : 'error'"
          @click:close="statusFilter = 'all'"
        >
          Status: {{ statusFilter === 'active' ? 'Active' : 'Inactive' }}
        </v-chip>
      </div>
    </div>

    <!-- Table -->
    <v-card>
      <v-data-table
        v-model="selectedSuppliers"
        :headers="headers"
        :items="filteredSuppliers"
        :loading="loading"
        :search="searchQuery"
        item-key="id"
        class="elevation-0"
        :items-per-page="15"
        :sort-by="[{ key: 'name', order: 'asc' }]"
        show-select
      >
        <!-- Supplier Name -->
        <template #[`item.name`]="{ item }">
          <div class="d-flex align-center">
            <div class="supplier-icon mr-3">
              {{ getSupplierIcon(item.type) }}
            </div>
            <div class="supplier-info">
              <div class="font-weight-medium">{{ item.name }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ getSupplierTypeName(item.type) }}
                <span v-if="item.contactPerson" class="ml-2">• {{ item.contactPerson }}</span>
              </div>
              <div v-if="item.phone || item.email" class="text-caption text-medium-emphasis mt-1">
                <span v-if="item.phone">
                  <v-icon icon="mdi-phone" size="12" class="mr-1" />
                  {{ item.phone }}
                </span>
                <span v-if="item.email" :class="item.phone ? 'ml-2' : ''">
                  <v-icon icon="mdi-email" size="12" class="mr-1" />
                  {{ item.email }}
                </span>
              </div>
            </div>
          </div>
        </template>

        <!-- Products & Categories -->
        <template #[`item.products`]="{ item }">
          <div>
            <div class="font-weight-medium">
              {{ item.products.length }} product{{ item.products.length !== 1 ? 's' : '' }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ item.categories.join(', ') || 'No categories' }}
            </div>
            <div v-if="item.categories.length > 0" class="mt-1">
              <v-chip
                v-for="category in item.categories.slice(0, 2)"
                :key="category"
                size="x-small"
                variant="tonal"
                color="primary"
                class="mr-1"
              >
                {{ getCategoryDisplayName(category) }}
              </v-chip>
              <v-chip
                v-if="item.categories.length > 2"
                size="x-small"
                variant="outlined"
                color="primary"
              >
                +{{ item.categories.length - 2 }}
              </v-chip>
            </div>
          </div>
        </template>

        <!-- Orders & Statistics -->
        <template #[`item.orders`]="{ item }">
          <div>
            <div class="font-weight-medium">{{ item.totalOrders || 0 }} orders</div>
            <div class="text-caption text-medium-emphasis">
              {{ formatCurrency(item.totalOrderValue || 0) }}
            </div>
            <div v-if="item.averageOrderValue" class="text-caption text-medium-emphasis">
              Avg: {{ formatCurrency(item.averageOrderValue) }}
            </div>
            <div v-if="item.lastOrderDate" class="text-caption text-primary">
              Last: {{ formatDate(item.lastOrderDate) }}
            </div>
          </div>
        </template>

        <!-- Financial Balance -->
        <template #[`item.balance`]="{ item }">
          <div class="text-right">
            <div class="font-weight-medium" :class="getBalanceColor(item.currentBalance)">
              {{ formatCurrency(Math.abs(item.currentBalance)) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ getBalanceDescription(item.currentBalance) }}
            </div>
            <div v-if="item.totalPaid" class="text-caption text-medium-emphasis">
              Paid: {{ formatCurrency(item.totalPaid) }}
            </div>
          </div>
        </template>

        <!-- Payment Terms -->
        <template #[`item.paymentTerms`]="{ item }">
          <v-chip :color="getPaymentTermsColor(item.paymentTerms)" size="small" variant="tonal">
            {{ getPaymentTermsName(item.paymentTerms) }}
          </v-chip>
        </template>

        <!-- Reliability -->
        <template #[`item.reliability`]="{ item }">
          <div class="d-flex align-center">
            <v-chip :color="getReliabilityColor(item.reliability)" size="small" variant="flat">
              {{ getReliabilityName(item.reliability) }}
            </v-chip>
            <v-rating
              :model-value="getReliabilityRating(item.reliability)"
              readonly
              size="x-small"
              color="warning"
              class="ml-2"
              density="compact"
            />
          </div>
        </template>

        <!-- Status -->
        <template #[`item.status`]="{ item }">
          <v-chip :color="item.isActive ? 'success' : 'error'" size="small" variant="flat">
            <v-icon
              :icon="item.isActive ? 'mdi-check-circle' : 'mdi-close-circle'"
              size="14"
              class="mr-1"
            />
            {{ item.isActive ? 'Active' : 'Inactive' }}
          </v-chip>
        </template>

        <!-- Actions -->
        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-center gap-1">
            <v-btn
              size="small"
              variant="text"
              color="primary"
              icon="mdi-eye"
              @click="$emit('view-details', item)"
            >
              <v-icon />
              <v-tooltip activator="parent" location="top">View Details</v-tooltip>
            </v-btn>

            <v-btn
              size="small"
              variant="text"
              color="warning"
              icon="mdi-pencil"
              @click="$emit('edit-supplier', item)"
            >
              <v-icon />
              <v-tooltip activator="parent" location="top">Edit Supplier</v-tooltip>
            </v-btn>

            <v-menu>
              <template #activator="{ props }">
                <v-btn
                  size="small"
                  variant="text"
                  color="info"
                  icon="mdi-dots-vertical"
                  v-bind="props"
                >
                  <v-icon />
                  <v-tooltip activator="parent" location="top">More Actions</v-tooltip>
                </v-btn>
              </template>

              <v-list density="compact">
                <v-list-item @click="createPurchaseOrder(item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-cart-plus" class="mr-2" />
                    Create Order
                  </v-list-item-title>
                </v-list-item>

                <v-list-item @click="viewOrderHistory(item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-history" class="mr-2" />
                    Order History
                  </v-list-item-title>
                </v-list-item>

                <v-list-item @click="viewFinancialStatement(item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-file-document" class="mr-2" />
                    Financial Statement
                  </v-list-item-title>
                </v-list-item>

                <v-divider />

                <v-list-item
                  :class="item.isActive ? 'text-error' : 'text-success'"
                  @click="toggleSupplierStatus(item)"
                >
                  <v-list-item-title>
                    <v-icon
                      :icon="item.isActive ? 'mdi-close-circle' : 'mdi-check-circle'"
                      class="mr-2"
                    />
                    {{ item.isActive ? 'Deactivate' : 'Activate' }}
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </template>

        <!-- No data -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon icon="mdi-store-off" size="64" class="text-medium-emphasis mb-4" />
            <div class="text-h6 text-medium-emphasis mb-2">
              {{ hasActiveFilters ? 'No suppliers match filters' : 'No suppliers found' }}
            </div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              {{
                hasActiveFilters
                  ? 'Try adjusting or clearing your filters'
                  : 'Add your first supplier to start procurement management'
              }}
            </div>
            <div v-if="hasActiveFilters" class="d-flex justify-center gap-2">
              <v-btn size="small" variant="outlined" @click="clearFilters">Clear Filters</v-btn>
            </div>
            <div v-else class="d-flex justify-center gap-2">
              <v-btn color="success" variant="flat" @click="$emit('edit-supplier', null)">
                <v-icon icon="mdi-plus-circle" class="mr-2" />
                Add Supplier
              </v-btn>
            </div>
          </div>
        </template>

        <!-- Loading -->
        <template #loading>
          <div class="text-center py-8">
            <v-progress-circular indeterminate color="primary" class="mb-2" />
            <div>Loading suppliers...</div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Bulk Actions (when suppliers are selected) -->
    <v-expand-transition>
      <v-card v-if="selectedSuppliers.length > 0" variant="tonal" color="primary" class="mt-4">
        <v-card-text class="d-flex align-center justify-space-between">
          <div>
            <div class="font-weight-medium">
              {{ selectedSuppliers.length }} supplier{{ selectedSuppliers.length !== 1 ? 's' : '' }}
              selected
            </div>
            <div class="text-caption">Choose an action to apply to selected suppliers</div>
          </div>

          <div class="d-flex gap-2">
            <v-btn
              color="success"
              variant="outlined"
              size="small"
              prepend-icon="mdi-cart-plus"
              @click="createBulkOrder"
            >
              Create Orders
            </v-btn>

            <v-btn
              color="warning"
              variant="outlined"
              size="small"
              prepend-icon="mdi-export"
              @click="exportSelected"
            >
              Export
            </v-btn>

            <v-btn
              color="error"
              variant="outlined"
              size="small"
              prepend-icon="mdi-close-circle"
              @click="deactivateSelected"
            >
              Deactivate
            </v-btn>

            <v-btn variant="text" size="small" @click="selectedSuppliers = []">
              Clear Selection
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-expand-transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  formatCurrency,
  formatDate,
  getSupplierIcon,
  getSupplierTypeName,
  getPaymentTermsName,
  getReliabilityName,
  getReliabilityColor,
  SUPPLIER_TYPES,
  RELIABILITY_LEVELS,
  PRODUCT_CATEGORIES
} from '@/stores/supplier'
import type { Supplier } from '@/stores/supplier'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'SupplierTable'

// Props
interface Props {
  suppliers: Supplier[]
  loading: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'edit-supplier': [supplier: Supplier | null]
  'view-details': [supplier: Supplier]
}>()

// State
const searchQuery = ref('')
const typeFilter = ref('all')
const reliabilityFilter = ref('all')
const statusFilter = ref('all')
const selectedSuppliers = ref<Supplier[]>([])

// Data
const supplierTypeOptions = [
  { title: 'All Types', value: 'all' },
  ...Object.entries(SUPPLIER_TYPES).map(([value, title]) => ({ title, value }))
]

const reliabilityOptions = [
  { title: 'All Ratings', value: 'all' },
  ...Object.entries(RELIABILITY_LEVELS).map(([value, title]) => ({ title, value }))
]

const statusOptions = [
  { title: 'All Status', value: 'all' },
  { title: 'Active Only', value: 'active' },
  { title: 'Inactive Only', value: 'inactive' }
]

// Computed
const headers = computed(() => [
  { title: 'Supplier', key: 'name', sortable: true, width: '300px' },
  { title: 'Products', key: 'products', sortable: false, width: '200px' },
  { title: 'Orders & Stats', key: 'orders', sortable: true, value: 'totalOrders', width: '150px' },
  { title: 'Balance', key: 'balance', sortable: true, value: 'currentBalance', width: '140px' },
  { title: 'Payment Terms', key: 'paymentTerms', sortable: true, width: '120px' },
  { title: 'Reliability', key: 'reliability', sortable: true, width: '140px' },
  { title: 'Status', key: 'status', sortable: true, value: 'isActive', width: '100px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '120px' }
])

const filteredSuppliers = computed(() => {
  let suppliers = [...props.suppliers]

  // Type filter
  if (typeFilter.value !== 'all') {
    suppliers = suppliers.filter(s => s.type === typeFilter.value)
  }

  // Reliability filter
  if (reliabilityFilter.value !== 'all') {
    suppliers = suppliers.filter(s => s.reliability === reliabilityFilter.value)
  }

  // Status filter
  if (statusFilter.value !== 'all') {
    const isActive = statusFilter.value === 'active'
    suppliers = suppliers.filter(s => s.isActive === isActive)
  }

  return suppliers
})

const hasActiveFilters = computed(
  () =>
    typeFilter.value !== 'all' || reliabilityFilter.value !== 'all' || statusFilter.value !== 'all'
)

// Methods
function getBalanceColor(balance: number): string {
  if (balance < 0) return 'text-error' // we owe them
  if (balance > 0) return 'text-success' // they owe us
  return 'text-medium-emphasis'
}

function getBalanceDescription(balance: number): string {
  if (balance < 0) return 'We owe'
  if (balance > 0) return 'They owe'
  return 'Balanced'
}

function getPaymentTermsColor(terms: string): string {
  const colors = {
    prepaid: 'success',
    on_delivery: 'warning',
    monthly: 'info',
    custom: 'default'
  }
  return colors[terms as keyof typeof colors] || 'default'
}

function getReliabilityRating(reliability: string): number {
  const ratings = {
    excellent: 5,
    good: 4,
    average: 3,
    poor: 2
  }
  return ratings[reliability as keyof typeof ratings] || 0
}

function getCategoryDisplayName(category: string): string {
  return PRODUCT_CATEGORIES[category as keyof typeof PRODUCT_CATEGORIES] || category
}

function clearFilters() {
  typeFilter.value = 'all'
  reliabilityFilter.value = 'all'
  statusFilter.value = 'all'
  searchQuery.value = ''
}

// Action Methods
function createPurchaseOrder(supplier: Supplier) {
  DebugUtils.info(MODULE_NAME, 'Create purchase order for supplier', {
    supplierId: supplier.id,
    name: supplier.name
  })
  // TODO: Implement create purchase order
}

function viewOrderHistory(supplier: Supplier) {
  DebugUtils.info(MODULE_NAME, 'View order history for supplier', {
    supplierId: supplier.id,
    name: supplier.name
  })
  // TODO: Implement order history view
}

function viewFinancialStatement(supplier: Supplier) {
  DebugUtils.info(MODULE_NAME, 'View financial statement for supplier', {
    supplierId: supplier.id,
    name: supplier.name
  })
  // TODO: Implement financial statement view
}

function toggleSupplierStatus(supplier: Supplier) {
  DebugUtils.info(MODULE_NAME, 'Toggle supplier status', {
    supplierId: supplier.id,
    name: supplier.name,
    currentStatus: supplier.isActive
  })
  // TODO: Implement status toggle
}

// Bulk Actions
function createBulkOrder() {
  DebugUtils.info(MODULE_NAME, 'Create bulk order for selected suppliers', {
    count: selectedSuppliers.value.length,
    supplierIds: selectedSuppliers.value.map(s => s.id)
  })
  // TODO: Implement bulk order creation
}

function exportSelected() {
  DebugUtils.info(MODULE_NAME, 'Export selected suppliers', {
    count: selectedSuppliers.value.length
  })
  // TODO: Implement export functionality
}

function deactivateSelected() {
  DebugUtils.info(MODULE_NAME, 'Deactivate selected suppliers', {
    count: selectedSuppliers.value.length
  })
  // TODO: Implement bulk deactivation
}
</script>

<style lang="scss" scoped>
.supplier-table {
  .gap-2 {
    gap: 8px;
  }

  .supplier-icon {
    font-size: 20px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--v-theme-primary), 0.1);
    border-radius: 6px;
    flex-shrink: 0;
  }

  .supplier-info {
    min-width: 0;
    flex: 1;
  }
}

:deep(.v-data-table) {
  .v-data-table__td {
    padding: 8px 16px;
  }

  .v-data-table__th {
    font-weight: 600;
  }
}
</style>
