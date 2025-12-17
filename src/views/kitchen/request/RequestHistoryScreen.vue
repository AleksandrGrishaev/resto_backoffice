<!-- src/views/kitchen/request/RequestHistoryScreen.vue -->
<!-- View-only list of submitted requests for this department -->
<template>
  <div class="request-history-screen">
    <!-- Header -->
    <v-toolbar density="compact" color="surface" class="px-4">
      <v-btn icon="mdi-arrow-left" variant="text" @click="$emit('back')" />
      <v-toolbar-title class="text-h6">
        <v-icon icon="mdi-history" class="mr-2" />
        Request History
      </v-toolbar-title>
      <v-spacer />
      <v-chip color="primary" variant="tonal" size="small">
        {{ departmentLabel }}
      </v-chip>
    </v-toolbar>

    <v-divider />

    <!-- Loading State -->
    <div v-if="isLoading" class="d-flex align-center justify-center pa-8" style="height: 400px">
      <div class="text-center">
        <v-progress-circular indeterminate color="primary" size="48" class="mb-4" />
        <div class="text-body-1">Loading request history...</div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="filteredRequests.length === 0"
      class="d-flex flex-column align-center justify-center pa-8"
      style="height: 400px"
    >
      <v-icon icon="mdi-inbox-outline" size="64" color="grey" class="mb-4" />
      <div class="text-h6 mb-2">No Requests Found</div>
      <div class="text-body-2 text-medium-emphasis text-center">
        No requests have been submitted from {{ departmentLabel }} yet.
        <br />
        Create a new request from the Request screen.
      </div>
      <v-btn color="primary" class="mt-4" @click="$emit('create-new')">
        <v-icon start>mdi-plus</v-icon>
        Create New Request
      </v-btn>
    </div>

    <!-- Request List -->
    <div v-else class="request-list pa-4">
      <!-- Filters -->
      <div class="d-flex gap-2 mb-4 align-center">
        <v-chip-group v-model="statusFilter" mandatory>
          <v-chip filter value="all" size="small">All</v-chip>
          <v-chip filter value="submitted" color="info" size="small">Submitted</v-chip>
          <v-chip filter value="converted" color="success" size="small">Converted</v-chip>
        </v-chip-group>

        <v-spacer />

        <v-btn variant="text" size="small" prepend-icon="mdi-refresh" @click="loadRequests">
          Refresh
        </v-btn>
      </div>

      <!-- Request Cards -->
      <v-card
        v-for="request in filteredRequests"
        :key="request.id"
        class="mb-3 request-card"
        variant="outlined"
        @click="toggleRequestDetails(request.id)"
      >
        <!-- Request Header -->
        <v-card-item>
          <template #prepend>
            <v-icon :color="getStatusColor(request.status)" size="24">
              {{ getStatusIcon(request.status) }}
            </v-icon>
          </template>

          <v-card-title class="text-body-1 font-weight-bold">
            {{ request.requestNumber }}
          </v-card-title>

          <v-card-subtitle>
            <div class="d-flex align-center gap-2">
              <span>{{ formatDate(request.createdAt) }}</span>
              <v-chip :color="getPriorityColor(request.priority)" size="x-small" label>
                {{ request.priority }}
              </v-chip>
            </div>
          </v-card-subtitle>

          <template #append>
            <div class="d-flex flex-column align-end">
              <v-chip :color="getStatusColor(request.status)" size="small" class="mb-1">
                {{ getStatusLabel(request.status) }}
              </v-chip>
              <span class="text-caption text-medium-emphasis">
                {{ request.items.length }} items
              </span>
            </div>
          </template>
        </v-card-item>

        <!-- Expandable Details -->
        <v-expand-transition>
          <div v-show="expandedRequestId === request.id">
            <v-divider />

            <v-card-text>
              <!-- Request Meta -->
              <div class="d-flex flex-wrap gap-4 mb-4 text-body-2">
                <div>
                  <span class="text-medium-emphasis">Requested by:</span>
                  <span class="ml-1 font-weight-medium">{{ request.requestedBy }}</span>
                </div>
                <div v-if="request.notes">
                  <span class="text-medium-emphasis">Notes:</span>
                  <span class="ml-1">{{ request.notes }}</span>
                </div>
              </div>

              <!-- Items List -->
              <v-list density="compact" class="bg-transparent">
                <v-list-subheader>Items</v-list-subheader>
                <v-list-item v-for="item in request.items" :key="item.id" class="px-0">
                  <template #prepend>
                    <v-avatar color="grey-lighten-2" size="32" class="mr-3">
                      <v-icon size="18" color="grey-darken-1">mdi-package-variant</v-icon>
                    </v-avatar>
                  </template>

                  <v-list-item-title>{{ item.itemName }}</v-list-item-title>

                  <v-list-item-subtitle>
                    {{ formatQuantity(item.requestedQuantity, item.unit) }}
                    <span v-if="item.packageName" class="ml-2 text-caption">
                      ({{ item.packageQuantity }} {{ item.packageName }})
                    </span>
                  </v-list-item-subtitle>

                  <template #append>
                    <v-chip v-if="item.priority === 'urgent'" color="error" size="x-small" label>
                      Urgent
                    </v-chip>
                  </template>
                </v-list-item>
              </v-list>

              <!-- Estimated Total -->
              <div class="d-flex justify-end mt-3 pt-3 border-t">
                <div class="text-body-2">
                  <span class="text-medium-emphasis">Estimated Total:</span>
                  <span class="ml-2 font-weight-bold">
                    {{ formatCurrency(getEstimatedTotal(request)) }}
                  </span>
                </div>
              </div>
            </v-card-text>
          </div>
        </v-expand-transition>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSupplierStore } from '@/stores/supplier_2/supplierStore'
import { useAuthStore } from '@/stores/auth'
import { formatIDR } from '@/utils/currency'
import { TimeUtils } from '@/utils/time'
import type { ProcurementRequest, Department } from '@/stores/supplier_2/types'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  selectedDepartment?: 'all' | 'kitchen' | 'bar'
}

interface Emits {
  (e: 'back'): void
  (e: 'create-new'): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedDepartment: 'kitchen'
})

defineEmits<Emits>()

// =============================================
// STORES
// =============================================

const supplierStore = useSupplierStore()
const authStore = useAuthStore()

// =============================================
// STATE
// =============================================

const isLoading = ref(false)
const statusFilter = ref<'all' | 'submitted' | 'converted'>('all')
const expandedRequestId = ref<string | null>(null)

// =============================================
// COMPUTED
// =============================================

const effectiveDepartment = computed((): Department => {
  const roles = authStore.userRoles
  if (roles.includes('admin') && props.selectedDepartment !== 'all') {
    return props.selectedDepartment as Department
  }
  if (roles.includes('bar') && !roles.includes('kitchen')) return 'bar'
  return 'kitchen'
})

const departmentLabel = computed(() => {
  if (props.selectedDepartment === 'all') return 'All Departments'
  return props.selectedDepartment === 'kitchen' ? 'Kitchen' : 'Bar'
})

const departmentRequests = computed(() => {
  const allRequests = supplierStore.state.requests

  // Filter by department
  let requests = allRequests.filter(r => {
    if (props.selectedDepartment === 'all') return true
    return r.department === effectiveDepartment.value
  })

  // Only show submitted and converted (not drafts or cancelled)
  requests = requests.filter(r => ['submitted', 'converted'].includes(r.status))

  // Sort by date (newest first)
  return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
})

const filteredRequests = computed(() => {
  if (statusFilter.value === 'all') return departmentRequests.value
  return departmentRequests.value.filter(r => r.status === statusFilter.value)
})

// =============================================
// METHODS
// =============================================

async function loadRequests() {
  isLoading.value = true
  try {
    await supplierStore.loadRequests()
  } finally {
    isLoading.value = false
  }
}

function toggleRequestDetails(requestId: string) {
  expandedRequestId.value = expandedRequestId.value === requestId ? null : requestId
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'grey',
    submitted: 'info',
    converted: 'success',
    cancelled: 'error'
  }
  return colors[status] || 'grey'
}

function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    draft: 'mdi-file-edit-outline',
    submitted: 'mdi-send-check',
    converted: 'mdi-check-circle',
    cancelled: 'mdi-cancel'
  }
  return icons[status] || 'mdi-file'
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    converted: 'Converted to Order',
    cancelled: 'Cancelled'
  }
  return labels[status] || status
}

function getPriorityColor(priority: string): string {
  return priority === 'urgent' ? 'error' : 'default'
}

function formatDate(dateString: string): string {
  return TimeUtils.formatDateTimeForDisplay(dateString)
}

function formatQuantity(quantity: number, unit: string): string {
  return `${quantity} ${unit}`
}

function formatCurrency(amount: number): string {
  return formatIDR(amount)
}

function getEstimatedTotal(request: ProcurementRequest): number {
  return request.items.reduce(
    (sum, item) => sum + (item.estimatedPrice || 0) * item.requestedQuantity,
    0
  )
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  loadRequests()
})
</script>

<style scoped lang="scss">
.request-history-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: rgb(var(--v-theme-background));
}

.request-list {
  flex: 1;
  overflow-y: auto;
}

.request-card {
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgb(var(--v-theme-primary));
  }
}

.border-t {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.text-medium-emphasis {
  opacity: 0.7;
}

.gap-2 {
  gap: 8px;
}

.gap-4 {
  gap: 16px;
}

// Touch-friendly targets
:deep(.v-btn) {
  min-height: 44px;
}

:deep(.v-list-item) {
  min-height: 48px;
}
</style>
