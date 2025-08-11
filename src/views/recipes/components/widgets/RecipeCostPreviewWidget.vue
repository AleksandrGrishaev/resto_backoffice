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
              <div class="cost-label">Total Cost</div>
              <div class="cost-value cost-value--success">
                {{ formatIDR(estimatedCost.totalCost) }}
              </div>
            </div>
          </v-col>
          <v-col cols="6">
            <div class="cost-item">
              <div class="cost-label">{{ getCostPerLabel() }}</div>
              <div class="cost-value cost-value--primary">
                {{ formatIDR(estimatedCost.costPerUnit) }}
              </div>
            </div>
          </v-col>
        </v-row>

        <!-- Info -->
        <div class="cost-info mt-3">
          <v-icon icon="mdi-information-outline" size="14" class="mr-1" />
          <span class="text-caption text-medium-emphasis">
            Updates automatically using base unit prices
          </span>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { DebugUtils } from '@/utils'
// ✅ ИСПРАВЛЕНО: Используем правильные импорты
import { formatIDR } from '@/utils/currency'
import { useMeasurementUnits } from '@/composables/useMeasurementUnits'

interface Props {
  formData: any
  type: 'recipe' | 'preparation'
}

const props = defineProps<Props>()

// ✅ ИСПРАВЛЕНО: Избегаем циклических импортов - ленивая загрузка stores
let productsStore: any = null
let recipesStore: any = null

const { convertUnits, areUnitsCompatible } = useMeasurementUnits()

async function getStores() {
  if (!productsStore) {
    const { useProductsStore } = await import('@/stores/productsStore')
    productsStore = useProductsStore()
  }
  if (!recipesStore) {
    const { useRecipesStore } = await import('@/stores/recipes')
    recipesStore = useRecipesStore()
  }
  return { productsStore, recipesStore }
}

// ✅ ИСПРАВЛЕНО: Правильный расчет стоимости с базовыми единицами
const estimatedCost = computed(() => {
  let totalCost = 0
  let costPerUnit = 0

  try {
    for (const component of props.formData.components || []) {
      if (!component.componentId || !component.quantity || component.quantity <= 0) continue

      if (component.componentType === 'product') {
        // ✅ ИСПРАВЛЕНО: Используем правильный метод для получения продукта
        const product = productsStore?.getProductForRecipe?.(component.componentId)
        if (product && product.isActive) {
          // ✅ ГЛАВНОЕ ИСПРАВЛЕНИЕ: Используем базовые единицы для точного расчета
          const componentCost = calculateProductCost(component, product)
          totalCost += componentCost
        }
      } else if (component.componentType === 'preparation') {
        const prepCost = recipesStore?.getPreparationCostCalculation?.(component.componentId)
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

  // ✅ ПРАВИЛЬНЫЙ РАСЧЕТ: Умножаем на цену за базовую единицу
  const componentCost = baseQuantity * product.baseCostPerUnit

  DebugUtils.debug('RecipeCostPreviewWidget', 'Product cost calculation', {
    productName: product.name,
    componentQuantity: component.quantity,
    componentUnit: component.unit,
    baseQuantity,
    baseUnit: product.baseUnit,
    baseCostPerUnit: product.baseCostPerUnit,
    totalCost: componentCost
  })

  return componentCost
}

function getCostPerLabel(): string {
  return props.type === 'preparation' ? 'Cost per Unit' : 'Cost per Portion'
}

onMounted(async () => {
  await getStores()
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
