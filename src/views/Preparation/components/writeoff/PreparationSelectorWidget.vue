<!-- src/views/preparation/components/writeoff/PreparationSelectorWidget.vue - Simplified Version -->
<template>
  <div class="preparation-selector-widget">
    <!-- Search -->
    <v-text-field
      v-model="searchTerm"
      label="Search preparations..."
      variant="outlined"
      density="comfortable"
      prepend-inner-icon="mdi-magnify"
      clearable
      hide-details
      class="mb-4"
    />

    <!-- Quick Filter Chips -->
    <div class="quick-filters mb-4">
      <v-chip-group>
        <v-chip
          :color="quickFilter === 'all' ? 'primary' : 'default'"
          :variant="quickFilter === 'all' ? 'flat' : 'outlined'"
          @click="quickFilter = 'all'"
        >
          All ({{ filteredPreparations.length }})
        </v-chip>
        <v-chip
          :color="quickFilter === 'expired' ? 'error' : 'default'"
          :variant="quickFilter === 'expired' ? 'flat' : 'outlined'"
          @click="quickFilter = 'expired'"
        >
          Expired ({{ expiredPreparations.length }})
        </v-chip>
        <v-chip
          :color="quickFilter === 'expiring' ? 'warning' : 'default'"
          :variant="quickFilter === 'expiring' ? 'flat' : 'outlined'"
          @click="quickFilter = 'expiring'"
        >
          Expiring ({{ expiringPreparations.length }})
        </v-chip>
      </v-chip-group>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="text-center py-8">
      <v-progress-circular indeterminate color="primary" class="mb-2" />
      <div class="text-body-1">Loading preparations...</div>
    </div>

    <!-- Preparations List -->
    <div v-else class="preparations-list">
      <div v-if="displayedPreparations.length === 0" class="text-center py-8">
        <v-icon icon="mdi-chef-hat" size="48" class="text-medium-emphasis mb-2" />
        <div class="text-h6 text-medium-emphasis">No preparations found</div>
        <div class="text-body-2 text-medium-emphasis">No preparations available for write-off</div>
      </div>

      <!-- Preparation Rows -->
      <div v-else class="preparations-table">
        <v-list class="pa-0">
          <v-list-item
            v-for="preparation in displayedPreparations"
            :key="preparation.id"
            class="preparation-row mb-1"
            @click="handlePreparationClick(preparation)"
          >
            <template #prepend>
              <div class="status-indicator">
                <v-icon
                  :icon="getStatusIcon(preparation)"
                  :color="getStatusColor(preparation)"
                  size="18"
                />
              </div>
            </template>

            <v-list-item-title class="preparation-name">
              {{ preparation.name }}
            </v-list-item-title>

            <v-list-item-subtitle class="preparation-details">
              <div class="d-flex align-center gap-3 text-body-2">
                <span class="stock-info">
                  <strong>{{ getStock(preparation.id) }} {{ getUnit(preparation.id) }}</strong>
                </span>
                <span v-if="hasExpiryIssues(preparation.id)" class="expiry-info">
                  <v-chip :color="getExpiryColor(preparation.id)" size="x-small" variant="flat">
                    {{ getExpiryText(preparation.id) }}
                  </v-chip>
                </span>
                <span class="value-info text-medium-emphasis">
                  {{ formatIDR(getValue(preparation.id)) }}
                </span>
              </div>
            </v-list-item-subtitle>

            <template #append>
              <v-btn
                color="primary"
                variant="outlined"
                size="small"
                density="compact"
                @click.stop="handlePreparationClick(preparation)"
              >
                <v-icon icon="mdi-plus" size="16" />
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
      </div>
    </div>

    <!-- Quantity Dialog -->
    <preparation-quantity-dialog
      v-model="showQuantityDialog"
      :preparation="selectedPreparation"
      :department="department"
      @confirm="handleQuantityConfirm"
      @cancel="handleQuantityCancel"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePreparationStore } from '@/stores/preparation'
import { formatIDR } from '@/utils/currency'
import { DebugUtils } from '@/utils'
import PreparationQuantityDialog from './PreparationQuantityDialog.vue'
import type { PreparationDepartment } from '@/stores/preparation/types'

const MODULE_NAME = 'PreparationSelectorWidget'

interface Preparation {
  id: string
  name: string
  unit: string
  type?: string
}

interface Props {
  department: PreparationDepartment
  canSelect?: boolean
  multiSelect?: boolean
  showSelectionSummary?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  canSelect: true,
  multiSelect: true,
  showSelectionSummary: true
})

const emit = defineEmits<{
  'preparation-selected': [preparation: Preparation]
  'quick-write-off': [preparation: Preparation, quantity: number, notes: string]
}>()

// Store
const preparationStore = usePreparationStore()

// State
const searchTerm = ref('')
const quickFilter = ref<'all' | 'expired' | 'expiring'>('all')
const showQuantityDialog = ref(false)
const selectedPreparation = ref<Preparation | null>(null)

// Computed
const availablePreparations = computed(() => {
  try {
    const balances = preparationStore.departmentBalances(props.department)
    return balances
      .filter(b => b.totalQuantity > 0) // Only preparations with stock
      .map(balance => ({
        id: balance.preparationId,
        name: balance.preparationName,
        unit: balance.unit,
        type: 'preparation'
      }))
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to get available preparations', { error })
    return []
  }
})

const filteredPreparations = computed(() => {
  let preparations = [...availablePreparations.value]

  if (searchTerm.value) {
    const searchLower = searchTerm.value.toLowerCase()
    preparations = preparations.filter(prep => prep.name.toLowerCase().includes(searchLower))
  }

  return preparations
})

const displayedPreparations = computed(() => {
  let preparations = [...filteredPreparations.value]

  switch (quickFilter.value) {
    case 'expired':
      preparations = preparations.filter(prep => isExpired(prep.id))
      break
    case 'expiring':
      preparations = preparations.filter(prep => isExpiring(prep.id))
      break
    default:
      break
  }

  return preparations.sort((a, b) => {
    // Sort by expiry status first, then alphabetically
    const aExpired = isExpired(a.id)
    const bExpired = isExpired(b.id)
    const aExpiring = isExpiring(a.id)
    const bExpiring = isExpiring(b.id)

    if (aExpired && !bExpired) return -1
    if (!aExpired && bExpired) return 1
    if (aExpiring && !bExpiring) return -1
    if (!aExpiring && bExpiring) return 1

    return a.name.localeCompare(b.name)
  })
})

const expiredPreparations = computed(() =>
  availablePreparations.value.filter(prep => isExpired(prep.id))
)

const expiringPreparations = computed(() =>
  availablePreparations.value.filter(prep => isExpiring(prep.id))
)

const isLoading = computed(() => {
  return preparationStore.state.loading.balances
})

// Methods
function handlePreparationClick(preparation: Preparation) {
  selectedPreparation.value = preparation
  showQuantityDialog.value = true
}

function handleQuantityConfirm(preparation: Preparation, quantity: number, notes: string) {
  DebugUtils.info(MODULE_NAME, 'Quantity confirmed', {
    preparationId: preparation.id,
    quantity,
    notes
  })

  emit('quick-write-off', preparation, quantity, notes)
  showQuantityDialog.value = false
  selectedPreparation.value = null
}

function handleQuantityCancel() {
  showQuantityDialog.value = false
  selectedPreparation.value = null
}

// Helper methods
function getStock(preparationId: string): number {
  const balance = preparationStore.getBalance(preparationId, props.department)
  return balance?.totalQuantity || 0
}

function getUnit(preparationId: string): string {
  const balance = preparationStore.getBalance(preparationId, props.department)
  return balance?.unit || 'gram'
}

function getValue(preparationId: string): number {
  const balance = preparationStore.getBalance(preparationId, props.department)
  return balance?.totalValue || 0
}

function isExpired(preparationId: string): boolean {
  const balance = preparationStore.getBalance(preparationId, props.department)
  return balance?.hasExpired || false
}

function isExpiring(preparationId: string): boolean {
  const balance = preparationStore.getBalance(preparationId, props.department)
  return balance?.hasNearExpiry || false
}

function hasExpiryIssues(preparationId: string): boolean {
  return isExpired(preparationId) || isExpiring(preparationId)
}

function getStatusIcon(preparation: Preparation): string {
  const balance = preparationStore.getBalance(preparation.id, props.department)

  if (!balance || balance.totalQuantity === 0) return 'mdi-chef-hat'
  if (balance.hasExpired) return 'mdi-alert-circle'
  if (balance.hasNearExpiry) return 'mdi-clock-alert'
  if (balance.belowMinStock) return 'mdi-package-down'
  return 'mdi-chef-hat'
}

function getStatusColor(preparation: Preparation): string {
  const balance = preparationStore.getBalance(preparation.id, props.department)

  if (!balance || balance.totalQuantity === 0) return 'grey'
  if (balance.hasExpired) return 'error'
  if (balance.hasNearExpiry) return 'warning'
  if (balance.belowMinStock) return 'info'
  return 'success'
}

function getExpiryColor(preparationId: string): string {
  if (isExpired(preparationId)) return 'error'
  if (isExpiring(preparationId)) return 'warning'
  return 'success'
}

function getExpiryText(preparationId: string): string {
  if (isExpired(preparationId)) return 'Expired'
  if (isExpiring(preparationId)) return 'Expiring'
  return 'Fresh'
}

// Lifecycle
onMounted(async () => {
  if (preparationStore.state.balances.length === 0) {
    await preparationStore.fetchBalances(props.department)
  }
})
</script>

<style lang="scss" scoped>
.preparation-selector-widget {
  .quick-filters {
    .v-chip-group {
      gap: 8px;
    }
  }

  .preparations-list {
    min-height: 200px;
  }

  .preparation-row {
    border-radius: 8px;
    margin-bottom: 2px;
    border: 1px solid transparent;
    transition: all 0.2s ease;
    min-height: 60px;

    &:hover {
      background-color: rgba(var(--v-theme-primary), 0.05);
      cursor: pointer;
    }

    .status-indicator {
      width: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .preparation-name {
      font-weight: 600;
      margin-bottom: 2px;
      font-size: 0.9rem;
    }

    .preparation-details {
      .stock-info {
        min-width: 80px;
        font-size: 0.875rem;
      }

      .expiry-info {
        min-width: auto;
      }

      .value-info {
        min-width: 80px;
        font-size: 0.875rem;
      }
    }
  }
}
</style>
