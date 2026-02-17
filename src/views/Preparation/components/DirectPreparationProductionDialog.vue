<!-- src/views/preparation/components/DirectPreparationProductionDialog.vue - SIMPLIFIED PRODUCTION DIALOG -->
<template>
  <v-dialog
    :model-value="modelValue"
    :max-width="isMiniMode ? '450px' : '700px'"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h3>{{ isMiniMode ? 'Quick Add Production' : 'Add Preparation to Production' }}</h3>
          <div v-if="!isMiniMode" class="text-caption text-medium-emphasis">
            Record new preparation production with automatic raw product write-off
          </div>
          <div v-else class="text-caption text-medium-emphasis">
            {{ selectedPreparation?.name }}
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="handleClose" />
      </v-card-title>

      <v-divider />

      <v-card-text :class="isMiniMode ? 'pa-4' : 'pa-6'">
        <v-form ref="form" v-model="isFormValid">
          <!-- Source Type - Hidden, always 'production' -->
          <input v-model="formData.sourceType" type="hidden" value="production" />

          <!-- ============================================ -->
          <!-- MINI MODE: Simple quantity input -->
          <!-- ============================================ -->
          <template v-if="isMiniMode && selectedPreparation">
            <!-- Recipe Output Info -->
            <v-card variant="tonal" color="primary" class="mb-4">
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
                      {{ selectedPreparation.recipe.length }} items
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>

            <!-- Deficit Info Banner (auto-reconciled on production) -->
            <v-alert
              v-if="deficitQuantity > 0"
              type="info"
              variant="tonal"
              density="compact"
              class="mb-4"
            >
              <div class="text-body-2">
                Deficit of
                <strong>{{ deficitQuantity }} {{ selectedPreparation?.outputUnit }}</strong>
                will be auto-reconciled when you produce.
              </div>
            </v-alert>

            <!-- Quantity Input -->
            <v-text-field
              v-if="isPortionType"
              v-model.number="portionInput"
              label="Number of Portions"
              type="number"
              min="1"
              step="1"
              variant="outlined"
              class="mb-4"
              suffix="portions"
              prepend-inner-icon="mdi-food-variant"
              :hint="`${portionInput || 0} × ${portionSize}g = ${effectiveQuantity}g`"
              persistent-hint
              autofocus
            />
            <v-text-field
              v-else
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
              v-if="!hasRecipe"
              type="warning"
              variant="tonal"
              density="compact"
              class="mb-4"
            >
              <v-icon icon="mdi-alert" size="small" class="mr-1" />
              No recipe - raw products won't be written off
            </v-alert>
          </template>

          <!-- ============================================ -->
          <!-- FULL MODE: Search + List + Queue -->
          <!-- ============================================ -->
          <template v-else>
            <!-- Responsible Person (Full mode only) -->
            <v-text-field
              v-model="formData.responsiblePerson"
              label="Responsible Person"
              :rules="[v => !!v || 'Required field']"
              prepend-inner-icon="mdi-account"
              variant="outlined"
              density="compact"
              class="mb-4"
              readonly
            >
              <template #append-inner>
                <v-tooltip location="top">
                  <template #activator="{ props: tooltipProps }">
                    <v-icon v-bind="tooltipProps" icon="mdi-lock" size="small" color="success" />
                  </template>
                  <span>Auto-filled from current user</span>
                </v-tooltip>
              </template>
            </v-text-field>

            <!-- Search + Category Filter -->
            <v-row class="mb-2">
              <v-col cols="8">
                <v-text-field
                  v-model="searchQuery"
                  prepend-inner-icon="mdi-magnify"
                  placeholder="Search preparation..."
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
              <v-col cols="4">
                <v-select
                  v-model="selectedCategory"
                  :items="categoryOptions"
                  item-title="title"
                  item-value="value"
                  label="Category"
                  variant="outlined"
                  density="compact"
                  hide-details
                  clearable
                />
              </v-col>
            </v-row>

            <!-- NEW: Scrollable Preparation List -->
            <v-card variant="outlined" class="mb-4 preparation-list-card">
              <v-list density="compact" class="pa-0">
                <template v-if="filteredPreparations.length > 0">
                  <template v-for="prep in filteredPreparations" :key="prep.id">
                    <!-- Preparation Item -->
                    <v-list-item
                      :class="{
                        'bg-primary-lighten-5': expandedPreparationId === prep.id,
                        'bg-success-lighten-5': isInQueue(prep.id)
                      }"
                      @click="togglePreparation(prep.id)"
                    >
                      <template #prepend>
                        <v-icon
                          :icon="isInQueue(prep.id) ? 'mdi-check-circle' : 'mdi-chef-hat'"
                          :color="isInQueue(prep.id) ? 'success' : 'primary'"
                          size="small"
                        />
                      </template>
                      <v-list-item-title>{{ prep.name }}</v-list-item-title>
                      <v-list-item-subtitle class="text-caption">
                        {{ prep.code }} •
                        <template v-if="prep.portionType === 'portion' && prep.portionSize">
                          1 portion ({{ prep.portionSize }}{{ prep.outputUnit }})
                        </template>
                        <template v-else>{{ prep.outputQuantity }} {{ prep.outputUnit }}</template>
                      </v-list-item-subtitle>
                      <template #append>
                        <v-icon
                          :icon="
                            expandedPreparationId === prep.id
                              ? 'mdi-chevron-up'
                              : 'mdi-chevron-down'
                          "
                          size="small"
                        />
                      </template>
                    </v-list-item>

                    <!-- Inline Expansion: Quantity + Cost + Add Button -->
                    <v-expand-transition>
                      <div v-if="expandedPreparationId === prep.id" class="pa-4 expansion-content">
                        <!-- Recipe Output Info -->
                        <v-card
                          v-if="selectedPreparation"
                          variant="tonal"
                          color="primary"
                          class="mb-3"
                        >
                          <v-card-text class="py-2">
                            <div class="d-flex justify-space-between align-center">
                              <div>
                                <div class="text-caption text-medium-emphasis">Recipe Output</div>
                                <div class="text-subtitle-1 font-weight-medium">
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
                                <div class="text-subtitle-2">
                                  {{ selectedPreparation.recipe.length }} items
                                </div>
                              </div>
                            </div>
                          </v-card-text>
                        </v-card>

                        <!-- Quantity Input -->
                        <v-text-field
                          v-if="isPortionType"
                          v-model.number="portionInput"
                          label="Number of Portions"
                          type="number"
                          min="1"
                          step="1"
                          variant="outlined"
                          density="compact"
                          class="mb-2"
                          suffix="portions"
                          :hint="`${portionInput || 0} × ${portionSize}g = ${effectiveQuantity}g`"
                          persistent-hint
                        />
                        <v-text-field
                          v-else
                          v-model.number="quantity"
                          label="Production Quantity"
                          type="number"
                          min="50"
                          step="50"
                          variant="outlined"
                          density="compact"
                          class="mb-2"
                          :suffix="selectedPreparation?.outputUnit || 'g'"
                          :hint="quantityHint"
                          persistent-hint
                        />

                        <!-- Cost Display -->
                        <div
                          v-if="hasRecipe && calculatedCost > 0"
                          class="d-flex justify-space-between align-center mb-2 text-body-2"
                        >
                          <span class="text-medium-emphasis">Estimated Cost:</span>
                          <span class="font-weight-bold text-success">
                            {{ formatCurrency(calculatedCost) }}
                          </span>
                        </div>

                        <!-- Warning: No Recipe -->
                        <v-alert
                          v-if="!hasRecipe"
                          type="warning"
                          variant="tonal"
                          density="compact"
                          class="mb-2"
                        >
                          <v-icon icon="mdi-alert" size="small" class="mr-1" />
                          No recipe - raw products won't be written off
                        </v-alert>

                        <!-- Add to Queue Button -->
                        <v-btn
                          color="success"
                          variant="flat"
                          block
                          :disabled="!canAddToQueue"
                          prepend-icon="mdi-plus"
                          @click.stop="addToQueue"
                        >
                          Add to Queue
                        </v-btn>
                      </div>
                    </v-expand-transition>

                    <v-divider v-if="expandedPreparationId !== prep.id" />
                  </template>
                </template>

                <!-- No Results -->
                <v-list-item v-else>
                  <div class="text-center py-4 text-medium-emphasis">
                    <v-icon icon="mdi-magnify" size="32" class="mb-2" />
                    <div>No preparations found</div>
                  </div>
                </v-list-item>
              </v-list>
            </v-card>

            <!-- NEW: Production Queue Summary -->
            <v-card v-if="productionQueue.length > 0" variant="tonal" color="success" class="mb-4">
              <v-card-text class="py-3">
                <div class="d-flex align-center justify-space-between mb-2">
                  <div class="text-subtitle-2 font-weight-medium">
                    <v-icon icon="mdi-playlist-check" class="mr-1" />
                    Production Queue ({{ productionQueue.length }} items)
                  </div>
                  <v-btn
                    size="x-small"
                    variant="text"
                    color="error"
                    icon="mdi-delete-sweep"
                    @click="clearQueue"
                  >
                    <v-icon />
                    <v-tooltip activator="parent" location="top">Clear Queue</v-tooltip>
                  </v-btn>
                </div>
                <div class="d-flex flex-wrap gap-2 mb-2">
                  <v-chip
                    v-for="item in productionQueue"
                    :key="item.id"
                    size="small"
                    closable
                    color="success"
                    variant="flat"
                    @click:close="removeFromQueue(item.id)"
                  >
                    {{ item.name }}: {{ item.displayQuantity }}
                  </v-chip>
                </div>
                <div class="d-flex justify-space-between align-center text-body-2">
                  <span class="text-medium-emphasis">Total Estimated Cost:</span>
                  <span class="font-weight-bold">{{ formatCurrency(totalQueueCost) }}</span>
                </div>
              </v-card-text>
            </v-card>
          </template>
          <!-- END FULL MODE -->

          <!-- Production Notes (full mode only) -->
          <v-textarea
            v-if="!isMiniMode"
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
          {{
            isMiniMode
              ? 'Produce'
              : productionQueue.length > 0
                ? `Confirm (${productionQueue.length})`
                : 'Confirm Production'
          }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Deficit info dialog removed: auto-reconciliation handles deficits automatically -->
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
import { DebugUtils, generateId } from '@/utils'

const MODULE_NAME = 'DirectPreparationProductionDialog'

// Production queue item interface
interface ProductionQueueItem {
  id: string
  preparationId: string
  name: string
  code: string
  quantity: number // effectiveQuantity in grams
  displayQuantity: string // e.g. "3 portions" or "150g"
  unit: string
  costPerUnit: number
  totalCost: number
  expiryDate: string
  isPortionType: boolean
  portionCount?: number
}

// Props
interface Props {
  modelValue: boolean
  department: PreparationDepartment
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

// Deficit info (displayed as banner, auto-reconciled on production)
const deficitQuantity = ref(0)

// NEW: Search and filter state
const searchQuery = ref('')
const selectedCategory = ref<string | null>(null)
const expandedPreparationId = ref<string | null>(null)

// NEW: Production queue for multi-select
const productionQueue = ref<ProductionQueueItem[]>([])

// Computed - sourceType is always 'production'

// NEW: Mini mode when preselected preparation is provided
const isMiniMode = computed(() => !!props.preselectedPreparationId)

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
        outputUnit: prep?.outputUnit || 'g',
        category: prep?.type || '' // category is stored in 'type' field
      }
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to get available preparations', { error })
    return []
  }
})

// NEW: Category options for filter dropdown
const categoryOptions = computed(() => {
  return recipesStore.preparationCategories.map(cat => ({
    title: cat.name,
    value: cat.id
  }))
})

// NEW: Filtered preparations based on search and category
const filteredPreparations = computed(() => {
  let preps = availablePreparations.value

  // Filter by search query (name or code)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    preps = preps.filter(p => p.name.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q))
  }

  // Filter by category
  if (selectedCategory.value) {
    preps = preps.filter(p => p.category === selectedCategory.value)
  }

  return preps
})

// NEW: Check if preparation is already in queue
const isInQueue = (prepId: string) => {
  return productionQueue.value.some(item => item.preparationId === prepId)
}

// NEW: Total queue cost
const totalQueueCost = computed(() =>
  productionQueue.value.reduce((sum, item) => sum + item.totalCost, 0)
)

// NEW: Can add current selection to queue
const canAddToQueue = computed(() => {
  return (
    selectedPreparationId.value &&
    effectiveQuantity.value > 0 &&
    calculatedCostPerUnit.value >= 0 &&
    !isInQueue(selectedPreparationId.value)
  )
})

// Updated: Can submit if queue has items OR current selection is valid
const canSubmit = computed(() => {
  // Mini mode: just check current selection
  if (isMiniMode.value) {
    return (
      selectedPreparationId.value &&
      effectiveQuantity.value > 0 &&
      calculatedCostPerUnit.value >= 0 &&
      !loading.value
    )
  }

  // Full mode: check queue OR current selection
  const hasQueueItems = productionQueue.value.length > 0
  const hasCurrentSelection =
    selectedPreparationId.value && effectiveQuantity.value > 0 && calculatedCostPerUnit.value >= 0

  return isFormValid.value && (hasQueueItems || hasCurrentSelection) && !loading.value
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
    // Check for negative batches (info only — auto-reconciled on production)
    try {
      // getNegativeBatches already returns only unreconciled batches (reconciled_at IS NULL)
      const negativeBatches = await negativeBatchService.getNegativeBatches(newId)

      if (negativeBatches.length > 0) {
        deficitQuantity.value = negativeBatches.reduce(
          (sum, b) => sum + Math.abs(b.currentQuantity),
          0
        )
        DebugUtils.info(MODULE_NAME, `Found deficit for ${prep.name} (auto-reconcile on produce)`, {
          deficitQuantity: deficitQuantity.value
        })
      } else {
        deficitQuantity.value = 0
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to check negative batches', { error })
      deficitQuantity.value = 0
    }

    // Always set standard quantity (deficit is handled automatically)
    if (prep.portionType === 'portion' && prep.portionSize) {
      portionInput.value = 1
      quantity.value = prep.portionSize
    } else {
      quantity.value = prep.outputQuantity
    }

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

// NEW: Toggle preparation expansion for inline editing
function togglePreparation(prepId: string) {
  if (expandedPreparationId.value === prepId) {
    // Collapse - clear selection
    expandedPreparationId.value = null
    selectedPreparationId.value = ''
    quantity.value = 0
    portionInput.value = 0
  } else {
    // Expand - select this preparation
    expandedPreparationId.value = prepId
    selectedPreparationId.value = prepId
    // Quantity will be set by the watcher on selectedPreparationId
  }
}

// NEW: Add current selection to production queue
function addToQueue() {
  if (!canAddToQueue.value || !selectedPreparation.value) return

  const prep = selectedPreparation.value
  const expiryDate = calculatedExpiryDate.value
  expiryDate.setHours(20, 0, 0, 0)

  // Build display quantity string
  let displayQty: string
  if (isPortionType.value) {
    displayQty = `${portionInput.value} portion${portionInput.value > 1 ? 's' : ''} (${effectiveQuantity.value}${prep.outputUnit})`
  } else {
    displayQty = `${effectiveQuantity.value}${prep.outputUnit}`
  }

  // Calculate cost per gram for storage
  const costPerGram = isPortionType.value
    ? calculatedCostPerUnit.value / portionSize.value
    : calculatedCostPerUnit.value

  const queueItem: ProductionQueueItem = {
    id: generateId(),
    preparationId: prep.id,
    name: prep.name,
    code: prep.code || '',
    quantity: effectiveQuantity.value,
    displayQuantity: displayQty,
    unit: prep.outputUnit,
    costPerUnit: costPerGram,
    totalCost: calculatedCost.value,
    expiryDate: expiryDate.toISOString().slice(0, 16),
    isPortionType: isPortionType.value,
    portionCount: isPortionType.value ? portionInput.value : undefined
  }

  productionQueue.value.push(queueItem)

  // Clear current selection for next item
  expandedPreparationId.value = null
  selectedPreparationId.value = ''
  quantity.value = 0
  portionInput.value = 0

  DebugUtils.info(MODULE_NAME, `Added to queue: ${prep.name}`, { queueItem })
}

// NEW: Remove item from queue
function removeFromQueue(itemId: string) {
  productionQueue.value = productionQueue.value.filter(item => item.id !== itemId)
}

// NEW: Clear all queue items
function clearQueue() {
  productionQueue.value = []
}

async function handleSubmit() {
  if (!canSubmit.value) return

  try {
    loading.value = true

    // Build list of items to process: queue items + current selection (if valid)
    const itemsToProcess: PreparationReceiptItem[] = []

    // Add queue items
    for (const queueItem of productionQueue.value) {
      itemsToProcess.push({
        preparationId: queueItem.preparationId,
        quantity: queueItem.quantity,
        costPerUnit: queueItem.costPerUnit,
        expiryDate: queueItem.expiryDate,
        notes: ''
      })
    }

    // Add current selection if valid and not in queue
    if (
      selectedPreparationId.value &&
      effectiveQuantity.value > 0 &&
      !isInQueue(selectedPreparationId.value)
    ) {
      const expiryDate = calculatedExpiryDate.value
      expiryDate.setHours(20, 0, 0, 0)

      const costPerGram = isPortionType.value
        ? calculatedCostPerUnit.value / portionSize.value
        : calculatedCostPerUnit.value

      itemsToProcess.push({
        preparationId: selectedPreparationId.value,
        quantity: effectiveQuantity.value,
        costPerUnit: costPerGram,
        expiryDate: expiryDate.toISOString().slice(0, 16),
        notes: ''
      })
    }

    if (itemsToProcess.length === 0) {
      emit('error', 'No items to produce')
      return
    }

    // Build receipt data with all items
    const receiptData: CreatePreparationReceiptData = {
      department: props.department,
      responsiblePerson: formData.value.responsiblePerson,
      sourceType: formData.value.sourceType,
      items: itemsToProcess,
      notes: formData.value.notes
    }

    DebugUtils.info(MODULE_NAME, 'Submitting preparation production', {
      receiptData,
      itemCount: itemsToProcess.length
    })

    // Create receipt through store
    await preparationStore.createReceipt(receiptData)

    DebugUtils.info(MODULE_NAME, 'Preparation production created successfully')

    // Build success message
    let message: string
    if (itemsToProcess.length === 1) {
      const item = itemsToProcess[0]
      const prep = recipesStore.preparations.find(p => p.id === item.preparationId)
      message = `Produced ${item.quantity}${prep?.outputUnit || 'g'} of ${prep?.name || 'preparation'} successfully`
    } else {
      message = `Produced ${itemsToProcess.length} preparations successfully`
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
  portionInput.value = 0

  // NEW: Reset search, filter, and queue state
  searchQuery.value = ''
  selectedCategory.value = null
  expandedPreparationId.value = null
  productionQueue.value = []

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

      // NEW: Handle preselected preparation (from quick add)
      if (props.preselectedPreparationId) {
        expandedPreparationId.value = props.preselectedPreparationId
        selectedPreparationId.value = props.preselectedPreparationId
      }
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

// NEW: Preparation list card styling
.preparation-list-card {
  max-height: 280px;
  overflow-y: auto;

  .v-list-item {
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(var(--v-theme-primary), 0.05);
    }
  }
}

.bg-primary-lighten-5 {
  background-color: rgba(var(--v-theme-primary), 0.08) !important;
}

.bg-success-lighten-5 {
  background-color: rgba(var(--v-theme-success), 0.08) !important;
}

// Expansion content styling - subtle background
.expansion-content {
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
  border-left: 3px solid rgb(var(--v-theme-primary));
}
</style>
