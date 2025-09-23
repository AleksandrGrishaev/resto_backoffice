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

  private static shouldLog(level: LogLevel): boolean {
    if (!this.isDev) return level === 'error'

    const debugLevel = this.debugLevel

    if (debugLevel === 'silent') return level === 'error'
    if (debugLevel === 'standard') return ['info', 'warn', 'error'].includes(level)
    return true // verbose - показываем все
  }

  private static getTimestamp(): string {
    return new Date().toISOString()
  }

  static log(level: LogLevel, module: string, message: string, data?: LogData) {
    if (!this.shouldLog(level)) return

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
}
