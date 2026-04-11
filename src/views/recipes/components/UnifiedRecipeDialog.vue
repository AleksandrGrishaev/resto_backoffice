<!-- src/views/recipes/components/UnifiedRecipeDialog.vue - УПРОЩЕННАЯ ВЕРСИЯ -->
<template>
  <v-dialog v-model="dialogModel" :max-width="tablet ? '960px' : '900px'" persistent scrollable>
    <v-card>
      <v-card-title class="text-h5 pa-4">
        {{ getDialogTitle() }}
      </v-card-title>

      <v-divider />

      <!-- Error Alert -->
      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        closable
        class="ma-4"
        @click:close="errorMessage = ''"
      >
        {{ errorMessage }}
      </v-alert>

      <v-card-text class="pa-4">
        <v-form ref="form" v-model="formValid" @submit.prevent="handleSubmit">
          <!-- Tablet: tabbed layout -->
          <template v-if="tablet">
            <v-tabs v-model="activeTab" color="primary" class="mb-4">
              <v-tab value="general">General</v-tab>
              <v-tab value="components">Components</v-tab>
              <v-tab v-if="isEditing && props.item?.id" value="history">History</v-tab>
            </v-tabs>

            <v-tabs-window v-model="activeTab">
              <v-tabs-window-item value="general">
                <recipe-basic-info-widget
                  :form-data="formData"
                  :type="type"
                  tablet
                  @update-field="updateFormField"
                  @category-changed="handleCategoryChange"
                />
              </v-tabs-window-item>

              <v-tabs-window-item value="components">
                <recipe-components-editor-widget
                  :components="formData.components"
                  :type="type"
                  :preparation-id="type === 'preparation' ? formData.id : undefined"
                  :recipe-id="type === 'recipe' ? formData.id : undefined"
                  @component-quantity-changed="onComponentQuantityChange"
                  @add-component="addComponent"
                  @remove-component="removeComponent"
                  @update-component="updateComponent"
                />
                <used-in-widget
                  v-if="isEditing && formData.id"
                  :type="type"
                  :item-id="formData.id"
                />
              </v-tabs-window-item>

              <v-tabs-window-item v-if="isEditing && props.item?.id" value="history">
                <entity-history-tab
                  :entity-type="type === 'preparation' ? 'preparation' : 'recipe'"
                  :entity-id="props.item.id"
                />
              </v-tabs-window-item>
            </v-tabs-window>
          </template>

          <!-- Desktop: single scroll layout -->
          <template v-else>
            <recipe-basic-info-widget
              :form-data="formData"
              :type="type"
              @update-field="updateFormField"
              @category-changed="handleCategoryChange"
            />

            <recipe-cost-preview-widget :form-data="formData" :type="type" />

            <recipe-components-editor-widget
              :components="formData.components"
              :type="type"
              :preparation-id="type === 'preparation' ? formData.id : undefined"
              :recipe-id="type === 'recipe' ? formData.id : undefined"
              @component-quantity-changed="onComponentQuantityChange"
              @add-component="addComponent"
              @remove-component="removeComponent"
              @update-component="updateComponent"
            />

            <used-in-widget v-if="isEditing && formData.id" :type="type" :item-id="formData.id" />

            <!-- History section for desktop -->
            <template v-if="isEditing && props.item?.id">
              <v-divider class="my-4" />
              <div class="text-subtitle-2 mb-2">Change History</div>
              <entity-history-tab
                :entity-type="type === 'preparation' ? 'preparation' : 'recipe'"
                :entity-id="props.item.id"
              />
            </template>
          </template>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-btn
          v-if="isEditing && props.item"
          :color="props.item.isActive ? 'warning' : 'success'"
          variant="outlined"
          :prepend-icon="props.item.isActive ? 'mdi-archive-arrow-down' : 'mdi-archive-arrow-up'"
          @click="handleArchive"
        >
          {{ props.item.isActive ? 'Archive' : 'Restore' }}
        </v-btn>
        <v-btn
          v-if="isEditing && props.item"
          color="info"
          variant="outlined"
          prepend-icon="mdi-swap-horizontal"
          class="ml-2"
          @click="showConvertDialog = true"
        >
          {{ type === 'recipe' ? 'To Preparation' : 'To Recipe' }}
        </v-btn>
        <v-spacer />
        <v-btn
          v-if="!isEditing"
          variant="outlined"
          color="warning"
          class="text-uppercase mr-2"
          height="40"
          :loading="savingDraft"
          :disabled="!canSaveDraft || loading"
          @click="handleSaveDraft"
        >
          <v-icon icon="mdi-content-save-outline" size="18" class="mr-1" />
          Save Draft
        </v-btn>
        <v-btn variant="text" class="mr-2" @click="handleCancel">Cancel</v-btn>
        <v-btn
          color="primary"
          :variant="formValid ? 'flat' : 'outlined'"
          :loading="loading"
          :disabled="!formValid"
          @click="handleSubmit"
        >
          {{ isEditing ? 'Update' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Convert Entity Dialog -->
    <convert-entity-dialog
      v-if="isEditing && props.item"
      v-model="showConvertDialog"
      :item="props.item"
      :from-type="type"
      @converted="handleConverted"
    />
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
import UsedInWidget from './widgets/UsedInWidget.vue' // ⭐ PHASE 1: Recipe Nesting
import EntityHistoryTab from '@/views/kitchen/constructor/components/EntityHistoryTab.vue'
import ConvertEntityDialog from './ConvertEntityDialog.vue'

interface Props {
  modelValue: boolean
  type: 'recipe' | 'preparation'
  item?: Recipe | Preparation | null
  tablet?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved', item: Recipe | Preparation): void
  (e: 'archive', item: Recipe | Preparation): void
  (e: 'converted', payload: { newId: string; newType: 'recipe' | 'preparation' }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const recipesStore = useRecipesStore()
const form = ref()
const formValid = ref(false)
const loading = ref(false)
const savingDraft = ref(false)
const errorMessage = ref('')
const activeTab = ref('general')
const showConvertDialog = ref(false)

const canSaveDraft = computed(() => {
  return formData.value.name?.trim().length > 0
})

// Dialog model
const dialogModel = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

// Form data - универсальная структура
// ✅ NOTE: Initial category will be set by resetForm() or from props.item when dialog opens
const formData = ref<any>({
  name: '',
  code: '',
  description: '',
  category: '', // ✅ FIXED: Will be set to UUID when dialog opens
  outputQuantity: 1,
  outputUnit: 'gram',
  portionSize: 1,
  portionUnit: 'portion',
  preparationTime: 30,
  cookTime: undefined,
  difficulty: 'easy',
  tags: [],
  instructions: '', // Optional for preparations
  components: [],
  shelfLife: 2, // ✅ NEW: Default shelf life for preparations (days)
  shelfLifeFrozen: 30,
  shelfLifeThawed: 2,
  usedFrozen: false,
  trackStock: true,
  // ⭐ PHASE 2: Portion type support
  portionType: 'weight' as 'weight' | 'portion' // Default: weight-based
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

// ✅ NEW: Generate next available code for preparations or recipes
function generateNextCode(type: 'recipe' | 'preparation'): string {
  const prefix = type === 'preparation' ? 'P' : 'R'
  // Use ALL items (including archived) to avoid code collisions
  const items = type === 'preparation' ? recipesStore.preparations : recipesStore.recipes

  const existingCodes = items
    .map(item => item.code)
    .filter(code => code && code.startsWith(`${prefix}-`))
    .map(code => parseInt(code.split('-')[1]))
    .filter(num => !isNaN(num))

  const nextNumber = existingCodes.length > 0 ? Math.max(...existingCodes) + 1 : 1
  return `${prefix}-${String(nextNumber).padStart(3, '0')}`
}

function handleCategoryChange(category: string) {
  formData.value.category = category

  // Auto-generate code if not in edit mode and code is empty
  if (!isEditing.value && !formData.value.code) {
    formData.value.code = generateNextCode(props.type)
  }
}

function onComponentQuantityChange() {
  // Стоимость автоматически пересчитается через computed в CostPreviewWidget
}

async function handleSubmit() {
  // Clear previous error
  errorMessage.value = ''

  // Validate form
  const isValid = await form.value?.validate()
  if (!isValid?.valid) {
    errorMessage.value = 'Please fill in all required fields correctly'
    return
  }

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
        department: formData.value.department, // ✅ ADD: Include department
        description: formData.value.description,
        outputQuantity: formData.value.outputQuantity,
        outputUnit: formData.value.outputUnit,
        preparationTime: formData.value.preparationTime,
        instructions: formData.value.instructions || '', // ✅ Optional: send empty string if not provided
        shelfLife: formData.value.shelfLife,
        shelfLifeFrozen: formData.value.shelfLifeFrozen,
        shelfLifeThawed: formData.value.shelfLifeThawed,
        usedFrozen: formData.value.usedFrozen || false,
        trackStock: formData.value.trackStock ?? true,
        // ⭐ PHASE 2: Portion type support
        portionType: formData.value.portionType || 'weight',
        portionSize:
          formData.value.portionType === 'portion' ? formData.value.portionSize : undefined,
        recipe: validComponents.map((comp: any) => ({
          type: comp.componentType || 'product', // ⭐ PHASE 1: Support nested preparations
          id: comp.componentId,
          quantity: comp.quantity,
          unit: comp.unit,
          useYieldPercentage: comp.useYieldPercentage, // ✅ FIX: Include yield percentage toggle
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
        department: formData.value.department, // ✅ NEW: Include department
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
          useYieldPercentage: comp.useYieldPercentage, // ✅ FIX: Include yield percentage toggle
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
  } catch (error: any) {
    console.error(`Failed to save ${props.type}:`, error)
    // Show user-friendly error message
    const errorMsg = error?.message || error?.toString() || 'Unknown error occurred'
    errorMessage.value = `Failed to save ${props.type}: ${errorMsg}`
  } finally {
    loading.value = false
  }
}

function handleArchive() {
  if (props.item) {
    emit('archive', props.item)
    dialogModel.value = false
  }
}

function handleConverted(payload: { newId: string; newType: 'recipe' | 'preparation' }) {
  dialogModel.value = false
  emit('converted', payload)
}

function handleCancel() {
  errorMessage.value = ''
  dialogModel.value = false
}

async function handleSaveDraft() {
  if (!canSaveDraft.value) return

  try {
    savingDraft.value = true
    errorMessage.value = ''

    const validComponents = formData.value.components.filter(
      (comp: any) => comp.componentId && comp.quantity > 0
    )

    if (props.type === 'preparation') {
      const preparationData: any = {
        name: formData.value.name,
        code: formData.value.code || generateNextCode('preparation'),
        type: formData.value.category || recipesStore.activePreparationCategories[0]?.id || '',
        department: formData.value.department || 'kitchen',
        description: formData.value.description,
        outputQuantity: formData.value.outputQuantity || 1,
        outputUnit: formData.value.outputUnit || 'gram',
        preparationTime: formData.value.preparationTime || 0,
        instructions: formData.value.instructions || '',
        shelfLife: formData.value.shelfLife,
        shelfLifeFrozen: formData.value.shelfLifeFrozen,
        shelfLifeThawed: formData.value.shelfLifeThawed,
        usedFrozen: formData.value.usedFrozen || false,
        trackStock: formData.value.trackStock ?? true,
        portionType: formData.value.portionType || 'weight',
        portionSize:
          formData.value.portionType === 'portion' ? formData.value.portionSize : undefined,
        status: 'draft',
        isActive: false,
        recipe: validComponents.map((comp: any) => ({
          type: comp.componentType || 'product',
          id: comp.componentId,
          quantity: comp.quantity,
          unit: comp.unit,
          useYieldPercentage: comp.useYieldPercentage,
          notes: comp.notes
        }))
      }

      const result = await recipesStore.createPreparation(preparationData)
      emit('saved', result)
    } else {
      const recipeData: any = {
        name: formData.value.name,
        code: formData.value.code || generateNextCode('recipe'),
        description: formData.value.description,
        category: formData.value.category || recipesStore.activeRecipeCategories[0]?.id || '',
        department: formData.value.department || 'kitchen',
        portionSize: formData.value.portionSize || 1,
        portionUnit: formData.value.portionUnit || 'portion',
        prepTime: formData.value.preparationTime,
        cookTime: formData.value.cookTime,
        difficulty: formData.value.difficulty || 'easy',
        tags: formData.value.tags || [],
        status: 'draft',
        isActive: false,
        components: validComponents.map((comp: any) => ({
          id: comp.id,
          componentId: comp.componentId,
          componentType: comp.componentType,
          quantity: comp.quantity,
          unit: comp.unit,
          useYieldPercentage: comp.useYieldPercentage,
          notes: comp.notes
        }))
      }

      let result = await recipesStore.createRecipe(recipeData)
      if (recipeData.components.length > 0) {
        result = await recipesStore.updateRecipe(result.id, { components: recipeData.components })
      }
      emit('saved', result)
    }

    dialogModel.value = false
  } catch (error: any) {
    console.error(`Failed to save ${props.type} draft:`, error)
    errorMessage.value = `Failed to save draft: ${error?.message || 'Unknown error'}`
  } finally {
    savingDraft.value = false
  }
}

function resetForm() {
  // ✅ FIXED: Use UUID from first category instead of text key
  const defaultCategory =
    props.type === 'preparation'
      ? recipesStore.activePreparationCategories[0]?.id || ''
      : recipesStore.activeRecipeCategories[0]?.id || ''

  formData.value = {
    name: '',
    code: generateNextCode(props.type), // ✅ AUTO-GENERATE: Set next available code
    description: '',
    category: defaultCategory, // ✅ FIXED: Use UUID instead of text key
    department: 'kitchen', // ✅ ADD: Default department for new preparations
    outputQuantity: 1,
    outputUnit: 'gram',
    portionSize: 1,
    portionUnit: 'portion',
    preparationTime: 30,
    cookTime: undefined,
    difficulty: 'easy',
    tags: [],
    instructions: '', // Optional for preparations (nullable in DB)
    components: [],
    shelfLife: 2,
    shelfLifeFrozen: 30,
    shelfLifeThawed: 2,
    usedFrozen: false,
    trackStock: true,
    // ⭐ PHASE 2: Portion type support
    portionType: 'weight' as 'weight' | 'portion' // Default: weight-based
  }
  form.value?.resetValidation()
}

// Watch for dialog open/close
watch(dialogModel, async newVal => {
  if (newVal) {
    // Clear any previous errors
    errorMessage.value = ''
    activeTab.value = 'general'
    DebugUtils.info('UnifiedRecipeDialog', `Dialog opened for ${props.type}`)

    if (props.item) {
      // Edit mode - populate form
      if (props.type === 'preparation') {
        const prep = props.item as Preparation
        formData.value = {
          name: prep.name,
          code: prep.code || generateNextCode('preparation'),
          description: prep.description || '',
          category: prep.type,
          department: prep.department, // ✅ ADD: Include department
          outputQuantity: prep.outputQuantity,
          outputUnit: prep.outputUnit,
          preparationTime: prep.preparationTime,
          instructions: prep.instructions,
          shelfLife: prep.shelfLife || 2,
          shelfLifeFrozen: prep.shelfLifeFrozen || 30,
          shelfLifeThawed: prep.shelfLifeThawed || prep.shelfLife || 2,
          usedFrozen: prep.usedFrozen || false,
          trackStock: prep.trackStock ?? true,
          // ⭐ PHASE 2: Portion type support
          portionType: prep.portionType || 'weight',
          portionSize: prep.portionSize || 1,
          components: (prep.recipe || []).map((ingredient: any) => ({
            id: generateId(),
            componentId: ingredient.id,
            componentType: ingredient.type || 'product', // ⭐ PHASE 1: Support nested preparations
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            useYieldPercentage: ingredient.useYieldPercentage, // ✅ FIX: Include yield percentage toggle
            notes: ingredient.notes || ''
          }))
        }
      } else {
        const recipe = props.item as Recipe
        formData.value = {
          name: recipe.name,
          code: recipe.code || generateNextCode('recipe'),
          description: recipe.description || '',
          category: recipe.category,
          department: recipe.department || 'kitchen', // ✅ NEW: Include department with fallback
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
