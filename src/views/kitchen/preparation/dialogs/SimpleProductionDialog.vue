<!-- src/views/kitchen/preparation/dialogs/SimpleProductionDialog.vue -->
<!-- Kitchen Preparation - Simple Production Dialog (Horizontal Tablet Layout) -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="700px"
    persistent
    content-class="dialog-top-aligned"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="dialog-card">
      <!-- Compact Header -->
      <v-card-title class="dialog-header pa-3">
        <div class="d-flex align-center justify-space-between w-100">
          <div class="d-flex align-center gap-3">
            <v-icon icon="mdi-chef-hat" color="success" />
            <div>
              <h3 class="text-h6">New Production</h3>
              <div v-if="selectedPreparation" class="text-caption text-medium-emphasis">
                {{ selectedPreparation.name }}
              </div>
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" size="small" @click="handleClose" />
        </div>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-3 dialog-content">
        <v-form ref="form" v-model="isFormValid">
          <!-- Horizontal layout: Left = Selector/Info, Right = Quantity/Cost -->
          <div class="d-flex gap-3">
            <!-- Left Column -->
            <div class="left-column">
              <!-- Preparation Selector (if not preselected) -->
              <v-autocomplete
                v-if="!preselectedPreparationId"
                v-model="selectedPreparationId"
                :items="availablePreparations"
                item-title="name"
                item-value="id"
                placeholder="Select Preparation"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-chef-hat"
                :rules="[v => !!v || 'Required']"
                :loading="loadingPreparations"
                clearable
                hide-details
              >
                <template #item="{ props, item }">
                  <v-list-item v-bind="props">
                    <template #subtitle>
                      <span class="text-caption">
                        {{ item.raw.code }} &bull;
                        <template v-if="item.raw.portionType === 'portion'">
                          {{ item.raw.portionSize }}{{ item.raw.outputUnit }}/portion
                        </template>
                        <template v-else>
                          {{ item.raw.outputQuantity }} {{ item.raw.outputUnit }}
                        </template>
                      </span>
                    </template>
                  </v-list-item>
                </template>
              </v-autocomplete>

              <!-- Recipe Output Info (compact) -->
              <div v-if="selectedPreparation" class="recipe-info mt-2 pa-2">
                <div class="d-flex justify-space-between align-center">
                  <div>
                    <div class="text-caption text-medium-emphasis">Recipe Output</div>
                    <div class="text-body-1 font-weight-medium">
                      <template v-if="isPortionType">
                        1 portion ({{ selectedPreparation.portionSize
                        }}{{ selectedPreparation.outputUnit }})
                      </template>
                      <template v-else>
                        {{ selectedPreparation.outputQuantity }}
                        {{ selectedPreparation.outputUnit }}
                      </template>
                    </div>
                  </div>
                  <div v-if="hasRecipe" class="text-right">
                    <div class="text-caption text-medium-emphasis">Ingredients</div>
                    <div class="text-body-2 font-weight-medium">
                      {{ selectedPreparation.recipe?.length || 0 }} items
                    </div>
                  </div>
                </div>
              </div>

              <!-- Warning: No Recipe (inline) -->
              <v-chip
                v-if="selectedPreparation && !hasRecipe"
                color="warning"
                size="small"
                prepend-icon="mdi-alert"
                class="mt-2"
              >
                No recipe
              </v-chip>
            </div>

            <!-- Right Column -->
            <div v-if="selectedPreparation" class="right-column">
              <!-- Quantity Input - Portion Type -->
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
                :hint="`= ${effectiveQuantity}${selectedPreparation.outputUnit}`"
                persistent-hint
                :error-messages="!portionInput || portionInput <= 0 ? 'Required' : ''"
              />

              <!-- Quantity Input - Weight Type -->
              <NumericInputField
                v-else
                v-model="quantity"
                label="Quantity"
                :min="1"
                :max="99999"
                :allow-decimal="false"
                variant="outlined"
                density="compact"
                :suffix="selectedPreparation?.outputUnit || 'g'"
                prepend-inner-icon="mdi-scale"
                :hint="quantityHint"
                persistent-hint
                :error-messages="!quantity || quantity <= 0 ? 'Required' : ''"
              />

              <!-- Cost Display (compact) -->
              <div
                v-if="hasRecipe && calculatedCost > 0"
                class="d-flex justify-space-between align-center mt-2 cost-display pa-2"
              >
                <span class="text-body-2 text-medium-emphasis">Est. Cost:</span>
                <span class="font-weight-bold text-success text-subtitle-1">
                  {{ formatCurrency(calculatedCost) }}
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
        <v-btn variant="text" size="small" @click="handleClose">Cancel</v-btn>
        <v-btn
          color="success"
          variant="flat"
          size="small"
          :loading="loading"
          :disabled="!canSubmit"
          prepend-icon="mdi-chef-hat"
          @click="handleSubmit"
        >
          Produce
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { usePreparationStore } from '@/stores/preparation'
import { useRecipesStore } from '@/stores/recipes'
import { useProductsStore } from '@/stores/productsStore'
import { useAuthStore } from '@/stores/auth'
import { useCostCalculation } from '@/stores/recipes/composables/useCostCalculation'
import type { CreatePreparationReceiptData } from '@/stores/preparation'
import { DebugUtils, TimeUtils, formatIDR } from '@/utils'

const MODULE_NAME = 'SimpleProductionDialog'

// Props
interface Props {
  modelValue: boolean
  preselectedPreparationId?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  preselectedPreparationId: null
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [message: string]
  completed: [] // Emitted when background task completes successfully - triggers data reload
  error: [message: string]
}>()

// Stores
const preparationStore = usePreparationStore()
const recipesStore = useRecipesStore()
const productsStore = useProductsStore()
const authStore = useAuthStore()
const { calculateDirectCost } = useCostCalculation()

// Background tasks (non-blocking processing)
import { useBackgroundTasks } from '@/core/background'
const { addProductionTask } = useBackgroundTasks()

// State
const form = ref()
const isFormValid = ref(false)
const loading = ref(false)
const loadingPreparations = ref(false)
const selectedPreparationId = ref('')
const quantity = ref(0)
const portionInput = ref(0)
const notes = ref('')

// Computed - User department from role
const userDepartment = computed<'kitchen' | 'bar'>(() => {
  const roles = authStore.userRoles
  if (roles.includes('bar') && !roles.includes('kitchen')) {
    return 'bar'
  }
  return 'kitchen'
})

const selectedPreparation = computed(() => {
  if (!selectedPreparationId.value) return null
  return recipesStore.preparations.find(p => p.id === selectedPreparationId.value)
})

const hasRecipe = computed(() => {
  return selectedPreparation.value?.recipe && selectedPreparation.value.recipe.length > 0
})

const isPortionType = computed(() => {
  return (
    selectedPreparation.value?.portionType === 'portion' && selectedPreparation.value?.portionSize
  )
})

const portionSize = computed(() => {
  return selectedPreparation.value?.portionSize || 1
})

const effectiveQuantity = computed(() => {
  if (isPortionType.value) {
    return portionInput.value * portionSize.value
  }
  return quantity.value
})

const multiplier = computed(() => {
  if (!selectedPreparation.value || !effectiveQuantity.value) return 1
  if (isPortionType.value && portionInput.value) {
    return portionInput.value / selectedPreparation.value.outputQuantity
  }
  return effectiveQuantity.value / selectedPreparation.value.outputQuantity
})

const calculatedCostPerUnit = computed(() => {
  if (!selectedPreparation.value || !hasRecipe.value) return 0

  let totalCost = 0
  for (const ingredient of selectedPreparation.value.recipe || []) {
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

  return totalCost / selectedPreparation.value.outputQuantity
})

const calculatedCost = computed(() => {
  if (isPortionType.value && portionInput.value) {
    return calculatedCostPerUnit.value * portionInput.value
  }
  return calculatedCostPerUnit.value * (effectiveQuantity.value || 0)
})

const quantityHint = computed(() => {
  if (!selectedPreparation.value) return ''
  const recipeOutput = selectedPreparation.value.outputQuantity
  if (!quantity.value || quantity.value === recipeOutput) {
    return `Standard batch: ${recipeOutput} ${selectedPreparation.value.outputUnit}`
  }
  return `${multiplier.value.toFixed(2)}x recipe (standard: ${recipeOutput} ${selectedPreparation.value.outputUnit})`
})

const calculatedExpiryDate = computed(() => {
  if (!selectedPreparation.value?.shelfLife) {
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 2)
    return expiry
  }
  const expiry = new Date()
  expiry.setDate(expiry.getDate() + selectedPreparation.value.shelfLife)
  return expiry
})

const availablePreparations = computed(() => {
  try {
    // Filter by department
    return recipesStore.preparations
      .filter(p => p.department === userDepartment.value || p.department === 'all')
      .map(p => ({
        id: p.id,
        name: p.name,
        code: p.code,
        outputQuantity: p.outputQuantity,
        outputUnit: p.outputUnit,
        portionType: p.portionType,
        portionSize: p.portionSize
      }))
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to get preparations', { error })
    return []
  }
})

const canSubmit = computed(() => {
  return selectedPreparationId.value && effectiveQuantity.value > 0 && !loading.value
})

// Watchers
watch(selectedPreparationId, newId => {
  if (!newId) {
    quantity.value = 0
    portionInput.value = 0
    return
  }

  const prep = recipesStore.preparations.find(p => p.id === newId)
  if (prep) {
    if (prep.portionType === 'portion' && prep.portionSize) {
      portionInput.value = 1
      quantity.value = prep.portionSize
    } else {
      quantity.value = prep.outputQuantity
    }
  }
})

watch(
  () => props.modelValue,
  newValue => {
    if (newValue && props.preselectedPreparationId) {
      selectedPreparationId.value = props.preselectedPreparationId
    }
  }
)

// Methods
function formatCurrency(amount: number): string {
  return formatIDR(amount)
}

async function handleSubmit() {
  if (!canSubmit.value || !selectedPreparation.value) return

  // Prepare data before closing dialog
  const expiryDate = calculatedExpiryDate.value
  expiryDate.setHours(20, 0, 0, 0)

  const costPerGram = isPortionType.value
    ? calculatedCostPerUnit.value / portionSize.value
    : calculatedCostPerUnit.value

  const receiptData: CreatePreparationReceiptData = {
    department: userDepartment.value,
    responsiblePerson: authStore.userName,
    sourceType: 'production',
    items: [
      {
        preparationId: selectedPreparationId.value,
        quantity: effectiveQuantity.value,
        costPerUnit: costPerGram,
        expiryDate: expiryDate.toISOString().slice(0, 16),
        notes: notes.value
      }
    ],
    notes: notes.value
  }

  DebugUtils.info(MODULE_NAME, 'Queueing production task (background)', {
    preparation: selectedPreparation.value.name,
    quantity: effectiveQuantity.value,
    cost: calculatedCost.value
  })

  // Queue background task (non-blocking)
  const prepName = selectedPreparation.value.name
  const prepId = selectedPreparationId.value
  const qty = effectiveQuantity.value
  const unit = selectedPreparation.value.outputUnit
  const cost = calculatedCost.value

  addProductionTask(
    {
      receiptData,
      preparationName: prepName,
      preparationId: prepId,
      quantity: qty,
      unit: unit,
      estimatedCost: cost,
      kpiData: {
        userId: authStore.userId || 'unknown',
        userName: authStore.userName,
        department: userDepartment.value,
        value: cost,
        timestamp: TimeUtils.getCurrentLocalISO()
      }
    },
    {
      onQueued: () => {
        // Dialog already closed, parent handles snackbar
      },
      onSuccess: (message: string) => {
        emit('success', message)
        emit('completed') // Trigger data reload in parent
      },
      onError: (message: string) => {
        emit('error', message)
      }
    }
  )

  // Close dialog immediately (operations continue in background)
  const message = `Processing: ${prepName}...`
  emit('success', message)
  handleClose()
}

function handleClose() {
  resetForm()
  emit('update:modelValue', false)
}

function resetForm() {
  selectedPreparationId.value = ''
  quantity.value = 0
  portionInput.value = 0
  notes.value = ''
  if (form.value) {
    form.value.resetValidation()
  }
}

onMounted(() => {
  if (props.preselectedPreparationId) {
    selectedPreparationId.value = props.preselectedPreparationId
  }
})
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

.left-column {
  flex: 1;
  min-width: 280px;
}

.right-column {
  min-width: 180px;
  max-width: 220px;
}

.recipe-info {
  background-color: rgba(var(--v-theme-primary), 0.08);
  border-radius: 6px;
}

.cost-display {
  background-color: rgba(var(--v-theme-success), 0.08);
  border-radius: 6px;
}

.notes-input {
  max-width: 280px;
}

.gap-3 {
  gap: 12px;
}

.w-100 {
  width: 100%;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
