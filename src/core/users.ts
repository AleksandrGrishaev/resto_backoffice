// src/core/users.ts - НА ОСНОВЕ существующего config/users.ts
import type { User, UserRole, AppType } from '../stores/auth/auth'

// ===== ИМПОРТ СУЩЕСТВУЮЩЕЙ КОНФИГУРАЦИИ =====
import { ROLE_CONFIGS, DEFAULT_USERS, UserUtils } from '@/config/users'

// ===== РАСШИРЕНИЕ ПОЛЬЗОВАТЕЛЕЙ =====

export const CORE_USERS = [
  ...DEFAULT_USERS, // Существующий админ
  // 🆕 НОВЫЕ ПОЛЬЗОВАТЕЛИ
  {
    name: 'Restaurant Manager',
    pin: '2345',
    roles: ['manager'] as UserRole[],
    isActive: true,
    description: 'Restaurant manager with operational access'
  },
  {
    name: 'Cashier User',
    pin: '3456',
    roles: ['cashier'] as UserRole[],
    isActive: true,
    description: 'Cashier for POS operations'
  }
]

// ===== CORE USER SERVICE =====

export class CoreUserService {
  /**
   * Получить всех активных пользователей
   */
  static getActiveUsers() {
    return CORE_USERS.filter(user => user.isActive)
  }

  /**
   * Найти пользователя по PIN
   */
  static findByPin(pin: string) {
    return CORE_USERS.find(user => user.pin === pin && user.isActive) || null
  }

  /**
   * Получить маршрут по умолчанию для ролей пользователя
   */
  static getDefaultRoute(roles: UserRole[]): string {
    if (roles.includes('admin')) return '/menu'
    if (roles.includes('manager')) return '/menu'
    if (roles.includes('cashier')) return '/pos'
    return '/unauthorized'
  }

  /**
   * Проверить, может ли пользователь редактировать данные
   */
  static canEdit(roles: UserRole[]): boolean {
    return roles.some(role => ['admin', 'manager'].includes(role))
  }

  /**
   * Проверить, может ли пользователь видеть финансы
   */
  static canViewFinances(roles: UserRole[]): boolean {
    return roles.includes('admin')
  }

  /**
   * Получить отображаемое имя роли
   */
  static getRoleDisplayName(role: UserRole): string {
    const roleNames: Record<UserRole, string> = {
      admin: 'Администратор',
      manager: 'Менеджер',
      cashier: 'Кассир',
      kitchen: 'Повар',
      bar: 'Бармен'
    }
    return roleNames[role] || role
  }

  /**
   * Проверить доступ к приложению (используя существующий UserUtils)
   */
  static hasAppAccess(roles: UserRole[], appType: AppType): boolean {
    return UserUtils.hasAppAccess(roles, appType)
  }

  /**
   * Проверить разрешение (используя существующий UserUtils)
   */
  static hasPermission(roles: UserRole[], permission: string): boolean {
    return UserUtils.hasPermission(roles, permission)
  }

  /**
   * Получить разрешения роли (используя существующий UserUtils)
   */
  static getRolePermissions(role: UserRole): string[] {
    return UserUtils.getRolePermissions(role)
  }
}

// ===== RE-EXPORT КОНФИГУРАЦИИ =====
export { ROLE_CONFIGS, UserUtils } from '@/config/users'
