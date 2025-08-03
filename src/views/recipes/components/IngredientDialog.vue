<!-- src/views/recipes/components/IngredientDialog.vue -->
<template>
  <v-dialog v-model="dialogModel" max-width="600px" persistent scrollable>
    <v-card>
      <v-card-title class="text-h5 pa-4">
        {{ isEditing ? 'Edit Ingredient' : 'New Ingredient' }}
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-form ref="form" v-model="formValid" @submit.prevent="handleSubmit">
          <v-row>
            <!-- Basic Information -->
            <v-col cols="12" md="8">
              <v-text-field
                v-model="formData.name"
                label="Ingredient Name"
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
                placeholder="e.g. H-2, V-22"
                :rules="[rules.required, rules.codeFormat]"
                required
                variant="outlined"
                density="comfortable"
                @input="handleCodeInput"
              />
            </v-col>

            <!-- Category and Unit -->
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.category"
                :items="ingredientCategories"
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

            <v-col cols="12" md="6">
              <v-select
                v-model="formData.unitId"
                :items="unitItems"
                item-title="label"
                item-value="id"
                label="Unit of Measurement"
                :rules="[rules.required]"
                required
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <!-- Cost and Supplier -->
            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.costPerUnit"
                label="Cost per Unit"
                type="number"
                step="0.01"
                prefix="$"
                variant="outlined"
                density="comfortable"
                :rules="[rules.positiveNumber]"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.supplier"
                label="Supplier (Optional)"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <!-- Description -->
            <v-col cols="12">
              <v-textarea
                v-model="formData.description"
                label="Description (Optional)"
                rows="2"
                variant="outlined"
                density="comfortable"
              />
            </v-col>

            <!-- Composite Ingredient -->
            <v-col cols="12">
              <v-checkbox
                v-model="formData.isComposite"
                label="This is a composite ingredient (made from other ingredients)"
                density="comfortable"
              />
            </v-col>

            <!-- Allergens -->
            <v-col cols="12">
              <v-combobox
                v-model="formData.allergens"
                label="Allergens (Optional)"
                multiple
                chips
                clearable
                variant="outlined"
                density="comfortable"
                :items="commonAllergens"
                hint="Press Enter to add a custom allergen"
              />
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
import { INGREDIENT_CATEGORIES } from '@/stores/recipes/types'
import type { Ingredient, CreateIngredientData } from '@/stores/recipes/types'

interface Props {
  modelValue: boolean
  ingredient?: Ingredient | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', ingredient: Ingredient): void
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
const formData = ref<CreateIngredientData>({
  name: '',
  code: '',
  category: 'herbs',
  unitId: '',
  costPerUnit: undefined,
  supplier: '',
  description: '',
  isComposite: false,
  allergens: []
})

// Computed
const isEditing = computed(() => !!props.ingredient)

const ingredientCategories = INGREDIENT_CATEGORIES

const unitItems = computed(() => {
  return store.units.map(unit => ({
    id: unit.id,
    label: `${unit.name} (${unit.shortName})`,
    value: unit.id
  }))
})

// Common allergens for autocomplete
const commonAllergens = [
  'Gluten',
  'Dairy',
  'Eggs',
  'Nuts',
  'Peanuts',
  'Soy',
  'Fish',
  'Shellfish',
  'Sesame',
  'Sulfites'
]

// Validation rules
const rules = {
  required: (value: any) => !!value || 'Required field',
  positiveNumber: (value: number) => !value || value > 0 || 'Must be greater than 0',
  codeFormat: (value: string) => {
    if (!value) return 'Required field'
    const pattern = /^[A-Z]-\d+$/
    return pattern.test(value) || 'Code must be in format: LETTER-NUMBER (e.g. H-2)'
  }
}

// Methods
function handleCodeInput(event: Event) {
  const input = event.target as HTMLInputElement
  formData.value.code = input.value.toUpperCase()
}

function handleCategoryChange(category: string) {
  // Auto-suggest code prefix based on category
  const categoryData = ingredientCategories.find(c => c.value === category)
  if (categoryData && !formData.value.code) {
    // Find next available number for this category
    const existingCodes = store.activeIngredients
      .filter(ing => ing.category === category)
      .map(ing => ing.code)
      .filter(code => code.startsWith(categoryData.prefix + '-'))
      .map(code => parseInt(code.split('-')[1]))
      .filter(num => !isNaN(num))

    const nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1
    formData.value.code = `${categoryData.prefix}-${nextNumber}`
  }
}

async function handleSubmit() {
  const isValid = await form.value?.validate()
  if (!isValid?.valid) return

  try {
    loading.value = true

    // Check if code already exists (for new ingredients or when code is changed)
    if (!isEditing.value || formData.value.code !== props.ingredient?.code) {
      const existingIngredient = store.activeIngredients.find(
        ing => ing.code === formData.value.code && ing.id !== props.ingredient?.id
      )
      if (existingIngredient) {
        throw new Error(`Ingredient with code ${formData.value.code} already exists`)
      }
    }

    if (isEditing.value && props.ingredient) {
      // Update existing ingredient
      const updatedIngredient = await store.updateIngredient(props.ingredient.id, formData.value)
      emit('saved', updatedIngredient)
    } else {
      // Create new ingredient
      const newIngredient = await store.createIngredient(formData.value)
      emit('saved', newIngredient)
    }

    dialogModel.value = false
  } catch (error) {
    console.error('Failed to save ingredient:', error)
    // You could add a snackbar or error display here
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
    category: 'herbs',
    unitId: store.units[0]?.id || '',
    costPerUnit: undefined,
    supplier: '',
    description: '',
    isComposite: false,
    allergens: []
  }
  form.value?.resetValidation()
}

// Watch for dialog open/close
watch(dialogModel, async newVal => {
  if (newVal) {
    if (props.ingredient) {
      // Edit mode - populate form
      formData.value = {
        name: props.ingredient.name,
        code: props.ingredient.code,
        category: props.ingredient.category,
        unitId: props.ingredient.unitId,
        costPerUnit: props.ingredient.costPerUnit,
        supplier: props.ingredient.supplier || '',
        description: props.ingredient.description || '',
        isComposite: props.ingredient.isComposite,
        allergens: [...(props.ingredient.allergens || [])]
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
:deep(.v-card-text) {
  max-height: 70vh;
  overflow-y: auto;
}
</style>
