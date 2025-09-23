// src/repositories/base/LocalStorageRepository.ts - Базовая реализация для localStorage

import type { BaseEntity, IRepository, FindOptions, RepositoryConfig } from './IRepository'
import { ResponseFactory, type ServiceResponse } from './ServiceResponse'
import { usePlatform } from '@/composables/usePlatform'

/**
 * Базовая реализация репозитория на localStorage
 */
export class LocalStorageRepository<T extends BaseEntity> implements IRepository<T> {
  private readonly storageKey: string
  private readonly config: RepositoryConfig
  private readonly platform = usePlatform()

  constructor(entityName: string, config?: Partial<RepositoryConfig>) {
    this.config = {
      storageType: 'localStorage',
      enableCache: false,
      storagePrefix: 'kitchen-app',
      debug: false,
      ...config
    }

    this.storageKey = `${this.config.storagePrefix}:${entityName}`

    if (this.config.debug) {
      this.debugLog('Repository initialized', { entityName, storageKey: this.storageKey })
    }
  }

  // ===== CORE METHODS =====

  async findAll(options?: FindOptions): Promise<ServiceResponse<T[]>> {
    try {
      const data = this.loadFromStorage()
      let result = data

      if (options) {
        result = this.applyFindOptions(data, options)
      }

      this.debugLog('findAll', { count: result.length, options })
      return ResponseFactory.success(result, 'local')
    } catch (error) {
      this.debugLog('findAll error', { error })
      return ResponseFactory.error(`Failed to load data: ${error}`)
    }
  }

  async findById(id: string): Promise<ServiceResponse<T | null>> {
    try {
      const data = this.loadFromStorage()
      const entity = data.find(item => item.id === id) || null

      this.debugLog('findById', { id, found: !!entity })
      return ResponseFactory.success(entity, 'local')
    } catch (error) {
      this.debugLog('findById error', { id, error })
      return ResponseFactory.error(`Failed to find entity: ${error}`)
    }
  }

  async findWhere(conditions: Partial<T>): Promise<ServiceResponse<T[]>> {
    try {
      const data = this.loadFromStorage()
      const result = data.filter(item =>
        Object.entries(conditions).every(([key, value]) => item[key as keyof T] === value)
      )

      this.debugLog('findWhere', { conditions, count: result.length })
      return ResponseFactory.success(result, 'local')
    } catch (error) {
      this.debugLog('findWhere error', { conditions, error })
      return ResponseFactory.error(`Failed to find entities: ${error}`)
    }
  }

  async findOne(conditions: Partial<T>): Promise<ServiceResponse<T | null>> {
    try {
      const data = this.loadFromStorage()
      const entity =
        data.find(item =>
          Object.entries(conditions).every(([key, value]) => item[key as keyof T] === value)
        ) || null

      this.debugLog('findOne', { conditions, found: !!entity })
      return ResponseFactory.success(entity, 'local')
    } catch (error) {
      this.debugLog('findOne error', { conditions, error })
      return ResponseFactory.error(`Failed to find entity: ${error}`)
    }
  }

  async save(entity: T): Promise<ServiceResponse<T>> {
    try {
      const data = this.loadFromStorage()
      const now = new Date().toISOString()

      // Проверяем, существует ли сущность
      const existingIndex = data.findIndex(item => item.id === entity.id)

      if (existingIndex >= 0) {
        // Обновляем существующую
        data[existingIndex] = {
          ...entity,
          updatedAt: now
        }
      } else {
        // Создаем новую
        data.push({
          ...entity,
          createdAt: entity.createdAt || now,
          updatedAt: now
        })
      }

      this.saveToStorage(data)

      this.debugLog('save', { id: entity.id, isUpdate: existingIndex >= 0 })
      return ResponseFactory.success(entity, 'local')
    } catch (error) {
      this.debugLog('save error', { entity: entity.id, error })
      return ResponseFactory.error(`Failed to save entity: ${error}`)
    }
  }

  async create(entityData: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResponse<T>> {
    try {
      const now = new Date().toISOString()
      const entity: T = {
        ...entityData,
        id: this.generateId(),
        createdAt: now,
        updatedAt: now
      } as T

      const saveResult = await this.save(entity)

      if (saveResult.success) {
        this.debugLog('create', { id: entity.id })
        return ResponseFactory.success(entity, 'local')
      } else {
        return saveResult
      }
    } catch (error) {
      this.debugLog('create error', { error })
      return ResponseFactory.error(`Failed to create entity: ${error}`)
    }
  }

  async update(id: string, updates: Partial<T>): Promise<ServiceResponse<T>> {
    try {
      const data = this.loadFromStorage()
      const entityIndex = data.findIndex(item => item.id === id)

      if (entityIndex === -1) {
        return ResponseFactory.error('Entity not found', 'NOT_FOUND')
      }

      const updatedEntity: T = {
        ...data[entityIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      }

      data[entityIndex] = updatedEntity
      this.saveToStorage(data)

      this.debugLog('update', { id, updates })
      return ResponseFactory.success(updatedEntity, 'local')
    } catch (error) {
      this.debugLog('update error', { id, updates, error })
      return ResponseFactory.error(`Failed to update entity: ${error}`)
    }
  }

  async delete(id: string): Promise<ServiceResponse<void>> {
    try {
      const data = this.loadFromStorage()
      const initialLength = data.length
      const filteredData = data.filter(item => item.id !== id)

      if (filteredData.length === initialLength) {
        return ResponseFactory.error('Entity not found', 'NOT_FOUND')
      }

      this.saveToStorage(filteredData)

      this.debugLog('delete', { id })
      return ResponseFactory.empty('local')
    } catch (error) {
      this.debugLog('delete error', { id, error })
      return ResponseFactory.error(`Failed to delete entity: ${error}`)
    }
  }

  async exists(id: string): Promise<ServiceResponse<boolean>> {
    try {
      const data = this.loadFromStorage()
      const exists = data.some(item => item.id === id)

      this.debugLog('exists', { id, exists })
      return ResponseFactory.success(exists, 'local')
    } catch (error) {
      this.debugLog('exists error', { id, error })
      return ResponseFactory.error(`Failed to check existence: ${error}`)
    }
  }

  async count(conditions?: Partial<T>): Promise<ServiceResponse<number>> {
    try {
      const data = this.loadFromStorage()

      let count: number
      if (conditions) {
        count = data.filter(item =>
          Object.entries(conditions).every(([key, value]) => item[key as keyof T] === value)
        ).length
      } else {
        count = data.length
      }

      this.debugLog('count', { conditions, count })
      return ResponseFactory.success(count, 'local')
    } catch (error) {
      this.debugLog('count error', { conditions, error })
      return ResponseFactory.error(`Failed to count entities: ${error}`)
    }
  }

  // ===== PRIVATE METHODS =====

  private loadFromStorage(): T[] {
    try {
      const storage = this.platform.getStorageInterface()
      const data = storage.getItem(this.storageKey)

      if (!data) {
        return []
      }

      return JSON.parse(data)
    } catch (error) {
      console.warn(`Failed to load from storage: ${error}`)
      return []
    }
  }

  private saveToStorage(data: T[]): void {
    try {
      const storage = this.platform.getStorageInterface()
      storage.setItem(this.storageKey, JSON.stringify(data))
    } catch (error) {
      throw new Error(`Failed to save to storage: ${error}`)
    }
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private applyFindOptions(data: T[], options: FindOptions): T[] {
    let result = [...data]

    // Apply where conditions
    if (options.where) {
      result = result.filter(item =>
        Object.entries(options.where!).every(([key, value]) => item[key as keyof T] === value)
      )
    }

    // Apply sorting
    if (options.orderBy && options.orderBy.length > 0) {
      result.sort((a, b) => {
        for (const { field, direction } of options.orderBy!) {
          const aVal = a[field as keyof T]
          const bVal = b[field as keyof T]

          if (aVal !== bVal) {
            const comparison = aVal > bVal ? 1 : -1
            return direction === 'desc' ? -comparison : comparison
          }
        }
        return 0
      })
    }

    // Apply pagination
    if (options.offset !== undefined || options.limit !== undefined) {
      const start = options.offset || 0
      const end = options.limit !== undefined ? start + options.limit : undefined
      result = result.slice(start, end)
    }

    return result
  }

  private debugLog(operation: string, data?: any): void {
    if (this.config.debug) {
      this.platform.debugLog('LocalStorageRepository', `${operation}`, data)
    }
  }

  // ===== PUBLIC UTILITIES =====

  /**
   * Очистить все данные этого репозитория
   */
  async clear(): Promise<ServiceResponse<void>> {
    try {
      const storage = this.platform.getStorageInterface()
      storage.removeItem(this.storageKey)

      this.debugLog('clear', { storageKey: this.storageKey })
      return ResponseFactory.empty('local')
    } catch (error) {
      return ResponseFactory.error(`Failed to clear storage: ${error}`)
    }
  }

  /**
   * Получить статистику хранилища
   */
  async getStorageStats(): Promise<
    ServiceResponse<{
      count: number
      storageKey: string
      dataSize: number
    }>
  > {
    try {
      const data = this.loadFromStorage()
      const storage = this.platform.getStorageInterface()
      const rawData = storage.getItem(this.storageKey) || ''

      const stats = {
        count: data.length,
        storageKey: this.storageKey,
        dataSize: new Blob([rawData]).size
      }

      return ResponseFactory.success(stats, 'local')
    } catch (error) {
      return ResponseFactory.error(`Failed to get storage stats: ${error}`)
    }
  }
}
