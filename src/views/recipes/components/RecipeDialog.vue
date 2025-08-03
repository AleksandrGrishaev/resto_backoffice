<!-- src/views/recipes/components/RecipeDialog.vue -->
<template>
  <v-dialog v-model="dialogModel" max-width="800px" persistent scrollable>
    <v-card>
      <v-card-title class="text-h5 pa-4">
        {{ isEditing ? 'Edit Recipe' : 'New Recipe' }}
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-form ref="form" v-model="formValid" @submit.prevent="handleSubmit">
          <v-row>
            <!-- Basic Information -->
            <v-col cols="12" md="8">
              <v-text-field
                v-model="formData.name"
                label="Recipe Name"
                :rules="[rules.required]"
                required
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.code"
                label="Code (Optional)"
                placeholder="e.g. P-3"
                variant="outlined"
                density="comfortable"
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

            <!-- Category and Difficulty -->
            <v-col cols="12" md="4">
              <v-select
                v-model="formData.category"
                :items="recipeCategories"
                item-title="text"
                item-value="value"
                label="Category"
                :rules="[rules.required]"
                required
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" md="4">
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

            <v-col cols="12" md="4">
              <div class="d-flex gap-2">
                <v-text-field
                  v-model.number="formData.portionSize"
                  label="Portion Size"
                  type="number"
                  :rules="[rules.required, rules.positiveNumber]"
                  required
                  variant="outlined"
                  density="comfortable"
                  class="flex-grow-1"
                />
                <v-text-field
                  v-model="formData.portionUnit"
                  label="Unit"
                  placeholder="gr, ml, portions"
                  :rules="[rules.required]"
                  required
                  variant="outlined"
                  density="comfortable"
                  style="max-width: 120px"
                />
              </div>
            </v-col>

            <!-- Time -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.prepTime"
                label="Prep Time (minutes)"
                type="number"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.cookTime"
                label="Cook Time (minutes)"
                type="number"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <!-- Tags -->
            <v-col cols="12">
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

            <!-- Ingredients Section -->
            <v-col cols="12">
              <div class="ingredients-section">
                <div class="d-flex justify-space-between align-center mb-4">
                  <h3 class="text-h6">Ingredients</h3>
                  <v-btn
                    color="primary"
                    variant="outlined"
                    size="small"
                    prepend-icon="mdi-plus"
                    @click="addIngredient"
                  >
                    Add Ingredient
                  </v-btn>
                </div>

                <div
                  v-if="formData.ingredients.length === 0"
                  class="text-center text-medium-emphasis py-4"
                >
                  No ingredients added yet
                </div>

                <div v-else class="ingredients-list">
                  <v-card
                    v-for="(ingredient, index) in formData.ingredients"
                    :key="ingredient.id"
                    variant="outlined"
                    class="mb-2"
                  >
                    <v-card-text class="pa-3">
                      <v-row align="center">
                        <v-col cols="12" md="4">
                          <v-select
                            v-model="ingredient.ingredientId"
                            :items="ingredientItems"
                            item-title="label"
                            item-value="id"
                            label="Ingredient"
                            variant="outlined"
                            density="compact"
                            :rules="[rules.required]"
                            required
                          />
                        </v-col>

                        <v-col cols="6" md="2">
                          <v-text-field
                            v-model.number="ingredient.quantity"
                            label="Quantity"
                            type="number"
                            step="0.1"
                            variant="outlined"
                            density="compact"
                            :rules="[rules.required, rules.positiveNumber]"
                            required
                          />
                        </v-col>

                        <v-col cols="6" md="2">
                          <v-select
                            v-model="ingredient.unit"
                            :items="unitItems"
                            item-title="label"
                            item-value="shortName"
                            label="Unit"
                            variant="outlined"
                            density="compact"
                            :rules="[rules.required]"
                            required
                          />
                        </v-col>

                        <v-col cols="12" md="3">
                          <v-text-field
                            v-model="ingredient.preparation"
                            label="Preparation"
                            placeholder="e.g. sliced, diced"
                            variant="outlined"
                            density="compact"
                          />
                        </v-col>

                        <v-col cols="12" md="1">
                          <v-btn
                            icon="mdi-delete"
                            color="error"
                            variant="text"
                            size="small"
                            @click="removeIngredient(index)"
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
import { generateId } from '@/utils'
import { RECIPE_CATEGORIES, DIFFICULTY_LEVELS } from '@/stores/recipes/types'
import type { Recipe, CreateRecipeData, RecipeIngredient } from '@/stores/recipes/types'

interface Props {
  modelValue: boolean
  recipe?: Recipe | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', recipe: Recipe): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const store = useRecipesStore()
const form = ref()
const formValid = ref(false)
const loading = ref(false)

// Dialog model
const dialogModel = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

// Form data
const formData = ref<CreateRecipeData & { ingredients: RecipeIngredient[] }>({
  name: '',
  code: '',
  description: '',
  category: 'main',
  portionSize: 1,
  portionUnit: 'portion',
  prepTime: undefined,
  cookTime: undefined,
  difficulty: 'easy',
  tags: [],
  ingredients: []
})

// Computed
const isEditing = computed(() => !!props.recipe)

const recipeCategories = RECIPE_CATEGORIES
const difficultyLevels = DIFFICULTY_LEVELS

const ingredientItems = computed(() => {
  return store.activeIngredients.map(ingredient => ({
    id: ingredient.id,
    label: `${ingredient.code} - ${ingredient.name}`,
    value: ingredient.id
  }))
})

const unitItems = computed(() => {
  return store.units.map(unit => ({
    shortName: unit.shortName,
    label: `${unit.name} (${unit.shortName})`,
    value: unit.shortName
  }))
})

// Validation rules
const rules = {
  required: (value: any) => !!value || 'Required field',
  positiveNumber: (value: number) => value > 0 || 'Must be greater than 0'
}

// Methods
function addIngredient() {
  formData.value.ingredients.push({
    id: generateId(),
    ingredientId: '',
    quantity: 0,
    unit: 'gr',
    preparation: '',
    isOptional: false
  })
}

function removeIngredient(index: number) {
  formData.value.ingredients.splice(index, 1)
}

async function handleSubmit() {
  const isValid = await form.value?.validate()
  if (!isValid?.valid) return

  try {
    loading.value = true

    if (isEditing.value && props.recipe) {
      // Update existing recipe
      const updatedRecipe = await store.updateRecipe(props.recipe.id, {
        ...formData.value,
        ingredients: formData.value.ingredients.filter(ing => ing.ingredientId && ing.quantity > 0)
      })
      emit('saved', updatedRecipe)
    } else {
      // Create new recipe
      const newRecipe = await store.createRecipe(formData.value)

      // Update with ingredients if any
      if (formData.value.ingredients.length > 0) {
        const validIngredients = formData.value.ingredients.filter(
          ing => ing.ingredientId && ing.quantity > 0
        )
        if (validIngredients.length > 0) {
          await store.updateRecipe(newRecipe.id, { ingredients: validIngredients })
        }
      }

      emit('saved', newRecipe)
    }

    dialogModel.value = false
  } catch (error) {
    console.error('Failed to save recipe:', error)
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
    category: 'main',
    portionSize: 1,
    portionUnit: 'portion',
    prepTime: undefined,
    cookTime: undefined,
    difficulty: 'easy',
    tags: [],
    ingredients: []
  }
  form.value?.resetValidation()
}

// Watch for dialog open/close
watch(dialogModel, async newVal => {
  if (newVal) {
    if (props.recipe) {
      // Edit mode - populate form
      formData.value = {
        name: props.recipe.name,
        code: props.recipe.code || '',
        description: props.recipe.description || '',
        category: props.recipe.category,
        portionSize: props.recipe.portionSize,
        portionUnit: props.recipe.portionUnit,
        prepTime: props.recipe.prepTime,
        cookTime: props.recipe.cookTime,
        difficulty: props.recipe.difficulty,
        tags: props.recipe.tags || [],
        ingredients: [...(props.recipe.ingredients || [])]
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
.ingredients-section {
  border: 1px solid var(--color-outline-variant);
  border-radius: 8px;
  padding: 16px;
  background: var(--color-surface-variant);
}

.ingredients-list {
  max-height: 300px;
  overflow-y: auto;
}

:deep(.v-card-text) {
  max-height: 70vh;
  overflow-y: auto;
}
</style>
