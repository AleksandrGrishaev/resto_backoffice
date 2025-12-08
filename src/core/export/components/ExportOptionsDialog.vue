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

interface ExportDialogOptions {
  department: DepartmentFilter
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'export', options: ExportDialogOptions): void
}>()

const selectedDepartment = ref<DepartmentFilter>('all')

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
    department: selectedDepartment.value
  })
  isOpen.value = false
}

function handleCancel() {
  isOpen.value = false
}

// Reset selection when dialog opens
function handleAfterEnter() {
  selectedDepartment.value = 'all'
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
