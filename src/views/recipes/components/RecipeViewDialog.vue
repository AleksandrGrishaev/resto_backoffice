<!-- src/views/recipes/components/RecipeViewDialog.vue -->
<template>
  <v-dialog v-model="dialogModel" max-width="900px" scrollable>
    <v-card v-if="recipe">
      <v-card-title class="text-h5 pa-4 d-flex justify-space-between align-center">
        <div>
          <div class="text-h5">{{ recipe.name }}</div>
          <div v-if="recipe.code" class="text-caption text-medium-emphasis">{{ recipe.code }}</div>
        </div>
        <div class="d-flex gap-2">
          <v-chip :color="getDifficultyColor(recipe.difficulty)" variant="tonal" size="small">
            {{ getDifficultyText(recipe.difficulty) }}
          </v-chip>
          <v-chip color="primary" variant="outlined" size="small">
            {{ getCategoryText(recipe.category) }}
          </v-chip>
        </div>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <div class="recipe-content">
          <!-- Recipe Info Header -->
          <div class="recipe-header pa-4">
            <v-row>
              <v-col cols="12" md="6">
                <div class="info-section">
                  <h4 class="text-subtitle-1 mb-2">Recipe Information</h4>
                  <div class="info-grid">
                    <div class="info-item">
                      <v-icon icon="mdi-account-group" size="18" class="mr-2" />
                      <span class="info-label">Portions:</span>
                      <span class="info-value">
                        {{ recipe.portionSize }} {{ recipe.portionUnit }}
                      </span>
                    </div>
                    <div v-if="recipe.prepTime" class="info-item">
                      <v-icon icon="mdi-clock-outline" size="18" class="mr-2" />
                      <span class="info-label">Prep Time:</span>
                      <span class="info-value">{{ recipe.prepTime }} minutes</span>
                    </div>
                    <div v-if="recipe.cookTime" class="info-item">
                      <v-icon icon="mdi-fire" size="18" class="mr-2" />
                      <span class="info-label">Cook Time:</span>
                      <span class="info-value">{{ recipe.cookTime }} minutes</span>
                    </div>
                    <div v-if="totalTime" class="info-item">
                      <v-icon icon="mdi-timer" size="18" class="mr-2" />
                      <span class="info-label">Total Time:</span>
                      <span class="info-value">{{ totalTime }} minutes</span>
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
                      <span class="cost-label">Cost per Portion:</span>
                      <span class="cost-value">
                        ${{ costCalculation.costPerPortion.toFixed(2) }}
                      </span>
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

            <div v-if="recipe.description" class="description-section mt-4">
              <h4 class="text-subtitle-1 mb-2">Description</h4>
              <p class="text-body-2">{{ recipe.description }}</p>
            </div>

            <div v-if="recipe.tags?.length" class="tags-section mt-4">
              <h4 class="text-subtitle-1 mb-2">Tags</h4>
              <div class="d-flex flex-wrap gap-2">
                <v-chip v-for="tag in recipe.tags" :key="tag" size="small" variant="outlined">
                  {{ tag }}
                </v-chip>
              </div>
            </div>
          </div>

          <v-divider />

          <!-- Ingredients Section -->
          <div class="ingredients-section pa-4">
            <h3 class="text-h6 mb-3 d-flex align-center">
              <v-icon icon="mdi-food-apple" class="mr-2" />
              Ingredients ({{ recipe.ingredients?.length || 0 }})
            </h3>

            <div v-if="!recipe.ingredients?.length" class="text-center text-medium-emphasis py-4">
              No ingredients specified
            </div>

            <div v-else class="ingredients-list">
              <v-card
                v-for="recipeIngredient in recipe.ingredients"
                :key="recipeIngredient.id"
                variant="outlined"
                class="ingredient-card mb-2"
              >
                <v-card-text class="pa-3">
                  <div class="d-flex justify-space-between align-center">
                    <div class="ingredient-info">
                      <div class="ingredient-name">
                        <span class="ingredient-code">
                          {{ getIngredientCode(recipeIngredient.ingredientId) }}
                        </span>
                        <span class="ingredient-title">
                          {{ getIngredientName(recipeIngredient.ingredientId) }}
                        </span>
                        <v-chip
                          v-if="recipeIngredient.isOptional"
                          size="x-small"
                          color="info"
                          variant="tonal"
                          class="ml-2"
                        >
                          Optional
                        </v-chip>
                      </div>
                      <div v-if="recipeIngredient.preparation" class="ingredient-prep">
                        <v-icon icon="mdi-knife" size="14" class="mr-1" />
                        {{ recipeIngredient.preparation }}
                      </div>
                      <div v-if="recipeIngredient.notes" class="ingredient-notes">
                        <v-icon icon="mdi-note-text" size="14" class="mr-1" />
                        {{ recipeIngredient.notes }}
                      </div>
                    </div>
                    <div class="ingredient-quantity">
                      <span class="quantity-value">{{ recipeIngredient.quantity }}</span>
                      <span class="quantity-unit">{{ recipeIngredient.unit }}</span>
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
              Instructions ({{ recipe.instructions?.length || 0 }})
            </h3>

            <div v-if="!recipe.instructions?.length" class="text-center text-medium-emphasis py-4">
              No instructions specified
            </div>

            <div v-else class="instructions-list">
              <v-timeline density="compact" align="start">
                <v-timeline-item
                  v-for="(step, index) in recipe.instructions"
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
          </div>

          <!-- Cost Breakdown Section -->
          <div v-if="costCalculation?.ingredientCosts?.length" class="cost-breakdown-section pa-4">
            <v-divider class="mb-4" />
            <h3 class="text-h6 mb-3 d-flex align-center">
              <v-icon icon="mdi-calculator" class="mr-2" />
              Cost Breakdown
            </h3>

            <div class="cost-breakdown-list">
              <v-card
                v-for="ingredientCost in costCalculation.ingredientCosts"
                :key="ingredientCost.ingredientId"
                variant="outlined"
                class="cost-item-card mb-2"
              >
                <v-card-text class="pa-3">
                  <div class="d-flex justify-space-between align-center">
                    <div class="ingredient-info">
                      <span class="ingredient-name">
                        {{ getIngredientName(ingredientCost.ingredientId) }}
                      </span>
                    </div>
                    <div class="cost-info">
                      <span class="cost-value">${{ ingredientCost.cost.toFixed(2) }}</span>
                      <span class="cost-percentage">
                        ({{ ingredientCost.percentage.toFixed(1) }}%)
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
        <v-btn color="primary" variant="outlined" prepend-icon="mdi-pencil" @click="editRecipe">
          Edit Recipe
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRecipesStore } from '@/stores/recipes'
import { RECIPE_CATEGORIES, DIFFICULTY_LEVELS } from '@/stores/recipes/types'
import type { Recipe, CostCalculation } from '@/stores/recipes/types'

interface Props {
  modelValue: boolean
  recipe?: Recipe | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'edit', recipe: Recipe): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const store = useRecipesStore()
const costCalculation = ref<CostCalculation | null>(null)

// Dialog model
const dialogModel = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

// Computed
const totalTime = computed(() => {
  if (!props.recipe) return null
  const prep = props.recipe.prepTime || 0
  const cook = props.recipe.cookTime || 0
  return prep + cook > 0 ? prep + cook : null
})

// Methods
function getIngredientName(ingredientId: string): string {
  const ingredient = store.getIngredientById(ingredientId)
  return ingredient?.name || 'Unknown ingredient'
}

function getIngredientCode(ingredientId: string): string {
  const ingredient = store.getIngredientById(ingredientId)
  return ingredient?.code || '??'
}

function getDifficultyColor(difficulty: string): string {
  const level = DIFFICULTY_LEVELS.find(l => l.value === difficulty)
  return level?.color || 'grey'
}

function getDifficultyText(difficulty: string): string {
  const level = DIFFICULTY_LEVELS.find(l => l.value === difficulty)
  return level?.text || difficulty
}

function getCategoryText(category: string): string {
  const cat = RECIPE_CATEGORIES.find(c => c.value === category)
  return cat?.text || category
}

async function calculateCost() {
  if (!props.recipe) return

  try {
    const calculation = await store.calculateRecipeCost(props.recipe.id)
    if (calculation) {
      costCalculation.value = calculation
    }
  } catch (error) {
    console.error('Failed to calculate cost:', error)
  }
}

function editRecipe() {
  if (props.recipe) {
    emit('edit', props.recipe)
    dialogModel.value = false
  }
}

// Watch for recipe changes
watch(
  () => props.recipe,
  newRecipe => {
    if (newRecipe) {
      // Check if we already have cost calculation for this recipe
      const existingCalculation = store.state.costCalculations.get(newRecipe.id)
      costCalculation.value = existingCalculation || null
    } else {
      costCalculation.value = null
    }
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.recipe-content {
  .recipe-header {
    background: var(--color-surface-variant);
  }

  .info-section {
    h4 {
      color: var(--text-primary);
      margin-bottom: 8px;
    }
  }

  .info-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .info-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;

    .info-label {
      color: var(--text-secondary);
      min-width: 80px;
    }

    .info-value {
      color: var(--text-primary);
      font-weight: 500;
    }
  }

  .cost-card {
    background: var(--color-surface);
    border-radius: 8px;
    padding: 12px;
    border: 1px solid var(--color-outline-variant);

    .cost-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;

      &:last-child {
        margin-bottom: 0;
        padding-top: 4px;
        border-top: 1px solid var(--color-outline-variant);
        font-weight: 600;
      }
    }

    .cost-label {
      color: var(--text-secondary);
    }

    .cost-value {
      color: var(--text-primary);
      font-weight: 500;
    }
  }

  .description-section {
    p {
      line-height: 1.5;
      color: var(--text-secondary);
    }
  }

  .ingredient-card {
    .ingredient-info {
      flex: 1;
    }

    .ingredient-name {
      display: flex;
      align-items: center;
      margin-bottom: 4px;

      .ingredient-code {
        background: var(--color-primary);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 600;
        font-family: monospace;
        margin-right: 8px;
        min-width: 40px;
        text-align: center;
      }

      .ingredient-title {
        font-weight: 500;
        color: var(--text-primary);
      }
    }

    .ingredient-prep,
    .ingredient-notes {
      font-size: 0.85rem;
      color: var(--text-secondary);
      margin-bottom: 2px;
      display: flex;
      align-items: center;
    }

    .ingredient-quantity {
      text-align: right;

      .quantity-value {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .quantity-unit {
        font-size: 0.9rem;
        color: var(--text-secondary);
        margin-left: 4px;
      }
    }
  }

  .step-content {
    .step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;

      .step-number {
        font-weight: 600;
        color: var(--text-primary);
      }

      .step-meta {
        display: flex;
        gap: 4px;
      }
    }

    .step-instruction {
      line-height: 1.5;
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    .step-equipment {
      font-size: 0.85rem;
      color: var(--text-secondary);
      display: flex;
      align-items: center;

      .equipment-label {
        margin-right: 4px;
      }

      .equipment-list {
        font-style: italic;
      }
    }
  }

  .cost-breakdown-list {
    .cost-item-card {
      .ingredient-name {
        font-weight: 500;
        color: var(--text-primary);
      }

      .cost-info {
        text-align: right;

        .cost-value {
          font-weight: 600;
          color: var(--text-primary);
          margin-right: 8px;
        }

        .cost-percentage {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
      }
    }
  }
}

:deep(.v-card-text) {
  max-height: 80vh;
  overflow-y: auto;
}

:deep(.v-timeline) {
  .v-timeline-item__body {
    padding-bottom: 16px;
  }
}

// Responsive design
@media (max-width: 768px) {
  .recipe-content {
    .info-grid {
      .info-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;

        .info-label {
          min-width: auto;
          font-size: 0.8rem;
        }
      }
    }

    .ingredient-card {
      .d-flex {
        flex-direction: column;
        align-items: flex-start !important;
        gap: 8px;
      }

      .ingredient-quantity {
        text-align: left;
      }
    }

    .step-content {
      .step-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
    }
  }
}
</style>
