<!-- src/views/recipes/components/widgets/CostInfoWidget.vue - ИСПРАВЛЕНО -->
<template>
  <div class="info-section">
    <div class="d-flex justify-space-between align-center mb-2">
      <h4 class="text-subtitle-1">Cost Information</h4>
      <v-btn
        size="small"
        variant="outlined"
        color="primary"
        prepend-icon="mdi-refresh"
        :loading="calculating"
        @click="$emit('recalculate-cost')"
      >
        Recalculate
      </v-btn>
    </div>

    <div v-if="costCalculation" class="cost-card">
      <div class="cost-summary">
        <div class="cost-item primary">
          <span class="cost-label">Total Cost:</span>
          <span class="cost-value">${{ safeTotalCost.toFixed(2) }}</span>
        </div>
        <div class="cost-item secondary">
          <span class="cost-label">{{ getCostPerLabel() }}:</span>
          <span class="cost-value">${{ safeCostPerValue.toFixed(2) }}</span>
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
      <v-icon icon="mdi-calculator-variant" size="24" class="mb-2 text-medium-emphasis" />
      <div class="text-body-2 text-medium-emphasis mb-2">No cost calculation available</div>
      <v-btn
        size="small"
        variant="outlined"
        color="primary"
        :loading="calculating"
        @click="$emit('calculate-cost')"
      >
        Calculate Cost
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PreparationPlanCost, RecipePlanCost } from '@/stores/recipes/types'

interface Props {
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

// ✅ ИСПРАВЛЕНО: Безопасное получение totalCost
const safeTotalCost = computed(() => {
  return props.costCalculation?.totalCost ?? 0
})

// ✅ ИСПРАВЛЕНО: Безопасное получение cost per value
const safeCostPerValue = computed(() => {
  if (!props.costCalculation) return 0

  if (props.type === 'preparation') {
    return (props.costCalculation as PreparationPlanCost).costPerOutputUnit ?? 0
  } else {
    return (props.costCalculation as RecipePlanCost).costPerPortion ?? 0
  }
})

function getCostPerLabel(): string {
  return props.type === 'preparation' ? 'Cost per Unit' : 'Cost per Portion'
}

function formatCalculationTime(date: Date | string): string {
  try {
    const calcDate = typeof date === 'string' ? new Date(date) : date

    if (!calcDate || isNaN(calcDate.getTime())) {
      return 'Unknown'
    }

    const now = new Date()
    const diff = now.getTime() - calcDate.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`

    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`

    return calcDate.toLocaleDateString()
  } catch (error) {
    console.warn('Error formatting calculation time:', error)
    return 'Unknown'
  }
}
</script>

<style lang="scss" scoped>
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

// Responsive design
@media (max-width: 768px) {
  .cost-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>
