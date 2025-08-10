<!-- src/views/recipes/components/widgets/CostBreakdownWidget.vue - УБРАЛИ ВЫДЕЛЕНИЕ -->
<template>
  <div class="cost-breakdown-section pa-4">
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
            :style="{
              width: `${componentCost.percentage}%`,
              backgroundColor: getComponentColor(componentCost.componentType)
            }"
            :title="`${getComponentName(componentCost.componentId, componentCost.componentType)}: ${componentCost.percentage.toFixed(1)}%`"
          />
        </div>
        <div class="cost-legend mt-2">
          <div class="legend-items">
            <div class="legend-item">
              <div class="legend-color" style="background-color: var(--color-blue)"></div>
              <span class="legend-text">Products</span>
            </div>
            <div class="legend-item">
              <div class="legend-color" style="background-color: var(--color-green)"></div>
              <span class="legend-text">Preparations</span>
            </div>
          </div>
          <span class="text-caption text-medium-emphasis">
            Cost distribution by component (hover bars for details)
          </span>
        </div>
      </v-card>
    </div>

    <!-- ✅ ИСПРАВЛЕНО: Убрали выделение самого дорогого компонента -->
    <div class="cost-breakdown-list">
      <v-card
        v-for="componentCost in sortedComponentCosts"
        :key="componentCost.componentId"
        variant="outlined"
        class="cost-item-card mb-2"
      >
        <v-card-text class="pa-3">
          <div class="d-flex justify-space-between align-center">
            <div class="component-cost-info">
              <div class="component-cost-name">
                <span class="component-name">
                  {{ getComponentName(componentCost.componentId, componentCost.componentType) }}
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
            <span class="analysis-value">${{ getAverageCostPerComponent().toFixed(2) }}</span>
          </div>
          <div class="analysis-item">
            <span class="analysis-label">Products vs Preparations:</span>
            <span class="analysis-value">
              {{ getProductVsPreparationRatio() }}
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import type { PreparationPlanCost, RecipePlanCost } from '@/stores/recipes/types'

interface Props {
  costCalculation: PreparationPlanCost | RecipePlanCost
  type: 'recipe' | 'preparation'
}

const props = defineProps<Props>()

const productsStore = useProductsStore()
const recipesStore = useRecipesStore()

// Sorted component costs для анализа
const sortedComponentCosts = computed(() => {
  return [...props.costCalculation.componentCosts].sort((a, b) => b.totalPlanCost - a.totalPlanCost)
})

function getComponentName(componentId: string, componentType: string): string {
  if (componentType === 'product') {
    const product = productsStore.products.find(p => p.id === componentId)
    return product?.name || 'Unknown product'
  } else {
    const preparation = recipesStore.preparations.find(p => p.id === componentId)
    return preparation?.name || 'Unknown preparation'
  }
}

function getComponentColor(componentType: string): string {
  return componentType === 'product' ? '#2196F3' : '#4CAF50' // Blue for products, Green for preparations
}

function getMostExpensiveComponent(): string {
  if (!sortedComponentCosts.value.length) return 'N/A'
  const most = sortedComponentCosts.value[0]
  return `${getComponentName(most.componentId, most.componentType)} ($${most.totalPlanCost.toFixed(2)})`
}

function getAverageCostPerComponent(): number {
  const total = props.costCalculation.componentCosts.reduce(
    (sum, comp) => sum + comp.totalPlanCost,
    0
  )
  return total / props.costCalculation.componentCosts.length
}

function getProductVsPreparationRatio(): string {
  const products = props.costCalculation.componentCosts.filter(c => c.componentType === 'product')
  const preparations = props.costCalculation.componentCosts.filter(
    c => c.componentType === 'preparation'
  )

  const productCost = products.reduce((sum, p) => sum + p.totalPlanCost, 0)
  const preparationCost = preparations.reduce((sum, p) => sum + p.totalPlanCost, 0)

  const productPercentage = ((productCost / props.costCalculation.totalCost) * 100).toFixed(1)
  const preparationPercentage = ((preparationCost / props.costCalculation.totalCost) * 100).toFixed(
    1
  )

  return `${productPercentage}% products, ${preparationPercentage}% preparations`
}
</script>

<style lang="scss" scoped>
// Cost Summary Chart
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
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.8;
      cursor: pointer;
    }
  }

  .cost-legend {
    .legend-items {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }

    .legend-text {
      font-size: 0.8rem;
      color: var(--color-text-secondary);
    }
  }
}

// ✅ ИСПРАВЛЕНО: Убрали специальные стили для "самого дорогого"
.cost-item-card {
  transition: all 0.2s ease;

  &:hover {
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
    text-align: right;
    max-width: 60%;
  }
}

// Responsive design
@media (max-width: 768px) {
  .component-cost-name {
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

  .analysis-value {
    max-width: 100%;
    text-align: left;
  }
}
</style>
