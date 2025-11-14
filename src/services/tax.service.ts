// src/services/tax.service.ts - Simple in-memory service
import { ref } from 'vue'
import type { Tax } from '@/types/tax'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'TaxService'

/**
 * TaxService - Simple in-memory service for taxes
 * No Firebase dependency
 */
export class TaxService {
  private taxes = ref<Tax[]>([])

  async getAll(): Promise<Tax[]> {
    return [...this.taxes.value]
  }

  async getById(id: string): Promise<Tax | null> {
    return this.taxes.value.find(t => t.id === id) || null
  }

  async create(data: Omit<Tax, 'id'>): Promise<Tax> {
    const now = new Date().toISOString()
    const newTax: Tax = {
      ...data,
      id: `tax_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now
    }

    this.taxes.value.push(newTax)
    DebugUtils.info(MODULE_NAME, 'Tax created', { id: newTax.id })

    return newTax
  }

  async update(id: string, data: Partial<Tax>): Promise<void> {
    const index = this.taxes.value.findIndex(t => t.id === id)
    if (index === -1) {
      throw new Error(`Tax not found: ${id}`)
    }

    this.taxes.value[index] = {
      ...this.taxes.value[index],
      ...data,
      updatedAt: new Date().toISOString()
    }

    DebugUtils.info(MODULE_NAME, 'Tax updated', { id })
  }

  async delete(id: string): Promise<void> {
    this.taxes.value = this.taxes.value.filter(t => t.id !== id)
    DebugUtils.info(MODULE_NAME, 'Tax deleted', { id })
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await this.update(id, { isActive })
    DebugUtils.info(MODULE_NAME, 'Tax toggled', { id, isActive })
  }
}

export const taxService = new TaxService()
