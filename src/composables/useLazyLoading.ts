// src/composables/useLazyLoading.ts
import { ref, computed, watch, nextTick } from 'vue'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'LazyLoading'

export interface LazyLoadingConfig {
  pageSize?: number
  autoLoad?: boolean
  enableFilters?: boolean
  debounceMs?: number
}

export interface LazyLoadingState {
  loading: boolean
  hasMore: boolean
  error: string | null
  page: number
  pageSize: number
  total: number
  initialized: boolean
}

export interface LazyLoadingMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
  currentCount: number
}

export interface LazyLoadRequest<TFilters = any> {
  page: number
  limit: number
  filters?: TFilters
}

export interface LazyLoadResponse<TItem = any> {
  data: TItem[]
  total?: number
  hasMore?: boolean
  meta?: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
  }
}

export type LazyLoadFetchFn<TItem = any, TFilters = any> = (
  request: LazyLoadRequest<TFilters>
) => Promise<LazyLoadResponse<TItem>>

export function useLazyLoading<TItem = any, TFilters = any>(
  fetchFn: LazyLoadFetchFn<TItem, TFilters>,
  config: LazyLoadingConfig = {}
) {
  const { pageSize = 20, autoLoad = true, enableFilters = true, debounceMs = 300 } = config

  // State
  const state = ref<LazyLoadingState>({
    loading: false,
    hasMore: true,
    error: null,
    page: 1,
    pageSize,
    total: 0,
    initialized: false
  })

  const items = ref<TItem[]>([])
  const filters = ref<TFilters>({} as TFilters)

  // Computed
  const isInitialLoading = computed(
    () => state.value.loading && state.value.page === 1 && !state.value.initialized
  )

  const isLoadingMore = computed(() => state.value.loading && state.value.page > 1)

  const isEmpty = computed(
    () => items.value.length === 0 && !state.value.loading && state.value.initialized
  )

  const hasData = computed(() => items.value.length > 0)

  const meta = computed<LazyLoadingMeta>(() => ({
    page: state.value.page,
    pageSize: state.value.pageSize,
    total: state.value.total,
    totalPages: Math.ceil(state.value.total / state.value.pageSize),
    hasMore: state.value.hasMore,
    currentCount: items.value.length
  }))

  // Debounced filter watcher
  let filterTimeout: NodeJS.Timeout | null = null

  // Methods
  async function load(reset = false): Promise<void> {
    if (state.value.loading) {
      DebugUtils.warn(MODULE_NAME, 'Already loading, skipping request')
      return
    }

    if (!reset && !state.value.hasMore) {
      DebugUtils.info(MODULE_NAME, 'No more data to load')
      return
    }

    try {
      state.value.loading = true
      state.value.error = null

      if (reset) {
        state.value.page = 1
        items.value = []
        state.value.hasMore = true
      }

      const request: LazyLoadRequest<TFilters> = {
        page: state.value.page,
        limit: state.value.pageSize,
        filters: enableFilters ? filters.value : undefined
      }

      DebugUtils.info(MODULE_NAME, 'Loading data', {
        page: state.value.page,
        pageSize: state.value.pageSize,
        reset,
        filtersEnabled: enableFilters,
        filters: request.filters
      })

      const response = await fetchFn(request)

      if (reset) {
        items.value = response.data
      } else {
        // Добавляем новые элементы, избегая дубликатов
        const existingIds = new Set(items.value.map((item: any) => item.id || item))
        const uniqueNewItems = response.data.filter(
          (item: any) => !existingIds.has(item.id || item)
        )
        items.value.push(...uniqueNewItems)
      }

      // Обновляем метаданные
      const loadedCount = response.data.length

      if (response.meta) {
        state.value.total = response.meta.totalCount
        state.value.hasMore = response.meta.page < response.meta.totalPages
      } else {
        // Fallback logic
        state.value.hasMore = response.hasMore ?? loadedCount === state.value.pageSize
        state.value.total =
          response.total ?? (reset ? loadedCount : state.value.total + loadedCount)
      }

      if (loadedCount > 0) {
        state.value.page += 1
      }

      state.value.initialized = true

      DebugUtils.info(MODULE_NAME, 'Data loaded successfully', {
        loadedCount,
        totalCount: items.value.length,
        hasMore: state.value.hasMore,
        total: state.value.total
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data'
      state.value.error = errorMessage

      DebugUtils.error(MODULE_NAME, 'Failed to load data', {
        error,
        page: state.value.page,
        filters: filters.value
      })
    } finally {
      state.value.loading = false
    }
  }

  async function loadMore(): Promise<void> {
    if (!state.value.hasMore || state.value.loading) {
      return
    }

    await load(false)
  }

  async function refresh(): Promise<void> {
    await load(true)
  }

  function updateFilters(newFilters: Partial<TFilters>): void {
    if (!enableFilters) {
      DebugUtils.warn(MODULE_NAME, 'Filters are disabled for this instance')
      return
    }

    filters.value = { ...filters.value, ...newFilters }
    DebugUtils.info(MODULE_NAME, 'Filters updated', filters.value)
  }

  function setFilters(newFilters: TFilters): void {
    if (!enableFilters) {
      DebugUtils.warn(MODULE_NAME, 'Filters are disabled for this instance')
      return
    }

    filters.value = newFilters
    DebugUtils.info(MODULE_NAME, 'Filters set', filters.value)
  }

  function reset(): void {
    state.value = {
      loading: false,
      hasMore: true,
      error: null,
      page: 1,
      pageSize,
      total: 0,
      initialized: false
    }
    items.value = []
    if (enableFilters) {
      filters.value = {} as TFilters
    }
  }

  function clearError(): void {
    state.value.error = null
  }

  // Auto-reload when filters change (with debounce)
  if (enableFilters) {
    watch(
      () => filters.value,
      () => {
        if (filterTimeout) {
          clearTimeout(filterTimeout)
        }

        filterTimeout = setTimeout(() => {
          if (state.value.initialized) {
            refresh()
          }
        }, debounceMs)
      },
      { deep: true }
    )
  }

  // Auto-load on creation
  if (autoLoad) {
    nextTick(() => {
      load(true)
    })
  }

  return {
    // State
    state: computed(() => state.value),
    items: computed(() => items.value),
    filters: computed(() => filters.value),

    // Computed flags
    isInitialLoading,
    isLoadingMore,
    isEmpty,
    hasData,
    meta,

    // Methods
    load,
    loadMore,
    refresh,
    updateFilters,
    setFilters,
    reset,
    clearError
  }
}

// Специализированные типы для разных сущностей
export interface TransactionFilters {
  dateFrom?: string | null
  dateTo?: string | null
  type?: string | null
  accountId?: string | null
}

export interface AccountFilters {
  type?: string | null
  isActive?: boolean | null
  search?: string | null
}

export interface PaymentFilters {
  status?: string | null
  priority?: string | null
  counteragentId?: string | null
}

// Типизированные версии для конкретных сущностей
export type TransactionLazyLoading = ReturnType<typeof useLazyLoading<any, TransactionFilters>>
export type AccountLazyLoading = ReturnType<typeof useLazyLoading<any, AccountFilters>>
export type PaymentLazyLoading = ReturnType<typeof useLazyLoading<any, PaymentFilters>>
