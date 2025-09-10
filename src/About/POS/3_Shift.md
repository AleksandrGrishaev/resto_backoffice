// src/stores/pos/shifts/types.ts - УПРОЩЕННАЯ СИСТЕМА ТИПОВ ДЛЯ СМЕН

import type { BaseEntity, TransactionPerformer } from '@/types/common'
import type { Account, Transaction } from '@/stores/account/types'

// =============================================
// ОСНОВНЫЕ ТИПЫ СМЕН
// =============================================

export type ShiftStatus = 'active' | 'completed' | 'cancelled' | 'suspended'
export type CashDiscrepancyType = 'shortage' | 'overage' | 'none'
export type SyncStatus = 'synced' | 'pending' | 'failed' | 'offline'

// =============================================
// СПОСОБЫ ОПЛАТЫ (из PaymentSettingsView)
// =============================================

export interface PaymentMethod {
id: string
name: string
type: 'cash' | 'card' | 'bank' | 'gojek' | 'grab' | 'qr'
isActive: boolean
accountId?: string // Связь с Account Store
icon?: string
sortOrder?: number
}

// =============================================
// ГЛАВНАЯ СУЩНОСТЬ СМЕНЫ
// =============================================

export interface PosShift extends BaseEntity {
// Базовая информация
shiftNumber: string // Номер смены (например: "SHIFT-001-2025-09-10")
status: ShiftStatus

// Кассир и время
cashierId: string
cashierName: string
startTime: string
endTime?: string
duration?: number // В минутах

// Касса на начало
startingCash: number
startingCashVerified: boolean // Подтверждена ли начальная сумма

// Касса на конец (заполняется при закрытии)
endingCash?: number
expectedCash?: number // Ожидаемая сумма наличных
cashDiscrepancy?: number // Разница (+ излишек, - недостача)
cashDiscrepancyType?: CashDiscrepancyType

// Продажи и платежи
totalSales: number
totalTransactions: number
paymentMethods: PaymentMethodSummary[] // Массив способов оплаты

// Коррекции и объяснения
corrections: ShiftCorrection[]
notes?: string

// Интеграция с Account Store
accountBalances: ShiftAccountBalance[]

// Sync информация для ВСЕЙ смены (не для каждого платежа)
syncStatus: SyncStatus
lastSyncAt?: string
pendingSync: boolean

// Метаданные
deviceId?: string
location?: string
}

// =============================================
// УПРОЩЕННАЯ РАЗБИВКА ПЛАТЕЖЕЙ
// =============================================

export interface PaymentMethodSummary {
methodId: string // ID способа оплаты
methodName: string // Название (наличные, карта, etc.)
methodType: PaymentMethod['type']
count: number // Количество операций
amount: number // Общая сумма
percentage: number // Процент от общих продаж
}

// =============================================
// УПРОЩЕННЫЕ КОРРЕКЦИИ
// =============================================

export interface ShiftCorrection extends BaseEntity {
shiftId: string
type: 'cash_adjustment' | 'payment_correction' | 'refund' | 'void' | 'other'
amount: number
reason: string
description: string
performedBy: TransactionPerformer

// Связанные данные
relatedOrderId?: string
relatedPaymentId?: string

// Влияние на отчетность
affectsReporting: boolean
}

// =============================================
// БАЛАНСЫ СЧЕТОВ НА НАЧАЛО/КОНЕЦ СМЕНЫ
// =============================================

export interface ShiftAccountBalance {
accountId: string
accountName: string
accountType: Account['type']

// Балансы
startingBalance: number
endingBalance?: number
expectedBalance?: number
actualBalance?: number

// Движения за смену
totalIncome: number
totalExpense: number
transactionCount: number

// Расхождения
discrepancy?: number
discrepancyExplained: boolean
discrepancyNotes?: string

// Sync статус
lastSyncAt?: string
syncStatus: SyncStatus
}

// =============================================
// ИНТЕГРАЦИЯ С ACCOUNT STORE
// =============================================

export interface ShiftAccountIntegration {
// Записи, которые нужно создать в Account Store
pendingTransactions: ShiftTransaction[]

// Сверка с Account Store
accountStoreSyncStatus: Record<string, SyncStatus>
lastAccountStoreSync?: string

// Конфликты при синхронизации
syncConflicts: ShiftSyncConflict[]
}

export interface ShiftTransaction {
id: string
accountId: string
type: Transaction['type']
amount: number
description: string
performedBy: TransactionPerformer

// POS специфичные поля
shiftId: string
orderId?: string
paymentId?: string

// Sync информация
syncStatus: SyncStatus
syncAttempts: number
lastSyncAttempt?: string
syncError?: string
}

export interface ShiftSyncConflict {
id: string
type: 'balance_mismatch' | 'transaction_duplicate' | 'account_not_found'
description: string
shiftTransactionId?: string
accountStoreTransactionId?: string
suggestedResolution: string
isResolved: boolean
resolvedAt?: string
resolvedBy?: TransactionPerformer
}

// =============================================
// OFFLINE РЕЖИМ
// =============================================

export interface OfflineShiftData {
shiftId: string

// Данные для синхронизации
unsyncedTransactions: ShiftTransaction[]
unsyncedCorrections: ShiftCorrection[]
unsyncedOrders: string[] // ID заказов для синхронизации

// Метаданные offline сессии
offlineStartTime: string
offlineEndTime?: string
offlineDuration?: number

// Конфликты при восстановлении
conflicts: OfflineConflict[]

// Размер данных
dataSize: number // В байтах
estimatedSyncTime?: number // Оценка времени синхронизации
}

export interface OfflineConflict {
id: string
type: 'timestamp_conflict' | 'data_changed' | 'account_modified'
localData: any
serverData: any
suggestedResolution: 'use_local' | 'use_server' | 'merge' | 'manual'
isResolved: boolean
}

// =============================================
// ПРОСТОЙ ОТЧЕТ ПО СМЕНЕ
// =============================================

export interface ShiftReport {
shift: PosShift

// Базовые итоги
summary: ShiftBasicSummary

// Коррекции
corrections: ShiftCorrection[]

// Статус интеграции
integrationStatus: ShiftIntegrationStatus
}

export interface ShiftBasicSummary {
// Начало и конец смены
startTime: string
endTime?: string
duration?: number // В минутах

// Базовая статистика
totalSales: number
totalTransactions: number
averageTransactionValue: number

// По способам оплаты
cashSales: number
cardSales: number
digitalSales: number

// Возвраты и отмены
refunds: number
voids: number

// Чистая выручка
netRevenue: number

// Расхождения
totalDiscrepancies: number
unexplainedDiscrepancies: number
}

export interface ShiftIntegrationStatus {
accountStoreSync: {
status: SyncStatus
lastSync?: string
pendingTransactions: number
conflicts: number
}

inventorySync: {
status: SyncStatus
lastSync?: string
pendingUpdates: number
}

overallHealth: 'healthy' | 'warning' | 'error'
}

// =============================================
// DTO ДЛЯ СОЗДАНИЯ И ОБНОВЛЕНИЯ
// =============================================

export interface CreateShiftDto {
cashierId: string
cashierName: string
startingCash: number
notes?: string
deviceId?: string
location?: string
}

export interface EndShiftDto {
shiftId: string
endingCash: number
actualAccountBalances: Record<string, number> // accountId -> balance
corrections: Omit<ShiftCorrection, 'id' | 'shiftId' | 'createdAt' | 'updatedAt'>[]
notes?: string
performedBy: TransactionPerformer
}

export interface UpdateShiftDto {
shiftId: string
corrections?: Omit<ShiftCorrection, 'id' | 'shiftId' | 'createdAt' | 'updatedAt'>[]
notes?: string
deviceId?: string
}

// =============================================
// УТОЧНЕННАЯ АРХИТЕКТУРА ИНТЕГРАЦИИ
// =============================================

/\*
АРХИТЕКТУРА ИНТЕГРАЦИИ:

1. **WORKFLOW ПРОДАЖ**:
   Продажа → POS Payment → Shift Transaction → Account Store
   (цены берутся из локального кэша Menu Store, не из сети)

2. **WORKFLOW ЗАКАЗОВ** (TODO для будущего):
   Заказ → Кухня (напрямую, без смены)
   Заказ → Статистика (возможно через смену, решим позже)

3. **OFFLINE ПОДДЕРЖКА**:

   - Все ФИНАНСОВЫЕ операции сохраняются в смене
   - Заказы на кухню идут напрямую (если есть связь)
   - При восстановлении связи - синхронизация ТОЛЬКО финансов

4. **ИНТЕГРАЦИЯ**:

   - Shift Store → Account Store (создание Transaction)
   - Shift Store → Inventory Store (списание товаров при продаже)
   - Menu Store → локальный кэш (цены загружаются заранее)

5. **СТАТУС СИНХРОНИЗАЦИИ**:

   - Смена имеет общий syncStatus
   - Каждая ShiftTransaction имеет свой syncStatus
   - НЕ накапливаем, а синхронизируем и помечаем как synced
   - Конфликты разрешаются через UI

6. **СПОСОБЫ ОПЛАТЫ**:
   - Массив PaymentMethod из PaymentSettingsView
   - Каждый способ связан с Account через accountId
   - Динамическое добавление/удаление способов оплаты

TODO:

- Решить судьбу заказов (статистика vs прямая отправка)
- Реализовать кэширование меню для offline
- UI для разрешения конфликтов синхронизации
- Интеграция с PaymentSettingsView для способов оплаты
  \*/
