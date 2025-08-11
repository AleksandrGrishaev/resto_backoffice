<!-- src/views/recipes/components/UnifiedViewDialog.vue - ИСПРАВЛЕНО -->
<template>
  <v-dialog v-model="dialogModel" max-width="900px" scrollable>
    <v-card v-if="item">
      <v-card-title class="text-h5 pa-4 d-flex justify-space-between align-center">
        <div>
          <div class="text-h5">{{ item.name }}</div>
          <div v-if="item.code" class="text-caption text-medium-emphasis">{{ item.code }}</div>
        </div>
        <div class="d-flex gap-2">
          <v-chip
            v-if="type === 'recipe'"
            :color="getDifficultyColor()"
            variant="tonal"
            size="small"
          >
            {{ getDifficultyText() }}
          </v-chip>
          <v-chip color="primary" variant="outlined" size="small">
            {{ getCategoryText() }}
          </v-chip>
          <v-chip v-if="!item.isActive" color="warning" variant="tonal" size="small">
            Archived
          </v-chip>
          <!-- ✅ НОВОЕ: Индикатор базовых единиц -->
          <v-chip v-if="hasBaseUnitsCalculation" color="success" variant="tonal" size="small">
            <v-icon icon="mdi-check-circle" size="12" class="mr-1" />
            Base Units
          </v-chip>
        </div>
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <div class="item-content">
          <!-- ✅ ИСПРАВЛЕНО: Item Info Header с правильными props -->
          <item-info-widget
            :item="item"
            :type="itemType"
            :cost-calculation="costCalculation"
            :calculating="calculating"
            @recalculate-cost="recalculateCost"
            @calculate-cost="calculateCost"
          />

          <v-divider />

          <!-- ✅ ИСПРАВЛЕНО: Components Section с правильными props -->
          <components-list-widget :item="item" :type="itemType" />

          <v-divider />

          <!-- ✅ ИСПРАВЛЕНО: Instructions Section с правильными props -->
          <instructions-widget :item="item" :type="itemType" />

          <!-- ✅ ИСПРАВЛЕНО: Cost Breakdown Section - показываем только если есть данные -->
          <cost-breakdown-widget
            v-if="
              costCalculation &&
              costCalculation.componentCosts &&
              costCalculation.componentCosts.length > 0
            "
            :cost-calculation="costCalculation"
            :type="itemType"
          />

          <!-- ✅ УЛУЧШЕНО: Debug информация в dev режиме -->
          <div v-if="showDebugInfo" class="debug-info pa-4">
            <v-divider class="mb-4" />
            <h4 class="text-subtitle-1 mb-2">🔧 Debug Info</h4>
            <v-card variant="outlined" class="pa-3">
              <div class="debug-section">
                <h5 class="text-subtitle-2 mb-2">Item Detection</h5>
                <pre class="text-caption">{{ debugInfo.itemDetection }}</pre>
              </div>
              <v-divider class="my-2" />
              <div class="debug-section">
                <h5 class="text-subtitle-2 mb-2">Cost Calculation</h5>
                <pre class="text-caption">{{ debugInfo.costInfo }}</pre>
              </div>
              <v-divider class="my-2" />
              <div class="debug-section">
                <h5 class="text-subtitle-2 mb-2">Base Units Status</h5>
                <pre class="text-caption">{{ debugInfo.baseUnitsInfo }}</pre>
              </div>
            </v-card>
          </div>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn
          v-if="!costCalculation"
          color="info"
          variant="outlined"
          prepend-icon="mdi-calculator"
          :loading="calculating"
          @click="calculateCost"
        >
          Calculate Cost
        </v-btn>
        <v-btn
          v-else
          color="primary"
          variant="outlined"
          prepend-icon="mdi-refresh"
          :loading="calculating"
          @click="recalculateCost"
        >
          Recalculate Cost
        </v-btn>

        <!-- ✅ НОВОЕ: Debug toggle в dev режиме -->
        <v-btn v-if="isDev" variant="text" size="small" @click="showDebugInfo = !showDebugInfo">
          {{ showDebugInfo ? 'Hide' : 'Show' }} Debug
        </v-btn>

        <v-spacer />
        <v-btn variant="text" @click="dialogModel = false">Close</v-btn>
        <v-btn color="primary" variant="outlined" prepend-icon="mdi-pencil" @click="editItem">
          Edit {{ type === 'preparation' ? 'Preparation' : 'Recipe' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRecipesStore } from '@/stores/recipes'
import { RECIPE_CATEGORIES, PREPARATION_TYPES, DIFFICULTY_LEVELS } from '@/stores/recipes/types'
import type {
  Recipe,
  Preparation,
  PreparationPlanCost,
  RecipePlanCost
} from '@/stores/recipes/types'
import { DebugUtils } from '@/utils'

// Import widgets
import ItemInfoWidget from './widgets/ItemInfoWidget.vue'
import ComponentsListWidget from './widgets/ComponentsListWidget.vue'
import InstructionsWidget from './widgets/InstructionsWidget.vue'
import CostBreakdownWidget from './widgets/CostBreakdownWidget.vue'

interface Props {
  modelValue: boolean
  type: 'recipe' | 'preparation'
  item?: Recipe | Preparation | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'edit', item: Recipe | Preparation): void
  (e: 'calculate-cost', item: Recipe | Preparation): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const store = useRecipesStore()
const costCalculation = ref<PreparationPlanCost | RecipePlanCost | null>(null)
const calculating = ref(false)

// ✅ УЛУЧШЕНО: Debug состояние
const showDebugInfo = ref(false)
const isDev = computed(() => import.meta.env.DEV)

// Dialog model
const dialogModel = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

// ✅ УЛУЧШЕНО: Более надежное определение типа элемента
const itemType = computed(() => {
  if (!props.item) return props.type

  // Проверяем наличие специфичных полей для определения типа
  if ('components' in props.item && Array.isArray(props.item.components)) {
    return 'recipe'
  }

  if ('recipe' in props.item && Array.isArray(props.item.recipe)) {
    return 'preparation'
  }

  // Проверяем по типу полей
  if ('portionSize' in props.item && 'category' in props.item) {
    return 'recipe'
  }

  if ('outputQuantity' in props.item && 'type' in props.item) {
    return 'preparation'
  }

  // Fallback на props.type
  return props.type
})

// ✅ НОВОЕ: Проверка использования базовых единиц
const hasBaseUnitsCalculation = computed(() => {
  if (!costCalculation.value) return false

  const note = costCalculation.value.note || ''
  return note.includes('base units') || note.includes('fixed calculation')
})

// ✅ УЛУЧШЕНО: Расширенная debug информация
const debugInfo = computed(() => {
  if (!props.item) return { itemDetection: 'No item', costInfo: 'N/A', baseUnitsInfo: 'N/A' }

  const itemDetection = {
    detectedType: itemType.value,
    propsType: props.type,
    hasComponents: 'components' in props.item,
    hasRecipe: 'recipe' in props.item,
    hasPortionSize: 'portionSize' in props.item,
    hasOutputQuantity: 'outputQuantity' in props.item,
    itemKeys: Object.keys(props.item).sort()
  }

  const costInfo = costCalculation.value
    ? {
        type: costCalculation.value.type,
        totalCost: `${costCalculation.value.totalCost} IDR`,
        componentCosts: costCalculation.value.componentCosts?.length || 0,
        calculatedAt: costCalculation.value.calculatedAt,
        note: costCalculation.value.note,
        hasBaseUnits: hasBaseUnitsCalculation.value
      }
    : {
        status: 'No cost calculation available'
      }

  const baseUnitsInfo =
    costCalculation.value?.componentCosts?.map(comp => ({
      component: comp.componentName,
      type: comp.componentType,
      unitCost: `${comp.planUnitCost} IDR`,
      totalCost: `${comp.totalPlanCost} IDR`,
      percentage: `${comp.percentage.toFixed(1)}%`
    })) || []

  return {
    itemDetection: JSON.stringify(itemDetection, null, 2),
    costInfo: JSON.stringify(costInfo, null, 2),
    baseUnitsInfo: JSON.stringify(baseUnitsInfo, null, 2)
  }
})

function getCategoryText(): string {
  if (!props.item) return ''

  if (itemType.value === 'preparation') {
    const prep = props.item as Preparation
    const category = PREPARATION_TYPES.find(c => c.value === prep.type)
    return category?.text || prep.type
  } else {
    const recipe = props.item as Recipe
    const category = RECIPE_CATEGORIES.find(c => c.value === recipe.category)
    return category?.text || recipe.category
  }
}

function getDifficultyColor(): string {
  if (itemType.value !== 'recipe' || !props.item) return 'grey'

  const recipe = props.item as Recipe
  const level = DIFFICULTY_LEVELS.find(l => l.value === recipe.difficulty)
  return level?.color || 'grey'
}

function getDifficultyText(): string {
  if (itemType.value !== 'recipe' || !props.item) return ''

  const recipe = props.item as Recipe
  const level = DIFFICULTY_LEVELS.find(l => l.value === recipe.difficulty)
  return level?.text || recipe.difficulty
}

async function calculateCost() {
  if (!props.item) return

  calculating.value = true
  try {
    DebugUtils.info('UnifiedViewDialog', `🧮 Calculating cost for ${itemType.value}`, {
      id: props.item.id,
      name: props.item.name
    })

    if (itemType.value === 'preparation') {
      const result = await store.calculatePreparationCost(props.item.id)
      costCalculation.value = result
      DebugUtils.info('UnifiedViewDialog', '✅ Preparation cost calculated', {
        totalCost: result.totalCost,
        costPerUnit: result.costPerOutputUnit,
        hasBaseUnits: hasBaseUnitsCalculation.value
      })
    } else {
      const result = await store.calculateRecipeCost(props.item.id)
      costCalculation.value = result
      DebugUtils.info('UnifiedViewDialog', '✅ Recipe cost calculated', {
        totalCost: result.totalCost,
        costPerPortion: result.costPerPortion,
        hasBaseUnits: hasBaseUnitsCalculation.value
      })
    }

    emit('calculate-cost', props.item)
  } catch (error) {
    DebugUtils.error('UnifiedViewDialog', '❌ Failed to calculate cost', { error })
    costCalculation.value = null
  } finally {
    calculating.value = false
  }
}

async function recalculateCost() {
  await calculateCost()
}

function editItem() {
  if (props.item) {
    emit('edit', props.item)
    dialogModel.value = false
  }
}

// ✅ ИСПРАВЛЕНО: Watch для загрузки cost calculation
watch(
  () => props.item,
  newItem => {
    if (newItem) {
      DebugUtils.info('UnifiedViewDialog', `📋 Item changed: ${newItem.name}`, {
        type: itemType.value,
        id: newItem.id
      })

      // Загружаем существующий cost calculation
      if (itemType.value === 'preparation') {
        costCalculation.value = store.getPreparationCostCalculation(newItem.id)
      } else {
        costCalculation.value = store.getRecipeCostCalculation(newItem.id)
      }

      DebugUtils.debug('UnifiedViewDialog', '💰 Cost calculation loaded', {
        hasCostCalculation: !!costCalculation.value,
        totalCost: costCalculation.value?.totalCost || 0,
        hasBaseUnits: hasBaseUnitsCalculation.value
      })
    } else {
      costCalculation.value = null
    }
  },
  { immediate: true }
)

// ✅ ИСПРАВЛЕНО: Watch для типа элемента
watch(
  () => itemType.value,
  newType => {
    DebugUtils.debug('UnifiedViewDialog', `🔄 Item type determined: ${newType}`)
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.item-content {
  // Clean styles without conflicts
}

.debug-info {
  background: #f5f5f5;
  border-top: 2px dashed #ddd;

  .debug-section {
    margin-bottom: 8px;

    h5 {
      color: var(--color-primary);
      margin-bottom: 4px;
    }

    pre {
      white-space: pre-wrap;
      word-break: break-word;
      max-height: 200px;
      overflow-y: auto;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 10px;
      line-height: 1.3;
      background: rgba(0, 0, 0, 0.05);
      padding: 8px;
      border-radius: 4px;
    }
  }
}

:deep(.dark) {
  .debug-info {
    background: #2a2a2a;
    border-top-color: #555;

    .debug-section pre {
      background: rgba(255, 255, 255, 0.05);
    }
  }
}
</style>
