<!-- src/views/recipes/components/widgets/RecipeBasicInfoWidget.vue -->
<template>
  <div class="basic-info-widget">
    <v-row>
      <!-- Name -->
      <v-col cols="12" md="8">
        <v-text-field
          :model-value="formData.name"
          label="Name"
          :rules="[rules.required]"
          required
          variant="outlined"
          density="comfortable"
          @update:model-value="updateField('name', $event)"
        />
      </v-col>

      <!-- Code -->
      <v-col cols="12" md="4">
        <v-text-field
          :model-value="formData.code"
          label="Code (Required)"
          :placeholder="type === 'preparation' ? 'P-001' : 'R-001'"
          :rules="[rules.required, rules.codeFormat]"
          required
          variant="outlined"
          density="comfortable"
          hint="Auto-generated, but can be edited"
          @input="handleCodeInput"
        />
      </v-col>

      <!-- Description -->
      <v-col cols="12">
        <v-textarea
          :model-value="formData.description"
          label="Description"
          rows="2"
          variant="outlined"
          density="comfortable"
          @update:model-value="updateField('description', $event)"
        />
      </v-col>

      <!-- Category/Type -->
      <v-col cols="12" md="4">
        <v-select
          :model-value="formData.category"
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

      <!-- Department (Preparations only) -->
      <v-col v-if="type === 'preparation'" cols="12" md="4">
        <v-select
          :model-value="formData.department"
          :items="departmentItems"
          item-title="label"
          item-value="value"
          label="Department"
          :rules="[rules.required]"
          required
          variant="outlined"
          density="comfortable"
          hint="Which department prepares this item"
          @update:model-value="updateField('department', $event)"
        />
      </v-col>

      <!-- Output/Portion Info -->
      <template v-if="type === 'preparation'">
        <v-col cols="12" md="4">
          <v-text-field
            :model-value="formData.outputQuantity"
            label="Output Quantity"
            type="number"
            step="0.1"
            :rules="[rules.required, rules.positiveNumber]"
            required
            variant="outlined"
            density="comfortable"
            @update:model-value="updateField('outputQuantity', Number($event))"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-select
            :model-value="formData.outputUnit"
            :items="unitItems"
            item-title="label"
            item-value="value"
            label="Output Unit"
            :rules="[rules.required]"
            required
            variant="outlined"
            density="comfortable"
            @update:model-value="updateField('outputUnit', $event)"
          />
        </v-col>
      </template>

      <template v-else>
        <v-col cols="12" md="4">
          <v-text-field
            :model-value="formData.portionSize"
            label="Portion Size"
            type="number"
            :rules="[rules.required, rules.positiveNumber]"
            required
            variant="outlined"
            density="comfortable"
            @update:model-value="updateField('portionSize', Number($event))"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-text-field
            :model-value="formData.portionUnit"
            label="Portion Unit"
            placeholder="portions, servings"
            :rules="[rules.required]"
            required
            variant="outlined"
            density="comfortable"
            @update:model-value="updateField('portionUnit', $event)"
          />
        </v-col>
      </template>

      <!-- Time fields -->
      <v-col cols="12" md="6">
        <v-text-field
          :model-value="formData.preparationTime"
          :label="type === 'preparation' ? 'Preparation Time (min)' : 'Prep Time (min)'"
          type="number"
          variant="outlined"
          density="comfortable"
          @update:model-value="updateField('preparationTime', Number($event))"
        />
      </v-col>

      <v-col v-if="type === 'recipe'" cols="12" md="6">
        <v-text-field
          :model-value="formData.cookTime"
          label="Cook Time (min)"
          type="number"
          variant="outlined"
          density="comfortable"
          @update:model-value="updateField('cookTime', Number($event))"
        />
      </v-col>

      <!-- Recipe-specific fields -->
      <template v-if="type === 'recipe'">
        <v-col cols="12" md="6">
          <v-select
            :model-value="formData.difficulty"
            :items="difficultyLevels"
            item-title="text"
            item-value="value"
            label="Difficulty"
            :rules="[rules.required]"
            required
            variant="outlined"
            density="comfortable"
            @update:model-value="updateField('difficulty', $event)"
          />
        </v-col>

        <v-col cols="12">
          <v-combobox
            :model-value="formData.tags"
            label="Tags"
            multiple
            chips
            clearable
            variant="outlined"
            density="comfortable"
            hint="Press Enter to add a tag"
            @update:model-value="updateField('tags', $event)"
          />
        </v-col>
      </template>

      <!-- Instructions -->
      <v-col cols="12">
        <v-textarea
          :model-value="formData.instructions"
          label="Instructions"
          rows="4"
          variant="outlined"
          density="comfortable"
          :hint="
            type === 'preparation'
              ? 'Step-by-step preparation instructions'
              : 'Cooking instructions'
          "
          @update:model-value="updateField('instructions', $event)"
        />
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { DIFFICULTY_LEVELS } from '@/stores/recipes/types'
import { useRecipesStore } from '@/stores/recipes'

interface FormData {
  name: string
  code: string
  description: string
  category: string
  department?: string // ✅ NEW: Department for preparations
  outputQuantity: number
  outputUnit: string
  portionSize: number
  portionUnit: string
  preparationTime: number
  cookTime?: number
  difficulty: string
  tags: string[]
  instructions: string
}

interface Props {
  formData: FormData
  type: 'recipe' | 'preparation'
}

interface Emits {
  (e: 'update-field', field: string, value: unknown): void
  (e: 'category-changed', category: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// ✅ Initialize recipes store
const recipesStore = useRecipesStore()

// ✅ ИСПРАВЛЕНО: Избегаем циклических импортов - ленивая загрузка
let unitOptions: { value: Array<{ value: string; title: string }> } | null = null

async function getUnitOptions() {
  if (!unitOptions) {
    const { useRecipeUnits } = await import('@/composables/useMeasurementUnits')
    unitOptions = useRecipeUnits()
  }
  return unitOptions
}

// Computed
const categoryItems = computed(() => {
  if (props.type === 'preparation') {
    // ✅ Use store getters instead of PREPARATION_TYPES constant
    return recipesStore.activePreparationCategories.map(cat => ({
      value: cat.id,
      text: cat.name
    }))
  } else {
    // ✅ Use store getters instead of RECIPE_CATEGORIES constant
    return recipesStore.activeRecipeCategories.map(cat => ({
      value: cat.id,
      text: cat.name
    }))
  }
})

const departmentItems = computed(() => {
  return [
    { label: 'Kitchen', value: 'kitchen' },
    { label: 'Bar', value: 'bar' }
  ]
})

const unitItems = computed(() => {
  if (!unitOptions?.value) return []
  return unitOptions.value.map(option => ({
    value: option.value,
    label: option.title
  }))
})

const difficultyLevels = DIFFICULTY_LEVELS

// Validation rules
const rules = {
  required: (value: unknown) => !!value || 'Required field',
  positiveNumber: (value: number) => value > 0 || 'Must be greater than 0',
  codeFormat: (value: string) => {
    if (!value) return 'Required field'
    const pattern = props.type === 'preparation' ? /^P-\d+$/ : /^R-\d+$/
    const prefix = props.type === 'preparation' ? 'P' : 'R'
    return pattern.test(value) || `Code must be in format: ${prefix}-NUMBER (e.g. ${prefix}-1)`
  }
}

// ✅ ИСПРАВЛЕНО: Используем emit вместо прямой мутации props
function updateField(field: string, value: unknown) {
  emit('update-field', field, value)
}

function handleCodeInput(event: Event) {
  const input = event.target as HTMLInputElement
  const upperCaseValue = input.value.toUpperCase()
  updateField('code', upperCaseValue)
}

function handleCategoryChange(category: string) {
  updateField('category', category)
  emit('category-changed', category)
}

// ✅ ИСПРАВЛЕНО: Инициализация при монтировании
onMounted(async () => {
  await getUnitOptions()
})
</script>

<style lang="scss" scoped>
.basic-info-widget {
  // Стили если нужны
}
</style>
