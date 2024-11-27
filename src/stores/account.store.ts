// src/stores/account.store.ts
import { defineStore } from 'pinia'
import type { Account } from '@/types/account'
import { accountService } from '@/services/account.service'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'AccountStore'

interface State {
  accounts: Account[]
  isLoading: boolean
  error: Error | null
}

export const useAccountStore = defineStore('account', {
  state: (): State => ({
    accounts: [],
    isLoading: false,
    error: null
  }),

  getters: {
    activeAccounts: state => state.accounts.filter(account => account.isActive),
    getAccountById: state => (id: string) => state.accounts.find(account => account.id === id),
    totalBalance: state => state.accounts.reduce((sum, account) => sum + account.balance, 0)
  },

  actions: {
    async fetchAccounts() {
      try {
        this.isLoading = true
        DebugUtils.info(MODULE_NAME, 'Fetching accounts')

        this.accounts = await accountService.getAll()

        DebugUtils.info(MODULE_NAME, 'Accounts fetched successfully', {
          count: this.accounts.length
        })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to fetch accounts', { error })
        this.error = error as Error
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async createAccount(data: Omit<Account, 'id'>) {
      try {
        DebugUtils.info(MODULE_NAME, 'Creating account', { data })

        const account = await accountService.create(data)
        this.accounts.push(account)

        DebugUtils.info(MODULE_NAME, 'Account created successfully')
        return account
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to create account', { error })
        this.error = error as Error
        throw error
      }
    },

    async updateAccount(id: string, data: Partial<Account>) {
      try {
        DebugUtils.info(MODULE_NAME, 'Updating account', { id, data })

        await accountService.update(id, data)
        const index = this.accounts.findIndex(account => account.id === id)
        if (index !== -1) {
          this.accounts[index] = { ...this.accounts[index], ...data }
        }

        DebugUtils.info(MODULE_NAME, 'Account updated successfully')
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to update account', { error })
        this.error = error as Error
        throw error
      }
    },

    async deleteAccount(id: string) {
      try {
        DebugUtils.info(MODULE_NAME, 'Deleting account', { id })

        await accountService.delete(id)
        this.accounts = this.accounts.filter(account => account.id !== id)

        DebugUtils.info(MODULE_NAME, 'Account deleted successfully')
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to delete account', { error })
        this.error = error as Error
        throw error
      }
    },

    async transferFunds(fromId: string, toId: string, amount: number) {
      try {
        DebugUtils.info(MODULE_NAME, 'Transferring funds between accounts', {
          fromId,
          toId,
          amount
        })

        await accountService.transferBetweenAccounts(fromId, toId, amount)
        await this.fetchAccounts() // Обновляем состояние после трансфера

        DebugUtils.info(MODULE_NAME, 'Funds transferred successfully')
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to transfer funds', { error })
        this.error = error as Error
        throw error
      }
    }
  }
})
