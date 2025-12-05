<!-- src/views/recipes/components/widgets/CostBreakdownWidget.vue - ИСПРАВЛЕННАЯ ВЕРСИЯ -->
<template>
  <div class="cost-breakdown-section pa-4">
    <v-divider class="mb-4" />
    <div class="d-flex justify-space-between align-center mb-3">
      <h3 class="text-h6 d-flex align-center">
        <v-icon icon="mdi-calculator" class="mr-2" />
        Detailed Cost Breakdown
      </h3>
      <div class="d-flex align-center gap-2">
        <v-chip size="small" variant="tonal" color="info">
          {{ costCalculation.componentCosts.length }} components
        </v-chip>
        <v-chip size="small" variant="tonal" color="success">
          <v-icon icon="mdi-check-circle" size="12" class="mr-1" />
          Base Units (IDR)
        </v-chip>
      </div>
    </div>

    <v-alert
      type="info"
      variant="tonal"
      density="compact"
      class="mb-4"
      title="Cost Calculation Method"
    >
      <template #text>
        All costs calculated using
        <strong>base units</strong>
        (grams/ml/pieces) for accurate pricing. Currency:
        <strong>IDR (Indonesian Rupiah)</strong>
        - prices automatically converted from purchase units.
      </template>
    </v-alert>

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

    <!-- Компоненты с правильным форматированием валюты -->
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

              <!-- Правильный расчет с новым форматированием -->
              <div class="component-cost-details">
                <!-- ✅ NEW: Show yield percentage info if applicable -->
                <div
                  v-if="getYieldInfo(componentCost.componentId, componentCost.componentType)"
                  class="yield-info-box mb-2"
                >
                  <v-icon icon="mdi-information" size="14" class="mr-1" color="warning" />
                  <span class="text-caption">
                    <strong>Yield Adjustment:</strong>
                    {{
                      getYieldInfo(componentCost.componentId, componentCost.componentType)!
                        .yieldPercentage
                    }}% yield →
                    <strong>
                      {{
                        getYieldInfo(
                          componentCost.componentId,
                          componentCost.componentType
                        )!.adjustedQuantity.toFixed(1)
                      }}
                      {{ componentCost.unit }}
                    </strong>
                    gross needed (from
                    {{
                      getYieldInfo(componentCost.componentId, componentCost.componentType)!
                        .originalQuantity
                    }}
                    {{ componentCost.unit }} net)
                  </span>
                </div>

                <div class="cost-calculation-line">
                  <span class="text-caption">
                    <!-- ✅ FIX: Show adjusted quantity in formula if yield is applied -->
                    <strong>
                      {{
                        getYieldInfo(componentCost.componentId, componentCost.componentType)
                          ? getYieldInfo(
                              componentCost.componentId,
                              componentCost.componentType
                            )!.adjustedQuantity.toFixed(1)
                          : componentCost.quantity
                      }}
                      {{ componentCost.unit }}
                    </strong>
                    ×
                    <strong>
                      {{
                        formatIDRWithUnit(
                          componentCost.planUnitCost,
                          getActualBaseUnit(componentCost)
                        )
                      }}
                    </strong>
                    =
                    <strong>{{ formatIDR(componentCost.totalPlanCost) }}</strong>
                  </span>
                </div>

                <div v-if="needsUnitConversion(componentCost)" class="unit-conversion-info">
                  <v-icon icon="mdi-swap-horizontal" size="12" class="mr-1" />
                  <span class="text-caption text-success">
                    ≈ {{ getConvertedQuantity(componentCost) }}
                    {{ getActualBaseUnit(componentCost) }}
                    (converted from {{ componentCost.unit }})
                  </span>
                </div>
              </div>
            </div>

            <div class="cost-info">
              <div class="cost-value">{{ formatIDR(componentCost.totalPlanCost) }}</div>
              <div class="cost-percentage">{{ componentCost.percentage.toFixed(1) }}%</div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import type { PreparationPlanCost, RecipePlanCost, ComponentPlanCost } from '@/stores/recipes/types'
// ✅ ИСПРАВЛЕНО: Используем правильные импорты
import { formatIDR, formatIDRWithUnit } from '@/utils/currency'
import { useMeasurementUnits } from '@/composables/useMeasurementUnits'

interface Props {
  costCalculation: PreparationPlanCost | RecipePlanCost
  type: 'recipe' | 'preparation'
  item?: any // ✅ NEW: Item (preparation or recipe) to get yield info
}

const props = defineProps<Props>()

const productsStore = useProductsStore()
const recipesStore = useRecipesStore()
const { getUnitShortName } = useMeasurementUnits()

const sortedComponentCosts = computed(() => {
  return [...props.costCalculation.componentCosts].sort((a, b) => b.totalPlanCost - a.totalPlanCost)
})

/**
 * ✅ ИСПРАВЛЕНО: Получение базовой единицы с правильным импортом
 */
function getActualBaseUnit(component: ComponentPlanCost): string {
  if (component.componentType === 'product') {
    const product = productsStore.getProductForRecipe(component.componentId)
    if (product?.baseUnit) {
      return getUnitShortName(product.baseUnit as any)
    }
    if ((product as any)?.unit) {
      return getUnitShortName((product as any).unit as any)
    }
  }
  return 'unit'
}

function needsUnitConversion(component: ComponentPlanCost): boolean {
  const recipeUnit = component.unit.toLowerCase()
  const baseUnit = getActualBaseUnit(component).toLowerCase()

  const conversions = [
    { from: 'kg', to: 'g' },
    { from: 'liter', to: 'ml' },
    { from: 'pack', to: 'pcs' }
  ]

  return conversions.some(conv => recipeUnit === conv.from && baseUnit === conv.to)
}

function getConvertedQuantity(component: ComponentPlanCost): string {
  const unit = component.unit.toLowerCase()

  if (unit === 'kg') {
    return (component.quantity * 1000).toFixed(0)
  }

  if (unit === 'liter') {
    return (component.quantity * 1000).toFixed(0)
  }

  return component.quantity.toString()
}

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
  return componentType === 'product' ? '#2196F3' : '#4CAF50'
}

/**
 * ✅ NEW: Get yield percentage info for a component
 */
function getYieldInfo(
  componentId: string,
  componentType: string
): {
  useYield: boolean
  yieldPercentage: number
  adjustedQuantity: number
  originalQuantity: number
} | null {
  if (componentType !== 'product' || !props.item) {
    return null
  }

  // Find component in recipe/preparation
  let component: any = null
  if (props.type === 'preparation' && props.item.recipe) {
    component = props.item.recipe.find((c: any) => c.id === componentId)
  } else if (props.type === 'recipe' && props.item.components) {
    component = props.item.components.find((c: any) => c.componentId === componentId)
  }

  if (!component || !component.useYieldPercentage) {
    return null
  }

  // Get product to find yield percentage
  const product = productsStore.getProductForRecipe(componentId)
  if (!product || !product.yieldPercentage || product.yieldPercentage >= 100) {
    return null
  }

  // Calculate adjusted quantity
  const originalQuantity = component.quantity
  const adjustedQuantity = originalQuantity / (product.yieldPercentage / 100)

  return {
    useYield: true,
    yieldPercentage: product.yieldPercentage,
    adjustedQuantity,
    originalQuantity
  }
}
</script>

<style lang="scss" scoped>
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

  .cost-calculation-line {
    margin-bottom: 4px;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
  }

  .unit-conversion-info {
    display: flex;
    align-items: center;
    margin-top: 4px;
    padding: 2px 6px;
    background: rgba(76, 175, 80, 0.1);
    border-radius: 4px;
    border-left: 2px solid #4caf50;
  }

  .yield-info-box {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    background: rgba(255, 152, 0, 0.1);
    border-radius: 4px;
    border-left: 3px solid #ff9800;
  }
}

.cost-info {
  text-align: right;
  min-width: 120px;
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
}
</style>
