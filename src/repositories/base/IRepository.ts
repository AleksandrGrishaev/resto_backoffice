// src/repositories/base/IRepository.ts - Базовые интерфейсы для репозиториев

import type { ServiceResponse, PaginatedResponse, BatchResponse } from './ServiceResponse'

/**
 * Базовая сущность с ID
 */
export interface BaseEntity {
  id: string
  createdAt?: string
  updatedAt?: string
}

/**
 * Параметры поиска
 */
export interface FindOptions {
  /** Поля для выборки */
  select?: string[]

  /** Условия фильтрации */
  where?: Record<string, any>

  /** Сортировка */
  orderBy?: Array<{
    field: string
    direction: 'asc' | 'desc'
  }>

  /** Лимит результатов */
  limit?: number

  /** Смещение для пагинации */
  offset?: number
}

/**
 * Базовый интерфейс репозитория
 */
export interface IRepository<T extends BaseEntity> {
  /**
   * Найти все сущности
   */
  findAll(options?: FindOptions): Promise<ServiceResponse<T[]>>

  /**
   * Найти сущность по ID
   */
  findById(id: string): Promise<ServiceResponse<T | null>>

  /**
   * Найти сущности по условию
   */
  findWhere(conditions: Partial<T>): Promise<ServiceResponse<T[]>>

  /**
   * Найти первую сущность по условию
   */
  findOne(conditions: Partial<T>): Promise<ServiceResponse<T | null>>

  /**
   * Сохранить сущность (создать или обновить)
   */
  save(entity: T): Promise<ServiceResponse<T>>

  /**
   * Создать новую сущность
   */
  create(entity: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResponse<T>>

  /**
   * Обновить существующую сущность
   */
  update(id: string, updates: Partial<T>): Promise<ServiceResponse<T>>

  /**
   * Удалить сущность по ID
   */
  delete(id: string): Promise<ServiceResponse<void>>

  /**
   * Проверить существование сущности
   */
  exists(id: string): Promise<ServiceResponse<boolean>>

  /**
   * Подсчитать количество сущностей
   */
  count(conditions?: Partial<T>): Promise<ServiceResponse<number>>
}

/**
 * Расширенный репозиторий с дополнительными возможностями
 */
export interface IExtendedRepository<T extends BaseEntity> extends IRepository<T> {
  /**
   * Найти с пагинацией
   */
  findPaginated(page: number, limit: number, options?: FindOptions): Promise<PaginatedResponse<T>>

  /**
   * Batch создание
   */
  createMany(entities: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<BatchResponse<T>>

  /**
   * Batch обновление
   */
  updateMany(updates: Array<{ id: string; data: Partial<T> }>): Promise<BatchResponse<T>>

  /**
   * Batch удаление
   */
  deleteMany(ids: string[]): Promise<BatchResponse<void>>

  /**
   * Soft delete (если поддерживается)
   */
  softDelete?(id: string): Promise<ServiceResponse<void>>

  /**
   * Восстановить удаленную сущность
   */
  restore?(id: string): Promise<ServiceResponse<T>>
}

/**
 * Репозиторий с поддержкой синхронизации
 */
export interface ISyncableRepository<T extends BaseEntity> extends IRepository<T> {
  /**
   * Синхронизировать с удаленным источником
   */
  sync(): Promise<
    ServiceResponse<{
      pulled: number
      pushed: number
      conflicts: number
    }>
  >

  /**
   * Получить изменения с удаленного источника
   */
  pull(): Promise<ServiceResponse<T[]>>

  /**
   * Отправить изменения на удаленный источник
   */
  push(): Promise<ServiceResponse<void>>

  /**
   * Получить локальные изменения, ожидающие синхронизации
   */
  getPendingChanges(): Promise<ServiceResponse<T[]>>

  /**
   * Пометить изменения как синхронизированные
   */
  markAsSynced(ids: string[]): Promise<ServiceResponse<void>>
}

/**
 * Кэширующий репозиторий
 */
export interface ICacheableRepository<T extends BaseEntity> extends IRepository<T> {
  /**
   * Очистить кэш
   */
  clearCache(): Promise<ServiceResponse<void>>

  /**
   * Очистить кэш для конкретной сущности
   */
  clearCacheFor(id: string): Promise<ServiceResponse<void>>

  /**
   * Получить статистику кэша
   */
  getCacheStats(): Promise<
    ServiceResponse<{
      size: number
      hitRate: number
      lastCleared?: string
    }>
  >
}

/**
 * Репозиторий только для чтения
 */
export interface IReadOnlyRepository<T extends BaseEntity> {
  findAll(options?: FindOptions): Promise<ServiceResponse<T[]>>
  findById(id: string): Promise<ServiceResponse<T | null>>
  findWhere(conditions: Partial<T>): Promise<ServiceResponse<T[]>>
  findOne(conditions: Partial<T>): Promise<ServiceResponse<T | null>>
  exists(id: string): Promise<ServiceResponse<boolean>>
  count(conditions?: Partial<T>): Promise<ServiceResponse<number>>
}

/**
 * Комбинированный интерфейс для полнофункционального репозитория
 */
export interface IFullRepository<T extends BaseEntity>
  extends IExtendedRepository<T>,
    ISyncableRepository<T>,
    ICacheableRepository<T> {}

// ===== ТИПЫ КОНФИГУРАЦИИ =====

/**
 * Конфигурация репозитория
 */
export interface RepositoryConfig {
  /** Тип хранилища */
  storageType: 'localStorage' | 'indexedDB' | 'capacitor' | 'api'

  /** Включить кэширование */
  enableCache?: boolean

  /** TTL кэша в секундах */
  cacheTTL?: number

  /** Включить синхронизацию */
  enableSync?: boolean

  /** URL API для синхронизации */
  apiUrl?: string

  /** Дебаг режим */
  debug?: boolean

  /** Префикс для ключей localStorage */
  storagePrefix?: string
}
