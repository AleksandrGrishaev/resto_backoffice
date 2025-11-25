<!-- src/views/preparation/components/AddPreparationProductionItemDialog.vue - SIMPLIFIED VERSION -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h3>Add Preparation to Production</h3>
          <div class="text-caption text-medium-emphasis">
            Select preparation and specify quantity
          </div>
        </div>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <v-form ref="form" v-model="isFormValid">
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
                    {{ item.raw.code }} • {{ item.raw.outputQuantity }}
                    {{ item.raw.outputUnit }}
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
                    {{ selectedPreparation.outputQuantity }}
                    {{ selectedPreparation.outputUnit }}
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

          <!-- Quantity -->
          <v-text-field
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

          <!-- ✅ AUTO-CALCULATED: Total Cost Display -->
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
                    {{ formatCurrency(calculatedCostPerUnit) }}/{{ selectedPreparation.outputUnit }}
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

          <!-- ✅ NEW: Raw Products Preview -->
          <v-expansion-panels v-if="hasRecipe && rawProductsPreview.length > 0" class="mb-4">
            <v-expansion-panel>
              <v-expansion-panel-title>
                <div class="d-flex align-center">
                  <v-icon icon="mdi-package-variant" class="mr-2" />
                  <span>Raw Products to Write Off ({{ rawProductsPreview.length }} items)</span>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-list density="compact" class="pa-0">
                  <v-list-item
                    v-for="item in rawProductsPreview"
                    :key="item.productId"
                    class="px-2"
                  >
                    <template #prepend>
                      <v-icon icon="mdi-food" size="small" color="primary" class="mr-2" />
                    </template>
                    <v-list-item-title class="text-body-2">
                      {{ item.productName }}
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

          <!-- ✅ NEW: Shelf Life Display -->
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

          <!-- ✅ WARNING: No Recipe -->
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
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="handleClose">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!canSubmit"
          prepend-icon="mdi-plus"
          @click="handleSubmit"
        >
          Add to Production
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePreparationStore } from '@/stores/preparation'
import { useRecipesStore } from '@/stores/recipes'
import { useProductsStore } from '@/stores/productsStore'
import type { PreparationReceiptItem } from '@/stores/preparation'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'AddPreparationProductionItemDialog'

// Props
interface Props {
  modelValue: boolean
}

defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'add-item': [item: PreparationReceiptItem]
}>()

// Stores
const preparationStore = usePreparationStore()
const recipesStore = useRecipesStore()
const productsStore = useProductsStore()

// State
const form = ref()
const isFormValid = ref(false)
const selectedPreparationId = ref('')
const quantity = ref(0)

// ✅ Get selected preparation details
const selectedPreparation = computed(() => {
  if (!selectedPreparationId.value) return null
  return recipesStore.preparations.find(p => p.id === selectedPreparationId.value)
})

// ✅ Check if preparation has recipe
const hasRecipe = computed(() => {
  return selectedPreparation.value?.recipe && selectedPreparation.value.recipe.length > 0
})

// ✅ Calculate multiplier based on desired quantity vs recipe output
const multiplier = computed(() => {
  if (!selectedPreparation.value || !quantity.value) return 1
  return quantity.value / selectedPreparation.value.outputQuantity
})

// ✅ AUTO-CALCULATE: Cost per unit based on current product prices
const calculatedCostPerUnit = computed(() => {
  if (!selectedPreparation.value || !hasRecipe.value) return 0

  let totalCost = 0
  for (const ingredient of selectedPreparation.value.recipe) {
    const product = productsStore.getProductById(ingredient.id)
    if (!product || !product.isActive) continue

    // Use base cost per unit from product
    const ingredientCost = ingredient.quantity * product.baseCostPerUnit
    totalCost += ingredientCost
  }

  // Calculate cost per output unit
  return totalCost / selectedPreparation.value.outputQuantity
})

// ✅ AUTO-CALCULATE: Total cost for the desired quantity
const calculatedCost = computed(() => {
  return calculatedCostPerUnit.value * (quantity.value || 0)
})

// ✅ Preview raw products that will be written off
const rawProductsPreview = computed(() => {
  if (!selectedPreparation.value?.recipe || !quantity.value) return []

  return selectedPreparation.value.recipe
    .map(ingredient => {
      const product = productsStore.getProductById(ingredient.id)
      if (!product) return null

      const scaledQuantity = ingredient.quantity * multiplier.value
      const costPerUnit = product.baseCostPerUnit
      const totalCost = scaledQuantity * costPerUnit

      return {
        productId: ingredient.id,
        productName: product.name,
        quantity: scaledQuantity.toFixed(2),
        unit: product.baseUnit,
        costPerUnit,
        totalCost
      }
    })
    .filter(item => item !== null)
})

// ✅ Quantity hint
const quantityHint = computed(() => {
  if (!selectedPreparation.value) return ''
  const recipeOutput = selectedPreparation.value.outputQuantity
  if (!quantity.value || quantity.value === recipeOutput) {
    return `Standard batch: ${recipeOutput} ${selectedPreparation.value.outputUnit}`
  }
  return `${multiplier.value.toFixed(2)}× recipe (standard: ${recipeOutput} ${selectedPreparation.value.outputUnit})`
})

// ✅ Calculate expiry date based on shelf life
const calculatedExpiryDate = computed(() => {
  if (!selectedPreparation.value?.shelfLife) {
    // Default: 2 days
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 2)
    return expiry
  }

  const expiry = new Date()
  expiry.setDate(expiry.getDate() + selectedPreparation.value.shelfLife)
  return expiry
})

// ✅ Shelf life display
const shelfLifeText = computed(() => {
  if (!selectedPreparation.value?.shelfLife) return '2 days (default)'
  return `${selectedPreparation.value.shelfLife} days`
})

// Computed
const availablePreparations = computed(() => {
  try {
    const preparations = preparationStore.getAvailablePreparations()
    // Add additional fields for display
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
    quantity.value > 0 &&
    calculatedCostPerUnit.value >= 0
  )
})

// ✅ Watch preparation selection to auto-set quantity to recipe output
watch(selectedPreparationId, newId => {
  if (!newId) {
    quantity.value = 0
    return
  }

  const prep = recipesStore.preparations.find(p => p.id === newId)
  if (prep) {
    // Set default quantity to recipe output
    quantity.value = prep.outputQuantity
    DebugUtils.info(MODULE_NAME, `Selected preparation: ${prep.name}`, {
      outputQuantity: prep.outputQuantity,
      outputUnit: prep.outputUnit,
      recipeItems: prep.recipe?.length || 0
    })
  }
})

// Methods
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function handleSubmit() {
  if (!canSubmit.value) return

  // ✅ Use calculated expiry date based on shelf life
  const expiryDate = calculatedExpiryDate.value
  expiryDate.setHours(20, 0, 0, 0) // Set to 8 PM on expiry date

  const receiptItem: PreparationReceiptItem = {
    preparationId: selectedPreparationId.value,
    quantity: quantity.value,
    costPerUnit: calculatedCostPerUnit.value, // ✅ AUTO-CALCULATED
    expiryDate: expiryDate.toISOString().slice(0, 16), // Format for datetime-local
    notes: ''
  }

  DebugUtils.info(MODULE_NAME, 'Adding preparation to production', {
    preparationId: receiptItem.preparationId,
    quantity: receiptItem.quantity,
    costPerUnit: receiptItem.costPerUnit,
    totalCost: calculatedCost.value,
    multiplier: multiplier.value
  })

  emit('add-item', receiptItem)
  handleClose()
}

function handleClose() {
  resetForm()
  emit('update:modelValue', false)
}

function resetForm() {
  selectedPreparationId.value = ''
  quantity.value = 0

  if (form.value) {
    form.value.resetValidation()
  }
}
</script>

<style lang="scss" scoped>
.v-expansion-panel {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
