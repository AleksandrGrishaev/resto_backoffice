// src/utils/debugger.ts
type LogLevel = 'info' | 'warn' | 'error' | 'debug'
// Определяем тип для данных лога
type LogData = unknown
interface LogMessage {
  timestamp: string
  level: LogLevel
  module: string
  message: string
  data?: LogData
}

export class DebugUtils {
  private static isDev = import.meta.env.MODE === 'development'
  private static logs: LogMessage[] = []
  private static maxLogs = 1000

  // Базовые blacklist'ы (всегда применяются)
  private static baseModuleBlacklist: string[] = [
    'DebugService',
    'DebugStore',
    'MockDataCoordinator'
  ]

  private static baseDebugBlacklist: string[] = ['MenuService', 'StorageDefinitions']

  // Blacklist'ы специфичные для ролей
  private static backofficeBlacklist: string[] = [
    'PosMainView',
    'TablesSidebar',
    'PosStore',
    'PosTablesStore',
    'PosOrdersStore',
    'PosPaymentsStore'
  ]

  private static posBlacklist: string[] = [
    'RecipesStore',
    'CounteragentsStore',
    'SupplierStore',
    'PreparationStore',
    'AccountStore'
  ]

  // Получить текущие активные blacklist'ы
  private static get activeModuleBlacklist(): string[] {
    const userRole = this.getCurrentUserRole()

    let roleSpecificBlacklist: string[] = []

    if (userRole.includes('admin') || userRole.includes('manager')) {
      // Для backoffice ролей скрываем POS модули
      roleSpecificBlacklist = this.posBlacklist
    } else if (userRole.includes('cashier')) {
      // Для POS ролей скрываем backoffice модули
      roleSpecificBlacklist = this.backofficeBlacklist
    }

    return [...this.baseModuleBlacklist, ...roleSpecificBlacklist]
  }

  private static get activeDebugBlacklist(): string[] {
    // Debug blacklist может быть тоже адаптивным
    return [...this.baseDebugBlacklist]
  }

  // Получить роль пользователя
  private static getCurrentUserRole(): string[] {
    try {
      // Получаем роли из auth store если доступен
      const authStore = (window as any).useAuthStore?.()
      return authStore?.userRoles || []
    } catch {
      // Fallback - пытаемся определить по URL
      if (window.location.pathname.startsWith('/pos')) {
        return ['cashier']
      }
      return ['admin'] // По умолчанию
    }
  }

  // Флаги из environment
  private static get showStoreDetails(): boolean {
    const flag = import.meta.env.VITE_SHOW_STORE_DETAILS
    return flag === undefined ? true : flag === 'true'
  }

  private static get showInitSummary(): boolean {
    const flag = import.meta.env.VITE_SHOW_INIT_SUMMARY
    return flag === undefined ? true : flag === 'true'
  }

  private static get showDeviceInfo(): boolean {
    const flag = import.meta.env.VITE_SHOW_DEVICE_INFO
    return flag === undefined ? true : flag === 'true'
  }

  private static get debugLevel(): 'silent' | 'standard' | 'verbose' {
    return import.meta.env.VITE_DEBUG_LEVEL || 'standard'
  }

  // Обновленная проверка shouldLog
  private static shouldLog(level: LogLevel, module?: string): boolean {
    // Проверка адаптивного blacklist модуля
    if (module && this.activeModuleBlacklist.includes(module)) {
      return false
    }

    // Проверка адаптивного debug blacklist
    if (level === 'debug' && module && this.activeDebugBlacklist.includes(module)) {
      return false
    }

    // Остальная логика без изменений
    if (!this.isDev) return level === 'error'

    const debugLevel = this.debugLevel
    if (debugLevel === 'silent') return level === 'error'
    if (debugLevel === 'standard') return ['info', 'warn', 'error'].includes(level)
    return true
  }

  // Утилиты для управления role-based blacklists
  static getCurrentBlacklists(): {
    role: string[]
    active: string[]
    base: string[]
    debug: string[]
  } {
    return {
      role: this.getCurrentUserRole(),
      active: this.activeModuleBlacklist,
      base: this.baseModuleBlacklist,
      debug: this.activeDebugBlacklist
    }
  }

  static addToRoleBlacklist(module: string, role: 'backoffice' | 'pos'): void {
    if (role === 'backoffice') {
      if (!this.backofficeBlacklist.includes(module)) {
        this.backofficeBlacklist.push(module)
        console.log(`Added "${module}" to backoffice blacklist`)
      }
    } else {
      if (!this.posBlacklist.includes(module)) {
        this.posBlacklist.push(module)
        console.log(`Added "${module}" to POS blacklist`)
      }
    }
  }

  static removeFromRoleBlacklist(module: string, role: 'backoffice' | 'pos'): void {
    if (role === 'backoffice') {
      const index = this.backofficeBlacklist.indexOf(module)
      if (index > -1) {
        this.backofficeBlacklist.splice(index, 1)
        console.log(`Removed "${module}" from backoffice blacklist`)
      }
    } else {
      const index = this.posBlacklist.indexOf(module)
      if (index > -1) {
        this.posBlacklist.splice(index, 1)
        console.log(`Removed "${module}" from POS blacklist`)
      }
    }
  }

  // 🔄 ИЗМЕНИТЬ log метод - передать module в shouldLog
  static log(level: LogLevel, module: string, message: string, data?: LogData) {
    if (!this.shouldLog(level, module)) return

    // остальной код без изменений
    const logMessage: LogMessage = {
      timestamp: this.getTimestamp(),
      level,
      module,
      message,
      data
    }

    this.logs.push(logMessage)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    const formattedMessage = `[${logMessage.timestamp}] [${level.toUpperCase()}] [${module}]: ${message}`
    const sanitizedData = data ? this.sanitizeData(data) : undefined

    switch (level) {
      case 'info':
        console.log(formattedMessage, sanitizedData)
        break
      case 'warn':
        console.warn(formattedMessage, sanitizedData)
        break
      case 'error':
        console.error(formattedMessage, sanitizedData)
        break
      case 'debug':
        console.debug(formattedMessage, sanitizedData)
        break
    }
  }

  private static getTimestamp(): string {
    return new Date().toISOString()
  }

  private static sanitizeData(data: LogData): unknown {
    try {
      if (typeof data === 'object' && data !== null) {
        return JSON.parse(JSON.stringify(data))
      }
      return data
    } catch {
      return '[Complex Object]'
    }
  }

  static info(module: string, message: string, data?: LogData) {
    this.log('info', module, message, data)
  }

  static warn(module: string, message: string, data?: LogData) {
    this.log('warn', module, message, data)
  }

  static error(module: string, message: string, data?: LogData) {
    this.log('error', module, message, data)
  }

  static debug(module: string, message: string, data?: LogData) {
    this.log('debug', module, message, data)
  }

  // НОВЫЕ МЕТОДЫ с флагами

  /**
   * Логи stores - только если включена детализация
   */
  static store(module: string, message: string, data?: LogData) {
    if (this.showStoreDetails) {
      this.debug(`STORE:${module}`, message, data)
    }
  }

  /**
   * Сводка инициализации - только если включена
   */
  static summary(title: string, data: any): void {
    if (this.showInitSummary && this.isDev) {
      console.group(`📋 ${title}`)
      console.table(data)
      console.groupEnd()
    }
  }

  /**
   * Информация об устройстве - только если включена
   */
  static deviceInfo(info: any): void {
    if (this.showDeviceInfo && this.isDev) {
      console.group('📱 Device & Environment Info')
      console.table(info)
      console.groupEnd()
    }
  }

  // Существующие методы без изменений
  static getLogs(): LogMessage[] {
    return [...this.logs]
  }

  static clearLogs() {
    this.logs = []
  }

  static async saveLogs() {
    if (!this.isDev) return
    const blob = new Blob([JSON.stringify(this.logs, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `logs_${this.getTimestamp()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 🆕 ДОБАВИТЬ утилиты для управления blacklist
  /**
   * Добавить модуль в полный blacklist
   */
  static blacklistModule(module: string): void {
    if (!this.moduleBlacklist.includes(module)) {
      this.moduleBlacklist.push(module)
      console.log(`📵 Module "${module}" added to blacklist`)
    }
  }

  /**
   * Убрать модуль из полного blacklist
   */
  static whitelistModule(module: string): void {
    const index = this.moduleBlacklist.indexOf(module)
    if (index > -1) {
      this.moduleBlacklist.splice(index, 1)
      console.log(`✅ Module "${module}" removed from blacklist`)
    }
  }

  /**
   * Добавить модуль в debug-only blacklist
   */
  static blacklistDebugModule(module: string): void {
    if (!this.moduleDebugBlacklist.includes(module)) {
      this.moduleDebugBlacklist.push(module)
      console.log(`🔇 Module "${module}" debug logs disabled`)
    }
  }

  /**
   * Убрать модуль из debug-only blacklist
   */
  static whitelistDebugModule(module: string): void {
    const index = this.moduleDebugBlacklist.indexOf(module)
    if (index > -1) {
      this.moduleDebugBlacklist.splice(index, 1)
      console.log(`🔊 Module "${module}" debug logs enabled`)
    }
  }

  /**
   * Показать текущие blacklists
   */
  static getBlacklists(): { full: string[]; debugOnly: string[] } {
    return {
      full: [...this.moduleBlacklist],
      debugOnly: [...this.moduleDebugBlacklist]
    }
  }

  /**
   * Очистить все blacklists
   */
  static clearBlacklists(): void {
    this.moduleBlacklist = []
    this.moduleDebugBlacklist = []
    console.log('🧹 All blacklists cleared')
  }
}
