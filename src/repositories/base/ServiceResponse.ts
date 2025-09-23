// src/repositories/base/ServiceResponse.ts - Стандартный формат ответов

/**
 * Источник данных в ответе
 */
export type DataSource = 'local' | 'api' | 'cache' | 'firebase' | 'mock'

/**
 * Статус операции
 */
export type OperationStatus = 'success' | 'error' | 'partial' | 'cached'

/**
 * Метаданные ответа
 */
export interface ResponseMetadata {
  /** Временная метка операции */
  timestamp: string

  /** Источник данных */
  source: DataSource

  /** Версия данных (для кеширования) */
  version?: string

  /** Платформа выполнения */
  platform?: 'web' | 'mobile'

  /** Время выполнения в мс */
  executionTime?: number

  /** Дополнительная информация */
  extra?: Record<string, any>
}

/**
 * Стандартный формат ответа сервиса
 */
export interface ServiceResponse<T = any> {
  /** Успешность операции */
  success: boolean

  /** Данные (если успешно) */
  data?: T

  /** Сообщение об ошибке (если неуспешно) */
  error?: string

  /** Код ошибки */
  errorCode?: string

  /** Статус операции */
  status?: OperationStatus

  /** Метаданные */
  metadata?: ResponseMetadata
}

/**
 * Расширенный ответ с пагинацией
 */
export interface PaginatedResponse<T> extends ServiceResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Ответ для batch операций
 */
export interface BatchResponse<T> extends ServiceResponse<T[]> {
  /** Количество успешных операций */
  successCount: number

  /** Количество неудачных операций */
  errorCount: number

  /** Детали по каждой операции */
  results: Array<{
    id: string
    success: boolean
    data?: T
    error?: string
  }>
}

// ===== ФАБРИКА ОТВЕТОВ =====

export class ResponseFactory {
  /**
   * Создать успешный ответ
   */
  static success<T>(data: T, source: DataSource = 'local'): ServiceResponse<T> {
    return {
      success: true,
      data,
      status: 'success',
      metadata: {
        timestamp: new Date().toISOString(),
        source
      }
    }
  }

  /**
   * Создать ответ с ошибкой
   */
  static error<T>(
    error: string,
    errorCode?: string,
    source: DataSource = 'local'
  ): ServiceResponse<T> {
    return {
      success: false,
      error,
      errorCode,
      status: 'error',
      metadata: {
        timestamp: new Date().toISOString(),
        source
      }
    }
  }

  /**
   * Создать ответ из кеша
   */
  static cached<T>(data: T): ServiceResponse<T> {
    return {
      success: true,
      data,
      status: 'cached',
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'cache'
      }
    }
  }

  /**
   * Создать частичный ответ (когда часть данных недоступна)
   */
  static partial<T>(data: T, error: string, source: DataSource = 'local'): ServiceResponse<T> {
    return {
      success: true,
      data,
      error,
      status: 'partial',
      metadata: {
        timestamp: new Date().toISOString(),
        source
      }
    }
  }

  /**
   * Создать пустой успешный ответ
   */
  static empty(source: DataSource = 'local'): ServiceResponse<void> {
    return {
      success: true,
      status: 'success',
      metadata: {
        timestamp: new Date().toISOString(),
        source
      }
    }
  }
}

// ===== УТИЛИТЫ =====

export class ResponseUtils {
  /**
   * Проверить, является ли ответ успешным
   */
  static isSuccess<T>(response: ServiceResponse<T>): response is ServiceResponse<T> & { data: T } {
    return response.success && response.data !== undefined
  }

  /**
   * Проверить, является ли ответ ошибкой
   */
  static isError<T>(response: ServiceResponse<T>): boolean {
    return !response.success
  }

  /**
   * Проверить, из кеша ли данные
   */
  static isCached<T>(response: ServiceResponse<T>): boolean {
    return response.metadata?.source === 'cache' || response.status === 'cached'
  }

  /**
   * Получить данные или выбросить ошибку
   */
  static unwrap<T>(response: ServiceResponse<T>): T {
    if (response.success && response.data !== undefined) {
      return response.data
    }
    throw new Error(response.error || 'Operation failed')
  }

  /**
   * Получить данные или значение по умолчанию
   */
  static unwrapOr<T>(response: ServiceResponse<T>, defaultValue: T): T {
    if (response.success && response.data !== undefined) {
      return response.data
    }
    return defaultValue
  }

  /**
   * Добавить метаданные к существующему ответу
   */
  static withMetadata<T>(
    response: ServiceResponse<T>,
    metadata: Partial<ResponseMetadata>
  ): ServiceResponse<T> {
    return {
      ...response,
      metadata: {
        ...response.metadata,
        ...metadata
      } as ResponseMetadata
    }
  }
}
