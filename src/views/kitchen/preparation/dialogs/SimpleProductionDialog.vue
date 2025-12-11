<!-- src/views/kitchen/preparation/dialogs/SimpleProductionDialog.vue -->
<!-- Kitchen Preparation - Simple Production Dialog (Mini Mode Only) -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500px"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h3>New Production</h3>
          <div class="text-caption text-medium-emphasis">
            {{ selectedPreparation ? selectedPreparation.name : 'Select preparation' }}
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="handleClose" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-form ref="form" v-model="isFormValid">
          <!-- Preparation Selector (if not preselected) -->
          <v-autocomplete
            v-if="!preselectedPreparationId"
            v-model="selectedPreparationId"
            :items="availablePreparations"
            item-title="name"
            item-value="id"
            label="Select Preparation"
            variant="outlined"
            density="comfortable"
            class="mb-4"
            prepend-inner-icon="mdi-chef-hat"
            :rules="[v => !!v || 'Please select a preparation']"
            :loading="loadingPreparations"
            clearable
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #subtitle>
                  {{ item.raw.code }} &bull;
                  <template v-if="item.raw.portionType === 'portion'">
                    1 portion ({{ item.raw.portionSize }}{{ item.raw.outputUnit }})
                  </template>
                  <template v-else>
                    {{ item.raw.outputQuantity }} {{ item.raw.outputUnit }}
                  </template>
                </template>
              </v-list-item>
            </template>
          </v-autocomplete>

          <!-- Recipe Output Info -->
          <v-card v-if="selectedPreparation" variant="tonal" color="primary" class="mb-4">
            <v-card-text class="py-3">
              <div class="d-flex justify-space-between align-center">
                <div>
                  <div class="text-caption text-medium-emphasis">Recipe Output</div>
                  <div class="text-h6 font-weight-medium">
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
                  <div class="text-subtitle-1 font-weight-medium">
                    {{ selectedPreparation.recipe?.length || 0 }} items
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <!-- Quantity Input - Portion Type -->
          <v-text-field
            v-if="selectedPreparation && isPortionType"
            v-model.number="portionInput"
            label="Number of Portions"
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

          <!-- Quantity Input - Weight Type -->
          <v-text-field
            v-else-if="selectedPreparation"
            v-model.number="quantity"
            label="Production Quantity"
            type="number"
            min="50"
            step="50"
            variant="outlined"
            class="mb-4"
            :suffix="selectedPreparation?.outputUnit || 'g'"
            prepend-inner-icon="mdi-scale"
            :hint="quantityHint"
            persistent-hint
            autofocus
            :rules="[v => (v && v > 0) || 'Enter quantity']"
          />

          <!-- Cost Display -->
          <div
            v-if="hasRecipe && calculatedCost > 0"
            class="d-flex justify-space-between align-center mb-4 text-body-1"
          >
            <span class="text-medium-emphasis">Estimated Cost:</span>
            <span class="font-weight-bold text-success text-h6">
              {{ formatCurrency(calculatedCost) }}
            </span>
          </div>

          <!-- Warning: No Recipe -->
          <v-alert
            v-if="selectedPreparation && !hasRecipe"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            <v-icon icon="mdi-alert" size="small" class="mr-1" />
            No recipe - raw products won't be written off
          </v-alert>

          <!-- Production Notes -->
          <v-textarea
            v-model="notes"
            label="Notes (optional)"
            variant="outlined"
            rows="2"
            class="mb-2"
            placeholder="e.g., Special batch, rush order..."
          />
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="handleClose">Cancel</v-btn>
        <v-btn
          color="success"
          variant="flat"
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
import { useKitchenKpiStore } from '@/stores/kitchenKpi'
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
  error: [message: string]
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

  try {
    loading.value = true

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

    DebugUtils.info(MODULE_NAME, 'Creating production', {
      preparation: selectedPreparation.value.name,
      quantity: effectiveQuantity.value,
      cost: calculatedCost.value
    })

    // Create receipt through store (handles offline queueing)
    await preparationStore.createReceipt(receiptData)

    // Record KPI
    try {
      await kpiStore.recordProduction(
        authStore.userId || 'unknown',
        authStore.userName,
        userDepartment.value,
        {
          preparationId: selectedPreparationId.value,
          preparationName: selectedPreparation.value.name,
          quantity: effectiveQuantity.value,
          unit: selectedPreparation.value.outputUnit,
          value: calculatedCost.value,
          timestamp: TimeUtils.getCurrentLocalISO()
        }
      )
    } catch (kpiError) {
      DebugUtils.error(MODULE_NAME, 'Failed to record KPI', { kpiError })
      // Don't fail the whole operation if KPI fails
    }

    const message = `Produced ${effectiveQuantity.value}${selectedPreparation.value.outputUnit} of ${selectedPreparation.value.name}`
    emit('success', message)
    handleClose()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to create production', { error })
    emit('error', error instanceof Error ? error.message : 'Failed to record production')
  } finally {
    loading.value = false
  }
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

<style lang="scss" scoped>
.cursor-pointer {
  cursor: pointer;
}
</style>
