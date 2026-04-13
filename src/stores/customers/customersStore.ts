// src/stores/customers/customersStore.ts - Customer state management

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Customer, CustomerTier } from './types'
import { customersService } from './customersService'
import { useLoyaltyStore } from '@/stores/loyalty/loyaltyStore'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'CustomersStore'

export const useCustomersStore = defineStore('customers', () => {
  // State
  const customers = ref<Customer[]>([])
  const isLoading = ref(false)
  const initialized = ref(false)

  // Getters
  const activeCustomers = computed(() => customers.value.filter(c => c.status === 'active'))

  const sortedByLastVisit = computed(() =>
    [...activeCustomers.value].sort((a, b) => {
      if (!a.lastVisitAt) return 1
      if (!b.lastVisitAt) return -1
      return new Date(b.lastVisitAt).getTime() - new Date(a.lastVisitAt).getTime()
    })
  )

  const customersByTier = computed(() => {
    const result: Record<CustomerTier, Customer[]> = { member: [], regular: [], vip: [] }
    for (const c of activeCustomers.value) {
      result[c.tier].push(c)
    }
    return result
  })

  // Lookup helpers
  function getById(id: string): Customer | undefined {
    return customers.value.find(c => c.id === id)
  }

  function getByTelegramId(telegramId: string): Customer | undefined {
    return customers.value.find(c => c.telegramId === telegramId)
  }

  function getByToken(token: string): Customer | undefined {
    return customers.value.find(c => c.token === token)
  }

  async function findByToken(token: string): Promise<Customer | null> {
    // Try in-memory cache first
    const cached = getByToken(token)
    if (cached) return cached

    // Fetch from DB
    const customer = await customersService.fetchByToken(token)
    if (customer) {
      const index = customers.value.findIndex(c => c.id === customer.id)
      if (index !== -1) {
        customers.value[index] = customer
      } else {
        customers.value.push(customer)
      }
    }
    return customer
  }

  // Actions
  async function initialize() {
    if (initialized.value) return
    isLoading.value = true

    try {
      customers.value = await customersService.loadAll()
      initialized.value = true

      DebugUtils.store(MODULE_NAME, 'Initialized', {
        customers: customers.value.length
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Initialization failed', { error })
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function searchCustomers(query: string): Promise<Customer[]> {
    return customersService.search(query)
  }

  async function createCustomer(data: Partial<Customer>): Promise<Customer> {
    const newCustomer = await customersService.create(data)
    customers.value.push(newCustomer)

    // Auto-create stamp card for stamps-program customers
    if (newCustomer.loyaltyProgram === 'stamps') {
      try {
        const loyaltyStore = useLoyaltyStore()
        await loyaltyStore.issueCardForCustomer(newCustomer.id)
      } catch (err) {
        DebugUtils.error(MODULE_NAME, 'Failed to auto-create stamp card', { error: err })
      }
    }

    return newCustomer
  }

  async function updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    const updated = await customersService.update(id, updates)
    const index = customers.value.findIndex(c => c.id === id)
    if (index !== -1) {
      customers.value[index] = updated
    }
    return updated
  }

  async function resetToken(id: string): Promise<Customer> {
    const updated = await customersService.resetToken(id)
    const index = customers.value.findIndex(c => c.id === id)
    if (index !== -1) {
      customers.value[index] = updated
    }
    return updated
  }

  async function reload(): Promise<void> {
    isLoading.value = true
    try {
      customers.value = await customersService.loadAll()
      initialized.value = true
    } finally {
      isLoading.value = false
    }
  }

  async function refreshCustomer(id: string): Promise<void> {
    const fresh = await customersService.fetchById(id)
    const index = customers.value.findIndex(c => c.id === id)
    if (index !== -1) {
      customers.value[index] = fresh
    } else {
      customers.value.push(fresh)
    }
  }

  async function mergeCustomers(
    sourceId: string,
    targetId: string,
    fieldOverrides?: Record<string, any>
  ) {
    const result = await customersService.mergeCustomers(sourceId, targetId, fieldOverrides)
    if (result.success) {
      // Remove source from local state
      customers.value = customers.value.filter(c => c.id !== sourceId)
      // Refresh target to get updated stats
      await refreshCustomer(targetId)
      DebugUtils.info(MODULE_NAME, 'Customers merged', {
        sourceId,
        targetId,
        ...result.transferred
      })
    }
    return result
  }

  return {
    // State
    customers,
    isLoading,
    initialized,

    // Getters
    activeCustomers,
    sortedByLastVisit,
    customersByTier,
    getById,
    getByTelegramId,
    getByToken,
    findByToken,

    // Actions
    initialize,
    reload,
    searchCustomers,
    createCustomer,
    updateCustomer,
    resetToken,
    refreshCustomer,
    mergeCustomers
  }
})
