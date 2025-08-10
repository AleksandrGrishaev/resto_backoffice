<!-- src/views/recipes/components/widgets/RecipeCostPreviewWidget.vue -->
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
          <span class="text-h6 text-success">${{ estimatedCost.totalCost.toFixed(2) }}</span>
        </div>
        <div class="d-flex justify-space-between align-center">
          <span class="text-body-1">{{ getCostPerLabel() }}:</span>
          <span class="text-h6 text-primary">${{ estimatedCost.costPerUnit.toFixed(2) }}</span>
        </div>
        <v-divider class="my-2" />
        <div class="text-caption text-medium-emphasis">
          Based on current supplier prices • Updates automatically
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DebugUtils } from '@/utils'

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

// ✅ ИСПРАВЛЕНО: Безопасный расчет стоимости с обработкой ошибок
const estimatedCost = computed(() => {
  let totalCost = 0
  let costPerUnit = 0

  try {
    for (const component of props.formData.components || []) {
      if (!component.componentId || !component.quantity || component.quantity <= 0) continue

      if (component.componentType === 'product') {
        // ✅ ИСПРАВЛЕНО: Проверяем наличие store и метода
        const product = productsStore?.getProductById?.(component.componentId)
        if (product && product.isActive) {
          // Простая конвертация: предполагаем, что все в граммах/мл
          const componentCost = (product.costPerUnit * component.quantity) / 1000
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
    // Возвращаем безопасные значения при ошибке
    totalCost = 0
    costPerUnit = 0
  }

  return {
    totalCost,
    costPerUnit
  }
})

function getCostPerLabel(): string {
  return props.type === 'preparation' ? 'Cost per Unit' : 'Cost per Portion'
}

// ✅ ИСПРАВЛЕНО: Инициализация stores при монтировании
import { onMounted } from 'vue'

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
</style>
