<!-- src/views/recipes/components/widgets/ComponentsListWidget.vue - С COLLAPSE КНОПКОЙ -->
<template>
  <div class="components-section pa-4">
    <div class="d-flex justify-space-between align-center mb-3">
      <h3 class="text-h6 d-flex align-center">
        <v-icon icon="mdi-food-apple" class="mr-2" />
        {{ getComponentsTitle() }} ({{ getComponentsCount() }})
      </h3>
      <v-btn
        v-if="getComponentsCount() > 0"
        variant="text"
        size="small"
        :prepend-icon="isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        @click="isExpanded = !isExpanded"
      >
        {{ isExpanded ? 'Collapse' : 'Expand' }}
      </v-btn>
    </div>

    <div v-if="getComponentsCount() === 0" class="text-center text-medium-emphasis py-4">
      No {{ type === 'preparation' ? 'products' : 'components' }} specified
    </div>

    <v-expand-transition>
      <div v-show="isExpanded" class="components-list">
        <v-card
          v-for="component in getComponents()"
          :key="component.id"
          variant="outlined"
          class="component-card mb-2"
        >
          <v-card-text class="pa-3">
            <div class="d-flex justify-space-between align-center">
              <div class="component-info">
                <div class="component-name">
                  <span v-if="component.code" class="component-code">
                    {{ component.code }}
                  </span>
                  <span class="component-title">
                    {{ component.name }}
                  </span>
                  <v-chip
                    v-if="component.type"
                    size="x-small"
                    :color="component.type === 'product' ? 'blue' : 'green'"
                    variant="tonal"
                    class="ml-2"
                  >
                    {{ component.type }}
                  </v-chip>
                </div>

                <!-- ✅ НОВОЕ: Показываем цену за базовую единицу -->
                <div v-if="component.baseCost" class="component-price">
                  <v-icon icon="mdi-currency-try" size="12" class="mr-1" />
                  <span class="price-text">
                    {{ formatCurrency(component.baseCost) }}/{{ component.baseUnit }}
                  </span>
                </div>

                <div v-if="component.notes" class="component-notes">
                  <v-icon icon="mdi-note-text" size="14" class="mr-1" />
                  {{ component.notes }}
                </div>
              </div>
              <div class="component-quantity">
                <span class="quantity-value">{{ component.quantity }}</span>
                <span class="quantity-unit">{{ component.unit }}</span>
                <!-- ✅ НОВОЕ: Показываем конвертацию если нужно -->
                <div v-if="component.convertedQuantity" class="converted-quantity">
                  ≈ {{ component.convertedQuantity }} {{ component.baseUnit }}
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>
    </v-expand-transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import type { Recipe, Preparation } from '@/stores/recipes/types'

interface Props {
  item: Recipe | Preparation
  type: 'recipe' | 'preparation'
}

const props = defineProps<Props>()

const productsStore = useProductsStore()
const recipesStore = useRecipesStore()

// ✅ Collapse state - expanded by default
const isExpanded = ref(true)

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

function getComponentsTitle(): string {
  return props.type === 'preparation' ? 'Recipe (Products & Preparations)' : 'Components'
}

function getComponentsCount(): number {
  if (props.type === 'preparation') {
    return (props.item as Preparation).recipe?.length || 0
  } else {
    return (props.item as Recipe).components?.length || 0
  }
}

function getComponents() {
  if (props.type === 'preparation') {
    const prep = props.item as Preparation
    return (prep.recipe || []).map(ingredient => {
      // ⭐ PHASE 1: Support nested preparations - check ingredient type
      const ingredientType = ingredient.type || 'product' // Default to product for backwards compatibility

      let name = 'Unknown'
      let code = ''
      let baseCost = null
      let baseUnit = null
      let convertedQuantity = null

      if (ingredientType === 'product') {
        // Look up product
        const product = productsStore.getProductForRecipe(ingredient.id)
        if (product) {
          name = product.name
          baseCost = product.baseCostPerUnit
          baseUnit = product.baseUnit

          // Конвертируем количество если нужно
          if (ingredient.unit.toLowerCase() === 'kg' && baseUnit === 'gram') {
            convertedQuantity = (ingredient.quantity * 1000).toFixed(0)
          } else if (ingredient.unit.toLowerCase() === 'liter' && baseUnit === 'ml') {
            convertedQuantity = (ingredient.quantity * 1000).toFixed(0)
          }
        } else {
          name = 'Unknown product'
        }
      } else if (ingredientType === 'preparation') {
        // Look up nested preparation
        const nestedPrep = recipesStore.preparations.find(p => p.id === ingredient.id)
        if (nestedPrep) {
          name = nestedPrep.name
          code = nestedPrep.code
          // ✅ FIX: Check portionType to determine correct unit
          if (nestedPrep.portionType === 'portion') {
            baseUnit = 'portion'
          } else {
            baseUnit = nestedPrep.outputUnit
          }
          // Cost per unit from preparation's calculated cost
          baseCost = nestedPrep.costPerPortion || null
        } else {
          name = 'Unknown preparation'
        }
      }

      // ✅ FIX: Determine display unit based on component's actual unit or preparation's portionType
      let displayUnit = ingredient.unit
      if (ingredientType === 'preparation') {
        const nestedPrep = recipesStore.preparations.find(p => p.id === ingredient.id)
        if (nestedPrep?.portionType === 'portion') {
          displayUnit = ingredient.quantity === 1 ? 'portion' : 'portions'
        }
      }

      return {
        id: ingredient.id,
        name,
        code,
        type: ingredientType,
        quantity: ingredient.quantity,
        unit: displayUnit,
        notes: ingredient.notes,
        baseCost,
        baseUnit,
        convertedQuantity
      }
    })
  } else {
    const recipe = props.item as Recipe
    return (recipe.components || []).map(component => {
      let name = 'Unknown'
      let code = ''
      let baseCost = null
      let baseUnit = null
      let convertedQuantity = null

      if (component.componentType === 'product') {
        const product = productsStore.getProductForRecipe(component.componentId)
        if (product) {
          name = product.name
          baseCost = product.baseCostPerUnit
          baseUnit = product.baseUnit

          // Конвертируем количество если нужно
          if (component.unit.toLowerCase() === 'kg' && baseUnit === 'gram') {
            convertedQuantity = (component.quantity * 1000).toFixed(0)
          } else if (component.unit.toLowerCase() === 'liter' && baseUnit === 'ml') {
            convertedQuantity = (component.quantity * 1000).toFixed(0)
          }
        }
      } else {
        const preparation = recipesStore.preparations.find(p => p.id === component.componentId)
        if (preparation) {
          name = preparation.name
          code = preparation.code
          // ✅ FIX: Check portionType to determine correct unit
          if (preparation.portionType === 'portion') {
            baseUnit = 'portion'
          } else {
            baseUnit = preparation.outputUnit
          }
        }
      }

      // ✅ FIX: Determine display unit based on component's actual unit or preparation's portionType
      let displayUnit = component.unit
      if (component.componentType === 'preparation') {
        const preparation = recipesStore.preparations.find(p => p.id === component.componentId)
        if (preparation?.portionType === 'portion') {
          displayUnit = component.quantity === 1 ? 'portion' : 'portions'
        }
      }

      return {
        id: component.componentId,
        name,
        code,
        type: component.componentType,
        quantity: component.quantity,
        unit: displayUnit,
        notes: component.notes,
        baseCost,
        baseUnit,
        convertedQuantity
      }
    })
  }
}
</script>

<style lang="scss" scoped>
.component-card {
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--color-primary);
    transform: translateX(2px);
  }
}

.component-info {
  flex: 1;
}

.component-name {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.component-code {
  background: var(--color-primary);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.7rem;
  font-weight: 600;
}

.component-title {
  font-weight: 600;
  color: var(--color-text-primary);
}

.component-price {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
  color: var(--color-success);
  font-size: 0.85rem;
  font-weight: 500;
}

.component-notes {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
}

.component-quantity {
  text-align: right;
  min-width: 80px;
}

.quantity-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-primary);
}

.quantity-unit {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-left: 2px;
}

.converted-quantity {
  font-size: 0.75rem;
  color: var(--color-success);
  margin-top: 2px;
  font-style: italic;
}
</style>
