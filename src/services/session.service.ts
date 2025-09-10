// src/services/session.service.ts
import { DebugUtils } from '@/utils'
import { TimeUtils } from '@/utils'
import type { User, LoginAttempt } from '../stores/auth/auth'

const MODULE_NAME = 'SessionService'

interface SessionData {
  user: User | null
  lastLoginAt: string | null
  expiresAt: string
  appType: string
}

export class SessionService {
  private readonly storageKey: string = 'auth_session'
  private readonly sessionDuration: number = 24 * 60 * 60 * 1000 // 24 hours

  constructor(private readonly debug: boolean = true) {}

  public saveSession(user: User, appType: string): void {
    try {
      const session: SessionData = {
        user,
        lastLoginAt: TimeUtils.getCurrentLocalISO(),
        expiresAt: new Date(Date.now() + this.sessionDuration).toISOString(),
        appType
      }

      localStorage.setItem(this.storageKey, JSON.stringify(session))

      if (this.debug) {
        DebugUtils.info(MODULE_NAME, 'Session saved', { userId: user.id })
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to save session', { error })
      throw error
    }
  }

  public getSession(): SessionData | null {
    try {
      const savedSession = localStorage.getItem(this.storageKey)
      if (!savedSession) return null

      const session: SessionData = JSON.parse(savedSession)
      const sessionExpiry = new Date(session.expiresAt).getTime()

      if (Date.now() >= sessionExpiry) {
        this.clearSession()
        return null
      }

      return session
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to get session', { error })
      this.clearSession()
      return null
    }
  }

  public clearSession(): void {
    try {
      localStorage.removeItem(this.storageKey)
      if (this.debug) {
        DebugUtils.info(MODULE_NAME, 'Session cleared')
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to clear session', { error })
    }
  }

  public isSessionValid(): boolean {
    const session = this.getSession()
    return session !== null && session.user !== null
  }

  public refreshSession(): void {
    const session = this.getSession()
    if (session && session.user) {
      this.saveSession(session.user, session.appType)
    }
  }

  public getSessionUser(): User | null {
    const session = this.getSession()
    return session?.user || null
  }

  public async logLoginAttempt(attempt: LoginAttempt): Promise<void> {
    try {
      const logData = {
        ...attempt,
        timestamp: TimeUtils.getCurrentLocalISO(),
        userAgent: navigator.userAgent,
        sessionId: this.generateSessionId()
      }

      if (this.debug) {
        DebugUtils.info(MODULE_NAME, 'Login attempt logged', {
          userId: attempt.userId,
          success: attempt.success
        })
      }

      // Здесь можно добавить логику сохранения в Firebase или другое хранилище
      console.log('Login attempt logged:', logData)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to log login attempt', { error })
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

export const sessionService = new SessionService()
