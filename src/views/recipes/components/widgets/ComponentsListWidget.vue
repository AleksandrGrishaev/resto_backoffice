<!-- src/views/recipes/components/widgets/ComponentsListWidget.vue -->
<template>
  <div class="components-section pa-4">
    <h3 class="text-h6 mb-3 d-flex align-center">
      <v-icon icon="mdi-food-apple" class="mr-2" />
      {{ getComponentsTitle() }} ({{ getComponentsCount() }})
    </h3>

    <div v-if="getComponentsCount() === 0" class="text-center text-medium-emphasis py-4">
      No {{ type === 'preparation' ? 'products' : 'components' }} specified
    </div>

    <div v-else class="components-list">
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
                  v-if="type === 'recipe' && component.type"
                  size="x-small"
                  :color="component.type === 'product' ? 'blue' : 'green'"
                  variant="tonal"
                  class="ml-2"
                >
                  {{ component.type }}
                </v-chip>
              </div>
              <div v-if="component.notes" class="component-notes">
                <v-icon icon="mdi-note-text" size="14" class="mr-1" />
                {{ component.notes }}
              </div>
            </div>
            <div class="component-quantity">
              <span class="quantity-value">{{ component.quantity }}</span>
              <span class="quantity-unit">{{ component.unit }}</span>
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
import type { Recipe, Preparation } from '@/stores/recipes/types'

interface Props {
  item: Recipe | Preparation
  type: 'recipe' | 'preparation'
}

const props = defineProps<Props>()

// ✅ ИСПРАВЛЕНО: Правильное получение stores
const productsStore = useProductsStore()
const recipesStore = useRecipesStore()

function getComponentsTitle(): string {
  return props.type === 'preparation' ? 'Recipe (Products)' : 'Components'
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
      // ✅ ИСПРАВЛЕНО: Используем правильный метод
      const product = productsStore.products.find(p => p.id === ingredient.id)
      return {
        id: ingredient.id,
        name: product?.name || 'Unknown product',
        code: '',
        type: 'product',
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        notes: ingredient.notes
      }
    })
  } else {
    const recipe = props.item as Recipe
    return (recipe.components || []).map(component => {
      let name = 'Unknown'
      let code = ''

      if (component.componentType === 'product') {
        // ✅ ИСПРАВЛЕНО: Используем правильный метод
        const product = productsStore.products.find(p => p.id === component.componentId)
        name = product?.name || 'Unknown product'
      } else {
        // ✅ ИСПРАВЛЕНО: Используем правильный метод
        const preparation = recipesStore.preparations.find(p => p.id === component.componentId)
        name = preparation?.name || 'Unknown preparation'
        code = preparation?.code || ''
      }

      return {
        id: component.componentId,
        name,
        code,
        type: component.componentType,
        quantity: component.quantity,
        unit: component.unit,
        notes: component.notes
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
</style>
