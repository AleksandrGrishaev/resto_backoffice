<!-- src/views/recipes/components/PreparationDialog.vue -->
<template>
  <v-dialog v-model="dialogModel" max-width="800px" persistent scrollable>
    <v-card>
      <v-card-title class="text-h5 pa-4">
        {{ isEditing ? 'Edit Preparation' : 'New Preparation' }}
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-form ref="form" v-model="formValid" @submit.prevent="handleSubmit">
          <v-row>
            <!-- Basic Information -->
            <v-col cols="12" md="8">
              <v-text-field
                v-model="formData.name"
                label="Preparation Name"
                :rules="[rules.required]"
                required
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.code"
                label="Code"
                placeholder="e.g. P-1, P-2"
                :rules="[rules.required, rules.codeFormat]"
                required
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

            <!-- Category and Output -->
            <v-col cols="12" md="4">
              <v-select
                v-model="formData.category"
                :items="preparationCategories"
                item-title="text"
                item-value="value"
                label="Category"
                :rules="[rules.required]"
                required
                variant="outlined"
                density="comfortable"
                @update:model-value="handleCategoryChange"
              />
            </v-col>

            <v-col cols="12" md="4">
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

            <v-col cols="12" md="4">
              <v-select
                v-model="formData.outputUnit"
                :items="unitItems"
                item-title="label"
                item-value="shortName"
                label="Output Unit"
                :rules="[rules.required]"
                required
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <!-- Time and Instructions -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.preparationTime"
                label="Preparation Time (minutes)"
                type="number"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <v-col cols="12" md="6">
              <!-- Оставляем пустым для баланса -->
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="formData.instructions"
                label="Instructions"
                rows="3"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <!-- Recipe Section (Products only) -->
            <v-col cols="12">
              <div class="recipe-section">
                <div class="d-flex justify-space-between align-center mb-4">
                  <h3 class="text-h6">Recipe (Products)</h3>
                  <v-btn
                    color="primary"
                    variant="outlined"
                    size="small"
                    prepend-icon="mdi-plus"
                    @click="addProduct"
                  >
                    Add Product
                  </v-btn>
                </div>

                <div
                  v-if="formData.recipe.length === 0"
                  class="text-center text-medium-emphasis py-4"
                >
                  No products added yet
                </div>

                <div v-else class="recipe-list">
                  <v-card
                    v-for="(ingredient, index) in formData.recipe"
                    :key="ingredient.id"
                    variant="outlined"
                    class="mb-2"
                  >
                    <v-card-text class="pa-3">
                      <v-row align="center">
                        <v-col cols="12" md="4">
                          <v-select
                            v-model="ingredient.id"
                            :items="productItems"
                            item-title="label"
                            item-value="id"
                            label="Product"
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
                            v-model="ingredient.notes"
                            label="Notes"
                            placeholder="e.g. finely chopped"
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
                            @click="removeProduct(index)"
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
import { useProductsStore } from '@/stores/productsStore' // Правильный путь
import { PREPARATION_CATEGORIES } from '@/stores/recipes/types'
import { generateId, DebugUtils } from '@/utils'
import type {
  Preparation,
  CreatePreparationData,
  PreparationIngredient,
  MeasurementUnit
} from '@/stores/recipes/types'

interface Props {
  modelValue: boolean
  preparation?: Preparation | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', preparation: Preparation): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const recipesStore = useRecipesStore()
const productsStore = useProductsStore() // Используем Products Store
const form = ref()
const formValid = ref(false)
const loading = ref(false)

// Dialog model
const dialogModel = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

// Form data
const formData = ref<CreatePreparationData & { recipe: PreparationIngredient[] }>({
  name: '',
  code: '',
  description: '',
  category: 'sauce',
  outputQuantity: 1,
  outputUnit: 'gram',
  preparationTime: 30,
  instructions: '',
  recipe: []
})

// Computed
const isEditing = computed(() => !!props.preparation)
const preparationCategories = PREPARATION_CATEGORIES

// Products instead of ingredients
const productItems = computed(() => {
  return productsStore.products
    .filter(product => product.isActive)
    .map(product => ({
      id: product.id,
      label: `${product.name} (${product.unit})`,
      value: product.id
    }))
})

const unitItems = computed(() => {
  return recipesStore.units.map(unit => ({
    shortName: unit.shortName,
    label: `${unit.name} (${unit.shortName})`,
    value: unit.shortName
  }))
})

// Validation rules
const rules = {
  required: (value: any) => !!value || 'Required field',
  positiveNumber: (value: number) => value > 0 || 'Must be greater than 0',
  codeFormat: (value: string) => {
    if (!value) return 'Required field'
    const pattern = /^P-\d+$/
    return pattern.test(value) || 'Code must be in format: P-NUMBER (e.g. P-1)'
  }
}

// Methods
function handleCodeInput(event: Event) {
  const input = event.target as HTMLInputElement
  formData.value.code = input.value.toUpperCase()
}

function handleCategoryChange(category: string) {
  // Auto-suggest code prefix
  if (!formData.value.code) {
    // Find next available number for preparations
    const existingCodes = recipesStore.activePreparations
      .map(prep => prep.code)
      .filter(code => code.startsWith('P-'))
      .map(code => parseInt(code.split('-')[1]))
      .filter(num => !isNaN(num))

    const nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1
    formData.value.code = `P-${nextNumber}`
  }
}

function addProduct() {
  formData.value.recipe.push({
    type: 'product',
    id: '',
    quantity: 0,
    unit: 'gram',
    notes: ''
  })
}

function removeProduct(index: number) {
  formData.value.recipe.splice(index, 1)
}

async function handleSubmit() {
  const isValid = await form.value?.validate()
  if (!isValid?.valid) return

  try {
    loading.value = true

    // Check if code already exists
    if (!isEditing.value || formData.value.code !== props.preparation?.code) {
      const existingPreparation = recipesStore.activePreparations.find(
        prep => prep.code === formData.value.code && prep.id !== props.preparation?.id
      )
      if (existingPreparation) {
        throw new Error(`Preparation with code ${formData.value.code} already exists`)
      }
    }

    if (isEditing.value && props.preparation) {
      // Update existing preparation
      const updatedPreparation = await recipesStore.updatePreparation(props.preparation.id, {
        ...formData.value,
        recipe: formData.value.recipe.filter(ing => ing.id && ing.quantity > 0)
      })
      emit('saved', updatedPreparation)
    } else {
      // Create new preparation
      const newPreparation = await recipesStore.createPreparation({
        ...formData.value,
        recipe: formData.value.recipe.filter(ing => ing.id && ing.quantity > 0)
      })
      emit('saved', newPreparation)
    }

    dialogModel.value = false
  } catch (error) {
    console.error('Failed to save preparation:', error)
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
    category: 'sauce',
    outputQuantity: 1,
    outputUnit: 'gram',
    preparationTime: 30,
    instructions: '',
    recipe: []
  }
  form.value?.resetValidation()
}

// Watch for dialog open/close
watch(dialogModel, async newVal => {
  if (newVal) {
    // Products уже должны быть загружены в RecipesView
    DebugUtils.info(
      'PreparationDialog',
      'Dialog opened, products count:',
      productsStore.products.length
    )

    if (props.preparation) {
      // Edit mode - populate form
      formData.value = {
        name: props.preparation.name,
        code: props.preparation.code,
        description: props.preparation.description || '',
        category: props.preparation.category,
        outputQuantity: props.preparation.outputQuantity,
        outputUnit: props.preparation.outputUnit,
        preparationTime: props.preparation.preparationTime,
        instructions: props.preparation.instructions,
        recipe: [...(props.preparation.recipe || [])]
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
.recipe-section {
  border: 1px solid var(--color-outline-variant);
  border-radius: 8px;
  padding: 16px;
  background: var(--color-surface-variant);
}

.recipe-list {
  max-height: 300px;
  overflow-y: auto;
}

:deep(.v-card-text) {
  max-height: 70vh;
  overflow-y: auto;
}
</style>
