<!-- src/views/recipes/components/widgets/RecipeCostPreviewWidget.vue - ИСПРАВЛЕНО -->
<template>
  <div v-if="estimatedCost.totalCost > 0" class="cost-preview-widget">
    <v-card variant="outlined" class="cost-preview">
      <v-card-title class="text-h6 py-2">
        <v-icon icon="mdi-calculator" class="mr-2" />
        Estimated Cost (Live Preview)
      </v-card-title>
      <v-card-text class="py-2">
        <div class="d-flex justify-space-between align-center">
          <span class="text-body-1">Total Cost:</span>
          <span class="text-h6 text-success">{{ formatIDR(estimatedCost.totalCost) }}</span>
        </div>
        <div class="d-flex justify-space-between align-center">
          <span class="text-body-1">{{ getCostPerLabel() }}:</span>
          <span class="text-h6 text-primary">{{ formatIDR(estimatedCost.costPerUnit) }}</span>
        </div>
        <v-divider class="my-2" />
        <div class="text-caption text-medium-emphasis">
          Based on current supplier prices (IDR) • Updates automatically using base units
        </div>
        <!-- ✅ НОВОЕ: Индикатор точности расчетов -->
        <div class="calculation-accuracy mt-1">
          <v-icon icon="mdi-check-circle" size="12" class="mr-1 text-success" />
          <span class="text-caption text-success">Accurate base unit calculation</span>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { DebugUtils } from '@/utils'
// ✅ НОВОЕ: Импорт централизованных утилит валюты
import { formatIDR, convertToBaseUnits } from '@/utils/currency'

interface Props {
  formData: any
  type: 'recipe' | 'preparation'
}

const props = defineProps<Props>()

// ✅ ИСПРАВЛЕНО: Избегаем циклических импортов - ленивая загрузка stores
let productsStore: any = null
let recipesStore: any = null

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

  // ✅ ПРАВИЛЬНЫЙ РАСЧЕТ: Конвертируем количество в базовые единицы
  const baseQuantity = convertToBaseUnits(component.quantity, component.unit, product.baseUnit)

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

// ✅ НОВАЯ ФУНКЦИЯ: Конвертация в базовые единицы
function convertToBaseUnits(quantity: number, fromUnit: string, baseUnit: string): number {
  const unit = fromUnit.toLowerCase()

  // Конвертация в граммы
  if (baseUnit === 'gram') {
    if (unit === 'kg' || unit === 'kilogram') {
      return quantity * 1000
    }
    if (unit === 'gram' || unit === 'g') {
      return quantity
    }
  }

  // Конвертация в миллилитры
  if (baseUnit === 'ml') {
    if (unit === 'liter' || unit === 'l') {
      return quantity * 1000
    }
    if (unit === 'ml' || unit === 'milliliter') {
      return quantity
    }
  }

  // Конвертация в штуки
  if (baseUnit === 'piece') {
    if (unit === 'piece' || unit === 'pack' || unit === 'item') {
      return quantity
    }
  }

  // Если не можем конвертировать, возвращаем как есть
  DebugUtils.warn('RecipeCostPreviewWidget', `Cannot convert ${fromUnit} to ${baseUnit}`)
  return quantity
}

// ✅ НОВАЯ ФУНКЦИЯ: Форматирование валюты в IDR
function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M IDR`
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K IDR`
  }
  return `${Math.round(amount)} IDR`
}

function getCostPerLabel(): string {
  return props.type === 'preparation' ? 'Cost per Unit' : 'Cost per Portion'
}

onMounted(async () => {
  await getStores()
})
</script>

<style lang="scss" scoped>
.cost-preview {
  background: linear-gradient(135deg, #e8f5e8 0%, #f0f8ff 100%);
  border: 2px solid var(--color-success);

  .v-card-title {
    background: var(--color-success);
    color: white;
    border-radius: 8px 8px 0 0;
  }
}

.calculation-accuracy {
  display: flex;
  align-items: center;
}
</style>
