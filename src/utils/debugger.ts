// src/utils/debugger.ts

// =============================================
// TYPES & INTERFACES
// =============================================

type LogLevel = 'info' | 'warn' | 'error' | 'debug'
type LogData = unknown

interface LogMessage {
  timestamp: string
  level: LogLevel
  module: string
  message: string
  data?: LogData
}

interface BlacklistState {
  base: string[]
  debug: string[]
  backoffice: string[]
  pos: string[]
  currentRole: string[]
  activeForCurrentRole: string[]
}

interface ModuleStatus {
  module: string
  blocked: boolean
  debugBlocked: boolean
  reason: string
}

interface LogStats {
  total: number
  byLevel: Record<LogLevel, number>
  byModule: Record<string, number>
  timeRange: { first: string; last: string } | null
}

interface DebugEnvironmentFlags {
  showStoreDetails: boolean
  showInitSummary: boolean
  showDeviceInfo: boolean
  debugLevel: 'silent' | 'standard' | 'verbose'
  useBlacklist: boolean
  isDev: boolean
}

// =============================================
// MAIN DEBUG CLASS
// =============================================

export class DebugUtils {
  // =============================================
  // PRIVATE PROPERTIES
  // =============================================

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
    'AccountStore',
    'SupplierService'
  ]

  // =============================================
  // PRIVATE GETTERS
  // =============================================

  private static get activeModuleBlacklist(): string[] {
    const userRole = this.getCurrentUserRole()
    let roleSpecificBlacklist: string[] = []

    if (userRole.includes('admin') || userRole.includes('manager')) {
      roleSpecificBlacklist = this.posBlacklist
    } else if (userRole.includes('cashier')) {
      roleSpecificBlacklist = this.backofficeBlacklist
    }

    return [...this.baseModuleBlacklist, ...roleSpecificBlacklist]
  }

  private static get activeDebugBlacklist(): string[] {
    return [...this.baseDebugBlacklist]
  }

  private static getCurrentUserRole(): string[] {
    try {
      const authStore = (window as any).useAuthStore?.()
      return authStore?.userRoles || []
    } catch {
      if (window.location.pathname.startsWith('/pos')) {
        return ['cashier']
      }
      return ['admin']
    }
  }

  // Environment flags
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

  private static get useBlacklist(): boolean {
    const flag = import.meta.env.VITE_USE_BLACKLIST
    return flag === undefined ? true : flag === 'true'
  }

  // =============================================
  // CORE LOGGING LOGIC
  // =============================================

  private static shouldLog(level: LogLevel, module?: string): boolean {
    // Проверяем blacklist только если флаг включен
    if (this.useBlacklist) {
      if (module && this.activeModuleBlacklist.includes(module)) {
        return false
      }

      if (level === 'debug' && module && this.activeDebugBlacklist.includes(module)) {
        return false
      }
    }

    if (!this.isDev) return level === 'error'

    const debugLevel = this.debugLevel
    if (debugLevel === 'silent') return level === 'error'
    if (debugLevel === 'standard') return ['info', 'warn', 'error'].includes(level)
    return true
  }

  static log(level: LogLevel, module: string, message: string, data?: LogData) {
    if (!this.shouldLog(level, module)) return

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

  // =============================================
  // PUBLIC LOGGING METHODS
  // =============================================

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

  // =============================================
  // SPECIAL LOGGING METHODS
  // =============================================

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

  // =============================================
  // BLACKLIST MANAGEMENT
  // =============================================

  static addToBaseBlacklist(module: string): void {
    if (!this.baseModuleBlacklist.includes(module)) {
      this.baseModuleBlacklist.push(module)
      console.log(`📵 Module "${module}" added to base blacklist`)
    }
  }

  static removeFromBaseBlacklist(module: string): void {
    const index = this.baseModuleBlacklist.indexOf(module)
    if (index > -1) {
      this.baseModuleBlacklist.splice(index, 1)
      console.log(`✅ Module "${module}" removed from base blacklist`)
    }
  }

  static addToDebugBlacklist(module: string): void {
    if (!this.baseDebugBlacklist.includes(module)) {
      this.baseDebugBlacklist.push(module)
      console.log(`🔇 Module "${module}" debug logs disabled`)
    }
  }

  static removeFromDebugBlacklist(module: string): void {
    const index = this.baseDebugBlacklist.indexOf(module)
    if (index > -1) {
      this.baseDebugBlacklist.splice(index, 1)
      console.log(`🔊 Module "${module}" debug logs enabled`)
    }
  }

  static addToRoleBlacklist(module: string, role: 'backoffice' | 'pos'): void {
    if (role === 'backoffice') {
      if (!this.backofficeBlacklist.includes(module)) {
        this.backofficeBlacklist.push(module)
        console.log(`📵 Module "${module}" added to backoffice blacklist`)
      }
    } else {
      if (!this.posBlacklist.includes(module)) {
        this.posBlacklist.push(module)
        console.log(`📵 Module "${module}" added to POS blacklist`)
      }
    }
  }

  static removeFromRoleBlacklist(module: string, role: 'backoffice' | 'pos'): void {
    if (role === 'backoffice') {
      const index = this.backofficeBlacklist.indexOf(module)
      if (index > -1) {
        this.backofficeBlacklist.splice(index, 1)
        console.log(`✅ Module "${module}" removed from backoffice blacklist`)
      }
    } else {
      const index = this.posBlacklist.indexOf(module)
      if (index > -1) {
        this.posBlacklist.splice(index, 1)
        console.log(`✅ Module "${module}" removed from POS blacklist`)
      }
    }
  }

  // =============================================
  // INFORMATION METHODS
  // =============================================

  static getAllBlacklists(): BlacklistState {
    return {
      base: [...this.baseModuleBlacklist],
      debug: [...this.baseDebugBlacklist],
      backoffice: [...this.backofficeBlacklist],
      pos: [...this.posBlacklist],
      currentRole: this.getCurrentUserRole(),
      activeForCurrentRole: this.activeModuleBlacklist
    }
  }

  static getModuleStatus(module: string): ModuleStatus {
    const activeBlacklist = this.activeModuleBlacklist
    const debugBlacklist = this.activeDebugBlacklist

    const blocked = activeBlacklist.includes(module)
    const debugBlocked = debugBlacklist.includes(module)

    let reason = 'allowed'
    if (blocked) {
      if (this.baseModuleBlacklist.includes(module)) {
        reason = 'base blacklist'
      } else if (
        this.getCurrentUserRole().includes('admin') &&
        this.posBlacklist.includes(module)
      ) {
        reason = 'POS blacklist (admin role)'
      } else if (
        this.getCurrentUserRole().includes('cashier') &&
        this.backofficeBlacklist.includes(module)
      ) {
        reason = 'backoffice blacklist (cashier role)'
      }
    } else if (debugBlocked) {
      reason = 'debug only blacklist'
    }

    return { module, blocked, debugBlocked, reason }
  }

  static getEnvironmentFlags(): DebugEnvironmentFlags {
    return {
      showStoreDetails: this.showStoreDetails,
      showInitSummary: this.showInitSummary,
      showDeviceInfo: this.showDeviceInfo,
      debugLevel: this.debugLevel,
      useBlacklist: this.useBlacklist,
      isDev: this.isDev
    }
  }

  // =============================================
  // LOG MANAGEMENT
  // =============================================

  static getLogs(): LogMessage[] {
    return [...this.logs]
  }

  static clearLogs(): void {
    this.logs = []
    console.log('🧹 Logs cleared')
  }

  static async saveLogs(): Promise<void> {
    if (!this.isDev) {
      console.warn('Log saving is only available in development mode')
      return
    }

    try {
      const blob = new Blob([JSON.stringify(this.logs, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `logs_${this.getTimestamp().replace(/[:.]/g, '-')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      console.log('📄 Logs saved to file')
    } catch (error) {
      console.error('Failed to save logs:', error)
    }
  }

  static getLogStats(): LogStats {
    const byLevel: Record<LogLevel, number> = {
      info: 0,
      warn: 0,
      error: 0,
      debug: 0
    }
    const byModule: Record<string, number> = {}

    this.logs.forEach(log => {
      byLevel[log.level]++
      byModule[log.module] = (byModule[log.module] || 0) + 1
    })

    const timeRange =
      this.logs.length > 0
        ? {
            first: this.logs[0].timestamp,
            last: this.logs[this.logs.length - 1].timestamp
          }
        : null

    return {
      total: this.logs.length,
      byLevel,
      byModule,
      timeRange
    }
  }

  // =============================================
  // RESET METHODS
  // =============================================

  static clearCustomBlacklists(): void {
    this.baseModuleBlacklist.splice(0)
    this.baseDebugBlacklist.splice(0)
    console.log('🧹 Custom blacklists cleared (role-specific settings remain)')
  }

  static resetToDefaults(): void {
    this.baseModuleBlacklist.splice(
      0,
      this.baseModuleBlacklist.length,
      'DebugService',
      'DebugStore',
      'MockDataCoordinator'
    )
    this.baseDebugBlacklist.splice(
      0,
      this.baseDebugBlacklist.length,
      'MenuService',
      'StorageDefinitions'
    )

    this.logs = []

    console.log('🔄 DebugUtils reset to default settings')
  }
}
