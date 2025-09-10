// src/services/session.service.ts
import { DebugUtils } from '@/utils'
import type { User, AppType } from '@/types/auth'

const MODULE_NAME = 'SessionService'

interface SessionData {
  user: User
  appType: AppType
  loginTime: string
  lastActivity: string
}

export class SessionService {
  private static instance: SessionService | null = null
  private readonly SESSION_KEY = 'restaurant_pos_session'
  private readonly SESSION_TIMEOUT = 8 * 60 * 60 * 1000 // 8 часов в миллисекундах

  private constructor() {}

  static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService()
    }
    return SessionService.instance
  }

  /**
   * Сохранение сессии пользователя
   */
  saveSession(user: User, appType: AppType): void {
    try {
      const sessionData: SessionData = {
        user,
        appType,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString()
      }

      localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData))

      DebugUtils.info(MODULE_NAME, 'Session saved', {
        userId: user.id,
        userName: user.name,
        appType
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to save session', { error })
      throw new Error('Не удалось сохранить сессию')
    }
  }

  /**
   * Получение текущей сессии
   */
  getSession(): SessionData | null {
    try {
      const sessionStr = localStorage.getItem(this.SESSION_KEY)

      if (!sessionStr) {
        return null
      }

      const sessionData: SessionData = JSON.parse(sessionStr)

      // Проверка времени истечения сессии
      if (this.isSessionExpired(sessionData)) {
        DebugUtils.info(MODULE_NAME, 'Session expired, clearing')
        this.clearSession()
        return null
      }

      // Обновление времени последней активности
      this.updateLastActivity()

      DebugUtils.debug(MODULE_NAME, 'Session retrieved', {
        userId: sessionData.user.id,
        userName: sessionData.user.name
      })

      return sessionData
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get session', { error })
      this.clearSession()
      return null
    }
  }

  /**
   * Очистка сессии
   */
  clearSession(): void {
    try {
      localStorage.removeItem(this.SESSION_KEY)
      DebugUtils.info(MODULE_NAME, 'Session cleared')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to clear session', { error })
    }
  }

  /**
   * Проверка истечения времени сессии
   */
  private isSessionExpired(sessionData: SessionData): boolean {
    const lastActivity = new Date(sessionData.lastActivity).getTime()
    const now = Date.now()

    return now - lastActivity > this.SESSION_TIMEOUT
  }

  /**
   * Обновление времени последней активности
   */
  updateLastActivity(): void {
    try {
      const sessionStr = localStorage.getItem(this.SESSION_KEY)

      if (sessionStr) {
        const sessionData: SessionData = JSON.parse(sessionStr)
        sessionData.lastActivity = new Date().toISOString()
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData))
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update last activity', { error })
    }
  }

  /**
   * Получение времени до истечения сессии
   */
  getTimeUntilExpiry(): number {
    const sessionData = this.getSession()

    if (!sessionData) {
      return 0
    }

    const lastActivity = new Date(sessionData.lastActivity).getTime()
    const expiredAt = lastActivity + this.SESSION_TIMEOUT

    return Math.max(0, expiredAt - Date.now())
  }

  /**
   * Проверка активности сессии
   */
  isSessionActive(): boolean {
    const session = this.getSession()
    return session !== null
  }

  /**
   * Получение текущего пользователя из сессии
   */
  getCurrentUser(): User | null {
    const session = this.getSession()
    return session?.user || null
  }

  /**
   * Получение типа приложения из сессии
   */
  getAppType(): AppType | null {
    const session = this.getSession()
    return session?.appType || null
  }
}

// Экспорт синглтона
export const sessionService = SessionService.getInstance()
