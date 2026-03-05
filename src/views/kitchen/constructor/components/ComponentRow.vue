<!-- src/views/kitchen/constructor/components/ComponentRow.vue -->
<template>
  <div class="component-row">
    <div class="comp-info">
      <v-chip :color="typeColor" size="x-small" variant="flat" label>
        {{ component.componentType }}
      </v-chip>
      <span class="comp-name">{{ componentName }}</span>
    </div>
    <div class="comp-controls">
      <v-text-field
        :model-value="component.quantity"
        type="number"
        variant="outlined"
        density="compact"
        hide-details
        class="qty-input"
        @update:model-value="emit('update:quantity', Number($event) || 0)"
      />
      <span class="comp-unit">{{ component.unit }}</span>
      <v-btn icon="mdi-close" size="x-small" variant="text" @click="emit('remove')" />
    </div>
    <div v-if="costDisplay" class="comp-cost">{{ costDisplay }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { formatIDR } from '@/utils'
import type { RecipeComponent } from '@/stores/recipes/types'
import type { Product } from '@/stores/productsStore/types'
import type { Preparation } from '@/stores/recipes/types'

const props = defineProps<{
  component: RecipeComponent
}>()

const emit = defineEmits<{
  'update:quantity': [value: number]
  remove: []
}>()

const productsStore = useProductsStore()
const recipesStore = useRecipesStore()

const componentName = computed(() => {
  if (props.component.componentType === 'product') {
    return (
      productsStore.products.find((p: Product) => p.id === props.component.componentId)?.name ||
      props.component.componentId
    )
  }
  if (props.component.componentType === 'preparation') {
    return (
      (recipesStore.preparations as Preparation[]).find(p => p.id === props.component.componentId)
        ?.name || props.component.componentId
    )
  }
  return props.component.componentId
})

const typeColor = computed(() => {
  switch (props.component.componentType) {
    case 'product':
      return 'blue'
    case 'preparation':
      return 'orange'
    case 'recipe':
      return 'green'
    default:
      return 'grey'
  }
})

const costDisplay = computed(() => {
  let costPerUnit = 0
  if (props.component.componentType === 'product') {
    costPerUnit =
      productsStore.products.find((p: Product) => p.id === props.component.componentId)
        ?.baseCostPerUnit ?? 0
  } else if (props.component.componentType === 'preparation') {
    costPerUnit =
      (recipesStore.preparations as Preparation[]).find(p => p.id === props.component.componentId)
        ?.costPerPortion ?? 0
  }
  const cost = costPerUnit * props.component.quantity
  return cost > 0 ? formatIDR(cost) : null
})
</script>

<style scoped lang="scss">
.component-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

.comp-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.comp-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.comp-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.qty-input {
  max-width: 80px;

  :deep(.v-field) {
    min-height: 32px;
  }
}

.comp-unit {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  min-width: 30px;
}

.comp-cost {
  width: 100%;
  text-align: right;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}
</style>
