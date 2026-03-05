<!-- src/views/kitchen/constructor/components/InlineNewPreparation.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    fullscreen
    transition="dialog-bottom-transition"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card class="prep-wizard">
      <v-toolbar color="surface">
        <v-btn icon="mdi-close" @click="emit('update:modelValue', false)" />
        <v-toolbar-title>NEW PREPARATION</v-toolbar-title>
      </v-toolbar>

      <v-card-text class="prep-form">
        <v-text-field
          v-model="form.name"
          label="Name"
          variant="outlined"
          density="comfortable"
          hide-details
          class="mb-3"
        />

        <div class="output-row mb-3">
          <NumericInputField
            v-model="form.outputQuantity"
            label="Output"
            :allow-decimal="true"
            variant="outlined"
            density="comfortable"
            hide-details
            class="output-qty"
          />
          <v-select
            v-model="form.outputUnit"
            :items="['gram', 'ml']"
            label="Unit"
            variant="outlined"
            density="comfortable"
            hide-details
            class="output-unit"
          />
        </div>

        <v-select
          v-model="form.department"
          :items="['kitchen', 'bar']"
          label="Department"
          variant="outlined"
          density="comfortable"
          hide-details
          class="mb-3"
        />

        <!-- Gap #11: Add preparation category (required) -->
        <v-select
          v-model="form.type"
          :items="prepTypes"
          label="Type"
          variant="outlined"
          density="comfortable"
          hide-details
          class="mb-3"
        />

        <!-- Ingredients -->
        <div class="ingredients-section">
          <div class="section-header">
            <h3>INGREDIENTS</h3>
            <v-btn size="small" variant="outlined" @click="showSearch = true">
              <v-icon start>mdi-plus</v-icon>
              Add
            </v-btn>
          </div>

          <div v-if="form.ingredients.length === 0" class="empty-ingredients">
            No ingredients yet
          </div>

          <div v-for="(ing, idx) in form.ingredients" :key="idx" class="ingredient-row">
            <span class="ing-name">{{ getIngredientName(ing) }}</span>
            <NumericInputField
              v-model="ing.quantity"
              :allow-decimal="true"
              variant="outlined"
              density="compact"
              hide-details
              class="ing-qty"
            />
            <span class="ing-unit">{{ ing.unit }}</span>
            <v-btn
              icon="mdi-close"
              size="x-small"
              variant="text"
              @click="form.ingredients.splice(idx, 1)"
            />
          </div>
        </div>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-btn variant="text" @click="emit('update:modelValue', false)">Cancel</v-btn>
        <v-spacer />
        <v-btn
          color="primary"
          size="large"
          :disabled="!canSave"
          :loading="saving"
          @click="handleSave"
        >
          Save & Use
          <v-icon end>mdi-arrow-right</v-icon>
        </v-btn>
      </v-card-actions>

      <!-- Nested component search -->
      <ComponentSearch v-model="showSearch" @select="handleAddIngredient" />
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { NumericInputField } from '@/components/input'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { useSnackbar } from '@/composables/useSnackbar'
import type { RecipeComponent, Preparation } from '@/stores/recipes/types'
import type { Product } from '@/stores/productsStore/types'

// Lazy import to avoid circular dependency
const ComponentSearch = defineAsyncComponent(() => import('./ComponentSearch.vue'))

import { defineAsyncComponent } from 'vue'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  created: [prepId: string]
}>()

const productsStore = useProductsStore()
const recipesStore = useRecipesStore()

const prepTypes = ['sauce', 'base', 'garnish', 'marinade', 'dough', 'filling', 'other']

const form = reactive({
  name: '',
  outputQuantity: 1000,
  outputUnit: 'gram' as 'gram' | 'ml',
  department: 'kitchen' as 'kitchen' | 'bar',
  type: 'base',
  ingredients: [] as Array<{
    type: 'product' | 'preparation'
    id: string
    quantity: number
    unit: string
  }>
})

const showSearch = ref(false)
const saving = ref(false)

const canSave = computed(
  () => form.name.trim().length > 0 && form.outputQuantity > 0 && form.ingredients.length > 0
)

function getIngredientName(ing: { type: string; id: string }): string {
  if (ing.type === 'product') {
    return productsStore.products.find((p: Product) => p.id === ing.id)?.name || ing.id
  }
  return (recipesStore.preparations as Preparation[]).find(p => p.id === ing.id)?.name || ing.id
}

function handleAddIngredient(component: RecipeComponent) {
  form.ingredients.push({
    type: component.componentType as 'product' | 'preparation',
    id: component.componentId,
    quantity: component.quantity || 0,
    unit: component.unit
  })
  showSearch.value = false
}

async function handleSave() {
  saving.value = true
  try {
    const prepData = {
      name: form.name.trim(),
      code: '', // Auto-generated
      type: form.type,
      department: form.department,
      outputQuantity: form.outputQuantity,
      outputUnit: form.outputUnit,
      preparationTime: 0, // Gap #11: Default to 0
      instructions: '', // Gap #11: Optional, empty string
      recipe: form.ingredients
    }

    const result = await recipesStore.createPreparation(prepData)
    if (result?.id) {
      useSnackbar().showSuccess(`Preparation "${form.name}" created`)
      emit('created', result.id)
      // Reset form
      form.name = ''
      form.ingredients = []
    }
  } catch (error) {
    useSnackbar().showError('Failed to create preparation')
    console.error('Failed to create preparation:', error)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.prep-wizard {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.prep-form {
  flex: 1;
  overflow-y: auto;
}

.output-row {
  display: flex;
  gap: 12px;
}

.output-qty {
  flex: 2;
}

.output-unit {
  flex: 1;
}

.ingredients-section {
  margin-top: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  h3 {
    font-size: 0.95rem;
    font-weight: 600;
  }
}

.empty-ingredients {
  padding: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 8px;
}

.ingredient-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  margin-bottom: 4px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

.ing-name {
  flex: 1;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ing-qty {
  max-width: 80px;

  :deep(.v-field) {
    min-height: 32px;
  }
}

.ing-unit {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}
</style>
