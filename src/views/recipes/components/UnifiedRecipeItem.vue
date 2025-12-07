<!-- src/views/recipes/components/UnifiedRecipeItem.vue - УБРАНО Top components и Instructions -->
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
              Output: {{ getOutputDisplay(item as Preparation) }}
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

          <!-- Shelf Life (Preparations only) -->
          <div v-if="type === 'preparation' && getShelfLife()" class="recipe-item__shelf-life">
            <v-icon icon="mdi-calendar-clock" size="14" class="mr-1" />
            <span>Shelf life: {{ getShelfLife() }} days</span>
          </div>

          <!-- ✅ ИСПРАВЛЕНО: Enhanced Cost Display с IDR -->
          <div v-if="hasCostData" class="recipe-item__cost">
            <v-icon icon="mdi-currency-try" size="14" class="mr-1" />
            <div class="cost-display">
              <div class="cost-main">
                <span class="cost-value">{{ formatIDR(getTotalCost) }}</span>
                <span class="cost-unit">{{ getCostUnit() }}</span>
              </div>
              <div v-if="getCostPerUnit > 0" class="cost-per-unit">
                {{ formatIDR(getCostPerUnit) }} {{ getPerUnitLabel() }}
              </div>
            </div>
            <!-- Cost Status Indicator -->
            <v-chip size="x-small" :color="getCostStatusColor()" variant="tonal" class="ml-2">
              {{ getCostStatusText() }}
            </v-chip>
          </div>

          <!-- ✅ ИСПРАВЛЕНО: Cost Analysis для дорогих блюд -->
          <div v-if="isExpensive" class="recipe-item__cost-warning">
            <v-icon icon="mdi-alert-circle" size="14" class="mr-1 text-warning" />
            <span class="text-warning text-caption">
              High cost item ({{ formatIDR(getCostPerUnit) }} {{ getPerUnitLabel() }})
            </span>
          </div>

          <!-- Components count -->
          <div v-if="getComponentsCount() > 0" class="recipe-item__components">
            <v-icon icon="mdi-format-list-bulleted" size="14" class="mr-1" />
            <span class="components-label">Components:</span>
            <span class="components-count">{{ getComponentsCount() }}</span>
            <v-chip
              v-if="hasMissingCosts()"
              size="x-small"
              color="warning"
              variant="tonal"
              class="ml-1"
            >
              {{ getMissingCostsCount() }} uncalculated
            </v-chip>
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

        <!-- ✅ УБРАНО: Cost Breakdown Preview (Top components) -->
        <!-- ✅ УБРАНО: Instructions preview -->

        <!-- Last Updated Info -->
        <div v-if="getLastUpdated()" class="recipe-item__updated">
          <v-icon icon="mdi-update" size="12" class="mr-1" />
          <span class="text-caption text-medium-emphasis">Updated {{ getLastUpdated() }}</span>
        </div>
      </div>

      <div class="recipe-item__actions">
        <!-- Quick Cost Action -->
        <v-btn
          v-if="!hasCostData"
          icon="mdi-calculator"
          variant="text"
          size="small"
          color="primary"
          :title="`Calculate ${type} cost`"
          @click.stop="$emit('calculate-cost', item)"
        />

        <!-- Quick View Button -->
        <v-btn
          icon="mdi-eye"
          variant="text"
          size="small"
          color="info"
          title="Quick view"
          @click.stop="$emit('view', item)"
        />

        <!-- Main Actions Menu -->
        <v-menu>
          <template #activator="{ props: menuProps }">
            <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="menuProps" />
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
            <v-list-item @click="$emit('duplicate', item)">
              <template #prepend>
                <v-icon icon="mdi-content-copy" />
              </template>
              <v-list-item-title>Duplicate</v-list-item-title>
            </v-list-item>
            <v-divider />
            <v-list-item
              :class="{ 'text-success': hasCostData, 'text-primary': !hasCostData }"
              @click="$emit('calculate-cost', item)"
            >
              <template #prepend>
                <v-icon :icon="hasCostData ? 'mdi-refresh' : 'mdi-calculator'" />
              </template>
              <v-list-item-title>
                {{ hasCostData ? 'Recalculate Cost' : 'Calculate Cost' }}
              </v-list-item-title>
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
import { DIFFICULTY_LEVELS } from '@/stores/recipes/types'
import type {
  Recipe,
  Preparation,
  PreparationPlanCost,
  RecipePlanCost
} from '@/stores/recipes/types'
// ✅ НОВОЕ: Импорт централизованных утилит валюты
import { formatIDR, isExpensiveAmount } from '@/utils/currency'
// ✅ Import recipes store for preparation categories
import { useRecipesStore } from '@/stores/recipes'

interface Props {
  item: Recipe | Preparation
  type: 'recipe' | 'preparation'
  costCalculation?: PreparationPlanCost | RecipePlanCost | null
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

// ✅ Initialize recipes store
const recipesStore = useRecipesStore()

// Format output display based on portionType
function getOutputDisplay(prep: Preparation): string {
  if (prep.portionType === 'portion') {
    return prep.outputQuantity === 1 ? '1 portion' : `${prep.outputQuantity} portions`
  }
  return `${prep.outputQuantity} ${prep.outputUnit}`
}

const hasCostData = computed(() => {
  return !!props.costCalculation && props.costCalculation.totalCost > 0
})

const getTotalCost = computed(() => {
  return props.costCalculation?.totalCost || 0
})

const getCostPerUnit = computed(() => {
  if (!props.costCalculation) return 0

  if (props.type === 'preparation') {
    return (props.costCalculation as PreparationPlanCost).costPerOutputUnit
  } else {
    return (props.costCalculation as RecipePlanCost).costPerPortion
  }
})

// ✅ ИСПРАВЛЕНО: Используем централизованную функцию для определения дорогих блюд
const isExpensive = computed(() => {
  if (!hasCostData.value) return false
  return isExpensiveAmount(getCostPerUnit.value, props.type)
})

// ✅ УБРАНО: showCostBreakdown и getTopCostComponents - больше не нужны

// Existing methods
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
    // ✅ Use store getter instead of PREPARATION_TYPES constant
    return recipesStore.getPreparationCategoryName(prep.type)
  } else {
    const recipe = props.item as Recipe
    // ✅ Use store getter instead of RECIPE_CATEGORIES constant
    return recipesStore.getRecipeCategoryName(recipe.category)
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

function getCostUnit(): string {
  return 'total'
}

function getPerUnitLabel(): string {
  return props.type === 'preparation' ? 'per unit' : 'per portion'
}

function getCostStatusColor(): string {
  if (!hasCostData.value) return 'grey'

  const age = getCostAge()
  if (age < 60) return 'success'
  if (age < 1440) return 'warning'
  return 'error'
}

function getCostStatusText(): string {
  if (!hasCostData.value) return 'No cost'

  const age = getCostAge()
  if (age < 60) return 'Fresh'
  if (age < 1440) return 'Recent'
  return 'Stale'
}

function getCostAge(): number {
  if (!props.costCalculation) return 0

  const now = new Date()
  const calculated = new Date(props.costCalculation.calculatedAt)
  return Math.floor((now.getTime() - calculated.getTime()) / 60000)
}

function getComponentsCount(): number {
  if (props.type === 'preparation') {
    return (props.item as Preparation).recipe?.length || 0
  } else {
    return (props.item as Recipe).components?.length || 0
  }
}

function hasMissingCosts(): boolean {
  if (!props.costCalculation || !props.costCalculation.componentCosts) return false

  const totalComponents = getComponentsCount()
  const calculatedComponents = props.costCalculation.componentCosts.length

  return calculatedComponents < totalComponents
}

function getMissingCostsCount(): number {
  if (!props.costCalculation || !props.costCalculation.componentCosts) return getComponentsCount()

  const totalComponents = getComponentsCount()
  const calculatedComponents = props.costCalculation.componentCosts.length

  return Math.max(0, totalComponents - calculatedComponents)
}

// ✅ УБРАНО: getInstructionsPreview - больше не показываем инструкции

function getShelfLife(): number | null {
  if (props.type === 'preparation') {
    const prep = props.item as Preparation
    return prep.shelfLife || null
  }
  return null
}

function getLastUpdated(): string {
  const updatedAt = new Date(props.item.updatedAt)
  const now = new Date()
  const diff = now.getTime() - updatedAt.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`

  return updatedAt.toLocaleDateString()
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
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
  &__shelf-life,
  &__components {
    display: flex;
    align-items: center;
  }

  &__output {
    color: var(--color-info);
    font-weight: 500;
  }

  &__shelf-life {
    color: var(--color-secondary);
    font-weight: 500;
  }

  // ✅ ИСПРАВЛЕНО: Enhanced cost styling
  &__cost {
    display: flex;
    align-items: center;
    gap: 8px;

    .cost-display {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .cost-main {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .cost-value {
      color: var(--color-success);
      font-weight: 700;
      font-size: 1rem;
    }

    .cost-unit {
      color: var(--color-text-secondary);
      font-size: 0.75rem;
    }

    .cost-per-unit {
      color: var(--color-primary);
      font-size: 0.75rem;
      font-weight: 500;
    }
  }

  &__cost-warning {
    display: flex;
    align-items: center;
    color: var(--color-warning);
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

  &__updated {
    display: flex;
    align-items: center;
    font-size: 0.75rem;
  }

  &__actions {
    margin-left: 16px;
    display: flex;
    align-items: flex-start;
    gap: 4px;
  }
}

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

    &__cost {
      .cost-display {
        flex-direction: row;
        align-items: center;
        gap: 8px;
      }
    }
  }
}
</style>
