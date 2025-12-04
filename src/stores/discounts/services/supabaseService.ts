// src/stores/discounts/services/supabaseService.ts
import { supabase } from '@/supabase'
import type { DiscountEvent, DiscountFilterOptions } from '../types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'DiscountSupabaseService'

/**
 * Service response wrapper
 */
export interface ServiceResponse<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Supabase Service for Discount Events
 *
 * Handles all database operations for discount events:
 * - Saving discount events to database
 * - Loading discount events with filters
 * - Updating discount events
 * - Soft deleting discount events
 */
export class DiscountSupabaseService {
  private readonly tableName = 'discount_events'

  /**
   * Save a discount event to database with retry logic for token refresh race condition
   *
   * Inserts a new discount event record into the discount_events table.
   * Converts DiscountEvent to database format.
   *
   * Implements retry logic with exponential backoff for RLS errors caused by
   * JWT token refresh timing issues (Sprint 7 Bug Fix).
   *
   * @param event - Discount event to save
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   * @returns Service response with saved event or error
   */
  async saveDiscountEvent(
    event: DiscountEvent,
    maxRetries: number = 3
  ): Promise<ServiceResponse<DiscountEvent>> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = await this.attemptSaveDiscountEvent(event, attempt)

      if (result.success) {
        return result
      }

      // Check if it's an RLS error (auth issue) that might be due to token refresh
      const isRLSError =
        result.error?.includes('row-level security policy') ||
        result.error?.includes('RLS') ||
        result.error?.includes('42501') ||
        result.error?.includes('Authentication required')

      // If it's an RLS error and we have retries left, wait and retry
      if (isRLSError && attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000

        DebugUtils.info(MODULE_NAME, `🔄 Retry ${attempt + 1}/${maxRetries} after token refresh`, {
          eventId: event.id,
          delayMs: delay,
          reason: 'RLS error - likely JWT token refresh race condition'
        })

        // Wait for token refresh to complete
        await new Promise(resolve => setTimeout(resolve, delay))

        // Re-verify auth session before retry
        try {
          const { ensureAuthSession } = await import('@/supabase')
          await ensureAuthSession()
        } catch (authErr) {
          DebugUtils.error(MODULE_NAME, 'Auth session verification failed during retry', {
            authErr
          })
        }

        // Continue to next retry attempt
        continue
      }

      // If it's not an RLS error or we're out of retries, return the error
      return result
    }

    // Should never reach here, but TypeScript needs a return
    return {
      success: false,
      error: `Failed after ${maxRetries} retry attempts`
    }
  }

  /**
   * Internal method: Single attempt to save discount event
   *
   * @param event - Discount event to save
   * @param attemptNumber - Current attempt number (for logging)
   * @returns Service response with saved event or error
   */
  private async attemptSaveDiscountEvent(
    event: DiscountEvent,
    attemptNumber: number
  ): Promise<ServiceResponse<DiscountEvent>> {
    try {
      // Log warning for system-generated discounts (no user ID)
      if (!event.appliedBy) {
        DebugUtils.info(MODULE_NAME, '⚠️ Saving system-generated discount (no user ID)', {
          eventId: event.id,
          type: event.type,
          discountAmount: event.discountAmount,
          attempt: attemptNumber + 1
        })
      } else {
        DebugUtils.info(MODULE_NAME, 'Saving discount event to database', {
          eventId: event.id,
          type: event.type,
          discountAmount: event.discountAmount,
          appliedBy: event.appliedBy,
          attempt: attemptNumber + 1
        })
      }

      // Convert to database format
      const dbRecord = this.toDbFormat(event)

      // Insert into database
      const { data, error } = await supabase.from(this.tableName).insert(dbRecord).select().single()

      if (error) {
        // Special handling for RLS policy errors (403 Forbidden)
        const isRLSError =
          error.message?.includes('row-level security policy') ||
          error.message?.includes('RLS') ||
          error.code === '42501' // PostgreSQL insufficient privilege error

        if (isRLSError) {
          DebugUtils.error(MODULE_NAME, 'RLS Policy Error: Authentication context missing', {
            error,
            eventId: event.id,
            type: event.type,
            hasAppliedBy: !!event.appliedBy,
            attempt: attemptNumber + 1,
            solution: 'Will retry after token refresh completes'
          })

          return {
            success: false,
            error: `Authentication required: ${error.message}. This typically happens in background operations that lose JWT token context.`
          }
        }

        // Other errors
        DebugUtils.error(MODULE_NAME, 'Failed to save discount event', { error })
        return {
          success: false,
          error: error.message
        }
      }

      // Convert back to DiscountEvent format
      const savedEvent = this.fromDbFormat(data)

      DebugUtils.store(MODULE_NAME, 'Discount event saved successfully', {
        eventId: savedEvent.id,
        attempt: attemptNumber + 1
      })

      return {
        success: true,
        data: savedEvent
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Exception saving discount event', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Load discount events from database with optional filters
   *
   * Queries the discount_events table with filters for:
   * - Date range (startDate, endDate)
   * - Discount reason
   * - Discount type (item/bill)
   * - Applied by user
   * - Shift ID
   * - Pagination (limit, offset)
   * - Sorting
   *
   * @param filters - Optional filter options
   * @returns Service response with array of discount events or error
   */
  async loadDiscountEvents(
    filters?: DiscountFilterOptions
  ): Promise<ServiceResponse<DiscountEvent[]>> {
    try {
      DebugUtils.info(MODULE_NAME, 'Loading discount events from database', { filters })

      // Build query
      let query = supabase.from(this.tableName).select('*')

      // Apply filters
      if (filters) {
        // Date range
        if (filters.startDate) {
          query = query.gte('applied_at', filters.startDate)
        }
        if (filters.endDate) {
          query = query.lte('applied_at', filters.endDate)
        }

        // Discount reason
        if (filters.reason) {
          query = query.eq('reason', filters.reason)
        }

        // Discount type (item/bill)
        if (filters.type) {
          query = query.eq('type', filters.type)
        }

        // Discount value type (percentage/fixed)
        if (filters.discountType) {
          query = query.eq('discount_type', filters.discountType)
        }

        // Applied by user
        if (filters.appliedBy) {
          query = query.eq('applied_by', filters.appliedBy)
        }

        // Shift ID
        if (filters.shiftId) {
          query = query.eq('shift_id', filters.shiftId)
        }

        // Sorting
        const sortBy = filters.sortBy || 'applied_at'
        const sortOrder = filters.sortOrder || 'desc'
        const dbSortColumn = this.toDbColumnName(sortBy)
        query = query.order(dbSortColumn, { ascending: sortOrder === 'asc' })

        // Pagination
        if (filters.limit !== undefined) {
          const offset = filters.offset || 0
          query = query.range(offset, offset + filters.limit - 1)
        }
      } else {
        // Default: sort by applied_at descending
        query = query.order('applied_at', { ascending: false })
      }

      // Execute query
      const { data, error } = await query

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to load discount events', { error })
        return {
          success: false,
          error: error.message
        }
      }

      // Convert to DiscountEvent format
      const events = data.map(record => this.fromDbFormat(record))

      DebugUtils.store(MODULE_NAME, 'Discount events loaded successfully', {
        count: events.length
      })

      return {
        success: true,
        data: events
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Exception loading discount events', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Update a discount event in database
   *
   * Updates specific fields of a discount event.
   * Useful for soft delete (setting deletedAt) or approval workflow.
   *
   * @param eventId - ID of discount event to update
   * @param updates - Fields to update
   * @returns Service response with updated event or error
   */
  async updateDiscountEvent(
    eventId: string,
    updates: Partial<DiscountEvent>
  ): Promise<ServiceResponse<DiscountEvent>> {
    try {
      DebugUtils.info(MODULE_NAME, 'Updating discount event', {
        eventId,
        updates: Object.keys(updates)
      })

      // Convert updates to database format
      const dbUpdates = this.toDbFormat(updates as DiscountEvent)

      // Update in database
      const { data, error } = await supabase
        .from(this.tableName)
        .update(dbUpdates)
        .eq('id', eventId)
        .select()
        .single()

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to update discount event', { error })
        return {
          success: false,
          error: error.message
        }
      }

      // Convert back to DiscountEvent format
      const updatedEvent = this.fromDbFormat(data)

      DebugUtils.store(MODULE_NAME, 'Discount event updated successfully', {
        eventId: updatedEvent.id
      })

      return {
        success: true,
        data: updatedEvent
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Exception updating discount event', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Soft delete a discount event
   *
   * Marks the event as deleted by setting deleted_at timestamp.
   * The event remains in database for audit trail.
   *
   * @param eventId - ID of discount event to delete
   * @returns Service response with success or error
   */
  async softDeleteDiscountEvent(eventId: string): Promise<ServiceResponse<void>> {
    try {
      DebugUtils.info(MODULE_NAME, 'Soft deleting discount event', { eventId })

      const { error } = await supabase
        .from(this.tableName)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', eventId)

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to soft delete discount event', { error })
        return {
          success: false,
          error: error.message
        }
      }

      DebugUtils.store(MODULE_NAME, 'Discount event soft deleted successfully', { eventId })

      return {
        success: true
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Exception soft deleting discount event', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Load discount events for a specific order
   *
   * @param orderId - Order ID
   * @returns Service response with array of discount events or error
   */
  async loadDiscountEventsByOrder(orderId: string): Promise<ServiceResponse<DiscountEvent[]>> {
    try {
      DebugUtils.info(MODULE_NAME, 'Loading discount events for order', { orderId })

      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('order_id', orderId)
        .order('applied_at', { ascending: false })

      if (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to load discount events by order', { error })
        return {
          success: false,
          error: error.message
        }
      }

      const events = data.map(record => this.fromDbFormat(record))

      DebugUtils.store(MODULE_NAME, 'Order discount events loaded successfully', {
        orderId,
        count: events.length
      })

      return {
        success: true,
        data: events
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Exception loading discount events by order', { error })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Convert DiscountEvent to database format
   *
   * Maps TypeScript field names (camelCase) to database column names (snake_case)
   */
  private toDbFormat(event: DiscountEvent): any {
    const dbFormat = {
      id: event.id,
      type: event.type,
      discount_type: event.discountType,
      value: event.value,
      reason: event.reason,
      order_id: event.orderId,
      bill_id: event.billId,
      item_id: event.itemId,
      shift_id: event.shiftId,
      original_amount: event.originalAmount,
      discount_amount: event.discountAmount,
      final_amount: event.finalAmount,
      allocation_details: event.allocationDetails,
      applied_by: event.appliedBy,
      applied_at: event.appliedAt,
      approved_by: event.approvedBy,
      approved_at: event.approvedAt,
      notes: event.notes,
      created_at: event.createdAt,
      updated_at: event.updatedAt
    }

    // Debug: log the conversion
    DebugUtils.info(MODULE_NAME, 'Converting to DB format', {
      input: { discountType: event.discountType },
      output: { discount_type: dbFormat.discount_type }
    })

    return dbFormat
  }

  /**
   * Convert database record to DiscountEvent format
   *
   * Maps database column names (snake_case) to TypeScript field names (camelCase)
   */
  private fromDbFormat(record: any): DiscountEvent {
    return {
      id: record.id,
      type: record.type,
      discountType: record.discount_type,
      value: record.value,
      reason: record.reason,
      orderId: record.order_id,
      billId: record.bill_id,
      itemId: record.item_id,
      shiftId: record.shift_id,
      originalAmount: record.original_amount,
      discountAmount: record.discount_amount,
      finalAmount: record.final_amount,
      allocationDetails: record.allocation_details,
      appliedBy: record.applied_by,
      appliedAt: record.applied_at,
      approvedBy: record.approved_by,
      approvedAt: record.approved_at,
      notes: record.notes,
      createdAt: record.created_at,
      updatedAt: record.updated_at
    }
  }

  /**
   * Convert sort field name to database column name
   */
  private toDbColumnName(sortBy: string): string {
    const mapping: Record<string, string> = {
      appliedAt: 'applied_at',
      discountAmount: 'discount_amount',
      reason: 'reason'
    }
    return mapping[sortBy] || 'applied_at'
  }
}

// Singleton instance
export const discountSupabaseService = new DiscountSupabaseService()
