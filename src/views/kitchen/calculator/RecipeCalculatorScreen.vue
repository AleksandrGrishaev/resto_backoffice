<!-- src/views/kitchen/calculator/RecipeCalculatorScreen.vue -->
<template>
  <div class="recipe-calculator-screen">
    <!-- Left Panel: Preparation Selector -->
    <div class="left-panel">
      <PreparationSelector
        :selected-id="selectedPreparationId"
        :loading="recipesStore.loading"
        @select="handlePreparationSelect"
      />
    </div>

    <!-- Right Panel: Calculator (scrollable) -->
    <div class="right-panel">
      <div class="right-panel-scroll">
        <!-- Input Section -->
        <div class="calculator-section input-section">
          <QuantityInput
            :preparation="selectedPreparation"
            :model-value="targetQuantity"
            :selected-unit="selectedUnit"
            @update:model-value="targetQuantity = $event"
            @update:selected-unit="handleUnitChange"
          />
        </div>

        <!-- Results Section -->
        <div class="calculator-section results-section">
          <ScaledIngredientsDisplay :ingredients="scaledIngredients" :loading="isCalculating" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRecipesStore } from '@/stores/recipes/recipesStore'
import {
  useRecipeScaling,
  type TargetUnit,
  type ScaledIngredient
} from './composables/useRecipeScaling'
import PreparationSelector from './components/PreparationSelector.vue'
import QuantityInput from './components/QuantityInput.vue'
import ScaledIngredientsDisplay from './components/ScaledIngredientsDisplay.vue'

// =============================================
// COMPOSABLES
// =============================================

const recipesStore = useRecipesStore()
const { scaleRecipe, getDefaultUnit } = useRecipeScaling()

// =============================================
// STATE
// =============================================

const selectedPreparationId = ref<string | null>(null)
const targetQuantity = ref<number>(0)
const selectedUnit = ref<TargetUnit>('gram')
const isCalculating = ref(false)

// =============================================
// COMPUTED
// =============================================

/**
 * Get selected preparation object
 */
const selectedPreparation = computed(() => {
  if (!selectedPreparationId.value) return null
  return recipesStore.getPreparationById(selectedPreparationId.value) || null
})

/**
 * Calculate scaled ingredients based on current inputs
 */
const scaledIngredients = computed((): ScaledIngredient[] => {
  if (!selectedPreparation.value || targetQuantity.value <= 0) {
    return []
  }

  const result = scaleRecipe(selectedPreparation.value, targetQuantity.value, selectedUnit.value)

  return result.success ? result.ingredients : []
})

// =============================================
// METHODS
// =============================================

/**
 * Handle preparation selection
 */
const handlePreparationSelect = (preparationId: string) => {
  selectedPreparationId.value = preparationId

  // Reset quantity when changing preparation
  targetQuantity.value = 0

  // Set default unit based on preparation type
  const prep = recipesStore.getPreparationById(preparationId)
  if (prep) {
    selectedUnit.value = getDefaultUnit(prep)
  }
}

/**
 * Handle unit change
 */
const handleUnitChange = (unit: TargetUnit) => {
  selectedUnit.value = unit
}

// =============================================
// WATCHERS
// =============================================

/**
 * Reset unit when preparation changes
 */
watch(selectedPreparation, newPrep => {
  if (newPrep) {
    selectedUnit.value = getDefaultUnit(newPrep)
  }
})
</script>

<style scoped lang="scss">
.recipe-calculator-screen {
  display: flex;
  height: 100%;
  overflow: hidden;
  background: rgb(var(--v-theme-background));
}

/* Left Panel */
.left-panel {
  width: 320px;
  min-width: 280px;
  max-width: 400px;
  height: 100%;
  border-right: 1px solid rgba(var(--v-border-color), 0.12);
  background: rgb(var(--v-theme-surface));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Right Panel */
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.right-panel-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.calculator-section {
  background: rgb(var(--v-theme-surface));
  border-radius: 0;
}

.input-section {
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  flex-shrink: 0;
}

.results-section {
  flex: 1;
  min-height: 0;
}

/* Scrollbar styling */
.right-panel-scroll::-webkit-scrollbar {
  width: 6px;
}

.right-panel-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.right-panel-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 3px;
}

.right-panel-scroll::-webkit-scrollbar-thumb:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.3);
}

/* Responsive Layout */
@media (max-width: 900px) {
  .recipe-calculator-screen {
    flex-direction: column;
  }

  .left-panel {
    width: 100%;
    max-width: 100%;
    height: auto;
    max-height: 40vh;
    border-right: none;
    border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  }

  .right-panel {
    flex: 1;
    min-height: 0;
  }
}

/* Mobile adjustments */
@media (max-width: 600px) {
  .left-panel {
    max-height: 35vh;
  }
}
</style>
