// src/stores/catalog/payment-methods.service.ts
import { supabase } from '@/supabase'
import type { PaymentMethod, CreatePaymentMethodDto, UpdatePaymentMethodDto } from '@/types/payment'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'PaymentMethodService'

/**
 * PaymentMethodService - Supabase-based service for payment methods
 * Provides CRUD operations and caching for payment method to account mapping
 */
class PaymentMethodService {
  private cache: PaymentMethod[] | null = null
  private cacheTimestamp: number = 0
  private CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Get all payment methods (with caching)
   */
  async getAll(): Promise<PaymentMethod[]> {
    try {
      // Check cache
      const now = Date.now()
      if (this.cache && now - this.cacheTimestamp < this.CACHE_TTL) {
        DebugUtils.debug(MODULE_NAME, 'Returning cached payment methods', {
          count: this.cache.length
        })
        return this.cache
      }

      DebugUtils.info(MODULE_NAME, 'Fetching payment methods from Supabase')

      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('display_order', { ascending: true })

      if (error) throw error

      // Transform snake_case to camelCase
      this.cache = (data || []).map(this.transformFromDb)
      this.cacheTimestamp = now

      DebugUtils.info(MODULE_NAME, 'Payment methods loaded', { count: this.cache.length })
      return this.cache
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch payment methods', { error })
      throw error
    }
  }

  /**
   * Get payment method by ID
   */
  async getById(id: string): Promise<PaymentMethod | null> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return null
        }
        throw error
      }

      return this.transformFromDb(data)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch payment method by ID', { id, error })
      throw error
    }
  }

  /**
   * Get payment method by code (for POS use)
   */
  async getByCode(code: string): Promise<PaymentMethod | null> {
    try {
      const methods = await this.getAll()
      return methods.find(m => m.code === code && m.isActive) || null
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch payment method by code', { code, error })
      throw error
    }
  }

  /**
   * Get active payment methods only
   */
  async getActive(): Promise<PaymentMethod[]> {
    try {
      const methods = await this.getAll()
      return methods.filter(m => m.isActive)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch active payment methods', { error })
      throw error
    }
  }

  /**
   * Create new payment method
   */
  async create(dto: CreatePaymentMethodDto): Promise<PaymentMethod> {
    try {
      DebugUtils.info(MODULE_NAME, 'Creating payment method', { dto })

      const { data, error } = await supabase
        .from('payment_methods')
        .insert({
          name: dto.name,
          code: dto.code,
          type: dto.type,
          account_id: dto.accountId,
          requires_details: dto.requiresDetails || false,
          display_order: dto.displayOrder || 0,
          icon: dto.icon || null,
          description: dto.description || null
        })
        .select()
        .single()

      if (error) throw error

      this.invalidateCache()
      DebugUtils.info(MODULE_NAME, 'Payment method created', { id: data.id })

      return this.transformFromDb(data)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to create payment method', { error })
      throw error
    }
  }

  /**
   * Update payment method
   */
  async update(id: string, dto: UpdatePaymentMethodDto): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating payment method', { id, dto })

      const updateData: any = {}
      if (dto.name !== undefined) updateData.name = dto.name
      if (dto.accountId !== undefined) updateData.account_id = dto.accountId
      if (dto.isActive !== undefined) updateData.is_active = dto.isActive
      if (dto.requiresDetails !== undefined) updateData.requires_details = dto.requiresDetails
      if (dto.displayOrder !== undefined) updateData.display_order = dto.displayOrder
      if (dto.icon !== undefined) updateData.icon = dto.icon
      if (dto.description !== undefined) updateData.description = dto.description

      const { error } = await supabase.from('payment_methods').update(updateData).eq('id', id)

      if (error) throw error

      this.invalidateCache()
      DebugUtils.info(MODULE_NAME, 'Payment method updated', { id })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update payment method', { error })
      throw error
    }
  }

  /**
   * Delete payment method
   */
  async delete(id: string): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Deleting payment method', { id })

      const { error } = await supabase.from('payment_methods').delete().eq('id', id)

      if (error) throw error

      this.invalidateCache()
      DebugUtils.info(MODULE_NAME, 'Payment method deleted', { id })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to delete payment method', { error })
      throw error
    }
  }

  /**
   * Toggle active status
   */
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await this.update(id, { isActive })
  }

  /**
   * Invalidate cache (call after mutations)
   */
  private invalidateCache(): void {
    this.cache = null
    this.cacheTimestamp = 0
    DebugUtils.debug(MODULE_NAME, 'Cache invalidated')
  }

  /**
   * Transform database row to TypeScript type
   */
  private transformFromDb(row: any): PaymentMethod {
    return {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      name: row.name,
      code: row.code,
      type: row.type,
      accountId: row.account_id,
      isActive: row.is_active,
      requiresDetails: row.requires_details,
      displayOrder: row.display_order,
      icon: row.icon,
      description: row.description
    }
  }
}

export const paymentMethodService = new PaymentMethodService()
