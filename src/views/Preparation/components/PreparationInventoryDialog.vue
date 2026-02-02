<!-- src/views/preparation/components/PreparationInventoryDialog.vue - Адаптация InventoryDialog -->
<template>
  <v-dialog
    :model-value="modelValue"
    :fullscreen="isMobile"
    max-width="900px"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="preparation-inventory-dialog">
      <!-- Compact Header (when collapsed) -->
      <div v-if="isHeaderCollapsed" class="compact-header">
        <div class="d-flex align-center gap-2">
          <v-chip :color="department === 'kitchen' ? 'success' : 'info'" size="x-small">
            {{ formatDepartment(department) }}
          </v-chip>
          <span class="text-body-2">
            <strong>{{ countedItems }}</strong>
            /{{ totalItems }}
          </span>
          <v-progress-linear
            :model-value="progressPercentage"
            height="6"
            rounded
            color="primary"
            class="compact-progress"
          />
        </div>
        <v-spacer />
        <div class="d-flex align-center gap-1">
          <v-btn
            icon="mdi-chevron-down"
            variant="text"
            size="small"
            density="compact"
            @click="isHeaderCollapsed = false"
          />
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            density="compact"
            @click="handleClose"
          />
        </div>
      </div>

      <!-- Full Header (when not collapsed) -->
      <template v-if="!isHeaderCollapsed">
        <v-card-title class="d-flex align-center justify-space-between">
          <div>
            <h3>
              {{ currentInventory ? 'Edit' : 'Start' }} Preparation Inventory -
              {{ formatDepartment(department) }}
            </h3>
            <div class="text-caption text-medium-emphasis">
              {{
                currentInventory
                  ? `Editing ${currentInventory.documentNumber}`
                  : 'Count all preparations and enter actual quantities'
              }}
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="handleClose" />
        </v-card-title>

        <v-divider />

        <div class="header-content pa-4">
          <v-form ref="form" v-model="isFormValid">
            <!-- Responsible Person -->
            <v-text-field
              v-model="responsiblePerson"
              label="Responsible Person"
              :rules="[v => !!v || 'Required field']"
              prepend-inner-icon="mdi-account"
              variant="outlined"
              density="compact"
              class="mb-3"
            />

            <!-- Progress and Filters -->
            <div class="mb-3">
              <div class="d-flex align-center justify-space-between mb-2">
                <div>
                  <div class="text-subtitle-2">
                    Progress: {{ countedItems }}/{{ totalItems }} preparations counted
                    <span v-if="filterType !== 'all'" class="text-caption text-medium-emphasis">
                      (filtered)
                    </span>
                  </div>
                  <v-progress-linear
                    :model-value="progressPercentage"
                    height="6"
                    rounded
                    color="primary"
                    class="mt-1"
                  />
                </div>

                <div class="d-flex gap-2">
                  <v-btn-toggle v-model="filterType" density="compact">
                    <v-btn value="all" size="small">All</v-btn>
                    <v-btn value="discrepancy" size="small">Diff</v-btn>
                    <v-btn value="uncounted" size="small">Uncounted</v-btn>
                  </v-btn-toggle>
                </div>
              </div>
            </div>

            <!-- Critical Shelf Life Warning -->
            <v-alert v-if="hasExpiringItems" type="warning" variant="tonal" density="compact">
              <v-icon icon="mdi-clock-alert-outline" size="small" class="mr-1" />
              <strong>Urgent:</strong>
              Some preparations expire within 24 hours!
            </v-alert>
          </v-form>
        </div>

        <v-divider />
      </template>

      <!-- Items List -->
      <v-card-text ref="itemsListRef" class="items-section pa-0" @scroll="handleScroll">
        <div v-if="filteredItems.length === 0" class="text-center py-8 text-medium-emphasis">
          <v-icon icon="mdi-clipboard-list" size="48" class="mb-2" />
          <div v-if="filterType !== 'all'">
            <div>No preparations match current filter</div>
            <div class="text-caption">Try selecting "All" to see all preparations</div>
            <v-btn size="small" variant="outlined" class="mt-2" @click="filterType = 'all'">
              Show All
            </v-btn>
          </div>
          <div v-else>
            <div>No preparations to count</div>
            <div class="text-caption">All preparations have been counted</div>
          </div>
        </div>

        <div v-else class="items-list">
          <!-- Filtering info -->
          <div v-if="filterType !== 'all'" class="text-center mb-2">
            <v-chip size="small" color="primary" variant="tonal">
              <v-icon icon="mdi-filter" size="14" class="mr-1" />
              {{ filteredItems.length }} of {{ totalItems }}
              <v-btn
                icon="mdi-close"
                size="x-small"
                variant="text"
                class="ml-1"
                @click="filterType = 'all'"
              />
            </v-chip>
          </div>

          <preparation-inventory-item-row
            v-for="item in filteredItems"
            :key="item.id"
            v-model="inventoryItems[getItemIndex(item.id)]"
            :responsible-person="responsiblePerson"
            class="mb-2"
            @update:model-value="updateInventoryItem"
          />
        </div>
      </v-card-text>

      <v-divider />

      <!-- Summary -->
      <div v-if="hasSummary" class="summary-section pa-3">
        <v-row dense>
          <v-col cols="3" class="text-center">
            <div class="text-caption text-medium-emphasis">Total</div>
            <div class="text-subtitle-1">{{ totalItems }}</div>
          </v-col>
          <v-col cols="3" class="text-center">
            <div class="text-caption text-medium-emphasis">Diff</div>
            <div
              class="text-subtitle-1"
              :class="discrepancyCount > 0 ? 'text-warning' : 'text-success'"
            >
              {{ discrepancyCount }}
            </div>
          </v-col>
          <v-col cols="3" class="text-center">
            <div class="text-caption text-medium-emphasis">Value</div>
            <div
              class="text-subtitle-1"
              :class="valueDifference !== 0 ? 'text-warning' : 'text-success'"
            >
              {{ formatCurrency(valueDifference) }}
            </div>
          </v-col>
          <v-col cols="3" class="text-center">
            <div class="text-caption text-medium-emphasis">Status</div>
            <v-chip :color="isComplete ? 'success' : 'warning'" size="x-small" variant="flat">
              {{ isComplete ? 'Done' : 'In Progress' }}
            </v-chip>
          </v-col>
        </v-row>
      </div>

      <v-divider />

      <v-card-actions class="actions-section pa-4">
        <v-btn variant="outlined" @click="handleClose">Cancel</v-btn>

        <v-spacer />

        <!-- Save Draft Button -->
        <v-btn
          v-if="!currentInventory || currentInventory.status === 'draft'"
          color="warning"
          variant="outlined"
          :loading="loading"
          :disabled="!canSaveDraft"
          @click="handleSaveDraft"
        >
          {{ currentInventory ? 'Update Draft' : 'Save Draft' }}
        </v-btn>

        <!-- Finalize Button -->
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          :disabled="!canFinalize"
          @click="handleFinalize"
        >
          {{
            currentInventory?.status === 'draft'
              ? 'Finalize Inventory'
              : currentInventory
                ? 'Update & Finalize'
                : 'Start & Finalize Inventory'
          }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useDisplay } from 'vuetify'
import { usePreparationStore } from '@/stores/preparation'
import { useAuthStore } from '@/stores/auth'
import type {
  PreparationDepartment,
  CreatePreparationInventoryData,
  PreparationInventoryItem,
  PreparationInventoryDocument
} from '@/stores/preparation'
import { DebugUtils } from '@/utils'

// Components
import PreparationInventoryItemRow from './PreparationInventoryItemRow.vue'

const MODULE_NAME = 'PreparationInventoryDialog'

// Props
interface Props {
  modelValue: boolean
  department: PreparationDepartment
  existingInventory?: PreparationInventoryDocument | null
}

const props = withDefaults(defineProps<Props>(), {
  existingInventory: null
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [message: string]
  error: [message: string]
}>()

// Composables
const { mobile: isMobile } = useDisplay()
const preparationStore = usePreparationStore()
const authStore = useAuthStore()

// State
const form = ref()
const isFormValid = ref(false)
const loading = ref(false)
const responsiblePerson = ref('')
const filterType = ref('all')
const inventoryItems = ref<PreparationInventoryItem[]>([])
const currentInventory = ref<PreparationInventoryDocument | null>(null)

// Scroll behavior - collapsible header
const isHeaderCollapsed = ref(false)
const itemsListRef = ref<HTMLElement | null>(null)

// Initialize with current user's name
onMounted(() => {
  if (authStore.user?.displayName) {
    responsiblePerson.value = authStore.user.displayName
  } else if (authStore.user?.email) {
    responsiblePerson.value = authStore.user.email
  }
})

// Computed
const availableBalances = computed(() =>
  preparationStore.state.balances.filter(
    b => b.department === props.department && b.totalQuantity > 0
  )
)

const filteredItems = computed(() => {
  let items = [...inventoryItems.value]

  switch (filterType.value) {
    case 'discrepancy':
      items = items.filter(item => Math.abs(item.difference) > 0.01)
      break
    case 'uncounted':
      items = items.filter(item => !hasItemBeenCounted(item))
      break
    default:
      break
  }

  return items
})

const totalItems = computed(() => inventoryItems.value.length)

const countedItems = computed(
  () => inventoryItems.value.filter(item => hasItemBeenCounted(item)).length
)

const progressPercentage = computed(() =>
  totalItems.value > 0 ? (countedItems.value / totalItems.value) * 100 : 0
)

const discrepancyCount = computed(
  () => inventoryItems.value.filter(item => Math.abs(item.difference) > 0.01).length
)

const valueDifference = computed(() =>
  inventoryItems.value.reduce((sum, item) => sum + item.valueDifference, 0)
)

const hasChanges = computed(() => inventoryItems.value.some(item => hasItemBeenCounted(item)))

const isComplete = computed(() => {
  if (totalItems.value === 0) return false
  return countedItems.value === totalItems.value || hasChanges.value
})

const hasSummary = computed(() => inventoryItems.value.length > 0)

const hasExpiringItems = computed(() => {
  return availableBalances.value.some(b => b.hasNearExpiry || b.hasExpired)
})

const canSaveDraft = computed(
  () => isFormValid.value && responsiblePerson.value && !loading.value && hasChanges.value
)

const canFinalize = computed(() => {
  if (!isFormValid.value || !responsiblePerson.value || loading.value) return false
  return hasChanges.value && totalItems.value > 0
})

// Methods
function formatDepartment(dept: PreparationDepartment): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Handle scroll - collapse header when scrolling down
 */
function handleScroll(event: Event) {
  console.log('🔄 handleScroll called', event)
  const target = event.target as HTMLElement
  if (!target) {
    console.log('❌ No target')
    return
  }
  console.log('📏 scrollTop:', target.scrollTop, 'isHeaderCollapsed:', isHeaderCollapsed.value)
  isHeaderCollapsed.value = target.scrollTop > 50
  console.log('✅ isHeaderCollapsed set to:', isHeaderCollapsed.value)
}

function getItemIndex(itemId: string): number {
  return inventoryItems.value.findIndex(item => item.id === itemId)
}

function hasItemBeenCounted(item: PreparationInventoryItem): boolean {
  return (
    !!item.countedBy ||
    Math.abs(item.actualQuantity - item.systemQuantity) > 0.001 ||
    item.confirmed === true
  )
}

function updateInventoryItem(updatedItem: PreparationInventoryItem) {
  const index = inventoryItems.value.findIndex(item => item.id === updatedItem.id)
  if (index !== -1) {
    if (!updatedItem.countedBy && hasItemBeenCounted(updatedItem)) {
      updatedItem.countedBy = responsiblePerson.value || 'User'
    }

    inventoryItems.value[index] = updatedItem

    DebugUtils.info(MODULE_NAME, 'Preparation inventory item updated', {
      preparationId: updatedItem.preparationId,
      preparationName: updatedItem.preparationName,
      systemQuantity: updatedItem.systemQuantity,
      actualQuantity: updatedItem.actualQuantity,
      difference: updatedItem.difference,
      countedBy: updatedItem.countedBy
    })
  }
}

async function initializeInventoryItems() {
  try {
    // Set default responsible person if not already set
    if (!responsiblePerson.value) {
      if (authStore.user?.displayName) {
        responsiblePerson.value = authStore.user.displayName
      } else if (authStore.user?.email) {
        responsiblePerson.value = authStore.user.email
      } else {
        responsiblePerson.value = 'Default User'
      }
    }

    // ✅ Use store method to get ALL preparations (including 0 stock)
    const inventoryData: CreatePreparationInventoryData = {
      department: props.department,
      responsiblePerson: responsiblePerson.value
    }

    const inventory = await preparationStore.startInventory(inventoryData)
    currentInventory.value = inventory
    inventoryItems.value = [...inventory.items]

    DebugUtils.info(MODULE_NAME, 'Preparation inventory items initialized from store', {
      count: inventoryItems.value.length,
      department: props.department
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to initialize inventory items', { error })
    // Fallback to empty array
    inventoryItems.value = []
  }
}

function loadExistingInventory() {
  if (!props.existingInventory) return

  try {
    DebugUtils.info(MODULE_NAME, 'Loading existing preparation inventory', {
      inventoryId: props.existingInventory.id,
      status: props.existingInventory.status
    })

    currentInventory.value = props.existingInventory
    responsiblePerson.value = props.existingInventory.responsiblePerson

    if (props.existingInventory.items && props.existingInventory.items.length > 0) {
      inventoryItems.value = [...props.existingInventory.items]
    } else {
      initializeInventoryItems()
    }

    DebugUtils.info(MODULE_NAME, 'Existing preparation inventory loaded', {
      itemCount: inventoryItems.value.length,
      status: props.existingInventory.status
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load existing preparation inventory', { error })
    initializeInventoryItems()
  }
}

async function handleSaveDraft() {
  if (!canSaveDraft.value) return

  try {
    loading.value = true
    DebugUtils.info(MODULE_NAME, 'Saving preparation inventory draft', {
      department: props.department,
      responsiblePerson: responsiblePerson.value,
      itemsChanged: countedItems.value,
      totalItems: totalItems.value
    })

    // ✅ currentInventory already created by initializeInventoryItems()
    if (!currentInventory.value) {
      DebugUtils.error(MODULE_NAME, 'No current inventory found - this should not happen')
      throw new Error('No current inventory found')
    }

    if (preparationStore.updateInventory) {
      const updatedInventory = await preparationStore.updateInventory(
        currentInventory.value.id,
        inventoryItems.value
      )
      currentInventory.value = updatedInventory
    } else {
      DebugUtils.warn(MODULE_NAME, 'updateInventory method not available in store')
    }

    DebugUtils.info(MODULE_NAME, 'Preparation inventory draft saved successfully', {
      inventoryId: currentInventory.value.id,
      itemCount: inventoryItems.value.length,
      discrepancies: discrepancyCount.value,
      valueDifference: valueDifference.value
    })

    emit(
      'success',
      `Preparation inventory draft saved. ${countedItems.value}/${totalItems.value} preparations counted.`
    )
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to save preparation inventory draft', { error })
    emit('error', 'Failed to save preparation inventory draft')
  } finally {
    loading.value = false
  }
}

async function handleFinalize() {
  if (!canFinalize.value) return

  try {
    loading.value = true
    DebugUtils.info(MODULE_NAME, 'Finalizing preparation inventory', {
      department: props.department,
      responsiblePerson: responsiblePerson.value,
      discrepancies: discrepancyCount.value,
      valueDifference: valueDifference.value,
      allItemsCounted: isComplete.value
    })

    // ✅ currentInventory already created by initializeInventoryItems()
    if (!currentInventory.value) {
      DebugUtils.error(MODULE_NAME, 'No current inventory found - this should not happen')
      throw new Error('No current inventory found')
    }

    if (preparationStore.updateInventory) {
      await preparationStore.updateInventory(currentInventory.value.id, inventoryItems.value)
    }

    if (preparationStore.finalizeInventory) {
      await preparationStore.finalizeInventory(currentInventory.value.id)
    }

    DebugUtils.info(MODULE_NAME, 'Preparation inventory finalized successfully', {
      inventoryId: currentInventory.value.id,
      totalDiscrepancies: discrepancyCount.value,
      totalValueDifference: valueDifference.value
    })

    const discrepancyMessage =
      discrepancyCount.value > 0
        ? `${discrepancyCount.value} discrepancies found with ${formatCurrency(Math.abs(valueDifference.value))} value difference.`
        : 'No discrepancies found.'

    emit('success', `Preparation inventory completed successfully. ${discrepancyMessage}`)
    handleClose()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to finalize preparation inventory', { error })
    emit('error', 'Failed to finalize preparation inventory')
  } finally {
    loading.value = false
  }
}

function handleClose() {
  resetForm()
  emit('update:modelValue', false)
}

function resetForm() {
  // Reset to current user's name instead of empty string
  if (authStore.user?.displayName) {
    responsiblePerson.value = authStore.user.displayName
  } else if (authStore.user?.email) {
    responsiblePerson.value = authStore.user.email
  } else {
    responsiblePerson.value = ''
  }

  filterType.value = 'all'
  inventoryItems.value = []
  currentInventory.value = null
  isHeaderCollapsed.value = false

  if (form.value) {
    form.value.resetValidation()
  }
}

// Watch for dialog open
watch(
  () => props.modelValue,
  async isOpen => {
    console.log('🔔 Dialog open:', isOpen)
    if (isOpen) {
      isHeaderCollapsed.value = false
      if (props.existingInventory) {
        loadExistingInventory()
      } else {
        await initializeInventoryItems() // ✅ await async call
      }
      // Debug: check ref after dialog opens
      setTimeout(() => {
        console.log('📦 itemsListRef:', itemsListRef.value)
        console.log('📦 itemsListRef.$el:', (itemsListRef.value as any)?.$el)
      }, 500)
    }
  }
)

// Watch for existing inventory changes
watch(
  () => props.existingInventory,
  newInventory => {
    if (newInventory && props.modelValue) {
      loadExistingInventory()
    }
  }
)
</script>

<style lang="scss" scoped>
.preparation-inventory-dialog {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.compact-header {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background-color: var(--v-theme-surface);
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  position: sticky;
  top: 0;
  z-index: 1;
  width: 100%;
  box-sizing: border-box;
}

.compact-progress {
  width: 120px;
  flex-shrink: 0;
}

.header-content {
  background-color: var(--v-theme-surface);
}

.items-section {
  flex: 1;
  overflow-y: auto;
  min-height: 200px;
  background-color: var(--v-theme-background);
}

.items-list {
  padding: var(--spacing-sm);
}

.summary-section {
  background-color: rgba(var(--v-theme-info), 0.04);
}

.actions-section {
  background-color: var(--v-theme-surface);
}

/* Mobile fullscreen adjustments */
@media (max-width: 600px) {
  .preparation-inventory-dialog {
    max-height: 100vh;
  }

  .items-section {
    max-height: none;
    flex: 1;
  }

  .compact-progress {
    width: 60px;
  }
}
</style>
