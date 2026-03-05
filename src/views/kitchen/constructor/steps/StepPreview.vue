<!-- src/views/kitchen/constructor/steps/StepPreview.vue -->
<template>
  <div class="step-preview">
    <div class="preview-header">
      <h2>{{ wizardState.name }}</h2>
      <div class="preview-meta">
        <span>{{ wizardState.department }}</span>
        <span v-if="dishType">Type: {{ dishType }}</span>
      </div>
    </div>

    <!-- Base Ingredients -->
    <div class="preview-section">
      <h3>BASE INGREDIENTS</h3>
      <div v-for="ing in resolvedIngredients" :key="ing.id" class="preview-row">
        <span>{{ ing.name }}</span>
        <span class="dots" />
        <span>{{ ing.quantity }}{{ ing.unit }}</span>
        <span v-if="ing.cost" class="cost">{{ ing.costDisplay }}</span>
      </div>
    </div>

    <!-- Modifiers -->
    <div v-if="wizardState.modifierGroups.length > 0" class="preview-section">
      <h3>MODIFIERS</h3>
      <div v-for="group in wizardState.modifierGroups" :key="group.id" class="modifier-preview">
        <div class="modifier-group-name">
          {{ group.name }}
          <span v-if="group.isRequired">(required)</span>
        </div>
        <div v-for="option in group.options" :key="option.id" class="modifier-option">
          {{ option.name }}
          <span v-if="option.priceAdjustment">+{{ formatIDR(option.priceAdjustment) }}</span>
        </div>
      </div>
    </div>

    <!-- Cost Summary -->
    <div class="preview-section cost-summary">
      <h3>COST / RECOMMENDED PRICE</h3>
      <div class="cost-table">
        <div class="cost-row">
          <span>Base cost</span>
          <span>{{ formatIDR(totalBaseCost) }} / portion</span>
        </div>
        <div class="cost-row">
          <span>Rec. price (35% FC)</span>
          <span>{{ formatIDR(Math.round(totalBaseCost / 0.35)) }}</span>
        </div>
      </div>
    </div>

    <!-- Save Actions -->
    <div class="step-actions">
      <v-btn variant="outlined" size="large" @click="emit('back')">
        <v-icon start>mdi-arrow-left</v-icon>
        Back
      </v-btn>
      <v-spacer />
      <v-btn
        variant="outlined"
        size="large"
        :disabled="saving"
        :loading="saving"
        @click="emit('saveDraft')"
      >
        Save Draft
      </v-btn>
      <v-btn
        color="primary"
        size="large"
        :disabled="saving"
        :loading="saving"
        @click="emit('save')"
      >
        Save
        <v-icon end>mdi-check</v-icon>
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { formatIDR } from '@/utils'
import type { WizardState } from '../ConstructorScreen.vue'
import type { Product } from '@/stores/productsStore/types'
import type { Preparation } from '@/stores/recipes/types'

const props = defineProps<{
  wizardState: WizardState
  saving?: boolean
}>()

const emit = defineEmits<{
  back: []
  save: []
  saveDraft: []
}>()

const productsStore = useProductsStore()
const recipesStore = useRecipesStore()

const dishType = computed(() =>
  props.wizardState.modifierGroups.length > 0 ? 'Modifiable (auto-detected)' : 'Simple'
)

interface ResolvedIngredient {
  id: string
  name: string
  quantity: number
  unit: string
  cost: number
  costDisplay: string
}

const resolvedIngredients = computed<ResolvedIngredient[]>(() =>
  props.wizardState.ingredients.map(ing => {
    let name = ing.componentId
    let costPerUnit = 0

    if (ing.componentType === 'product') {
      const p = productsStore.products.find((p: Product) => p.id === ing.componentId)
      if (p) {
        name = p.name
        costPerUnit = p.baseCostPerUnit
      }
    } else if (ing.componentType === 'preparation') {
      const p = (recipesStore.preparations as Preparation[]).find(p => p.id === ing.componentId)
      if (p) {
        name = p.name
        costPerUnit = p.costPerPortion ?? 0
      }
    }

    const cost = costPerUnit * ing.quantity
    return {
      id: ing.id,
      name,
      quantity: ing.quantity,
      unit: ing.unit,
      cost,
      costDisplay: formatIDR(cost)
    }
  })
)

const totalBaseCost = computed(() => resolvedIngredients.value.reduce((sum, i) => sum + i.cost, 0))
</script>

<style scoped lang="scss">
.step-preview {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.preview-header {
  h2 {
    font-size: 1.3rem;
    font-weight: 700;
    text-transform: uppercase;
  }
}

.preview-meta {
  display: flex;
  gap: 12px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: capitalize;
}

.preview-section {
  h3 {
    font-size: 0.9rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 8px;
  }
}

.preview-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 4px 0;
}

.dots {
  flex: 1;
  border-bottom: 1px dotted rgba(255, 255, 255, 0.2);
  min-width: 20px;
  margin-bottom: 3px;
}

.cost {
  margin-left: 8px;
  color: rgba(255, 255, 255, 0.7);
}

.modifier-preview {
  padding: 8px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

.modifier-group-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.modifier-option {
  padding-left: 16px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
}

.cost-summary {
  background: rgba(255, 255, 255, 0.03);
  padding: 16px;
  border-radius: 12px;
}

.cost-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cost-row {
  display: flex;
  justify-content: space-between;
  font-weight: 500;
}

.step-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 16px;
}
</style>
