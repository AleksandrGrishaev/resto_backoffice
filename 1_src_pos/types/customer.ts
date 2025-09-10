// src/types/customer.ts
import { BaseEntity } from './common'
import { BillStatus } from './bill'

// Основной интерфейс клиента
export interface Customer extends BaseEntity {
  id: string
  firstName: string
  lastName: string
  phone?: string
  email?: string
  registrationDate: string
  lastVisitDate: string
  status: CustomerBageStatus
  notes?: string
}

// Статус клиента (можем расширить позже)
export type CustomerStatus = 'active' | 'inactive'

// Расширенная информация о клиенте для детального просмотра
export interface CustomerDetails extends Customer {
  statistics: CustomerStatistics
  billHistory: CustomerBillHistory[]
  favoriteItems: CustomerFavoriteItem[]
}

// Статистика клиента
export interface CustomerStatistics {
  totalSpent: number // Общая сумма затрат
  visitsCount: number // Количество посещений
  averageCheck: number // Средний чек
  firstVisitDate: string // Дата первого посещения
  lastVisitDate: string // Дата последнего посещения
}

// История счетов клиента
export interface CustomerBillHistory {
  id: string // ID счета
  date: string // Дата счета
  totalAmount: number // Общая сумма
  itemsCount: number // Количество позиций
  discountAmount?: number // Сумма скидки
  // discount info removed for now
  status: BillStatus // Статус счета
  items: CustomerBillItem[] // Позиции в счете
}

// Позиция в истории счетов
export interface CustomerBillItem {
  id: string
  name: string
  quantity: number
  price: number
  discount?: number // Скидка на позицию
  totalAmount: number // Итоговая сумма с учетом скидки
}

// Любимые позиции клиента
export interface CustomerFavoriteItem {
  id: string // ID блюда
  name: string
  orderCount: number // Сколько раз заказано
  lastOrdered: string // Когда последний раз заказано
  totalSpent: number // Сколько всего потрачено на это блюдо
}

// Поиск клиентов
export interface CustomerSearchQuery {
  searchText: string
  limit?: number
}

// Результат поиска клиента
export interface CustomerSearchResult {
  customer: Customer
  recentVisit?: {
    date: string
    amount: number
  }
  hasActiveDiscount: boolean
}

// Добавляем статусы для бейджей и фильтрации
export type CustomerBageStatus = 'active' | 'inactive' | 'blacklisted'

// История изменений данных клиента
export interface CustomerHistoryRecord {
  id: string
  date: string
  field: string
  oldValue: string
  newValue: string
  changedBy: string
}
