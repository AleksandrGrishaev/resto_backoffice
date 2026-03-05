<!-- src/views/recipes/components/widgets/RecipeBasicInfoWidget.vue -->
<template>
  <div class="basic-info-widget">
    <v-row>
      <!-- === SECTION: Identity === -->
      <v-col v-if="tablet" cols="12" class="section-header pb-0">
        <div class="section-title">Identity</div>
      </v-col>

      <!-- Name -->
      <v-col cols="12" md="8">
        <v-text-field
          :model-value="formData.name"
          label="Name (Required)"
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

      <!-- Description (moved to bottom in tablet mode) -->
      <v-col v-if="!tablet" cols="12">
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
          :label="type === 'preparation' ? 'Type (Required)' : 'Category (Required)'"
          :rules="[rules.required]"
          required
          variant="outlined"
          density="comfortable"
          @update:model-value="handleCategoryChange"
        />
      </v-col>

      <!-- Department (Both recipes and preparations) -->
      <v-col cols="12" md="4">
        <v-select
          :model-value="formData.department"
          :items="departmentItems"
          item-title="label"
          item-value="value"
          label="Department (Required)"
          :rules="[rules.required]"
          required
          variant="outlined"
          density="comfortable"
          :hint="
            type === 'preparation'
              ? 'Which department prepares this item'
              : 'Which department prepares this recipe'
          "
          @update:model-value="updateField('department', $event)"
        />
      </v-col>

      <!-- === SECTION: Output (highlighted in tablet mode) === -->
      <v-col v-if="tablet" cols="12" class="section-header pb-0">
        <div class="section-title section-title--output">Output</div>
      </v-col>

      <!-- Output/Portion Info -->
      <template v-if="type === 'preparation'">
        <!-- Portion Type Selection -->
        <v-col cols="12" md="4" :class="{ 'output-highlight': tablet }">
          <v-radio-group
            :model-value="formData.portionType || 'weight'"
            inline
            density="comfortable"
            hide-details
            class="mt-0"
            @update:model-value="handlePortionTypeChange($event)"
          >
            <template #label>
              <span class="text-body-2 text-medium-emphasis">Quantity Type</span>
            </template>
            <v-radio label="Weight" value="weight" />
            <v-radio label="Portions" value="portion" />
          </v-radio-group>
        </v-col>

        <!-- Weight mode: Output Quantity + Output Unit -->
        <template v-if="formData.portionType !== 'portion'">
          <v-col cols="12" md="4" :class="{ 'output-highlight': tablet }">
            <NumericInputField
              :model-value="formData.outputQuantity"
              label="Output Quantity (Required)"
              :allow-decimal="true"
              :min="0.01"
              :rules="[rules.required, rules.positiveNumber]"
              required
              variant="outlined"
              density="comfortable"
              @update:model-value="updateField('outputQuantity', $event)"
            />
          </v-col>
          <v-col cols="12" md="4" :class="{ 'output-highlight': tablet }">
            <v-select
              :model-value="formData.outputUnit"
              :items="unitItems"
              item-title="label"
              item-value="value"
              label="Output Unit (Required)"
              :rules="[rules.required]"
              required
              variant="outlined"
              density="comfortable"
              @update:model-value="updateField('outputUnit', $event)"
            />
          </v-col>
        </template>

        <!-- Portion mode: Number of Portions + Output Unit + Portion Size -->
        <template v-else>
          <v-col cols="12" md="4" :class="{ 'output-highlight': tablet }">
            <NumericInputField
              :model-value="formData.outputQuantity"
              label="Number of Portions (Required)"
              :min="1"
              :rules="[rules.required, rules.positiveNumber]"
              required
              variant="outlined"
              density="comfortable"
              hint="How many portions this recipe makes"
              persistent-hint
              @update:model-value="updateField('outputQuantity', $event)"
            />
          </v-col>
          <v-col cols="12" md="4" :class="{ 'output-highlight': tablet }">
            <v-select
              :model-value="formData.outputUnit || 'gram'"
              :items="outputUnitItems"
              item-title="label"
              item-value="value"
              label="Output Unit"
              variant="outlined"
              density="comfortable"
              hint="Unit of measurement for portions"
              persistent-hint
              @update:model-value="updateField('outputUnit', $event)"
            />
          </v-col>
          <v-col cols="12" md="4" :class="{ 'output-highlight': tablet }">
            <NumericInputField
              :model-value="formData.portionSize"
              :label="portionSizeLabel"
              :allow-decimal="true"
              :min="1"
              :rules="[rules.required, rules.positiveNumber]"
              required
              variant="outlined"
              density="comfortable"
              :hint="portionSizeHint"
              persistent-hint
              @update:model-value="updateField('portionSize', $event)"
            />
          </v-col>

          <!-- Total Weight Preview -->
          <v-col v-if="formData.outputQuantity > 0 && formData.portionSize > 0" cols="12">
            <v-alert type="info" variant="tonal" density="compact" class="text-body-2">
              <strong>{{ formData.outputQuantity }} portions</strong>
              × {{ formData.portionSize }}{{ portionSizeUnitShort }} =
              <strong>{{ calculatedTotalWeight }}{{ portionSizeUnitShort }} total</strong>
            </v-alert>
          </v-col>
        </template>
      </template>

      <template v-else>
        <v-col cols="12" md="4">
          <NumericInputField
            :model-value="formData.portionSize"
            label="Portion Size (Required)"
            :allow-decimal="true"
            :min="0.01"
            :rules="[rules.required, rules.positiveNumber]"
            required
            variant="outlined"
            density="comfortable"
            @update:model-value="updateField('portionSize', $event)"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-select
            :model-value="formData.portionUnit"
            :items="portionUnits"
            item-title="label"
            item-value="value"
            label="Portion Unit (Required)"
            :rules="[rules.required]"
            required
            variant="outlined"
            density="comfortable"
            @update:model-value="updateField('portionUnit', $event)"
          >
            <template #prepend-inner>
              <v-icon>mdi-scale</v-icon>
            </template>
          </v-select>
        </v-col>
      </template>

      <!-- === SECTION: Timing & Storage === -->
      <v-col v-if="tablet" cols="12" class="section-header pb-0">
        <div class="section-title">Timing & Storage</div>
      </v-col>

      <!-- Time fields -->
      <v-col cols="12" md="6">
        <NumericInputField
          :model-value="formData.preparationTime"
          :label="type === 'preparation' ? 'Preparation Time (min)' : 'Prep Time (min)'"
          variant="outlined"
          density="comfortable"
          @update:model-value="updateField('preparationTime', $event)"
        />
      </v-col>

      <v-col v-if="type === 'recipe'" cols="12" md="6">
        <NumericInputField
          :model-value="formData.cookTime"
          label="Cook Time (min)"
          variant="outlined"
          density="comfortable"
          @update:model-value="updateField('cookTime', $event)"
        />
      </v-col>

      <!-- Shelf Life (Preparations only) -->
      <v-col v-if="type === 'preparation'" cols="12" md="6">
        <NumericInputField
          :model-value="formData.shelfLife"
          label="Shelf Life (days)"
          :min="1"
          :rules="[rules.positiveNumber]"
          variant="outlined"
          density="comfortable"
          hint="How many days this preparation can be stored"
          @update:model-value="updateField('shelfLife', $event)"
        />
      </v-col>

      <!-- Kitchen Preparation: Storage & Production Settings -->
      <template v-if="type === 'preparation'">
        <!-- Storage Location -->
        <v-col cols="12" md="6">
          <v-select
            :model-value="formData.storageLocation || 'fridge'"
            :items="storageLocationItems"
            item-title="label"
            item-value="value"
            label="Storage Location"
            variant="outlined"
            density="comfortable"
            hint="Where this preparation is stored"
            @update:model-value="updateField('storageLocation', $event)"
          />
        </v-col>

        <!-- Production Slot -->
        <v-col cols="12" md="6">
          <v-select
            :model-value="formData.productionSlot || 'any'"
            :items="productionSlotItems"
            item-title="label"
            item-value="value"
            label="Production Time"
            variant="outlined"
            density="comfortable"
            hint="Preferred production time slot"
            @update:model-value="updateField('productionSlot', $event)"
          />
        </v-col>

        <!-- Min Stock Threshold -->
        <v-col cols="12" md="6">
          <NumericInputField
            :model-value="formData.minStockThreshold || 0"
            label="Min Stock Threshold"
            :min="0"
            variant="outlined"
            density="comfortable"
            :hint="`Alert when stock falls below this (${formData.outputUnit || 'units'})`"
            @update:model-value="updateField('minStockThreshold', $event)"
          />
        </v-col>

        <!-- Daily Target Quantity -->
        <v-col cols="12" md="6">
          <NumericInputField
            :model-value="formData.dailyTargetQuantity || 0"
            label="Daily Target Quantity"
            :min="0"
            variant="outlined"
            density="comfortable"
            :hint="`Target daily production (${formData.outputUnit || 'units'})`"
            @update:model-value="updateField('dailyTargetQuantity', $event)"
          />
        </v-col>
      </template>

      <!-- === SECTION: Other (recipe-specific) === -->
      <template v-if="type === 'recipe'">
        <v-col v-if="tablet" cols="12" class="section-header pb-0">
          <div class="section-title">Other</div>
        </v-col>

        <v-col cols="12" md="6">
          <v-select
            :model-value="formData.difficulty"
            :items="difficultyLevels"
            item-title="text"
            item-value="value"
            label="Difficulty (Required)"
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

      <!-- Description & Instructions -->
      <v-col v-if="tablet" cols="12" class="section-header pb-0">
        <div class="section-title">Description & Instructions</div>
      </v-col>

      <v-col v-if="tablet" cols="12">
        <v-textarea
          :model-value="formData.description"
          label="Description"
          rows="2"
          variant="outlined"
          density="comfortable"
          @update:model-value="updateField('description', $event)"
        />
      </v-col>

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
              ? 'Step-by-step preparation instructions (Optional)'
              : 'Cooking instructions (Optional)'
          "
          @update:model-value="updateField('instructions', $event)"
        />
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { DIFFICULTY_LEVELS } from '@/stores/recipes/types'
import { useRecipesStore } from '@/stores/recipes'
import { NumericInputField } from '@/components/input'
import { getUnitShortName } from '@/types/measurementUnits'

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
  shelfLife?: number // ✅ NEW: Shelf life in days for preparations
  // ⭐ PHASE 2: Portion type support
  portionType?: 'weight' | 'portion'
  // 🆕 Kitchen Preparation: Storage & Production Settings
  storageLocation?: 'shelf' | 'fridge' | 'freezer'
  productionSlot?: 'morning' | 'afternoon' | 'evening' | 'any'
  minStockThreshold?: number
  dailyTargetQuantity?: number
}

interface Props {
  formData: FormData
  type: 'recipe' | 'preparation'
  tablet?: boolean
}

interface Emits {
  (e: 'update-field', field: string, value: unknown): void
  (e: 'category-changed', category: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// ✅ Initialize recipes store
const recipesStore = useRecipesStore()

// ✅ FIXED: Make unitOptions reactive so computed updates when loaded
const unitOptionsLoaded = ref<Array<{ value: string; title: string }>>([])

async function loadUnitOptions() {
  const { useRecipeUnits } = await import('@/composables/useMeasurementUnits')
  const { unitOptions } = useRecipeUnits()
  unitOptionsLoaded.value = unitOptions.value || []
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

// 🆕 Kitchen Preparation: Storage location options
const storageLocationItems = computed(() => {
  return [
    { label: 'Fridge', value: 'fridge' },
    { label: 'Shelf', value: 'shelf' },
    { label: 'Freezer', value: 'freezer' }
  ]
})

// 🆕 Kitchen Preparation: Production slot options
const productionSlotItems = computed(() => {
  return [
    { label: 'Any time', value: 'any' },
    { label: 'Morning (6:00-12:00)', value: 'morning' },
    { label: 'Afternoon (12:00-18:00)', value: 'afternoon' },
    { label: 'Evening (18:00-22:00)', value: 'evening' }
  ]
})

const unitItems = computed(() => {
  return (unitOptionsLoaded.value || []).map(option => ({
    value: option.value,
    label: option.title
  }))
})

const difficultyLevels = DIFFICULTY_LEVELS

// ⭐ PHASE 1: Portion units for recipes
const portionUnits = [
  { label: 'Portion', value: 'portion' },
  { label: 'Piece', value: 'piece' },
  { label: 'Serving', value: 'serving' },
  { label: 'Gram', value: 'gram' },
  { label: 'Milliliter', value: 'ml' }
]

// Output unit options for portion mode
const outputUnitItems = [
  { label: 'Gram', value: 'gram' },
  { label: 'Milliliter', value: 'ml' },
  { label: 'Piece', value: 'piece' },
  { label: 'Portion', value: 'portion' }
]

// Dynamic label/hint for portion size based on output unit
const portionSizeLabel = computed(() => {
  const unit = props.formData.outputUnit
  if (unit === 'ml') return 'Portion Size (ml)'
  if (unit === 'piece' || unit === 'portion') return 'Portion Size'
  return 'Portion Size (grams)'
})

const portionSizeHint = computed(() => {
  const unit = props.formData.outputUnit
  if (unit === 'piece' || unit === 'portion') return 'Items per portion'
  return 'Weight of one portion'
})

const portionSizeUnitShort = computed(() => {
  const unit = props.formData.outputUnit
  if (unit === 'piece' || unit === 'portion') return ''
  return getUnitShortName(unit)
})

// ⭐ PHASE 2: Calculated total weight for portion-type preparations
const calculatedTotalWeight = computed(() => {
  if (!props.formData.portionSize || props.formData.portionSize <= 0) return 0
  if (!props.formData.outputQuantity || props.formData.outputQuantity <= 0) return 0
  // When portionType = 'portion', outputQuantity IS the number of portions
  // Total weight = portions × portionSize
  return props.formData.outputQuantity * props.formData.portionSize
})

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

// ⭐ PHASE 2: Handle portion type change with sensible defaults
function handlePortionTypeChange(portionType: 'weight' | 'portion') {
  updateField('portionType', portionType)

  if (portionType === 'portion') {
    // Switching to portion mode: set defaults
    if (!props.formData.portionSize || props.formData.portionSize <= 0) {
      updateField('portionSize', 30) // Default 30g per portion
    }
    if (!props.formData.outputQuantity || props.formData.outputQuantity <= 0) {
      updateField('outputQuantity', 10) // Default 10 portions
    }
    // Keep existing outputUnit (don't force gram)
    if (!props.formData.outputUnit) {
      updateField('outputUnit', 'gram')
    }
  } else {
    // Switching to weight mode: set defaults
    if (!props.formData.outputQuantity || props.formData.outputQuantity <= 0) {
      updateField('outputQuantity', 100) // Default 100g
    }
  }
}

// ✅ FIXED: Load units on mount
onMounted(async () => {
  await loadUnitOptions()
})
</script>

<style lang="scss" scoped>
.basic-info-widget {
  // Стили если нужны
}

.section-header {
  margin-top: 8px;
}

.section-title {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(var(--v-theme-on-surface), 0.5);
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);

  &--output {
    color: rgb(var(--v-theme-warning));
    border-bottom-color: rgba(var(--v-theme-warning), 0.3);
  }
}

.output-highlight {
  background: rgba(var(--v-theme-warning), 0.04);
  border-radius: 8px;
}
</style>
