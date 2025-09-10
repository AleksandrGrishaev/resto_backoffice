// src/stores/auth/services/session.service.ts - Управление сессиями
import type { User, UserSession, LoginAttempt } from '../types'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'AuthSessionService'

// Ключи для localStorage
const SESSION_KEY = 'kitchen_app_session'
const LOGIN_ATTEMPTS_KEY = 'kitchen_app_login_attempts'

// Время жизни сессии (24 часа)
const SESSION_DURATION = 24 * 60 * 60 * 1000

export class AuthSessionService {
  /**
   * Сохранить сессию пользователя
   */
  static saveSession(user: User, appType: string = 'backoffice'): void {
    try {
      const session: UserSession = {
        user,
        appType: appType as any,
        loginTime: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        expiresAt: new Date(Date.now() + SESSION_DURATION).toISOString()
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify(session))

      DebugUtils.info(MODULE_NAME, 'Session saved', {
        userId: user.id,
        roles: user.roles,
        expiresAt: session.expiresAt
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to save session', { error })
    }
  }

  /**
   * Получить сохраненную сессию
   */
  static getSession(): UserSession | null {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      if (!sessionData) {
        DebugUtils.debug(MODULE_NAME, 'No saved session found')
        return null
      }

      const session: UserSession = JSON.parse(sessionData)

      // Проверяем срок действия
      if (this.isSessionExpired(session)) {
        DebugUtils.warn(MODULE_NAME, 'Session expired, removing', {
          expiresAt: session.expiresAt,
          now: new Date().toISOString()
        })
        this.clearSession()
        return null
      }

      // Обновляем время последней активности
      session.lastActivity = new Date().toISOString()
      localStorage.setItem(SESSION_KEY, JSON.stringify(session))

      DebugUtils.info(MODULE_NAME, 'Session restored', {
        userId: session.user.id,
        roles: session.user.roles,
        loginTime: session.loginTime,
        lastActivity: session.lastActivity
      })

      return session
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to parse session, clearing', { error })
      this.clearSession() // Очищаем поврежденную сессию
      return null
    }
  }

  /**
   * Проверить валидность сессии
   */
  static isSessionValid(): boolean {
    const session = this.getSession()
    return session !== null && !this.isSessionExpired(session)
  }

  /**
   * Проверить истек ли срок сессии
   */
  static isSessionExpired(session: UserSession): boolean {
    if (!session.expiresAt) {
      return false // Сессии без срока действия не истекают
    }

    const now = new Date()
    const expiresAt = new Date(session.expiresAt)

    return now > expiresAt
  }

  /**
   * Очистить сессию
   */
  static clearSession(): void {
    try {
      localStorage.removeItem(SESSION_KEY)
      DebugUtils.info(MODULE_NAME, 'Session cleared')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to clear session', { error })
    }
  }

  /**
   * Обновить время последней активности
   */
  static updateActivity(): void {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      if (sessionData) {
        const session: UserSession = JSON.parse(sessionData)
        session.lastActivity = new Date().toISOString()
        localStorage.setItem(SESSION_KEY, JSON.stringify(session))

        DebugUtils.debug(MODULE_NAME, 'Activity updated')
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to update activity', { error })
    }
  }

  /**
   * Логирование попыток входа
   */
  static logLoginAttempt(attempt: LoginAttempt): void {
    try {
      const attempts = this.getLoginAttempts()
      attempts.push(attempt)

      // Храним только последние 50 попыток
      const recentAttempts = attempts.slice(-50)

      localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(recentAttempts))

      DebugUtils.debug(MODULE_NAME, 'Login attempt logged', {
        success: attempt.success,
        userId: attempt.userId,
        timestamp: attempt.timestamp
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to log login attempt', { error })
    }
  }

  /**
   * Получить историю попыток входа
   */
  static getLoginAttempts(): LoginAttempt[] {
    try {
      const attemptsData = localStorage.getItem(LOGIN_ATTEMPTS_KEY)
      if (!attemptsData) {
        return []
      }

      return JSON.parse(attemptsData)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get login attempts', { error })
      return []
    }
  }

  /**
   * Получить статистику последних попыток входа
   */
  static getLoginStats(): {
    totalAttempts: number
    successfulAttempts: number
    failedAttempts: number
    lastSuccessfulLogin?: string
    recentFailures: number // за последний час
  } {
    const attempts = this.getLoginAttempts()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    const successful = attempts.filter(a => a.success)
    const failed = attempts.filter(a => !a.success)
    const recentFailures = failed.filter(a => new Date(a.timestamp) > oneHourAgo)

    return {
      totalAttempts: attempts.length,
      successfulAttempts: successful.length,
      failedAttempts: failed.length,
      lastSuccessfulLogin: successful[successful.length - 1]?.timestamp,
      recentFailures: recentFailures.length
    }
  }

  /**
   * Получить информацию о текущей сессии
   */
  static getSessionInfo(): {
    hasActiveSession: boolean
    sessionAge?: number
    lastActivity?: string
    expiresIn?: number
    userInfo?: {
      id: string
      name: string
      roles: string[]
    }
  } {
    const session = this.getSession()

    if (!session) {
      return { hasActiveSession: false }
    }

    const now = new Date()
    const loginTime = new Date(session.loginTime)
    const expiresAt = session.expiresAt ? new Date(session.expiresAt) : null

    return {
      hasActiveSession: true,
      sessionAge: now.getTime() - loginTime.getTime(),
      lastActivity: session.lastActivity,
      expiresIn: expiresAt ? expiresAt.getTime() - now.getTime() : undefined,
      userInfo: {
        id: session.user.id,
        name: session.user.name,
        roles: session.user.roles
      }
    }
  }

  /**
   * Проверить безопасность - слишком много неудачных попыток
   */
  static isSecurityLocked(): boolean {
    const stats = this.getLoginStats()

    // Блокируем если более 10 неудачных попыток за час
    return stats.recentFailures >= 10
  }

  /**
   * Очистить все данные авторизации
   */
  static clearAllAuthData(): void {
    try {
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(LOGIN_ATTEMPTS_KEY)
      DebugUtils.info(MODULE_NAME, 'All auth data cleared')
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to clear auth data', { error })
    }
  }
}
