// src/firebase/services/account.service.ts
import type { Account } from '@/types/account'
import { DebugUtils } from '@/utils'
import { BaseService } from '@/firebase/services/base.service'

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
}

export const accountService = new AccountService()
