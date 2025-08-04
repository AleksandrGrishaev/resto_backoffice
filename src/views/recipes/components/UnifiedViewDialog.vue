<!-- src/views/recipes/components/UnifiedViewDialog.vue -->
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

              <v-col v-if="costCalculation" cols="12" md="6">
                <div class="info-section">
                  <h4 class="text-subtitle-1 mb-2">Cost Information</h4>
                  <div class="cost-card">
                    <div class="cost-item">
                      <span class="cost-label">Total Cost:</span>
                      <span class="cost-value">${{ costCalculation.totalCost.toFixed(2) }}</span>
                    </div>
                    <div class="cost-item">
                      <span class="cost-label">{{ getCostPerLabel() }}:</span>
                      <span class="cost-value">${{ getCostPerValue().toFixed(2) }}</span>
                    </div>
                  </div>
                </div>
              </v-col>

              <v-col v-if="!costCalculation" cols="12" md="6">
                <div class="info-section">
                  <h4 class="text-subtitle-1 mb-2">Cost Information</h4>
                  <v-btn size="small" variant="outlined" color="primary" @click="calculateCost">
                    Calculate Cost
                  </v-btn>
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

          <!-- Cost Breakdown Section -->
          <div v-if="costCalculation?.componentCosts?.length" class="cost-breakdown-section pa-4">
            <v-divider class="mb-4" />
            <h3 class="text-h6 mb-3 d-flex align-center">
              <v-icon icon="mdi-calculator" class="mr-2" />
              Cost Breakdown
            </h3>

            <div class="cost-breakdown-list">
              <v-card
                v-for="componentCost in costCalculation.componentCosts"
                :key="componentCost.componentId"
                variant="outlined"
                class="cost-item-card mb-2"
              >
                <v-card-text class="pa-3">
                  <div class="d-flex justify-space-between align-center">
                    <div class="component-info">
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
                    </div>
                    <div class="cost-info">
                      <span class="cost-value">${{ componentCost.cost.toFixed(2) }}</span>
                      <span class="cost-percentage">
                        ({{ componentCost.percentage.toFixed(1) }}%)
                      </span>
                    </div>
                  </div>
                </v-card-text>
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
          @click="calculateCost"
        >
          Calculate Cost
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
import type { Recipe, Preparation, CostCalculation } from '@/stores/recipes/types'

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
const costCalculation = ref<CostCalculation | null>(null)

// Dialog model
const dialogModel = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
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
  return props.type === 'preparation' ? 'Cost per Batch' : 'Cost per Portion'
}

function getCostPerValue(): number {
  if (!costCalculation.value) return 0

  if (props.type === 'preparation') {
    return costCalculation.value.totalCost // для полуфабрикатов - вся стоимость
  } else {
    return costCalculation.value.costPerPortion
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

async function calculateCost() {
  if (!props.item) return
  emit('calculate-cost', props.item)
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
      const existingCalculation = store.state.costCalculations.get(newItem.id)
      costCalculation.value = existingCalculation || null
    } else {
      costCalculation.value = null
    }
  },
  { immediate: true }
)
</script>
