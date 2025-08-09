<!-- src/views/supplier/components/consolidation/RequestSelectionCard.vue -->
<template>
  <v-card class="request-selection-card">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon icon="mdi-clipboard-list" color="primary" class="mr-2" />
        <div>
          <h4>Select Requests for Consolidation</h4>
          <div class="text-caption text-medium-emphasis">
            Choose approved requests to combine into purchase orders
          </div>
        </div>
      </div>
      <div class="d-flex align-center gap-2">
        <v-chip
          v-if="selected.length > 0"
          :color="selected.length > 1 ? 'success' : 'warning'"
          size="small"
          variant="flat"
        >
          {{ selected.length }} selected
        </v-chip>
        <v-btn
          color="primary"
          variant="outlined"
          size="small"
          prepend-icon="mdi-select-all"
          :disabled="availableRequests.length === 0"
          @click="selectAll"
        >
          Select All
        </v-btn>
      </div>
    </v-card-title>

    <v-divider />

    <!-- Filters -->
    <v-card-text class="pa-4 pb-2">
      <v-row>
        <v-col cols="12" md="4">
          <v-select
            v-model="departmentFilter"
            :items="departmentOptions"
            label="Department"
            variant="outlined"
            density="compact"
            hide-details
            prepend-inner-icon="mdi-store"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-select
            v-model="priorityFilter"
            :items="priorityOptions"
            label="Priority"
            variant="outlined"
            density="compact"
            hide-details
            prepend-inner-icon="mdi-flag"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            v-model="searchQuery"
            label="Search requests..."
            variant="outlined"
            density="compact"
            hide-details
            prepend-inner-icon="mdi-magnify"
            clearable
          />
        </v-col>
      </v-row>
    </v-card-text>

    <!-- Request List -->
    <v-card-text class="pa-4" style="max-height: 500px; overflow-y: auto">
      <!-- Loading State -->
      <div v-if="loading" class="text-center pa-8">
        <v-progress-circular indeterminate color="primary" class="mb-2" />
        <div>Loading requests...</div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredRequests.length === 0" class="text-center pa-8">
        <v-icon icon="mdi-clipboard-off" size="64" class="text-medium-emphasis mb-4" />
        <div class="text-h6 text-medium-emphasis mb-2">
          {{ hasActiveFilters ? 'No requests match filters' : 'No approved requests found' }}
        </div>
        <div class="text-body-2 text-medium-emphasis mb-4">
          {{
            hasActiveFilters
              ? 'Try adjusting your filters or clear them to see all requests'
              : 'Approved procurement requests will appear here for consolidation'
          }}
        </div>
        <v-btn v-if="hasActiveFilters" variant="outlined" size="small" @click="clearFilters">
          Clear Filters
        </v-btn>
      </div>

      <!-- Request Cards -->
      <div v-else class="request-cards">
        <v-card
          v-for="request in filteredRequests"
          :key="request.id"
          variant="outlined"
          class="mb-3 request-card"
          :class="{
            selected: isSelected(request.id),
            urgent: request.priority === 'urgent'
          }"
          @click="toggleSelection(request)"
        >
          <v-card-text class="pa-4">
            <!-- Request Header -->
            <div class="d-flex align-center justify-space-between mb-3">
              <div class="d-flex align-center">
                <v-checkbox
                  :model-value="isSelected(request.id)"
                  hide-details
                  density="compact"
                  color="primary"
                  class="mr-3"
                  @click.stop
                  @update:model-value="checked => toggleSelectionDirect(request.id, checked)"
                />
                <div class="request-icon mr-3">
                  {{ getDepartmentIcon(request.department) }}
                </div>
                <div>
                  <div class="font-weight-medium">{{ request.requestNumber }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ request.department.charAt(0).toUpperCase() + request.department.slice(1) }} •
                    {{ request.requestedBy }}
                  </div>
                </div>
              </div>
              <div class="d-flex align-center gap-2">
                <v-chip
                  v-if="request.priority === 'urgent'"
                  :color="getPriorityColor(request.priority)"
                  size="small"
                  variant="flat"
                >
                  <v-icon icon="mdi-alert" size="12" class="mr-1" />
                  URGENT
                </v-chip>
                <v-chip color="success" size="small" variant="tonal">
                  <v-icon icon="mdi-check-circle" size="12" class="mr-1" />
                  Approved
                </v-chip>
              </div>
            </div>

            <!-- Request Details -->
            <div class="request-details">
              <div class="d-flex justify-space-between align-center mb-2">
                <div class="text-caption text-medium-emphasis">Request Date</div>
                <div class="text-caption">{{ formatDate(request.requestDate) }}</div>
              </div>
              <div class="d-flex justify-space-between align-center mb-2">
                <div class="text-caption text-medium-emphasis">Items Count</div>
                <div class="text-caption font-weight-medium">
                  {{ request.items.length }} item{{ request.items.length !== 1 ? 's' : '' }}
                </div>
              </div>
              <div class="d-flex justify-space-between align-center mb-3">
                <div class="text-caption text-medium-emphasis">Total Quantity</div>
                <div class="text-caption font-weight-medium">
                  {{ getTotalQuantity(request) }} units
                </div>
              </div>

              <!-- Items Preview -->
              <div class="items-preview">
                <div class="text-caption text-medium-emphasis mb-2">Items:</div>
                <div class="d-flex flex-wrap gap-1">
                  <v-chip
                    v-for="(item, index) in getItemsPreview(request)"
                    :key="index"
                    size="x-small"
                    variant="outlined"
                    color="primary"
                  >
                    {{ item.name }} ({{ item.qty }})
                  </v-chip>
                  <v-chip
                    v-if="request.items.length > 3"
                    size="x-small"
                    variant="text"
                    color="primary"
                  >
                    +{{ request.items.length - 3 }} more
                  </v-chip>
                </div>
              </div>

              <!-- Supplier Preview -->
              <div v-if="getRequestSuppliers(request).length > 0" class="suppliers-preview mt-3">
                <div class="text-caption text-medium-emphasis mb-2">Potential Suppliers:</div>
                <div class="d-flex flex-wrap gap-1">
                  <v-chip
                    v-for="supplier in getRequestSuppliers(request).slice(0, 2)"
                    :key="supplier.id"
                    size="x-small"
                    variant="tonal"
                    color="info"
                  >
                    {{ supplier.name }}
                  </v-chip>
                  <v-chip
                    v-if="getRequestSuppliers(request).length > 2"
                    size="x-small"
                    variant="text"
                    color="info"
                  >
                    +{{ getRequestSuppliers(request).length - 2 }} more
                  </v-chip>
                </div>
              </div>

              <!-- Request Notes -->
              <div v-if="request.notes" class="request-notes mt-3">
                <div class="text-caption text-medium-emphasis mb-1">Notes:</div>
                <div class="text-caption">{{ request.notes }}</div>
              </div>

              <!-- Age Indicator -->
              <div class="age-indicator mt-3">
                <div class="d-flex align-center">
                  <v-icon
                    :icon="getAgeIcon(request.requestDate)"
                    :color="getAgeColor(request.requestDate)"
                    size="12"
                    class="mr-1"
                  />
                  <div class="text-caption" :class="getAgeColor(request.requestDate)">
                    {{ getRelativeTime(request.requestDate) }}
                  </div>
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </v-card-text>

    <!-- Action Bar -->
    <v-divider />
    <v-card-actions class="pa-4">
      <div class="d-flex align-center justify-space-between w-100">
        <div class="d-flex align-center gap-4">
          <div class="text-caption text-medium-emphasis">
            {{ selected.length }} of {{ filteredRequests.length }} requests selected
          </div>
          <div v-if="estimatedOrdersCount > 0" class="text-caption">
            Will create ~{{ estimatedOrdersCount }} order{{ estimatedOrdersCount !== 1 ? 's' : '' }}
          </div>
        </div>

        <div class="d-flex gap-2">
          <v-btn
            variant="outlined"
            size="small"
            :disabled="selected.length === 0"
            @click="clearSelection"
          >
            Clear Selection
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="selected.length < 1"
            :loading="consolidating"
            @click="handleConsolidate"
          >
            <v-icon icon="mdi-merge" class="mr-2" />
            Consolidate {{ selected.length }} Request{{ selected.length !== 1 ? 's' : '' }}
          </v-btn>
        </div>
      </div>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSupplierStore } from '@/stores/supplier'
import {
  formatDate,
  getRelativeTime,
  getProcurementPriorityColor,
  PROCUREMENT_PRIORITIES
} from '@/stores/supplier'
import type { ProcurementRequest, Supplier } from '@/stores/supplier'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'RequestSelectionCard'

// Props
interface Props {
  requests: ProcurementRequest[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
const emit = defineEmits<{
  consolidate: [requestIds: string[]]
}>()

// Store
const supplierStore = useSupplierStore()

// State
const selected = ref<string[]>([])
const departmentFilter = ref('all')
const priorityFilter = ref('all')
const searchQuery = ref('')
const consolidating = ref(false)

// Options
const departmentOptions = [
  { title: 'All Departments', value: 'all' },
  { title: 'Kitchen', value: 'kitchen' },
  { title: 'Bar', value: 'bar' }
]

const priorityOptions = [
  { title: 'All Priorities', value: 'all' },
  ...Object.entries(PROCUREMENT_PRIORITIES).map(([value, title]) => ({ title, value }))
]

// Computed
const availableRequests = computed(() => props.requests.filter(r => r.status === 'approved'))

const filteredRequests = computed(() => {
  let requests = [...availableRequests.value]

  // Department filter
  if (departmentFilter.value !== 'all') {
    requests = requests.filter(r => r.department === departmentFilter.value)
  }

  // Priority filter
  if (priorityFilter.value !== 'all') {
    requests = requests.filter(r => r.priority === priorityFilter.value)
  }

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    requests = requests.filter(
      r =>
        r.requestNumber.toLowerCase().includes(query) ||
        r.requestedBy.toLowerCase().includes(query) ||
        r.items.some(item => item.itemName.toLowerCase().includes(query))
    )
  }

  return requests
})

const hasActiveFilters = computed(
  () =>
    departmentFilter.value !== 'all' ||
    priorityFilter.value !== 'all' ||
    searchQuery.value.length > 0
)

const estimatedOrdersCount = computed(() => {
  if (selected.value.length === 0) return 0

  // Group selected requests by potential suppliers
  const supplierIds = new Set<string>()

  selected.value.forEach(requestId => {
    const request = props.requests.find(r => r.id === requestId)
    if (request) {
      getRequestSuppliers(request).forEach(supplier => {
        supplierIds.add(supplier.id)
      })
    }
  })

  return supplierIds.size
})

// Methods
function getDepartmentIcon(department: string): string {
  const icons = {
    kitchen: '👨‍🍳',
    bar: '🍸'
  }
  return icons[department as keyof typeof icons] || '📋'
}

function getPriorityColor(priority: string): string {
  return getProcurementPriorityColor(priority as keyof typeof PROCUREMENT_PRIORITIES)
}

function getTotalQuantity(request: ProcurementRequest): number {
  return request.items.reduce((sum, item) => sum + item.requestedQuantity, 0)
}

function getItemsPreview(request: ProcurementRequest) {
  return request.items.slice(0, 3).map(item => ({
    name: item.itemName,
    qty: `${item.requestedQuantity} ${item.unit}`
  }))
}

function getRequestSuppliers(request: ProcurementRequest): Supplier[] {
  const suppliers = new Set<Supplier>()

  request.items.forEach(item => {
    const itemSuppliers = supplierStore.state.suppliers.filter(
      s => s.isActive && s.products.includes(item.itemId)
    )
    itemSuppliers.forEach(supplier => suppliers.add(supplier))
  })

  return Array.from(suppliers)
}

function getAgeIcon(dateString: string): string {
  const days = getDaysOld(dateString)
  if (days > 7) return 'mdi-clock-alert'
  if (days > 3) return 'mdi-clock'
  return 'mdi-clock-outline'
}

function getAgeColor(dateString: string): string {
  const days = getDaysOld(dateString)
  if (days > 7) return 'text-error'
  if (days > 3) return 'text-warning'
  return 'text-medium-emphasis'
}

function getDaysOld(dateString: string): number {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function isSelected(requestId: string): boolean {
  return selected.value.includes(requestId)
}

function toggleSelection(request: ProcurementRequest) {
  toggleSelectionDirect(request.id, !isSelected(request.id))
}

function toggleSelectionDirect(requestId: string, checked: boolean) {
  if (checked) {
    if (!selected.value.includes(requestId)) {
      selected.value.push(requestId)
    }
  } else {
    const index = selected.value.indexOf(requestId)
    if (index > -1) {
      selected.value.splice(index, 1)
    }
  }

  DebugUtils.info(MODULE_NAME, 'Selection toggled', {
    requestId,
    checked,
    totalSelected: selected.value.length
  })
}

function selectAll() {
  selected.value = [...filteredRequests.value.map(r => r.id)]

  DebugUtils.info(MODULE_NAME, 'Selected all requests', {
    count: selected.value.length
  })
}

function clearSelection() {
  selected.value = []

  DebugUtils.info(MODULE_NAME, 'Cleared selection')
}

function clearFilters() {
  departmentFilter.value = 'all'
  priorityFilter.value = 'all'
  searchQuery.value = ''

  DebugUtils.info(MODULE_NAME, 'Cleared filters')
}

async function handleConsolidate() {
  if (selected.value.length === 0) {
    DebugUtils.warn(MODULE_NAME, 'No requests selected for consolidation')
    return
  }

  try {
    consolidating.value = true

    DebugUtils.info(MODULE_NAME, 'Starting consolidation', {
      requestIds: selected.value,
      count: selected.value.length
    })

    emit('consolidate', [...selected.value])

    // Clear selection after successful consolidation
    setTimeout(() => {
      clearSelection()
    }, 500)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Consolidation failed', { error })
  } finally {
    consolidating.value = false
  }
}

// Watch for external changes to update selection
watch(
  () => props.requests,
  () => {
    // Remove selected items that are no longer available
    const availableIds = availableRequests.value.map(r => r.id)
    selected.value = selected.value.filter(id => availableIds.includes(id))
  },
  { deep: true }
)

// Expose selected items to parent if needed
defineExpose({
  selectedRequestIds: computed(() => selected.value),
  clearSelection,
  selectAll
})
</script>

<style lang="scss" scoped>
.request-selection-card {
  .request-cards {
    .request-card {
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      &.selected {
        border-color: rgb(var(--v-theme-primary));
        background: rgba(var(--v-theme-primary), 0.05);
      }

      &.urgent {
        border-left: 4px solid rgb(var(--v-theme-error));
      }
    }
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

  .request-details {
    background: rgba(var(--v-theme-surface), 0.5);
    border-radius: 8px;
    padding: 12px;
  }

  .items-preview,
  .suppliers-preview {
    .v-chip {
      margin: 1px;
    }
  }

  .gap-2 {
    gap: 8px;
  }

  .gap-4 {
    gap: 16px;
  }
}

:deep(.v-selection-control) {
  justify-content: flex-start;
}

:deep(.v-checkbox .v-selection-control__input) {
  margin-right: 0;
}

// Responsive adjustments
@media (max-width: 768px) {
  .request-selection-card {
    .request-details {
      padding: 8px;
    }

    .d-flex.justify-space-between {
      flex-direction: column;
      gap: 8px;

      &.align-center {
        align-items: flex-start;
      }
    }
  }
}

// Animation for selection
.request-card.selected {
  animation: selectBounce 0.3s ease-out;
}

@keyframes selectBounce {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.02);
  }
  100% {
    transform: scale(1);
  }
}

// Urgent request pulsing effect
.request-card.urgent {
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: inherit;
    background: linear-gradient(45deg, transparent, rgba(var(--v-theme-error), 0.1), transparent);
    animation: urgentPulse 2s ease-in-out infinite;
    pointer-events: none;
  }
}

@keyframes urgentPulse {
  0%,
  100% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
}
</style>
