import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Customer,
  CustomerSearchQuery,
  CustomerBillHistory,
  CustomerFavoriteItem,
  CustomerStatistics,
  CustomerBageStatus
} from '@/types/customer'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'customerStore'

export const useCustomerStore = defineStore('customer', () => {
  // State
  const customers = ref<Customer[]>([])
  const activeCustomer = ref<Customer | null>(null)
  const searchResults = ref<Customer[]>([])
  const loading = ref(false)

  // Mock data
  const mockCustomers: Customer[] = [
    {
      id: 'cust_1',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      email: 'john@example.com',
      registrationDate: '2024-01-01T00:00:00Z',
      lastVisitDate: '2024-01-15T00:00:00Z',
      status: 'active' as CustomerBageStatus,
      notes: 'Regular customer, prefers window seats',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    },
    {
      id: 'cust_2',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+1987654321',
      email: 'jane.smith@example.com',
      registrationDate: '2023-11-15T00:00:00Z',
      lastVisitDate: '2024-01-20T00:00:00Z',
      status: 'active' as CustomerBageStatus,
      notes: 'Allergic to nuts',
      createdAt: '2023-11-15T00:00:00Z',
      updatedAt: '2024-01-20T00:00:00Z'
    },
    {
      id: 'cust_3',
      firstName: 'Bob',
      lastName: 'Wilson',
      phone: '+1122334455',
      email: 'bob@example.com',
      registrationDate: '2023-12-01T00:00:00Z',
      lastVisitDate: '2023-12-01T00:00:00Z',
      status: 'inactive' as CustomerBageStatus,
      notes: 'Only visited once',
      createdAt: '2023-12-01T00:00:00Z',
      updatedAt: '2023-12-01T00:00:00Z'
    }
  ]

  // Mock история заказов
  const mockBillHistory: Record<string, CustomerBillHistory[]> = {
    cust_1: [
      {
        id: 'bill_1',
        date: '2024-01-15T19:00:00Z',
        totalAmount: 150000,
        itemsCount: 4,
        status: 'closed',
        items: [
          { id: 'item_1', name: 'Pizza Margherita', quantity: 2, price: 45000, totalAmount: 90000 },
          { id: 'item_2', name: 'Cola', quantity: 2, price: 30000, totalAmount: 60000 }
        ]
      },
      {
        id: 'bill_2',
        date: '2024-01-10T20:00:00Z',
        totalAmount: 235000,
        itemsCount: 3,
        status: 'closed',
        items: [
          { id: 'item_3', name: 'Steak', quantity: 1, price: 185000, totalAmount: 185000 },
          { id: 'item_4', name: 'Wine', quantity: 2, price: 25000, totalAmount: 50000 }
        ]
      }
    ],
    cust_2: [
      {
        id: 'bill_3',
        date: '2024-01-20T18:30:00Z',
        totalAmount: 175000,
        itemsCount: 3,
        status: 'closed',
        items: [
          { id: 'item_5', name: 'Pasta Carbonara', quantity: 1, price: 95000, totalAmount: 95000 },
          { id: 'item_6', name: 'Salad', quantity: 2, price: 40000, totalAmount: 80000 }
        ]
      }
    ]
  }

  // Mock любимые блюда
  const mockFavoriteItems: Record<string, CustomerFavoriteItem[]> = {
    cust_1: [
      {
        id: 'dish_1',
        name: 'Pizza Margherita',
        orderCount: 5,
        lastOrdered: '2024-01-15T19:00:00Z',
        totalSpent: 225000
      },
      {
        id: 'dish_2',
        name: 'Cola',
        orderCount: 8,
        lastOrdered: '2024-01-15T19:00:00Z',
        totalSpent: 240000
      }
    ],
    cust_2: [
      {
        id: 'dish_3',
        name: 'Pasta Carbonara',
        orderCount: 3,
        lastOrdered: '2024-01-20T18:30:00Z',
        totalSpent: 285000
      }
    ]
  }

  // Getters
  const getCustomerById = computed(() => (id: string) => {
    return customers.value.find(customer => customer.id === id)
  })

  const getCustomersByIds = computed(() => (ids: string[]) => {
    return customers.value.filter(customer => ids.includes(customer.id))
  })

  // Actions
  function initialize() {
    DebugUtils.debug(MODULE_NAME, 'Initializing customer store')
    customers.value = mockCustomers
  }

  function setActiveCustomer(customer: Customer | null) {
    activeCustomer.value = customer
  }

  function searchCustomers(query: CustomerSearchQuery) {
    const searchText = query.searchText.toLowerCase()
    searchResults.value = customers.value.filter(
      customer =>
        customer.firstName.toLowerCase().includes(searchText) ||
        customer.lastName.toLowerCase().includes(searchText) ||
        customer.phone?.includes(searchText) ||
        customer.email?.toLowerCase().includes(searchText)
    )
  }

  // Новые методы для работы с историей и статистикой
  async function getCustomerBillHistory(customerId: string): Promise<CustomerBillHistory[]> {
    DebugUtils.debug(MODULE_NAME, 'Getting customer bill history', { customerId })
    return mockBillHistory[customerId] || []
  }

  async function getCustomerFavoriteItems(customerId: string): Promise<CustomerFavoriteItem[]> {
    DebugUtils.debug(MODULE_NAME, 'Getting customer favorite items', { customerId })
    return mockFavoriteItems[customerId] || []
  }

  async function getCustomerStatistics(customerId: string): Promise<CustomerStatistics> {
    DebugUtils.debug(MODULE_NAME, 'Calculating customer statistics', { customerId })

    const history = mockBillHistory[customerId] || []
    const totalSpent = history.reduce((sum, bill) => sum + bill.totalAmount, 0)
    const visitsCount = history.length

    return {
      totalSpent,
      visitsCount,
      averageCheck: visitsCount > 0 ? Math.round(totalSpent / visitsCount) : 0,
      firstVisitDate: history[history.length - 1]?.date || '',
      lastVisitDate: history[0]?.date || ''
    }
  }

  // CRUD операции
  async function createCustomer(customerData: Omit<Customer, 'id'>): Promise<Customer> {
    try {
      loading.value = true
      DebugUtils.debug(MODULE_NAME, 'Creating new customer', customerData)

      const newCustomer: Customer = {
        id: `cust_${Date.now()}`,
        ...customerData,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      customers.value.push(newCustomer)
      return newCustomer
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create customer', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function updateCustomer(customerId: string, updates: Partial<Customer>): Promise<Customer> {
    try {
      loading.value = true
      DebugUtils.debug(MODULE_NAME, 'Updating customer', { customerId, updates })

      const customerIndex = customers.value.findIndex(c => c.id === customerId)
      if (customerIndex === -1) {
        throw new Error('Customer not found')
      }

      const updatedCustomer = {
        ...customers.value[customerIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      }

      customers.value[customerIndex] = updatedCustomer

      if (activeCustomer.value?.id === customerId) {
        activeCustomer.value = updatedCustomer
      }

      return updatedCustomer
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update customer', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  async function deleteCustomer(customerId: string): Promise<void> {
    try {
      loading.value = true
      DebugUtils.debug(MODULE_NAME, 'Deleting customer', { customerId })

      const index = customers.value.findIndex(c => c.id === customerId)
      if (index === -1) {
        throw new Error('Customer not found')
      }

      customers.value.splice(index, 1)

      if (activeCustomer.value?.id === customerId) {
        activeCustomer.value = null
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete customer', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    customers,
    activeCustomer,
    searchResults,
    loading,

    // Getters
    getCustomerById,
    getCustomersByIds,

    // Customer History & Stats
    getCustomerBillHistory,
    getCustomerFavoriteItems,
    getCustomerStatistics,

    // Actions
    initialize,
    setActiveCustomer,
    searchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer
  }
})
