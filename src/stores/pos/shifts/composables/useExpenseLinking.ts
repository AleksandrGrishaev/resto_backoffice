// src/stores/pos/shifts/composables/useExpenseLinking.ts
// Sprint 4: Expense Linking Composable for Backoffice

import { ref, computed } from 'vue'
import { supabase } from '@/supabase'
import { useShiftsStore } from '../shiftsStore'
import type { ShiftExpenseOperation, ExpenseLinkingStatus } from '../types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'useExpenseLinking'

export interface InvoiceSuggestion {
  id: string
  orderNumber: string
  supplierId: string
  supplierName: string
  totalAmount: number
  createdAt: string
  status: string
  billStatus: string // 'not_billed' | 'partially_paid' | 'fully_paid'
  unpaidAmount: number // totalAmount - paidAmount (available for linking)
  matchScore: number // 0-100, how well it matches the expense
  matchReason: string
}

export interface ExpenseLinkRecord {
  id: string
  expenseId: string
  shiftId: string
  invoiceId: string
  invoiceNumber: string
  linkedAmount: number
  linkedAt: string
  linkedBy: {
    id: string
    name: string
  }
  unlinkedAt?: string
  unlinkedBy?: {
    id: string
    name: string
  }
  unlinkedReason?: string
}

export function useExpenseLinking() {
  const shiftsStore = useShiftsStore()

  // =============================================
  // STATE
  // =============================================

  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const invoiceSuggestions = ref<InvoiceSuggestion[]>([])

  // =============================================
  // COMPUTED
  // =============================================

  // Unlinked expenses includes both 'unlinked' AND 'partially_linked'
  // (partially_linked still have available amount that needs to be linked)
  const unlinkedExpenses = computed(() => {
    const unlinked = shiftsStore.getExpensesByLinkingStatus('unlinked')
    const partiallyLinked = shiftsStore.getExpensesByLinkingStatus('partially_linked')
    return [...unlinked, ...partiallyLinked]
  })

  const linkedExpenses = computed(() => {
    return shiftsStore.getExpensesByLinkingStatus('linked')
  })

  const partiallyLinkedExpenses = computed(() => {
    return shiftsStore.getExpensesByLinkingStatus('partially_linked')
  })

  // Total unlinked amount - considers partially linked expenses
  // For expenses with relatedPaymentId, uses available amount (amount - usedAmount)
  const totalUnlinkedAmount = computed(() => {
    return unlinkedExpenses.value.reduce((sum, exp) => {
      // For now, just use full expense amount
      // The accurate available amount is calculated in the component where payments are available
      return sum + exp.amount
    }, 0)
  })

  // =============================================
  // METHODS
  // =============================================

  /**
   * Get available invoices for linking
   * Filters by supplier if counteragentId is provided
   * Excludes fully paid invoices
   */
  async function getAvailableInvoices(counteragentId?: string): Promise<InvoiceSuggestion[]> {
    try {
      isLoading.value = true
      error.value = null

      let query = supabase
        .from('supplierstore_orders')
        .select(
          `
          id,
          order_number,
          supplier_id,
          supplier_name,
          total_amount,
          created_at,
          status,
          bill_status
        `
        )
        // Include all active order statuses (sent, received, delivered, completed)
        // Only exclude draft/cancelled orders
        .not('status', 'in', '("draft","cancelled")')
        // Exclude fully paid invoices - they don't need more payments
        .neq('bill_status', 'fully_paid')
        .order('created_at', { ascending: false })
        .limit(50)

      if (counteragentId) {
        query = query.eq('supplier_id', counteragentId)
      }

      const { data, error: queryError } = await query

      if (queryError) {
        throw new Error(queryError.message)
      }

      // Get paid amounts for each order to calculate unpaid amount
      const orderIds = (data || []).map(o => o.id)
      const paidAmounts = await getPaidAmountsForOrders(orderIds)

      const suggestions: InvoiceSuggestion[] = (data || []).map(order => {
        const totalAmount = Number(order.total_amount)
        const paidAmount = paidAmounts[order.id] || 0
        const unpaidAmount = Math.max(0, totalAmount - paidAmount)

        return {
          id: order.id,
          orderNumber: order.order_number,
          supplierId: order.supplier_id,
          supplierName: order.supplier_name,
          totalAmount,
          createdAt: order.created_at,
          status: order.status,
          billStatus: order.bill_status || 'not_billed',
          unpaidAmount,
          matchScore: 0,
          matchReason: ''
        }
      })

      // Filter out orders with no unpaid amount
      const availableSuggestions = suggestions.filter(s => s.unpaidAmount > 0)

      invoiceSuggestions.value = availableSuggestions
      return availableSuggestions
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load invoices'
      error.value = errorMsg
      DebugUtils.error(MODULE_NAME, 'Failed to load invoices', { error: err })
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Get paid amounts for orders from linked payments
   */
  async function getPaidAmountsForOrders(orderIds: string[]): Promise<Record<string, number>> {
    if (orderIds.length === 0) return {}

    try {
      // Get all completed payments that are linked to these orders
      const { data: payments } = await supabase
        .from('pending_payments')
        .select('id, linked_orders, status')
        .eq('status', 'completed')

      const paidAmounts: Record<string, number> = {}

      // Initialize all orders with 0
      orderIds.forEach(id => {
        paidAmounts[id] = 0
      })

      // Sum up linked amounts from payments
      if (payments) {
        for (const payment of payments) {
          const linkedOrders = payment.linked_orders as Array<{
            orderId: string
            linkedAmount: number
            isActive: boolean
          }> | null

          if (linkedOrders) {
            for (const link of linkedOrders) {
              if (link.isActive && orderIds.includes(link.orderId)) {
                paidAmounts[link.orderId] = (paidAmounts[link.orderId] || 0) + link.linkedAmount
              }
            }
          }
        }
      }

      return paidAmounts
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to get paid amounts for orders', { error: err })
      return {}
    }
  }

  /**
   * Get invoice suggestions for a specific expense
   * Ranks invoices by match score
   */
  async function getInvoiceSuggestions(
    expense: ShiftExpenseOperation
  ): Promise<InvoiceSuggestion[]> {
    try {
      isLoading.value = true
      error.value = null

      // Load invoices for this supplier
      const invoices = await getAvailableInvoices(expense.counteragentId)

      // Calculate match scores
      const scored = invoices.map(invoice => {
        let score = 0
        const reasons: string[] = []

        // Exact amount match
        if (Math.abs(invoice.totalAmount - expense.amount) < 1) {
          score += 50
          reasons.push('Exact amount match')
        } else if (Math.abs(invoice.totalAmount - expense.amount) < expense.amount * 0.1) {
          // Within 10%
          score += 30
          reasons.push('Similar amount')
        }

        // Same supplier
        if (invoice.supplierId === expense.counteragentId) {
          score += 30
          reasons.push('Same supplier')
        }

        // Recent invoice (within 7 days of expense)
        const expenseDate = new Date(expense.createdAt)
        const invoiceDate = new Date(invoice.createdAt)
        const daysDiff =
          Math.abs(expenseDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
        if (daysDiff < 7) {
          score += 20
          reasons.push('Recent order')
        } else if (daysDiff < 30) {
          score += 10
        }

        return {
          ...invoice,
          matchScore: Math.min(score, 100),
          matchReason: reasons.join(', ') || 'No specific match'
        }
      })

      // Sort by match score descending
      scored.sort((a, b) => b.matchScore - a.matchScore)

      invoiceSuggestions.value = scored
      return scored
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get suggestions'
      error.value = errorMsg
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Link expense to invoice
   * If expense has relatedPaymentId, delegates to accountStore.linkPaymentToOrder()
   * This ensures PendingPayment and expense stay in sync
   */
  async function linkExpenseToInvoice(
    expense: ShiftExpenseOperation,
    invoice: InvoiceSuggestion,
    linkAmount: number,
    performedBy: { id: string; name: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      isLoading.value = true
      error.value = null

      // ✅ If expense has relatedPaymentId, use accountStore.linkPaymentToOrder
      // This ensures both PendingPayment and expense are updated atomically
      if (expense.relatedPaymentId) {
        const { useAccountStore } = await import('@/stores/account')
        const accountStore = useAccountStore()

        await accountStore.linkPaymentToOrder({
          paymentId: expense.relatedPaymentId,
          orderId: invoice.id,
          orderNumber: invoice.orderNumber,
          linkAmount: linkAmount
        })

        DebugUtils.info(MODULE_NAME, 'Expense linked via PendingPayment', {
          expenseId: expense.id,
          paymentId: expense.relatedPaymentId,
          invoiceId: invoice.id,
          amount: linkAmount
        })

        // linkPaymentToOrder already updates expense via updateExpenseLinkingStatusByPaymentId
        return { success: true }
      }

      // Fallback for old expenses without relatedPaymentId - update expense directly
      const shift = shiftsStore.shifts.find(s => s.id === expense.shiftId)
      if (!shift) {
        throw new Error('Shift not found')
      }

      const expenseIndex = shift.expenseOperations.findIndex(e => e.id === expense.id)
      if (expenseIndex === -1) {
        throw new Error('Expense not found in shift')
      }

      // Update expense with link info
      const updatedExpense = {
        ...shift.expenseOperations[expenseIndex],
        linkedOrderId: invoice.id,
        invoiceNumber: invoice.orderNumber,
        linkingStatus: 'linked' as ExpenseLinkingStatus,
        linkedAt: new Date().toISOString(),
        linkedBy: performedBy,
        updatedAt: new Date().toISOString()
      }

      shift.expenseOperations[expenseIndex] = updatedExpense

      // Save to localStorage (through service)
      const storedShifts = localStorage.getItem('pos_shifts')
      const allShifts = storedShifts ? JSON.parse(storedShifts) : []
      const shiftIndex = allShifts.findIndex((s: { id: string }) => s.id === shift.id)
      if (shiftIndex !== -1) {
        allShifts[shiftIndex] = shift
        localStorage.setItem('pos_shifts', JSON.stringify(allShifts))
      }

      DebugUtils.info(MODULE_NAME, 'Expense linked to invoice (legacy mode)', {
        expenseId: expense.id,
        invoiceId: invoice.id,
        amount: linkAmount
      })

      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to link expense'
      error.value = errorMsg
      DebugUtils.error(MODULE_NAME, 'Failed to link expense', { error: err })
      return { success: false, error: errorMsg }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Unlink expense from invoice
   * If expense has relatedPaymentId, delegates to accountStore.unlinkPaymentFromOrder()
   * This ensures PendingPayment and expense stay in sync
   */
  async function unlinkExpenseFromInvoice(
    expense: ShiftExpenseOperation,
    reason: string,
    performedBy: { id: string; name: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      isLoading.value = true
      error.value = null

      // ✅ If expense has relatedPaymentId and linkedOrderId, use accountStore.unlinkPaymentFromOrder
      // This ensures both PendingPayment and expense are updated atomically
      if (expense.relatedPaymentId && expense.linkedOrderId) {
        const { useAccountStore } = await import('@/stores/account')
        const accountStore = useAccountStore()

        await accountStore.unlinkPaymentFromOrder(expense.relatedPaymentId, expense.linkedOrderId)

        DebugUtils.info(MODULE_NAME, 'Expense unlinked via PendingPayment', {
          expenseId: expense.id,
          paymentId: expense.relatedPaymentId,
          orderId: expense.linkedOrderId,
          reason
        })

        // unlinkPaymentFromOrder already updates expense via updateExpenseLinkingStatusByPaymentId
        return { success: true }
      }

      // Fallback for old expenses without relatedPaymentId - update expense directly
      const shift = shiftsStore.shifts.find(s => s.id === expense.shiftId)
      if (!shift) {
        throw new Error('Shift not found')
      }

      const expenseIndex = shift.expenseOperations.findIndex(e => e.id === expense.id)
      if (expenseIndex === -1) {
        throw new Error('Expense not found in shift')
      }

      // Update expense - remove link
      const updatedExpense = {
        ...shift.expenseOperations[expenseIndex],
        linkedOrderId: undefined,
        invoiceNumber: undefined,
        linkingStatus: 'unlinked' as ExpenseLinkingStatus,
        unlinkedAt: new Date().toISOString(),
        unlinkedBy: performedBy,
        unlinkedReason: reason,
        updatedAt: new Date().toISOString()
      }

      shift.expenseOperations[expenseIndex] = updatedExpense

      // Save to localStorage
      const storedShifts = localStorage.getItem('pos_shifts')
      const allShifts = storedShifts ? JSON.parse(storedShifts) : []
      const shiftIndex = allShifts.findIndex((s: { id: string }) => s.id === shift.id)
      if (shiftIndex !== -1) {
        allShifts[shiftIndex] = shift
        localStorage.setItem('pos_shifts', JSON.stringify(allShifts))
      }

      DebugUtils.info(MODULE_NAME, 'Expense unlinked from invoice (legacy mode)', {
        expenseId: expense.id,
        reason
      })

      return { success: true }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to unlink expense'
      error.value = errorMsg
      return { success: false, error: errorMsg }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Clear error
   */
  function clearError() {
    error.value = null
  }

  return {
    // State
    isLoading,
    error,
    invoiceSuggestions,

    // Computed
    unlinkedExpenses,
    linkedExpenses,
    partiallyLinkedExpenses,
    totalUnlinkedAmount,

    // Methods
    getAvailableInvoices,
    getInvoiceSuggestions,
    linkExpenseToInvoice,
    unlinkExpenseFromInvoice,
    clearError
  }
}
