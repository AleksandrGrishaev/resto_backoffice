<!-- src/components/recipes/RecipeCard.vue -->
<template>
  <v-card class="recipe-card" :class="{ 'recipe-card--inactive': !recipe.isActive }">
    <v-card-title class="recipe-card__header">
      <div class="recipe-card__title-section">
        <div class="recipe-card__name">{{ recipe.name }}</div>
        <div v-if="recipe.code" class="recipe-card__code">{{ recipe.code }}</div>
      </div>

      <v-menu>
        <template #activator="{ props }">
          <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" />
        </template>
        <v-list>
          <v-list-item @click="$emit('view', recipe)">
            <template #prepend>
              <v-icon icon="mdi-eye" />
            </template>
            <v-list-item-title>View Recipe</v-list-item-title>
          </v-list-item>
          <v-list-item @click="$emit('edit', recipe)">
            <template #prepend>
              <v-icon icon="mdi-pencil" />
            </template>
            <v-list-item-title>Edit</v-list-item-title>
          </v-list-item>
          <v-list-item @click="$emit('duplicate', recipe)">
            <template #prepend>
              <v-icon icon="mdi-content-copy" />
            </template>
            <v-list-item-title>Duplicate</v-list-item-title>
          </v-list-item>
          <v-list-item @click="$emit('calculate-cost', recipe)">
            <template #prepend>
              <v-icon icon="mdi-calculator" />
            </template>
            <v-list-item-title>Calculate Cost</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
    </v-card-title>

    <v-card-text class="recipe-card__content">
      <div v-if="recipe.description" class="recipe-card__description">
        {{ recipe.description }}
      </div>

      <div class="recipe-card__details">
        <div class="recipe-card__portion">
          <v-icon icon="mdi-account-group" size="16" class="mr-1" />
          {{ recipe.portionSize }} {{ recipe.portionUnit }}
        </div>

        <div v-if="recipe.prepTime || recipe.cookTime" class="recipe-card__time">
          <v-icon icon="mdi-clock-outline" size="16" class="mr-1" />
          <span v-if="recipe.prepTime">{{ recipe.prepTime }}m prep</span>
          <span v-if="recipe.prepTime && recipe.cookTime">+</span>
          <span v-if="recipe.cookTime">{{ recipe.cookTime }}m cook</span>
        </div>

        <div class="recipe-card__difficulty">
          <v-chip :color="getDifficultyColor(recipe.difficulty)" size="small" variant="tonal">
            {{ getDifficultyText(recipe.difficulty) }}
          </v-chip>
        </div>
      </div>

      <div v-if="recipe.ingredients?.length" class="recipe-card__ingredients">
        <div class="recipe-card__ingredients-header">
          <v-icon icon="mdi-food-apple" size="16" class="mr-1" />
          Ingredients ({{ recipe.ingredients.length }})
        </div>
        <div class="recipe-card__ingredients-preview">
          {{ getIngredientsPreview() }}
        </div>
      </div>

      <div v-if="recipe.tags?.length" class="recipe-card__tags">
        <v-chip
          v-for="tag in recipe.tags.slice(0, 3)"
          :key="tag"
          size="x-small"
          variant="outlined"
          class="mr-1 mb-1"
        >
          {{ tag }}
        </v-chip>
        <span v-if="recipe.tags.length > 3" class="text-caption text-medium-emphasis">
          +{{ recipe.tags.length - 3 }} more
        </span>
      </div>

      <div v-if="recipe.cost || costCalculation" class="recipe-card__cost">
        <div class="cost-item">
          <span class="cost-label">Total Cost:</span>
          <span class="cost-value">${{ getCostValue().toFixed(2) }}</span>
        </div>
        <div class="cost-item">
          <span class="cost-label">Per Portion:</span>
          <span class="cost-value">${{ getCostPerPortion().toFixed(2) }}</span>
        </div>
      </div>
    </v-card-text>

    <v-card-actions>
      <v-btn variant="text" color="primary" @click="$emit('view', recipe)">View Recipe</v-btn>
      <v-spacer />
      <v-btn variant="outlined" size="small" @click="$emit('edit', recipe)">Edit</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRecipesStore } from '@/stores/recipes'
import { DIFFICULTY_LEVELS } from '@/stores/recipes/types'
import type { Recipe } from '@/stores/recipes/types'

interface Props {
  recipe: Recipe
}

interface Emits {
  (e: 'view', recipe: Recipe): void
  (e: 'edit', recipe: Recipe): void
  (e: 'duplicate', recipe: Recipe): void
  (e: 'calculate-cost', recipe: Recipe): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

const store = useRecipesStore()

// Computed
const costCalculation = computed(() => {
  return store.state.costCalculations.get(props.recipe.id)
})

// Methods
function getDifficultyColor(difficulty: string): string {
  const level = DIFFICULTY_LEVELS.find(l => l.value === difficulty)
  return level?.color || 'grey'
}

function getDifficultyText(difficulty: string): string {
  const level = DIFFICULTY_LEVELS.find(l => l.value === difficulty)
  return level?.text || difficulty
}

function getCostValue(): number {
  return costCalculation.value?.totalCost || props.recipe.cost || 0
}

function getCostPerPortion(): number {
  if (costCalculation.value) {
    return costCalculation.value.costPerPortion
  }
  return props.recipe.cost ? props.recipe.cost / props.recipe.portionSize : 0
}

function getIngredientsPreview(): string {
  if (!props.recipe.ingredients?.length) return 'No ingredients'

  const ingredientNames = props.recipe.ingredients.slice(0, 3).map(ri => {
    const ingredient = store.getIngredientById(ri.ingredientId)
    return ingredient?.name || 'Unknown ingredient'
  })

  const preview = ingredientNames.join(', ')
  const remaining = props.recipe.ingredients.length - 3

  return remaining > 0 ? `${preview} +${remaining} more` : preview
}
</script>

<style lang="scss" scoped>
.recipe-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &--inactive {
    opacity: 0.7;
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 16px;
    padding-bottom: 8px;
  }

  &__title-section {
    flex: 1;
  }

  &__name {
    font-size: 1.1rem;
    font-weight: 600;
    line-height: 1.3;
    margin-bottom: 4px;
  }

  &__code {
    font-size: 0.75rem;
    color: var(--text-secondary);
    font-family: monospace;
    background: var(--color-surface-variant);
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-block;
  }

  &__content {
    flex: 1;
    padding: 0 16px 16px;
  }

  &__description {
    color: var(--text-secondary);
    font-size: 0.9rem;
    margin-bottom: 12px;
    line-height: 1.4;
  }

  &__details {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }

  &__portion,
  &__time {
    display: flex;
    align-items: center;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  &__difficulty {
    align-self: flex-start;
  }

  &__ingredients {
    margin-bottom: 12px;

    &-header {
      display: flex;
      align-items: center;
      font-size: 0.85rem;
      font-weight: 500;
      margin-bottom: 4px;
      color: var(--text-primary);
    }

    &-preview {
      font-size: 0.8rem;
      color: var(--text-secondary);
      line-height: 1.3;
    }
  }

  &__tags {
    margin-bottom: 12px;
  }

  &__cost {
    padding: 8px;
    background: var(--color-surface-variant);
    border-radius: 6px;
    font-size: 0.85rem;

    .cost-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;

      &:last-child {
        margin-bottom: 0;
      }
    }

    .cost-label {
      color: var(--text-secondary);
    }

    .cost-value {
      font-weight: 600;
      color: var(--text-primary);
    }
  }
}

:deep(.v-card-actions) {
  padding: 8px 16px 16px;
}
</style>
