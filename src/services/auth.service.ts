// src/services/auth.service.ts
import { BaseService } from '@/firebase/services/base.service'
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { User, LoginAttempt, AppType } from '@/types/auth'
import { DebugUtils } from '@/utils'
import { TimeUtils } from '@/utils'
import { DEFAULT_USERS, UserUtils } from '@/config/users'

const MODULE_NAME = 'AuthService'

export class AuthService extends BaseService<User> {
  constructor() {
    super('users')
  }

  async initializeDefaultUsers(): Promise<void> {
    try {
      DebugUtils.info(MODULE_NAME, 'Initializing default users')

      for (const defaultUser of DEFAULT_USERS) {
        const usersRef = collection(db, 'users')
        const q = query(
          usersRef,
          where('pin', '==', defaultUser.pin),
          where('name', '==', defaultUser.name)
        )

        const querySnapshot = await getDocs(q)

        if (querySnapshot.empty) {
          const now = TimeUtils.getCurrentLocalISO()
          await this.create({
            ...defaultUser,
            createdAt: now,
            updatedAt: now
          })
          DebugUtils.info(MODULE_NAME, `Created default user: ${defaultUser.name}`)
        }
      }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to initialize users', { error })
      throw error
    }
  }

  async login(pin: string, appType: AppType = 'backoffice'): Promise<User> {
    try {
      DebugUtils.info(MODULE_NAME, 'Login attempt', { appType })

      const usersRef = collection(db, this.collectionName)
      const q = query(usersRef, where('pin', '==', pin), where('isActive', '==', true))

      const querySnapshot = await getDocs(q)

      if (querySnapshot.empty) {
        throw new Error('Invalid PIN')
      }

      const userDoc = querySnapshot.docs[0]
      const user = { id: userDoc.id, ...userDoc.data() } as User

      // Проверка доступа к приложению
      if (!UserUtils.hasAppAccess(user.roles, appType)) {
        throw new Error(`Access denied for ${appType}`)
      }

      await this.logLoginAttempt({
        userId: user.id,
        success: true,
        appType,
        timestamp: TimeUtils.getCurrentLocalISO()
      })

      await this.update(user.id, {
        lastLoginAt: TimeUtils.getCurrentLocalISO()
      })

      return user
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Login failed', { error })
      throw error
    }
  }

  private async logLoginAttempt(attempt: Omit<LoginAttempt, 'ip'>): Promise<void> {
    try {
      const loginAttemptsRef = collection(db, 'login_attempts')
      await addDoc(loginAttemptsRef, {
        ...attempt,
        ip: window.location.hostname
      })
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to log login attempt', { error })
    }
  }
}

export const authService = new AuthService()
