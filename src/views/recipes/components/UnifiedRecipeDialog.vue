<!-- src/views/recipes/components/UnifiedRecipeDialog.vue - УПРОЩЕННАЯ ВЕРСИЯ -->
<template>
  <v-dialog v-model="dialogModel" max-width="900px" persistent scrollable>
    <v-card>
      <v-card-title class="text-h5 pa-4">
        {{ getDialogTitle() }}
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-4">
        <v-form ref="form" v-model="formValid" @submit.prevent="handleSubmit">
          <!-- ✅ Базовая информация -->
          <recipe-basic-info-widget
            :form-data="formData"
            :type="type"
            @update-field="updateFormField"
            @category-changed="handleCategoryChange"
          />

          <!-- ✅ Предпросмотр стоимости -->
          <recipe-cost-preview-widget :form-data="formData" :type="type" />

          <!-- ✅ Редактор компонентов -->
          <recipe-components-editor-widget
            :components="formData.components"
            :type="type"
            @component-quantity-changed="onComponentQuantityChange"
            @add-component="addComponent"
            @remove-component="removeComponent"
            @update-component="updateComponent"
          />
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

// Импорт виджетов
import RecipeBasicInfoWidget from './widgets/RecipeBasicInfoWidget.vue'
import RecipeCostPreviewWidget from './widgets/RecipeCostPreviewWidget.vue'
import RecipeComponentsEditorWidget from './widgets/RecipeComponentsEditorWidget.vue'

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

// Methods
function getDialogTitle(): string {
  const itemType = props.type === 'preparation' ? 'Preparation' : 'Recipe'
  return isEditing.value ? `Edit ${itemType}` : `New ${itemType}`
}

// ✅ ИСПРАВЛЕНО: Добавляем методы для обработки событий от виджетов
function updateFormField(field: string, value: unknown) {
  formData.value[field] = value
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

function updateComponent(index: number, field: string, value: unknown) {
  if (formData.value.components[index]) {
    formData.value.components[index][field] = value
  }
}

function handleCategoryChange(category: string) {
  formData.value.category = category

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

function onComponentQuantityChange() {
  // Стоимость автоматически пересчитается через computed в CostPreviewWidget
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
:deep(.v-card-text) {
  max-height: 70vh;
  overflow-y: auto;
}
</style>
