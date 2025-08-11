<!-- src/components/storage/dialogs/WriteOffDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="800" persistent>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h3>Write Off Products</h3>
          <div class="text-body-2 text-medium-emphasis">
            {{ department === 'kitchen' ? 'Kitchen' : 'Bar' }} Department
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="handleCancel" />
      </v-card-title>

      <v-divider />

      <!-- Form -->
      <v-card-text class="pa-6">
        <v-form ref="formRef" @submit.prevent="handleSubmit">
          <!-- Department & Responsible Person -->
          <v-row>
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.department"
                :items="departmentOptions"
                label="Department"
                variant="outlined"
                density="comfortable"
                :rules="[rules.required]"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.responsiblePerson"
                label="Responsible Person"
                variant="outlined"
                density="comfortable"
                :rules="[rules.required]"
              />
            </v-col>
          </v-row>

          <!-- Write-off Reason -->
          <v-row>
            <v-col cols="12">
              <v-select
                v-model="formData.reason"
                :items="writeOffReasonOptions"
                label="Write-off Reason"
                variant="outlined"
                density="comfortable"
                :rules="[rules.required]"
                @update:model-value="onReasonChange"
              >
                <template #item="{ props, item }">
                  <v-list-item v-bind="props">
                    <template #prepend>
                      <v-icon
                        :color="item.raw.color"
                        :icon="item.raw.affectsKPI ? 'mdi-alert' : 'mdi-check-circle'"
                      />
                    </template>
                    <v-list-item-title>{{ item.raw.title }}</v-list-item-title>
                    <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                  </v-list-item>
                </template>
              </v-select>
            </v-col>
          </v-row>

          <!-- KPI Warning -->
          <v-alert
            v-if="selectedReasonInfo?.affectsKPI"
            type="warning"
            variant="tonal"
            class="mb-4"
          >
            <template #prepend>
              <v-icon icon="mdi-alert-triangle" />
            </template>
            <strong>Affects KPI:</strong>
            This write-off will impact department performance metrics.
          </v-alert>

          <!-- Products Selection -->
          <div class="mb-4">
            <div class="d-flex align-center justify-space-between mb-3">
              <h4>Select Products to Write Off</h4>
              <v-btn variant="outlined" size="small" prepend-icon="mdi-plus" @click="addProductRow">
                Add Product
              </v-btn>
            </div>

            <!-- Product Rows -->
            <div v-if="formData.items.length === 0" class="text-center py-8 text-medium-emphasis">
              <v-icon icon="mdi-package-variant-closed" size="48" class="mb-2" />
              <div>No products selected</div>
              <div class="text-body-2">Click "Add Product" to start</div>
            </div>

            <div v-else class="space-y-3">
              <v-card
                v-for="(item, index) in formData.items"
                :key="`item-${index}`"
                variant="outlined"
                class="pa-4"
              >
                <div class="d-flex align-center gap-4">
                  <!-- Product Selection -->
                  <div class="flex-grow-1">
                    <v-autocomplete
                      v-model="item.itemId"
                      :items="availableProducts"
                      item-title="name"
                      item-value="id"
                      label="Product"
                      variant="outlined"
                      density="comfortable"
                      :rules="[rules.required]"
                      @update:model-value="value => onProductChange(index, value)"
                    >
                      <template #item="{ props, item: product }">
                        <v-list-item v-bind="props">
                          <v-list-item-title>{{ product.raw.name }}</v-list-item-title>
                          <v-list-item-subtitle>
                            Available: {{ getProductStock(product.raw.id) }} {{ product.raw.unit }}
                          </v-list-item-subtitle>
                        </v-list-item>
                      </template>
                    </v-autocomplete>
                  </div>

                  <!-- Quantity -->
                  <div style="width: 150px">
                    <v-text-field
                      v-model.number="item.quantity"
                      type="number"
                      :label="`Quantity (${getProductUnit(item.itemId)})`"
                      variant="outlined"
                      density="comfortable"
                      :rules="[rules.required, rules.positive, v => validateStock(index, v)]"
                      min="0"
                      step="0.1"
                    />
                  </div>

                  <!-- Cost Preview -->
                  <div style="width: 120px" class="text-center">
                    <div class="text-body-2 text-medium-emphasis">Cost</div>
                    <div class="text-h6">
                      {{ formatIDR(calculateItemCost(item)) }}
                    </div>
                  </div>

                  <!-- Remove Button -->
                  <v-btn
                    icon="mdi-delete"
                    variant="text"
                    color="error"
                    @click="removeProductRow(index)"
                  />
                </div>

                <!-- Notes for this item -->
                <div class="mt-3">
                  <v-text-field
                    v-model="item.notes"
                    label="Notes (optional)"
                    variant="outlined"
                    density="comfortable"
                    placeholder="Additional notes for this product..."
                  />
                </div>
              </v-card>
            </div>
          </div>

          <!-- General Notes -->
          <v-row>
            <v-col cols="12">
              <v-textarea
                v-model="formData.notes"
                label="General Notes (optional)"
                variant="outlined"
                density="comfortable"
                rows="3"
                placeholder="Additional information about this write-off operation..."
              />
            </v-col>
          </v-row>

          <!-- Total Cost Summary -->
          <v-card v-if="formData.items.length > 0" variant="tonal" class="pa-4">
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-h6">Total Write-off Cost</div>
                <div class="text-body-2 text-medium-emphasis">
                  {{ formData.items.length }} product{{ formData.items.length !== 1 ? 's' : '' }}
                </div>
              </div>
              <div class="text-h5 font-weight-bold">
                {{ formatIDR(totalCost) }}
              </div>
            </div>
          </v-card>
        </v-form>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="handleCancel">Cancel</v-btn>
        <v-btn
          color="error"
          variant="flat"
          :loading="loading"
          :disabled="!isFormValid"
          @click="handleSubmit"
        >
          Write Off Products
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useWriteOff } from '@/stores/storage'
import { useStorageStore } from '@/stores/storage'
import { formatIDR } from '@/utils'
import type { WriteOffReason, StorageDepartment, QuickWriteOffItem } from '@/stores/storage/types'

interface WriteOffFormData {
  department: StorageDepartment
  responsiblePerson: string
  reason: WriteOffReason
  items: Array<{
    itemId: string
    quantity: number
    notes: string
  }>
  notes: string
}

interface Props {
  modelValue: boolean
  department?: StorageDepartment
  preselectedProducts?: QuickWriteOffItem[]
}

const props = withDefaults(defineProps<Props>(), {
  department: 'kitchen',
  preselectedProducts: () => []
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [operation: any]
}>()

// Composables
const writeOff = useWriteOff()
const storageStore = useStorageStore()

// Refs
const formRef = ref()
const loading = ref(false)

// Form data
const formData = ref<WriteOffFormData>({
  department: props.department,
  responsiblePerson: '',
  reason: 'other',
  items: [],
  notes: ''
})

// Computed
const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const departmentOptions = computed(() => [
  { title: 'Kitchen', value: 'kitchen' },
  { title: 'Bar', value: 'bar' }
])

const writeOffReasonOptions = computed(() => writeOff.writeOffReasonOptions.value)

const selectedReasonInfo = computed(() => {
  return writeOff.getReasonInfo(formData.value.reason)
})

const availableProducts = computed(() => {
  return storageStore.getAvailableProducts(formData.value.department)
})

const totalCost = computed(() => {
  return formData.value.items.reduce((sum, item) => sum + calculateItemCost(item), 0)
})

const isFormValid = computed(() => {
  return (
    formData.value.department &&
    formData.value.responsiblePerson &&
    formData.value.reason &&
    formData.value.items.length > 0 &&
    formData.value.items.every(
      item => item.itemId && item.quantity > 0 && validateStockSync(item.itemId, item.quantity)
    )
  )
})

// Validation rules
const rules = {
  required: (value: any) => !!value || 'This field is required',
  positive: (value: number) => value > 0 || 'Must be greater than 0'
}

// Methods
function addProductRow() {
  formData.value.items.push({
    itemId: '',
    quantity: 0,
    notes: ''
  })
}

function removeProductRow(index: number) {
  formData.value.items.splice(index, 1)
}

function onProductChange(index: number, productId: string) {
  const item = formData.value.items[index]
  if (item) {
    item.itemId = productId
    // Reset quantity when product changes
    if (item.quantity === 0) {
      item.quantity = 1
    }
  }
}

function onReasonChange() {
  // Could add logic here if needed for specific reasons
}

function getProductStock(productId: string): number {
  const balance = storageStore.getBalance(productId, formData.value.department)
  return balance?.totalQuantity || 0
}

function getProductUnit(productId: string): string {
  return storageStore.getItemUnit(productId)
}

function calculateItemCost(item: { itemId: string; quantity: number }): number {
  if (!item.itemId || !item.quantity) return 0

  return writeOff.calculateWriteOffCost(item.itemId, item.quantity, formData.value.department)
}

function validateStock(index: number, quantity: number): boolean | string {
  const item = formData.value.items[index]
  if (!item?.itemId || !quantity) return true

  const check = writeOff.checkStockAvailability(item.itemId, quantity, formData.value.department)

  return check.available || `Only ${check.currentStock} available`
}

function validateStockSync(productId: string, quantity: number): boolean {
  if (!productId || !quantity) return false

  const check = writeOff.checkStockAvailability(productId, quantity, formData.value.department)

  return check.available
}

async function handleSubmit() {
  if (!formRef.value) return

  const { valid } = await formRef.value.validate()
  if (!valid) return

  try {
    loading.value = true

    const operation = await writeOff.writeOffMultipleProducts(
      formData.value.items.map(item => ({
        itemId: item.itemId,
        itemName: storageStore.getItemName(item.itemId),
        currentQuantity: getProductStock(item.itemId),
        unit: getProductUnit(item.itemId),
        writeOffQuantity: item.quantity,
        reason: formData.value.reason,
        notes: item.notes
      })),
      formData.value.department,
      formData.value.responsiblePerson,
      formData.value.reason,
      formData.value.notes
    )

    emit('success', operation)
    handleCancel()
  } catch (error) {
    console.error('Write-off failed:', error)
  } finally {
    loading.value = false
  }
}

function handleCancel() {
  // Reset form
  formData.value = {
    department: props.department,
    responsiblePerson: '',
    reason: 'other',
    items: [],
    notes: ''
  }

  // Clear validation
  formRef.value?.resetValidation()

  emit('update:modelValue', false)
}

// Watch for preselected products
watch(
  () => props.preselectedProducts,
  products => {
    if (products.length > 0) {
      formData.value.items = products.map(product => ({
        itemId: product.itemId,
        quantity: product.writeOffQuantity,
        notes: product.notes || ''
      }))
      formData.value.reason = products[0].reason
    }
  },
  { immediate: true }
)

// Watch department changes
watch(
  () => formData.value.department,
  () => {
    // Clear items when department changes
    formData.value.items = []
  }
)
</script>

<style scoped>
.space-y-3 > * + * {
  margin-top: 12px;
}
</style>
