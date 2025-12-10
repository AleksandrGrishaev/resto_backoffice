<template>
  <v-dialog v-model="dialogModel" max-width="500" persistent>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon start color="primary">
          {{ documentType === 'products' ? 'mdi-package-variant' : 'mdi-bowl-mix' }}
        </v-icon>
        {{ title }}
      </v-card-title>

      <v-card-text>
        <v-form ref="formRef" @submit.prevent="handleSubmit">
          <!-- Department -->
          <v-select
            v-model="options.department"
            :items="departmentOptions"
            item-title="text"
            item-value="value"
            label="Department"
            variant="outlined"
            density="compact"
            class="mb-4"
          />

          <!-- Sort By -->
          <v-select
            v-model="options.sortBy"
            :items="sortOptions"
            item-title="text"
            item-value="value"
            label="Sort by"
            variant="outlined"
            density="compact"
            class="mb-4"
          />

          <!-- Include Zero Stock -->
          <v-checkbox
            v-model="options.includeZeroStock"
            label="Include items with zero stock"
            density="compact"
            hide-details
            class="mb-2"
          />

          <!-- Show Signature Line -->
          <v-checkbox
            v-model="options.showSignatureLine"
            label="Show signature line at bottom"
            density="compact"
            hide-details
          />
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="handleCancel">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :loading="loading" @click="handleSubmit">
          <v-icon start>mdi-printer</v-icon>
          Generate PDF
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  modelValue: boolean
  documentType: 'products' | 'preparations'
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (
    e: 'generate',
    options: {
      department: 'kitchen' | 'bar' | 'all'
      includeZeroStock: boolean
      sortBy: 'name' | 'code' | 'category'
      showSignatureLine: boolean
    }
  ): void
}>()

const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const title = computed(() =>
  props.documentType === 'products'
    ? 'Inventory Sheet - Products'
    : 'Inventory Sheet - Preparations'
)

// Form options
const options = ref({
  department: 'all' as 'kitchen' | 'bar' | 'all',
  sortBy: 'name' as 'name' | 'code' | 'category',
  includeZeroStock: false,
  showSignatureLine: true
})

// Reset options when dialog opens
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      options.value = {
        department: 'all',
        sortBy: 'name',
        includeZeroStock: false,
        showSignatureLine: true
      }
    }
  }
)

const departmentOptions = [
  { text: 'All Departments', value: 'all' },
  { text: 'Kitchen', value: 'kitchen' },
  { text: 'Bar', value: 'bar' }
]

const sortOptions = computed(() => {
  const base = [
    { text: 'Name (A-Z)', value: 'name' },
    { text: 'Code', value: 'code' }
  ]
  // Only products have categories
  if (props.documentType === 'products') {
    base.push({ text: 'Category', value: 'category' })
  }
  return base
})

function handleSubmit() {
  emit('generate', { ...options.value })
}

function handleCancel() {
  dialogModel.value = false
}
</script>
