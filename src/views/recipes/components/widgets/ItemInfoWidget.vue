<!-- src/views/recipes/components/widgets/ItemInfoWidget.vue -->
<template>
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

      <v-col cols="12" md="6">
        <cost-info-widget
          :type="type"
          :cost-calculation="costCalculation"
          :calculating="calculating"
          @recalculate-cost="$emit('recalculate-cost')"
          @calculate-cost="$emit('calculate-cost')"
        />
      </v-col>
    </v-row>

    <div v-if="item.description" class="description-section mt-4">
      <h4 class="text-subtitle-1 mb-2">Description</h4>
      <p class="text-body-2">{{ item.description }}</p>
    </div>

    <!-- Tags for recipes -->
    <div v-if="type === 'recipe' && (item as Recipe).tags?.length" class="tags-section mt-4">
      <h4 class="text-subtitle-1 mb-2">Tags</h4>
      <div class="d-flex flex-wrap gap-2">
        <v-chip v-for="tag in (item as Recipe).tags" :key="tag" size="small" variant="outlined">
          {{ tag }}
        </v-chip>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  Recipe,
  Preparation,
  PreparationPlanCost,
  RecipePlanCost
} from '@/stores/recipes/types'
import CostInfoWidget from './CostInfoWidget.vue'

interface Props {
  item: Recipe | Preparation
  type: 'recipe' | 'preparation'
  costCalculation?: PreparationPlanCost | RecipePlanCost | null
  calculating?: boolean
}

interface Emits {
  (e: 'recalculate-cost'): void
  (e: 'calculate-cost'): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

// Methods for different types
function getOutputIcon(): string {
  return props.type === 'preparation' ? 'mdi-package-variant' : 'mdi-account-group'
}

function getOutputLabel(): string {
  return props.type === 'preparation' ? 'Output' : 'Portions'
}

function getOutputValue(): string {
  if (props.type === 'preparation') {
    const prep = props.item as Preparation
    return `${prep.outputQuantity} ${prep.outputUnit}`
  } else {
    const recipe = props.item as Recipe
    return `${recipe.portionSize} ${recipe.portionUnit}`
  }
}

function getPreparationTime(): number {
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
  if (props.type !== 'recipe') return null

  const recipe = props.item as Recipe
  const prep = recipe.prepTime || 0
  const cook = recipe.cookTime || 0
  return prep + cook > 0 ? prep + cook : null
}
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

.description-section {
  .text-body-2 {
    line-height: 1.5;
  }
}

.tags-section {
  .d-flex {
    gap: 8px;
  }
}

// Responsive design
@media (max-width: 768px) {
  .info-grid {
    gap: 12px;
  }
}
</style>
