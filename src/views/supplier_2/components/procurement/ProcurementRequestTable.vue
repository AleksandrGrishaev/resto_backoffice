<!-- src/views/supplier_2/components/procurement/ProcurementRequestTable.vue -->
<template>
  <div class="procurement-request-table">
    <!-- Filters Bar -->
    <v-card variant="outlined" class="mb-4">
      <v-card-text class="pa-4">
        <v-row align="center">
          <v-col cols="12" md="3">
            <v-select
              v-model="filters.status"
              :items="statusOptions"
              label="Status"
              variant="outlined"
              density="compact"
              clearable
              @update:model-value="updateFilters"
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-select
              v-model="filters.department"
              :items="departmentOptions"
              label="Department"
              variant="outlined"
              density="compact"
              clearable
              @update:model-value="updateFilters"
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-select
              v-model="filters.priority"
              :items="priorityOptions"
              label="Priority"
              variant="outlined"
              density="compact"
              clearable
              @update:model-value="updateFilters"
            />
          </v-col>

          <v-col cols="12" md="3">
            <div class="d-flex gap-2">
              <v-btn
                color="grey"
                variant="outlined"
                prepend-icon="mdi-filter-off"
                @click="clearFilters"
              >
                Clear Filters
              </v-btn>

              <v-btn
                color="primary"
                variant="flat"
                prepend-icon="mdi-refresh"
                :loading="loading"
                @click="refreshData"
              >
                Refresh
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Data Table -->
    <v-data-table
      :headers="headers"
      :items="filteredRequestsComputed"
      :loading="loading"
      class="elevation-1"
      :items-per-page="25"
      :sort-by="[{ key: 'createdAt', order: 'desc' }]"
    >
      <!-- Request Number -->
      <template #[`item.requestNumber`]="{ item }">
        <div class="d-flex align-center">
          <v-chip size="small" :color="getStatusColor(item.status)" variant="tonal" class="mr-2">
            {{ item.requestNumber }}
          </v-chip>
        </div>
      </template>

      <!-- Department -->
      <template #[`item.department`]="{ item }">
        <v-chip size="small" :color="getDepartmentColor(item.department)" variant="tonal">
          <v-icon :icon="getDepartmentIcon(item.department)" size="14" class="mr-1" />
          {{ item.department }}
        </v-chip>
      </template>

      <!-- Status -->
      <template #[`item.status`]="{ item }">
        <v-chip size="small" :color="getStatusColor(item.status)" variant="flat">
          <v-icon :icon="getStatusIcon(item.status)" size="14" class="mr-1" />
          {{ getStatusText(item.status) }}
        </v-chip>
      </template>

      <!-- Priority -->
      <template #[`item.priority`]="{ item }">
        <v-chip size="small" :color="getPriorityColor(item.priority)" variant="tonal">
          <v-icon :icon="getPriorityIcon(item.priority)" size="14" class="mr-1" />
          {{ item.priority }}
        </v-chip>
      </template>

      <!-- Items Count -->
      <template #[`item.itemsCount`]="{ item }">
        <div class="text-center">
          <v-chip size="small" variant="outlined">{{ item.items.length }} items</v-chip>
        </div>
      </template>

      <!-- Estimated Total -->
      <template #[`item.estimatedTotal`]="{ item }">
        <div class="text-right font-weight-bold">
          {{ formatCurrency(calculateEstimatedTotal(item)) }}
        </div>
      </template>

      <!-- Created Date -->
      <template #[`item.createdAt`]="{ item }">
        <div class="text-body-2">
          {{ formatDate(item.createdAt) }}
        </div>
      </template>

      <!-- Actions -->
      <template #[`item.actions`]="{ item }">
        <div class="d-flex align-center justify-center gap-1">
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
                v-if="canDeleteRequest(item)"
                prepend-icon="mdi-delete"
                title="Delete"
                @click="deleteRequest(item)"
              />

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

    <!-- Request Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="800px">
      <v-card v-if="selectedRequest">
        <v-card-title class="d-flex align-center justify-space-between">
          <div>
            <div class="text-h6">{{ selectedRequest.requestNumber }}</div>
            <div class="text-caption text-medium-emphasis">Request Details</div>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="showDetailsDialog = false" />
        </v-card-title>

        <v-card-text class="pa-4">
          <!-- Request Info -->
          <v-row>
            <v-col cols="6">
              <div class="text-subtitle-2 mb-1">Department</div>
              <v-chip
                size="small"
                :color="getDepartmentColor(selectedRequest.department)"
                variant="tonal"
              >
                {{ selectedRequest.department }}
              </v-chip>
            </v-col>

            <v-col cols="6">
              <div class="text-subtitle-2 mb-1">Status</div>
              <v-chip size="small" :color="getStatusColor(selectedRequest.status)" variant="flat">
                {{ getStatusText(selectedRequest.status) }}
              </v-chip>
            </v-col>

            <v-col cols="6">
              <div class="text-subtitle-2 mb-1">Priority</div>
              <v-chip
                size="small"
                :color="getPriorityColor(selectedRequest.priority)"
                variant="tonal"
              >
                {{ selectedRequest.priority }}
              </v-chip>
            </v-col>

            <v-col cols="6">
              <div class="text-subtitle-2 mb-1">Requested By</div>
              <div class="text-body-2">{{ selectedRequest.requestedBy }}</div>
            </v-col>

            <v-col cols="12">
              <div class="text-subtitle-2 mb-1">Notes</div>
              <div class="text-body-2">{{ selectedRequest.notes || 'No notes' }}</div>
            </v-col>
          </v-row>

          <v-divider class="my-4" />

          <!-- Items List -->
          <div class="text-subtitle-1 font-weight-bold mb-3">
            Requested Items ({{ selectedRequest.items.length }})
          </div>

          <v-data-table
            :headers="itemHeaders"
            :items="selectedRequest.items"
            density="compact"
            :items-per-page="-1"
            hide-default-footer
          >
            <template #[`item.estimatedPrice`]="{ item }">
              <div class="text-right">
                {{ formatCurrency(getEstimatedPrice(item.itemId)) }}
              </div>
            </template>

            <template #[`item.estimatedTotal`]="{ item }">
              <div class="text-right font-weight-bold">
                {{ formatCurrency(item.requestedQuantity * getEstimatedPrice(item.itemId)) }}
              </div>
            </template>
          </v-data-table>

          <div class="d-flex justify-end mt-3">
            <div class="text-h6 font-weight-bold">
              Total: {{ formatCurrency(calculateEstimatedTotal(selectedRequest)) }}
            </div>
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ProcurementRequest } from '@/stores/supplier_2/types'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  requests: ProcurementRequest[]
  loading: boolean
}

interface Emits {
  (e: 'edit-request', request: ProcurementRequest): void
  (e: 'submit-request', request: ProcurementRequest): void
  (e: 'delete-request', request: ProcurementRequest): void
  (e: 'create-order', request: ProcurementRequest): void
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

const itemHeaders = [
  { title: 'Item', key: 'itemName', sortable: false },
  { title: 'Quantity', key: 'requestedQuantity', sortable: false, width: '100px', align: 'end' },
  { title: 'Unit', key: 'unit', sortable: false, width: '80px' },
  { title: 'Est. Price', key: 'estimatedPrice', sortable: false, width: '100px', align: 'end' },
  { title: 'Est. Total', key: 'estimatedTotal', sortable: false, width: '120px', align: 'end' },
  { title: 'Notes', key: 'notes', sortable: false }
]

// =============================================
// FILTER OPTIONS
// =============================================

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
  // ИСПРАВЛЕНИЕ: Безопасная проверка на массив
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
  // Emit refresh event to parent
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
  if (confirm(`Are you sure you want to delete request ${request.requestNumber}?`)) {
    emits('delete-request', request)
  }
}

function createOrderFromRequest(request: ProcurementRequest) {
  emits('create-order', request)
}

function cancelRequest(request: ProcurementRequest) {
  if (confirm(`Are you sure you want to cancel request ${request.requestNumber}?`)) {
    // Handle cancel logic
    console.log('Cancel request:', request.id)
  }
}

function duplicateRequest(request: ProcurementRequest) {
  console.log('Duplicate request:', request.id)
  // TODO: Implement duplicate logic
}

function updateFilters() {
  console.log('Filters updated:', filters.value)
}

function clearFilters() {
  filters.value = {
    status: undefined,
    department: undefined,
    priority: undefined
  }
}

// =============================================
// HELPER FUNCTIONS
// =============================================

function getDepartmentColor(department: string): string {
  return department === 'kitchen' ? 'orange' : 'blue'
}

function getDepartmentIcon(department: string): string {
  return department === 'kitchen' ? 'mdi-chef-hat' : 'mdi-glass-cocktail'
}

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    converted: 'Converted',
    cancelled: 'Cancelled'
  }
  return statusMap[status] || status
}

function getStatusIcon(status: string): string {
  const iconMap: Record<string, string> = {
    draft: 'mdi-file-edit',
    submitted: 'mdi-send',
    converted: 'mdi-check-circle',
    cancelled: 'mdi-cancel'
  }
  return iconMap[status] || 'mdi-help-circle'
}

function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    draft: 'grey',
    submitted: 'blue',
    converted: 'green',
    cancelled: 'red'
  }
  return colorMap[status] || 'grey'
}

function getPriorityIcon(priority: string): string {
  return priority === 'urgent' ? 'mdi-alert' : 'mdi-information'
}

function getPriorityColor(priority: string): string {
  return priority === 'urgent' ? 'red' : 'green'
}

function canEditRequest(request: ProcurementRequest): boolean {
  return ['draft', 'submitted'].includes(request.status)
}

function canDeleteRequest(request: ProcurementRequest): boolean {
  return request.status === 'draft'
}

function calculateEstimatedTotal(request: ProcurementRequest): number {
  if (!request.items || !Array.isArray(request.items)) {
    return 0
  }

  return request.items.reduce((total, item) => {
    return total + item.requestedQuantity * getEstimatedPrice(item.itemId)
  }, 0)
}

function getEstimatedPrice(itemId: string): number {
  // Mock prices (in real app, this would come from StorageStore)
  const prices: Record<string, number> = {
    'prod-beef-steak': 180000,
    'prod-potato': 8000,
    'prod-garlic': 25000,
    'prod-tomato': 12000,
    'prod-beer-bintang-330': 12000,
    'prod-cola-330': 8000,
    'prod-butter': 45000
  }
  return prices[itemId] || 0
}

function formatCurrency(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) {
    return 'Rp 0'
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

function formatDate(dateString: string): string {
  if (!dateString) {
    return 'Invalid date'
  }

  try {
    return new Date(dateString).toLocaleDateString('id-ID', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Invalid date'
  }
}
</script>

<style lang="scss" scoped>
.procurement-request-table {
  .v-data-table {
    border-radius: 8px;
  }
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

.text-medium-emphasis {
  opacity: 0.7;
}

// Status chip animations
.v-chip {
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
}

// Row hover effects
.v-data-table :deep(.v-data-table__tr:hover) {
  background-color: rgb(var(--v-theme-surface-variant), 0.1);
}

// Responsive adjustments
@media (max-width: 768px) {
  .v-data-table {
    :deep(.v-data-table__th),
    :deep(.v-data-table__td) {
      padding: 8px 4px;
      font-size: 0.8rem;
    }
  }
}
</style>
