<!-- src/views/recipes/components/CategoryDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center ga-2 bg-surface-variant">
        <v-icon :color="isEdit ? 'warning' : 'primary'">
          {{ isEdit ? 'mdi-pencil' : 'mdi-plus' }}
        </v-icon>
        {{ isEdit ? 'Edit Category' : 'New Category' }}
      </v-card-title>

      <v-divider />

      <v-card-text class="pt-6">
        <v-form ref="formRef" v-model="isFormValid" @submit.prevent="save">
          <!-- Category Name -->
          <v-text-field
            v-model="formData.name"
            label="Category Name *"
            :rules="[rules.required]"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-text"
            autofocus
            class="mb-4"
          />

          <!-- Category Key (auto-generated from name) -->
          <v-text-field
            v-model="formData.key"
            label="Category Key (Unique ID) *"
            :rules="[rules.required, rules.key]"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-key"
            hint="Lowercase, no spaces (e.g., 'sauce', 'side_dish')"
            persistent-hint
            class="mb-4"
          />

          <!-- Description -->
          <v-textarea
            v-model="formData.description"
            label="Description"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-text-box-outline"
            rows="2"
            class="mb-4"
          />

          <!-- Icon & Emoji (for Preparation Categories) -->
          <div v-if="type === 'preparation'" class="d-flex gap-4 mb-4">
            <v-text-field
              v-model="formData.icon"
              label="Icon (Material Design)"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-emoticon-outline"
              hint="e.g., mdi-bottle-soda, mdi-food"
              persistent-hint
              class="flex-grow-1"
            />
            <v-text-field
              v-model="formData.emoji"
              label="Emoji"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-emoticon"
              hint="e.g., 🍕, 🍔"
              persistent-hint
              maxlength="2"
              class="flex-grow-1"
            />
          </div>

          <!-- Icon (for Recipe Categories) -->
          <v-text-field
            v-if="type === 'recipe'"
            v-model="formData.icon"
            label="Icon (Material Design)"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-emoticon-outline"
            hint="e.g., mdi-silverware-fork-knife, mdi-cup"
            persistent-hint
            class="mb-4"
          />

          <!-- Color Picker -->
          <v-text-field
            v-model="formData.color"
            label="Color"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-palette"
            hint="e.g., primary, success, #FF5722"
            persistent-hint
            class="mb-4"
          >
            <template #append-inner>
              <v-menu>
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    icon
                    size="small"
                    variant="text"
                    :color="formData.color || 'grey'"
                  >
                    <v-icon>mdi-circle</v-icon>
                  </v-btn>
                </template>
                <v-card>
                  <v-card-text>
                    <div class="d-flex flex-wrap gap-2" style="max-width: 250px">
                      <v-btn
                        v-for="color in colorOptions"
                        :key="color"
                        icon
                        size="small"
                        :color="color"
                        @click="formData.color = color"
                      >
                        <v-icon>mdi-circle</v-icon>
                      </v-btn>
                    </div>
                  </v-card-text>
                </v-card>
              </v-menu>
            </template>
          </v-text-field>

          <!-- Sort Order -->
          <v-text-field
            v-model.number="formData.sortOrder"
            label="Sort Order"
            type="number"
            variant="outlined"
            density="comfortable"
            prepend-inner-icon="mdi-sort"
            hint="Lower numbers appear first"
            persistent-hint
            class="mb-4"
          />

          <!-- Active Status -->
          <v-switch
            v-model="formData.isActive"
            label="Active"
            color="primary"
            density="comfortable"
            hide-details
          />
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="cancel">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!isFormValid"
          :loading="saving"
          @click="save"
        >
          {{ isEdit ? 'Update' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PreparationCategory, RecipeCategory } from '@/stores/recipes/types'

const props = defineProps<{
  modelValue: boolean
  type: 'preparation' | 'recipe'
  category?: PreparationCategory | RecipeCategory | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [data: CategoryFormData]
}>()

// =============================================
// STATE
// =============================================

interface CategoryFormData {
  name: string
  key: string
  description?: string
  icon?: string
  emoji?: string // Only for preparation categories
  color?: string
  sortOrder: number
  isActive: boolean
}

const formRef = ref<any>(null)
const isFormValid = ref(false)
const saving = ref(false)

const formData = ref<CategoryFormData>({
  name: '',
  key: '',
  description: '',
  icon: '',
  emoji: '',
  color: 'primary',
  sortOrder: 0,
  isActive: true
})

const isEdit = computed(() => !!props.category)

// =============================================
// COLOR OPTIONS
// =============================================

const colorOptions = [
  'primary',
  'secondary',
  'success',
  'error',
  'warning',
  'info',
  'purple',
  'pink',
  'indigo',
  'cyan',
  'teal',
  'green',
  'orange',
  'brown',
  'grey'
]

// =============================================
// VALIDATION RULES
// =============================================

const rules = {
  required: (value: string) => !!value?.trim() || 'This field is required',
  key: (value: string) => {
    if (!value?.trim()) return 'Key is required'
    if (!/^[a-z0-9_]+$/.test(value)) {
      return 'Key must be lowercase letters, numbers, and underscores only'
    }
    return true
  }
}

// =============================================
// WATCHERS
// =============================================

// Auto-generate key from name
watch(
  () => formData.value.name,
  newName => {
    if (!isEdit.value && newName) {
      // Auto-generate key: lowercase, replace spaces with underscores
      formData.value.key = newName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
    }
  }
)

// Load category data when dialog opens
watch(
  () => [props.modelValue, props.category],
  ([isOpen, category]) => {
    if (isOpen) {
      if (category) {
        // Edit mode - load existing data
        formData.value = {
          name: category.name,
          key: category.key,
          description: category.description || '',
          icon: category.icon || '',
          emoji: 'emoji' in category ? category.emoji || '' : '',
          color: category.color || 'primary',
          sortOrder: category.sortOrder || 0,
          isActive: category.isActive ?? true
        }
      } else {
        // Create mode - reset form
        formData.value = {
          name: '',
          key: '',
          description: '',
          icon: '',
          emoji: '',
          color: 'primary',
          sortOrder: 0,
          isActive: true
        }
      }
    }
  },
  { immediate: true }
)

// =============================================
// METHODS
// =============================================

function cancel() {
  emit('update:modelValue', false)
}

async function save() {
  if (!formRef.value) return

  const { valid } = await formRef.value.validate()
  if (!valid) return

  saving.value = true

  try {
    // Emit save event with form data
    emit('save', formData.value)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
:deep(.v-input__details) {
  padding-inline-start: 0;
}
</style>
