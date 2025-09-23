// src/composables/usePersistence.ts - Адаптивный слой персистентности для stores

import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePlatform } from './usePlatform'
import {
  RepositoryFactory,
  useRepository,
  type BaseEntity,
  type IRepository,
  type ServiceResponse,
  type RepositoryConfig
} from '@/repositories/base'

/**
 * Стратегии персистентности
 */
export type PersistenceStrategy = 'local' | 'api' | 'hybrid' | 'offline-first'

/**
 * Конфигурация персистентности
 */
export interface PersistenceConfig extends Partial<RepositoryConfig> {
  /** Принудительная стратегия (переопределяет автоматическое определение) */
  forceStrategy?: PersistenceStrategy

  /** Имя entity для логирования */
  entityName: string

  /** Кастомный префикс для хранения */
  customPrefix?: string

  /** Включить автоматическую синхронизацию */
  autoSync?: boolean

  /** Интервал автоматической синхронизации в мс */
  syncInterval?: number
}

/**
 * Результат создания persistence layer
 */
export interface PersistenceLayer<T extends BaseEntity> {
  /** Репозиторий для работы с данными */
  repository: IRepository<T>

  /** Текущая стратегия персистентности */
  strategy: PersistenceStrategy

  /** Конфигурация */
  config: PersistenceConfig

  /** Утилиты для работы с данными */
  utils: {
    /** Проверить доступность синхронизации */
    canSync: () => boolean

    /** Получить статистику хранилища */
    getStats: () => Promise<ServiceResponse<any>>

    /** Очистить локальные данные */
    clearLocal: () => Promise<ServiceResponse<void>>

    /** Форсировать синхронизацию (если доступна) */
    forceSync: () => Promise<ServiceResponse<void>>
  }
}

/**
 * Основной composable для создания адаптивного слоя персистентности
 */
export function usePersistence<T extends BaseEntity>(
  config: PersistenceConfig
): PersistenceLayer<T> {
  const authStore = useAuthStore()
  const platform = usePlatform()

  // ===== ОПРЕДЕЛЕНИЕ СТРАТЕГИИ =====

  const strategy = computed<PersistenceStrategy>(() => {
    // Если задана принудительная стратегия
    if (config.forceStrategy) {
      return config.forceStrategy
    }

    const userRoles = authStore.userRoles
    const isOnline = platform.isOnline.value

    // POS роли с поддержкой offline
    if (['cashier', 'waiter'].includes(userRoles[0]) && platform.offlineEnabled.value) {
      return 'offline-first'
    }

    // Admin роли - online first или local если нет API
    if (['admin', 'manager'].includes(userRoles[0])) {
      if (isOnline && platform.capabilities.value.canSync) {
        return 'hybrid'
      }
      return 'local'
    }

    // Fallback - local storage
    return 'local'
  })

  // ===== СОЗДАНИЕ REPOSITORY =====

  const repositoryConfig: RepositoryConfig = {
    storageType: 'localStorage',
    enableCache: strategy.value === 'hybrid',
    cacheTTL: 300, // 5 минут
    enableSync: strategy.value === 'hybrid' || strategy.value === 'offline-first',
    debug: platform.debugEnabled.value,
    storagePrefix: config.customPrefix || 'kitchen-app',
    ...config
  }

  const repository = RepositoryFactory.create<T>(config.entityName, repositoryConfig)

  // ===== UTILITIES =====

  const utils = {
    canSync: (): boolean => {
      return (
        platform.isOnline.value &&
        (strategy.value === 'hybrid' || strategy.value === 'offline-first') &&
        platform.capabilities.value.canSync
      )
    },

    async getStats(): Promise<ServiceResponse<any>> {
      try {
        // Если репозиторий поддерживает статистику
        if ('getStorageStats' in repository && typeof repository.getStorageStats === 'function') {
          return await (repository as any).getStorageStats()
        }

        // Базовая статистика
        const countResult = await repository.count()
        if (countResult.success) {
          return {
            success: true,
            data: {
              count: countResult.data,
              strategy: strategy.value,
              online: platform.isOnline.value,
              canSync: utils.canSync()
            },
            metadata: {
              timestamp: new Date().toISOString(),
              source: 'local'
            }
          }
        }

        return countResult as ServiceResponse<any>
      } catch (error) {
        return {
          success: false,
          error: `Failed to get stats: ${error}`,
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'local'
          }
        }
      }
    },

    async clearLocal(): Promise<ServiceResponse<void>> {
      try {
        // Если репозиторий поддерживает очистку
        if ('clear' in repository && typeof repository.clear === 'function') {
          return await (repository as any).clear()
        }

        // Альтернативный способ - получить все и удалить
        const allResult = await repository.findAll()
        if (allResult.success && allResult.data) {
          const deletePromises = allResult.data.map(item => repository.delete(item.id))
          await Promise.all(deletePromises)
        }

        platform.debugLog('Persistence', `Cleared local data for ${config.entityName}`)

        return {
          success: true,
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'local'
          }
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to clear local data: ${error}`,
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'local'
          }
        }
      }
    },

    async forceSync(): Promise<ServiceResponse<void>> {
      if (!utils.canSync()) {
        return {
          success: false,
          error: 'Sync is not available (offline or not configured)',
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'local'
          }
        }
      }

      try {
        // TODO: Реализовать синхронизацию когда будет API
        platform.debugLog('Persistence', `Force sync for ${config.entityName} (mock)`)

        return {
          success: true,
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'api'
          }
        }
      } catch (error) {
        return {
          success: false,
          error: `Sync failed: ${error}`,
          metadata: {
            timestamp: new Date().toISOString(),
            source: 'local'
          }
        }
      }
    }
  }

  // ===== DEBUG LOGGING =====

  if (platform.debugEnabled.value) {
    platform.debugLog('Persistence', `Created persistence layer for ${config.entityName}`, {
      strategy: strategy.value,
      config: repositoryConfig,
      userRoles: authStore.userRoles,
      platform: platform.platform.value
    })
  }

  // ===== RETURN =====

  return {
    repository,
    strategy: strategy.value,
    config,
    utils
  }
}

// ===== СПЕЦИАЛИЗИРОВАННЫЕ COMPOSABLES =====

/**
 * Composable для Backoffice stores (admin/manager)
 */
export function useBackofficePersistence<T extends BaseEntity>(entityName: string) {
  return usePersistence<T>({
    entityName,
    forceStrategy: 'local', // Пока только local для простоты
    enableCache: false,
    debug: true
  })
}

/**
 * Composable для POS stores (cashier)
 */
export function usePOSPersistence<T extends BaseEntity>(entityName: string) {
  return usePersistence<T>({
    entityName,
    forceStrategy: 'offline-first',
    enableCache: true,
    autoSync: true,
    syncInterval: 30000, // 30 секунд
    debug: true
  })
}

/**
 * Composable для общих данных (menu, products)
 */
export function useSharedPersistence<T extends BaseEntity>(entityName: string) {
  return usePersistence<T>({
    entityName,
    enableCache: true,
    cacheTTL: 600, // 10 минут
    debug: true
  })
}
