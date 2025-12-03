// src/stores/discounts/discountsStore.ts
import { defineStore } from 'pinia'
import { DebugUtils, TimeUtils } from '@/utils'
import type {
  DiscountEvent,
  DiscountSummary,
  DiscountFilterOptions,
  DiscountTransactionView,
  DiscountReason
} from './types'
import { DISCOUNT_REASON_LABELS, MODULE_NAME } from './constants'

interface State {
  discountEvents: DiscountEvent[]
  initialized: boolean
  loading: boolean
  error: Error | null
}

/**
 * Discount Store
 *
 * Manages discount events and provides analytics data.
 * This store is the source of truth for all discount-related data.
 *
 * Key responsibilities:
 * - Track discount events (item and bill level)
 * - Provide discount statistics and summaries
 * - Filter and query discount data
 * - Integrate with orders store for revenue calculations
 */
export const useDiscountsStore = defineStore('discounts', {
  state: (): State => ({
    discountEvents: [],
    initialized: false,
    loading: false,
    error: null
  }),

  getters: {
    /**
     * Get all discount events for a specific order
     */
    getDiscountsByOrder:
      state =>
      (orderId: string): DiscountEvent[] => {
        return state.discountEvents.filter(event => event.orderId === orderId)
      },

    /**
     * Get all discount events for a specific shift
     */
    getDiscountsByShift:
      state =>
      (shiftId: string): DiscountEvent[] => {
        return state.discountEvents.filter(event => event.shiftId === shiftId)
      },

    /**
     * Get discount events for today
     */
    getTodayDiscounts: state => (): DiscountEvent[] => {
      const today = TimeUtils.getCurrentLocalISO().split('T')[0]
      return state.discountEvents.filter(event => {
        const eventDate = event.appliedAt.split('T')[0]
        return eventDate === today
      })
    },

    /**
     * Get discount statistics summary
     * Returns total count, total amount, and average discount
     */
    getDiscountStats: state => (filterOptions?: DiscountFilterOptions) => {
      let events = state.discountEvents

      // Apply filters if provided
      if (filterOptions) {
        if (filterOptions.startDate) {
          events = events.filter(e => e.appliedAt >= filterOptions.startDate!)
        }
        if (filterOptions.endDate) {
          events = events.filter(e => e.appliedAt <= filterOptions.endDate!)
        }
        if (filterOptions.reason) {
          events = events.filter(e => e.reason === filterOptions.reason)
        }
        if (filterOptions.type) {
          events = events.filter(e => e.type === filterOptions.type)
        }
        if (filterOptions.shiftId) {
          events = events.filter(e => e.shiftId === filterOptions.shiftId)
        }
      }

      const totalCount = events.length
      const totalAmount = events.reduce((sum, event) => sum + event.discountAmount, 0)
      const averageDiscount = totalCount > 0 ? totalAmount / totalCount : 0

      return {
        totalCount,
        totalAmount,
        averageDiscount
      }
    },

    /**
     * Get discount summary grouped by reason
     * Returns array of DiscountSummary objects
     */
    getDiscountSummaryByReason:
      state =>
      (filterOptions?: DiscountFilterOptions): DiscountSummary[] => {
        let events = state.discountEvents

        // Apply filters if provided
        if (filterOptions) {
          if (filterOptions.startDate) {
            events = events.filter(e => e.appliedAt >= filterOptions.startDate!)
          }
          if (filterOptions.endDate) {
            events = events.filter(e => e.appliedAt <= filterOptions.endDate!)
          }
          if (filterOptions.type) {
            events = events.filter(e => e.type === filterOptions.type)
          }
          if (filterOptions.shiftId) {
            events = events.filter(e => e.shiftId === filterOptions.shiftId)
          }
        }

        // Group by reason
        const grouped = new Map<DiscountReason, { count: number; amount: number }>()

        events.forEach(event => {
          const current = grouped.get(event.reason) || { count: 0, amount: 0 }
          grouped.set(event.reason, {
            count: current.count + 1,
            amount: current.amount + event.discountAmount
          })
        })

        // Calculate total for percentages
        const totalAmount = events.reduce((sum, event) => sum + event.discountAmount, 0)

        // Convert to array and sort by amount (descending)
        return Array.from(grouped.entries())
          .map(([reason, data]) => ({
            reason,
            reasonLabel: DISCOUNT_REASON_LABELS[reason],
            count: data.count,
            totalAmount: data.amount,
            percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0
          }))
          .sort((a, b) => b.totalAmount - a.totalAmount)
      },

    /**
     * Get filtered discount transactions with pagination
     * Returns array of DiscountTransactionView objects
     */
    getFilteredDiscounts:
      state =>
      (filterOptions?: DiscountFilterOptions): DiscountTransactionView[] => {
        let events = [...state.discountEvents] as DiscountTransactionView[]

        // Apply filters
        if (filterOptions) {
          if (filterOptions.startDate) {
            events = events.filter(e => e.appliedAt >= filterOptions.startDate!)
          }
          if (filterOptions.endDate) {
            events = events.filter(e => e.appliedAt <= filterOptions.endDate!)
          }
          if (filterOptions.reason) {
            events = events.filter(e => e.reason === filterOptions.reason)
          }
          if (filterOptions.type) {
            events = events.filter(e => e.type === filterOptions.type)
          }
          if (filterOptions.discountType) {
            events = events.filter(e => e.discountType === filterOptions.discountType)
          }
          if (filterOptions.appliedBy) {
            events = events.filter(e => e.appliedBy === filterOptions.appliedBy)
          }
          if (filterOptions.shiftId) {
            events = events.filter(e => e.shiftId === filterOptions.shiftId)
          }

          // Sorting
          const sortBy = filterOptions.sortBy || 'appliedAt'
          const sortOrder = filterOptions.sortOrder || 'desc'

          events.sort((a, b) => {
            let comparison = 0

            switch (sortBy) {
              case 'appliedAt':
                comparison = a.appliedAt.localeCompare(b.appliedAt)
                break
              case 'discountAmount':
                comparison = a.discountAmount - b.discountAmount
                break
              case 'reason':
                comparison = a.reason.localeCompare(b.reason)
                break
            }

            return sortOrder === 'asc' ? comparison : -comparison
          })

          // Pagination
          if (filterOptions.limit !== undefined) {
            const offset = filterOptions.offset || 0
            events = events.slice(offset, offset + filterOptions.limit)
          }
        }

        // Calculate discount percentage for each event
        events.forEach(event => {
          event.discountPercentage =
            event.originalAmount > 0 ? (event.discountAmount / event.originalAmount) * 100 : 0
        })

        return events
      }
  },

  actions: {
    /**
     * Initialize the discount store
     * In Phase 1, this is a placeholder for future data loading
     */
    async initialize() {
      if (this.initialized) {
        DebugUtils.info(MODULE_NAME, 'Already initialized')
        return
      }

      try {
        this.loading = true
        DebugUtils.info(MODULE_NAME, 'Initializing discount store')

        // Phase 1: Initialize with empty state
        // Phase 2+: Load discount events from database
        this.discountEvents = []

        this.initialized = true
        DebugUtils.store(MODULE_NAME, 'Initialization complete', {
          eventsLoaded: this.discountEvents.length
        })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to initialize', { error })
        this.error = error as Error
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Add a discount event to the store
     * Phase 1: In-memory only
     * Phase 2+: Persist to database
     */
    async addDiscountEvent(event: DiscountEvent): Promise<void> {
      try {
        DebugUtils.info(MODULE_NAME, 'Adding discount event', {
          type: event.type,
          reason: event.reason,
          amount: event.discountAmount
        })

        // Add to in-memory store
        this.discountEvents.push(event)

        // Phase 2+: Persist to database via supabaseService
        // await supabaseService.saveDiscountEvent(event)

        DebugUtils.store(MODULE_NAME, 'Discount event added successfully', {
          eventId: event.id,
          totalEvents: this.discountEvents.length
        })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to add discount event', { error })
        throw error
      }
    },

    /**
     * Remove a discount event (soft delete)
     * Phase 3: To be implemented with cancellation logic
     */
    async removeDiscountEvent(eventId: string): Promise<void> {
      try {
        DebugUtils.info(MODULE_NAME, 'Removing discount event', { eventId })

        // Remove from in-memory store
        const index = this.discountEvents.findIndex(e => e.id === eventId)
        if (index !== -1) {
          this.discountEvents.splice(index, 1)
        }

        // Phase 2+: Soft delete in database
        // await supabaseService.updateDiscountEvent(eventId, { deletedAt: new Date().toISOString() })

        DebugUtils.store(MODULE_NAME, 'Discount event removed successfully', { eventId })
      } catch (error) {
        DebugUtils.error(MODULE_NAME, 'Failed to remove discount event', { error })
        throw error
      }
    },

    /**
     * Clear all discount events (for testing/development)
     */
    clearAll() {
      DebugUtils.info(MODULE_NAME, 'Clearing all discount events')
      this.discountEvents = []
    },

    /**
     * Reset store state
     */
    reset() {
      this.discountEvents = []
      this.initialized = false
      this.loading = false
      this.error = null
    }
  }
})
