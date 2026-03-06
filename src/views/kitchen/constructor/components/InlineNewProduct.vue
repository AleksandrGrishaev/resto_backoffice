<!-- src/views/kitchen/constructor/components/InlineNewProduct.vue -->
<template>
  <BottomSheet
    :model-value="modelValue"
    title="NEW PRODUCT"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="inline-product-form">
      <v-text-field
        v-model="form.name"
        label="Name"
        variant="outlined"
        density="comfortable"
        hide-details
        class="mb-3"
      />

      <v-select
        v-model="form.baseUnit"
        :items="unitOptions"
        label="Unit"
        variant="outlined"
        density="comfortable"
        hide-details
        class="mb-3"
      />

      <v-select
        v-model="form.categoryId"
        :items="categoryOptions"
        item-title="name"
        item-value="id"
        label="Category"
        variant="outlined"
        density="comfortable"
        hide-details
      />
    </div>

    <template #actions>
      <v-btn variant="text" @click="emit('update:modelValue', false)">Cancel</v-btn>
      <v-btn color="primary" :disabled="!canCreate" :loading="saving" @click="handleCreate">
        Create & Add
        <v-icon end>mdi-arrow-right</v-icon>
      </v-btn>
    </template>
  </BottomSheet>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { useSnackbar } from '@/composables/useSnackbar'
import BottomSheet from '@/components/tablet/BottomSheet.vue'
import type { ProductCategory } from '@/stores/productsStore/types'

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  created: [productId: string]
}>()

const productsStore = useProductsStore()

const unitOptions = ['gram', 'ml', 'piece']

const categoryOptions = computed(() =>
  (productsStore.categories as ProductCategory[]).filter(c => c.isActive)
)

const form = reactive({
  name: '',
  baseUnit: 'gram',
  categoryId: ''
})

const saving = ref(false)

const canCreate = computed(() => form.name.trim().length > 0 && form.categoryId !== '')

async function handleCreate() {
  saving.value = true
  try {
    // Gap #12: category needs to be the full ProductCategory object
    const category = (productsStore.categories as ProductCategory[]).find(
      c => c.id === form.categoryId
    )
    if (!category) throw new Error('Category not found')

    const result = await productsStore.createProduct({
      name: form.name.trim(),
      baseUnit: form.baseUnit as 'gram' | 'ml' | 'piece',
      category: category as any, // ProductCategory object (Gap #12)
      yieldPercentage: 100,
      usedInDepartments: ['kitchen'],
      isActive: true,
      canBeSold: false,
      baseCostPerUnit: 0
    })

    if (result?.id) {
      useSnackbar().showSuccess(`Product "${form.name}" created`)
      emit('created', result.id)
      // Reset form
      form.name = ''
      form.baseUnit = 'gram'
      form.categoryId = ''
    }
  } catch (error) {
    useSnackbar().showError('Failed to create product')
    console.error('Failed to create product:', error)
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
.inline-product-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
</style>
