<!-- src/views/supplier_2/components/orders/AttachBillDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="600px">
    <v-card>
      <v-card-title>Attach Existing Bill</v-card-title>

      <v-card-text>
        <div v-if="availableBills.length === 0" class="text-center pa-4">
          <v-icon icon="mdi-receipt-text-outline" size="48" color="grey-lighten-1" class="mb-3" />
          <div class="text-h6 text-medium-emphasis mb-2">No Available Bills</div>
          <div class="text-body-2 text-medium-emphasis">
            There are no unattached bills for {{ order?.supplierName }}
          </div>
        </div>

        <div v-else>
          <div class="text-body-2 text-medium-emphasis mb-4">
            Select a bill to attach to order {{ order?.orderNumber }}:
          </div>

          <v-list>
            <v-list-item
              v-for="bill in availableBills"
              :key="bill.id"
              :value="bill.id"
              @click="selectedBillId = bill.id"
            >
              <template #prepend>
                <v-radio :model-value="selectedBillId" :value="bill.id" color="primary" />
              </template>

              <!-- ✅ ОБНОВЛЕННОЕ ОТОБРАЖЕНИЕ с поддержкой переплат -->
              <v-list-item-title>
                <div class="d-flex align-center">
                  <!-- Основное название -->
                  <span>{{ bill.description }}</span>

                  <!-- Индикатор переплаты -->
                  <v-chip
                    v-if="bill.isOverpayment"
                    size="x-small"
                    color="warning"
                    variant="flat"
                    class="ml-2"
                  >
                    Overpaid
                  </v-chip>

                  <!-- Индикатор кредита -->
                  <v-chip
                    v-if="bill.description.includes('credit')"
                    size="x-small"
                    color="success"
                    variant="flat"
                    class="ml-2"
                  >
                    Credit
                  </v-chip>
                </div>
              </v-list-item-title>

              <v-list-item-subtitle>
                <!-- ✅ Показываем доступную сумму vs полную сумму -->
                <div v-if="bill.isOverpayment" class="d-flex flex-column gap-1">
                  <!-- Для переплаченных счетов показываем детали -->
                  <div>
                    <span class="text-medium-emphasis">Original:</span>
                    {{ formatCurrency(bill.amount) }}
                    <span class="text-medium-emphasis">• Available:</span>
                    <span class="text-success font-weight-bold">
                      {{ formatCurrency(bill.availableAmount) }}
                    </span>
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    From order {{ bill.originalOrderNumber }} • {{ bill.priority }} priority
                  </div>
                </div>

                <div v-else>
                  <!-- Для обычных счетов/кредитов -->
                  {{ formatCurrency(bill.availableAmount || bill.amount) }} •
                  {{ bill.priority }} priority
                  <span v-if="bill.dueDate">• Due: {{ formatDate(bill.dueDate) }}</span>
                </div>
              </v-list-item-subtitle>

              <!-- ✅ Дополнительные детали для переплат -->
              <template v-if="bill.isOverpayment" #append>
                <v-tooltip location="top">
                  <template #activator="{ props: tooltipProps }">
                    <v-icon
                      v-bind="tooltipProps"
                      icon="mdi-information-outline"
                      size="small"
                      color="grey"
                    />
                  </template>
                  <div>
                    <div>Original payment: {{ formatCurrency(bill.amount) }}</div>
                    <div>
                      Order delivered: {{ formatCurrency(bill.amount - bill.availableAmount) }}
                    </div>
                    <div>Available overpayment: {{ formatCurrency(bill.availableAmount) }}</div>
                  </div>
                </v-tooltip>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="handleCancel">Cancel</v-btn>
        <v-btn color="primary" :disabled="!selectedBillId" :loading="loading" @click="handleSubmit">
          Attach Bill
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PurchaseOrder } from '@/stores/supplier_2/types'
import type { PendingPayment } from '@/stores/account/types'

// =============================================
// PROPS & EMITS
// =============================================

interface BillWithMetadata extends PendingPayment {
  availableAmount?: number
  isOverpayment?: boolean
  originalOrderNumber?: string
}

interface Props {
  modelValue: boolean
  order: PurchaseOrder | null
  availableBills: BillWithMetadata[]
  loading?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'attach-bill', billId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emits = defineEmits<Emits>()

// =============================================
// LOCAL STATE
// =============================================

const selectedBillId = ref<string | null>(null)

// =============================================
// COMPUTED
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

// =============================================
// METHODS
// =============================================

function handleSubmit() {
  if (!selectedBillId.value) return

  emits('attach-bill', selectedBillId.value)
  handleCancel() // Закрываем диалог после отправки
}

function handleCancel() {
  selectedBillId.value = null
  isOpen.value = false
}

// =============================================
// UTILITIES
// =============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function formatDate(date: string | Date): string {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('id-ID')
}
</script>
