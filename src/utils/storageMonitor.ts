/**
 * localStorage Quota Management System
 *
 * Monitors localStorage usage and triggers cleanup when quota is approaching full.
 *
 * Usage:
 * ```typescript
 * import { StorageMonitor } from '@/utils/storageMonitor'
 *
 * // Check if cleanup is needed
 * const { needsCleanup, level } = StorageMonitor.needsCleanup()
 * if (needsCleanup) {
 *   await StorageMonitor.performCleanup(level)
 * }
 *
 * // Get storage usage details
 * const usage = StorageMonitor.estimateUsage()
 * console.log(`Storage: ${usage.usagePercent.toFixed(1)}%`)
 * ```
 */

import type { OrdersService } from '@/stores/pos/orders/services'
import type { ShiftsService } from '@/stores/pos/shifts/services'

/**
 * Storage usage information
 */
export interface StorageUsage {
  /** Total size in bytes */
  totalSize: number
  /** List of items with their sizes */
  items: Array<{ key: string; size: number }>
  /** Estimated quota in bytes (5MB default) */
  estimatedQuota: number
  /** Usage as percentage (0-1) */
  usagePercent: number
}

/**
 * Cleanup result statistics
 */
export interface CleanupResult {
  /** Items removed from storage */
  itemsRemoved: number
  /** Items kept in storage */
  itemsKept: number
  /** Approximate size freed in bytes */
  sizeFreed: number
  /** Storage usage before cleanup */
  usageBefore: number
  /** Storage usage after cleanup */
  usageAfter: number
}

/**
 * StorageMonitor - Monitor and manage localStorage quota
 */
export class StorageMonitor {
  /** Warning threshold - trigger cleanup at 60% usage */
  private static readonly QUOTA_WARNING_THRESHOLD = 0.6

  /** Critical threshold - trigger aggressive cleanup at 90% usage */
  private static readonly QUOTA_CRITICAL_THRESHOLD = 0.9

  /** Estimated localStorage quota (conservative 5MB) */
  private static readonly ESTIMATED_QUOTA = 5 * 1024 * 1024 // 5MB in bytes

  /**
   * Estimate current localStorage usage
   *
   * Note: Browsers don't expose actual quota via API, so we estimate based on
   * typical localStorage limits (5-10MB). We use 5MB as conservative estimate.
   */
  static estimateUsage(): StorageUsage {
    const items: Array<{ key: string; size: number }> = []
    let totalSize = 0

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          const value = localStorage.getItem(key) || ''
          // Calculate size in bytes (UTF-16 encoding, 2 bytes per char)
          const size = new Blob([value]).size
          items.push({ key, size })
          totalSize += size
        }
      }
    } catch (error) {
      console.error('❌ Failed to estimate localStorage usage:', error)
    }

    const usagePercent = totalSize / this.ESTIMATED_QUOTA

    // Sort items by size (largest first)
    items.sort((a, b) => b.size - a.size)

    return {
      totalSize,
      items,
      estimatedQuota: this.ESTIMATED_QUOTA,
      usagePercent
    }
  }

  /**
   * Check if cleanup is needed based on current usage
   */
  static needsCleanup(): {
    needed: boolean
    level: 'warning' | 'critical' | 'ok'
  } {
    const { usagePercent } = this.estimateUsage()

    if (usagePercent >= this.QUOTA_CRITICAL_THRESHOLD) {
      return { needed: true, level: 'critical' }
    } else if (usagePercent >= this.QUOTA_WARNING_THRESHOLD) {
      return { needed: true, level: 'warning' }
    }

    return { needed: false, level: 'ok' }
  }

  /**
   * Format bytes to human-readable string
   */
  private static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
  }

  /**
   * Perform cleanup across all services
   *
   * @param level - Cleanup level (warning = 7 days, critical = 3 days retention)
   */
  static async performCleanup(level: 'warning' | 'critical'): Promise<CleanupResult> {
    const usageBefore = this.estimateUsage()

    console.log(`🧹 Starting ${level} cleanup...`)
    console.log(
      `📊 Storage usage: ${this.formatBytes(usageBefore.totalSize)} / ${this.formatBytes(this.ESTIMATED_QUOTA)} (${(usageBefore.usagePercent * 100).toFixed(1)}%)`
    )

    // Log top 5 largest items
    console.log('📦 Largest items:')
    usageBefore.items.slice(0, 5).forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.key}: ${this.formatBytes(item.size)}`)
    })

    // Determine retention based on cleanup level
    const retentionDays = level === 'critical' ? 3 : 7

    let totalItemsRemoved = 0
    let totalItemsKept = 0
    let totalSizeFreed = 0

    try {
      // Import services dynamically to avoid circular dependencies
      const { OrdersService } = await import('@/stores/pos/orders/services')
      const { ShiftsService } = await import('@/stores/pos/shifts/services')

      const ordersService = new OrdersService()
      const shiftsService = new ShiftsService()

      // 1. Clean up order items (biggest impact)
      console.log(`🗑️  Cleaning order items older than ${retentionDays} days...`)
      const itemsResult = await ordersService.cleanupOldOrderItems(retentionDays)
      if (itemsResult) {
        totalItemsRemoved += itemsResult.removed
        totalItemsKept += itemsResult.kept
        totalSizeFreed += itemsResult.sizeFreed
        console.log(
          `   ✅ Removed ${itemsResult.removed} items, kept ${itemsResult.kept}, freed ~${this.formatBytes(itemsResult.sizeFreed)}`
        )
      }

      // 2. Clean up old orders and bills
      console.log(`🗑️  Cleaning orders older than ${retentionDays} days...`)
      const ordersResult = await ordersService.cleanupOldOrders(retentionDays)
      if (ordersResult) {
        totalItemsRemoved += ordersResult.removed + ordersResult.billsRemoved
        totalItemsKept += ordersResult.kept
        console.log(
          `   ✅ Removed ${ordersResult.removed} orders, ${ordersResult.billsRemoved} bills, kept ${ordersResult.kept} orders`
        )
      }

      // 3. Clean up old shifts (also cleans shift transactions)
      console.log(`🗑️  Cleaning shifts older than ${retentionDays} days...`)
      const shiftsResult = await shiftsService.cleanupOldShifts(retentionDays)
      if (shiftsResult) {
        totalItemsRemoved += shiftsResult.removed
        totalItemsKept += shiftsResult.kept
        console.log(`   ✅ Removed ${shiftsResult.removed} shifts, kept ${shiftsResult.kept}`)
      }

      // 4. Clear cache-only keys (rebuilt from Supabase on next load)
      const cacheKeys = ['sales_transactions', 'recipe_writeoffs']
      for (const key of cacheKeys) {
        const cached = localStorage.getItem(key)
        if (cached) {
          const size = new Blob([cached]).size
          localStorage.removeItem(key)
          totalSizeFreed += size
          console.log(`   ✅ Cleared cache: ${key} (~${this.formatBytes(size)})`)
        }
      }

      // 5. On critical: also clear backoffice caches
      if (level === 'critical') {
        const backofficeCacheKeys = [
          'products_cache',
          'products_cache_ts',
          'menu_items_cache',
          'menu_items_cache_ts',
          'menu_categories_cache',
          'recipes_cache',
          'recipes_cache_ts',
          'preparations_cache',
          'preparations_cache_ts'
        ]
        for (const key of backofficeCacheKeys) {
          const cached = localStorage.getItem(key)
          if (cached) {
            const size = new Blob([cached]).size
            localStorage.removeItem(key)
            totalSizeFreed += size
            console.log(`   ✅ Cleared backoffice cache: ${key} (~${this.formatBytes(size)})`)
          }
        }
      }

      // 6. Clean up sync history (if critical)
      if (level === 'critical') {
        console.log('🗑️  Trimming sync history to last 100 items...')
        const { useSyncService } = await import('@/core/sync/SyncService')
        const syncService = useSyncService()

        const history = await syncService.getHistory()
        const historyBefore = history.length

        if (historyBefore > 100) {
          await syncService.clearHistory()
          // Keep only last 100 items
          const recentHistory = history.slice(0, 100)
          for (const item of recentHistory) {
            await syncService['storage'].addToHistory(item)
          }
          console.log(`   ✅ Trimmed sync history from ${historyBefore} to 100 items`)
        }
      }
    } catch (error) {
      console.error('❌ Cleanup error:', error)
    }

    const usageAfter = this.estimateUsage()
    const sizeFreedActual = usageBefore.totalSize - usageAfter.totalSize

    console.log(`✅ Cleanup complete!`)
    console.log(
      `📊 Storage usage: ${this.formatBytes(usageAfter.totalSize)} / ${this.formatBytes(this.ESTIMATED_QUOTA)} (${(usageAfter.usagePercent * 100).toFixed(1)}%)`
    )
    console.log(`💾 Freed: ${this.formatBytes(sizeFreedActual)}`)

    return {
      itemsRemoved: totalItemsRemoved,
      itemsKept: totalItemsKept,
      sizeFreed: sizeFreedActual,
      usageBefore: usageBefore.usagePercent,
      usageAfter: usageAfter.usagePercent
    }
  }

  /**
   * Log current storage usage (for debugging)
   */
  static logUsage(): void {
    const usage = this.estimateUsage()

    console.group('📊 localStorage Usage')
    console.log(
      `Total: ${this.formatBytes(usage.totalSize)} / ${this.formatBytes(usage.estimatedQuota)} (${(usage.usagePercent * 100).toFixed(1)}%)`
    )
    console.log('\nTop 10 largest items:')
    usage.items.slice(0, 10).forEach((item, index) => {
      console.log(`${index + 1}. ${item.key}: ${this.formatBytes(item.size)}`)
    })
    console.groupEnd()
  }

  /**
   * Safe localStorage.setItem with automatic quota error handling
   *
   * Usage:
   * ```typescript
   * await StorageMonitor.safeSetItem('my_key', JSON.stringify(data))
   * ```
   *
   * If QuotaExceededError occurs:
   * 1. Trigger critical cleanup
   * 2. Retry setItem once
   * 3. Throw if still fails
   */
  static async safeSetItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('❌ localStorage quota exceeded, triggering emergency cleanup...')

        // Show current usage
        const usageBefore = this.estimateUsage()
        console.log(
          `📊 Usage before cleanup: ${this.formatBytes(usageBefore.totalSize)} (${(usageBefore.usagePercent * 100).toFixed(1)}%)`
        )

        // Trigger critical cleanup
        await this.performCleanup('critical')

        // Retry once after cleanup
        try {
          localStorage.setItem(key, value)
          console.log('✅ Retry successful after emergency cleanup')
        } catch (retryError) {
          console.error('❌ Still failing after cleanup, localStorage unavailable')
          throw new Error('localStorage quota exceeded even after cleanup. Please clear app data.')
        }
      } else {
        throw error
      }
    }
  }
}
