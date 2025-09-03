<template>
  <v-dialog
    :model-value="open"
    max-width="900px"
    persistent
    @update:model-value="$emit('update:open', $event)"
  >
    <v-card>
      <!-- Заголовок -->
      <v-card-title class="d-flex align-center justify-space-between pa-4">
        <div>
          <div class="text-h6">{{ dialogTitle }}</div>
          <div v-if="orderData" class="text-caption text-medium-emphasis">
            Order: {{ orderData.orderNumber }} | {{ orderData.supplierName }}
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="$emit('update:open', false)" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-0">
        <!-- Текущие счета заказа -->
        <div v-if="linkedBills.length > 0" class="pa-4 bg-grey-lighten-5">
          <div class="text-subtitle-1 font-weight-bold mb-3">
            <v-icon icon="mdi-receipt-text" class="mr-2" />
            Linked Bills ({{ linkedBills.length }})
          </div>

          <div class="d-flex flex-column gap-2">
            <v-card v-for="bill in linkedBills" :key="bill.id" variant="outlined" class="pa-3">
              <div class="d-flex justify-space-between align-center">
                <div>
                  <div class="font-weight-medium">{{ bill.description }}</div>
                  <div class="text-caption text-medium-emphasis">
                    Bill ID: {{ bill.id }} | Invoice: {{ bill.invoiceNumber }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-h6 font-weight-bold">
                    {{ formatCurrency(bill.amount) }}
                  </div>
                  <v-chip :color="getStatusColor(bill.status)" size="small" variant="flat">
                    {{ getStatusText(bill.status) }}
                  </v-chip>
                </div>
                <div class="ml-3">
                  <v-btn
                    icon="mdi-eye"
                    variant="text"
                    size="small"
                    color="info"
                    @click="$emit('view-bill', bill.id)"
                  />
                  <v-btn
                    v-if="bill.status === 'pending'"
                    icon="mdi-link-off"
                    variant="text"
                    size="small"
                    color="warning"
                    @click="$emit('detach-bill', bill.id)"
                  />
                </div>
              </div>
            </v-card>
          </div>

          <!-- Итого по счетам -->
          <v-divider class="my-3" />
          <div class="d-flex justify-space-between align-center">
            <div class="text-subtitle-2">Total Bills:</div>
            <div class="text-h6 font-weight-bold">
              {{ formatCurrency(totalBillsAmount) }}
            </div>
          </div>
          <div class="d-flex justify-space-between align-center">
            <div class="text-subtitle-2">Order Amount:</div>
            <div class="text-subtitle-1" :class="amountDifferenceClass">
              {{ formatCurrency(orderData?.totalAmount || 0) }}
            </div>
          </div>
          <div v-if="hasAmountDifference" class="d-flex justify-space-between align-center">
            <div class="text-subtitle-2 text-warning">Difference:</div>
            <div class="text-subtitle-1 font-weight-bold text-warning">
              {{ formatCurrency(Math.abs(amountDifference)) }}
              {{ amountDifference > 0 ? '(Over-billed)' : '(Under-billed)' }}
            </div>
          </div>
        </div>

        <!-- Основной контент диалога -->
        <div class="pa-4">
          <!-- Режим создания нового счета -->
          <div v-if="mode === 'create'">
            <div class="text-subtitle-1 mb-4">
              <v-icon icon="mdi-plus-circle" class="mr-2" color="primary" />
              Create New Bill
            </div>

            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="form.amount"
                  label="Amount"
                  type="number"
                  variant="outlined"
                  suffix="IDR"
                  :placeholder="orderData?.totalAmount?.toString()"
                  :rules="[v => v > 0 || 'Amount must be greater than 0']"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="form.priority"
                  :items="priorityOptions"
                  label="Priority"
                  variant="outlined"
                />
              </v-col>
            </v-row>

            <v-textarea
              v-model="form.description"
              label="Description"
              variant="outlined"
              rows="2"
              :placeholder="`Payment for order ${orderData?.orderNumber}`"
            />
          </div>

          <!-- Режим привязки существующего счета -->
          <div v-else-if="mode === 'attach'">
            <div class="text-subtitle-1 mb-4">
              <v-icon icon="mdi-link" class="mr-2" color="primary" />
              Attach Existing Bill
            </div>

            <v-select
              v-model="form.existingBillId"
              :items="availableBillItems"
              label="Select Bill to Attach"
              variant="outlined"
              :rules="[v => !!v || 'Please select a bill']"
            >
              <template #item="{ item, props: itemProps }">
                <v-list-item v-bind="itemProps">
                  <template #title>{{ item.raw.description }}</template>
                  <template #subtitle>
                    {{ formatCurrency(item.raw.amount) }} | {{ item.raw.counteragentName }}
                  </template>
                </v-list-item>
              </template>
            </v-select>

            <v-alert v-if="availableBills.length === 0" type="info" variant="tonal" class="mt-3">
              No available bills found for this supplier.
            </v-alert>
          </div>

          <!-- Режим просмотра -->
          <div v-else-if="mode === 'view' && currentBill">
            <div class="text-subtitle-1 mb-4">
              <v-icon icon="mdi-eye" class="mr-2" color="info" />
              Bill Information
            </div>

            <v-card variant="outlined">
              <v-card-text>
                <v-row>
                  <v-col cols="12" md="6">
                    <div class="mb-3">
                      <div class="text-caption text-medium-emphasis">Amount</div>
                      <div class="text-h5 font-weight-bold">
                        {{ formatCurrency(currentBill.amount) }}
                      </div>
                    </div>

                    <div class="mb-3">
                      <div class="text-caption text-medium-emphasis">Status</div>
                      <v-chip
                        :color="getStatusColor(currentBill.status)"
                        size="small"
                        variant="flat"
                      >
                        {{ getStatusText(currentBill.status) }}
                      </v-chip>
                    </div>
                  </v-col>

                  <v-col cols="12" md="6">
                    <div class="mb-3">
                      <div class="text-caption text-medium-emphasis">Description</div>
                      <div>{{ currentBill.description }}</div>
                    </div>

                    <div v-if="currentBill.dueDate" class="mb-3">
                      <div class="text-caption text-medium-emphasis">Due Date</div>
                      <div>{{ formatDate(currentBill.dueDate) }}</div>
                    </div>
                  </v-col>
                </v-row>

                <!-- История изменений -->
                <div v-if="currentBill.amountHistory?.length" class="mt-4">
                  <div class="text-caption text-medium-emphasis mb-2">Amount History</div>
                  <div class="history-list">
                    <div
                      v-for="change in currentBill.amountHistory"
                      :key="change.timestamp"
                      class="d-flex justify-space-between align-center py-1 text-caption"
                    >
                      <span>{{ change.reason }}</span>
                      <span>
                        {{ formatCurrency(change.oldAmount) }} →
                        {{ formatCurrency(change.newAmount) }}
                      </span>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- Ошибки -->
          <v-alert v-if="error" type="error" variant="tonal" class="mt-4">
            {{ error }}
          </v-alert>
        </div>
      </v-card-text>

      <!-- Действия -->
      <v-card-actions class="px-6 pb-6">
        <v-spacer />

        <!-- Кнопка отмены -->
        <v-btn variant="text" @click="$emit('update:open', false)">Cancel</v-btn>

        <!-- Кнопки действий по режиму -->
        <v-btn
          v-if="mode === 'create'"
          color="primary"
          variant="elevated"
          :loading="loading"
          :disabled="!canCreate"
          @click="handleCreate"
        >
          <v-icon icon="mdi-plus" class="mr-2" />
          Create Bill
        </v-btn>

        <v-btn
          v-if="mode === 'attach'"
          color="primary"
          variant="elevated"
          :loading="loading"
          :disabled="!canAttach"
          @click="handleAttach"
        >
          <v-icon icon="mdi-link" class="mr-2" />
          Attach Bill
        </v-btn>

        <v-btn
          v-if="mode === 'view' && currentBill?.status === 'pending'"
          color="success"
          variant="elevated"
          :loading="loading"
          @click="$emit('process-payment', currentBill.id)"
        >
          <v-icon icon="mdi-credit-card" class="mr-2" />
          Process Payment
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PendingPayment } from '@/stores/account/types'
import type { PurchaseOrder } from '@/stores/supplier_2/types'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  open: boolean
  mode: 'create' | 'view' | 'attach'
  orderData?: PurchaseOrder | null
  linkedBills?: PendingPayment[] // ✅ НОВОЕ: Связанные счета
  availableBills?: PendingPayment[]
  loading?: boolean
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  linkedBills: () => [], // ✅ НОВОЕ
  availableBills: () => [],
  loading: false,
  error: null
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'create-bill': [data: CreateBillData]
  'attach-bill': [billId: string]
  'detach-bill': [billId: string]
  'process-payment': [billId: string]
  'view-bill': [billId: string] // ✅ НОВОЕ
}>()

// =============================================
// TYPES
// =============================================

interface CreateBillData {
  amount: number
  priority: string
  description: string
}

// =============================================
// FORM STATE
// =============================================

const form = ref<CreateBillData & { existingBillId?: string }>({
  amount: 0,
  priority: 'medium',
  description: '',
  existingBillId: undefined
})

// =============================================
// COMPUTED
// =============================================

const dialogTitle = computed(() => {
  switch (props.mode) {
    case 'create':
      return 'Create New Bill'
    case 'attach':
      return 'Attach Existing Bill'
    case 'view':
      return 'Manage Payment'
    default:
      return 'Payment Management'
  }
})

const priorityOptions = [
  { title: 'Low', value: 'low' },
  { title: 'Medium', value: 'medium' },
  { title: 'High', value: 'high' },
  { title: 'Urgent', value: 'urgent' }
]

const availableBillItems = computed(() =>
  props.availableBills.map(bill => ({
    title: bill.description,
    value: bill.id,
    ...bill
  }))
)

// ✅ НОВЫЕ computed для связанных счетов
const totalBillsAmount = computed(() =>
  props.linkedBills.reduce((sum, bill) => sum + bill.amount, 0)
)

const amountDifference = computed(
  () => totalBillsAmount.value - (props.orderData?.totalAmount || 0)
)

const hasAmountDifference = computed(() => Math.abs(amountDifference.value) > 1)

const amountDifferenceClass = computed(() => {
  if (!hasAmountDifference.value) return ''
  return amountDifference.value > 0 ? 'text-warning' : 'text-error'
})

const canCreate = computed(() => {
  return form.value.amount > 0 && form.value.description.trim() !== '' && !props.loading
})

const canAttach = computed(() => {
  return !!form.value.existingBillId && !props.loading
})

// =============================================
// WATCHERS
// =============================================

// Заполняем форму при открытии
watch(
  () => props.open,
  isOpen => {
    if (isOpen && props.mode === 'create' && props.orderData) {
      // Если уже есть счета, предлагаем разницу
      const remainingAmount = (props.orderData.totalAmount || 0) - totalBillsAmount.value

      form.value.amount = Math.max(0, remainingAmount)
      form.value.description = `Payment for order ${props.orderData.orderNumber}${
        props.linkedBills.length > 0 ? ` (additional)` : ''
      }`
    }
  }
)

// =============================================
// METHODS
// =============================================

function handleCreate(): void {
  if (!canCreate.value) return

  emit('create-bill', {
    amount: form.value.amount,
    priority: form.value.priority,
    description: form.value.description
  })
}

function handleAttach(): void {
  if (!canAttach.value || !form.value.existingBillId) return

  emit('attach-bill', form.value.existingBillId)
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending':
      return 'grey'
    case 'processing':
      return 'warning'
    case 'completed':
      return 'success'
    case 'failed':
      return 'error'
    default:
      return 'grey'
  }
}

function getStatusText(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pending'
    case 'processing':
      return 'Processing'
    case 'completed':
      return 'Paid'
    case 'failed':
      return 'Failed'
    default:
      return status
  }
}
</script>

<style scoped>
.history-list {
  max-height: 200px;
  overflow-y: auto;
}

.gap-2 {
  gap: 8px;
}
</style>
