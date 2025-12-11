<!-- src/views/kitchen/preparation/dialogs/ProductWriteOffDialog.vue -->
<!-- Kitchen Preparation - Product Write-Off Dialog (NO STOCK INFO) -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="800"
    persistent
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h3>Write Off Products</h3>
          <div class="text-body-2 text-medium-emphasis">
            {{ userDepartment === 'kitchen' ? 'Kitchen' : 'Bar' }} Department
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="handleCancel" />
      </v-card-title>
      <v-divider />

      <!-- Form -->
      <v-card-text class="pa-6">
        <v-form ref="formRef" @submit.prevent="handleSubmit">
          <!-- Write-off Reason -->
          <v-select
            v-model="formData.reason"
            :items="writeOffReasonOptions"
            label="Write-off Reason"
            variant="outlined"
            density="comfortable"
            class="mb-4"
            :rules="[rules.required]"
          >
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps">
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
            This write-off will impact your performance metrics.
          </v-alert>

          <!-- Add Product Section -->
          <v-card variant="outlined" class="mb-4">
            <v-card-title class="pa-4 d-flex align-center justify-space-between">
              <span>Add Products</span>
              <v-chip size="small" color="primary" variant="tonal">
                {{ formData.items.length }} selected
              </v-chip>
            </v-card-title>
            <v-divider />
            <v-card-text class="pa-4">
              <!-- Product Search -->
              <v-autocomplete
                v-model="selectedProduct"
                :items="availableProducts"
                item-title="name"
                item-value="id"
                label="Search product..."
                variant="outlined"
                density="comfortable"
                prepend-inner-icon="mdi-magnify"
                clearable
                return-object
                class="mb-3"
                :loading="loadingProducts"
                @update:model-value="handleProductSelected"
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps">
                    <v-list-item-subtitle>
                      {{ item.raw.code }} &bull; {{ item.raw.baseUnit }}
                    </v-list-item-subtitle>
                  </v-list-item>
                </template>
              </v-autocomplete>

              <!-- Quantity Input (appears after product selected) -->
              <div v-if="pendingProduct" class="pending-product-input">
                <v-row align="center">
                  <v-col cols="5">
                    <div class="text-subtitle-1 font-weight-medium">
                      {{ pendingProduct.name }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ pendingProduct.baseUnit }}
                    </div>
                  </v-col>
                  <v-col cols="4">
                    <v-text-field
                      v-model.number="pendingQuantity"
                      label="Quantity"
                      type="number"
                      min="0.01"
                      step="0.1"
                      variant="outlined"
                      density="compact"
                      :suffix="pendingProduct.baseUnit"
                      hide-details
                    />
                  </v-col>
                  <v-col cols="3" class="text-right">
                    <v-btn
                      color="primary"
                      variant="flat"
                      size="small"
                      :disabled="!pendingQuantity || pendingQuantity <= 0"
                      @click="addPendingProduct"
                    >
                      Add
                    </v-btn>
                  </v-col>
                </v-row>
              </div>
            </v-card-text>
          </v-card>

          <!-- Selected Products List -->
          <v-card variant="outlined" class="mb-4">
            <v-card-title class="pa-4">Selected Products</v-card-title>
            <v-divider />
            <v-card-text class="pa-0" style="max-height: 300px; overflow-y: auto">
              <!-- Empty State -->
              <div v-if="formData.items.length === 0" class="text-center py-8 text-medium-emphasis">
                <v-icon icon="mdi-package-variant-closed" size="48" class="mb-2" />
                <div>No products selected</div>
                <div class="text-body-2">Search and add products above</div>
              </div>

              <!-- Products list -->
              <v-list v-else class="pa-0" density="compact">
                <v-list-item
                  v-for="(item, index) in formData.items"
                  :key="`item-${index}`"
                  class="px-4"
                >
                  <v-list-item-title class="font-weight-medium">
                    {{ getProductName(item.itemId) }}
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    <span class="font-weight-bold">
                      {{ item.quantity }} {{ getProductUnit(item.itemId) }}
                    </span>
                    <span class="text-medium-emphasis ml-2">
                      Est. cost: {{ formatIDR(calculateItemCost(item)) }}
                    </span>
                  </v-list-item-subtitle>

                  <template #append>
                    <v-btn
                      icon="mdi-delete"
                      variant="text"
                      size="small"
                      color="error"
                      @click="removeProductRow(index)"
                    />
                  </template>
                </v-list-item>
              </v-list>
            </v-card-text>
          </v-card>

          <!-- Notes -->
          <v-textarea
            v-model="formData.notes"
            label="General Notes (optional)"
            variant="outlined"
            density="comfortable"
            rows="2"
            placeholder="Additional information about this write-off..."
          />

          <!-- Total Cost Summary -->
          <v-card v-if="formData.items.length > 0" variant="tonal" color="error" class="pa-4 mt-4">
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-h6 font-weight-bold">Estimated Write-off Cost</div>
                <div class="text-body-2 text-medium-emphasis">
                  {{ formData.items.length }} product{{ formData.items.length !== 1 ? 's' : '' }}
                </div>
              </div>
              <div class="text-h4 font-weight-bold">
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
import { useWriteOff, useStorageStore } from '@/stores/storage'
import { useProductsStore } from '@/stores/productsStore'
import { useAuthStore } from '@/stores/auth'
import { useKitchenKpiStore } from '@/stores/kitchenKpi'
import { formatIDR } from '@/utils/currency'
import { DebugUtils, TimeUtils } from '@/utils'
import type { WriteOffReason } from '@/stores/storage/types'
import type { Department } from '@/stores/productsStore/types'

const MODULE_NAME = 'ProductWriteOffDialog'

interface WriteOffFormData {
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
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  success: [message: string]
  error: [error: string]
}>()

// Stores & Composables
const writeOff = useWriteOff()
const storageStore = useStorageStore()
const productsStore = useProductsStore()
const authStore = useAuthStore()
const kpiStore = useKitchenKpiStore()

// Refs
const formRef = ref()
const loading = ref(false)
const loadingProducts = ref(false)

// Product selection state
const selectedProduct = ref<any>(null)
const pendingProduct = ref<any>(null)
const pendingQuantity = ref<number>(0)

// Form data
const formData = ref<WriteOffFormData>({
  reason: 'other',
  items: [],
  notes: ''
})

// Computed
const userDepartment = computed<Department>(() => {
  const roles = authStore.userRoles
  if (roles.includes('bar') && !roles.includes('kitchen')) {
    return 'bar'
  }
  return 'kitchen'
})

const writeOffReasonOptions = computed(() => writeOff.writeOffReasonOptions.value)

const selectedReasonInfo = computed(() => {
  return writeOff.getReasonInfo(formData.value.reason)
})

// Available products - filtered by department, NO STOCK INFO shown
const availableProducts = computed(() => {
  return productsStore.products
    .filter(p => p.isActive && (p.department === userDepartment.value || p.department === 'all'))
    .map(p => ({
      id: p.id,
      name: p.name,
      code: p.code,
      baseUnit: p.baseUnit,
      baseCostPerUnit: p.baseCostPerUnit
    }))
})

const totalCost = computed(() => {
  return formData.value.items.reduce((sum, item) => sum + calculateItemCost(item), 0)
})

const isFormValid = computed(() => {
  return (
    formData.value.reason &&
    formData.value.items.length > 0 &&
    formData.value.items.every(item => item.itemId && item.quantity > 0)
  )
})

// Validation rules
const rules = {
  required: (value: any) => !!value || 'This field is required'
}

// Methods
function handleProductSelected(product: any) {
  if (product) {
    pendingProduct.value = product
    pendingQuantity.value = 1
    selectedProduct.value = null // Clear autocomplete
  }
}

function addPendingProduct() {
  if (!pendingProduct.value || !pendingQuantity.value || pendingQuantity.value <= 0) return

  // Check if already in list
  const existingIndex = formData.value.items.findIndex(
    item => item.itemId === pendingProduct.value.id
  )

  if (existingIndex !== -1) {
    // Update quantity
    formData.value.items[existingIndex].quantity += pendingQuantity.value
  } else {
    // Add new
    formData.value.items.push({
      itemId: pendingProduct.value.id,
      quantity: pendingQuantity.value,
      notes: ''
    })
  }

  DebugUtils.info(MODULE_NAME, 'Product added', {
    productId: pendingProduct.value.id,
    name: pendingProduct.value.name,
    quantity: pendingQuantity.value
  })

  // Reset
  pendingProduct.value = null
  pendingQuantity.value = 0
}

function removeProductRow(index: number) {
  formData.value.items.splice(index, 1)
}

function getProductName(productId: string): string {
  const product = productsStore.getProductById(productId)
  return product?.name || 'Unknown'
}

function getProductUnit(productId: string): string {
  const product = productsStore.getProductById(productId)
  return product?.baseUnit || 'unit'
}

function calculateItemCost(item: { itemId: string; quantity: number }): number {
  if (!item.itemId || !item.quantity) return 0
  const product = productsStore.getProductById(item.itemId)
  if (!product) return 0
  return product.baseCostPerUnit * item.quantity
}

async function handleSubmit() {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid) return

  try {
    loading.value = true

    DebugUtils.info(MODULE_NAME, 'Submitting product write-off', {
      reason: formData.value.reason,
      itemCount: formData.value.items.length,
      totalCost: totalCost.value
    })

    // Create write-off operation
    const operation = await writeOff.writeOffMultipleProducts(
      formData.value.items.map(item => ({
        itemId: item.itemId,
        itemName: getProductName(item.itemId),
        currentQuantity: 0, // Kitchen doesn't see stock, set to 0
        unit: getProductUnit(item.itemId),
        writeOffQuantity: item.quantity,
        reason: formData.value.reason,
        notes: item.notes
      })),
      userDepartment.value,
      authStore.userName,
      formData.value.reason,
      formData.value.notes
    )

    // Record KPI for each item
    const affectsKpi = selectedReasonInfo.value?.affectsKPI || false
    for (const item of formData.value.items) {
      try {
        await kpiStore.recordWriteoff(
          authStore.userId || 'unknown',
          authStore.userName,
          userDepartment.value,
          {
            itemId: item.itemId,
            itemName: getProductName(item.itemId),
            itemType: 'product',
            quantity: item.quantity,
            unit: getProductUnit(item.itemId),
            value: calculateItemCost(item),
            reason: formData.value.reason,
            affectsKpi,
            timestamp: TimeUtils.getCurrentLocalISO()
          }
        )
      } catch (kpiError) {
        DebugUtils.error(MODULE_NAME, 'Failed to record KPI', { kpiError })
      }
    }

    DebugUtils.info(MODULE_NAME, 'Write-off completed', { operationId: operation.id })

    emit('success', `${formData.value.items.length} product(s) written off successfully`)
    handleCancel()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Write-off failed', { error })
    emit('error', error instanceof Error ? error.message : 'Write-off failed')
  } finally {
    loading.value = false
  }
}

function handleCancel() {
  formData.value = {
    reason: 'other',
    items: [],
    notes: ''
  }
  pendingProduct.value = null
  pendingQuantity.value = 0
  selectedProduct.value = null
  formRef.value?.resetValidation()
  emit('update:modelValue', false)
}

// Watch dialog open
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      // Set department for writeOff composable
      writeOff.selectedDepartment.value = userDepartment.value
    }
  }
)
</script>

<style scoped lang="scss">
.pending-product-input {
  background-color: rgba(var(--v-theme-primary), 0.05);
  border-radius: 8px;
  padding: 12px;
  border: 1px dashed rgba(var(--v-theme-primary), 0.3);
}
</style>
