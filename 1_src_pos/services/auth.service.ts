// src/services/auth.service.ts
import { DebugUtils } from '@/utils'
import { UserUtils, DEFAULT_USERS } from '@/config/users'
import type { User } from '@/types/auth'

const MODULE_NAME = 'AuthService'

export class AuthService {
  private static instance: AuthService | null = null

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService()
    }
    return AuthService.instance
  }

  /**
   * Локальная аутентификация по PIN-коду
   */
  async login(pin: string): Promise<User> {
    try {
      DebugUtils.info(MODULE_NAME, 'Attempting login with PIN')

      // Валидация PIN
      if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        throw new Error('Неверный формат PIN-кода')
      }

      // Поиск пользователя по PIN
      const userConfig = UserUtils.getUserByPin(pin)

      if (!userConfig) {
        DebugUtils.warn(MODULE_NAME, 'User not found for PIN')
        throw new Error('Неверный PIN-код')
      }

      if (!userConfig.isActive) {
        DebugUtils.warn(MODULE_NAME, 'User account is inactive', { pin })
        throw new Error('Аккаунт заблокирован')
      }

      // Создание объекта пользователя
      const user = UserUtils.createUser(userConfig)
      user.lastLoginAt = new Date()

      DebugUtils.info(MODULE_NAME, 'Login successful', {
        userId: user.id,
        userName: user.name,
        roles: user.roles
      })

      return user
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Login failed', { error, pin })
      throw error
    }
  }

  /**
   * Выход из системы
   */
  async logout(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'User logged out')
      // В локальной версии просто логируем событие
      // В будущем здесь может быть логика очистки сессий, логирования и т.д.
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Logout error', { error })
      throw error
    }
  }

  /**
   * Проверка валидности сессии (заглушка для локальной версии)
   */
  async validateSession(): Promise<boolean> {
    // В локальной версии всегда возвращаем true
    // В реальном приложении здесь была бы проверка токена
    return true
  }

  /**
   * Обновление последнего времени активности пользователя
   */
  async updateLastActivity(userId: string): Promise<void> {
    try {
      DebugUtils.debug(MODULE_NAME, 'Updated last activity', { userId })
      // В локальной версии просто логируем
      // В реальном приложении здесь было бы обновление в БД
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update last activity', { error, userId })
    }
  }

  /**
   * Получение информации о доступных пользователях (для отладки)
   */
  getAvailableUsers() {
    return UserUtils.getActiveUsers().map(user => ({
      name: user.name,
      pin: user.pin,
      roles: user.roles,
      description: user.description
    }))
  }
}

// Экспорт синглтона
export const authService = AuthService.getInstance()
