// src/repositories/base/index.ts - Экспорт всех базовых типов и классов

// ===== INTERFACES =====
export type {
  BaseEntity,
  FindOptions,
  IRepository,
  IExtendedRepository,
  ISyncableRepository,
  ICacheableRepository,
  IReadOnlyRepository,
  IFullRepository,
  RepositoryConfig
} from './IRepository'

// ===== SERVICE RESPONSE =====
export type {
  DataSource,
  OperationStatus,
  ResponseMetadata,
  ServiceResponse,
  PaginatedResponse,
  BatchResponse
} from './ServiceResponse'

export { ResponseFactory, ResponseUtils } from './ServiceResponse'

// ===== IMPLEMENTATIONS =====
export { LocalStorageRepository } from './LocalStorageRepository'

// ===== FACTORY FUNCTIONS =====

import { LocalStorageRepository } from './LocalStorageRepository'
import { usePlatform } from '@/composables/usePlatform'
import type { BaseEntity, IRepository, RepositoryConfig } from './IRepository'

/**
 * Фабрика для создания репозиториев в зависимости от платформы и настроек
 */
export class RepositoryFactory {
  private static platform = usePlatform()

  /**
   * Создать репозиторий для сущности
   */
  static create<T extends BaseEntity>(
    entityName: string,
    config?: Partial<RepositoryConfig>
  ): IRepository<T> {
    const finalConfig: RepositoryConfig = {
      storageType: 'localStorage',
      enableCache: false,
      debug: this.platform.debugEnabled.value,
      storagePrefix: 'kitchen-app',
      ...config
    }

    // Пока поддерживаем только localStorage
    // TODO: Добавить поддержку других типов хранилища
    switch (finalConfig.storageType) {
      case 'localStorage':
        return new LocalStorageRepository<T>(entityName, finalConfig)

      case 'indexedDB':
        // TODO: Реализовать IndexedDBRepository
        throw new Error('IndexedDB repository not implemented yet')

      case 'capacitor':
        // TODO: Реализовать CapacitorRepository для мобильных приложений
        throw new Error('Capacitor repository not implemented yet')

      case 'api':
        // TODO: Реализовать APIRepository
        throw new Error('API repository not implemented yet')

      default:
        throw new Error(`Unsupported storage type: ${finalConfig.storageType}`)
    }
  }

  /**
   * Создать репозиторий с автоопределением типа хранилища
   */
  static createAuto<T extends BaseEntity>(
    entityName: string,
    config?: Partial<RepositoryConfig>
  ): IRepository<T> {
    const strategy = this.platform.getPersistenceStrategy()

    let storageType: RepositoryConfig['storageType']
    switch (strategy) {
      case 'local':
        storageType = 'localStorage'
        break
      case 'api':
        storageType = 'api'
        break
      case 'hybrid':
        // Для hybrid режима пока используем localStorage с синхронизацией
        storageType = 'localStorage'
        break
      default:
        storageType = 'localStorage'
    }

    return this.create<T>(entityName, {
      ...config,
      storageType
    })
  }
}

// ===== COMPOSABLE =====

/**
 * Composable для работы с репозиториями
 */
export function useRepository<T extends BaseEntity>(
  entityName: string,
  config?: Partial<RepositoryConfig>
) {
  const repository = RepositoryFactory.createAuto<T>(entityName, config)

  return {
    repository,
    // Удобные методы
    findAll: repository.findAll.bind(repository),
    findById: repository.findById.bind(repository),
    save: repository.save.bind(repository),
    create: repository.create.bind(repository),
    update: repository.update.bind(repository),
    delete: repository.delete.bind(repository)
  }
}
