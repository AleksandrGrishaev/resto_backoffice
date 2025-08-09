<!-- src/views/supplier/components/consolidation/RequestSelectionCard.vue -->
<template>
  <v-card class="request-selection-card">
    <!-- Simple Header -->
    <v-card-title class="d-flex align-center justify-space-between pa-4">
      <div>
        <h4 class="text-h6 font-weight-bold">Select Requests</h4>
        <p class="text-caption text-medium-emphasis ma-0">
          Choose approved requests to consolidate into orders
        </p>
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
          variant="outlined"
          size="small"
          :disabled="availableRequests.length === 0"
          @click="selectAll"
        >
          Select All
        </v-btn>
      </div>
    </v-card-title>

    <v-divider />

    <!-- Simple Search -->
    <v-card-text class="pa-4 pb-2">
      <v-text-field
        v-model="searchQuery"
        label="Search requests..."
        variant="outlined"
        density="compact"
        hide-details
        prepend-inner-icon="mdi-magnify"
        clearable
        class="mb-2"
      />
    </v-card-text>

    <!-- Request List -->
    <v-card-text class="pa-4 pt-0" style="max-height: 600px; overflow-y: auto">
      <!-- Loading State -->
      <div v-if="loading" class="text-center pa-8">
        <v-progress-circular indeterminate color="primary" class="mb-2" />
        <div>Loading requests...</div>
      </div>

      <!-- Empty State -->
      <div v-else-if="filteredRequests.length === 0" class="text-center pa-8">
        <v-icon icon="mdi-clipboard-off" size="64" class="text-medium-emphasis mb-4" />
        <div class="text-h6 text-medium-emphasis mb-2">
          {{ searchQuery ? 'No requests found' : 'No approved requests' }}
        </div>
        <div class="text-body-2 text-medium-emphasis mb-4">
          {{
            searchQuery
              ? 'Try different search terms'
              : 'Approved procurement requests will appear here'
          }}
        </div>
        <v-btn v-if="searchQuery" variant="outlined" size="small" @click="searchQuery = ''">
          Clear Search
        </v-btn>
      </div>

      <!-- Request Cards -->
      <div v-else class="request-list">
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
                <v-avatar size="36" :color="getDepartmentColor(request.department)" class="mr-3">
                  <span class="text-caption font-weight-bold">
                    {{ getDepartmentIcon(request.department) }}
                  </span>
                </v-avatar>
                <div>
                  <div class="font-weight-bold text-body-1">{{ request.requestNumber }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ request.department.charAt(0).toUpperCase() + request.department.slice(1) }} •
                    {{ formatDate(request.requestDate) }}
                  </div>
                </div>
              </div>

              <div class="d-flex align-center gap-2">
                <v-chip
                  v-if="request.priority === 'urgent'"
                  color="error"
                  size="small"
                  variant="flat"
                >
                  URGENT
                </v-chip>
                <v-chip color="success" size="small" variant="tonal">Approved</v-chip>
              </div>
            </div>

            <!-- Products Preview -->
            <div class="products-preview">
              <div class="text-body-2 font-weight-medium mb-2">
                {{ request.items.length }} Product{{ request.items.length !== 1 ? 's' : '' }}:
              </div>

              <!-- Product Grid -->
              <v-row class="ma-0">
                <v-col
                  v-for="(item, index) in getItemsPreview(request)"
                  :key="index"
                  cols="12"
                  sm="6"
                  class="pa-1"
                >
                  <div class="product-item">
                    <div class="d-flex align-center">
                      <span class="product-icon mr-2">
                        {{ getProductIcon(item.name) }}
                      </span>
                      <div class="flex-grow-1">
                        <div class="text-body-2 font-weight-medium">
                          {{ item.name }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          {{ item.qty }}
                        </div>
                      </div>
                    </div>
                  </div>
                </v-col>

                <!-- Show more indicator -->
                <v-col v-if="request.items.length > 4" cols="12" class="pa-1">
                  <div class="text-center">
                    <v-chip size="small" variant="text" color="primary">
                      +{{ request.items.length - 4 }} more products
                    </v-chip>
                  </div>
                </v-col>
              </v-row>
            </div>

            <!-- Request Meta -->
            <div
              class="request-meta mt-3 pt-3"
              style="border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity))"
            >
              <div class="d-flex justify-space-between">
                <div class="text-caption text-medium-emphasis">
                  Requested by {{ request.requestedBy }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ getRelativeTime(request.requestDate) }}
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
        <div class="text-body-2 text-medium-emphasis">
          {{ selected.length }} of {{ filteredRequests.length }} requests selected
          <span v-if="estimatedOrdersCount > 0" class="ml-2">
            → ~{{ estimatedOrdersCount }} order{{ estimatedOrdersCount !== 1 ? 's' : '' }}
          </span>
        </div>

        <div class="d-flex gap-2">
          <v-btn
            variant="outlined"
            size="small"
            :disabled="selected.length === 0"
            @click="clearSelection"
          >
            Clear
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="selected.length < 1"
            :loading="consolidating"
            @click="handleConsolidate"
          >
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
import { formatDate, getRelativeTime } from '@/stores/supplier'
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
const searchQuery = ref('')
const consolidating = ref(false)

// Computed
const availableRequests = computed(() => props.requests.filter(r => r.status === 'approved'))

const filteredRequests = computed(() => {
  let requests = [...availableRequests.value]

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    requests = requests.filter(
      r =>
        r.requestNumber.toLowerCase().includes(query) ||
        r.requestedBy.toLowerCase().includes(query) ||
        r.department.toLowerCase().includes(query) ||
        r.items.some(item => item.itemName.toLowerCase().includes(query))
    )
  }

  return requests
})

const estimatedOrdersCount = computed(() => {
  if (selected.value.length === 0) return 0

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
    kitchen: '🍳',
    bar: '🍸'
  }
  return icons[department as keyof typeof icons] || '📋'
}

function getDepartmentColor(department: string): string {
  const colors = {
    kitchen: 'success',
    bar: 'info'
  }
  return colors[department as keyof typeof colors] || 'primary'
}

function getProductIcon(itemName: string): string {
  const icons: Record<string, string> = {
    beef: '🥩',
    steak: '🥩',
    meat: '🥩',
    chicken: '🐔',
    potato: '🥔',
    tomato: '🍅',
    garlic: '🧄',
    onion: '🧅',
    salt: '🧂',
    pepper: '🌶️',
    spice: '🌿',
    herb: '🌿',
    beer: '🍺',
    wine: '🍷',
    cola: '🥤',
    water: '💧',
    milk: '🥛',
    cheese: '🧀',
    bread: '🍞',
    oil: '🫒'
  }

  const lowerName = itemName.toLowerCase()
  for (const [key, icon] of Object.entries(icons)) {
    if (lowerName.includes(key)) return icon
  }
  return '📦'
}

function getItemsPreview(request: ProcurementRequest) {
  return request.items.slice(0, 4).map(item => ({
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
}

function selectAll() {
  selected.value = [...filteredRequests.value.map(r => r.id)]
}

function clearSelection() {
  selected.value = []
}

async function handleConsolidate() {
  if (selected.value.length === 0) return

  try {
    consolidating.value = true
    emit('consolidate', [...selected.value])

    setTimeout(() => {
      clearSelection()
    }, 500)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Consolidation failed', { error })
  } finally {
    consolidating.value = false
  }
}

// Watch for external changes
watch(
  () => props.requests,
  () => {
    const availableIds = availableRequests.value.map(r => r.id)
    selected.value = selected.value.filter(id => availableIds.includes(id))
  },
  { deep: true }
)
</script>

<style lang="scss" scoped>
.request-selection-card {
  .request-list {
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

  .products-preview {
    background: rgba(var(--v-theme-surface-variant), 0.3);
    border-radius: 8px;
    padding: 16px;
  }

  .product-item {
    background: rgba(var(--v-theme-surface), 0.8);
    border-radius: 6px;
    padding: 8px;
    min-height: 48px;
    display: flex;
    align-items: center;
  }

  .product-icon {
    font-size: 18px;
    width: 24px;
    text-align: center;
  }
}

// Selection animation
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

// Urgent pulse
.request-card.urgent {
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

// Responsive
@media (max-width: 768px) {
  .request-selection-card {
    .d-flex.justify-space-between {
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }
  }
}
</style>
