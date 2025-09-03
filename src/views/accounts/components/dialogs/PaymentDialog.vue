<template>
  <v-dialog
    :model-value="open"
    max-width="800px"
    persistent
    @update:model-value="$emit('update:open', $event)"
  >
    <v-card>
      <!-- Заголовок -->
      <v-card-title class="d-flex align-center justify-space-between">
        <span>{{ dialogTitle }}</span>
        <v-btn icon="mdi-close" variant="text" size="small" @click="$emit('update:open', false)" />
      </v-card-title>

      <v-divider />

      <!-- Контент -->
      <v-card-text class="pa-6">
        <!-- Режим создания -->
        <div v-if="mode === 'create'">
          <div class="text-subtitle-1 mb-4">
            Create new bill for order {{ orderData?.orderNumber }}
          </div>

          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="form.amount"
                label="Amount"
                type="number"
                variant="outlined"
                :suffix="'IDR'"
                :placeholder="orderData?.totalAmount?.toString()"
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

        <!-- Режим просмотра -->
        <div v-else-if="mode === 'view' && currentBill">
          <div class="mb-4">
            <v-row>
              <!-- Основная информация -->
              <v-col cols="12" md="8">
                <div class="text-subtitle-1 mb-2">
                  {{ currentBill.description || 'Bill #' + currentBill.id }}
                </div>

                <div class="d-flex align-center mb-2">
                  <span class="text-h6">{{ formatCurrency(currentBill.amount) }}</span>
                  <v-chip
                    :color="getStatusColor(currentBill.status)"
                    size="small"
                    variant="flat"
                    class="ml-3"
                  >
                    {{ getStatusText(currentBill.status) }}
                  </v-chip>
                </div>

                <div
                  v-if="currentBill.paidAmount && currentBill.paidAmount > 0"
                  class="text-body-2 text-grey-400"
                >
                  Paid: {{ formatCurrency(currentBill.paidAmount) }} | Remaining:
                  {{ formatCurrency(currentBill.amount - currentBill.paidAmount) }}
                </div>
              </v-col>

              <!-- Действия -->
              <v-col cols="12" md="4" class="text-right">
                <v-btn
                  v-if="currentBill.status === 'pending'"
                  color="primary"
                  variant="elevated"
                  class="mb-2"
                  @click="$emit('process-payment', currentBill.id)"
                >
                  Process Payment
                </v-btn>

                <br />

                <v-btn variant="text" size="small" @click="$emit('detach-bill', currentBill.id)">
                  Detach from Order
                </v-btn>
              </v-col>
            </v-row>
          </div>

          <!-- История изменений -->
          <div v-if="currentBill.amountHistory && currentBill.amountHistory.length > 0">
            <v-divider class="my-4" />
            <div class="text-subtitle-2 mb-3">Amount History</div>

            <div class="history-list">
              <div
                v-for="change in currentBill.amountHistory"
                :key="change.timestamp"
                class="d-flex align-center justify-space-between py-1"
              >
                <span class="text-body-2">{{ change.reason.replace('_', ' ') }}</span>
                <span class="text-caption text-grey-400">
                  {{ formatCurrency(change.oldAmount) }} → {{ formatCurrency(change.newAmount) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Режим привязки существующего счета -->
        <div v-else-if="mode === 'attach'">
          <div class="text-subtitle-1 mb-4">
            Attach existing bill to order {{ orderData?.orderNumber }}
          </div>

          <!-- TODO: Список доступных счетов поставщика -->
          <v-select
            v-model="form.existingBillId"
            :items="availableBills"
            item-title="description"
            item-value="id"
            label="Select existing bill"
            variant="outlined"
          >
            <template #item="{ props: itemProps, item }">
              <v-list-item v-bind="itemProps">
                <template #title>{{ item.raw.description }}</template>
                <template #subtitle>
                  {{ formatCurrency(item.raw.amount) }} - {{ getStatusText(item.raw.status) }}
                </template>
              </v-list-item>
            </template>
          </v-select>
        </div>

        <!-- Ошибки -->
        <v-alert v-if="error" type="error" variant="tonal" class="mt-4">
          {{ error }}
        </v-alert>
      </v-card-text>

      <!-- Действия -->
      <v-card-actions class="px-6 pb-6">
        <v-spacer />

        <v-btn variant="text" @click="$emit('update:open', false)">Cancel</v-btn>

        <v-btn
          v-if="mode === 'create'"
          color="primary"
          variant="elevated"
          :loading="loading"
          :disabled="!canCreate"
          @click="handleCreate"
        >
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
          Attach Bill
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
  currentBill?: PendingPayment | null
  availableBills?: PendingPayment[]
  loading?: boolean
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
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
}>()

// =============================================
// FORM STATE
// =============================================

interface CreateBillData {
  amount: number
  priority: string
  description: string
}

const form = ref<CreateBillData & { existingBillId?: string }>({
  amount: 0,
  priority: 'medium',
  description: '',
  existingBillId: undefined
})

const priorityOptions = [
  { title: 'Low', value: 'low' },
  { title: 'Medium', value: 'medium' },
  { title: 'High', value: 'high' }
]

// =============================================
// COMPUTED
// =============================================

const dialogTitle = computed(() => {
  switch (props.mode) {
    case 'create':
      return 'Create Bill'
    case 'attach':
      return 'Attach Bill'
    case 'view':
      return 'Bill Details'
    default:
      return 'Bill'
  }
})

const canCreate = computed(() => {
  return form.value.amount > 0 && form.value.priority
})

const canAttach = computed(() => {
  return !!form.value.existingBillId
})

// =============================================
// WATCHERS
// =============================================

// Заполняем форму при открытии
watch(
  () => props.open,
  isOpen => {
    if (isOpen && props.mode === 'create' && props.orderData) {
      form.value.amount = props.orderData.totalAmount || 0
      form.value.description = `Payment for order ${props.orderData.orderNumber}`
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
      return 'Partial'
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
</style>
