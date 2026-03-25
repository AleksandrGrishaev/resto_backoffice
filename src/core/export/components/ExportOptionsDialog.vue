<script setup lang="ts">
/**
 * Export Options Dialog
 * Allows user to select export options including department filter and category selection
 */

import { ref, computed } from 'vue'
import type { DepartmentFilter } from '../types'

interface CategoryOption {
  id: string
  name: string
  itemCount?: number
}

interface Props {
  modelValue: boolean
  exportType: 'menu' | 'recipes' | 'preparations'
  categories?: CategoryOption[] // Available categories for filtering (menu export)
}

export interface ExportDialogOptions {
  department: DepartmentFilter
  includeRecipeDetails?: boolean // For menu export - include detailed recipe breakdown
  avoidPageBreaks?: boolean // Avoid cutting modules across pages
  excludedCategoryIds?: string[] // Categories to exclude from export
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'export', options: ExportDialogOptions): void
}>()

const selectedDepartment = ref<DepartmentFilter>('all')
const includeRecipeDetails = ref(true) // Default to true
const avoidPageBreaks = ref(true) // Default to true - avoid cutting modules
const excludedCategoryIds = ref<string[]>([])

const isOpen = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const departmentOptions = [
  { value: 'all', title: 'All Departments', icon: 'mdi-domain' },
  { value: 'kitchen', title: 'Kitchen Only', icon: 'mdi-silverware-fork-knife' },
  { value: 'bar', title: 'Bar Only', icon: 'mdi-glass-cocktail' }
]

const exportTypeLabel = computed(() => {
  const labels = {
    menu: 'Menu',
    recipes: 'Recipes',
    preparations: 'Preparations'
  }
  return labels[props.exportType]
})

// Category selection helpers
const hasCategories = computed(() => props.categories && props.categories.length > 0)

const allSelected = computed(() => excludedCategoryIds.value.length === 0)

function toggleSelectAll() {
  if (allSelected.value) {
    // Deselect all
    excludedCategoryIds.value = (props.categories || []).map(c => c.id)
  } else {
    // Select all
    excludedCategoryIds.value = []
  }
}

function toggleCategory(categoryId: string) {
  const idx = excludedCategoryIds.value.indexOf(categoryId)
  if (idx >= 0) {
    excludedCategoryIds.value.splice(idx, 1)
  } else {
    excludedCategoryIds.value.push(categoryId)
  }
}

function isCategorySelected(categoryId: string) {
  return !excludedCategoryIds.value.includes(categoryId)
}

const selectedCategoryCount = computed(() => {
  if (!props.categories) return 0
  return props.categories.length - excludedCategoryIds.value.length
})

function handleExport() {
  emit('export', {
    department: selectedDepartment.value,
    includeRecipeDetails: props.exportType === 'menu' ? includeRecipeDetails.value : undefined,
    avoidPageBreaks: avoidPageBreaks.value,
    excludedCategoryIds:
      excludedCategoryIds.value.length > 0 ? [...excludedCategoryIds.value] : undefined
  })
  isOpen.value = false
}

function handleCancel() {
  isOpen.value = false
}

// Reset selection when dialog opens
function handleAfterEnter() {
  selectedDepartment.value = 'all'
  includeRecipeDetails.value = true
  avoidPageBreaks.value = true
  excludedCategoryIds.value = []
}
</script>

<template>
  <v-dialog v-model="isOpen" max-width="400" persistent @after-enter="handleAfterEnter">
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon start color="primary">mdi-file-pdf-box</v-icon>
        Export {{ exportTypeLabel }} to PDF
      </v-card-title>

      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-3">Department</p>

        <v-radio-group v-model="selectedDepartment" hide-details>
          <v-radio
            v-for="option in departmentOptions"
            :key="option.value"
            :value="option.value"
            :label="option.title"
            color="primary"
          >
            <template #label>
              <div class="d-flex align-center">
                <v-icon :icon="option.icon" size="20" class="mr-2" />
                {{ option.title }}
              </div>
            </template>
          </v-radio>
        </v-radio-group>

        <!-- Category filter (only for menu export with categories) -->
        <div v-if="hasCategories" class="mt-4">
          <div class="d-flex align-center justify-space-between mb-2">
            <p class="text-body-2 text-medium-emphasis">
              Categories
              <span class="text-caption">
                ({{ selectedCategoryCount }}/{{ categories!.length }})
              </span>
            </p>
            <v-btn variant="text" density="compact" size="small" @click="toggleSelectAll">
              {{ allSelected ? 'Deselect all' : 'Select all' }}
            </v-btn>
          </div>

          <div class="category-list">
            <v-checkbox
              v-for="cat in categories"
              :key="cat.id"
              :model-value="isCategorySelected(cat.id)"
              density="compact"
              hide-details
              color="primary"
              @update:model-value="toggleCategory(cat.id)"
            >
              <template #label>
                <div class="d-flex align-center justify-space-between flex-grow-1">
                  <span class="text-body-2">{{ cat.name }}</span>
                  <span
                    v-if="cat.itemCount !== undefined"
                    class="text-caption text-medium-emphasis ml-2"
                  >
                    {{ cat.itemCount }} items
                  </span>
                </div>
              </template>
            </v-checkbox>
          </div>
        </div>

        <!-- Recipe details option (only for menu export) -->
        <div v-if="exportType === 'menu'" class="mt-4">
          <v-checkbox
            v-model="includeRecipeDetails"
            label="Include recipe details"
            hint="Show ingredients and costs breakdown for each dish"
            persistent-hint
            hide-details="auto"
            density="compact"
            color="primary"
          />
        </div>

        <!-- Page break option -->
        <div class="mt-4">
          <v-checkbox
            v-model="avoidPageBreaks"
            label="Keep items together"
            hint="Avoid cutting menu items across page boundaries"
            persistent-hint
            hide-details="auto"
            density="compact"
            color="primary"
          />
        </div>
      </v-card-text>

      <v-card-actions class="pa-4 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="handleCancel">Cancel</v-btn>
        <v-btn color="primary" variant="flat" prepend-icon="mdi-download" @click="handleExport">
          Export PDF
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.category-list {
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  padding: 4px 8px;
}
</style>
