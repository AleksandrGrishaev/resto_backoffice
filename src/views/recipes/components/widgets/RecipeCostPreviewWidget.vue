<!-- src/views/recipes/components/widgets/RecipeCostPreviewWidget.vue - ИСПРАВЛЕННАЯ ВЕРСИЯ -->
<template>
  <div v-if="estimatedCost.totalCost > 0" class="cost-preview-section">
    <v-card variant="outlined" class="cost-preview-card">
      <v-card-text class="pa-4">
        <!-- Header -->
        <div class="d-flex align-center mb-3">
          <v-icon icon="mdi-calculator" color="success" class="mr-2" />
          <span class="text-subtitle-1 font-weight-medium">Live Cost Preview</span>
          <v-spacer />
          <v-chip size="small" color="success" variant="tonal">
            <v-icon start size="12">mdi-check-circle</v-icon>
            Accurate
          </v-chip>
        </div>

        <!-- Cost Display -->
        <v-row class="cost-display">
          <v-col cols="6">
            <div class="cost-item">
              <div class="cost-label">Planned Cost</div>
              <div class="cost-value cost-value--success">
                {{ formatIDR(estimatedCost.totalCost) }}
              </div>
              <div class="cost-sublabel">from recipe</div>
            </div>
          </v-col>
          <v-col cols="6">
            <div class="cost-item">
              <div class="cost-label">{{ getCostPerLabel() }}</div>
              <div class="cost-value cost-value--primary">
                {{ formatIDR(estimatedCost.costPerUnit) }}
              </div>
              <div class="cost-sublabel">planned</div>
            </div>
          </v-col>
        </v-row>

        <!-- ✅ SPRINT 4: Actual Cost Display -->
        <v-row v-if="actualCost.loaded" class="cost-display mt-3">
          <v-col cols="6">
            <div class="cost-item cost-item--actual">
              <div class="cost-label">Actual Cost (FIFO)</div>
              <div class="cost-value cost-value--warning">
                {{ formatIDR(actualCost.totalCost) }}
              </div>
              <div class="cost-sublabel">from batches</div>
            </div>
          </v-col>
          <v-col cols="6">
            <div class="cost-item cost-item--variance">
              <div class="cost-label">Variance</div>
              <div class="cost-value" :class="varianceColorClass">
                {{ variance > 0 ? '+' : '' }}{{ variance.toFixed(1) }}%
              </div>
              <div class="cost-sublabel">{{ varianceLabel }}</div>
            </div>
          </v-col>
        </v-row>

        <!-- Info -->
        <div class="cost-info mt-3">
          <v-icon icon="mdi-information-outline" size="14" class="mr-1" />
          <span class="text-caption text-medium-emphasis">
            {{
              actualCost.loaded
                ? 'Planned cost from recipe, actual cost from FIFO batches'
                : 'Updates automatically using base unit prices'
            }}
          </span>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { DebugUtils } from '@/utils'
// ✅ ИСПРАВЛЕНО: Используем правильные импорты
import { formatIDR } from '@/utils/currency'
import { useMeasurementUnits } from '@/composables/useMeasurementUnits'
import {
  useCostCalculation,
  type CostCalculationMode
} from '@/stores/recipes/composables/useCostCalculation' // ✅ SPRINT 4

interface Props {
  formData: any
  type: 'recipe' | 'preparation'
}

const props = defineProps<Props>()

// ✅ ИСПРАВЛЕНО: Избегаем циклических импортов - ленивая загрузка stores
const productsStore = ref<any>(null)
const recipesStore = ref<any>(null)

const { convertUnits, areUnitsCompatible } = useMeasurementUnits()
const { calculateRecipeCost, calculatePreparationCost } = useCostCalculation() // ✅ SPRINT 4

// ✅ SPRINT 4: Actual cost state
const actualCost = ref({
  loaded: false,
  totalCost: 0,
  costPerUnit: 0
})

async function getStores() {
  if (!productsStore.value) {
    const { useProductsStore } = await import('@/stores/productsStore')
    productsStore.value = useProductsStore()
  }
  if (!recipesStore.value) {
    const { useRecipesStore } = await import('@/stores/recipes')
    recipesStore.value = useRecipesStore()
  }
  return { productsStore: productsStore.value, recipesStore: recipesStore.value }
}

// ✅ ИСПРАВЛЕНО: Правильный расчет стоимости с базовыми единицами
const estimatedCost = computed(() => {
  let totalCost = 0
  let costPerUnit = 0

  // ✅ FIX: Ensure stores are loaded
  if (!productsStore.value || !recipesStore.value) {
    DebugUtils.warn('RecipeCostPreviewWidget', 'Stores not loaded yet')
    return { totalCost: 0, costPerUnit: 0 }
  }

  try {
    for (const component of props.formData.components || []) {
      if (!component.componentId || !component.quantity || component.quantity <= 0) continue

      if (component.componentType === 'product') {
        // ✅ ИСПРАВЛЕНО: Используем правильный метод для получения продукта
        const product = productsStore.value?.getProductForRecipe?.(component.componentId)
        if (product && product.isActive) {
          // ✅ ГЛАВНОЕ ИСПРАВЛЕНИЕ: Используем базовые единицы для точного расчета
          const componentCost = calculateProductCost(component, product)
          totalCost += componentCost
        } else {
          DebugUtils.debug('RecipeCostPreviewWidget', 'Product not found or inactive', {
            componentId: component.componentId,
            product
          })
        }
      } else if (component.componentType === 'preparation') {
        const prepCost = recipesStore.value?.getPreparationCostCalculation?.(component.componentId)
        if (prepCost) {
          const componentCost = prepCost.costPerOutputUnit * component.quantity
          totalCost += componentCost
        }
      }
    }

    // Рассчитываем стоимость за единицу
    if (props.type === 'preparation' && props.formData.outputQuantity > 0) {
      costPerUnit = totalCost / props.formData.outputQuantity
    } else if (props.type === 'recipe' && props.formData.portionSize > 0) {
      costPerUnit = totalCost / props.formData.portionSize
    }
  } catch (error) {
    DebugUtils.warn('RecipeCostPreviewWidget', 'Error calculating estimated cost', { error })
    totalCost = 0
    costPerUnit = 0
  }

  return {
    totalCost,
    costPerUnit
  }
})

// ✅ НОВАЯ ФУНКЦИЯ: Правильный расчет стоимости продукта с базовыми единицами
function calculateProductCost(component: any, product: any): number {
  if (!product.baseCostPerUnit || !product.baseUnit) {
    // Fallback на старый метод если нет базовых единиц
    return ((product.costPerUnit || 0) * component.quantity) / 1000
  }

  // ✅ ПРАВИЛЬНЫЙ РАСЧЕТ: Проверяем совместимость единиц
  if (!areUnitsCompatible(component.unit, product.baseUnit)) {
    DebugUtils.warn(
      'RecipeCostPreviewWidget',
      `Unit mismatch: ${component.unit} vs ${product.baseUnit}`
    )
    return 0
  }

  // ✅ ПРАВИЛЬНЫЙ РАСЧЕТ: Конвертируем количество в базовые единицы
  let baseQuantity: number
  try {
    baseQuantity = convertUnits(component.quantity, component.unit, product.baseUnit)
  } catch (error) {
    DebugUtils.warn('RecipeCostPreviewWidget', 'Unit conversion failed', { error })
    return 0
  }

  // ✅ NEW: Apply yield percentage adjustment if enabled
  let adjustedQuantity = baseQuantity
  let yieldPercentage = 100
  if (component.useYieldPercentage && product.yieldPercentage) {
    yieldPercentage = product.yieldPercentage
    adjustedQuantity = baseQuantity / (yieldPercentage / 100)
  }

  // ✅ ПРАВИЛЬНЫЙ РАСЧЕТ: Умножаем на цену за базовую единицу
  const componentCost = adjustedQuantity * product.baseCostPerUnit

  DebugUtils.debug('RecipeCostPreviewWidget', 'Product cost calculation', {
    productName: product.name,
    componentQuantity: component.quantity,
    componentUnit: component.unit,
    baseQuantity,
    yieldPercentage,
    useYield: component.useYieldPercentage,
    adjustedQuantity,
    baseUnit: product.baseUnit,
    baseCostPerUnit: product.baseCostPerUnit,
    totalCost: componentCost
  })

  return componentCost
}

function getCostPerLabel(): string {
  return props.type === 'preparation' ? 'Cost per Unit' : 'Cost per Portion'
}

// ✅ SPRINT 4: Calculate actual cost from FIFO batches
async function loadActualCost() {
  try {
    await getStores()

    // Only calculate actual cost if we have an ID (existing recipe/preparation)
    if (!props.formData.id) {
      actualCost.value.loaded = false
      return
    }

    let result: any = null

    if (props.type === 'preparation') {
      const preparation = recipesStore.value?.preparations?.find(
        (p: any) => p.id === props.formData.id
      )
      if (!preparation) {
        actualCost.value.loaded = false
        return
      }

      result = await calculatePreparationCost(preparation, 'actual')
    } else if (props.type === 'recipe') {
      const recipe = recipesStore.value?.recipes?.find((r: any) => r.id === props.formData.id)
      if (!recipe) {
        actualCost.value.loaded = false
        return
      }

      result = await calculateRecipeCost(recipe, 'actual')
    }

    if (result && result.success && result.cost) {
      actualCost.value = {
        loaded: true,
        totalCost: result.cost.totalCost,
        costPerUnit: result.cost.costPerOutputUnit || result.cost.costPerPortion || 0
      }

      DebugUtils.info('RecipeCostPreviewWidget', 'Actual cost loaded', {
        type: props.type,
        plannedCost: estimatedCost.value.totalCost,
        actualCost: actualCost.value.totalCost,
        variance: variance.value
      })
    } else {
      actualCost.value.loaded = false
      DebugUtils.warn('RecipeCostPreviewWidget', 'Failed to load actual cost', { result })
    }
  } catch (error) {
    DebugUtils.error('RecipeCostPreviewWidget', 'Error loading actual cost', { error })
    actualCost.value.loaded = false
  }
}

// ✅ SPRINT 4: Calculate variance between planned and actual costs
const variance = computed(() => {
  if (!actualCost.value.loaded || estimatedCost.value.totalCost === 0) return 0
  return (
    ((actualCost.value.totalCost - estimatedCost.value.totalCost) / estimatedCost.value.totalCost) *
    100
  )
})

// ✅ SPRINT 4: Variance color class
const varianceColorClass = computed(() => {
  const v = variance.value
  if (v > 10) return 'cost-value--error'
  if (v < -10) return 'cost-value--success'
  return 'cost-value--info'
})

// ✅ SPRINT 4: Variance label
const varianceLabel = computed(() => {
  const v = variance.value
  if (v > 10) return 'over budget'
  if (v < -10) return 'under budget'
  return 'on target'
})

// ✅ SPRINT 4: Watch for changes to formData.id and reload actual cost
watch(
  () => props.formData.id,
  () => {
    loadActualCost()
  },
  { immediate: false }
)

onMounted(async () => {
  await getStores()
  // ✅ SPRINT 4: Load actual cost on mount
  await loadActualCost()
})
</script>

<style lang="scss" scoped>
.cost-preview-section {
  margin: 16px 0;
}

.cost-preview-card {
  border-left: 4px solid var(--v-theme-success);
  background: var(--v-theme-surface-variant);
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

.cost-display {
  .cost-item {
    text-align: center;
    padding: 8px;
    border-radius: 8px;
    background: var(--v-theme-surface);
    border: 1px solid var(--v-theme-outline-variant);

    .cost-label {
      font-size: 0.875rem;
      color: var(--v-theme-on-surface-variant);
      margin-bottom: 4px;
    }

    .cost-value {
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1;

      &.cost-value--success {
        color: #4caf50; // Material Green 500
      }

      &.cost-value--primary {
        color: #1976d2; // Material Blue 700
      }

      // ✅ SPRINT 4: Additional variance color classes
      &.cost-value--warning {
        color: #ff9800; // Material Orange 500
      }

      &.cost-value--error {
        color: #f44336; // Material Red 500
      }

      &.cost-value--info {
        color: #2196f3; // Material Blue 500
      }
    }

    // ✅ SPRINT 4: Cost sublabel style
    .cost-sublabel {
      font-size: 0.75rem;
      color: var(--v-theme-on-surface-variant);
      margin-top: 4px;
      opacity: 0.7;
    }

    // ✅ SPRINT 4: Actual cost item style
    &.cost-item--actual {
      border-color: #ff9800;
      background: rgba(255, 152, 0, 0.05);
    }

    // ✅ SPRINT 4: Variance item style
    &.cost-item--variance {
      border: 2px solid var(--v-theme-outline-variant);
      background: rgba(var(--v-theme-primary), 0.05);
    }
  }
}

.cost-info {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background: rgba(var(--v-theme-success), 0.1);
  border-radius: 6px;
  color: var(--v-theme-on-surface);
}

// Override any conflicting styles
:deep(.v-card-text) {
  background: transparent !important;
}
</style>
