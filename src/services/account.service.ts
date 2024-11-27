// src/firebase/services/account.service.ts
import type { Account } from '@/types/account'
import { DebugUtils } from '@/utils'
import { BaseService } from '@/firebase/services/base.service'
import { transactionService } from '@/services/transaction.service'

const MODULE_NAME = 'AccountService'

export class AccountService extends BaseService<Account> {
  constructor() {
    super('accounts')
  }

  async updateBalance(id: string, amount: number): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating account balance', { id, amount })

      const account = await this.getById(id)
      if (!account) {
        throw new Error('Account not found')
      }

      await this.update(id, {
        balance: amount,
        updatedAt: new Date().toISOString()
      })

      DebugUtils.info(MODULE_NAME, 'Account balance updated successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update account balance', { error })
      throw error
    }
  }

  async transferBetweenAccounts(fromId: string, toId: string, amount: number): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Starting transfer between accounts', { fromId, toId, amount })

      const [fromAccount, toAccount] = await Promise.all([this.getById(fromId), this.getById(toId)])

      if (!fromAccount || !toAccount) {
        throw new Error('One or both accounts not found')
      }

      if (fromAccount.balance < amount) {
        throw new Error('Insufficient funds')
      }

      await Promise.all([
        this.updateBalance(fromId, fromAccount.balance - amount),
        this.updateBalance(toId, toAccount.balance + amount)
      ])

      DebugUtils.info(MODULE_NAME, 'Transfer completed successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Transfer failed', { error })
      throw error
    }
  }
  async create(
    data: Omit<Account, 'id' | 'lastTransactionDate' | 'createdAt' | 'updatedAt'>
  ): Promise<Account> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating account', { data })

      const newAccount: Omit<Account, 'id'> = {
        ...data,
        balance: data.balance || 0,
        lastTransactionDate: null
        // createdAt и updatedAt добавятся автоматически в базовом методе create
      }

      const account = await super.create(newAccount)

      if (data.balance > 0) {
        await transactionService.createTransaction({
          accountId: account.id,
          type: 'income',
          amount: data.balance,
          description: 'Начальный баланс',
          performedBy: {
            type: 'user',
            id: 'system',
            name: 'System'
          }
        })
      }

      return account
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create account', { error })
      throw error
    }
  }

  async update(id: string, data: Partial<Account>): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating account', { id, data })

      const account = await this.getById(id)
      if (!account) {
        throw new Error('Account not found')
      }

      // Проверка возможности деактивации
      if (data.isActive === false && account.balance !== 0) {
        throw new Error('Cannot deactivate account with non-zero balance')
      }

      // Заменяем this.baseUpdate на super.update
      await super.update(id, {
        ...data,
        updatedAt: new Date().toISOString()
      })

      DebugUtils.info(MODULE_NAME, 'Account updated successfully')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update account', { error })
      throw error
    }
  }
}

export const accountService = new AccountService()
