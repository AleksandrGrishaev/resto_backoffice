<template>
  <v-dialog v-model="dialogModel" max-width="450" persistent>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon start color="secondary">mdi-percent</v-icon>
        Product Yield List
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
          />
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="handleCancel">Cancel</v-btn>
        <v-btn color="secondary" variant="flat" :loading="loading" @click="handleSubmit">
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
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (
    e: 'generate',
    options: {
      department: 'kitchen' | 'bar' | 'all'
      sortBy: 'name' | 'code' | 'yield' | 'category'
    }
  ): void
}>()

const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

// Form options
const options = ref({
  department: 'all' as 'kitchen' | 'bar' | 'all',
  sortBy: 'name' as 'name' | 'code' | 'yield' | 'category'
})

// Reset options when dialog opens
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      options.value = {
        department: 'all',
        sortBy: 'name'
      }
    }
  }
)

const departmentOptions = [
  { text: 'All Departments', value: 'all' },
  { text: 'Kitchen', value: 'kitchen' },
  { text: 'Bar', value: 'bar' }
]

const sortOptions = [
  { text: 'Name (A-Z)', value: 'name' },
  { text: 'Code', value: 'code' },
  { text: 'Category', value: 'category' },
  { text: 'Yield % (High to Low)', value: 'yield' }
]

function handleSubmit() {
  emit('generate', { ...options.value })
}

function handleCancel() {
  dialogModel.value = false
}
</script>
