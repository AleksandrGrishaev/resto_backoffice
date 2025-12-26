<!-- src/views/kitchen/calculator/components/ScaledIngredientsDisplay.vue -->
<template>
  <div class="scaled-ingredients-display">
    <!-- Header -->
    <div class="header">
      <h3 class="header-title">
        <v-icon size="24" class="mr-2">mdi-format-list-checkbox</v-icon>
        Ingredients
      </h3>
      <v-chip v-if="ingredients.length > 0" size="small" variant="tonal" color="primary">
        {{ ingredients.length }} items
      </v-chip>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <v-progress-circular indeterminate color="primary" size="24" />
      <span>Calculating...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="ingredients.length === 0" class="empty-state">
      <v-icon size="48" color="grey-darken-1">mdi-clipboard-text-outline</v-icon>
      <span class="empty-text">Enter quantity to see ingredients</span>
    </div>

    <!-- Ingredients List -->
    <div v-else class="ingredients-list">
      <!-- Products Section -->
      <div v-if="productIngredients.length > 0" class="ingredients-section">
        <div class="section-header">
          <v-icon size="18" color="success">mdi-package-variant-closed</v-icon>
          <span class="section-title">Products</span>
        </div>
        <div class="ingredients-items">
          <div
            v-for="ingredient in productIngredients"
            :key="ingredient.id"
            class="ingredient-item"
          >
            <span class="ingredient-name">{{ ingredient.name }}</span>
            <div class="ingredient-quantity">
              <span class="quantity-value">{{ ingredient.scaledQuantity }}</span>
              <span class="quantity-unit">{{ ingredient.displayUnit }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Preparations Section -->
      <div v-if="preparationIngredients.length > 0" class="ingredients-section">
        <div class="section-header">
          <v-icon size="18" color="warning">mdi-pot-steam</v-icon>
          <span class="section-title">Preparations</span>
        </div>
        <div class="ingredients-items">
          <div
            v-for="ingredient in preparationIngredients"
            :key="ingredient.id"
            class="ingredient-item preparation"
          >
            <span class="ingredient-name">{{ ingredient.name }}</span>
            <div class="ingredient-quantity">
              <span class="quantity-value">{{ ingredient.scaledQuantity }}</span>
              <span class="quantity-unit">{{ ingredient.displayUnit }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ScaledIngredient } from '../composables/useRecipeScaling'

// =============================================
// PROPS
// =============================================

interface Props {
  ingredients: ScaledIngredient[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// =============================================
// COMPUTED
// =============================================

/**
 * Filter product ingredients
 */
const productIngredients = computed(() => props.ingredients.filter(i => i.type === 'product'))

/**
 * Filter preparation ingredients
 */
const preparationIngredients = computed(() =>
  props.ingredients.filter(i => i.type === 'preparation')
)
</script>

<style scoped lang="scss">
.scaled-ingredients-display {
  display: flex;
  flex-direction: column;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  flex-shrink: 0;
}

.header-title {
  display: flex;
  align-items: center;
  font-size: var(--text-lg);
  font-weight: 600;
  margin: 0;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-xl);
  flex: 1;
  gap: var(--spacing-sm);
  color: rgba(var(--v-theme-on-surface), 0.5);
}

.empty-text {
  font-size: var(--text-base);
}

.ingredients-list {
  padding: var(--spacing-sm);
}

.ingredients-section {
  margin-bottom: var(--spacing-md);

  &:last-child {
    margin-bottom: 0;
  }
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  margin-bottom: var(--spacing-xs);
}

.section-title {
  font-size: var(--text-sm);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.ingredients-items {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.ingredient-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--spacing-md);
  background: rgba(var(--v-theme-success), 0.06);
  border-radius: 12px;
  border-left: 4px solid rgb(var(--v-theme-success));
  transition: transform 0.15s ease;

  &.preparation {
    background: rgba(var(--v-theme-warning), 0.06);
    border-left-color: rgb(var(--v-theme-warning));
  }
}

.ingredient-name {
  font-size: var(--text-lg);
  font-weight: 500;
  flex: 1;
  margin-right: var(--spacing-md);
}

.ingredient-quantity {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-xs);
  flex-shrink: 0;
}

.quantity-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}

.quantity-unit {
  font-size: var(--text-base);
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

/* Responsive - larger quantities for touch screens */
@media (max-width: 600px) {
  .ingredient-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-sm);
  }

  .ingredient-name {
    margin-right: 0;
  }

  .ingredient-quantity {
    align-self: flex-end;
  }

  .quantity-value {
    font-size: var(--text-3xl);
  }
}
</style>
