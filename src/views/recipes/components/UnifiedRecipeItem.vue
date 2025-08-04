<!-- src/views/recipes/components/UnifiedRecipeItem.vue -->
<template>
  <div class="recipe-item" :class="{ 'recipe-item--inactive': !item.isActive }">
    <div class="recipe-item__main">
      <div class="recipe-item__left">
        <div class="recipe-item__header">
          <div v-if="item.code" class="recipe-item__code">{{ item.code }}</div>
          <div class="recipe-item__name">{{ item.name }}</div>
          <v-chip size="x-small" :color="getCategoryColor()" variant="tonal" class="ml-2">
            {{ getCategoryText() }}
          </v-chip>
          <v-chip
            v-if="type === 'recipe'"
            size="x-small"
            :color="getDifficultyColor()"
            variant="tonal"
            class="ml-1"
          >
            {{ getDifficultyText() }}
          </v-chip>
        </div>

        <div v-if="item.description" class="recipe-item__description">
          {{ item.description }}
        </div>

        <div class="recipe-item__details">
          <!-- Output/Portion info -->
          <div class="recipe-item__output">
            <v-icon icon="mdi-package-variant" size="14" class="mr-1" />
            <span v-if="type === 'preparation'">
              Output: {{ (item as Preparation).outputQuantity }}
              {{ (item as Preparation).outputUnit }}
            </span>
            <span v-else>
              Portions: {{ (item as Recipe).portionSize }} {{ (item as Recipe).portionUnit }}
            </span>
          </div>

          <!-- Time info -->
          <div v-if="getPreparationTime()" class="recipe-item__time">
            <v-icon icon="mdi-clock-outline" size="14" class="mr-1" />
            {{ getTimeText() }}
          </div>

          <!-- Cost info -->
          <div v-if="getCostValue() > 0" class="recipe-item__cost">
            <v-icon icon="mdi-currency-usd" size="14" class="mr-1" />
            ${{ getCostValue().toFixed(2) }} {{ getCostUnit() }}
          </div>

          <!-- Components count -->
          <div v-if="getComponentsCount() > 0" class="recipe-item__components">
            <v-icon icon="mdi-format-list-bulleted" size="14" class="mr-1" />
            <span class="components-label">Components:</span>
            <span class="components-count">{{ getComponentsCount() }}</span>
          </div>
        </div>

        <!-- Tags for recipes -->
        <div v-if="type === 'recipe' && (item as Recipe).tags?.length" class="recipe-item__tags">
          <v-chip
            v-for="tag in (item as Recipe).tags!.slice(0, 3)"
            :key="tag"
            size="x-small"
            variant="outlined"
            class="mr-1 mb-1"
          >
            {{ tag }}
          </v-chip>
          <span v-if="(item as Recipe).tags!.length > 3" class="text-caption text-medium-emphasis">
            +{{ (item as Recipe).tags!.length - 3 }} more
          </span>
        </div>

        <!-- Instructions preview -->
        <div v-if="getInstructionsPreview()" class="recipe-item__instructions">
          <v-icon icon="mdi-text" size="14" class="mr-1" />
          <span class="instructions-preview">{{ getInstructionsPreview() }}</span>
        </div>
      </div>

      <div class="recipe-item__actions">
        <v-menu>
          <template #activator="{ props }">
            <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" />
          </template>
          <v-list>
            <v-list-item @click="$emit('view', item)">
              <template #prepend>
                <v-icon icon="mdi-eye" />
              </template>
              <v-list-item-title>View Details</v-list-item-title>
            </v-list-item>
            <v-list-item @click="$emit('edit', item)">
              <template #prepend>
                <v-icon icon="mdi-pencil" />
              </template>
              <v-list-item-title>Edit</v-list-item-title>
            </v-list-item>
            <v-list-item v-if="type === 'recipe'" @click="$emit('duplicate', item)">
              <template #prepend>
                <v-icon icon="mdi-content-copy" />
              </template>
              <v-list-item-title>Duplicate</v-list-item-title>
            </v-list-item>
            <v-list-item @click="$emit('calculate-cost', item)">
              <template #prepend>
                <v-icon icon="mdi-calculator" />
              </template>
              <v-list-item-title>Calculate Cost</v-list-item-title>
            </v-list-item>
            <v-divider />
            <v-list-item
              :class="{ 'text-error': item.isActive }"
              @click="$emit('toggle-status', item)"
            >
              <template #prepend>
                <v-icon :icon="item.isActive ? 'mdi-archive' : 'mdi-archive-remove'" />
              </template>
              <v-list-item-title>
                {{ item.isActive ? 'Archive' : 'Restore' }}
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PREPARATION_TYPES, RECIPE_CATEGORIES, DIFFICULTY_LEVELS } from '@/stores/recipes/types'
import type { Recipe, Preparation } from '@/stores/recipes/types'

interface Props {
  item: Recipe | Preparation
  type: 'recipe' | 'preparation'
  costCalculation?: any // CostCalculation from store
}

interface Emits {
  (e: 'view', item: Recipe | Preparation): void
  (e: 'edit', item: Recipe | Preparation): void
  (e: 'duplicate', item: Recipe | Preparation): void
  (e: 'calculate-cost', item: Recipe | Preparation): void
  (e: 'toggle-status', item: Recipe | Preparation): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

// Methods
function getCategoryColor(): string {
  if (props.type === 'preparation') {
    const prep = props.item as Preparation
    switch (prep.type) {
      case 'sauce':
        return 'red'
      case 'garnish':
        return 'green'
      case 'marinade':
        return 'blue'
      case 'semifinished':
        return 'orange'
      case 'seasoning':
        return 'purple'
      default:
        return 'grey'
    }
  } else {
    const recipe = props.item as Recipe
    switch (recipe.category) {
      case 'main_dish':
        return 'primary'
      case 'side_dish':
        return 'secondary'
      case 'dessert':
        return 'pink'
      case 'appetizer':
        return 'orange'
      case 'beverage':
        return 'blue'
      case 'sauce':
        return 'red'
      default:
        return 'grey'
    }
  }
}

function getCategoryText(): string {
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
  if (props.type === 'recipe') {
    const recipe = props.item as Recipe
    const level = DIFFICULTY_LEVELS.find(l => l.value === recipe.difficulty)
    return level?.color || 'grey'
  }
  return 'grey'
}

function getDifficultyText(): string {
  if (props.type === 'recipe') {
    const recipe = props.item as Recipe
    const level = DIFFICULTY_LEVELS.find(l => l.value === recipe.difficulty)
    return level?.text || recipe.difficulty
  }
  return ''
}

function getPreparationTime(): number {
  if (props.type === 'preparation') {
    return (props.item as Preparation).preparationTime
  } else {
    const recipe = props.item as Recipe
    return (recipe.prepTime || 0) + (recipe.cookTime || 0)
  }
}

function getTimeText(): string {
  if (props.type === 'preparation') {
    return `${(props.item as Preparation).preparationTime} min prep`
  } else {
    const recipe = props.item as Recipe
    const prep = recipe.prepTime || 0
    const cook = recipe.cookTime || 0

    if (prep && cook) {
      return `${prep}m prep + ${cook}m cook`
    } else if (prep) {
      return `${prep}m prep`
    } else if (cook) {
      return `${cook}m cook`
    }
    return ''
  }
}

function getCostValue(): number {
  if (props.costCalculation) {
    return props.costCalculation.totalCost || 0
  }

  if (props.type === 'preparation') {
    return (props.item as Preparation).costPerPortion || 0
  } else {
    return (props.item as Recipe).cost || 0
  }
}

function getCostUnit(): string {
  if (props.type === 'preparation') {
    return 'per batch'
  } else {
    return 'per portion'
  }
}

function getComponentsCount(): number {
  if (props.type === 'preparation') {
    return (props.item as Preparation).recipe?.length || 0
  } else {
    return (props.item as Recipe).components?.length || 0
  }
}

function getInstructionsPreview(): string {
  let instructions = ''

  if (props.type === 'preparation') {
    instructions = (props.item as Preparation).instructions || ''
  } else {
    const recipe = props.item as Recipe
    if (recipe.instructions && recipe.instructions.length > 0) {
      instructions = recipe.instructions[0].instruction
    }
  }

  if (!instructions) return ''

  const preview = instructions.slice(0, 80)
  return preview.length < instructions.length ? `${preview}...` : preview
}
</script>

<style lang="scss" scoped>
.recipe-item {
  background: var(--color-surface);
  border-radius: 8px;
  border: 1px solid var(--color-outline-variant);
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--color-primary);
    transform: translateX(2px);
  }

  &--inactive {
    opacity: 0.6;
    background: var(--color-surface-variant);
  }

  &__main {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 16px;
  }

  &__left {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__code {
    background: var(--color-primary);
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.75rem;
    font-weight: 600;
    min-width: 40px;
    text-align: center;
  }

  &__name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    flex: 1;
  }

  &__description {
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.4;
  }

  &__details {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 0.85rem;
    color: var(--text-secondary);
  }

  &__output,
  &__time,
  &__cost,
  &__components {
    display: flex;
    align-items: center;
  }

  &__output {
    color: var(--color-info);
    font-weight: 500;
  }

  &__cost {
    color: var(--color-success);
    font-weight: 500;
  }

  &__components {
    .components-label {
      color: var(--text-secondary);
      margin-right: 4px;
    }

    .components-count {
      color: var(--text-primary);
      font-weight: 500;
    }
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  }

  &__instructions {
    display: flex;
    align-items: flex-start;
    font-size: 0.85rem;

    .instructions-preview {
      color: var(--text-secondary);
      line-height: 1.3;
    }
  }

  &__actions {
    margin-left: 16px;
  }
}

// Responsive design
@media (max-width: 768px) {
  .recipe-item {
    &__main {
      flex-direction: column;
      gap: 12px;
    }

    &__actions {
      margin-left: 0;
      align-self: flex-end;
    }

    &__details {
      flex-direction: column;
      gap: 8px;
    }

    &__header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
  }
}
</style>
