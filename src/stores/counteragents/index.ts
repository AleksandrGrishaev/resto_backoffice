// src/stores/counteragents/index.ts

// Types exports
export type {
  Counteragent,
  CreateCounteragentData,
  CounteragentsState,
  CounteragentsStatistics,
  CounteragentType,
  ProductCategory,
  PaymentTerms,
  CounteragentsResponse,
  CounteragentResponse,
  CounteragentFilters,
  BaseEntity
} from './types'

// Store export
export { useCounteragentsStore } from './counteragentsStore'

// Service export
export { CounteragentsService } from './counteragentsService'

// Mock data exports
export {
  mockCounterAgents,
  getRandomCounteragent,
  getMockCounteragentsByType,
  getMockCounteragentsByCategory,
  getMockActiveCounterAgents,
  getMockPreferredCounterAgents,
  findCounteragentById,
  generateMockStatistics
} from './mock/counteragentsMock'

// Constants and utilities
export const COUNTERAGENT_TYPES = {
  SUPPLIER: 'supplier' as const,
  SERVICE: 'service' as const,
  OTHER: 'other' as const
} as const

export const PRODUCT_CATEGORIES = {
  MEAT: 'meat' as const,
  VEGETABLES: 'vegetables' as const,
  DAIRY: 'dairy' as const,
  BEVERAGES: 'beverages' as const,
  SPICES: 'spices' as const,
  EQUIPMENT: 'equipment' as const,
  CLEANING: 'cleaning' as const,
  OTHER: 'other' as const
} as const

export const PAYMENT_TERMS = {
  PREPAID: 'prepaid' as const,
  ON_DELIVERY: 'on_delivery' as const,
  AFTER: 'after' as const,
  CUSTOM: 'custom' as const
} as const

// Labels for UI
export const COUNTERAGENT_TYPE_LABELS = {
  supplier: 'Supplier',
  service: 'Service',
  other: 'Other'
} as const

export const PRODUCT_CATEGORY_LABELS = {
  meat: 'Meat & Poultry',
  vegetables: 'Vegetables & Fruits',
  dairy: 'Dairy Products',
  beverages: 'Beverages',
  spices: 'Spices & Seasonings',
  equipment: 'Equipment',
  cleaning: 'Cleaning & Maintenance',
  other: 'Other'
} as const

export const PAYMENT_TERMS_LABELS = {
  prepaid: 'Prepaid',
  on_delivery: 'On Delivery',
  after: 'Post Payment',
  custom: 'Custom Terms'
} as const

// Utility functions
export const getCounteragentTypeLabel = (type: CounteragentType): string => {
  return COUNTERAGENT_TYPE_LABELS[type] || type
}

export const getProductCategoryLabel = (category: ProductCategory): string => {
  return PRODUCT_CATEGORY_LABELS[category] || category
}

export const getPaymentTermsLabel = (terms: PaymentTerms): string => {
  return PAYMENT_TERMS_LABELS[terms] || terms
}

// Format currency helper
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Format phone number helper
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return ''

  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')

  // Indonesian phone number format
  if (digits.startsWith('62')) {
    return `+${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`
  }

  if (digits.startsWith('0')) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`
  }

  return phone
}

// Validation helpers
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/
  return phoneRegex.test(phone.replace(/[\s-]/g, ''))
}

// Search helpers
export const highlightSearchTerm = (text: string, searchTerm: string): string => {
  if (!searchTerm) return text

  const regex = new RegExp(`(${searchTerm})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

// Status helpers
export const getStatusColor = (isActive: boolean): string => {
  return isActive ? 'success' : 'error'
}

export const getStatusText = (isActive: boolean): string => {
  return isActive ? 'Active' : 'Inactive'
}

export const getPreferredStatusColor = (isPreferred: boolean): string => {
  return isPreferred ? 'primary' : 'default'
}

export const getPreferredStatusText = (isPreferred: boolean): string => {
  return isPreferred ? 'Preferred' : 'Regular'
}

// Balance helpers
export const getBalanceColor = (balance: number): string => {
  if (balance > 0) return 'success' // prepayment
  if (balance < 0) return 'warning' // debt
  return 'default' // zero
}

export const getBalanceText = (balance: number): string => {
  if (balance > 0) return 'Prepayment'
  if (balance < 0) return 'Outstanding'
  return 'Balanced'
}

// Default values for forms
export const DEFAULT_COUNTERAGENT_DATA: Partial<CreateCounteragentData> = {
  type: 'supplier',
  productCategories: [],
  paymentTerms: 'on_delivery',
  isActive: true,
  isPreferred: false,
  tags: []
}

// Table column definitions for UI components
export const COUNTERAGENT_TABLE_COLUMNS = [
  { key: 'name', title: 'Name', sortable: true },
  { key: 'type', title: 'Type', sortable: true },
  { key: 'productCategories', title: 'Categories', sortable: false },
  { key: 'contactPerson', title: 'Contact', sortable: true },
  { key: 'paymentTerms', title: 'Payment Terms', sortable: true },
  { key: 'isActive', title: 'Status', sortable: true },
  { key: 'isPreferred', title: 'Preferred', sortable: true },
  { key: 'actions', title: 'Actions', sortable: false }
] as const

// Export route configuration for future use
export const COUNTERAGENTS_ROUTES = {
  LIST: '/counteragents',
  CREATE: '/counteragents/create',
  EDIT: '/counteragents/:id/edit',
  VIEW: '/counteragents/:id'
} as const

// Export module metadata
export const COUNTERAGENTS_MODULE_INFO = {
  name: 'Counteragents',
  version: '1.0.0',
  description: 'Counteragents management module for restaurant business',
  author: 'Restaurant Management System',
  features: [
    'CRUD operations for counteragents',
    'Filtering and search',
    'Status management',
    'Statistics and analytics',
    'Bulk operations'
  ]
} as const
