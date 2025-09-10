// src/stores/account.store.ts

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Account, AccountType } from '@/types/account'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'AccountStore'

// Моковые данные для начала работы
const INITIAL_ACCOUNTS: Account[] = [
  {
    id: 'cash_main',
    name: 'Cash Register',
    type: 'cash',
    isActive: true,
    balance: 1000000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'card_bca',
    name: 'BCA EDC',
    type: 'card',
    isActive: true,
    balance: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'bank_bca',
    name: 'BCA Bank',
    type: 'bank',
    isActive: true,
    balance: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'gojeck_main',
    name: 'Gojek',
    type: 'gojeck',
    isActive: true,
    balance: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'grab_main',
    name: 'Grab',
    type: 'grab',
    isActive: true,
    balance: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]

export const useAccountStore = defineStore('account', () => {
  // State
  const accounts = ref<Account[]>(INITIAL_ACCOUNTS)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  // Getters
  const activeAccounts = computed(() => accounts.value.filter(account => account.isActive))

  const getAccountById = computed(
    () => (id: string) => accounts.value.find(account => account.id === id)
  )

  const getAccountsByType = computed(
    () => (type: AccountType) => accounts.value.filter(account => account.type === type)
  )

  const totalBalance = computed(() =>
    accounts.value.reduce((sum, account) => sum + account.balance, 0)
  )

  // Actions
  const updateAccountBalance = async (accountId: string, amount: number) => {
    try {
      const account = accounts.value.find(acc => acc.id === accountId)
      if (!account) {
        throw new Error(`Account ${accountId} not found`)
      }

      DebugUtils.debug(MODULE_NAME, 'Updating account balance', {
        accountId,
        currentBalance: account.balance,
        amount
      })

      account.balance += amount
      account.updatedAt = new Date().toISOString()
      account.lastTransactionDate = new Date().toISOString()
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Failed to update account balance', { err })
      throw err
    }
  }

  return {
    // State
    accounts,
    loading,
    error,

    // Getters
    activeAccounts,
    getAccountById,
    getAccountsByType,
    totalBalance,

    // Actions
    updateAccountBalance
  }
})
