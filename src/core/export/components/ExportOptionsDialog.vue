<script setup lang="ts">
/**
 * Export Options Dialog
 * Allows user to select export options including department filter
 */

import { ref, computed } from 'vue'
import type { DepartmentFilter } from '../types'

interface Props {
  modelValue: boolean
  exportType: 'menu' | 'recipes' | 'preparations'
}

export interface ExportDialogOptions {
  department: DepartmentFilter
  includeRecipeDetails?: boolean // For menu export - include detailed recipe breakdown
  avoidPageBreaks?: boolean // Avoid cutting modules across pages
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'export', options: ExportDialogOptions): void
}>()

const selectedDepartment = ref<DepartmentFilter>('all')
const includeRecipeDetails = ref(true) // Default to true
const avoidPageBreaks = ref(true) // Default to true - avoid cutting modules

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

function handleExport() {
  emit('export', {
    department: selectedDepartment.value,
    includeRecipeDetails: props.exportType === 'menu' ? includeRecipeDetails.value : undefined,
    avoidPageBreaks: avoidPageBreaks.value
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
        <p class="text-body-2 text-medium-emphasis mb-4">
          Select which departments to include in the export:
        </p>

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
