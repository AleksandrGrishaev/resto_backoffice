<template>
  <v-dialog v-model="isOpen" max-width="800px">
    <v-card>
      <!-- Header -->
      <v-card-title class="d-flex align-center justify-space-between pa-4 bg-info text-white">
        <div>
          <div class="text-h6">Correction History</div>
          <div class="text-caption opacity-90">{{ receiptNumber }}</div>
        </div>
        <v-btn icon="mdi-close" variant="text" color="white" @click="isOpen = false" />
      </v-card-title>

      <v-card-text class="pa-4">
        <!-- Loading -->
        <div v-if="isLoadingHistory" class="d-flex justify-center pa-8">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <!-- Empty State -->
        <div v-else-if="corrections.length === 0" class="text-center pa-8 text-medium-emphasis">
          <v-icon icon="mdi-check-circle" size="48" color="success" class="mb-2" />
          <div class="text-subtitle-1">No corrections applied</div>
          <div class="text-body-2">This receipt has not been modified after completion.</div>
        </div>

        <!-- Timeline -->
        <v-timeline v-else density="compact" side="end">
          <v-timeline-item
            v-for="correction in corrections"
            :key="correction.id"
            :dot-color="getTypeColor(correction.correctionType)"
            size="small"
          >
            <v-card variant="outlined" class="mb-2">
              <v-card-text class="pa-3">
                <!-- Header -->
                <div class="d-flex align-center justify-space-between mb-2">
                  <div>
                    <v-chip
                      size="x-small"
                      :color="getTypeColor(correction.correctionType)"
                      variant="flat"
                      class="mr-2"
                    >
                      {{ getTypeLabel(correction.correctionType) }}
                    </v-chip>
                    <span class="text-caption text-medium-emphasis">
                      {{ correction.correctionNumber }}
                    </span>
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ formatDateTime(correction.createdAt) }}
                  </div>
                </div>

                <!-- Reason -->
                <div class="text-body-2 mb-2">
                  <strong>Reason:</strong>
                  {{ correction.reason }}
                </div>

                <!-- Corrected by -->
                <div v-if="correction.correctedBy" class="text-caption text-medium-emphasis mb-2">
                  By: {{ correction.correctedBy }}
                </div>

                <!-- Supplier Change -->
                <div v-if="correction.correctionType === 'supplier_change'" class="mb-2">
                  <div class="text-body-2">
                    {{ correction.oldSupplierName }}
                    <v-icon icon="mdi-arrow-right" size="14" class="mx-1" />
                    <strong>{{ correction.newSupplierName }}</strong>
                  </div>
                </div>

                <!-- Item Changes -->
                <div
                  v-if="correction.itemCorrections && correction.itemCorrections.length > 0"
                  class="mb-2"
                >
                  <v-table density="compact" class="correction-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th class="text-center">Old</th>
                        <th class="text-center">New</th>
                        <th class="text-right">Impact</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="item in correction.itemCorrections" :key="item.receiptItemId">
                        <td class="text-body-2">{{ item.itemName }}</td>
                        <td class="text-center text-body-2">
                          <template v-if="item.oldQuantity !== item.newQuantity">
                            {{ item.oldQuantity }}
                          </template>
                          <template v-else>{{ formatCurrency(item.oldBaseCost) }}/u</template>
                        </td>
                        <td class="text-center text-body-2 font-weight-bold">
                          <template v-if="item.oldQuantity !== item.newQuantity">
                            {{ item.newQuantity }}
                          </template>
                          <template v-else>{{ formatCurrency(item.newBaseCost) }}/u</template>
                        </td>
                        <td
                          class="text-right text-body-2"
                          :class="item.financialImpact > 0 ? 'text-error' : 'text-success'"
                        >
                          {{ item.financialImpact > 0 ? '+' : ''
                          }}{{ formatCurrency(item.financialImpact) }}
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </div>

                <!-- Full Reversal Batch Info -->
                <div
                  v-if="
                    correction.correctionType === 'full_reversal' &&
                    correction.batchAdjustments.length > 0
                  "
                  class="mb-2"
                >
                  <div class="text-caption text-medium-emphasis">
                    {{ correction.batchAdjustments.length }} batches reverted to in-transit
                  </div>
                </div>

                <!-- Financial Impact -->
                <div
                  v-if="correction.financialImpact && Math.abs(correction.financialImpact) > 0"
                  class="d-flex justify-end"
                >
                  <v-chip
                    size="small"
                    :color="correction.financialImpact > 0 ? 'error' : 'success'"
                    variant="tonal"
                  >
                    {{ correction.financialImpact > 0 ? '+' : ''
                    }}{{ formatCurrency(correction.financialImpact) }}
                  </v-chip>
                </div>
              </v-card-text>
            </v-card>
          </v-timeline-item>
        </v-timeline>
      </v-card-text>

      <v-card-actions class="pa-4 border-t">
        <v-spacer />
        <v-btn variant="outlined" @click="isOpen = false">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useReceiptCorrections } from '@/stores/supplier_2/composables/useReceiptCorrections'
import type { ReceiptCorrection, CorrectionType } from '@/stores/supplier_2/types'
import { CORRECTION_TYPES } from '@/stores/supplier_2/types'

interface Props {
  modelValue: boolean
  receiptId: string | null
  receiptNumber: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

const { getCorrectionHistory, isLoadingHistory } = useReceiptCorrections()

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

const corrections = ref<ReceiptCorrection[]>([])

watch(
  () => props.modelValue,
  async open => {
    if (open && props.receiptId) {
      corrections.value = await getCorrectionHistory(props.receiptId)
    }
  }
)

function getTypeColor(type: CorrectionType): string {
  const colors: Record<string, string> = {
    item_quantity: 'blue',
    item_price: 'orange',
    supplier_change: 'purple',
    full_reversal: 'red'
  }
  return colors[type] || 'grey'
}

function getTypeLabel(type: CorrectionType): string {
  return CORRECTION_TYPES[type] || type
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<style lang="scss" scoped>
.border-t {
  border-top: 1px solid rgb(var(--v-theme-surface-variant));
}

.text-medium-emphasis {
  opacity: 0.7;
}

.correction-table {
  :deep(th),
  :deep(td) {
    padding: 4px 8px !important;
    font-size: 0.8125rem;
  }
}
</style>
