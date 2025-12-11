<!-- src/views/supplier_2/components/procurement/ProcurementRequestTable.vue -->
<!-- ИСПРАВЛЕНИЕ: Использование нового RequestDetailsDialog -->

<template>
  <div>
    <!-- Filters Section -->
    <v-card variant="outlined" class="mb-4">
      <v-card-text class="pa-4">
        <div class="d-flex flex-wrap gap-3 align-center">
          <v-select
            v-model="filters.status"
            :items="statusOptions"
            item-title="title"
            item-value="value"
            label="Status"
            density="compact"
            style="max-width: 150px"
            clearable
          />

          <v-select
            v-model="filters.department"
            :items="departmentOptions"
            item-title="title"
            item-value="value"
            label="Department"
            density="compact"
            style="max-width: 150px"
            clearable
          />

          <v-select
            v-model="filters.priority"
            :items="priorityOptions"
            item-title="title"
            item-value="value"
            label="Priority"
            density="compact"
            style="max-width: 150px"
            clearable
          />

          <v-spacer />

          <v-btn color="primary" variant="outlined" prepend-icon="mdi-refresh" @click="refreshData">
            Refresh
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Data Table -->
    <v-data-table
      :headers="headers"
      :items="filteredRequestsComputed"
      :loading="props.loading"
      item-value="id"
      class="elevation-1"
    >
      <!-- Status Column -->
      <template #[`item.status`]="{ item }">
        <v-chip :color="getStatusColor(item.status)" size="small" variant="tonal">
          {{ item.status.toUpperCase() }}
        </v-chip>
      </template>

      <!-- Department Column -->
      <template #[`item.department`]="{ item }">
        <v-chip :color="getDepartmentColor(item.department)" size="small" variant="tonal">
          <v-icon :icon="getDepartmentIcon(item.department)" size="14" class="mr-1" />
          {{ item.department.toUpperCase() }}
        </v-chip>
      </template>

      <!-- Priority Column -->
      <template #[`item.priority`]="{ item }">
        <v-chip :color="getPriorityColor(item.priority)" size="small" variant="tonal">
          {{ item.priority.toUpperCase() }}
        </v-chip>
      </template>

      <!-- Items Count Column -->
      <template #[`item.itemsCount`]="{ item }">
        <div class="text-center">
          <v-chip size="small" variant="tonal" color="grey">
            {{ item.items?.length || 0 }}
          </v-chip>
        </div>
      </template>

      <!-- Estimated Total Column -->
      <template #[`item.estimatedTotal`]="{ item }">
        <div class="text-right font-weight-bold">
          {{ formatCurrency(calculateEstimatedTotal(item)) }}
        </div>
      </template>

      <!-- Created Date Column -->
      <template #[`item.createdAt`]="{ item }">
        <div class="text-body-2">
          {{ formatDate(item.createdAt) }}
        </div>
      </template>

      <!-- Actions Column -->
      <template #[`item.actions`]="{ item }">
        <div class="d-flex align-center gap-1">
          <!-- View Details -->
          <v-tooltip location="top">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                icon
                variant="text"
                size="small"
                color="info"
                @click="viewRequestDetails(item)"
              >
                <v-icon>mdi-eye</v-icon>
              </v-btn>
            </template>
            <span>View Details</span>
          </v-tooltip>

          <!-- Edit (только для draft/submitted) -->
          <v-tooltip v-if="canEditRequest(item)" location="top">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                icon
                variant="text"
                size="small"
                color="primary"
                @click="editRequest(item)"
              >
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
            </template>
            <span>Edit Request</span>
          </v-tooltip>

          <!-- Submit (только для draft) -->
          <v-tooltip v-if="item.status === 'draft'" location="top">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                icon
                variant="text"
                size="small"
                color="success"
                @click="submitRequest(item)"
              >
                <v-icon>mdi-send</v-icon>
              </v-btn>
            </template>
            <span>Submit Request</span>
          </v-tooltip>

          <!-- Create Order (только для submitted) -->
          <v-tooltip v-if="item.status === 'submitted'" location="top">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                icon
                variant="text"
                size="small"
                color="warning"
                @click="createOrderFromRequest(item)"
              >
                <v-icon>mdi-cart-plus</v-icon>
              </v-btn>
            </template>
            <span>Create Order</span>
          </v-tooltip>

          <!-- More Actions Menu -->
          <v-menu>
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" icon variant="text" size="small" color="grey">
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>

            <v-list density="compact" min-width="160">
              <v-list-item
                v-if="item.status === 'submitted'"
                prepend-icon="mdi-cancel"
                title="Cancel"
                @click="cancelRequest(item)"
              />

              <v-list-item
                prepend-icon="mdi-content-copy"
                title="Duplicate"
                @click="duplicateRequest(item)"
              />

              <v-list-item
                v-if="canDeleteRequest(item)"
                prepend-icon="mdi-delete"
                title="Delete"
                base-color="warning"
                @click="deleteRequest(item)"
              />
            </v-list>
          </v-menu>
        </div>
      </template>

      <!-- Loading state -->
      <template #loading>
        <v-skeleton-loader type="table-row@10" />
      </template>

      <!-- No data state -->
      <template #no-data>
        <div class="text-center pa-4">
          <v-icon icon="mdi-clipboard-list-outline" size="48" color="grey" class="mb-2" />
          <div class="text-body-1 text-medium-emphasis">No procurement requests found</div>
          <div class="text-body-2 text-medium-emphasis">
            Try adjusting your filters or create a new request
          </div>
        </div>
      </template>
    </v-data-table>

    <!-- ✅ НОВЫЙ ДИАЛОГ КОМПОНЕНТ -->
    <request-details-dialog
      v-model="showDetailsDialog"
      :request="selectedRequest"
      :orders="orders"
      @go-to-order="goToOrder"
      @create-order="createOrderFromRequest"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ProcurementRequest, PurchaseOrder } from '@/stores/supplier_2/types'
import RequestDetailsDialog from './RequestDetailsDialog.vue'
import { useProductsStore } from '@/stores/productsStore'

// =============================================
// PROPS & EMITS
// =============================================

const productsStore = useProductsStore()

interface Props {
  requests: ProcurementRequest[]
  orders: PurchaseOrder[] // ✅ НОВОЕ: добавляем заказы для отображения в диалоге
  loading: boolean
}

interface Emits {
  (e: 'edit-request', request: ProcurementRequest): void
  (e: 'submit-request', request: ProcurementRequest): void
  (e: 'delete-request', request: ProcurementRequest): void
  (e: 'create-order', request: ProcurementRequest): void
  (e: 'go-to-order', orderId: string): void // ✅ НОВОЕ: переход к заказу
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// LOCAL STATE
// =============================================

const showDetailsDialog = ref(false)
const selectedRequest = ref<ProcurementRequest | null>(null)

// Filters state
const filters = ref({
  status: undefined as string | undefined,
  department: undefined as string | undefined,
  priority: undefined as string | undefined
})

// =============================================
// TABLE CONFIGURATION
// =============================================

const headers = [
  { title: 'Request #', key: 'requestNumber', sortable: true, width: '120px' },
  { title: 'Department', key: 'department', sortable: true, width: '120px' },
  { title: 'Status', key: 'status', sortable: true, width: '120px' },
  { title: 'Priority', key: 'priority', sortable: true, width: '100px' },
  { title: 'Requested By', key: 'requestedBy', sortable: true, width: '140px' },
  { title: 'Items', key: 'itemsCount', sortable: false, width: '80px', align: 'center' },
  { title: 'Est. Total', key: 'estimatedTotal', sortable: false, width: '120px', align: 'end' },
  { title: 'Created', key: 'createdAt', sortable: true, width: '120px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '200px', align: 'center' }
]

// Filter options remain the same...
const statusOptions = [
  { title: 'All Statuses', value: undefined },
  { title: 'Draft', value: 'draft' },
  { title: 'Submitted', value: 'submitted' },
  { title: 'Converted', value: 'converted' },
  { title: 'Cancelled', value: 'cancelled' }
]

const departmentOptions = [
  { title: 'All Departments', value: undefined },
  { title: 'Kitchen', value: 'kitchen' },
  { title: 'Bar', value: 'bar' }
]

const priorityOptions = [
  { title: 'All Priorities', value: undefined },
  { title: 'Normal', value: 'normal' },
  { title: 'Urgent', value: 'urgent' }
]

// =============================================
// COMPUTED
// =============================================

const filteredRequestsComputed = computed(() => {
  if (!props.requests || !Array.isArray(props.requests)) {
    return []
  }

  return props.requests.filter(request => {
    if (filters.value.status && request.status !== filters.value.status) {
      return false
    }
    if (filters.value.department && request.department !== filters.value.department) {
      return false
    }
    if (filters.value.priority && request.priority !== filters.value.priority) {
      return false
    }
    return true
  })
})

// =============================================
// METHODS
// =============================================

function refreshData() {
  console.log('Refreshing procurement requests data')
}

function viewRequestDetails(request: ProcurementRequest) {
  selectedRequest.value = request
  showDetailsDialog.value = true
}

function editRequest(request: ProcurementRequest) {
  emits('edit-request', request)
}

function submitRequest(request: ProcurementRequest) {
  emits('submit-request', request)
}

function deleteRequest(request: ProcurementRequest) {
  emits('delete-request', request)
}

function cancelRequest(request: ProcurementRequest) {
  // TODO: Implement cancel logic
  console.log('Cancel request:', request.id)
}

function duplicateRequest(request: ProcurementRequest) {
  // TODO: Implement duplicate logic
  console.log('Duplicate request:', request.id)
}

function createOrderFromRequest(request: ProcurementRequest) {
  emits('create-order', request)
}

function goToOrder(orderId: string) {
  emits('go-to-order', orderId)
}

// =============================================
// VALIDATION METHODS
// =============================================

function canEditRequest(request: ProcurementRequest): boolean {
  return ['draft', 'submitted'].includes(request.status)
}

function canDeleteRequest(request: ProcurementRequest): boolean {
  // ✅ Allow deletion for draft and submitted (if no orders)
  return ['draft', 'submitted'].includes(request.status)
}

// =============================================
// FORMATTING & UTILITY FUNCTIONS
// =============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getEstimatedPrice(itemId: string, item?: any): number {
  // 1. Если в item уже есть цена - используем её
  if (item?.estimatedPrice && item.estimatedPrice > 0) {
    return item.estimatedPrice
  }

  // 2. Берём из продукта
  const product = productsStore.products.find(p => p.id === itemId)
  if (product && product.baseCostPerUnit) {
    return product.baseCostPerUnit
  }

  return 0
}

function calculateEstimatedTotal(request: ProcurementRequest): number {
  return request.items.reduce((sum, item) => {
    const product = productsStore.products.find(p => p.id === item.itemId)
    if (!product) return sum

    // Конвертируем в базовые единицы
    let baseQuantity = item.requestedQuantity

    if (item.unit !== product.baseUnit) {
      // Простая конвертация для основных единиц
      if (item.unit === 'kg' && product.baseUnit === 'gram') {
        baseQuantity = item.requestedQuantity * 1000
      } else if (item.unit === 'liter' && product.baseUnit === 'ml') {
        baseQuantity = item.requestedQuantity * 1000
      }
    }

    return sum + baseQuantity * product.baseCostPerUnit
  }, 0)
}

function getStatusColor(status: string): string {
  const colors = {
    draft: 'grey',
    submitted: 'blue',
    converted: 'success',
    approved: 'success',
    cancelled: 'error'
  }
  return colors[status as keyof typeof colors] || 'grey'
}

function getPriorityColor(priority: string): string {
  const colors = {
    normal: 'blue',
    urgent: 'orange'
  }
  return colors[priority as keyof typeof colors] || 'blue'
}

function getDepartmentColor(department: string): string {
  return department === 'kitchen' ? 'orange' : 'purple'
}

function getDepartmentIcon(department: string): string {
  return department === 'kitchen' ? 'mdi-chef-hat' : 'mdi-glass-cocktail'
}
</script>
