// src/services/payment-method.service.ts - Simple in-memory service
import { ref } from 'vue'
import type { PaymentMethod } from '@/types/payment'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'PaymentMethodService'

/**
 * PaymentMethodService - Simple in-memory service for payment methods
 * No Firebase dependency
 */
export class PaymentMethodService {
  private paymentMethods = ref<PaymentMethod[]>([])

  async getAll(): Promise<PaymentMethod[]> {
    return [...this.paymentMethods.value]
  }

  async getById(id: string): Promise<PaymentMethod | null> {
    return this.paymentMethods.value.find(pm => pm.id === id) || null
  }

  async create(data: Omit<PaymentMethod, 'id'>): Promise<PaymentMethod> {
    const now = new Date().toISOString()
    const newMethod: PaymentMethod = {
      ...data,
      id: `payment_method_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now
    }

    this.paymentMethods.value.push(newMethod)
    DebugUtils.info(MODULE_NAME, 'Payment method created', { id: newMethod.id })

    return newMethod
  }

  async update(id: string, data: Partial<PaymentMethod>): Promise<void> {
    const index = this.paymentMethods.value.findIndex(pm => pm.id === id)
    if (index === -1) {
      throw new Error(`Payment method not found: ${id}`)
    }

    this.paymentMethods.value[index] = {
      ...this.paymentMethods.value[index],
      ...data,
      updatedAt: new Date().toISOString()
    }

    DebugUtils.info(MODULE_NAME, 'Payment method updated', { id })
  }

  async delete(id: string): Promise<void> {
    this.paymentMethods.value = this.paymentMethods.value.filter(pm => pm.id !== id)
    DebugUtils.info(MODULE_NAME, 'Payment method deleted', { id })
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await this.update(id, { isActive })
    DebugUtils.info(MODULE_NAME, 'Payment method toggled', { id, isActive })
  }
}

export const paymentMethodService = new PaymentMethodService()
