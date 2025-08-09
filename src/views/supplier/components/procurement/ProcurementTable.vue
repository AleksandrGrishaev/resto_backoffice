<!-- src/views/supplier/components/procurement/ProcurementTable.vue -->
<template>
  <div class="procurement-table">
    <!-- Filters and Actions -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div class="d-flex align-center gap-2">
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Search requests..."
          variant="outlined"
          density="compact"
          hide-details
          style="width: 300px"
          clearable
        />

        <v-select
          v-model="departmentFilter"
          :items="departmentOptions"
          label="Department"
          variant="outlined"
          density="compact"
          hide-details
          style="width: 150px"
        />

        <v-select
          v-model="statusFilter"
          :items="statusOptions"
          label="Status"
          variant="outlined"
          density="compact"
          hide-details
          style="width: 150px"
        />

        <v-select
          v-model="priorityFilter"
          :items="priorityOptions"
          label="Priority"
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
        color="primary"
        variant="flat"
        prepend-icon="mdi-clipboard-plus"
        @click="$emit('create-request')"
      >
        New Request
      </v-btn>
    </div>

    <!-- Active Filters Display -->
    <div v-if="hasActiveFilters" class="mb-3">
      <div class="d-flex align-center gap-2">
        <span class="text-caption text-medium-emphasis">Active filters:</span>

        <v-chip
          v-if="departmentFilter !== 'all'"
          size="small"
          closable
          color="primary"
          @click:close="departmentFilter = 'all'"
        >
          Department: {{ departmentFilter.charAt(0).toUpperCase() + departmentFilter.slice(1) }}
        </v-chip>

        <v-chip
          v-if="statusFilter !== 'all'"
          size="small"
          closable
          color="info"
          @click:close="statusFilter = 'all'"
        >
          Status: {{ getProcurementStatusName(statusFilter) }}
        </v-chip>

        <v-chip
          v-if="priorityFilter !== 'all'"
          size="small"
          closable
          :color="getProcurementPriorityColor(priorityFilter)"
          @click:close="priorityFilter = 'all'"
        >
          Priority: {{ priorityFilter.charAt(0).toUpperCase() + priorityFilter.slice(1) }}
        </v-chip>
      </div>
    </div>

    <!-- Table -->
    <v-card>
      <v-data-table
        v-model="selectedRequests"
        :headers="headers"
        :items="filteredRequests"
        :loading="loading"
        :search="searchQuery"
        item-key="id"
        class="elevation-0"
        :items-per-page="15"
        :sort-by="[{ key: 'requestDate', order: 'desc' }]"
        show-select
      >
        <!-- Request Number & Department -->
        <template #[`item.requestNumber`]="{ item }">
          <div class="d-flex align-center">
            <div class="request-icon mr-3">
              {{ getDepartmentIcon(item.department) }}
            </div>
            <div class="request-info">
              <div class="font-weight-medium">{{ item.requestNumber }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ item.department.charAt(0).toUpperCase() + item.department.slice(1) }}
              </div>
              <div class="text-caption text-medium-emphasis">By: {{ item.requestedBy }}</div>
            </div>
          </div>
        </template>

        <!-- Date & Age -->
        <template #[`item.requestDate`]="{ item }">
          <div>
            <div class="font-weight-medium">{{ formatDate(item.requestDate) }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ getRelativeTime(item.requestDate) }}
            </div>
            <div v-if="isOverdue(item)" class="text-caption text-error">
              <v-icon icon="mdi-clock-alert" size="12" class="mr-1" />
              Overdue
            </div>
          </div>
        </template>

        <!-- Items Count & Details -->
        <template #[`item.items`]="{ item }">
          <div>
            <div class="font-weight-medium">
              {{ item.items.length }} item{{ item.items.length !== 1 ? 's' : '' }}
            </div>
            <div class="text-caption text-medium-emphasis">
              Total qty: {{ getTotalQuantity(item) }}
            </div>

            <!-- Top 3 items preview -->
            <div class="mt-1">
              <v-chip
                v-for="(previewItem, index) in getItemsPreview(item)"
                :key="index"
                size="x-small"
                variant="outlined"
                color="primary"
                class="mr-1 mb-1"
              >
                {{ previewItem.name }} ({{ previewItem.qty }})
              </v-chip>
              <v-chip v-if="item.items.length > 3" size="x-small" variant="text" color="primary">
                +{{ item.items.length - 3 }} more
              </v-chip>
            </div>
          </div>
        </template>

        <!-- Status -->
        <template #[`item.status`]="{ item }">
          <v-chip :color="getStatusColor(item.status)" size="small" variant="flat">
            <v-icon :icon="getStatusIcon(item.status)" size="14" class="mr-1" />
            {{ getProcurementStatusName(item.status) }}
          </v-chip>
        </template>

        <!-- Priority -->
        <template #[`item.priority`]="{ item }">
          <v-chip :color="getProcurementPriorityColor(item.priority)" size="small" variant="tonal">
            <v-icon :icon="getPriorityIcon(item.priority)" size="14" class="mr-1" />
            {{ item.priority.charAt(0).toUpperCase() + item.priority.slice(1) }}
          </v-chip>
        </template>

        <!-- Purchase Orders -->
        <template #[`item.purchaseOrders`]="{ item }">
          <div v-if="item.purchaseOrderIds.length > 0">
            <div class="font-weight-medium text-success">
              {{ item.purchaseOrderIds.length }} order{{
                item.purchaseOrderIds.length !== 1 ? 's' : ''
              }}
            </div>
            <div class="text-caption text-medium-emphasis">
              <v-icon icon="mdi-check-circle" size="12" class="mr-1" />
              Converted
            </div>
          </div>
          <div v-else>
            <div class="text-medium-emphasis">No orders</div>
            <div v-if="item.status === 'approved'" class="text-caption text-warning">
              Ready to convert
            </div>
          </div>
        </template>

        <!-- Actions -->
        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-center gap-1">
            <v-btn
              size="small"
              variant="text"
              color="primary"
              icon="mdi-eye"
              @click="viewRequestDetails(item)"
            >
              <v-icon />
              <v-tooltip activator="parent" location="top">View Details</v-tooltip>
            </v-btn>

            <v-btn
              v-if="canEdit(item)"
              size="small"
              variant="text"
              color="warning"
              icon="mdi-pencil"
              @click="$emit('edit-request', item)"
            >
              <v-icon />
              <v-tooltip activator="parent" location="top">Edit Request</v-tooltip>
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
                <v-list-item v-if="canSubmit(item)" @click="submitRequest(item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-send" class="mr-2" />
                    Submit for Approval
                  </v-list-item-title>
                </v-list-item>

                <v-list-item v-if="canApprove(item)" @click="approveRequest(item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-check-circle" class="mr-2" />
                    Approve Request
                  </v-list-item-title>
                </v-list-item>

                <v-list-item v-if="canCreateOrder(item)" @click="$emit('create-order', item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-cart-plus" class="mr-2" />
                    Create Purchase Order
                  </v-list-item-title>
                </v-list-item>

                <v-list-item @click="duplicateRequest(item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-content-copy" class="mr-2" />
                    Duplicate Request
                  </v-list-item-title>
                </v-list-item>

                <v-list-item @click="exportRequest(item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-download" class="mr-2" />
                    Export to PDF
                  </v-list-item-title>
                </v-list-item>

                <v-divider />

                <v-list-item v-if="canCancel(item)" class="text-error" @click="cancelRequest(item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-cancel" class="mr-2" />
                    Cancel Request
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </template>

        <!-- No data -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon icon="mdi-clipboard-list-outline" size="64" class="text-medium-emphasis mb-4" />
            <div class="text-h6 text-medium-emphasis mb-2">
              {{ hasActiveFilters ? 'No requests match filters' : 'No procurement requests found' }}
            </div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              {{
                hasActiveFilters
                  ? 'Try adjusting or clearing your filters'
                  : 'Create your first procurement request to start ordering supplies'
              }}
            </div>
            <div v-if="hasActiveFilters" class="d-flex justify-center gap-2">
              <v-btn size="small" variant="outlined" @click="clearFilters">Clear Filters</v-btn>
            </div>
            <div v-else class="d-flex justify-center gap-2">
              <v-btn color="primary" variant="flat" @click="$emit('create-request')">
                <v-icon icon="mdi-clipboard-plus" class="mr-2" />
                Create Request
              </v-btn>
            </div>
          </div>
        </template>

        <!-- Loading -->
        <template #loading>
          <div class="text-center py-8">
            <v-progress-circular indeterminate color="primary" class="mb-2" />
            <div>Loading procurement requests...</div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Bulk Actions (when requests are selected) -->
    <v-expand-transition>
      <v-card v-if="selectedRequests.length > 0" variant="tonal" color="primary" class="mt-4">
        <v-card-text class="d-flex align-center justify-space-between">
          <div>
            <div class="font-weight-medium">
              {{ selectedRequests.length }} request{{ selectedRequests.length !== 1 ? 's' : '' }}
              selected
            </div>
            <div class="text-caption">Choose an action to apply to selected requests</div>
          </div>

          <div class="d-flex gap-2">
            <v-btn
              color="success"
              variant="outlined"
              size="small"
              prepend-icon="mdi-check-circle"
              :disabled="!canBulkApprove"
              @click="bulkApprove"
            >
              Approve All
            </v-btn>

            <v-btn
              color="primary"
              variant="outlined"
              size="small"
              prepend-icon="mdi-cart-plus"
              :disabled="!canBulkCreateOrders"
              @click="bulkCreateOrders"
            >
              Create Orders
            </v-btn>

            <v-btn
              color="warning"
              variant="outlined"
              size="small"
              prepend-icon="mdi-export"
              @click="bulkExport"
            >
              Export
            </v-btn>

            <v-btn
              color="error"
              variant="outlined"
              size="small"
              prepend-icon="mdi-cancel"
              :disabled="!canBulkCancel"
              @click="bulkCancel"
            >
              Cancel
            </v-btn>

            <v-btn variant="text" size="small" @click="selectedRequests = []">
              Clear Selection
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-expand-transition>

    <!-- Request Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="800px" scrollable>
      <v-card v-if="selectedRequest">
        <v-card-title class="d-flex align-center justify-space-between">
          <div>
            <h3>{{ selectedRequest.requestNumber }}</h3>
            <div class="text-caption text-medium-emphasis">
              {{
                selectedRequest.department.charAt(0).toUpperCase() +
                selectedRequest.department.slice(1)
              }}
              Department
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="showDetailsDialog = false" />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-6" style="max-height: 600px">
          <!-- Request Info -->
          <v-row class="mb-4">
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Requested By</div>
              <div class="font-weight-medium">{{ selectedRequest.requestedBy }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Request Date</div>
              <div class="font-weight-medium">
                {{ formatDateTime(selectedRequest.requestDate) }}
              </div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Status</div>
              <v-chip :color="getStatusColor(selectedRequest.status)" size="small" variant="flat">
                {{ getProcurementStatusName(selectedRequest.status) }}
              </v-chip>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Priority</div>
              <v-chip
                :color="getProcurementPriorityColor(selectedRequest.priority)"
                size="small"
                variant="tonal"
              >
                {{
                  selectedRequest.priority.charAt(0).toUpperCase() +
                  selectedRequest.priority.slice(1)
                }}
              </v-chip>
            </v-col>
          </v-row>

          <!-- Items List -->
          <div class="mb-4">
            <h4 class="mb-3">Requested Items</h4>
            <v-card
              v-for="item in selectedRequest.items"
              :key="item.id"
              variant="outlined"
              class="mb-2"
            >
              <v-card-text class="pa-3">
                <div class="d-flex align-center justify-space-between">
                  <div>
                    <div class="font-weight-medium">{{ item.itemName }}</div>
                    <div class="text-caption text-medium-emphasis">
                      Current stock: {{ item.currentStock }} {{ item.unit }}
                    </div>
                    <div v-if="item.notes" class="text-caption text-medium-emphasis mt-1">
                      <v-icon icon="mdi-note-text" size="12" class="mr-1" />
                      {{ item.notes }}
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-h6 font-weight-bold text-primary">
                      {{ item.requestedQuantity }} {{ item.unit }}
                    </div>
                    <v-chip :color="getReasonColor(item.reason)" size="x-small" variant="flat">
                      {{ getReasonText(item.reason) }}
                    </v-chip>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- Notes -->
          <div v-if="selectedRequest.notes" class="mb-4">
            <h4 class="mb-2">Notes</h4>
            <v-card variant="tonal" color="info">
              <v-card-text>{{ selectedRequest.notes }}</v-card-text>
            </v-card>
          </div>

          <!-- Purchase Orders -->
          <div v-if="selectedRequest.purchaseOrderIds.length > 0">
            <h4 class="mb-2">Related Purchase Orders</h4>
            <v-chip
              v-for="orderId in selectedRequest.purchaseOrderIds"
              :key="orderId"
              color="success"
              variant="tonal"
              size="small"
              class="mr-1"
            >
              <v-icon icon="mdi-package-variant" size="12" class="mr-1" />
              {{ orderId }}
            </v-chip>
          </div>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="outlined" @click="showDetailsDialog = false">Close</v-btn>
          <v-btn
            v-if="canEdit(selectedRequest)"
            color="warning"
            variant="flat"
            @click="handleEditRequest"
          >
            Edit Request
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSupplierStore } from '@/stores/supplier'
import {
  formatDate,
  formatDateTime,
  getProcurementStatusName,
  getProcurementPriorityColor,
  PROCUREMENT_STATUSES,
  PROCUREMENT_PRIORITIES
} from '@/stores/supplier'
import type { ProcurementRequest } from '@/stores/supplier'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ProcurementTable'

// Props
interface Props {
  requests: ProcurementRequest[]
  loading: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'edit-request': [request: ProcurementRequest]
  'create-order': [request: ProcurementRequest]
  'create-request': []
}>()

// Store
const supplierStore = useSupplierStore()

// State
const searchQuery = ref('')
const departmentFilter = ref('all')
const statusFilter = ref('all')
const priorityFilter = ref('all')
const selectedRequests = ref<ProcurementRequest[]>([])

const showDetailsDialog = ref(false)
const selectedRequest = ref<ProcurementRequest | null>(null)

// Options
const departmentOptions = [
  { title: 'All Departments', value: 'all' },
  { title: 'Kitchen', value: 'kitchen' },
  { title: 'Bar', value: 'bar' }
]

const statusOptions = [
  { title: 'All Statuses', value: 'all' },
  ...Object.entries(PROCUREMENT_STATUSES).map(([value, title]) => ({ title, value }))
]

const priorityOptions = [
  { title: 'All Priorities', value: 'all' },
  ...Object.entries(PROCUREMENT_PRIORITIES).map(([value, title]) => ({ title, value }))
]

// Computed
const headers = computed(() => [
  { title: 'Request', key: 'requestNumber', sortable: true, width: '200px' },
  { title: 'Date', key: 'requestDate', sortable: true, width: '150px' },
  { title: 'Items', key: 'items', sortable: false, width: '250px' },
  { title: 'Status', key: 'status', sortable: true, width: '120px' },
  { title: 'Priority', key: 'priority', sortable: true, width: '120px' },
  { title: 'Purchase Orders', key: 'purchaseOrders', sortable: false, width: '140px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '120px' }
])

const filteredRequests = computed(() => {
  let requests = [...props.requests]

  // Department filter
  if (departmentFilter.value !== 'all') {
    requests = requests.filter(r => r.department === departmentFilter.value)
  }

  // Status filter
  if (statusFilter.value !== 'all') {
    requests = requests.filter(r => r.status === statusFilter.value)
  }

  // Priority filter
  if (priorityFilter.value !== 'all') {
    requests = requests.filter(r => r.priority === priorityFilter.value)
  }

  return requests
})

const hasActiveFilters = computed(
  () =>
    departmentFilter.value !== 'all' ||
    statusFilter.value !== 'all' ||
    priorityFilter.value !== 'all'
)

const canBulkApprove = computed(() => selectedRequests.value.some(r => r.status === 'submitted'))

const canBulkCreateOrders = computed(() =>
  selectedRequests.value.some(r => r.status === 'approved' && r.purchaseOrderIds.length === 0)
)

const canBulkCancel = computed(() =>
  selectedRequests.value.some(r => ['draft', 'submitted'].includes(r.status))
)

// Methods
function handleEditRequest() {
  if (selectedRequest.value) {
    emit('edit-request', selectedRequest.value)
    showDetailsDialog.value = false
  }
}

function getDepartmentIcon(department: string): string {
  const icons = {
    kitchen: '👨‍🍳',
    bar: '🍸'
  }
  return icons[department as keyof typeof icons] || '📋'
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffDays > 0) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  } else {
    return 'Today'
  }
}

function isOverdue(request: ProcurementRequest): boolean {
  if (request.status !== 'submitted') return false

  const requestDate = new Date(request.requestDate)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24))

  return diffDays > 2 // Consider overdue after 2 days
}

function getTotalQuantity(request: ProcurementRequest): string {
  const total = request.items.reduce((sum, item) => sum + item.requestedQuantity, 0)
  return total.toString()
}

function getItemsPreview(request: ProcurementRequest) {
  return request.items.slice(0, 3).map(item => ({
    name: item.itemName,
    qty: `${item.requestedQuantity} ${item.unit}`
  }))
}

function getStatusColor(status: string): string {
  const colors = {
    draft: 'default',
    submitted: 'warning',
    approved: 'info',
    converted: 'success',
    cancelled: 'error'
  }
  return colors[status as keyof typeof colors] || 'default'
}

function getStatusIcon(status: string): string {
  const icons = {
    draft: 'mdi-file-document-outline',
    submitted: 'mdi-send',
    approved: 'mdi-check-circle',
    converted: 'mdi-package-variant',
    cancelled: 'mdi-cancel'
  }
  return icons[status as keyof typeof icons] || 'mdi-help'
}

function getPriorityIcon(priority: string): string {
  const icons = {
    low: 'mdi-flag-outline',
    normal: 'mdi-flag',
    urgent: 'mdi-flag-variant'
  }
  return icons[priority as keyof typeof icons] || 'mdi-flag'
}

function getReasonColor(reason: string): string {
  const colors = {
    low_stock: 'warning',
    out_of_stock: 'error',
    upcoming_menu: 'info',
    bulk_discount: 'success',
    other: 'default'
  }
  return colors[reason as keyof typeof colors] || 'default'
}

function getReasonText(reason: string): string {
  const texts = {
    low_stock: 'Low Stock',
    out_of_stock: 'Out of Stock',
    upcoming_menu: 'Menu Planning',
    bulk_discount: 'Bulk Order',
    other: 'Other'
  }
  return texts[reason as keyof typeof texts] || reason
}

// Permission checks
function canEdit(request: ProcurementRequest): boolean {
  return ['draft', 'submitted'].includes(request.status)
}

function canSubmit(request: ProcurementRequest): boolean {
  return request.status === 'draft'
}

function canApprove(request: ProcurementRequest): boolean {
  return request.status === 'submitted'
}

function canCreateOrder(request: ProcurementRequest): boolean {
  return request.status === 'approved' && request.purchaseOrderIds.length === 0
}

function canCancel(request: ProcurementRequest): boolean {
  return ['draft', 'submitted'].includes(request.status)
}

function clearFilters() {
  departmentFilter.value = 'all'
  statusFilter.value = 'all'
  priorityFilter.value = 'all'
  searchQuery.value = ''
}

// Action Methods
function viewRequestDetails(request: ProcurementRequest) {
  selectedRequest.value = request
  showDetailsDialog.value = true

  DebugUtils.info(MODULE_NAME, 'View request details', {
    requestId: request.id,
    requestNumber: request.requestNumber
  })
}

async function submitRequest(request: ProcurementRequest) {
  try {
    await supplierStore.updateProcurementRequest(request.id, { status: 'submitted' })
    DebugUtils.info(MODULE_NAME, 'Request submitted', { requestId: request.id })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to submit request', { error })
  }
}

async function approveRequest(request: ProcurementRequest) {
  try {
    await supplierStore.updateProcurementRequest(request.id, { status: 'approved' })
    DebugUtils.info(MODULE_NAME, 'Request approved', { requestId: request.id })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to approve request', { error })
  }
}

async function cancelRequest(request: ProcurementRequest) {
  try {
    await supplierStore.updateProcurementRequest(request.id, { status: 'cancelled' })
    DebugUtils.info(MODULE_NAME, 'Request cancelled', { requestId: request.id })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to cancel request', { error })
  }
}

function duplicateRequest(request: ProcurementRequest) {
  DebugUtils.info(MODULE_NAME, 'Duplicate request', { requestId: request.id })
  // TODO: Implement duplication logic
}

function exportRequest(request: ProcurementRequest) {
  DebugUtils.info(MODULE_NAME, 'Export request', { requestId: request.id })
  // TODO: Implement PDF export
}

// Bulk Actions
async function bulkApprove() {
  const pendingRequests = selectedRequests.value.filter(r => r.status === 'submitted')

  try {
    await Promise.all(
      pendingRequests.map(r => supplierStore.updateProcurementRequest(r.id, { status: 'approved' }))
    )
    selectedRequests.value = []
    DebugUtils.info(MODULE_NAME, 'Bulk approve completed', { count: pendingRequests.length })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to bulk approve', { error })
  }
}

async function bulkCreateOrders() {
  const approvedRequests = selectedRequests.value.filter(
    r => r.status === 'approved' && r.purchaseOrderIds.length === 0
  )

  DebugUtils.info(MODULE_NAME, 'Bulk create orders', {
    count: approvedRequests.length,
    requestIds: approvedRequests.map(r => r.id)
  })

  // TODO: Implement bulk order creation workflow
  // This would typically group items by supplier and create multiple POs
}

function bulkExport() {
  DebugUtils.info(MODULE_NAME, 'Bulk export', {
    count: selectedRequests.value.length,
    requestIds: selectedRequests.value.map(r => r.id)
  })

  // TODO: Implement bulk PDF export
}

async function bulkCancel() {
  const cancellableRequests = selectedRequests.value.filter(r =>
    ['draft', 'submitted'].includes(r.status)
  )

  try {
    await Promise.all(
      cancellableRequests.map(r =>
        supplierStore.updateProcurementRequest(r.id, { status: 'cancelled' })
      )
    )
    selectedRequests.value = []
    DebugUtils.info(MODULE_NAME, 'Bulk cancel completed', { count: cancellableRequests.length })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to bulk cancel', { error })
  }
}
</script>

<style lang="scss" scoped>
.procurement-table {
  .gap-2 {
    gap: 8px;
  }

  .request-icon {
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

  .request-info {
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

:deep(.v-dialog .v-card) {
  .v-card-text {
    .v-row {
      margin: 0;

      .v-col {
        padding: 4px 8px;
      }
    }
  }
}
</style>
