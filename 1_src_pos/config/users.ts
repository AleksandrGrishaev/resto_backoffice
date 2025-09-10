// src/config/users.ts
import type { User, UserRole, AppType } from '@/types/auth'

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
    description: 'Полный доступ к системе',
    permissions: ['*'],
    defaultAccess: ['kitchen', 'bar', 'cashier']
  },
  manager: {
    name: 'manager',
    description: 'Доступ менеджера ресторана',
    permissions: ['backoffice.access', 'kitchen.access', 'bar.access', 'cashier.access'],
    defaultAccess: ['kitchen', 'bar', 'cashier']
  },
  kitchen: {
    name: 'kitchen',
    description: 'Доступ кухонного персонала',
    permissions: ['kitchen.access'],
    defaultAccess: ['kitchen']
  },
  bar: {
    name: 'bar',
    description: 'Доступ барного персонала',
    permissions: ['kitchen.access', 'bar.access'],
    defaultAccess: ['bar', 'kitchen']
  },
  cashier: {
    name: 'cashier',
    description: 'Доступ кассира',
    permissions: ['cashier.access'],
    defaultAccess: ['cashier']
  }
} as const

// Пользователи для разных ролей - легко настраиваемые PIN-коды
export const DEFAULT_USERS: UserConfig[] = [
  {
    name: 'Администратор',
    pin: '0000', // Админ
    roles: ['admin'],
    isActive: true,
    description: 'Системный администратор - полный доступ'
  },
  {
    name: 'Менеджер',
    pin: '1111', // Менеджер
    roles: ['manager'],
    isActive: true,
    description: 'Менеджер ресторана'
  },
  {
    name: 'Кассир 1',
    pin: '2222', // Кассир
    roles: ['cashier'],
    isActive: true,
    description: 'Кассир - основной'
  },
  {
    name: 'Кассир 2',
    pin: '2223', // Второй кассир
    roles: ['cashier'],
    isActive: true,
    description: 'Кассир - дополнительный'
  },
  {
    name: 'Повар 1',
    pin: '3333', // Кухня
    roles: ['kitchen'],
    isActive: true,
    description: 'Повар - основной'
  },
  {
    name: 'Повар 2',
    pin: '3334', // Второй повар
    roles: ['kitchen'],
    isActive: true,
    description: 'Повар - помощник'
  },
  {
    name: 'Бармен 1',
    pin: '4444', // Бар
    roles: ['bar'],
    isActive: true,
    description: 'Бармен - основной'
  },
  {
    name: 'Бармен 2',
    pin: '4445', // Второй бармен
    roles: ['bar'],
    isActive: true,
    description: 'Бармен - помощник'
  }
]

// Utilities для работы с пользователями и ролями
export class UserUtils {
  // Проверка доступа к приложению по роли
  static hasAppAccess(roles: UserRole[], appType: AppType): boolean {
    return roles.some(role => ROLE_CONFIGS[role].defaultAccess.includes(appType))
  }

  // Получение разрешений роли
  static getRolePermissions(role: UserRole): string[] {
    return ROLE_CONFIGS[role].permissions
  }

  // Проверка наличия разрешения
  static hasPermission(roles: UserRole[], permission: string): boolean {
    return roles.some(
      role =>
        ROLE_CONFIGS[role].permissions.includes('*') ||
        ROLE_CONFIGS[role].permissions.includes(permission)
    )
  }

  // Получение пользователя по PIN
  static getUserByPin(pin: string): UserConfig | null {
    const user = DEFAULT_USERS.find(u => u.pin === pin && u.isActive)
    return user || null
  }

  // Получение всех активных пользователей
  static getActiveUsers(): UserConfig[] {
    return DEFAULT_USERS.filter(u => u.isActive)
  }

  // Получение пользователей по роли
  static getUsersByRole(role: UserRole): UserConfig[] {
    return DEFAULT_USERS.filter(u => u.isActive && u.roles.includes(role))
  }

  // Создание полного объекта User из UserConfig
  static createUser(config: UserConfig, id: string = crypto.randomUUID()): User {
    const now = new Date()
    return {
      id,
      name: config.name,
      pin: config.pin,
      roles: config.roles,
      isActive: config.isActive,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null
    }
  }

  // Определение целевого маршрута после входа
  static getDefaultRoute(roles: UserRole[]): string {
    if (roles.includes('cashier')) {
      return '/pos'
    } else if (roles.includes('bar')) {
      return '/monitor/bar'
    } else if (roles.includes('kitchen')) {
      return '/monitor/kitchen'
    } else if (roles.includes('admin') || roles.includes('manager')) {
      return '/pos' // Админ и менеджер по умолчанию на POS
    }
    return '/monitor/kitchen'
  }
}
