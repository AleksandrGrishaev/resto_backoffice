/**
 * Sprint 7: Kitchen Preparation Offline Cache
 *
 * localStorage-based cache for kitchen preparation data.
 * Enables offline access to balances, schedule items, and KPI entries.
 */

import { DebugUtils, TimeUtils } from '@/utils'
import type { PreparationBalance } from '@/stores/preparation/types'
import type {
  KitchenKpiEntry,
  ProductionScheduleItem,
  ProductionRecommendation
} from '@/stores/preparation/types'

const MODULE_NAME = 'KitchenOfflineCache'

// Cache keys
const CACHE_KEYS = {
  BALANCES: 'kitchen_cache_balances',
  SCHEDULE: 'kitchen_cache_schedule',
  KPI_ENTRIES: 'kitchen_cache_kpi',
  RECOMMENDATIONS: 'kitchen_cache_recommendations',
  LAST_SYNC: 'kitchen_cache_last_sync',
  CACHE_VERSION: 'kitchen_cache_version'
}

// Current cache version - increment when schema changes
const CACHE_VERSION = '1.0.0'

// Cache expiry time (24 hours in milliseconds)
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000

interface CacheMetadata {
  timestamp: string
  version: string
  department?: 'kitchen' | 'bar'
}

interface CachedData<T> {
  data: T
  metadata: CacheMetadata
}

/**
 * Kitchen Preparation Offline Cache Service
 */
export class KitchenOfflineCache {
  private static instance: KitchenOfflineCache | null = null

  static getInstance(): KitchenOfflineCache {
    if (!KitchenOfflineCache.instance) {
      KitchenOfflineCache.instance = new KitchenOfflineCache()
    }
    return KitchenOfflineCache.instance
  }

  constructor() {
    this.validateCacheVersion()
  }

  // ===== VERSION MANAGEMENT =====

  private validateCacheVersion(): void {
    const storedVersion = localStorage.getItem(CACHE_KEYS.CACHE_VERSION)
    if (storedVersion !== CACHE_VERSION) {
      DebugUtils.info(
        MODULE_NAME,
        `Cache version mismatch (${storedVersion} → ${CACHE_VERSION}), clearing cache`
      )
      this.clearAll()
      localStorage.setItem(CACHE_KEYS.CACHE_VERSION, CACHE_VERSION)
    }
  }

  // ===== BALANCES CACHE =====

  cacheBalances(balances: PreparationBalance[], department?: 'kitchen' | 'bar'): void {
    try {
      const cached: CachedData<PreparationBalance[]> = {
        data: balances,
        metadata: {
          timestamp: TimeUtils.getCurrentLocalISO(),
          version: CACHE_VERSION,
          department
        }
      }
      localStorage.setItem(CACHE_KEYS.BALANCES, JSON.stringify(cached))
      DebugUtils.debug(MODULE_NAME, 'Balances cached', { count: balances.length, department })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to cache balances', { error })
    }
  }

  getCachedBalances(): { data: PreparationBalance[]; isStale: boolean } | null {
    try {
      const stored = localStorage.getItem(CACHE_KEYS.BALANCES)
      if (!stored) return null

      const cached: CachedData<PreparationBalance[]> = JSON.parse(stored)

      if (!this.isValidCache(cached.metadata)) {
        return null
      }

      const isStale = this.isCacheStale(cached.metadata.timestamp)

      return { data: cached.data, isStale }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to read cached balances', { error })
      return null
    }
  }

  // ===== SCHEDULE CACHE =====

  cacheSchedule(items: ProductionScheduleItem[], department?: 'kitchen' | 'bar'): void {
    try {
      const cached: CachedData<ProductionScheduleItem[]> = {
        data: items,
        metadata: {
          timestamp: TimeUtils.getCurrentLocalISO(),
          version: CACHE_VERSION,
          department
        }
      }
      localStorage.setItem(CACHE_KEYS.SCHEDULE, JSON.stringify(cached))
      DebugUtils.debug(MODULE_NAME, 'Schedule cached', { count: items.length, department })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to cache schedule', { error })
    }
  }

  getCachedSchedule(): { data: ProductionScheduleItem[]; isStale: boolean } | null {
    try {
      const stored = localStorage.getItem(CACHE_KEYS.SCHEDULE)
      if (!stored) return null

      const cached: CachedData<ProductionScheduleItem[]> = JSON.parse(stored)

      if (!this.isValidCache(cached.metadata)) {
        return null
      }

      const isStale = this.isCacheStale(cached.metadata.timestamp)

      return { data: cached.data, isStale }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to read cached schedule', { error })
      return null
    }
  }

  // ===== KPI ENTRIES CACHE =====

  cacheKpiEntries(entries: KitchenKpiEntry[], department?: 'kitchen' | 'bar'): void {
    try {
      const cached: CachedData<KitchenKpiEntry[]> = {
        data: entries,
        metadata: {
          timestamp: TimeUtils.getCurrentLocalISO(),
          version: CACHE_VERSION,
          department
        }
      }
      localStorage.setItem(CACHE_KEYS.KPI_ENTRIES, JSON.stringify(cached))
      DebugUtils.debug(MODULE_NAME, 'KPI entries cached', { count: entries.length, department })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to cache KPI entries', { error })
    }
  }

  getCachedKpiEntries(): { data: KitchenKpiEntry[]; isStale: boolean } | null {
    try {
      const stored = localStorage.getItem(CACHE_KEYS.KPI_ENTRIES)
      if (!stored) return null

      const cached: CachedData<KitchenKpiEntry[]> = JSON.parse(stored)

      if (!this.isValidCache(cached.metadata)) {
        return null
      }

      const isStale = this.isCacheStale(cached.metadata.timestamp)

      return { data: cached.data, isStale }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to read cached KPI entries', { error })
      return null
    }
  }

  // ===== RECOMMENDATIONS CACHE =====

  cacheRecommendations(
    recommendations: ProductionRecommendation[],
    department?: 'kitchen' | 'bar'
  ): void {
    try {
      const cached: CachedData<ProductionRecommendation[]> = {
        data: recommendations,
        metadata: {
          timestamp: TimeUtils.getCurrentLocalISO(),
          version: CACHE_VERSION,
          department
        }
      }
      localStorage.setItem(CACHE_KEYS.RECOMMENDATIONS, JSON.stringify(cached))
      DebugUtils.debug(MODULE_NAME, 'Recommendations cached', {
        count: recommendations.length,
        department
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to cache recommendations', { error })
    }
  }

  getCachedRecommendations(): { data: ProductionRecommendation[]; isStale: boolean } | null {
    try {
      const stored = localStorage.getItem(CACHE_KEYS.RECOMMENDATIONS)
      if (!stored) return null

      const cached: CachedData<ProductionRecommendation[]> = JSON.parse(stored)

      if (!this.isValidCache(cached.metadata)) {
        return null
      }

      const isStale = this.isCacheStale(cached.metadata.timestamp)

      return { data: cached.data, isStale }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to read cached recommendations', { error })
      return null
    }
  }

  // ===== LAST SYNC TRACKING =====

  recordLastSync(): void {
    localStorage.setItem(CACHE_KEYS.LAST_SYNC, TimeUtils.getCurrentLocalISO())
  }

  getLastSyncTime(): string | null {
    return localStorage.getItem(CACHE_KEYS.LAST_SYNC)
  }

  getTimeSinceLastSync(): string | null {
    const lastSync = this.getLastSyncTime()
    if (!lastSync) return null

    return TimeUtils.getRelativeTime(lastSync)
  }

  // ===== CACHE MANAGEMENT =====

  clearBalances(): void {
    localStorage.removeItem(CACHE_KEYS.BALANCES)
    DebugUtils.debug(MODULE_NAME, 'Balances cache cleared')
  }

  clearSchedule(): void {
    localStorage.removeItem(CACHE_KEYS.SCHEDULE)
    DebugUtils.debug(MODULE_NAME, 'Schedule cache cleared')
  }

  clearKpiEntries(): void {
    localStorage.removeItem(CACHE_KEYS.KPI_ENTRIES)
    DebugUtils.debug(MODULE_NAME, 'KPI entries cache cleared')
  }

  clearRecommendations(): void {
    localStorage.removeItem(CACHE_KEYS.RECOMMENDATIONS)
    DebugUtils.debug(MODULE_NAME, 'Recommendations cache cleared')
  }

  clearAll(): void {
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
    DebugUtils.info(MODULE_NAME, 'All cache cleared')
  }

  // ===== UTILITY METHODS =====

  private isValidCache(metadata: CacheMetadata): boolean {
    return metadata.version === CACHE_VERSION
  }

  private isCacheStale(timestamp: string): boolean {
    const cacheTime = new Date(timestamp).getTime()
    const now = Date.now()
    return now - cacheTime > CACHE_EXPIRY_MS
  }

  /**
   * Get cache statistics for debugging/UI
   */
  getCacheStats(): {
    hasBalances: boolean
    hasSchedule: boolean
    hasKpiEntries: boolean
    hasRecommendations: boolean
    lastSync: string | null
    timeSinceSync: string | null
  } {
    return {
      hasBalances: localStorage.getItem(CACHE_KEYS.BALANCES) !== null,
      hasSchedule: localStorage.getItem(CACHE_KEYS.SCHEDULE) !== null,
      hasKpiEntries: localStorage.getItem(CACHE_KEYS.KPI_ENTRIES) !== null,
      hasRecommendations: localStorage.getItem(CACHE_KEYS.RECOMMENDATIONS) !== null,
      lastSync: this.getLastSyncTime(),
      timeSinceSync: this.getTimeSinceLastSync()
    }
  }
}

// Singleton export
export const kitchenOfflineCache = KitchenOfflineCache.getInstance()

// Composable for Vue components
export function useKitchenOfflineCache() {
  return kitchenOfflineCache
}
