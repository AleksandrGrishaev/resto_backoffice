<!-- src/views/storage/components/writeoff/WriteOffQuantityDialog.vue - FIXED -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon icon="mdi-delete-sweep" class="mr-2" color="error" />
        Write Off: {{ product?.name }}
      </v-card-title>

      <v-card-text class="pa-6">
        <!-- Product Info -->
        <div class="mb-4">
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="text-body-2 text-medium-emphasis">Total Stock:</span>
            <span class="text-h6 font-weight-bold">{{ productStock }} {{ productUnit }}</span>
          </div>

          <!-- ✅ FIXED: Detailed stock breakdown with better validation -->
          <div v-if="stockBreakdown" class="stock-breakdown mb-3">
            <v-card variant="outlined" class="pa-3">
              <div class="text-subtitle-2 font-weight-bold mb-2">Stock Breakdown:</div>

              <div
                v-if="stockBreakdown.expired > 0"
                class="d-flex justify-space-between align-center mb-1"
              >
                <span class="text-body-2">
                  <v-icon icon="mdi-alert-circle" color="error" size="16" class="mr-1" />
                  Expired:
                </span>
                <span class="text-body-2 font-weight-bold text-error">
                  {{ formatQuantity(stockBreakdown.expired) }} {{ productUnit }}
                </span>
              </div>

              <div
                v-if="stockBreakdown.expiring > 0"
                class="d-flex justify-space-between align-center mb-1"
              >
                <span class="text-body-2">
                  <v-icon icon="mdi-clock-alert" color="warning" size="16" class="mr-1" />
                  Expiring Soon:
                </span>
                <span class="text-body-2 font-weight-bold text-warning">
                  {{ formatQuantity(stockBreakdown.expiring) }} {{ productUnit }}
                </span>
              </div>

              <div
                v-if="stockBreakdown.fresh > 0"
                class="d-flex justify-space-between align-center"
              >
                <span class="text-body-2">
                  <v-icon icon="mdi-check-circle" color="success" size="16" class="mr-1" />
                  Fresh:
                </span>
                <span class="text-body-2 font-weight-bold text-success">
                  {{ formatQuantity(stockBreakdown.fresh) }} {{ productUnit }}
                </span>
              </div>
            </v-card>
          </div>

          <div v-if="hasExpiryIssues" class="mb-3">
            <v-alert :type="expiryAlertType" variant="tonal" density="compact">
              {{ expiryDescription }}
            </v-alert>
          </div>
        </div>

        <!-- ✅ FIXED: Quantity input with better validation -->
        <v-text-field
          v-model.number="quantityToWriteOff"
          type="number"
          :label="`Quantity to write off (${productUnit})`"
          variant="outlined"
          min="0"
          :max="productStock"
          step="0.1"
          :rules="quantityRules"
          :error-messages="quantityErrorMessages"
          class="mb-4"
          @blur="validateQuantity"
          @input="clearQuantityError"
        />

        <!-- Notes input -->
        <v-textarea
          v-model="notes"
          label="Notes (optional)"
          variant="outlined"
          rows="2"
          placeholder="Reason for write-off, condition, etc..."
          class="mb-4"
          hide-details
        />

        <!-- ✅ FIXED: Quick buttons with proper stock validation -->
        <div class="quick-buttons">
          <v-btn-group variant="outlined" divided class="w-100 mb-2">
            <v-btn
              :disabled="!hasExpiredStock"
              class="flex-1"
              :title="
                hasExpiredStock
                  ? `Write off ${formatQuantity(stockBreakdown?.expired || 0)} ${productUnit} expired stock`
                  : 'No expired stock available'
              "
              @click="setQuantity('expired')"
            >
              <v-icon icon="mdi-clock-alert" class="mr-1" />
              Expired Only
              <v-chip v-if="hasExpiredStock" size="x-small" class="ml-1">
                {{ formatQuantity(stockBreakdown?.expired || 0) }}
              </v-chip>
            </v-btn>
            <v-btn
              :disabled="!hasExpiringStock"
              class="flex-1"
              :title="
                hasExpiringStock
                  ? `Write off ${formatQuantity(stockBreakdown?.expiring || 0)} ${productUnit} expiring stock`
                  : 'No expiring stock available'
              "
              @click="setQuantity('expiring')"
            >
              <v-icon icon="mdi-clock-outline" class="mr-1" />
              Expiring Soon
              <v-chip v-if="hasExpiringStock" size="x-small" class="ml-1">
                {{ formatQuantity(stockBreakdown?.expiring || 0) }}
              </v-chip>
            </v-btn>
          </v-btn-group>

          <v-btn-group variant="outlined" divided class="w-100">
            <v-btn class="flex-1" @click="setQuantity('half')">
              <v-icon icon="mdi-circle-half-full" class="mr-1" />
              Half Stock
              <v-chip size="x-small" class="ml-1">
                {{ formatQuantity(productStock * 0.5) }}
              </v-chip>
            </v-btn>
            <v-btn class="flex-1" @click="setQuantity('all')">
              <v-icon icon="mdi-select-all" class="mr-1" />
              All Stock
              <v-chip size="x-small" class="ml-1">
                {{ formatQuantity(productStock) }}
              </v-chip>
            </v-btn>
          </v-btn-group>
        </div>

        <!-- Cost preview -->
        <div v-if="quantityToWriteOff > 0" class="cost-preview mt-4">
          <v-card variant="tonal" color="error" class="pa-3">
            <div class="text-subtitle-2 font-weight-bold">Write-off Cost Preview</div>
            <div class="text-h6">{{ formatIDR(writeOffCost) }}</div>
            <div class="text-body-2 text-medium-emphasis mt-1">
              Unit cost: {{ formatIDR(averageUnitCost) }}/{{ productUnit }}
            </div>
          </v-card>
        </div>

        <!-- ✅ NEW: Stock validation warning -->
        <v-alert
          v-if="quantityToWriteOff > productStock"
          type="error"
          variant="tonal"
          class="mt-3"
          density="compact"
        >
          <template #prepend>
            <v-icon icon="mdi-alert-triangle" />
          </template>
          <strong>Insufficient Stock!</strong>
          You're trying to write off {{ formatQuantity(quantityToWriteOff) }} {{ productUnit }}, but
          only {{ formatQuantity(productStock) }} {{ productUnit }} is available.
        </v-alert>
      </v-card-text>

      <v-card-actions class="pa-6 pt-0">
        <v-spacer />
        <v-btn variant="text" @click="handleCancel">Cancel</v-btn>
        <v-btn color="error" variant="flat" :disabled="!isQuantityValid" @click="handleConfirm">
          Write Off
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStorageStore } from '@/stores/storage'
import { formatIDR } from '@/utils/currency'
import { DebugUtils } from '@/utils'
import type { StorageDepartment } from '@/stores/storage/types'
import { useWriteOff } from '../../../../stores/storage'
const MODULE_NAME = 'WriteOffQuantityDialog'

interface Product {
  id: string
  name: string
  unit: string
  category?: string
  isActive: boolean
}

interface Props {
  modelValue: boolean
  product: Product | null
  department: StorageDepartment
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:model-value': [boolean]
  confirm: [product: Product, quantity: number, notes: string]
  cancel: []
}>()

// Store
const storageStore = useStorageStore()
const writeOff = useWriteOff()

// State
const quantityToWriteOff = ref(0)
const notes = ref('')
const quantityError = ref('')

// ✅ FIXED: Better computed properties with null safety
const productBalance = computed(() => {
  try {
    if (!props.product || !storageStore?.getBalance) return null
    return storageStore.getBalance(props.product.id, props.department)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to get product balance', { error })
    return null
  }
})

const productStock = computed(() => {
  return productBalance.value?.totalQuantity || 0
})

const productUnit = computed(() => {
  return productBalance.value?.unit || props.product?.unit || 'kg'
})

const averageUnitCost = computed(() => {
  try {
    // Сначала пробуем получить из баланса
    if (productBalance.value?.averageCost) {
      return productBalance.value.averageCost
    }

    // Fallback: получаем из storageStore
    if (props.product && storageStore?.getItemCostPerUnit) {
      return storageStore.getItemCostPerUnit(props.product.id)
    }

    return 0
  } catch (error) {
    DebugUtils.warn(MODULE_NAME, 'Could not get average unit cost', { error })
    return 0
  }
})

// ✅ FIXED: More accurate stock breakdown calculation
const stockBreakdown = computed(() => {
  const balance = productBalance.value
  if (!balance || !balance.batches || balance.batches.length === 0) {
    return null
  }

  const now = new Date()
  let expired = 0
  let expiring = 0
  let fresh = 0

  balance.batches.forEach(batch => {
    if (!batch.expiryDate) {
      fresh += batch.currentQuantity
      return
    }

    const expiryDate = new Date(batch.expiryDate)
    const diffDays = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

    if (diffDays < 0) {
      expired += batch.currentQuantity
    } else if (diffDays <= 3) {
      expiring += batch.currentQuantity
    } else {
      fresh += batch.currentQuantity
    }
  })

  return {
    expired: Math.round(expired * 100) / 100,
    expiring: Math.round(expiring * 100) / 100,
    fresh: Math.round(fresh * 100) / 100
  }
})

const hasExpiryIssues = computed(() => {
  return productBalance.value?.hasExpired || productBalance.value?.hasNearExpiry || false
})

const hasExpiredStock = computed(() => {
  return (stockBreakdown.value?.expired || 0) > 0
})

const hasExpiringStock = computed(() => {
  return (stockBreakdown.value?.expiring || 0) > 0
})

const expiryAlertType = computed((): 'error' | 'warning' | 'info' => {
  if (productBalance.value?.hasExpired) return 'error'
  if (productBalance.value?.hasNearExpiry) return 'warning'
  return 'info'
})

const expiryDescription = computed(() => {
  if (productBalance.value?.hasExpired) {
    return 'This product has expired and should be written off immediately'
  }
  if (productBalance.value?.hasNearExpiry) {
    return 'This product is expiring soon and should be used or written off'
  }
  return 'Product is fresh'
})

// ✅ FIXED: Better validation rules
const quantityRules = computed(() => [
  (v: number) => v >= 0 || 'Quantity must be positive',
  (v: number) =>
    v <= productStock.value ||
    `Cannot exceed available stock (${formatQuantity(productStock.value)} ${productUnit.value})`
])

const quantityErrorMessages = computed(() => {
  if (quantityError.value) return [quantityError.value]
  return []
})

const isQuantityValid = computed(() => {
  return (
    quantityToWriteOff.value > 0 &&
    quantityToWriteOff.value <= productStock.value &&
    !quantityError.value
  )
})

const writeOffCost = computed(() => {
  if (!props.product || quantityToWriteOff.value <= 0) return 0

  try {
    // ИСПРАВЛЕНИЕ: используем writeOff composable вместо storageStore
    if (writeOff && typeof writeOff.calculateWriteOffCost === 'function') {
      return writeOff.calculateWriteOffCost(
        props.product.id,
        quantityToWriteOff.value,
        props.department
      )
    }

    // Fallback: простой расчет по средней стоимости
    return quantityToWriteOff.value * averageUnitCost.value
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to calculate write-off cost', { error })
    // Fallback: простой расчет
    return quantityToWriteOff.value * averageUnitCost.value
  }
})

// ✅ FIXED: Helper functions
function formatQuantity(value: number): string {
  return Number(value.toFixed(2)).toString()
}

function validateQuantity() {
  if (quantityToWriteOff.value > productStock.value) {
    quantityError.value = `Exceeds available stock by ${formatQuantity(quantityToWriteOff.value - productStock.value)} ${productUnit.value}`
  } else {
    quantityError.value = ''
  }
}

function clearQuantityError() {
  quantityError.value = ''
}

// ✅ FIXED: Better quantity setting with validation
function setQuantity(type: 'expired' | 'expiring' | 'half' | 'all') {
  if (!props.product) return

  const stock = productStock.value
  const breakdown = stockBreakdown.value

  let newQuantity = 0

  switch (type) {
    case 'expired':
      newQuantity = breakdown?.expired || 0
      break
    case 'expiring':
      newQuantity = breakdown?.expiring || 0
      break
    case 'half':
      newQuantity = Math.round(stock * 0.5 * 100) / 100
      break
    case 'all':
      newQuantity = stock
      break
  }

  // Ensure we don't exceed available stock
  quantityToWriteOff.value = Math.min(newQuantity, stock)
  clearQuantityError()

  DebugUtils.debug(MODULE_NAME, 'Quantity set', {
    type,
    requestedQuantity: newQuantity,
    actualQuantity: quantityToWriteOff.value,
    stock,
    breakdown
  })
}

function handleConfirm() {
  if (!props.product || !isQuantityValid.value) return

  // Final validation before confirm
  if (quantityToWriteOff.value > productStock.value) {
    quantityError.value = 'Cannot write off more than available stock'
    return
  }

  DebugUtils.info(MODULE_NAME, 'Confirming write-off', {
    productId: props.product.id,
    quantity: quantityToWriteOff.value,
    availableStock: productStock.value,
    cost: writeOffCost.value,
    notes: notes.value
  })

  emit('confirm', props.product, quantityToWriteOff.value, notes.value)
  resetDialog()
}

function handleCancel() {
  DebugUtils.debug(MODULE_NAME, 'Write-off cancelled', {
    productId: props.product?.id,
    productName: props.product?.name
  })

  emit('cancel')
  resetDialog()
}

function resetDialog() {
  quantityToWriteOff.value = 0
  notes.value = ''
  quantityError.value = ''
}

// ✅ FIXED: Better watchers
watch(
  () => props.product,
  newProduct => {
    if (newProduct) {
      resetDialog()
      DebugUtils.debug(MODULE_NAME, 'Product changed', {
        productId: newProduct.id,
        productName: newProduct.name,
        availableStock: productStock.value
      })
    }
  }
)

watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen && props.product) {
      resetDialog()

      // Auto-suggest quantity based on stock breakdown
      const breakdown = stockBreakdown.value
      if (breakdown?.expired > 0) {
        setQuantity('expired')
        notes.value = 'Automatic write-off: expired product'
      } else if (breakdown?.expiring > 0) {
        setQuantity('expiring')
        notes.value = 'Write-off: product expiring soon'
      }

      DebugUtils.debug(MODULE_NAME, 'Dialog opened', {
        productId: props.product.id,
        stockBreakdown: breakdown,
        autoSuggestedQuantity: quantityToWriteOff.value
      })
    }
  }
)

// Watch for quantity changes to clear errors
watch(quantityToWriteOff, () => {
  clearQuantityError()
})
</script>

<style lang="scss" scoped>
.quick-buttons {
  .v-btn-group {
    .v-btn {
      text-transform: none;
      font-size: 0.875rem;

      &.flex-1 {
        flex: 1;
      }

      &:disabled {
        opacity: 0.5;
      }

      .v-chip {
        font-size: 0.7rem;
        height: 18px;
      }
    }
  }
}

.cost-preview {
  border-radius: 8px;

  .text-subtitle-2 {
    margin-bottom: 4px;
  }
}

.stock-breakdown {
  .v-card {
    border: 1px solid rgba(var(--v-theme-outline), 0.2);

    .text-subtitle-2 {
      color: rgb(var(--v-theme-on-surface));
    }
  }
}

/* Responsive improvements */
@media (max-width: 600px) {
  .quick-buttons {
    .v-btn-group {
      .v-btn {
        font-size: 0.75rem;
        padding: 0 8px;

        .v-icon {
          margin-right: 4px !important;
        }

        .v-chip {
          font-size: 0.65rem;
          height: 16px;
        }
      }
    }
  }

  .stock-breakdown {
    .d-flex {
      font-size: 0.875rem;
    }
  }
}
</style>
