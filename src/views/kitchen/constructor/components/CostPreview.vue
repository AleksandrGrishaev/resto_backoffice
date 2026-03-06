<!-- src/views/kitchen/constructor/components/CostPreview.vue -->
<template>
  <div v-if="ingredients.length > 0" class="cost-preview">
    <div class="cost-row">
      <span class="cost-label">Base cost:</span>
      <span class="cost-value">{{ formatIDR(baseCost) }} / portion</span>
    </div>
    <div class="cost-row">
      <span class="cost-label">Rec. price (35%):</span>
      <span class="cost-value highlight">{{ formatIDR(recommendedPrice) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { formatIDR } from '@/utils'
import type { RecipeComponent, Preparation } from '@/stores/recipes/types'
import type { Product } from '@/stores/productsStore/types'

const props = defineProps<{
  ingredients: RecipeComponent[]
}>()

const productsStore = useProductsStore()
const recipesStore = useRecipesStore()

const baseCost = computed(() => {
  let total = 0
  for (const ing of props.ingredients) {
    let costPerUnit = 0
    if (ing.componentType === 'product') {
      costPerUnit =
        productsStore.products.find((p: Product) => p.id === ing.componentId)?.baseCostPerUnit ?? 0
    } else if (ing.componentType === 'preparation') {
      costPerUnit =
        (recipesStore.preparations as Preparation[]).find(p => p.id === ing.componentId)
          ?.costPerPortion ?? 0
    }
    total += costPerUnit * ing.quantity
  }
  return total
})

const recommendedPrice = computed(() =>
  baseCost.value > 0 ? Math.round(baseCost.value / 0.35) : 0
)
</script>

<style scoped lang="scss">
.cost-preview {
  position: sticky;
  bottom: 0;
  padding: 12px 16px;
  background: rgba(var(--v-theme-surface-variant), 1);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.cost-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}

.cost-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
}

.cost-value {
  font-weight: 600;
}

.highlight {
  color: rgb(var(--v-theme-primary));
}
</style>
