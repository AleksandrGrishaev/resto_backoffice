<!-- src/views/kitchen/preparation/dialogs/ScheduleConfirmDialog.vue -->
<!-- Kitchen Preparation - Schedule Task Completion Confirmation Dialog -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="450px"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card v-if="task">
      <v-card-title class="d-flex align-center justify-space-between bg-success">
        <div class="d-flex align-center">
          <v-icon icon="mdi-check-circle" class="mr-2" />
          <span>Complete Task</span>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" @click="handleCancel" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <!-- Task Info -->
        <v-card variant="tonal" color="primary" class="mb-4">
          <v-card-text class="py-3">
            <div class="text-h6 font-weight-bold mb-1">{{ task.preparationName }}</div>
            <div class="d-flex align-center gap-4 text-body-2">
              <span>
                <v-icon size="small" class="mr-1">mdi-target</v-icon>
                Target: {{ task.targetQuantity }} {{ task.targetUnit }}
              </span>
              <span v-if="currentStock !== null">
                <v-icon size="small" class="mr-1">mdi-package-variant</v-icon>
                Stock: {{ currentStock }} {{ task.targetUnit }}
              </span>
            </div>
            <div v-if="task.productionSlot" class="text-caption text-medium-emphasis mt-1">
              <v-chip :color="slotColor" size="x-small" variant="flat">
                {{ slotLabel }}
              </v-chip>
            </div>
          </v-card-text>
        </v-card>

        <!-- Quantity Input -->
        <v-form ref="form" v-model="isFormValid">
          <v-text-field
            v-if="isPortionType"
            v-model.number="portionInput"
            label="Actual Portions Produced"
            type="number"
            min="1"
            step="1"
            variant="outlined"
            class="mb-4"
            suffix="portions"
            prepend-inner-icon="mdi-food-variant"
            :hint="`${portionInput || 0} x ${portionSize}g = ${effectiveQuantity}g`"
            persistent-hint
            autofocus
            :rules="[v => (v && v > 0) || 'Enter quantity']"
          />
          <v-text-field
            v-else
            v-model.number="quantity"
            label="Actual Quantity Produced"
            type="number"
            min="1"
            step="50"
            variant="outlined"
            class="mb-4"
            :suffix="task.targetUnit"
            prepend-inner-icon="mdi-scale"
            autofocus
            :rules="[v => (v && v > 0) || 'Enter quantity']"
          />

          <!-- Quantity comparison -->
          <v-alert
            v-if="quantityDifference !== 0"
            :type="quantityDifference > 0 ? 'success' : 'warning'"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            <template v-if="quantityDifference > 0">
              Producing {{ Math.abs(quantityDifference) }} {{ task.targetUnit }} MORE than target
            </template>
            <template v-else>
              Producing {{ Math.abs(quantityDifference) }} {{ task.targetUnit }} LESS than target
            </template>
          </v-alert>

          <!-- Cost Display -->
          <div
            v-if="estimatedCost > 0"
            class="d-flex justify-space-between align-center mb-4 text-body-1"
          >
            <span class="text-medium-emphasis">Estimated Cost:</span>
            <span class="font-weight-bold text-success text-h6">
              {{ formatCurrency(estimatedCost) }}
            </span>
          </div>

          <!-- Notes -->
          <v-textarea
            v-model="notes"
            label="Notes (optional)"
            variant="outlined"
            rows="2"
            placeholder="Any notes about this production..."
          />
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="handleCancel">Cancel</v-btn>
        <v-btn
          color="success"
          variant="flat"
          :loading="loading"
          :disabled="!canSubmit"
          prepend-icon="mdi-check"
          @click="handleConfirm"
        >
          Confirm Production
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Empty state if no task -->
    <v-card v-else>
      <v-card-text class="text-center py-8">
        <v-icon size="48" color="grey" class="mb-4">mdi-clipboard-alert</v-icon>
        <div class="text-body-1">No task selected</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="handleCancel">Close</v-btn>
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
import { useKitchenKpiStore } from '@/stores/kitchenKpi'
import { useCostCalculation } from '@/stores/recipes/composables/useCostCalculation'
import type { CreatePreparationReceiptData } from '@/stores/preparation'
import type { ProductionScheduleItem } from '@/stores/kitchenKpi'
import { DebugUtils, TimeUtils, formatIDR } from '@/utils'

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
  cancelled: []
}>()

// Stores
const preparationStore = usePreparationStore()
const recipesStore = useRecipesStore()
const productsStore = useProductsStore()
const authStore = useAuthStore()
const kpiStore = useKitchenKpiStore()
const { calculateDirectCost } = useCostCalculation()

// State
const form = ref()
const isFormValid = ref(false)
const loading = ref(false)
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
  return effectiveQuantity.value > 0 && !loading.value && props.task
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

async function handleConfirm() {
  if (!canSubmit.value || !props.task || !preparation.value) return

  try {
    loading.value = true

    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + (preparation.value.shelfLife || 2))
    expiryDate.setHours(20, 0, 0, 0)

    const costPerGram = isPortionType.value
      ? calculatedCostPerUnit.value / portionSize.value
      : calculatedCostPerUnit.value

    // Create production receipt
    const receiptData: CreatePreparationReceiptData = {
      department: userDepartment.value,
      responsiblePerson: authStore.userName,
      sourceType: 'production',
      items: [
        {
          preparationId: props.task.preparationId,
          quantity: effectiveQuantity.value,
          costPerUnit: costPerGram,
          expiryDate: expiryDate.toISOString().slice(0, 16),
          notes: notes.value
        }
      ],
      notes: `Schedule task completion: ${notes.value || 'No notes'}`
    }

    DebugUtils.info(MODULE_NAME, 'Creating production from schedule task', {
      taskId: props.task.id,
      preparation: preparation.value.name,
      quantity: effectiveQuantity.value
    })

    // Create receipt
    const receipt = await preparationStore.createReceipt(receiptData)

    // Mark task as completed in KPI store
    await kpiStore.completeTask({
      taskId: props.task.id,
      completedBy: authStore.userName,
      completedQuantity: effectiveQuantity.value,
      notes: notes.value,
      preparationBatchId: receipt?.id
    })

    // Record schedule completion in KPI
    try {
      const isOnTime = determineIfOnTime(props.task.productionSlot)
      await kpiStore.recordScheduleCompletion(
        authStore.userId || 'unknown',
        authStore.userName,
        userDepartment.value,
        {
          scheduleItemId: props.task.id,
          preparationId: props.task.preparationId,
          preparationName: preparation.value.name,
          targetQuantity: props.task.targetQuantity,
          actualQuantity: effectiveQuantity.value,
          productionSlot: props.task.productionSlot,
          isOnTime,
          timestamp: TimeUtils.getCurrentLocalISO()
        }
      )
    } catch (kpiError) {
      DebugUtils.error(MODULE_NAME, 'Failed to record schedule completion KPI', { kpiError })
    }

    emit('confirmed', {
      taskId: props.task.id,
      quantity: effectiveQuantity.value,
      notes: notes.value,
      batchId: receipt?.id
    })
    emit('update:modelValue', false)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to complete task', { error })
  } finally {
    loading.value = false
  }
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

<style lang="scss" scoped>
.gap-4 {
  gap: 16px;
}
</style>
