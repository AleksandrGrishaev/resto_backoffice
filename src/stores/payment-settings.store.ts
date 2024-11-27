// src/stores/payment-settings.store.ts
import { defineStore } from 'pinia'
import type { PaymentMethod } from '@/types/payment'
import type { Tax } from '@/types/tax'
import { paymentMethodService } from '@/services/payment-method.service'
import { taxService } from '@/services/tax.service'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'PaymentSettingsStore'

interface State {
  paymentMethods: PaymentMethod[]
  taxes: Tax[]
  isLoading: boolean
  error: Error | null
}

export const usePaymentSettingsStore = defineStore('paymentSettings', {
  state: (): State => ({
    paymentMethods: [],
    taxes: [],
    isLoading: false,
    error: null
  }),

  getters: {
    activePaymentMethods: state => state.paymentMethods.filter(method => method.isActive),
    activeTaxes: state => state.taxes.filter(tax => tax.isActive),

    getPaymentMethodById: state => (id: string) =>
      state.paymentMethods.find(method => method.id === id),
    getTaxById: state => (id: string) => state.taxes.find(tax => tax.id === id)
  },

  actions: {
    // Payment Methods
    async fetchPaymentMethods() {
      try {
        this.isLoading = true
        DebugUtils.info(MODULE_NAME, 'Fetching payment methods')

        this.paymentMethods = await paymentMethodService.getAll()

        DebugUtils.info(MODULE_NAME, 'Payment methods fetched successfully', {
          count: this.paymentMethods.length
        })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to fetch payment methods', { error })
        this.error = error as Error
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async createPaymentMethod(data: Omit<PaymentMethod, 'id'>) {
      try {
        DebugUtils.info(MODULE_NAME, 'Creating payment method', { data })

        const method = await paymentMethodService.create(data)
        this.paymentMethods.push(method)

        DebugUtils.info(MODULE_NAME, 'Payment method created successfully')
        return method
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to create payment method', { error })
        this.error = error as Error
        throw error
      }
    },

    async updatePaymentMethod(id: string, data: Partial<PaymentMethod>) {
      try {
        DebugUtils.info(MODULE_NAME, 'Updating payment method', { id, data })

        await paymentMethodService.update(id, data)
        const index = this.paymentMethods.findIndex(method => method.id === id)
        if (index !== -1) {
          this.paymentMethods[index] = { ...this.paymentMethods[index], ...data }
        }

        DebugUtils.info(MODULE_NAME, 'Payment method updated successfully')
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to update payment method', { error })
        this.error = error as Error
        throw error
      }
    },

    async togglePaymentMethod(id: string, isActive: boolean) {
      try {
        await paymentMethodService.toggleActive(id, isActive)
        const index = this.paymentMethods.findIndex(method => method.id === id)
        if (index !== -1) {
          this.paymentMethods[index].isActive = isActive
        }
      } catch (error) {
        this.error = error as Error
        throw error
      }
    },

    // Taxes
    async fetchTaxes() {
      try {
        this.isLoading = true
        DebugUtils.info(MODULE_NAME, 'Fetching taxes')

        this.taxes = await taxService.getAll()

        DebugUtils.info(MODULE_NAME, 'Taxes fetched successfully', {
          count: this.taxes.length
        })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to fetch taxes', { error })
        this.error = error as Error
        throw error
      } finally {
        this.isLoading = false
      }
    },

    async createTax(data: Omit<Tax, 'id'>) {
      try {
        DebugUtils.info(MODULE_NAME, 'Creating tax', { data })

        const tax = await taxService.create(data)
        this.taxes.push(tax)

        DebugUtils.info(MODULE_NAME, 'Tax created successfully')
        return tax
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to create tax', { error })
        this.error = error as Error
        throw error
      }
    },

    async updateTax(id: string, data: Partial<Tax>) {
      try {
        DebugUtils.info(MODULE_NAME, 'Updating tax', { id, data })

        await taxService.update(id, data)
        const index = this.taxes.findIndex(tax => tax.id === id)
        if (index !== -1) {
          this.taxes[index] = { ...this.taxes[index], ...data }
        }

        DebugUtils.info(MODULE_NAME, 'Tax updated successfully')
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to update tax', { error })
        this.error = error as Error
        throw error
      }
    },

    async toggleTax(id: string, isActive: boolean) {
      try {
        await taxService.toggleActive(id, isActive)
        const index = this.taxes.findIndex(tax => tax.id === id)
        if (index !== -1) {
          this.taxes[index].isActive = isActive
        }
      } catch (error) {
        this.error = error as Error
        throw error
      }
    },

    // Initialize
    async initialize() {
      DebugUtils.info(MODULE_NAME, 'Initializing payment settings')
      await Promise.all([this.fetchPaymentMethods(), this.fetchTaxes()])
      DebugUtils.info(MODULE_NAME, 'Payment settings initialized successfully')
    }
  }
})
