import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { Payment, PaymentMethod, PaymentData, ValidationResult } from '@/types/payment'
import { DebugUtils } from '@/utils'
import { useBillStore } from '@/stores/bill.store'
import { useAccountStore } from '@/stores/account.store'
import { useOrderStore } from '@/stores/order.store'

const MODULE_NAME = 'paymentStore'

interface CheckoutData {
  billId: string
  items: string[]
  amount: number
  method: string
  accountId: string
}

export const usePaymentStore = defineStore('payment', () => {
  const billStore = useBillStore()
  const accountStore = useAccountStore()
  const orderStore = useOrderStore()

  // State
  const payments = ref<Payment[]>([])
  const paymentMethods = ref<PaymentMethod[]>([])
  const processingPayments = ref(new Set<string>())
  const currentShiftPayments = ref<Payment[]>([])

  // Getters
  const getPaymentsByBill = computed(() => (billId: string) => {
    return payments.value.filter(payment => payment.billId === billId)
  })

  const getActivePaymentMethods = computed(() => {
    return accountStore.activeAccounts.map(account => ({
      id: account.id,
      name: account.name,
      type: account.type,
      accountId: account.id,
      isActive: account.isActive,
      requiresDetails: account.type === 'card',
      balance: account.balance,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt
    }))
  })

  const getTotalPaidAmount = computed(() => (billId: string) => {
    return getPaymentsByBill.value(billId).reduce((sum, payment) => {
      if (payment.status === 'completed') {
        return sum + payment.amount
      }
      return sum
    }, 0)
  })

  // Геттеры для работы с платежами
  const getShiftPayments = computed(() => {
    // Сортируем платежи по времени создания (последние сверху)
    return currentShiftPayments.value.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  })

  const getTotalShiftAmount = computed(() => {
    return currentShiftPayments.value.reduce((sum, payment) => {
      if (payment.status === 'completed') {
        return sum + payment.amount
      }
      return sum
    }, 0)
  })

  // Actions
  const checkout = async (data: CheckoutData): Promise<ValidationResult> => {
    try {
      DebugUtils.debug(MODULE_NAME, 'Starting checkout process', { data })

      const account = accountStore.getAccountById(data.accountId)
      if (!account) {
        return {
          isValid: false,
          code: 'INVALID_ACCOUNT',
          message: 'Payment account not found'
        }
      }

      // Создаем платёж
      const payment: Payment = {
        id: `payment_${Date.now()}`,
        billId: data.billId,
        accountId: data.accountId,
        amount: data.amount,
        method: data.method,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Обновляем баланс аккаунта
      await accountStore.updateAccountBalance(data.accountId, data.amount)

      // Обновляем статус платежа
      payment.status = 'completed'
      payment.updatedAt = new Date().toISOString()

      // Сохраняем платеж
      payments.value.push(payment)
      currentShiftPayments.value.push(payment)

      return {
        isValid: true,
        code: 'PAYMENT_COMPLETED',
        message: 'Payment processed successfully'
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Checkout failed', { error })
      return {
        isValid: false,
        code: 'CHECKOUT_FAILED',
        message: error instanceof Error ? error.message : 'Checkout failed'
      }
    }
  }

  const processPayment = async (data: PaymentData): Promise<ValidationResult> => {
    try {
      DebugUtils.debug(MODULE_NAME, 'Processing payment', { data })

      const validation = await validatePaymentData(data)
      if (!validation.isValid) {
        return validation
      }

      // Определяем счета для оплаты
      const billsToProcess =
        billStore.selection.selectionMode === 'bills'
          ? Array.from(billStore.selection.selectedBills)
              .map(billId => orderStore.bills.find(b => b.id === billId))
              .filter(bill => bill)
          : orderStore.bills.filter(bill =>
              bill.items.some(item => item.status !== 'cancelled' && item.paymentStatus !== 'paid')
            )

      let totalProcessed = 0
      const processedPayments: Payment[] = []

      // Обрабатываем каждый счет полностью
      for (const bill of billsToProcess) {
        if (!bill) continue

        processingPayments.value.add(bill.id)

        try {
          // Берем все неоплаченные позиции счета
          const itemsToProcess = bill.items.filter(
            item => item.status !== 'cancelled' && item.paymentStatus !== 'paid'
          )

          if (itemsToProcess.length === 0) continue

          // Рассчитываем полную сумму для счета
          const billTotal = itemsToProcess.reduce((sum, item) => {
            const itemAmount = item.discount
              ? item.price * item.quantity - item.discount.discountedAmount
              : item.price * item.quantity
            return sum + itemAmount
          }, 0)

          // Создаем платеж на полную сумму счета
          const payment: Payment = {
            id: `payment_${Date.now()}_${bill.id}`,
            billId: bill.id,
            accountId: data.accountId,
            amount: billTotal,
            method: data.method,
            status: 'pending',
            items: itemsToProcess.map(item => item.id),
            metadata: {
              employeeId: 'system',
              deviceId: 'default'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          // Отмечаем все позиции как оплаченные
          for (const item of itemsToProcess) {
            item.paymentStatus = 'paid'
            item.paymentTransactionId = payment.id
            item.paymentTimestamp = payment.createdAt
          }

          // Счет полностью оплачен
          bill.paymentStatus = 'paid'

          // Добавляем запись о платеже в счет
          bill.payments = bill.payments || []
          bill.payments.push({
            transactionId: payment.id,
            amount: billTotal,
            timestamp: payment.createdAt,
            items: payment.items,
            paymentMethod: payment.method,
            status: 'completed'
          })

          payment.status = 'completed'
          payment.updatedAt = new Date().toISOString()

          // Сохраняем платеж
          payments.value.push(payment)
          currentShiftPayments.value.push(payment)
          processedPayments.push(payment)

          totalProcessed++
        } finally {
          processingPayments.value.delete(bill.id)
        }
      }

      if (totalProcessed === 0) {
        return {
          isValid: false,
          code: 'NO_ITEMS_PROCESSED',
          message: 'No items were processed for payment'
        }
      }

      // Обновляем баланс аккаунта
      await accountStore.updateAccountBalance(data.accountId, data.amount)

      return {
        isValid: true,
        code: 'PAYMENT_COMPLETED',
        message: `Successfully processed payment for ${totalProcessed} bill(s)`
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to process payment', { error, data })
      return {
        isValid: false,
        code: 'PAYMENT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to process payment'
      }
    }
  }

  const validatePaymentData = async (data: PaymentData): Promise<ValidationResult> => {
    // Проверяем существование счета
    if (!billStore.activeBill) {
      return {
        isValid: false,
        code: 'INVALID_BILL',
        message: 'Bill not found'
      }
    }

    const { selectionMode, selectedBills, selectedItems } = billStore.selection

    // Проверяем выбор
    if (selectionMode === 'bills') {
      // Проверяем что все выбранные счета существуют
      const allBillsExist = Array.from(selectedBills).every(billId =>
        orderStore.bills.find(b => b.id === billId)
      )
      if (!allBillsExist) {
        return {
          isValid: false,
          code: 'INVALID_SELECTION',
          message: 'One or more selected bills not found'
        }
      }
    } else if (selectionMode === 'items') {
      // Проверяем что все выбранные позиции существуют
      const allItemsExist = Array.from(selectedItems).every(itemId =>
        billStore.activeBill?.items.find(item => item.id === itemId)
      )
      if (!allItemsExist) {
        return {
          isValid: false,
          code: 'INVALID_SELECTION',
          message: 'One or more selected items not found'
        }
      }
    } else {
      return {
        isValid: false,
        code: 'NO_SELECTION',
        message: 'No bills or items selected'
      }
    }

    // Проверяем аккаунт
    const account = accountStore.getAccountById(data.accountId)
    if (!account || !account.isActive) {
      return {
        isValid: false,
        code: 'INVALID_ACCOUNT',
        message: 'Invalid or inactive payment method'
      }
    }

    // Проверяем метод оплаты
    if (!data.method) {
      return {
        isValid: false,
        code: 'INVALID_METHOD',
        message: 'Payment method not specified'
      }
    }

    // Проверяем сумму
    if (data.amount <= 0) {
      return {
        isValid: false,
        code: 'INVALID_AMOUNT',
        message: 'Payment amount must be greater than 0'
      }
    }

    return {
      isValid: true,
      code: 'VALIDATION_PASSED',
      message: 'Payment validation successful'
    }
  }

  const registerPaymentMethod = (method: PaymentMethod) => {
    paymentMethods.value.push(method)
  }

  const updatePaymentMethod = (methodId: string, updates: Partial<PaymentMethod>) => {
    const index = paymentMethods.value.findIndex(m => m.id === methodId)
    if (index !== -1) {
      paymentMethods.value[index] = {
        ...paymentMethods.value[index],
        ...updates,
        updatedAt: new Date().toISOString()
      }
    }
  }

  return {
    // State
    payments,
    paymentMethods,
    currentShiftPayments,
    processingPayments,

    // Getters
    getShiftPayments,
    getTotalShiftAmount,
    getActivePaymentMethods,
    getTotalPaidAmount,

    // Actions
    checkout,
    processPayment,
    registerPaymentMethod,
    updatePaymentMethod
  }
})
