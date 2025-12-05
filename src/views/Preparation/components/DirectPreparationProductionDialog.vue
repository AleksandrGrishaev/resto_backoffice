<!-- src/views/preparation/components/DirectPreparationProductionDialog.vue - SIMPLIFIED PRODUCTION DIALOG -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="700px"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h3>Add Preparation to Production</h3>
          <div class="text-caption text-medium-emphasis">
            Record new preparation production with automatic raw product write-off
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="handleClose" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <v-form ref="form" v-model="isFormValid">
          <!-- Responsible Person -->
          <v-text-field
            v-model="formData.responsiblePerson"
            label="Responsible Person"
            :rules="[v => !!v || 'Required field']"
            prepend-inner-icon="mdi-account"
            variant="outlined"
            class="mb-4"
            readonly
          >
            <template #append-inner>
              <v-tooltip location="top">
                <template #activator="{ props }">
                  <v-icon v-bind="props" icon="mdi-lock" size="small" color="success" />
                </template>
                <span>Auto-filled from current user</span>
              </v-tooltip>
            </template>
          </v-text-field>

          <!-- Source Type - Hidden, always 'production' -->
          <input v-model="formData.sourceType" type="hidden" value="production" />

          <!-- Preparation Selection -->
          <v-select
            v-model="selectedPreparationId"
            :items="availablePreparations"
            item-title="name"
            item-value="id"
            label="Select Preparation"
            :rules="[v => !!v || 'Please select a preparation']"
            variant="outlined"
            class="mb-4"
            prepend-inner-icon="mdi-chef-hat"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #subtitle>
                  <span class="text-caption">
                    {{ item.raw.code }} •
                    <!-- ⭐ PHASE 2: Show portions or grams based on type -->
                    <template v-if="item.raw.portionType === 'portion' && item.raw.portionSize">
                      1 portion ({{ item.raw.portionSize }}{{ item.raw.outputUnit }})
                    </template>
                    <template v-else>
                      {{ item.raw.outputQuantity }} {{ item.raw.outputUnit }}
                    </template>
                  </span>
                </template>
              </v-list-item>
            </template>
          </v-select>

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
                  <div class="text-caption text-medium-emphasis">Recipe Ingredients</div>
                  <div class="text-subtitle-1 font-weight-medium">
                    {{ selectedPreparation.recipe.length }} items
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>

          <!-- Quantity Input: Portions or Weight -->
          <v-text-field
            v-if="isPortionType"
            v-model.number="portionInput"
            label="Number of Portions"
            type="number"
            min="1"
            step="1"
            :rules="[v => (!!v && v > 0) || 'Quantity must be greater than 0']"
            variant="outlined"
            class="mb-4"
            suffix="portions"
            prepend-inner-icon="mdi-food-variant"
            :hint="`${portionInput || 0} portions × ${portionSize}g = ${effectiveQuantity}g total`"
            persistent-hint
          />
          <v-text-field
            v-else
            v-model.number="quantity"
            label="Production Quantity"
            type="number"
            min="50"
            step="50"
            :rules="[v => (!!v && v > 0) || 'Quantity must be greater than 0']"
            variant="outlined"
            class="mb-4"
            :suffix="selectedPreparation?.outputUnit || 'g'"
            prepend-inner-icon="mdi-scale"
            :hint="quantityHint"
            persistent-hint
          />

          <!-- Total Cost Display -->
          <v-card
            v-if="selectedPreparation && hasRecipe && calculatedCost > 0"
            variant="outlined"
            class="mb-4"
          >
            <v-card-text class="py-3">
              <div class="d-flex justify-space-between align-center mb-2">
                <div>
                  <div class="text-caption text-medium-emphasis">Estimated Cost</div>
                  <div class="text-h6 font-weight-bold text-success">
                    {{ formatCurrency(calculatedCost) }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-caption text-medium-emphasis">Cost per Unit</div>
                  <div class="text-subtitle-2">
                    <!-- ⭐ PHASE 2: calculatedCostPerUnit is already per portion for portion-type -->
                    <template v-if="isPortionType">
                      {{ formatCurrency(calculatedCostPerUnit) }}/portion
                    </template>
                    <template v-else>
                      {{ formatCurrency(calculatedCostPerUnit) }}/{{
                        selectedPreparation.outputUnit
                      }}
                    </template>
                  </div>
                </div>
              </div>
              <v-divider class="my-2" />
              <div class="text-caption text-medium-emphasis">
                <v-icon icon="mdi-information-outline" size="small" class="mr-1" />
                Calculated from current product prices
              </div>
            </v-card-text>
          </v-card>

          <!-- Ingredients Preview (Products + Preparations) -->
          <v-expansion-panels v-if="hasRecipe && ingredientsPreview.length > 0" class="mb-4">
            <v-expansion-panel>
              <v-expansion-panel-title>
                <div class="d-flex align-center">
                  <v-icon icon="mdi-package-variant" class="mr-2" />
                  <span>Ingredients to Write Off ({{ ingredientsPreview.length }} items)</span>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact" class="pa-0">
                  <v-list-item v-for="item in ingredientsPreview" :key="item.id" class="px-2">
                    <template #prepend>
                      <!-- Different icons for products vs preparations -->
                      <v-icon
                        :icon="item.type === 'preparation' ? 'mdi-chef-hat' : 'mdi-food'"
                        size="small"
                        :color="item.type === 'preparation' ? 'warning' : 'primary'"
                        class="mr-2"
                      />
                    </template>
                    <v-list-item-title class="text-body-2">
                      {{ item.name }}
                      <v-chip
                        v-if="item.type === 'preparation'"
                        size="x-small"
                        color="warning"
                        class="ml-1"
                      >
                        prep
                      </v-chip>
                    </v-list-item-title>
                    <v-list-item-subtitle class="text-caption">
                      {{ item.quantity }} {{ item.unit }} × {{ formatCurrency(item.costPerUnit) }} =
                      {{ formatCurrency(item.totalCost) }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

          <!-- Shelf Life Display -->
          <v-alert
            v-if="selectedPreparation"
            type="info"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            <div class="d-flex align-center">
              <v-icon icon="mdi-clock-outline" class="mr-2" />
              <div>
                <strong>Shelf Life:</strong>
                {{ shelfLifeText }}
                <br />
                <small>Expiry: {{ calculatedExpiryDate.toLocaleDateString() }}</small>
              </div>
            </div>
          </v-alert>

          <!-- WARNING: No Recipe -->
          <v-alert
            v-if="selectedPreparation && !hasRecipe"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            <v-icon icon="mdi-alert" class="mr-1" />
            This preparation has no recipe defined. Raw products will NOT be written off
            automatically.
          </v-alert>

          <!-- Production Notes -->
          <v-textarea
            v-model="formData.notes"
            label="Production Notes (optional)"
            variant="outlined"
            rows="2"
            class="mb-4"
            placeholder="e.g., Recipe batch #123, Special occasion prep..."
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
          Confirm Production
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Deficit Warning Dialog -->
  <v-dialog v-model="showDeficitDialog" max-width="600px" persistent>
    <v-card>
      <v-card-title class="d-flex align-center bg-warning">
        <v-icon icon="mdi-alert" class="mr-2" />
        <span>Stock Deficit Detected</span>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <v-alert type="warning" variant="tonal" class="mb-4">
          <div class="text-body-1 mb-2">
            <strong>{{ selectedPreparation?.name }}</strong>
            has a deficit of
            <strong>{{ deficitQuantity }} {{ selectedPreparation?.outputUnit }}</strong>
          </div>
          <div class="text-caption">
            This deficit was created when the preparation was used while out of stock.
          </div>
        </v-alert>

        <div class="text-subtitle-1 mb-3">How much would you like to produce?</div>

        <v-card
          variant="outlined"
          class="mb-3 cursor-pointer"
          :color="productionChoice === 'cover_deficit' ? 'primary' : undefined"
          @click="productionChoice = 'cover_deficit'"
        >
          <v-card-text class="d-flex align-center">
            <v-radio
              :model-value="productionChoice"
              value="cover_deficit"
              color="primary"
              class="mr-2"
            />
            <div class="flex-grow-1">
              <div class="text-subtitle-2 font-weight-bold">Cover Deficit + Standard Batch</div>
              <div class="text-caption text-medium-emphasis">
                Produce {{ suggestedQuantity }} {{ selectedPreparation?.outputUnit }} ({{
                  deficitQuantity
                }}
                to cover deficit + {{ selectedPreparation?.outputQuantity }} standard)
              </div>
            </div>
            <v-chip color="success" size="small">Recommended</v-chip>
          </v-card-text>
        </v-card>

        <v-card
          variant="outlined"
          class="mb-3 cursor-pointer"
          :color="productionChoice === 'standard' ? 'primary' : undefined"
          @click="productionChoice = 'standard'"
        >
          <v-card-text class="d-flex align-center">
            <v-radio
              :model-value="productionChoice"
              value="standard"
              color="primary"
              class="mr-2"
            />
            <div class="flex-grow-1">
              <div class="text-subtitle-2 font-weight-bold">Standard Batch Only</div>
              <div class="text-caption text-medium-emphasis">
                Produce {{ selectedPreparation?.outputQuantity }}
                {{ selectedPreparation?.outputUnit }} (deficit will remain)
              </div>
            </div>
          </v-card-text>
        </v-card>

        <v-card
          variant="outlined"
          class="cursor-pointer"
          :color="productionChoice === 'custom' ? 'primary' : undefined"
          @click="productionChoice = 'custom'"
        >
          <v-card-text class="d-flex align-center">
            <v-radio :model-value="productionChoice" value="custom" color="primary" class="mr-2" />
            <div class="flex-grow-1">
              <div class="text-subtitle-2 font-weight-bold">Custom Quantity</div>
              <div class="text-caption text-medium-emphasis">
                I'll set a custom production quantity manually
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="showDeficitDialog = false">Cancel</v-btn>
        <v-btn color="primary" variant="flat" @click="handleDeficitChoice(productionChoice)">
          Continue
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
import { negativeBatchService } from '@/stores/preparation/negativeBatchService'
import { useCostCalculation } from '@/stores/recipes/composables/useCostCalculation' // ✅ NEW: For yield adjustment
import type {
  PreparationDepartment,
  CreatePreparationReceiptData,
  PreparationReceiptItem
} from '@/stores/preparation'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'DirectPreparationProductionDialog'

// Props
interface Props {
  modelValue: boolean
  department: PreparationDepartment
}

const props = defineProps<Props>()

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
const { calculateDirectCost } = useCostCalculation() // ✅ NEW: For yield adjustment in cost calculation

// State
const form = ref()
const isFormValid = ref(false)
const loading = ref(false)
const selectedPreparationId = ref('')
const quantity = ref(0)

const formData = ref<CreatePreparationReceiptData>({
  department: props.department,
  responsiblePerson: '',
  sourceType: 'production',
  items: [],
  notes: ''
})

// Deficit dialog state
const showDeficitDialog = ref(false)
const deficitQuantity = ref(0)
const suggestedQuantity = ref(0)
const productionChoice = ref<'cover_deficit' | 'standard' | 'custom'>('cover_deficit')

// Computed - sourceType is always 'production'

const selectedPreparation = computed(() => {
  if (!selectedPreparationId.value) return null
  return recipesStore.preparations.find(p => p.id === selectedPreparationId.value)
})

const hasRecipe = computed(() => {
  return selectedPreparation.value?.recipe && selectedPreparation.value.recipe.length > 0
})

// ⭐ PHASE 2: Portion type helpers
const isPortionType = computed(() => {
  return (
    selectedPreparation.value?.portionType === 'portion' && selectedPreparation.value?.portionSize
  )
})

const portionSize = computed(() => {
  return selectedPreparation.value?.portionSize || 1
})

// Display unit for UI (portions or base unit)
const displayUnit = computed(() => {
  if (isPortionType.value) {
    return 'portions'
  }
  return selectedPreparation.value?.outputUnit || 'g'
})

// For portion-type: input is in portions, quantity is in grams
const portionInput = ref(0)

// Convert portions to grams or use direct grams
const effectiveQuantity = computed(() => {
  if (isPortionType.value) {
    return portionInput.value * portionSize.value
  }
  return quantity.value
})

const multiplier = computed(() => {
  if (!selectedPreparation.value || !effectiveQuantity.value) return 1
  // ⭐ PHASE 2 FIX: For portion-type, use portion count for multiplier (not grams)
  // outputQuantity = number of portions in recipe (typically 1)
  // portionInput = number of portions to produce
  if (isPortionType.value && portionInput.value) {
    return portionInput.value / selectedPreparation.value.outputQuantity
  }
  return effectiveQuantity.value / selectedPreparation.value.outputQuantity
})

// ⭐ PHASE 1: Support both products AND preparations in cost calculation
const calculatedCostPerUnit = computed(() => {
  if (!selectedPreparation.value || !hasRecipe.value) return 0

  let totalCost = 0
  for (const ingredient of selectedPreparation.value.recipe) {
    if (ingredient.type === 'preparation') {
      // ⭐ NESTED PREPARATION: Use lastKnownCost or costPerPortion
      const prep = recipesStore.preparations.find(p => p.id === ingredient.id)
      if (!prep) continue

      const costPerUnit = prep.lastKnownCost || prep.costPerPortion || 0
      totalCost += ingredient.quantity * costPerUnit
    } else {
      // PRODUCT ingredient (default)
      const product = productsStore.getProductById(ingredient.id)
      if (!product || !product.isActive) continue

      // Use calculateDirectCost to account for yield adjustment
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
  // ⭐ PHASE 2 FIX: For portion-type, multiply by portion count (not grams)
  // calculatedCostPerUnit is cost per output unit (per portion for portion-type)
  if (isPortionType.value && portionInput.value) {
    return calculatedCostPerUnit.value * portionInput.value
  }
  return calculatedCostPerUnit.value * (effectiveQuantity.value || 0)
})

// ⭐ PHASE 1: Support both products AND preparations in preview
const ingredientsPreview = computed(() => {
  if (!selectedPreparation.value?.recipe || !effectiveQuantity.value) return []

  return selectedPreparation.value.recipe
    .map((ingredient: any) => {
      const scaledQuantity = ingredient.quantity * multiplier.value

      // Check ingredient type (default to 'product' for backwards compatibility)
      if (ingredient.type === 'preparation') {
        // ⭐ NESTED PREPARATION: Get from recipesStore
        const prep = recipesStore.preparations.find(p => p.id === ingredient.id)
        if (!prep) return null

        const costPerUnit = prep.lastKnownCost || prep.costPerPortion || 0

        return {
          type: 'preparation' as const,
          id: ingredient.id,
          name: prep.name,
          quantity: scaledQuantity.toFixed(2),
          unit: prep.outputUnit || 'g',
          costPerUnit,
          totalCost: scaledQuantity * costPerUnit
        }
      } else {
        // PRODUCT ingredient (default)
        const product = productsStore.getProductById(ingredient.id)
        if (!product) return null

        // Apply yield adjustment to quantity preview
        let adjustedQuantity = scaledQuantity
        if (
          ingredient.useYieldPercentage &&
          product.yieldPercentage &&
          product.yieldPercentage < 100
        ) {
          adjustedQuantity = scaledQuantity / (product.yieldPercentage / 100)
        }

        const costPerUnit = product.baseCostPerUnit
        const totalCost = adjustedQuantity * costPerUnit

        return {
          type: 'product' as const,
          id: ingredient.id,
          name: product.name,
          quantity: adjustedQuantity.toFixed(2),
          unit: product.baseUnit,
          costPerUnit,
          totalCost,
          yieldAdjusted:
            ingredient.useYieldPercentage &&
            product.yieldPercentage &&
            product.yieldPercentage < 100
        }
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
})

const quantityHint = computed(() => {
  if (!selectedPreparation.value) return ''
  const recipeOutput = selectedPreparation.value.outputQuantity
  if (!quantity.value || quantity.value === recipeOutput) {
    return `Standard batch: ${recipeOutput} ${selectedPreparation.value.outputUnit}`
  }
  return `${multiplier.value.toFixed(2)}× recipe (standard: ${recipeOutput} ${selectedPreparation.value.outputUnit})`
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

const shelfLifeText = computed(() => {
  if (!selectedPreparation.value?.shelfLife) return '2 days (default)'
  return `${selectedPreparation.value.shelfLife} days`
})

const availablePreparations = computed(() => {
  try {
    const preparations = preparationStore.getAvailablePreparations()
    return preparations.map(p => {
      const prep = recipesStore.preparations.find(rp => rp.id === p.id)
      return {
        ...p,
        code: prep?.code || '',
        outputQuantity: prep?.outputQuantity || 0,
        outputUnit: prep?.outputUnit || 'g'
      }
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to get available preparations', { error })
    return []
  }
})

const canSubmit = computed(() => {
  return (
    isFormValid.value &&
    selectedPreparationId.value &&
    effectiveQuantity.value > 0 && // ⭐ Use effectiveQuantity (handles both portion and weight)
    calculatedCostPerUnit.value >= 0 &&
    !loading.value
  )
})

// Watchers
watch(selectedPreparationId, async newId => {
  if (!newId) {
    quantity.value = 0
    portionInput.value = 0
    return
  }

  const prep = recipesStore.preparations.find((p: any) => p.id === newId)
  if (prep) {
    // Check for negative batches
    try {
      const negativeBatches = await negativeBatchService.getNegativeBatches(newId)
      const unreconciled = negativeBatches.filter(b => !b.reconciled)

      if (unreconciled.length > 0) {
        // Calculate total deficit
        deficitQuantity.value = unreconciled.reduce(
          (sum, b) => sum + Math.abs(b.currentQuantity),
          0
        )
        suggestedQuantity.value = prep.outputQuantity + deficitQuantity.value

        DebugUtils.info(MODULE_NAME, `Found deficit for ${prep.name}`, {
          deficitQuantity: deficitQuantity.value,
          suggestedQuantity: suggestedQuantity.value,
          standardBatch: prep.outputQuantity
        })

        showDeficitDialog.value = true
      } else {
        // No deficit, set standard quantity
        // ⭐ PHASE 2: Handle portion-type preparations
        if (prep.portionType === 'portion' && prep.portionSize) {
          portionInput.value = 1 // Default to 1 portion
          quantity.value = prep.portionSize
        } else {
          quantity.value = prep.outputQuantity
        }
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to check negative batches', { error })
      // Fallback to standard quantity
      if (prep.portionType === 'portion' && prep.portionSize) {
        portionInput.value = 1
        quantity.value = prep.portionSize
      } else {
        quantity.value = prep.outputQuantity
      }
    }

    DebugUtils.info(MODULE_NAME, `Selected preparation: ${prep.name}`, {
      outputQuantity: prep.outputQuantity,
      outputUnit: prep.outputUnit,
      recipeItems: prep.recipe?.length || 0
    })
  }
})

// Methods
function handleDeficitChoice(choice: 'cover_deficit' | 'standard' | 'custom') {
  productionChoice.value = choice

  if (!selectedPreparation.value) return

  switch (choice) {
    case 'cover_deficit':
      quantity.value = suggestedQuantity.value
      break
    case 'standard':
      quantity.value = selectedPreparation.value.outputQuantity
      break
    case 'custom':
      // Keep current quantity or set to standard
      quantity.value = selectedPreparation.value.outputQuantity
      break
  }

  showDeficitDialog.value = false
  DebugUtils.info(MODULE_NAME, `User chose: ${choice}`, { quantity: quantity.value })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

async function handleSubmit() {
  if (!canSubmit.value) return

  try {
    loading.value = true

    // Calculate expiry date
    const expiryDate = calculatedExpiryDate.value
    expiryDate.setHours(20, 0, 0, 0)

    // Create receipt item - ⭐ Use effectiveQuantity (grams) for the actual batch
    // ⭐ PHASE 2 FIX: For portion-type, convert cost per portion to cost per gram
    // calculatedCostPerUnit is per portion for portion-type, but batch needs per gram
    const costPerGram = isPortionType.value
      ? calculatedCostPerUnit.value / portionSize.value
      : calculatedCostPerUnit.value

    const receiptItem: PreparationReceiptItem = {
      preparationId: selectedPreparationId.value,
      quantity: effectiveQuantity.value, // ⭐ Always in grams
      costPerUnit: costPerGram, // ⭐ Always per gram for batch storage
      expiryDate: expiryDate.toISOString().slice(0, 16),
      notes: ''
    }

    // Build receipt data
    const receiptData: CreatePreparationReceiptData = {
      department: props.department,
      responsiblePerson: formData.value.responsiblePerson,
      sourceType: formData.value.sourceType,
      items: [receiptItem],
      notes: formData.value.notes
    }

    DebugUtils.info(MODULE_NAME, 'Submitting preparation production', { receiptData })

    // Create receipt through store
    await preparationStore.createReceipt(receiptData)

    DebugUtils.info(MODULE_NAME, 'Preparation production created successfully')

    // ⭐ PHASE 2: Show appropriate message for portion-type
    const prepName = selectedPreparation.value?.name || 'preparation'
    let message: string
    if (isPortionType.value) {
      message = `Produced ${portionInput.value} portions (${effectiveQuantity.value}${selectedPreparation.value?.outputUnit}) of ${prepName} successfully`
    } else {
      message = `Produced ${effectiveQuantity.value}${selectedPreparation.value?.outputUnit} of ${prepName} successfully`
    }
    emit('success', message)
    handleClose()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to create preparation production', { error })
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
  portionInput.value = 0 // ⭐ PHASE 2: Reset portion input
  formData.value = {
    department: props.department,
    responsiblePerson: authStore.userName,
    sourceType: 'production',
    items: [],
    notes: ''
  }

  if (form.value) {
    form.value.resetValidation()
  }
}

// Auto-fill responsible person on mount and when dialog opens
onMounted(() => {
  formData.value.responsiblePerson = authStore.userName
})

watch(
  () => props.modelValue,
  newValue => {
    if (newValue) {
      // Auto-fill user when dialog opens
      formData.value.responsiblePerson = authStore.userName
      formData.value.department = props.department
    }
  }
)
</script>

<style lang="scss" scoped>
.v-expansion-panel {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.cursor-pointer {
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
}
</style>
