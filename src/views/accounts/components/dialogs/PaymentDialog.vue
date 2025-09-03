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
        <div v-if="props.linkedBills.length > 0" class="pa-4 bg-grey-lighten-5">
          <div class="text-subtitle-1 font-weight-bold mb-3">
            <v-icon icon="mdi-receipt-text" class="mr-2" />
            Linked Bills ({{ linkedBills.length }})
          </div>

          <div class="d-flex flex-column gap-2">
            <v-card v-for="bill in linkedBills" :key="bill.id" variant="outlined" class="pa-3">
              <div class="d-flex justify-space-between align-center">
                <div class="flex-grow-1">
                  <div class="font-weight-medium">{{ bill.description }}</div>
                  <div class="text-caption text-medium-emphasis">
                    Bill ID: {{ bill.id }} | Invoice: {{ bill.invoiceNumber }}
                  </div>
                  <div v-if="bill.dueDate" class="text-caption">
                    Due: {{ formatDate(bill.dueDate) }}
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
                <!-- ✅ Улучшенные действия -->
                <div class="ml-3 d-flex gap-1">
                  <v-tooltip text="View Bill Details">
                    <template #activator="{ props: tooltipProps }">
                      <v-btn
                        v-bind="tooltipProps"
                        icon="mdi-eye"
                        variant="text"
                        size="small"
                        color="info"
                        @click="$emit('view-bill', bill.id)"
                      />
                    </template>
                  </v-tooltip>

                  <v-tooltip text="Detach Bill">
                    <template #activator="{ props: tooltipProps }">
                      <v-btn
                        v-if="bill.status === 'pending'"
                        v-bind="tooltipProps"
                        icon="mdi-link-off"
                        variant="text"
                        size="small"
                        color="warning"
                        @click="$emit('detach-bill', bill.id)"
                      />
                    </template>
                  </v-tooltip>

                  <!-- ✅ Меню дополнительных действий -->
                  <v-menu v-if="bill.status === 'pending'">
                    <template #activator="{ props: menuProps }">
                      <v-btn
                        v-bind="menuProps"
                        icon="mdi-dots-vertical"
                        variant="text"
                        size="small"
                      />
                    </template>
                    <v-list density="compact">
                      <v-list-item @click="$emit('edit-bill', bill.id)">
                        <template #prepend>
                          <v-icon icon="mdi-pencil" />
                        </template>
                        <v-list-item-title>Edit Amount</v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="$emit('process-payment', bill.id)">
                        <template #prepend>
                          <v-icon icon="mdi-credit-card" />
                        </template>
                        <v-list-item-title>Process Payment</v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                </div>
              </div>
            </v-card>
          </div>

          <!-- ✅ Финансовая сводка с улучшенными индикаторами -->
          <v-card v-if="orderData" variant="outlined" class="mt-3">
            <v-card-text class="pa-3">
              <div class="d-flex justify-space-between align-center mb-2">
                <span class="text-subtitle-2">Financial Summary</span>
                <v-chip
                  v-if="hasAmountDifference"
                  :color="amountDifference > 0 ? 'warning' : 'error'"
                  size="small"
                  variant="tonal"
                >
                  <v-icon
                    :icon="amountDifference > 0 ? 'mdi-trending-up' : 'mdi-trending-down'"
                    class="mr-1"
                  />
                  {{ amountDifference > 0 ? 'Over-billed' : 'Under-billed' }}
                </v-chip>
              </div>

              <v-row dense>
                <v-col cols="4">
                  <div class="text-caption text-medium-emphasis">Order Amount</div>
                  <div class="font-weight-bold">{{ formatCurrency(orderData.totalAmount) }}</div>
                </v-col>
                <v-col cols="4">
                  <div class="text-caption text-medium-emphasis">Billed Amount</div>
                  <div class="font-weight-bold">{{ formatCurrency(totalBillsAmount) }}</div>
                </v-col>
                <v-col cols="4">
                  <div class="text-caption text-medium-emphasis">Difference</div>
                  <div :class="[amountDifferenceClass, 'font-weight-bold']">
                    {{ formatCurrency(Math.abs(amountDifference)) }}
                    {{ amountDifference > 0 ? '(Over)' : amountDifference < 0 ? '(Under)' : '' }}
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </div>

        <!-- Основной контент диалога -->
        <div class="pa-4">
          <!-- ✅ Режим создания нового счета -->
          <div v-if="currentMode === 'create'">
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
                  :placeholder="suggestedAmount.toString()"
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
              :placeholder="suggestedDescription"
            />

            <!-- ✅ Предупреждения при создании -->
            <v-alert
              v-if="form.amount > 0 && wouldOverpay"
              type="warning"
              variant="tonal"
              density="compact"
              class="mt-3"
            >
              <div class="d-flex align-center">
                <v-icon icon="mdi-alert-circle" class="mr-2" />
                <span class="text-caption">
                  This will result in over-billing by {{ formatCurrency(potentialOverpay) }}
                </span>
              </div>
            </v-alert>
          </div>

          <!-- ✅ Режим привязки существующего счета -->
          <div v-else-if="currentMode === 'attach'">
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

            <!-- ✅ Предупреждение о совместимости сумм -->
            <v-alert
              v-if="selectedBillForAttach && attachmentOverpay > 1"
              type="warning"
              variant="tonal"
              density="compact"
              class="mt-3"
            >
              <div class="d-flex align-center">
                <v-icon icon="mdi-alert-circle" class="mr-2" />
                <span class="text-caption">
                  Attaching this bill will result in over-billing by
                  {{ formatCurrency(attachmentOverpay) }}
                </span>
              </div>
            </v-alert>
          </div>

          <!-- ✅ Режим просмотра - показываем все счета с действиями -->
          <div v-else-if="currentMode === 'view'">
            <div class="text-subtitle-1 mb-4">
              <v-icon icon="mdi-receipt-text-check" class="mr-2" color="info" />
              Bills Management
            </div>

            <!-- ✅ Empty State -->
            <div v-if="props.linkedBills.length === 0" class="text-center pa-8">
              <v-icon
                icon="mdi-receipt-text-outline"
                size="64"
                color="grey-lighten-1"
                class="mb-4"
              />
              <div class="text-h6 text-medium-emphasis mb-2">No Bills Created</div>
              <div class="text-body-2 text-medium-emphasis mb-4">
                Create or link bills to manage payments for this order
              </div>
              <div class="d-flex gap-3 justify-center">
                <v-btn
                  color="primary"
                  variant="elevated"
                  prepend-icon="mdi-plus"
                  @click="switchToCreateMode"
                >
                  Create New Bill
                </v-btn>
                <v-btn
                  color="primary"
                  variant="outlined"
                  prepend-icon="mdi-link"
                  @click="switchToAttachMode"
                >
                  Link Existing Bill
                </v-btn>
              </div>
            </div>

            <!-- ✅ Bills exist - показываем действия -->
            <div v-else>
              <div class="d-flex justify-space-between align-center mb-4">
                <span class="text-subtitle-2">
                  {{ linkedBills.length }} bill{{ linkedBills.length > 1 ? 's' : '' }} linked
                </span>
                <div class="d-flex gap-2">
                  <v-btn
                    color="primary"
                    variant="outlined"
                    size="small"
                    prepend-icon="mdi-plus"
                    @click="switchToCreateMode"
                  >
                    Create Additional Bill
                  </v-btn>
                  <v-btn
                    color="primary"
                    variant="outlined"
                    size="small"
                    prepend-icon="mdi-link"
                    @click="switchToAttachMode"
                  >
                    Link Another Bill
                  </v-btn>
                </div>
              </div>

              <!-- ✅ Информация о завершении -->
              <v-alert
                v-if="allBillsPaid"
                type="success"
                variant="tonal"
                density="compact"
                class="mb-4"
              >
                <div class="d-flex align-center">
                  <v-icon icon="mdi-check-circle" class="mr-2" />
                  <span>All bills for this order have been paid</span>
                </div>
              </v-alert>

              <v-alert
                v-else-if="hasPendingBills"
                type="info"
                variant="tonal"
                density="compact"
                class="mb-4"
              >
                <div class="d-flex align-center">
                  <v-icon icon="mdi-information" class="mr-2" />
                  <span>
                    {{ pendingBillsCount }} pending bill{{ pendingBillsCount > 1 ? 's' : '' }}
                    awaiting payment
                  </span>
                </div>
              </v-alert>
            </div>
          </div>

          <!-- Ошибки -->
          <v-alert v-if="error" type="error" variant="tonal" class="mt-4">
            {{ error }}
          </v-alert>
        </div>
      </v-card-text>

      <!-- ✅ Улучшенные действия -->
      <v-card-actions class="px-6 pb-6">
        <!-- ✅ Кнопка Back в режимах create/attach -->
        <v-btn
          v-if="currentMode !== 'view' && props.linkedBills.length > 0"
          variant="outlined"
          prepend-icon="mdi-arrow-left"
          @click="switchToViewMode"
        >
          Back to Bills
        </v-btn>

        <v-spacer />

        <!-- Кнопка отмены -->
        <v-btn variant="text" @click="$emit('update:open', false)">Cancel</v-btn>

        <!-- ✅ Кнопки действий по режиму -->
        <v-btn
          v-if="currentMode === 'create'"
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
          v-if="currentMode === 'attach'"
          color="primary"
          variant="elevated"
          :loading="loading"
          :disabled="!canAttach"
          @click="handleAttach"
        >
          <v-icon icon="mdi-link" class="mr-2" />
          Attach Bill
        </v-btn>

        <!-- ✅ В режиме view показываем навигацию в Accounts модуль -->
        <v-btn
          v-if="currentMode === 'view' && props.linkedBills.length > 0"
          color="info"
          variant="elevated"
          prepend-icon="mdi-open-in-new"
          @click="navigateToAccounts"
        >
          Open in Accounts Module
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PendingPayment } from '@/stores/account/types'
import type { PurchaseOrder } from '@/stores/supplier_2/types'
import BillCard from './BillCard.vue'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  open: boolean
  mode: 'create' | 'view' | 'attach'
  orderData?: PurchaseOrder | null
  linkedBills?: PendingPayment[]
  availableBills?: PendingPayment[]
  loading?: boolean
  error?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  linkedBills: () => [],
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
  'view-bill': [billId: string]
  'edit-bill': [billId: string]
  'navigate-to-accounts': [orderData: PurchaseOrder]
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
// LOCAL STATE
// =============================================

// ✅ Локальный режим для переключения внутри диалога
const currentMode = ref(props.mode)

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
  switch (currentMode.value) {
    case 'create':
      return props.linkedBills.length > 0 ? 'Create Additional Bill' : 'Create New Bill'
    case 'attach':
      return props.linkedBills.length > 0 ? 'Link Another Bill' : 'Link Existing Bill'
    case 'view':
      return 'Manage Bills'
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

// ✅ Финансовые расчеты
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

// ✅ Умные подсказки для форм
const suggestedAmount = computed(() => {
  const remaining = (props.orderData?.totalAmount || 0) - totalBillsAmount.value
  return Math.max(0, remaining)
})

const suggestedDescription = computed(() => {
  const isAdditional = props.linkedBills.length > 0 // вместо linkedBills.value.length
  return `Payment for order ${props.orderData?.orderNumber}${isAdditional ? ' (additional)' : ''}`
})

// ✅ Валидации и предупреждения
const wouldOverpay = computed(() => {
  return form.value.amount > 0 && potentialOverpay.value > 1
})

const potentialOverpay = computed(() => {
  const newTotal = totalBillsAmount.value + form.value.amount
  return newTotal - (props.orderData?.totalAmount || 0)
})

const selectedBillForAttach = computed(() => {
  return props.availableBills.find(bill => bill.id === form.value.existingBillId)
})

const attachmentOverpay = computed(() => {
  if (!selectedBillForAttach.value) return 0
  const newTotal = totalBillsAmount.value + selectedBillForAttach.value.amount
  return newTotal - (props.orderData?.totalAmount || 0)
})

const canCreate = computed(() => {
  return form.value.amount > 0 && form.value.description.trim() !== '' && !props.loading
})

const canAttach = computed(() => {
  return !!form.value.existingBillId && !props.loading
})

// ✅ Статусы счетов
const allBillsPaid = computed(() => {
  return (
    props.linkedBills.length > 0 && props.linkedBills.every(bill => bill.status === 'completed') // вместо linkedBills
  )
})

// 3. hasPendingBills computed:
const hasPendingBills = computed(() => {
  return props.linkedBills.some(bill => bill.status === 'pending') // вместо linkedBills
})

// 4. pendingBillsCount computed:
const pendingBillsCount = computed(() => {
  return props.linkedBills.filter(bill => bill.status === 'pending').length // вместо linkedBills
})

// =============================================
// MODE SWITCHING METHODS
// =============================================

function switchToCreateMode() {
  currentMode.value = 'create'
  resetCreateForm()
}

function switchToAttachMode() {
  currentMode.value = 'attach'
  resetAttachForm()
}

function switchToViewMode() {
  currentMode.value = 'view'
}

function resetCreateForm() {
  form.value = {
    amount: suggestedAmount.value,
    priority: 'medium',
    description: suggestedDescription.value,
    existingBillId: undefined
  }
}

function resetAttachForm() {
  form.value.existingBillId = undefined
}

// =============================================
// WATCHERS
// =============================================

// ✅ Синхронизация с внешним mode
watch(
  () => props.mode,
  newMode => {
    currentMode.value = newMode
  }
)

// ✅ Заполняем форму при открытии или смене режима
watch(
  [() => props.open, () => currentMode.value],
  ([isOpen, mode]) => {
    if (isOpen) {
      if (mode === 'create') {
        resetCreateForm()
      } else if (mode === 'attach') {
        resetAttachForm()
      }
    }
  },
  { immediate: true }
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

  // После создания переключаемся в режим просмотра
  currentMode.value = 'view'
}

function handleAttach(): void {
  if (!canAttach.value || !form.value.existingBillId) return

  emit('attach-bill', form.value.existingBillId)

  // После привязки переключаемся в режим просмотра
  currentMode.value = 'view'
}

function navigateToAccounts(): void {
  if (props.orderData) {
    emit('navigate-to-accounts', props.orderData)
  }
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
      return 'orange'
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

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}

/* ✅ Анимации для переключения режимов */
.v-card-text {
  transition: all 0.3s ease;
}

/* ✅ Улучшенные стили для карточек счетов */
.v-card.pa-3:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
}

/* ✅ Стили для финансовой сводки */
.text-warning {
  color: rgb(var(--v-theme-warning)) !important;
}

.text-error {
  color: rgb(var(--v-theme-error)) !important;
}
</style>
