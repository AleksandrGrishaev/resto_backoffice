<!-- src/views/kitchen/preparation/dialogs/ScheduleConfirmDialog.vue -->
<!-- Kitchen Preparation - Schedule Task Completion Dialog (Horizontal Tablet Layout) -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="650px"
    persistent
    content-class="dialog-top-aligned"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card v-if="task" class="dialog-card">
      <!-- Compact Header -->
      <v-card-title class="dialog-header pa-3 bg-success">
        <div class="d-flex align-center justify-space-between w-100">
          <div class="d-flex align-center gap-2">
            <v-icon icon="mdi-check-circle" />
            <div>
              <span class="text-h6">Complete Task</span>
              <div class="text-caption opacity-80">{{ task.preparationName }}</div>
            </div>
          </div>
          <div class="d-flex align-center gap-2">
            <v-chip :color="slotColor" size="small" variant="flat">
              {{ slotLabel }}
            </v-chip>
            <v-btn icon="mdi-close" variant="text" size="small" @click="handleCancel" />
          </div>
        </div>
      </v-card-title>

      <v-divider />

      <!-- Main Content: Horizontal Layout -->
      <v-card-text class="pa-3 dialog-content">
        <v-form ref="form" v-model="isFormValid">
          <div class="d-flex gap-3">
            <!-- Left Column: Task Info -->
            <div class="info-column">
              <div class="info-card pa-2 mb-2">
                <div class="d-flex justify-space-between align-center">
                  <div>
                    <div class="text-caption text-medium-emphasis">Target</div>
                    <div class="text-body-1 font-weight-bold">
                      {{ task.targetQuantity }} {{ task.targetUnit }}
                    </div>
                  </div>
                  <div v-if="currentStock !== null" class="text-right">
                    <div class="text-caption text-medium-emphasis">Stock</div>
                    <div class="text-body-1 font-weight-medium">
                      {{ currentStock }} {{ task.targetUnit }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Quantity comparison (inline chip) -->
              <v-chip
                v-if="quantityDifference !== 0"
                :color="quantityDifference > 0 ? 'success' : 'warning'"
                size="small"
                :prepend-icon="quantityDifference > 0 ? 'mdi-plus' : 'mdi-minus'"
              >
                {{ Math.abs(quantityDifference) }} {{ task.targetUnit }}
                {{ quantityDifference > 0 ? 'over' : 'under' }}
              </v-chip>
            </div>

            <!-- Right Column: Quantity Input -->
            <div class="input-column">
              <NumericInputField
                v-if="isPortionType"
                v-model="portionInput"
                label="Portions"
                :min="1"
                :max="9999"
                :allow-decimal="false"
                variant="outlined"
                density="compact"
                suffix="pcs"
                prepend-inner-icon="mdi-food-variant"
                :hint="`= ${effectiveQuantity}${task.targetUnit}`"
                persistent-hint
                :error-messages="!portionInput || portionInput <= 0 ? 'Required' : ''"
              />
              <NumericInputField
                v-else
                v-model="quantity"
                label="Quantity"
                :min="1"
                :max="99999"
                :allow-decimal="false"
                variant="outlined"
                density="compact"
                :suffix="task.targetUnit"
                prepend-inner-icon="mdi-scale"
                :error-messages="!quantity || quantity <= 0 ? 'Required' : ''"
              />

              <!-- Cost Display (compact) -->
              <div
                v-if="estimatedCost > 0"
                class="d-flex justify-space-between align-center mt-2 cost-display pa-2"
              >
                <span class="text-body-2 text-medium-emphasis">Est. Cost:</span>
                <span class="font-weight-bold text-success text-subtitle-1">
                  {{ formatCurrency(estimatedCost) }}
                </span>
              </div>
            </div>
          </div>
        </v-form>
      </v-card-text>

      <!-- Compact Actions with inline notes -->
      <v-divider />
      <v-card-actions class="pa-3 dialog-actions">
        <v-text-field
          v-model="notes"
          placeholder="Notes (optional)"
          variant="outlined"
          density="compact"
          hide-details
          class="notes-input"
          prepend-inner-icon="mdi-note-text"
        />
        <v-spacer />
        <v-btn variant="text" size="small" @click="handleCancel">Cancel</v-btn>
        <v-btn
          color="success"
          variant="flat"
          size="small"
          :disabled="!canSubmit"
          prepend-icon="mdi-check"
          @click="handleConfirm"
        >
          Complete
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Empty state if no task -->
    <v-card v-else>
      <v-card-text class="text-center py-6">
        <v-icon size="40" color="grey" class="mb-2">mdi-clipboard-alert</v-icon>
        <div class="text-body-2">No task selected</div>
      </v-card-text>
      <v-card-actions class="pa-3">
        <v-spacer />
        <v-btn size="small" @click="handleCancel">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePreparationStore } from '@/stores/preparation'
import { useRecipesStore } from '@/stores/recipes'
import { useProductsStore } from '@/stores/productsStore'
import { useAuthStore } from '@/stores/auth'
import { useCostCalculation } from '@/stores/recipes/composables/useCostCalculation'
import type { ProductionScheduleItem } from '@/stores/kitchenKpi'
import { DebugUtils, formatIDR } from '@/utils'
import { useBackgroundTasks } from '@/core/background'

const MODULE_NAME = 'ScheduleConfirmDialog'

// Props
interface Props {
  modelValue: boolean
  task: ProductionScheduleItem | null
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirmed: [data: { taskId: string; quantity: number; notes: string; batchId?: string }]
  completed: [] // Emitted when background task completes successfully - triggers data reload
  cancelled: []
}>()

// Stores & Composables
const preparationStore = usePreparationStore()
const recipesStore = useRecipesStore()
const productsStore = useProductsStore()
const authStore = useAuthStore()
const { calculateDirectCost } = useCostCalculation()
const { addScheduleCompleteTask } = useBackgroundTasks()

// State
const form = ref()
const isFormValid = ref(false)
const quantity = ref(0)
const portionInput = ref(0)
const notes = ref('')

// Computed
const userDepartment = computed<'kitchen' | 'bar'>(() => {
  const roles = authStore.userRoles
  if (roles.includes('bar') && !roles.includes('kitchen')) {
    return 'bar'
  }
  return 'kitchen'
})

const preparation = computed(() => {
  if (!props.task) return null
  return recipesStore.preparations.find(p => p.id === props.task!.preparationId)
})

const isPortionType = computed(() => {
  return preparation.value?.portionType === 'portion' && preparation.value?.portionSize
})

const portionSize = computed(() => {
  return preparation.value?.portionSize || 1
})

const effectiveQuantity = computed(() => {
  if (isPortionType.value) {
    return portionInput.value * portionSize.value
  }
  return quantity.value
})

const currentStock = computed(() => {
  if (!props.task) return null
  const balance = preparationStore.getBalance(props.task.preparationId, userDepartment.value)
  return balance?.totalQuantity || 0
})

const quantityDifference = computed(() => {
  if (!props.task) return 0
  return effectiveQuantity.value - props.task.targetQuantity
})

const slotLabel = computed(() => {
  const slots: Record<string, string> = {
    urgent: 'Urgent',
    morning: 'Morning (6:00-12:00)',
    afternoon: 'Afternoon (12:00-18:00)',
    evening: 'Evening (18:00-22:00)'
  }
  return slots[props.task?.productionSlot || ''] || props.task?.productionSlot
})

const slotColor = computed(() => {
  const colors: Record<string, string> = {
    urgent: 'error',
    morning: 'info',
    afternoon: 'warning',
    evening: 'purple'
  }
  return colors[props.task?.productionSlot || ''] || 'grey'
})

// Cost calculation
const calculatedCostPerUnit = computed(() => {
  if (!preparation.value?.recipe?.length) return 0

  let totalCost = 0
  for (const ingredient of preparation.value.recipe) {
    if (ingredient.type === 'preparation') {
      const prep = recipesStore.preparations.find(p => p.id === ingredient.id)
      if (!prep) continue
      const costPerUnit = prep.lastKnownCost || prep.costPerPortion || 0
      totalCost += ingredient.quantity * costPerUnit
    } else {
      const product = productsStore.getProductById(ingredient.id)
      if (!product || !product.isActive) continue
      const ingredientCost = calculateDirectCost(
        ingredient.quantity,
        product,
        ingredient.useYieldPercentage || false
      )
      totalCost += ingredientCost
    }
  }

  return totalCost / (preparation.value.outputQuantity || 1)
})

const estimatedCost = computed(() => {
  if (isPortionType.value && portionInput.value) {
    return calculatedCostPerUnit.value * portionInput.value
  }
  return calculatedCostPerUnit.value * (effectiveQuantity.value || 0)
})

const canSubmit = computed(() => {
  return effectiveQuantity.value > 0 && props.task
})

// Watchers
watch(
  () => props.task,
  newTask => {
    if (newTask) {
      // Pre-fill with target quantity
      if (isPortionType.value && portionSize.value > 0) {
        portionInput.value = Math.ceil(newTask.targetQuantity / portionSize.value)
      } else {
        quantity.value = newTask.targetQuantity
      }
      notes.value = ''
    }
  },
  { immediate: true }
)

watch(
  () => props.modelValue,
  open => {
    if (open && props.task) {
      // Reset when dialog opens
      if (isPortionType.value && portionSize.value > 0) {
        portionInput.value = Math.ceil(props.task.targetQuantity / portionSize.value)
      } else {
        quantity.value = props.task.targetQuantity
      }
      notes.value = ''
    }
  }
)

// Methods
function formatCurrency(amount: number): string {
  return formatIDR(amount)
}

function handleConfirm() {
  if (!canSubmit.value || !props.task || !preparation.value) return

  const expiryDate = new Date()
  expiryDate.setDate(expiryDate.getDate() + (preparation.value.shelfLife || 2))
  expiryDate.setHours(20, 0, 0, 0)

  const costPerGram = isPortionType.value
    ? calculatedCostPerUnit.value / portionSize.value
    : calculatedCostPerUnit.value

  const isOnTime = determineIfOnTime(props.task.productionSlot)

  DebugUtils.info(MODULE_NAME, 'Queueing schedule complete task (background)', {
    taskId: props.task.id,
    preparation: preparation.value.name,
    quantity: effectiveQuantity.value
  })

  // Capture values before closing (props.task may become null)
  const taskId = props.task.id
  const qty = effectiveQuantity.value
  const noteValue = notes.value

  // Queue background task (non-blocking)
  addScheduleCompleteTask(
    {
      taskId: taskId,
      preparationId: props.task.preparationId,
      preparationName: preparation.value.name,
      targetQuantity: props.task.targetQuantity,
      completedQuantity: qty,
      unit: props.task.targetUnit,
      productionSlot: props.task.productionSlot,
      department: userDepartment.value,
      responsiblePerson: authStore.userName,
      responsiblePersonId: authStore.userId || '', // UUID for database (empty = null)
      notes: noteValue,
      receiptData: {
        department: userDepartment.value,
        responsiblePerson: authStore.userName,
        sourceType: 'production',
        items: [
          {
            preparationId: props.task.preparationId,
            quantity: qty,
            costPerUnit: costPerGram,
            expiryDate: expiryDate.toISOString().slice(0, 16),
            notes: noteValue
          }
        ],
        notes: `Schedule task completion: ${noteValue || 'No notes'}`
      },
      kpiData: {
        userId: authStore.userId || 'unknown',
        userName: authStore.userName,
        isOnTime
      }
    },
    {
      onSuccess: () => {
        // Background task completed - trigger data reload in parent
        emit('completed')
      },
      onError: (error: string) => {
        DebugUtils.error(MODULE_NAME, 'Background task failed', { error })
      }
    }
  )

  // Emit confirmed BEFORE closing (with captured values)
  emit('confirmed', {
    taskId: taskId,
    quantity: qty,
    notes: noteValue
  })

  // Close dialog immediately (operations continue in background)
  emit('update:modelValue', false)
}

function determineIfOnTime(slot: string): boolean {
  const now = new Date()
  const hour = now.getHours()

  switch (slot) {
    case 'urgent':
      return true // Urgent tasks are always "on time" if completed same day
    case 'morning':
      return hour < 12
    case 'afternoon':
      return hour >= 12 && hour < 18
    case 'evening':
      return hour >= 18 && hour < 22
    default:
      return true
  }
}

function handleCancel() {
  emit('cancelled')
  emit('update:modelValue', false)
}
</script>

<!-- Global style for dialog positioning (not scoped) -->
<style lang="scss">
.dialog-top-aligned {
  align-self: flex-start !important;
  margin-top: 5vh !important;
}
</style>

<style lang="scss" scoped>
// Horizontal tablet-optimized layout
.dialog-card {
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}

.dialog-header {
  flex-shrink: 0;
}

.dialog-content {
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.dialog-actions {
  flex-shrink: 0;
}

.info-column {
  flex: 1;
  min-width: 200px;
}

.input-column {
  min-width: 180px;
  max-width: 220px;
}

.info-card {
  background-color: rgba(var(--v-theme-primary), 0.08);
  border-radius: 6px;
}

.cost-display {
  background-color: rgba(var(--v-theme-success), 0.08);
  border-radius: 6px;
}

.notes-input {
  max-width: 250px;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}

.w-100 {
  width: 100%;
}

.opacity-80 {
  opacity: 0.8;
}
</style>
