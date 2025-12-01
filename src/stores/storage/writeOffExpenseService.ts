import { useAccountStore } from '@/stores/account'
import type { DailyExpenseCategory } from '@/stores/account/types'
import type { StorageBatch, WriteOffReason, StorageOperationItem } from './types'
import { doesWriteOffAffectKPI } from './types'
import type { PreparationBatch } from '@/stores/preparation/types'

/**
 * Service for recording financial transactions when negative batches are created/reconciled
 * Integrates with Account Store for P&L tracking
 *
 * @module writeOffExpenseService
 * @description
 * This service creates financial transactions in the Account Store to track:
 * - Expenses when negative batches are created (food_cost category)
 * - Income when negative batches are reconciled (inventory_variance category)
 * - Manual adjustments (inventory_adjustment category)
 */
class WriteOffExpenseService {
  /**
   * Record expense transaction when negative batch is created
   * This tracks the cost of products consumed beyond available inventory
   *
   * @param batch - The negative batch that was created
   * @param productName - Name of the product (for description)
   * @throws Error if no default account found or operation fails
   */
  async recordNegativeBatchExpense(
    batch: StorageBatch | PreparationBatch,
    productName: string
  ): Promise<void> {
    const accountStore = useAccountStore()

    // Get default expense account (acc_1 or first available)
    const defaultAccount =
      accountStore.accounts.find(a => a.name === 'acc_1') || accountStore.accounts[0]

    if (!defaultAccount) {
      console.error('❌ No default account found for expense recording')
      throw new Error('No default account available for expense recording')
    }

    // ✅ Validate batch data before calculation
    if (typeof batch.currentQuantity !== 'number' || isNaN(batch.currentQuantity)) {
      console.error('❌ Invalid batch.currentQuantity:', batch.currentQuantity)
      throw new Error(`Invalid batch.currentQuantity: ${batch.currentQuantity}`)
    }

    if (typeof batch.costPerUnit !== 'number' || isNaN(batch.costPerUnit)) {
      console.error('❌ Invalid batch.costPerUnit:', batch.costPerUnit, 'batch:', batch)
      throw new Error(`Invalid batch.costPerUnit: ${batch.costPerUnit} for ${productName}`)
    }

    // Calculate total cost (will be negative)
    const totalCost = Math.abs(batch.currentQuantity) * batch.costPerUnit

    // ✅ Final validation before sending to DB
    if (isNaN(totalCost)) {
      console.error('❌ Calculated totalCost is NaN:', {
        currentQuantity: batch.currentQuantity,
        costPerUnit: batch.costPerUnit,
        totalCost
      })
      throw new Error(`Invalid totalCost calculation for ${productName}`)
    }

    // Create expense transaction
    await accountStore.createOperation({
      accountId: defaultAccount.id,
      type: 'expense',
      amount: -totalCost, // negative amount for expense
      description: `Negative inventory write-off: ${productName} (${Math.abs(batch.currentQuantity)} ${batch.unit})`,
      expenseCategory: {
        type: 'daily',
        category: 'food_cost' // NEW category for negative batch expenses
      },
      performedBy: {
        type: 'api',
        id: 'system',
        name: 'Inventory System'
      }
    })

    console.info(
      `✅ Recorded negative batch expense: Rp ${totalCost.toLocaleString()} (${productName})`
    )
  }

  /**
   * Record income transaction when negative batch is reconciled
   * This offsets the original expense when new stock arrives
   *
   * @param params - Parameters for the correction income
   * @throws Error if no default account found or operation fails
   */
  async recordCorrectionIncome(params: {
    productName: string
    quantity: number
    costPerUnit: number
    unit: string
  }): Promise<void> {
    const accountStore = useAccountStore()

    const defaultAccount =
      accountStore.accounts.find(a => a.name === 'acc_1') || accountStore.accounts[0]

    if (!defaultAccount) {
      console.error('❌ No default account found for correction recording')
      throw new Error('No default account available for correction recording')
    }

    const totalCost = params.quantity * params.costPerUnit

    // Create INCOME transaction (offsets negative batch expense)
    await accountStore.createOperation({
      accountId: defaultAccount.id,
      type: 'income', // ← INCOME, not expense
      amount: totalCost, // positive amount
      description: `Inventory correction (surplus from reconciliation): ${params.productName} (${params.quantity} ${params.unit})`,
      expenseCategory: {
        type: 'daily',
        category: 'inventory_variance' // NEW category for reconciliation income
      },
      performedBy: {
        type: 'api',
        id: 'system',
        name: 'Inventory System'
      }
    })

    console.info(
      `✅ Recorded correction income: Rp ${totalCost.toLocaleString()} (${params.productName})`
    )
  }

  /**
   * Record manual inventory adjustment
   * Used for physical counts, spoilage, and other manual corrections
   *
   * @param params - Parameters for the adjustment
   * @throws Error if no default account found or operation fails
   */
  async recordManualAdjustment(params: {
    productName: string
    quantity: number
    costPerUnit: number
    unit: string
    reason: string
    isExpense: boolean // true = expense (loss), false = income (found)
  }): Promise<void> {
    const accountStore = useAccountStore()

    const defaultAccount =
      accountStore.accounts.find(a => a.name === 'acc_1') || accountStore.accounts[0]

    if (!defaultAccount) {
      console.error('❌ No default account found for adjustment recording')
      throw new Error('No default account available for adjustment recording')
    }

    const totalCost = params.quantity * params.costPerUnit

    await accountStore.createOperation({
      accountId: defaultAccount.id,
      type: params.isExpense ? 'expense' : 'income',
      amount: params.isExpense ? -totalCost : totalCost,
      description: `Manual inventory adjustment: ${params.productName} (${params.quantity} ${params.unit}) - ${params.reason}`,
      expenseCategory: {
        type: 'daily',
        category: 'inventory_adjustment' // NEW category for manual adjustments
      },
      performedBy: {
        type: 'api',
        id: 'system',
        name: 'Inventory System'
      }
    })

    console.info(
      `✅ Recorded manual adjustment (${params.isExpense ? 'expense' : 'income'}): Rp ${totalCost.toLocaleString()} (${params.productName})`
    )
  }

  /**
   * Get total negative batch expenses for a date range
   * Useful for P&L reporting
   *
   * @param from - Start date (ISO string)
   * @param to - End date (ISO string)
   * @returns Total expense amount
   */
  async getTotalNegativeBatchExpenses(from: string, to: string): Promise<number> {
    const accountStore = useAccountStore()

    // Filter transactions by category and date range
    const expenses = accountStore.transactions.filter(transaction => {
      const transactionDate = new Date(transaction.createdAt)
      const fromDate = new Date(from)
      const toDate = new Date(to)

      return (
        transaction.type === 'expense' &&
        transaction.expenseCategory?.category === 'food_cost' &&
        transactionDate >= fromDate &&
        transactionDate <= toDate
      )
    })

    return expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0)
  }

  /**
   * Get total reconciliation income for a date range
   * Useful for P&L reporting
   *
   * @param from - Start date (ISO string)
   * @param to - End date (ISO string)
   * @returns Total income amount
   */
  async getTotalReconciliationIncome(from: string, to: string): Promise<number> {
    const accountStore = useAccountStore()

    const income = accountStore.transactions.filter(transaction => {
      const transactionDate = new Date(transaction.createdAt)
      const fromDate = new Date(from)
      const toDate = new Date(to)

      return (
        transaction.type === 'income' &&
        transaction.expenseCategory?.category === 'inventory_variance' &&
        transactionDate >= fromDate &&
        transactionDate <= toDate
      )
    })

    return income.reduce((sum, t) => sum + t.amount, 0)
  }

  /**
   * Delete reconciliation income transaction for a batch
   * Used when undoing reconciliation - removes the correction income that was created
   *
   * @param batchId - UUID of the negative batch
   * @param productName - Name of the product (for matching description)
   * @throws Error if deletion fails
   */
  async deleteReconciliationIncome(batchId: string, productName: string): Promise<void> {
    const accountStore = useAccountStore()

    // Find the correction income transaction for this batch
    // Match by description pattern containing product name and "reconciliation"
    const transaction = accountStore.transactions.find(
      t =>
        t.type === 'income' &&
        t.expenseCategory?.category === 'inventory_variance' &&
        t.description.includes(productName) &&
        t.description.includes('reconciliation')
    )

    if (!transaction) {
      console.warn(`⚠️  No reconciliation income found for batch ${batchId}`)
      // Don't throw - batch can still be undone even if transaction not found
      return
    }

    // Delete the transaction
    await accountStore.deleteTransaction(transaction.id)

    console.info(
      `✅ Deleted reconciliation income transaction: Rp ${transaction.amount.toLocaleString()} (${productName})`
    )
  }

  /**
   * Record expense transaction when manual write-off is created
   * Maps write-off reasons to appropriate expense categories:
   * - KPI write-offs (expired, spoiled, other) → inventory_adjustment (Food Cost)
   * - Education write-offs → training_education (OPEX)
   * - Test write-offs → recipe_development (OPEX)
   * - Production/Sales consumption → not recorded (normal operations)
   *
   * @param params - Write-off details
   * @throws Error if no default account found or validation fails
   */
  async recordManualWriteOff(params: {
    reason: WriteOffReason
    totalValue: number
    description: string
    items: StorageOperationItem[]
  }): Promise<void> {
    // Determine expense category based on write-off reason
    let expenseCategory: DailyExpenseCategory | null = null

    if (doesWriteOffAffectKPI(params.reason)) {
      // KPI-affecting write-offs go to Food Cost
      expenseCategory = 'inventory_adjustment'
    } else {
      // Non-KPI write-offs go to OPEX or are skipped
      switch (params.reason) {
        case 'education':
          expenseCategory = 'training_education'
          break
        case 'test':
          expenseCategory = 'recipe_development'
          break
        case 'production_consumption':
        case 'sales_consumption':
          // Normal operations - don't record as expense
          console.info(
            `⏭️  Skipping expense for consumption write-off (${params.reason}): ${params.description}`
          )
          return
        default:
          console.warn(
            `⚠️  Unknown write-off reason (${params.reason}), skipping expense recording`
          )
          return
      }
    }

    const accountStore = useAccountStore()

    // Get default expense account (acc_1 or first available)
    const defaultAccount =
      accountStore.accounts.find(a => a.name === 'acc_1') || accountStore.accounts[0]

    if (!defaultAccount) {
      console.error('❌ No default account found for write-off recording')
      throw new Error('No default account available for write-off recording')
    }

    // Validate total value
    if (typeof params.totalValue !== 'number' || isNaN(params.totalValue)) {
      console.error('❌ Invalid totalValue:', params.totalValue)
      throw new Error(`Invalid totalValue: ${params.totalValue}`)
    }

    if (params.totalValue <= 0) {
      console.error('❌ Write-off totalValue must be positive:', params.totalValue)
      throw new Error(`Write-off totalValue must be positive: ${params.totalValue}`)
    }

    // Create expense transaction
    await accountStore.createOperation({
      accountId: defaultAccount.id,
      type: 'expense',
      amount: -params.totalValue, // negative amount for expense
      description: params.description,
      expenseCategory: {
        type: 'daily',
        category: expenseCategory // inventory_adjustment, training_education, or recipe_development
      },
      performedBy: {
        type: 'api',
        id: 'system',
        name: 'Inventory System'
      }
    })

    console.info(
      `✅ Recorded write-off expense (${params.reason} → ${expenseCategory}): Rp ${params.totalValue.toLocaleString()}`
    )
  }
}

export const writeOffExpenseService = new WriteOffExpenseService()
