<!-- src/views/recipes/components/UnifiedRecipeDialog.vue -->
<template>
  <v-dialog v-model="dialogModel" max-width="900px" persistent scrollable>
    <v-card>
      <v-card-title class="text-h5 pa-4">
        {{ getDialogTitle() }}
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-form ref="form" v-model="formValid" @submit.prevent="handleSubmit">
          <v-row>
            <!-- Basic Information -->
            <v-col cols="12" md="8">
              <v-text-field
                v-model="formData.name"
                label="Name"
                :rules="[rules.required]"
                required
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.code"
                :label="type === 'preparation' ? 'Code (Required)' : 'Code (Optional)'"
                :placeholder="type === 'preparation' ? 'P-001' : 'R-001'"
                :rules="type === 'preparation' ? [rules.required, rules.codeFormat] : []"
                :required="type === 'preparation'"
                variant="outlined"
                density="comfortable"
                @input="handleCodeInput"
              />
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="formData.description"
                label="Description"
                rows="2"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <!-- Category/Type and Output/Portion -->
            <v-col cols="12" md="4">
              <v-select
                v-model="formData.category"
                :items="categoryItems"
                item-title="text"
                item-value="value"
                :label="type === 'preparation' ? 'Type' : 'Category'"
                :rules="[rules.required]"
                required
                variant="outlined"
                density="comfortable"
                @update:model-value="handleCategoryChange"
              />
            </v-col>

            <!-- Output for preparations / Portion for recipes -->
            <v-col v-if="type === 'preparation'" cols="12" md="4">
              <v-text-field
                v-model.number="formData.outputQuantity"
                label="Output Quantity"
                type="number"
                step="0.1"
                :rules="[rules.required, rules.positiveNumber]"
                required
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col v-if="type === 'preparation'" cols="12" md="4">
              <v-select
                v-model="formData.outputUnit"
                :items="unitItems"
                item-title="label"
                item-value="value"
                label="Output Unit"
                :rules="[rules.required]"
                required
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <!-- Portion for recipes -->
            <v-col v-if="type === 'recipe'" cols="12" md="4">
              <v-text-field
                v-model.number="formData.portionSize"
                label="Portion Size"
                type="number"
                :rules="[rules.required, rules.positiveNumber]"
                required
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col v-if="type === 'recipe'" cols="12" md="4">
              <v-text-field
                v-model="formData.portionUnit"
                label="Portion Unit"
                placeholder="portions, servings"
                :rules="[rules.required]"
                required
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <!-- Time fields -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.preparationTime"
                :label="type === 'preparation' ? 'Preparation Time (min)' : 'Prep Time (min)'"
                type="number"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col v-if="type === 'recipe'" cols="12" md="6">
              <v-text-field
                v-model.number="formData.cookTime"
                label="Cook Time (min)"
                type="number"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <!-- Difficulty for recipes only -->
            <v-col v-if="type === 'recipe'" cols="12" md="6">
              <v-select
                v-model="formData.difficulty"
                :items="difficultyLevels"
                item-title="text"
                item-value="value"
                label="Difficulty"
                :rules="[rules.required]"
                required
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <!-- Tags for recipes -->
            <v-col v-if="type === 'recipe'" cols="12">
              <v-combobox
                v-model="formData.tags"
                label="Tags"
                multiple
                chips
                clearable
                variant="outlined"
                density="comfortable"
                hint="Press Enter to add a tag"
              />
            </v-col>

            <!-- Instructions -->
            <v-col cols="12">
              <v-textarea
                v-model="formData.instructions"
                label="Instructions"
                rows="4"
                variant="outlined"
                density="comfortable"
                :hint="
                  type === 'preparation'
                    ? 'Step-by-step preparation instructions'
                    : 'Cooking instructions'
                "
              />
            </v-col>

            <!-- Components Section -->
            <v-col cols="12">
              <div class="components-section">
                <div class="d-flex justify-space-between align-center mb-4">
                  <h3 class="text-h6">
                    {{ type === 'preparation' ? 'Recipe (Products only)' : 'Components' }}
                  </h3>
                  <v-btn
                    color="primary"
                    variant="outlined"
                    size="small"
                    prepend-icon="mdi-plus"
                    @click="addComponent"
                  >
                    Add {{ type === 'preparation' ? 'Product' : 'Component' }}
                  </v-btn>
                </div>

                <div
                  v-if="formData.components.length === 0"
                  class="text-center text-medium-emphasis py-4"
                >
                  No {{ type === 'preparation' ? 'products' : 'components' }} added yet
                </div>

                <div v-else class="components-list">
                  <v-card
                    v-for="(component, index) in formData.components"
                    :key="component.id"
                    variant="outlined"
                    class="mb-2"
                  >
                    <v-card-text class="pa-3">
                      <v-row align="center">
                        <!-- Component Type (recipes only) -->
                        <v-col v-if="type === 'recipe'" cols="12" md="2">
                          <v-select
                            v-model="component.componentType"
                            :items="componentTypes"
                            item-title="text"
                            item-value="value"
                            label="Type"
                            variant="outlined"
                            density="compact"
                            :rules="[rules.required]"
                            required
                            @update:model-value="onComponentTypeChange(index, $event)"
                          />
                        </v-col>

                        <!-- Component Selection -->
                        <v-col cols="12" :md="type === 'recipe' ? 3 : 4">
                          <v-select
                            v-model="component.componentId"
                            :items="getComponentItems(component.componentType || 'product')"
                            item-title="label"
                            item-value="id"
                            :label="getComponentLabel(component.componentType || 'product')"
                            variant="outlined"
                            density="compact"
                            :rules="[rules.required]"
                            required
                          />
                        </v-col>

                        <!-- Quantity -->
                        <v-col cols="6" :md="type === 'recipe' ? 2 : 2">
                          <v-text-field
                            v-model.number="component.quantity"
                            label="Quantity"
                            type="number"
                            step="0.1"
                            variant="outlined"
                            density="compact"
                            :rules="[rules.required, rules.positiveNumber]"
                            required
                          />
                        </v-col>

                        <!-- Unit -->
                        <v-col cols="6" :md="type === 'recipe' ? 2 : 2">
                          <v-select
                            v-model="component.unit"
                            :items="unitItems"
                            item-title="label"
                            item-value="value"
                            label="Unit"
                            variant="outlined"
                            density="compact"
                            :rules="[rules.required]"
                            required
                          />
                        </v-col>

                        <!-- Notes -->
                        <v-col cols="12" :md="type === 'recipe' ? 2 : 3">
                          <v-text-field
                            v-model="component.notes"
                            label="Notes"
                            placeholder="diced, minced"
                            variant="outlined"
                            density="compact"
                          />
                        </v-col>

                        <!-- Delete button -->
                        <v-col cols="12" md="1">
                          <v-btn
                            icon="mdi-delete"
                            color="error"
                            variant="text"
                            size="small"
                            @click="removeComponent(index)"
                          />
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </div>
              </div>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="text" @click="handleCancel">Cancel</v-btn>
        <v-btn color="primary" :loading="loading" :disabled="!formValid" @click="handleSubmit">
          {{ isEditing ? 'Update' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRecipesStore } from '@/stores/recipes'
import { useProductsStore } from '@/stores/productsStore'
import { PREPARATION_TYPES, RECIPE_CATEGORIES, DIFFICULTY_LEVELS } from '@/stores/recipes/types'
import { useRecipeUnits } from '@/composables/useMeasurementUnits'
import { generateId, DebugUtils } from '@/utils'
import type {
  Recipe,
  Preparation,
  CreateRecipeData,
  CreatePreparationData,
  RecipeComponent,
  PreparationIngredient,
  MeasurementUnit
} from '@/stores/recipes/types'

interface Props {
  modelValue: boolean
  type: 'recipe' | 'preparation'
  item?: Recipe | Preparation | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', item: Recipe | Preparation): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const recipesStore = useRecipesStore()
const productsStore = useProductsStore()
const { unitOptions } = useRecipeUnits()
const form = ref()
const formValid = ref(false)
const loading = ref(false)

// Dialog model
const dialogModel = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

// Form data - универсальная структура
const formData = ref<any>({
  name: '',
  code: '',
  description: '',
  category: props.type === 'preparation' ? 'sauce' : 'main_dish',
  outputQuantity: 1,
  outputUnit: 'gram',
  portionSize: 1,
  portionUnit: 'portion',
  preparationTime: 30,
  cookTime: undefined,
  difficulty: 'easy',
  tags: [],
  instructions: '',
  components: []
})

// Computed
const isEditing = computed(() => !!props.item)

const categoryItems = computed(() => {
  return props.type === 'preparation' ? PREPARATION_TYPES : RECIPE_CATEGORIES
})

const difficultyLevels = DIFFICULTY_LEVELS

const componentTypes = [
  { value: 'product', text: 'Product' },
  { value: 'preparation', text: 'Preparation' }
]

const unitItems = computed(() => {
  return unitOptions.value.map(option => ({
    value: option.value,
    label: option.title
  }))
})

// Component items based on type
const productItems = computed(() => {
  return productsStore.products
    .filter(product => product.isActive)
    .map(product => ({
      id: product.id,
      label: `${product.name} (${product.unit})`
    }))
})

const preparationItems = computed(() => {
  return recipesStore.activePreparations.map(prep => ({
    id: prep.id,
    label: `${prep.code} - ${prep.name} (${prep.outputUnit})`
  }))
})

// Validation rules
const rules = {
  required: (value: any) => !!value || 'Required field',
  positiveNumber: (value: number) => value > 0 || 'Must be greater than 0',
  codeFormat: (value: string) => {
    if (!value) return 'Required field'
    const pattern = props.type === 'preparation' ? /^P-\d+$/ : /^R-\d+$/
    const prefix = props.type === 'preparation' ? 'P' : 'R'
    return pattern.test(value) || `Code must be in format: ${prefix}-NUMBER (e.g. ${prefix}-1)`
  }
}

// Methods
function getDialogTitle(): string {
  const itemType = props.type === 'preparation' ? 'Preparation' : 'Recipe'
  return isEditing.value ? `Edit ${itemType}` : `New ${itemType}`
}

function getComponentItems(componentType: string) {
  return componentType === 'product' ? productItems.value : preparationItems.value
}

function getComponentLabel(componentType: string): string {
  return componentType === 'product' ? 'Product' : 'Preparation'
}

function handleCodeInput(event: Event) {
  const input = event.target as HTMLInputElement
  formData.value.code = input.value.toUpperCase()
}

function handleCategoryChange(category: string) {
  // Auto-suggest code prefix for preparations
  if (props.type === 'preparation' && !formData.value.code) {
    const existingCodes = recipesStore.activePreparations
      .map(prep => prep.code)
      .filter(code => code.startsWith('P-'))
      .map(code => parseInt(code.split('-')[1]))
      .filter(num => !isNaN(num))

    const nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1
    formData.value.code = `P-${nextNumber}`
  }
}

function addComponent() {
  const newComponent = {
    id: generateId(),
    componentId: '',
    componentType: props.type === 'preparation' ? 'product' : 'product',
    quantity: 0,
    unit: 'gram' as MeasurementUnit,
    notes: ''
  }

  formData.value.components.push(newComponent)
}

function removeComponent(index: number) {
  formData.value.components.splice(index, 1)
}

function onComponentTypeChange(index: number, newType: string) {
  // Clear component selection when type changes
  formData.value.components[index].componentId = ''
}

async function handleSubmit() {
  const isValid = await form.value?.validate()
  if (!isValid?.valid) return

  try {
    loading.value = true

    // Filter valid components
    const validComponents = formData.value.components.filter(
      (comp: any) => comp.componentId && comp.quantity > 0
    )

    if (props.type === 'preparation') {
      // Handle preparation
      const preparationData: CreatePreparationData & { recipe: PreparationIngredient[] } = {
        name: formData.value.name,
        code: formData.value.code,
        type: formData.value.category,
        description: formData.value.description,
        outputQuantity: formData.value.outputQuantity,
        outputUnit: formData.value.outputUnit,
        preparationTime: formData.value.preparationTime,
        instructions: formData.value.instructions,
        recipe: validComponents.map((comp: any) => ({
          type: 'product' as const,
          id: comp.componentId,
          quantity: comp.quantity,
          unit: comp.unit,
          notes: comp.notes
        }))
      }

      let result: Preparation
      if (isEditing.value && props.item) {
        result = await recipesStore.updatePreparation(props.item.id, preparationData)
      } else {
        result = await recipesStore.createPreparation(preparationData)
      }
      emit('saved', result)
    } else {
      // Handle recipe
      const recipeData: CreateRecipeData & { components: RecipeComponent[] } = {
        name: formData.value.name,
        code: formData.value.code,
        description: formData.value.description,
        category: formData.value.category,
        portionSize: formData.value.portionSize,
        portionUnit: formData.value.portionUnit,
        prepTime: formData.value.preparationTime,
        cookTime: formData.value.cookTime,
        difficulty: formData.value.difficulty,
        tags: formData.value.tags,
        components: validComponents.map((comp: any) => ({
          id: comp.id,
          componentId: comp.componentId,
          componentType: comp.componentType,
          quantity: comp.quantity,
          unit: comp.unit,
          notes: comp.notes
        }))
      }

      let result: Recipe
      if (isEditing.value && props.item) {
        result = await recipesStore.updateRecipe(props.item.id, recipeData)
      } else {
        result = await recipesStore.createRecipe(recipeData)
        // Update with components
        if (recipeData.components.length > 0) {
          result = await recipesStore.updateRecipe(result.id, { components: recipeData.components })
        }
      }
      emit('saved', result)
    }

    dialogModel.value = false
  } catch (error) {
    console.error(`Failed to save ${props.type}:`, error)
  } finally {
    loading.value = false
  }
}

function handleCancel() {
  dialogModel.value = false
}

function resetForm() {
  formData.value = {
    name: '',
    code: '',
    description: '',
    category: props.type === 'preparation' ? 'sauce' : 'main_dish',
    outputQuantity: 1,
    outputUnit: 'gram',
    portionSize: 1,
    portionUnit: 'portion',
    preparationTime: 30,
    cookTime: undefined,
    difficulty: 'easy',
    tags: [],
    instructions: '',
    components: []
  }
  form.value?.resetValidation()
}

// Watch for dialog open/close
watch(dialogModel, async newVal => {
  if (newVal) {
    DebugUtils.info('UnifiedRecipeDialog', `Dialog opened for ${props.type}`)

    if (props.item) {
      // Edit mode - populate form
      if (props.type === 'preparation') {
        const prep = props.item as Preparation
        formData.value = {
          name: prep.name,
          code: prep.code,
          description: prep.description || '',
          category: prep.type,
          outputQuantity: prep.outputQuantity,
          outputUnit: prep.outputUnit,
          preparationTime: prep.preparationTime,
          instructions: prep.instructions,
          components: (prep.recipe || []).map(ingredient => ({
            id: generateId(),
            componentId: ingredient.id,
            componentType: 'product',
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            notes: ingredient.notes || ''
          }))
        }
      } else {
        const recipe = props.item as Recipe
        formData.value = {
          name: recipe.name,
          code: recipe.code || '',
          description: recipe.description || '',
          category: recipe.category,
          portionSize: recipe.portionSize,
          portionUnit: recipe.portionUnit,
          preparationTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          difficulty: recipe.difficulty,
          tags: recipe.tags || [],
          instructions: recipe.instructions?.[0]?.instruction || '',
          components: [...(recipe.components || [])]
        }
      }
    } else {
      // Create mode - reset form
      resetForm()
    }

    await nextTick()
    form.value?.resetValidation()
  }
})
</script>

<style lang="scss" scoped>
.components-section {
  border: 1px solid var(--color-outline-variant);
  border-radius: 8px;
  padding: 16px;
  background: var(--color-surface-variant);
}

.components-list {
  max-height: 300px;
  overflow-y: auto;
}

:deep(.v-card-text) {
  max-height: 70vh;
  overflow-y: auto;
}
</style>
