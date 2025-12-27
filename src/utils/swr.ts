// src/utils/swr.ts - Stale-While-Revalidate utility for caching
// Sprint 8: Optimized loading with instant cache + background refresh

import { ref, readonly, type Ref } from 'vue'
import { DebugUtils } from './debugger'

const MODULE_NAME = 'SWR'

/**
 * SWR Configuration
 */
export interface SWRConfig<T> {
  /** Unique cache key (used for localStorage) */
  key: string
  /** Function to fetch fresh data */
  fetcher: () => Promise<T>
  /** Time in ms before data is considered stale (default: 30 minutes) */
  staleTime?: number
  /** Whether to revalidate on mount (default: true) */
  revalidateOnMount?: boolean
  /** Callback on successful fetch */
  onSuccess?: (data: T) => void
  /** Callback on error */
  onError?: (error: Error) => void
}

/**
 * SWR Return type
 */
export interface SWRReturn<T> {
  /** Current data (reactive) */
  data: Readonly<Ref<T | null>>
  /** Current error (reactive) */
  error: Readonly<Ref<Error | null>>
  /** Initial loading state (reactive) */
  isLoading: Readonly<Ref<boolean>>
  /** Background revalidation state (reactive) */
  isValidating: Readonly<Ref<boolean>>
  /** Force refresh data */
  refresh: () => Promise<void>
  /** Update cache and optionally revalidate */
  mutate: (newData?: T) => Promise<void>
}

/**
 * Cache entry with timestamp
 */
interface CacheEntry<T> {
  data: T
  timestamp: number
}

// Default stale time: 30 minutes
const DEFAULT_STALE_TIME = 30 * 60 * 1000

/**
 * Get cache key for localStorage
 */
function getCacheKey(key: string): string {
  return `swr_${key}`
}

/**
 * Get timestamp key for localStorage
 */
function getTimestampKey(key: string): string {
  return `swr_${key}_ts`
}

/**
 * Load data from cache
 */
function loadFromCache<T>(key: string): CacheEntry<T> | null {
  try {
    const cacheKey = getCacheKey(key)
    const timestampKey = getTimestampKey(key)

    const cached = localStorage.getItem(cacheKey)
    const timestamp = localStorage.getItem(timestampKey)

    if (cached && timestamp) {
      return {
        data: JSON.parse(cached),
        timestamp: parseInt(timestamp, 10)
      }
    }
  } catch (e) {
    DebugUtils.warn(MODULE_NAME, `Failed to load cache for ${key}`, { error: e })
  }
  return null
}

/**
 * Save data to cache
 */
function saveToCache<T>(key: string, data: T): void {
  try {
    const cacheKey = getCacheKey(key)
    const timestampKey = getTimestampKey(key)

    localStorage.setItem(cacheKey, JSON.stringify(data))
    localStorage.setItem(timestampKey, Date.now().toString())
  } catch (e) {
    DebugUtils.warn(MODULE_NAME, `Failed to save cache for ${key}`, { error: e })
  }
}

/**
 * Check if cache is stale
 */
function isStale(timestamp: number, staleTime: number): boolean {
  return Date.now() - timestamp > staleTime
}

/**
 * Invalidate cache for a key
 */
export function invalidateCache(key: string): void {
  try {
    localStorage.removeItem(getCacheKey(key))
    localStorage.removeItem(getTimestampKey(key))
    DebugUtils.debug(MODULE_NAME, `Cache invalidated: ${key}`)
  } catch (e) {
    DebugUtils.warn(MODULE_NAME, `Failed to invalidate cache for ${key}`, { error: e })
  }
}

/**
 * Invalidate all caches matching a prefix
 */
export function invalidateCacheByPrefix(prefix: string): void {
  try {
    const keys = Object.keys(localStorage)
    let count = 0

    keys.forEach(key => {
      if (key.startsWith(`swr_${prefix}`)) {
        localStorage.removeItem(key)
        count++
      }
    })

    DebugUtils.debug(MODULE_NAME, `Invalidated ${count} caches with prefix: ${prefix}`)
  } catch (e) {
    DebugUtils.warn(MODULE_NAME, `Failed to invalidate caches by prefix: ${prefix}`, { error: e })
  }
}

/**
 * Stale-While-Revalidate hook
 *
 * Usage:
 * ```typescript
 * const { data, isLoading, refresh } = useSWR({
 *   key: 'products',
 *   fetcher: () => productsService.getAll(),
 *   staleTime: 30 * 60 * 1000 // 30 minutes
 * })
 * ```
 */
export function useSWR<T>(config: SWRConfig<T>): SWRReturn<T> {
  const { key, fetcher, staleTime = DEFAULT_STALE_TIME, revalidateOnMount = true } = config

  const data = ref<T | null>(null) as Ref<T | null>
  const error = ref<Error | null>(null)
  const isLoading = ref(true)
  const isValidating = ref(false)

  /**
   * Fetch fresh data from server
   */
  async function revalidate(): Promise<void> {
    isValidating.value = true
    error.value = null

    try {
      const startTime = performance.now()
      const freshData = await fetcher()
      const duration = performance.now() - startTime

      data.value = freshData
      saveToCache(key, freshData)

      DebugUtils.debug(MODULE_NAME, `Revalidated: ${key}`, {
        duration: `${duration.toFixed(0)}ms`
      })

      config.onSuccess?.(freshData)
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Fetch failed')
      error.value = err
      DebugUtils.error(MODULE_NAME, `Revalidation failed: ${key}`, { error: err.message })
      config.onError?.(err)
    } finally {
      isValidating.value = false
      isLoading.value = false
    }
  }

  /**
   * Initialize: load from cache, then revalidate if stale
   */
  async function initialize(): Promise<void> {
    const cached = loadFromCache<T>(key)

    if (cached) {
      // Show cached data immediately
      data.value = cached.data
      isLoading.value = false

      DebugUtils.debug(MODULE_NAME, `Loaded from cache: ${key}`, {
        age: `${Math.round((Date.now() - cached.timestamp) / 1000)}s`,
        isStale: isStale(cached.timestamp, staleTime)
      })

      // Revalidate in background if stale
      if (revalidateOnMount && isStale(cached.timestamp, staleTime)) {
        DebugUtils.debug(MODULE_NAME, `Background revalidating: ${key}`)
        revalidate() // Don't await - run in background
      }
    } else {
      // No cache - must fetch
      DebugUtils.debug(MODULE_NAME, `No cache, fetching: ${key}`)
      await revalidate()
    }
  }

  /**
   * Force refresh (invalidate cache and fetch)
   */
  async function refresh(): Promise<void> {
    invalidateCache(key)
    await revalidate()
  }

  /**
   * Update cache (optimistic update)
   */
  async function mutate(newData?: T): Promise<void> {
    if (newData !== undefined) {
      data.value = newData
      saveToCache(key, newData)
    }
    await revalidate()
  }

  // Auto-initialize
  initialize()

  return {
    data: readonly(data),
    error: readonly(error),
    isLoading: readonly(isLoading),
    isValidating: readonly(isValidating),
    refresh,
    mutate
  }
}

/**
 * Simple cache helper for non-reactive usage
 * Useful in services and stores
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  staleTime: number = DEFAULT_STALE_TIME
): Promise<T> {
  const cached = loadFromCache<T>(key)

  // Return cache if fresh
  if (cached && !isStale(cached.timestamp, staleTime)) {
    DebugUtils.debug(MODULE_NAME, `Cache hit: ${key}`)
    return cached.data
  }

  // Fetch fresh data
  DebugUtils.debug(
    MODULE_NAME,
    cached ? `Cache stale, fetching: ${key}` : `No cache, fetching: ${key}`
  )
  const freshData = await fetcher()
  saveToCache(key, freshData)

  return freshData
}

/**
 * Preload data into cache (for prefetching)
 */
export function preloadCache<T>(key: string, data: T): void {
  saveToCache(key, data)
  DebugUtils.debug(MODULE_NAME, `Preloaded cache: ${key}`)
}
