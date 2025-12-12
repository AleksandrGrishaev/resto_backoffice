<!-- src/views/storage/components/writeoff/WriteOffDialog.vue - FIXED SELECTED SECTION -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="1200"
    persistent
    scrollable
    @update:model-value="$emit('update:model-value', $event)"
  >
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
              >
                <!-- ✅ ДОБАВИТЬ: Иконки в dropdown -->
                <template #item="{ props, item }">
                  <v-list-item v-bind="props">
                    <template #prepend>
                      <v-icon :icon="item.raw.icon" :color="item.raw.color" />
                    </template>
                  </v-list-item>
                </template>

                <!-- ✅ ДОБАВИТЬ: Иконка в выбранном значении -->
                <template #selection="{ item }">
                  <div class="d-flex align-center">
                    <v-icon
                      :icon="item.raw.icon"
                      :color="item.raw.color"
                      size="small"
                      class="mr-2"
                    />
                    <span>{{ item.raw.title }}</span>
                  </div>
                </template>
              </v-select>
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
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps" :title="undefined" :subtitle="undefined">
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

          <!-- Two-Panel Layout -->
          <div class="writeoff-panels">
            <v-row>
              <!-- Left Panel: Product Selector -->
              <v-col cols="12" lg="7">
                <v-card variant="outlined" class="h-100">
                  <v-card-title class="d-flex align-center justify-space-between pa-4">
                    <span>Select Products</span>
                    <v-btn
                      size="small"
                      variant="outlined"
                      prepend-icon="mdi-refresh"
                      @click="refreshProducts"
                    >
                      Refresh
                    </v-btn>
                  </v-card-title>
                  <v-divider />
                  <v-card-text class="pa-4" style="max-height: 500px; overflow-y: auto">
                    <product-selector-widget
                      :department="formData.department"
                      :can-select="true"
                      :multi-select="true"
                      :show-selection-summary="false"
                      @product-selected="handleProductSelected"
                      @quick-write-off="handleQuickWriteOff"
                    />
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Right Panel: Selected Products (FIXED) -->
              <v-col cols="12" lg="5">
                <v-card variant="outlined" class="h-100">
                  <v-card-title class="d-flex align-center justify-space-between pa-4">
                    <span>Selected for Write-off</span>
                    <v-chip size="small" color="primary" variant="tonal">
                      {{ formData.items.length }} item{{ formData.items.length !== 1 ? 's' : '' }}
                    </v-chip>
                  </v-card-title>
                  <v-divider />
                  <v-card-text class="pa-4" style="max-height: 500px; overflow-y: auto">
                    <!-- Empty State -->
                    <div
                      v-if="formData.items.length === 0"
                      class="text-center py-8 text-medium-emphasis"
                    >
                      <v-icon icon="mdi-package-variant-closed" size="48" class="mb-2" />
                      <div>No products selected</div>
                      <div class="text-body-2">Select products from the left panel</div>
                    </div>

                    <!-- ✅ FIXED: Compact row-based list -->
                    <div v-else class="selected-items-list">
                      <v-list class="pa-0" density="compact">
                        <v-list-item
                          v-for="(item, index) in formData.items"
                          :key="`item-${index}`"
                          class="selected-item-row"
                          :class="{ 'mb-1': index < formData.items.length - 1 }"
                        >
                          <!-- ✅ REMOVED: No prepend icon area -->

                          <!-- Product info -->
                          <v-list-item-title class="product-name">
                            {{ getProductName(item.itemId) }}
                          </v-list-item-title>

                          <v-list-item-subtitle class="product-details">
                            <!-- First line: quantity and cost -->
                            <div class="d-flex align-center gap-3 text-body-2 mb-1">
                              <!-- Write-off quantity -->
                              <span class="quantity-info">
                                <strong>
                                  {{ item.quantity }} {{ getProductUnit(item.itemId) }}
                                </strong>
                              </span>

                              <!-- Cost -->
                              <span class="cost-info text-medium-emphasis">
                                Cost: {{ formatIDR(calculateItemCost(item)) }}
                              </span>
                            </div>

                            <!-- ✅ NEW: Notes on second line -->
                            <div v-if="item.notes" class="notes-line mt-1">
                              <v-chip
                                size="x-small"
                                variant="outlined"
                                color="info"
                                prepend-icon="mdi-note-text"
                              >
                                {{
                                  item.notes.length > 30
                                    ? item.notes.substring(0, 30) + '...'
                                    : item.notes
                                }}
                              </v-chip>
                            </div>
                          </v-list-item-subtitle>

                          <!-- Only delete action -->
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
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <!-- General Notes -->
          <v-row class="mt-4">
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
          <v-card v-if="formData.items.length > 0" variant="tonal" color="error" class="pa-4 mt-4">
            <div class="d-flex align-center justify-space-between">
              <div>
                <div class="text-h6 font-weight-bold">Total Write-off Cost</div>
                <div class="text-body-2 text-medium-emphasis">
                  {{ formData.items.length }} product{{ formData.items.length !== 1 ? 's' : '' }}
                  selected
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
import { useWriteOff } from '@/stores/storage'
import { useStorageStore } from '@/stores/storage'
import { formatIDR } from '@/utils/currency'
import { DebugUtils } from '@/utils'
import ProductSelectorWidget from './ProductSelectorWidget.vue'
import type { Department } from '@/stores/productsStore/types' // ✅ ИЗМЕНИТЬ
import type { WriteOffReason, QuickWriteOffItem } from '@/stores/storage/types'

const MODULE_NAME = 'WriteOffDialog'

interface WriteOffFormData {
  department: Department // ✅ ИЗМЕНИТЬ
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
  department?: Department // ✅ ИЗМЕНИТЬ
  preselectedProducts?: QuickWriteOffItem[]
}

const props = withDefaults(defineProps<Props>(), {
  department: 'kitchen',
  preselectedProducts: () => []
})

const emit = defineEmits<{
  'update:model-value': [boolean]
  success: [operation: any]
  error: [error: any]
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
const departmentOptions = computed(() => [
  {
    title: 'Kitchen',
    value: 'kitchen' as Department, // ✅ Явно указываем тип
    icon: 'mdi-silverware-fork-knife',
    color: 'success'
  },
  {
    title: 'Bar',
    value: 'bar' as Department, // ✅ Явно указываем тип
    icon: 'mdi-coffee',
    color: 'info'
  }
])

const availableProducts = computed(() => {
  return writeOff.availableProducts.value
})

const writeOffReasonOptions = computed(() => writeOff.writeOffReasonOptions.value)

const selectedReasonInfo = computed(() => {
  return writeOff.getReasonInfo(formData.value.reason)
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
    formData.value.items.every(item => item.itemId && item.quantity > 0)
  )
})

// Validation rules
const rules = {
  required: (value: any) => !!value || 'This field is required'
}

// ✅ FIXED: Product selection methods (now add to items with quantity/notes)
function handleProductSelected(product: any) {
  // Check if product is already in the list
  const existingIndex = formData.value.items.findIndex(item => item.itemId === product.id)

  if (existingIndex === -1) {
    // Add new product with default quantity
    const stock = getProductStock(product.id)
    formData.value.items.push({
      itemId: product.id,
      quantity: Math.min(1, stock),
      notes: ''
    })

    DebugUtils.info(MODULE_NAME, 'Product added to write-off list', {
      productId: product.id,
      productName: getProductName(product.id)
    })
  }
}

function handleQuickWriteOff(product: any, quantity: number, notes: string) {
  // Check if product is already in the list
  const existingIndex = formData.value.items.findIndex(item => item.itemId === product.id)

  if (existingIndex !== -1) {
    // Update existing item
    formData.value.items[existingIndex].quantity = quantity
    formData.value.items[existingIndex].notes = notes
  } else {
    // Add new product
    formData.value.items.push({
      itemId: product.id,
      quantity: quantity,
      notes: notes
    })
  }

  DebugUtils.info(MODULE_NAME, 'Product quick write-off added', {
    productId: product.id,
    productName: getProductName(product.id),
    quantity,
    notes
  })
}

function removeProductRow(index: number) {
  const removedItem = formData.value.items[index]
  formData.value.items.splice(index, 1)

  DebugUtils.info(MODULE_NAME, 'Product removed from write-off list', {
    productId: removedItem.itemId,
    productName: getProductName(removedItem.itemId)
  })
}

function onReasonChange() {
  // Could add logic here if needed for specific reasons
}

function refreshProducts() {
  // Refresh product data
  storageStore.fetchBalances(formData.value.department)
}

// Helper methods
function getProductStock(productId: string): number {
  const balance = storageStore.state.balances.find(b => b.itemId === productId)
  return balance?.totalQuantity || 0
}

function getProductUnit(productId: string): string {
  return storageStore.getItemUnit(productId)
}

function getProductName(productId: string): string {
  return storageStore.getItemName(productId)
}

function getProductStatusIcon(productId: string): string {
  const balance = storageStore.state.balances.find(b => b.itemId === productId)

  if (!balance || balance.totalQuantity === 0) return 'mdi-package-variant-closed'
  if (balance.hasExpired) return 'mdi-alert-circle'
  if (balance.hasNearExpiry) return 'mdi-clock-alert'
  if (balance.belowMinStock) return 'mdi-package-down'
  return 'mdi-package-variant'
}

function getProductStatusColor(productId: string): string {
  const balance = storageStore.state.balances.find(b => b.itemId === productId)

  if (!balance || balance.totalQuantity === 0) return 'grey'
  if (balance.hasExpired) return 'error'
  if (balance.hasNearExpiry) return 'warning'
  if (balance.belowMinStock) return 'info'
  return 'success'
}

function calculateItemCost(item: { itemId: string; quantity: number }): number {
  if (!item.itemId || !item.quantity) return 0
  return writeOff.calculateWriteOffCost(item.itemId, item.quantity, formData.value.department)
}

async function handleSubmit() {
  if (!formRef.value) return
  const { valid } = await formRef.value.validate()
  if (!valid) return

  try {
    loading.value = true

    DebugUtils.info(MODULE_NAME, 'Submitting write-off operation', {
      department: formData.value.department,
      reason: formData.value.reason,
      itemCount: formData.value.items.length,
      totalCost: totalCost.value
    })

    const operation = await writeOff.writeOffMultipleProducts(
      formData.value.items.map(item => ({
        itemId: item.itemId,
        itemName: getProductName(item.itemId),
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

    DebugUtils.info(MODULE_NAME, 'Write-off operation completed successfully', {
      operationId: operation.id
    })

    emit('success', operation)
    handleCancel()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Write-off operation failed', { error })
    emit('error', error)
  } finally {
    loading.value = false
  }
}

function handleCancel() {
  formData.value = {
    department: props.department,
    responsiblePerson: '',
    reason: 'other',
    items: [],
    notes: ''
  }

  formRef.value?.resetValidation()
  emit('update:model-value', false)
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

      DebugUtils.info(MODULE_NAME, 'Preselected products loaded', {
        count: products.length,
        reason: products[0].reason
      })
    }
  },
  { immediate: true }
)

// Watch department changes
watch(
  () => formData.value.department,
  dept => {
    writeOff.selectedDepartment.value = dept
  },
  { immediate: true }
)
</script>

<style scoped>
.writeoff-panels {
  .v-card {
    min-height: 600px;
  }
}

/* ✅ UPDATED: Even more compact styling without prepend area */
.selected-items-list {
  .selected-item-row {
    border-radius: 6px;
    margin-bottom: 2px;
    border: 1px solid transparent;
    transition: all 0.2s ease;
    min-height: 56px;

    &:hover {
      background-color: rgba(var(--v-theme-surface-variant), 0.1);
    }

    &.mb-1 {
      border-bottom: 1px solid rgba(var(--v-theme-outline), 0.08);
    }

    .product-name {
      font-weight: 600;
      margin-bottom: 4px;
      font-size: 0.9rem;
    }

    .product-details {
      .quantity-info {
        min-width: 80px;
        font-size: 0.875rem;
      }

      .cost-info {
        min-width: 90px;
        font-size: 0.875rem;
      }

      .notes-line {
        .v-chip {
          max-width: 200px;
          font-size: 0.75rem;
        }
      }
    }
  }
}

/* Two-panel responsive layout */
@media (max-width: 1280px) {
  .writeoff-panels .v-row {
    flex-direction: column;
  }

  .writeoff-panels .v-card {
    min-height: 400px;
  }
}
</style>
