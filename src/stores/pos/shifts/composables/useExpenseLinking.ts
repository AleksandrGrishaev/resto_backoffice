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

  const unlinkedExpenses = computed(() => {
    return shiftsStore.getExpensesByLinkingStatus('unlinked')
  })

  const linkedExpenses = computed(() => {
    return shiftsStore.getExpensesByLinkingStatus('linked')
  })

  const partiallyLinkedExpenses = computed(() => {
    return shiftsStore.getExpensesByLinkingStatus('partially_linked')
  })

  const totalUnlinkedAmount = computed(() => {
    return unlinkedExpenses.value.reduce((sum, exp) => sum + exp.amount, 0)
  })

  // =============================================
  // METHODS
  // =============================================

  /**
   * Get available invoices for linking
   * Filters by supplier if counteragentId is provided
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
          status
        `
        )
        .in('status', ['sent', 'received', 'completed'])
        .order('created_at', { ascending: false })
        .limit(50)

      if (counteragentId) {
        query = query.eq('supplier_id', counteragentId)
      }

      const { data, error: queryError } = await query

      if (queryError) {
        throw new Error(queryError.message)
      }

      const suggestions: InvoiceSuggestion[] = (data || []).map(order => ({
        id: order.id,
        orderNumber: order.order_number,
        supplierId: order.supplier_id,
        supplierName: order.supplier_name,
        totalAmount: Number(order.total_amount),
        createdAt: order.created_at,
        status: order.status,
        matchScore: 0,
        matchReason: ''
      }))

      invoiceSuggestions.value = suggestions
      return suggestions
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

      // Update expense in shift
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

      DebugUtils.info(MODULE_NAME, 'Expense linked to invoice', {
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
   */
  async function unlinkExpenseFromInvoice(
    expense: ShiftExpenseOperation,
    reason: string,
    performedBy: { id: string; name: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      isLoading.value = true
      error.value = null

      // Find shift
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

      DebugUtils.info(MODULE_NAME, 'Expense unlinked from invoice', {
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
