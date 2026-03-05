<!-- src/views/kitchen/constructor/steps/StepComposition.vue -->
<template>
  <div class="step-composition">
    <!-- Base Ingredients Section -->
    <div class="section">
      <div class="section-header">
        <h3>BASE INGREDIENTS</h3>
        <v-btn size="small" variant="outlined" @click="showComponentSearch = true">
          <v-icon start>mdi-plus</v-icon>
          Add
        </v-btn>
      </div>

      <div v-if="ingredients.length === 0" class="empty-section">
        No ingredients yet. Tap "Add" to search.
      </div>

      <div v-else class="ingredients-list">
        <ComponentRow
          v-for="(ing, idx) in ingredients"
          :key="ing.id"
          :component="ing"
          @update:quantity="updateIngredientQuantity(idx, $event)"
          @update:unit="updateIngredientUnit(idx, $event)"
          @remove="removeIngredient(idx)"
        />
      </div>
    </div>

    <!-- Modifiers Section -->
    <div class="section">
      <div class="section-header">
        <h3>
          MODIFIERS
          <span class="optional-tag">(optional)</span>
        </h3>
        <v-btn size="small" variant="outlined" @click="addModifierGroup">
          <v-icon start>mdi-plus</v-icon>
          Add Group
        </v-btn>
      </div>

      <div v-if="modifierGroups.length === 0" class="empty-section">
        No modifiers. Dish will be "simple" type.
      </div>

      <ModifierGroupEditor
        v-for="(group, idx) in modifierGroups"
        :key="group.id"
        :group="group"
        @update="updateModifierGroup(idx, $event)"
        @remove="removeModifierGroup(idx)"
      />
    </div>

    <!-- Cost Preview (sticky) -->
    <CostPreview :ingredients="ingredients" />

    <!-- Navigation -->
    <div class="step-actions">
      <v-btn variant="outlined" size="large" @click="emit('back')">
        <v-icon start>mdi-arrow-left</v-icon>
        Back
      </v-btn>
      <v-spacer />
      <v-btn
        color="primary"
        size="large"
        :disabled="ingredients.length === 0"
        @click="emit('next')"
      >
        Next
        <v-icon end>mdi-arrow-right</v-icon>
      </v-btn>
    </div>

    <!-- Component Search Bottom Sheet -->
    <ComponentSearch v-model="showComponentSearch" @select="handleComponentSelect" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { RecipeComponent } from '@/stores/recipes/types'
import type { ModifierGroup } from '@/stores/menu/types'
import { createDefaultModifierGroup } from '@/stores/menu/types'
import ComponentRow from '../components/ComponentRow.vue'
import ComponentSearch from '../components/ComponentSearch.vue'
import ModifierGroupEditor from '../components/ModifierGroupEditor.vue'
import CostPreview from '../components/CostPreview.vue'

const props = defineProps<{
  ingredients: RecipeComponent[]
  modifierGroups: ModifierGroup[]
}>()

const emit = defineEmits<{
  'update:ingredients': [value: RecipeComponent[]]
  'update:modifierGroups': [value: ModifierGroup[]]
  back: []
  next: []
}>()

const showComponentSearch = ref(false)

function handleComponentSelect(component: RecipeComponent) {
  emit('update:ingredients', [...props.ingredients, component])
  showComponentSearch.value = false
}

function updateIngredientQuantity(idx: number, quantity: number) {
  const updated = [...props.ingredients]
  updated[idx] = { ...updated[idx], quantity }
  emit('update:ingredients', updated)
}

function updateIngredientUnit(idx: number, unit: string) {
  const updated = [...props.ingredients]
  updated[idx] = { ...updated[idx], unit: unit as any }
  emit('update:ingredients', updated)
}

function removeIngredient(idx: number) {
  const updated = props.ingredients.filter((_, i) => i !== idx)
  emit('update:ingredients', updated)
}

function addModifierGroup() {
  const newGroup = createDefaultModifierGroup()
  newGroup.name = 'New Group'
  emit('update:modifierGroups', [...props.modifierGroups, newGroup])
}

function updateModifierGroup(idx: number, group: ModifierGroup) {
  const updated = [...props.modifierGroups]
  updated[idx] = group
  emit('update:modifierGroups', updated)
}

function removeModifierGroup(idx: number) {
  const updated = props.modifierGroups.filter((_, i) => i !== idx)
  emit('update:modifierGroups', updated)
}
</script>

<style scoped lang="scss">
.step-composition {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  h3 {
    font-size: 0.95rem;
    font-weight: 600;
  }
}

.optional-tag {
  font-weight: 400;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
}

.empty-section {
  padding: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 8px;
}

.ingredients-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.step-actions {
  display: flex;
  align-items: center;
  padding-top: 16px;
}
</style>
