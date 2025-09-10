// src/config/users.ts
import type { User, UserRole, AppType } from '../stores/auth/auth'

interface UserConfig extends Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLoginAt'> {
  description?: string
}

interface RoleConfig {
  name: UserRole
  description: string
  permissions: string[]
  defaultAccess: AppType[]
}

// Конфигурация ролей
export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  admin: {
    name: 'admin',
    description: 'Full system access',
    permissions: ['*'],
    defaultAccess: ['backoffice', 'cashier', 'kitchen']
  },
  manager: {
    name: 'manager',
    description: 'Restaurant management access',
    permissions: ['backoffice.access', 'kitchen.access', 'bar.access', 'cashier.access'],
    defaultAccess: ['backoffice', 'kitchen']
  },
  kitchen: {
    name: 'kitchen',
    description: 'Kitchen staff access',
    permissions: ['kitchen.access'],
    defaultAccess: ['kitchen']
  },
  bar: {
    name: 'bar',
    description: 'Bar staff access',
    permissions: ['kitchen.access', 'bar.access'],
    defaultAccess: ['kitchen']
  },
  cashier: {
    name: 'cashier',
    description: 'Cashier access',
    permissions: ['cashier.access'],
    defaultAccess: ['cashier']
  }
}

// Базовые пользователи
export const DEFAULT_USERS: UserConfig[] = [
  {
    name: 'Admin User',
    pin: '1234',
    roles: ['admin'],
    isActive: true,
    description: 'System administrator'
  }
]

// Utilities
export class UserUtils {
  static hasAppAccess(roles: UserRole[], appType: AppType): boolean {
    return roles.some(role => ROLE_CONFIGS[role].defaultAccess.includes(appType))
  }

  static getRolePermissions(role: UserRole): string[] {
    return ROLE_CONFIGS[role].permissions
  }

  static hasPermission(roles: UserRole[], permission: string): boolean {
    return roles.some(
      role =>
        ROLE_CONFIGS[role].permissions.includes('*') ||
        ROLE_CONFIGS[role].permissions.includes(permission)
    )
  }
}
