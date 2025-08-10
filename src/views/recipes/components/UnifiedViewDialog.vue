<!-- src/views/recipes/components/UnifiedViewDialog.vue - FIXED -->
<template>
  <v-dialog v-model="dialogModel" max-width="900px" scrollable>
    <v-card v-if="item">
      <v-card-title class="text-h5 pa-4 d-flex justify-space-between align-center">
        <div>
          <div class="text-h5">{{ item.name }}</div>
          <div v-if="item.code" class="text-caption text-medium-emphasis">{{ item.code }}</div>
        </div>
        <div class="d-flex gap-2">
          <v-chip
            v-if="type === 'recipe'"
            :color="getDifficultyColor()"
            variant="tonal"
            size="small"
          >
            {{ getDifficultyText() }}
          </v-chip>
          <v-chip color="primary" variant="outlined" size="small">
            {{ getCategoryText() }}
          </v-chip>
          <v-chip v-if="!item.isActive" color="warning" variant="tonal" size="small">
            Archived
          </v-chip>
        </div>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <div class="item-content">
          <!-- Item Info Header -->
          <div class="item-header pa-4">
            <v-row>
              <v-col cols="12" md="6">
                <div class="info-section">
                  <h4 class="text-subtitle-1 mb-2">
                    {{ type === 'preparation' ? 'Preparation Information' : 'Recipe Information' }}
                  </h4>
                  <div class="info-grid">
                    <!-- Output/Portion info -->
                    <div class="info-item">
                      <v-icon :icon="getOutputIcon()" size="18" class="mr-2" />
                      <span class="info-label">{{ getOutputLabel() }}:</span>
                      <span class="info-value">{{ getOutputValue() }}</span>
                    </div>

                    <!-- Time info -->
                    <div v-if="getPreparationTime()" class="info-item">
                      <v-icon icon="mdi-clock-outline" size="18" class="mr-2" />
                      <span class="info-label">{{ getTimeLabel() }}:</span>
                      <span class="info-value">{{ getTimeValue() }}</span>
                    </div>

                    <!-- Cook time for recipes -->
                    <div v-if="type === 'recipe' && (item as Recipe).cookTime" class="info-item">
                      <v-icon icon="mdi-fire" size="18" class="mr-2" />
                      <span class="info-label">Cook Time:</span>
                      <span class="info-value">{{ (item as Recipe).cookTime }} minutes</span>
                    </div>

                    <!-- Total time for recipes -->
                    <div v-if="type === 'recipe' && getTotalTime()" class="info-item">
                      <v-icon icon="mdi-timer" size="18" class="mr-2" />
                      <span class="info-label">Total Time:</span>
                      <span class="info-value">{{ getTotalTime() }} minutes</span>
                    </div>
                  </div>
                </div>
              </v-col>

              <!-- ✅ УЛУЧШЕНО: Cost Information Section -->
              <v-col cols="12" md="6">
                <div class="info-section">
                  <div class="d-flex justify-space-between align-center mb-2">
                    <h4 class="text-subtitle-1">Cost Information</h4>
                    <v-btn
                      size="small"
                      variant="outlined"
                      color="primary"
                      prepend-icon="mdi-refresh"
                      :loading="calculating"
                      @click="recalculateCost"
                    >
                      Recalculate
                    </v-btn>
                  </div>

                  <div v-if="costCalculation" class="cost-card">
                    <div class="cost-summary">
                      <div class="cost-item primary">
                        <span class="cost-label">Total Cost:</span>
                        <span class="cost-value">${{ costCalculation.totalCost.toFixed(2) }}</span>
                      </div>
                      <div class="cost-item secondary">
                        <span class="cost-label">{{ getCostPerLabel() }}:</span>
                        <span class="cost-value">${{ getCostPerValue().toFixed(2) }}</span>
                      </div>
                      <div class="cost-meta">
                        <v-icon icon="mdi-clock" size="12" class="mr-1" />
                        <span class="text-caption">
                          Updated: {{ formatCalculationTime(costCalculation.calculatedAt) }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div v-else class="no-cost-card">
                    <v-icon
                      icon="mdi-calculator-variant"
                      size="24"
                      class="mb-2 text-medium-emphasis"
                    />
                    <div class="text-body-2 text-medium-emphasis mb-2">
                      No cost calculation available
                    </div>
                    <v-btn
                      size="small"
                      variant="outlined"
                      color="primary"
                      :loading="calculating"
                      @click="calculateCost"
                    >
                      Calculate Cost
                    </v-btn>
                  </div>
                </div>
              </v-col>
            </v-row>

            <div v-if="item.description" class="description-section mt-4">
              <h4 class="text-subtitle-1 mb-2">Description</h4>
              <p class="text-body-2">{{ item.description }}</p>
            </div>

            <!-- Tags for recipes -->
            <div
              v-if="type === 'recipe' && (item as Recipe).tags?.length"
              class="tags-section mt-4"
            >
              <h4 class="text-subtitle-1 mb-2">Tags</h4>
              <div class="d-flex flex-wrap gap-2">
                <v-chip
                  v-for="tag in (item as Recipe).tags"
                  :key="tag"
                  size="small"
                  variant="outlined"
                >
                  {{ tag }}
                </v-chip>
              </div>
            </div>
          </div>

          <v-divider />

          <!-- Components Section -->
          <div class="components-section pa-4">
            <h3 class="text-h6 mb-3 d-flex align-center">
              <v-icon icon="mdi-food-apple" class="mr-2" />
              {{ getComponentsTitle() }} ({{ getComponentsCount() }})
            </h3>

            <div v-if="getComponentsCount() === 0" class="text-center text-medium-emphasis py-4">
              No {{ type === 'preparation' ? 'products' : 'components' }} specified
            </div>

            <div v-else class="components-list">
              <v-card
                v-for="component in getComponents()"
                :key="component.id"
                variant="outlined"
                class="component-card mb-2"
              >
                <v-card-text class="pa-3">
                  <div class="d-flex justify-space-between align-center">
                    <div class="component-info">
                      <div class="component-name">
                        <span v-if="component.code" class="component-code">
                          {{ component.code }}
                        </span>
                        <span class="component-title">
                          {{ component.name }}
                        </span>
                        <v-chip
                          v-if="type === 'recipe' && component.type"
                          size="x-small"
                          :color="component.type === 'product' ? 'blue' : 'green'"
                          variant="tonal"
                          class="ml-2"
                        >
                          {{ component.type }}
                        </v-chip>
                      </div>
                      <div v-if="component.notes" class="component-notes">
                        <v-icon icon="mdi-note-text" size="14" class="mr-1" />
                        {{ component.notes }}
                      </div>
                    </div>
                    <div class="component-quantity">
                      <span class="quantity-value">{{ component.quantity }}</span>
                      <span class="quantity-unit">{{ component.unit }}</span>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </div>
          </div>

          <v-divider />

          <!-- Instructions Section -->
          <div class="instructions-section pa-4">
            <h3 class="text-h6 mb-3 d-flex align-center">
              <v-icon icon="mdi-format-list-numbered" class="mr-2" />
              Instructions
            </h3>

            <div v-if="!getInstructions()" class="text-center text-medium-emphasis py-4">
              No instructions specified
            </div>

            <div v-else class="instructions-content">
              <!-- For preparations: simple text -->
              <div v-if="type === 'preparation'" class="instructions-text">
                <div class="instruction-text">{{ getInstructions() }}</div>
              </div>

              <!-- For recipes: step-by-step -->
              <div v-else-if="type === 'recipe' && (item as Recipe).instructions?.length">
                <v-timeline density="compact" align="start">
                  <v-timeline-item
                    v-for="(step, index) in (item as Recipe).instructions"
                    :key="step.id"
                    :dot-color="index === 0 ? 'primary' : 'grey-lighten-1'"
                    size="small"
                  >
                    <div class="step-content">
                      <div class="step-header">
                        <span class="step-number">Step {{ step.stepNumber }}</span>
                        <div v-if="step.duration || step.temperature" class="step-meta">
                          <v-chip
                            v-if="step.duration"
                            size="x-small"
                            color="info"
                            variant="tonal"
                            class="mr-1"
                          >
                            <v-icon icon="mdi-clock" size="12" class="mr-1" />
                            {{ step.duration }}m
                          </v-chip>
                          <v-chip
                            v-if="step.temperature"
                            size="x-small"
                            color="warning"
                            variant="tonal"
                          >
                            <v-icon icon="mdi-thermometer" size="12" class="mr-1" />
                            {{ step.temperature }}°C
                          </v-chip>
                        </div>
                      </div>
                      <div class="step-instruction">{{ step.instruction }}</div>
                      <div v-if="step.equipment?.length" class="step-equipment">
                        <v-icon icon="mdi-tools" size="14" class="mr-1" />
                        <span class="equipment-label">Equipment:</span>
                        <span class="equipment-list">{{ step.equipment.join(', ') }}</span>
                      </div>
                    </div>
                  </v-timeline-item>
                </v-timeline>
              </div>

              <!-- For recipes: simple text fallback -->
              <div v-else class="instructions-text">
                <div class="instruction-text">{{ getInstructions() }}</div>
              </div>
            </div>
          </div>

          <!-- ✅ УЛУЧШЕНО: Detailed Cost Breakdown Section -->
          <div v-if="costCalculation?.componentCosts?.length" class="cost-breakdown-section pa-4">
            <v-divider class="mb-4" />
            <div class="d-flex justify-space-between align-center mb-3">
              <h3 class="text-h6 d-flex align-center">
                <v-icon icon="mdi-calculator" class="mr-2" />
                Detailed Cost Breakdown
              </h3>
              <v-chip size="small" variant="tonal" color="info">
                {{ costCalculation.componentCosts.length }} components
              </v-chip>
            </div>

            <!-- Cost Summary Chart -->
            <div class="cost-breakdown-summary mb-4">
              <v-card variant="outlined" class="pa-3">
                <div class="cost-chart">
                  <div
                    v-for="componentCost in costCalculation.componentCosts"
                    :key="componentCost.componentId"
                    class="cost-bar"
                    :style="{ width: `${componentCost.percentage}%` }"
                    :title="`${getComponentName(componentCost.componentId, componentCost.componentType)}: ${componentCost.percentage.toFixed(1)}%`"
                  />
                </div>
                <div class="cost-legend mt-2">
                  <span class="text-caption text-medium-emphasis">
                    Cost distribution by component (hover bars for details)
                  </span>
                </div>
              </v-card>
            </div>

            <!-- Detailed Component Costs -->
            <div class="cost-breakdown-list">
              <v-card
                v-for="(componentCost, index) in sortedComponentCosts"
                :key="componentCost.componentId"
                variant="outlined"
                class="cost-item-card mb-2"
                :class="{ 'highest-cost': index === 0 }"
              >
                <v-card-text class="pa-3">
                  <div class="d-flex justify-space-between align-center">
                    <div class="component-cost-info">
                      <div class="component-cost-name">
                        <span class="component-name">
                          {{
                            getComponentName(componentCost.componentId, componentCost.componentType)
                          }}
                        </span>
                        <v-chip
                          size="x-small"
                          :color="componentCost.componentType === 'product' ? 'blue' : 'green'"
                          variant="tonal"
                          class="ml-2"
                        >
                          {{ componentCost.componentType }}
                        </v-chip>
                        <v-chip
                          v-if="index === 0"
                          size="x-small"
                          color="warning"
                          variant="tonal"
                          class="ml-1"
                        >
                          Most Expensive
                        </v-chip>
                      </div>
                      <div class="component-cost-details">
                        <span class="text-caption text-medium-emphasis">
                          {{ componentCost.quantity }} {{ componentCost.unit }} × ${{
                            componentCost.planUnitCost.toFixed(2)
                          }}/{{ componentCost.unit }}
                        </span>
                      </div>
                    </div>
                    <div class="cost-info">
                      <div class="cost-value">${{ componentCost.totalPlanCost.toFixed(2) }}</div>
                      <div class="cost-percentage">{{ componentCost.percentage.toFixed(1) }}%</div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </div>

            <!-- Cost Analysis -->
            <div class="cost-analysis mt-4">
              <v-card variant="outlined" class="pa-3">
                <h4 class="text-subtitle-2 mb-2">Cost Analysis</h4>
                <div class="analysis-grid">
                  <div class="analysis-item">
                    <span class="analysis-label">Most expensive component:</span>
                    <span class="analysis-value">
                      {{ getMostExpensiveComponent() }}
                    </span>
                  </div>
                  <div class="analysis-item">
                    <span class="analysis-label">Average cost per component:</span>
                    <span class="analysis-value">
                      ${{ getAverageCostPerComponent().toFixed(2) }}
                    </span>
                  </div>
                  <div class="analysis-item">
                    <span class="analysis-label">Cost calculation method:</span>
                    <span class="analysis-value">{{ costCalculation.note }}</span>
                  </div>
                </div>
              </v-card>
            </div>
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn
          v-if="!costCalculation"
          color="info"
          variant="outlined"
          prepend-icon="mdi-calculator"
          :loading="calculating"
          @click="calculateCost"
        >
          Calculate Cost
        </v-btn>
        <v-btn
          v-else
          color="primary"
          variant="outlined"
          prepend-icon="mdi-refresh"
          :loading="calculating"
          @click="recalculateCost"
        >
          Recalculate Cost
        </v-btn>
        <v-spacer />
        <v-btn variant="text" @click="dialogModel = false">Close</v-btn>
        <v-btn color="primary" variant="outlined" prepend-icon="mdi-pencil" @click="editItem">
          Edit {{ type === 'preparation' ? 'Preparation' : 'Recipe' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRecipesStore } from '@/stores/recipes'
import { useProductsStore } from '@/stores/productsStore'
import { RECIPE_CATEGORIES, PREPARATION_TYPES, DIFFICULTY_LEVELS } from '@/stores/recipes/types'
import type {
  Recipe,
  Preparation,
  PreparationPlanCost,
  RecipePlanCost
} from '@/stores/recipes/types'

interface Props {
  modelValue: boolean
  type: 'recipe' | 'preparation'
  item?: Recipe | Preparation | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'edit', item: Recipe | Preparation): void
  (e: 'calculate-cost', item: Recipe | Preparation): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const store = useRecipesStore()
const productsStore = useProductsStore()
const costCalculation = ref<PreparationPlanCost | RecipePlanCost | null>(null)
const calculating = ref(false)

// Dialog model
const dialogModel = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

// ✅ НОВОЕ: Sorted component costs для анализа
const sortedComponentCosts = computed(() => {
  if (!costCalculation.value?.componentCosts) return []
  return [...costCalculation.value.componentCosts].sort((a, b) => b.totalPlanCost - a.totalPlanCost)
})

// Methods for different types
function getOutputIcon(): string {
  return props.type === 'preparation' ? 'mdi-package-variant' : 'mdi-account-group'
}

function getOutputLabel(): string {
  return props.type === 'preparation' ? 'Output' : 'Portions'
}

function getOutputValue(): string {
  if (!props.item) return ''

  if (props.type === 'preparation') {
    const prep = props.item as Preparation
    return `${prep.outputQuantity} ${prep.outputUnit}`
  } else {
    const recipe = props.item as Recipe
    return `${recipe.portionSize} ${recipe.portionUnit}`
  }
}

function getPreparationTime(): number {
  if (!props.item) return 0

  if (props.type === 'preparation') {
    return (props.item as Preparation).preparationTime
  } else {
    return (props.item as Recipe).prepTime || 0
  }
}

function getTimeLabel(): string {
  return props.type === 'preparation' ? 'Prep Time' : 'Prep Time'
}

function getTimeValue(): string {
  const time = getPreparationTime()
  return time ? `${time} minutes` : ''
}

function getTotalTime(): number | null {
  if (props.type !== 'recipe' || !props.item) return null

  const recipe = props.item as Recipe
  const prep = recipe.prepTime || 0
  const cook = recipe.cookTime || 0
  return prep + cook > 0 ? prep + cook : null
}

function getCategoryText(): string {
  if (!props.item) return ''

  if (props.type === 'preparation') {
    const prep = props.item as Preparation
    const category = PREPARATION_TYPES.find(c => c.value === prep.type)
    return category?.text || prep.type
  } else {
    const recipe = props.item as Recipe
    const category = RECIPE_CATEGORIES.find(c => c.value === recipe.category)
    return category?.text || recipe.category
  }
}

function getDifficultyColor(): string {
  if (props.type !== 'recipe' || !props.item) return 'grey'

  const recipe = props.item as Recipe
  const level = DIFFICULTY_LEVELS.find(l => l.value === recipe.difficulty)
  return level?.color || 'grey'
}

function getDifficultyText(): string {
  if (props.type !== 'recipe' || !props.item) return ''

  const recipe = props.item as Recipe
  const level = DIFFICULTY_LEVELS.find(l => l.value === recipe.difficulty)
  return level?.text || recipe.difficulty
}

function getCostPerLabel(): string {
  return props.type === 'preparation' ? 'Cost per Unit' : 'Cost per Portion'
}

function getCostPerValue(): number {
  if (!costCalculation.value) return 0

  if (props.type === 'preparation') {
    return (costCalculation.value as PreparationPlanCost).costPerOutputUnit
  } else {
    return (costCalculation.value as RecipePlanCost).costPerPortion
  }
}

function getComponentsTitle(): string {
  return props.type === 'preparation' ? 'Recipe (Products)' : 'Components'
}

function getComponentsCount(): number {
  if (!props.item) return 0

  if (props.type === 'preparation') {
    return (props.item as Preparation).recipe?.length || 0
  } else {
    return (props.item as Recipe).components?.length || 0
  }
}

function getComponents() {
  if (!props.item) return []

  if (props.type === 'preparation') {
    const prep = props.item as Preparation
    return (prep.recipe || []).map(ingredient => {
      const product = productsStore.getProductById(ingredient.id)
      return {
        id: ingredient.id,
        name: product?.name || 'Unknown product',
        code: '',
        type: 'product',
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.notes
      }
    })
  } else {
    const recipe = props.item as Recipe
    return (recipe.components || []).map(component => {
      let name = 'Unknown'
      let code = ''

      if (component.componentType === 'product') {
        const product = productsStore.getProductById(component.componentId)
        name = product?.name || 'Unknown product'
      } else {
        const preparation = store.getPreparationById(component.componentId)
        name = preparation?.name || 'Unknown preparation'
        code = preparation?.code || ''
      }

      return {
        id: component.componentId,
        name,
        code,
        type: component.componentType,
        quantity: component.quantity,
        unit: component.unit,
        notes: component.notes
      }
    })
  }
}

function getInstructions(): string {
  if (!props.item) return ''

  if (props.type === 'preparation') {
    return (props.item as Preparation).instructions
  } else {
    const recipe = props.item as Recipe
    // Если есть структурированные инструкции, берем первую
    if (recipe.instructions && recipe.instructions.length > 0) {
      return recipe.instructions[0].instruction
    }
    return ''
  }
}

function getComponentName(componentId: string, componentType: string): string {
  if (componentType === 'product') {
    const product = productsStore.getProductById(componentId)
    return product?.name || 'Unknown product'
  } else {
    const preparation = store.getPreparationById(componentId)
    return preparation?.name || 'Unknown preparation'
  }
}

// ✅ НОВОЕ: Cost Analysis Methods
function getMostExpensiveComponent(): string {
  if (!sortedComponentCosts.value.length) return 'N/A'
  const most = sortedComponentCosts.value[0]
  return `${getComponentName(most.componentId, most.componentType)} ($${most.totalPlanCost.toFixed(2)})`
}

function getAverageCostPerComponent(): number {
  if (!costCalculation.value?.componentCosts) return 0
  const total = costCalculation.value.componentCosts.reduce(
    (sum, comp) => sum + comp.totalPlanCost,
    0
  )
  return total / costCalculation.value.componentCosts.length
}

function formatCalculationTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  return new Date(date).toLocaleDateString()
}

// ✅ НОВОЕ: Cost Calculation Actions
async function calculateCost() {
  if (!props.item) return

  calculating.value = true
  try {
    if (props.type === 'preparation') {
      const result = await store.calculatePreparationCost(props.item.id)
      costCalculation.value = result
    } else {
      const result = await store.calculateRecipeCost(props.item.id)
      costCalculation.value = result
    }
    emit('calculate-cost', props.item)
  } catch (error) {
    console.error('Failed to calculate cost:', error)
  } finally {
    calculating.value = false
  }
}

async function recalculateCost() {
  await calculateCost()
}

function editItem() {
  if (props.item) {
    emit('edit', props.item)
    dialogModel.value = false
  }
}

// Watch for item changes
watch(
  () => props.item,
  newItem => {
    if (newItem) {
      // Check if we already have cost calculation for this item
      if (props.type === 'preparation') {
        costCalculation.value = store.getPreparationCostCalculation(newItem.id)
      } else {
        costCalculation.value = store.getRecipeCostCalculation(newItem.id)
      }
    } else {
      costCalculation.value = null
    }
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.info-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-label {
  font-weight: 500;
  min-width: 80px;
}

.info-value {
  color: var(--color-primary);
  font-weight: 600;
}

.cost-card {
  border: 1px solid var(--color-outline-variant);
  border-radius: 8px;
  padding: 12px;
  background: var(--color-surface-variant);
}

.cost-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cost-item {
  display: flex;
  justify-content: space-between;
  align-items: center;

  &.primary .cost-value {
    color: var(--color-success);
    font-weight: 700;
    font-size: 1.1rem;
  }

  &.secondary .cost-value {
    color: var(--color-primary);
    font-weight: 600;
  }
}

.cost-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  opacity: 0.7;
}

.no-cost-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  text-align: center;
  border: 2px dashed var(--color-outline-variant);
  border-radius: 8px;
}

// ✅ НОВОЕ: Cost Breakdown Styles
.cost-breakdown-summary {
  .cost-chart {
    display: flex;
    height: 12px;
    border-radius: 6px;
    overflow: hidden;
    background: var(--color-surface-variant);
  }

  .cost-bar {
    height: 100%;
    background: linear-gradient(
      90deg,
      var(--color-primary) 0%,
      var(--color-success) 50%,
      var(--color-warning) 100%
    );
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.8;
    }
  }
}

.cost-item-card {
  transition: all 0.2s ease;

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  &.highest-cost {
    border: 2px solid var(--color-warning);
    background: linear-gradient(135deg, #fff8e1 0%, #ffffff 100%);
  }
}

.component-cost-info {
  flex: 1;
}

.component-cost-name {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 4px;
}

.component-name {
  font-weight: 600;
}

.component-cost-details {
  color: var(--color-text-secondary);
}

.cost-info {
  text-align: right;
  min-width: 100px;
}

.cost-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-success);
}

.cost-percentage {
  font-size: 0.85rem;
  color: var(--color-primary);
  font-weight: 500;
}

.cost-analysis {
  .analysis-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .analysis-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    border-bottom: 1px solid var(--color-outline-variant);

    &:last-child {
      border-bottom: none;
    }
  }

  .analysis-label {
    font-weight: 500;
    color: var(--color-text-secondary);
  }

  .analysis-value {
    font-weight: 600;
    color: var(--color-primary);
  }
}

.component-card {
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--color-primary);
    transform: translateX(2px);
  }
}

.component-info {
  flex: 1;
}

.component-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.component-code {
  background: var(--color-primary);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.7rem;
  font-weight: 600;
}

.component-title {
  font-weight: 600;
  color: var(--color-text-primary);
}

.component-notes {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
}

.component-quantity {
  text-align: right;
  min-width: 80px;
}

.quantity-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-primary);
}

.quantity-unit {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-left: 2px;
}

.instructions-content {
  line-height: 1.6;
}

.instruction-text {
  white-space: pre-wrap;
  color: var(--color-text-primary);
}

.step-content {
  .step-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .step-number {
    font-weight: 700;
    color: var(--color-primary);
  }

  .step-meta {
    display: flex;
    gap: 4px;
  }

  .step-instruction {
    margin-bottom: 8px;
    line-height: 1.5;
  }

  .step-equipment {
    font-size: 0.85rem;
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .equipment-label {
    font-weight: 500;
  }
}

// Responsive design
@media (max-width: 768px) {
  .info-grid {
    gap: 12px;
  }

  .cost-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .component-name {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .analysis-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .cost-info {
    text-align: left;
    min-width: auto;
  }
}
</style>
