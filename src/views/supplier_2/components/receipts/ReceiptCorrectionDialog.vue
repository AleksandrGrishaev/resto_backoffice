<template>
  <v-dialog v-model="isOpen" max-width="900px" persistent>
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between pa-4 bg-warning text-white">
        <div>
          <div class="text-h6">Correct Receipt</div>
          <div class="text-caption opacity-90">{{ receipt?.receiptNumber }}</div>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" @click="closeDialog" />
      </v-card-title>

      <v-card-text class="pa-4">
        <!-- Correction Type Selector -->
        <div class="mb-4">
          <div class="text-subtitle-2 mb-2">Correction Type</div>
          <v-btn-toggle v-model="correctionType" mandatory color="warning" density="compact">
            <v-btn value="item_quantity" size="small">
              <v-icon icon="mdi-counter" class="mr-1" size="16" />
              Quantity
            </v-btn>
            <v-btn value="item_price" size="small">
              <v-icon icon="mdi-currency-usd" class="mr-1" size="16" />
              Price
            </v-btn>
            <v-btn value="supplier_change" size="small">
              <v-icon icon="mdi-truck" class="mr-1" size="16" />
              Supplier
            </v-btn>
            <v-btn value="full_reversal" size="small">
              <v-icon icon="mdi-undo-variant" class="mr-1" size="16" />
              Full Reversal
            </v-btn>
          </v-btn-toggle>
        </div>

        <!-- Consumption Warning -->
        <v-alert
          v-if="!batchStatus.safe && correctionType === 'full_reversal'"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          <div class="text-subtitle-2 font-weight-bold">
            Cannot reverse - items already consumed
          </div>
          <div
            v-for="batch in batchStatus.batches.filter(b => b.consumed > 0)"
            :key="batch.batchId"
            class="text-body-2 mt-1"
          >
            Batch {{ batch.batchId.slice(-8) }}: {{ batch.consumed }} units consumed
          </div>
        </v-alert>

        <!-- Full Reversal Info -->
        <v-alert
          v-if="correctionType === 'full_reversal' && batchStatus.safe"
          type="warning"
          variant="tonal"
          class="mb-4"
        >
          This will revert the receipt to draft, order to sent, and all batches to in-transit. The
          receipt can then be re-processed with correct data.
        </v-alert>

        <!-- Supplier Change -->
        <div v-if="correctionType === 'supplier_change'" class="mb-4">
          <div class="text-subtitle-2 mb-2">
            Current Supplier:
            <strong>{{ order?.supplierName }}</strong>
          </div>
          <v-autocomplete
            v-model="newSupplierId"
            :items="suppliers"
            item-title="displayName"
            item-value="id"
            label="New Supplier"
            density="compact"
            variant="outlined"
            hide-details
          />
        </div>

        <!-- Item Corrections Table -->
        <div
          v-if="correctionType === 'item_quantity' || correctionType === 'item_price'"
          class="mb-4"
        >
          <div class="text-subtitle-2 mb-2">
            {{ correctionType === 'item_quantity' ? 'Adjust Quantities' : 'Adjust Prices' }}
          </div>

          <v-table density="compact">
            <thead>
              <tr>
                <th>Item</th>
                <th class="text-center">Current</th>
                <th class="text-center">New Value</th>
                <th class="text-right">Impact</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in editableItems" :key="item.id">
                <td>
                  <div class="text-subtitle-2">{{ item.itemName }}</div>
                  <div class="text-caption text-medium-emphasis">{{ item.unit }}</div>
                </td>
                <td class="text-center">
                  <template v-if="correctionType === 'item_quantity'">
                    {{ item.currentQuantity }}
                  </template>
                  <template v-else>
                    {{ formatCurrency(item.currentBaseCost) }}
                  </template>
                </td>
                <td style="width: 160px">
                  <v-text-field
                    v-if="correctionType === 'item_quantity'"
                    v-model.number="item.newQuantity"
                    type="number"
                    inputmode="decimal"
                    density="compact"
                    variant="outlined"
                    hide-details
                    :min="0"
                    style="min-width: 120px"
                  />
                  <v-text-field
                    v-else
                    v-model.number="item.newBaseCost"
                    type="number"
                    inputmode="decimal"
                    density="compact"
                    variant="outlined"
                    hide-details
                    :min="0"
                    prefix="Rp"
                    style="min-width: 120px"
                  />
                </td>
                <td class="text-right">
                  <span :class="getItemImpactClass(item)">
                    {{ formatItemImpact(item) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </v-table>
        </div>

        <!-- Financial Impact Summary -->
        <v-card
          v-if="totalImpact !== 0 && correctionType !== 'full_reversal'"
          variant="outlined"
          class="mb-4 pa-3"
        >
          <div class="d-flex justify-space-between align-center">
            <div class="text-subtitle-2">Financial Impact</div>
            <div
              class="text-h6 font-weight-bold"
              :class="totalImpact > 0 ? 'text-error' : 'text-success'"
            >
              {{ totalImpact > 0 ? '+' : '' }}{{ formatCurrency(totalImpact) }}
            </div>
          </div>
        </v-card>

        <!-- Reason (required) -->
        <v-textarea
          v-model="reason"
          label="Reason for correction *"
          placeholder="Explain why this correction is needed..."
          variant="outlined"
          density="compact"
          rows="2"
          :rules="[v => !!v || 'Reason is required']"
          counter
        />
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4 border-t">
        <v-spacer />
        <v-btn variant="outlined" @click="closeDialog">Cancel</v-btn>
        <v-btn
          color="warning"
          variant="flat"
          :loading="isApplying"
          :disabled="!canApply"
          prepend-icon="mdi-check"
          @click="applyCorrection"
        >
          Apply Correction
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useReceiptCorrections } from '@/stores/supplier_2/composables/useReceiptCorrections'
import { useCounteragentsStore } from '@/stores/counteragents'
import type { Receipt, PurchaseOrder } from '@/stores/supplier_2/types'

interface Props {
  modelValue: boolean
  receipt: Receipt | null
  order: PurchaseOrder | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'correction-applied'): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

const {
  isApplying,
  applyItemCorrection,
  applySupplierChange,
  applyFullReversal,
  getBatchConsumptionStatus
} = useReceiptCorrections()

const counteragentsStore = useCounteragentsStore()

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

const correctionType = ref<string>('item_quantity')
const reason = ref('')
const newSupplierId = ref('')

interface EditableItem {
  id: string
  receiptItemId: string
  itemId: string
  itemName: string
  unit: string
  currentQuantity: number
  currentBaseCost: number
  newQuantity: number
  newBaseCost: number
}

const editableItems = ref<EditableItem[]>([])

const batchStatus = ref<{
  safe: boolean
  batches: Array<{
    batchId: string
    itemId: string
    initialQuantity: number
    currentQuantity: number
    consumed: number
  }>
}>({ safe: true, batches: [] })

const suppliers = computed(() => {
  return counteragentsStore.counteragents
    .filter(c => c.type === 'supplier' && c.isActive)
    .map(c => ({ id: c.id, displayName: c.displayName || c.name }))
})

const totalImpact = computed(() => {
  if (correctionType.value === 'item_quantity') {
    return editableItems.value.reduce((sum, item) => {
      const oldTotal = item.currentQuantity * item.currentBaseCost
      const newTotal = item.newQuantity * item.currentBaseCost
      return sum + (newTotal - oldTotal)
    }, 0)
  }
  if (correctionType.value === 'item_price') {
    return editableItems.value.reduce((sum, item) => {
      const oldTotal = item.currentQuantity * item.currentBaseCost
      const newTotal = item.currentQuantity * item.newBaseCost
      return sum + (newTotal - oldTotal)
    }, 0)
  }
  return 0
})

const hasChanges = computed(() => {
  if (correctionType.value === 'item_quantity') {
    return editableItems.value.some(i => i.newQuantity !== i.currentQuantity)
  }
  if (correctionType.value === 'item_price') {
    return editableItems.value.some(i => i.newBaseCost !== i.currentBaseCost)
  }
  if (correctionType.value === 'supplier_change') {
    return !!newSupplierId.value && newSupplierId.value !== props.order?.supplierId
  }
  if (correctionType.value === 'full_reversal') {
    return batchStatus.value.safe
  }
  return false
})

const canApply = computed(() => {
  return hasChanges.value && reason.value.trim().length > 0 && !isApplying.value
})

// Watch for dialog open - initialize data
watch(
  () => props.modelValue,
  async open => {
    if (open && props.receipt && props.order) {
      initializeItems()
      reason.value = ''
      correctionType.value = 'item_quantity'
      newSupplierId.value = ''

      // Check batch consumption
      const status = await getBatchConsumptionStatus(props.order.id)
      batchStatus.value = status
    }
  }
)

function initializeItems() {
  if (!props.receipt) return
  editableItems.value = props.receipt.items.map(item => ({
    id: item.id,
    receiptItemId: item.id,
    itemId: item.itemId,
    itemName: item.itemName,
    unit: item.unit,
    currentQuantity: item.receivedQuantity,
    currentBaseCost: item.actualBaseCost || item.orderedBaseCost,
    newQuantity: item.receivedQuantity,
    newBaseCost: item.actualBaseCost || item.orderedBaseCost
  }))
}

function getItemImpactClass(item: EditableItem): string {
  let impact = 0
  if (correctionType.value === 'item_quantity') {
    impact = (item.newQuantity - item.currentQuantity) * item.currentBaseCost
  } else {
    impact = item.currentQuantity * (item.newBaseCost - item.currentBaseCost)
  }
  if (Math.abs(impact) < 1) return 'text-medium-emphasis'
  return impact > 0 ? 'text-error' : 'text-success'
}

function formatItemImpact(item: EditableItem): string {
  let impact = 0
  if (correctionType.value === 'item_quantity') {
    impact = (item.newQuantity - item.currentQuantity) * item.currentBaseCost
  } else {
    impact = item.currentQuantity * (item.newBaseCost - item.currentBaseCost)
  }
  if (Math.abs(impact) < 1) return '-'
  return (impact > 0 ? '+' : '') + formatCurrency(impact)
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

async function applyCorrection() {
  if (!props.receipt || !props.order || !canApply.value) return

  try {
    if (correctionType.value === 'item_quantity' || correctionType.value === 'item_price') {
      const changedItems = editableItems.value
        .filter(i =>
          correctionType.value === 'item_quantity'
            ? i.newQuantity !== i.currentQuantity
            : i.newBaseCost !== i.currentBaseCost
        )
        .map(i => ({
          receiptItemId: i.receiptItemId,
          itemId: i.itemId,
          newQuantity: i.newQuantity,
          newBaseCost: i.newBaseCost
        }))

      await applyItemCorrection(
        props.receipt.id,
        props.order.id,
        correctionType.value as 'item_quantity' | 'item_price',
        changedItems,
        reason.value
      )
    } else if (correctionType.value === 'supplier_change') {
      const supplier = suppliers.value.find(s => s.id === newSupplierId.value)
      await applySupplierChange(
        props.receipt.id,
        props.order.id,
        newSupplierId.value,
        supplier?.displayName || newSupplierId.value,
        reason.value
      )
    } else if (correctionType.value === 'full_reversal') {
      await applyFullReversal(props.receipt.id, props.order.id, reason.value)
    }

    emits('correction-applied')
    closeDialog()
  } catch (error) {
    console.error('Failed to apply correction:', error)
  }
}

function closeDialog() {
  isOpen.value = false
}
</script>

<style lang="scss" scoped>
.border-t {
  border-top: 1px solid rgb(var(--v-theme-surface-variant));
}

.text-medium-emphasis {
  opacity: 0.7;
}
</style>
