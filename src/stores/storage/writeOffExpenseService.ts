import { useAccountStore } from '@/stores/account'
import type { DailyExpenseCategory } from '@/stores/account/types'
import type { WriteOffReason, StorageOperationItem } from './types'
import { doesWriteOffAffectKPI } from './types'

/**
 * Service for recording financial transactions for inventory write-offs
 * Integrates with Account Store for P&L tracking
 *
 * @module writeOffExpenseService
 * @description
 * This service creates financial transactions in the Account Store to track:
 * - Manual adjustments (inventory_adjustment category)
 * - Manual write-offs with KPI impact (spoilage, expired, etc.)
 * - Manual write-offs for OPEX (education, testing)
 *
 * NOTE: Negative batches do NOT create account transactions.
 * They are technical records for monitoring only.
 */
class WriteOffExpenseService {
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
