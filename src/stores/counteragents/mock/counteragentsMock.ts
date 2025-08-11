// src/stores/counteragents/mock/counteragentsMock.ts - INTEGRATED with MockDataCoordinator

import type { Counteragent } from '../types'
import { generateId, TimeUtils } from '@/utils'
import type { ProductCategory } from '@/stores/productsStore/types'

const MODULE_NAME = 'CounteragentsMock'

// =============================================
// ИНТЕГРИРОВАННЫЕ MOCK ДАННЫЕ
// =============================================

/**
 * ✅ ИНТЕГРИРОВАННЫЕ поставщики - связаны с продуктами через primarySupplierId
 * ID поставщиков соответствуют ID в productDefinitions.ts
 */
export function generateCounteragentsMockData(): Counteragent[] {
  const now = TimeUtils.getCurrentLocalISO()

  return [
    // =============================================
    // ПОСТАВЩИКИ МЯСА И ПТИЦЫ
    // =============================================
    {
      id: 'sup-premium-meat-co', // ✅ Соответствует productDefinitions
      name: 'Premium Meat Company',
      displayName: 'Premium Meat',
      type: 'supplier',
      contactPerson: 'John Sutanto',
      phone: '+62-21-555-0001',
      email: 'orders@premiummeat.co.id',
      address: 'Jl. Sudirman No. 45, Jakarta Selatan 12190',
      website: 'www.premiummeat.co.id',
      productCategories: ['meat'],
      description:
        'Premium meat products supplier. High quality beef, pork, poultry for restaurants.',
      paymentTerms: 'on_delivery',
      currentBalance: -2500000, // долг поставщику
      creditLimit: 10000000, // 10 млн IDR
      leadTimeDays: 3,
      deliverySchedule: 'weekly',
      minOrderAmount: 1000000, // 1M IDR minimum order
      isActive: true,
      isPreferred: true,
      tags: ['halal', 'premium', 'fast-delivery'],
      notes: 'Reliable supplier, always quality meat. Delivery 2 times per week.',
      totalOrders: 145,
      totalOrderValue: 125000000,
      lastOrderDate: TimeUtils.getCurrentLocalISO(),
      averageDeliveryTime: 2,
      createdAt: now,
      updatedAt: now
    },

    // =============================================
    // ПОСТАВЩИКИ ОВОЩЕЙ И ФРУКТОВ
    // =============================================
    {
      id: 'sup-fresh-veg-market', // ✅ Соответствует productDefinitions
      name: 'Fresh Vegetable Market',
      displayName: 'Fresh Veg',
      type: 'supplier',
      contactPerson: 'Maria Sari',
      phone: '+62-21-555-0002',
      email: 'maria@freshveg.co.id',
      address: 'Pasar Induk Kramat Jati, Jakarta Timur 13550',
      productCategories: ['vegetables'],
      description:
        'Fresh vegetables and herbs daily from market. Potatoes, tomatoes, onions, garlic and other vegetables.',
      paymentTerms: 'after',
      currentBalance: 0,
      creditLimit: 5000000,
      leadTimeDays: 1,
      deliverySchedule: 'daily',
      minOrderAmount: 500000, // 500K IDR minimum
      isActive: true,
      isPreferred: true,
      tags: ['fresh', 'daily-delivery', 'local'],
      notes: 'Daily delivery of fresh vegetables. Very good prices.',
      totalOrders: 220,
      totalOrderValue: 45000000,
      lastOrderDate: TimeUtils.getCurrentLocalISO(),
      averageDeliveryTime: 0.5,
      createdAt: now,
      updatedAt: now
    },

    // =============================================
    // ПОСТАВЩИКИ МОЛОЧНЫХ ПРОДУКТОВ
    // =============================================
    {
      id: 'sup-dairy-fresh', // ✅ Соответствует productDefinitions
      name: 'Dairy Products Fresh',
      displayName: 'Dairy Fresh',
      type: 'supplier',
      contactPerson: 'Budi Santoso',
      phone: '+62-21-555-0003',
      email: 'budi@dairyfresh.co.id',
      address: 'Jl. Gatot Subroto No. 112, Jakarta Selatan 12870',
      website: 'www.dairyfresh.co.id',
      productCategories: ['dairy'],
      description: 'Dairy products: milk, butter, cheese, cream for restaurants.',
      paymentTerms: 'on_delivery',
      currentBalance: -850000,
      creditLimit: 7000000,
      leadTimeDays: 2,
      deliverySchedule: 'weekly',
      minOrderAmount: 750000,
      isActive: true,
      isPreferred: false,
      tags: ['quality', 'imported'],
      notes: 'Good quality dairy products. Sometimes delivery delays.',
      totalOrders: 87,
      totalOrderValue: 38000000,
      lastOrderDate: TimeUtils.getCurrentLocalISO(),
      averageDeliveryTime: 2.5,
      createdAt: now,
      updatedAt: now
    },

    // =============================================
    // ПОСТАВЩИКИ НАПИТКОВ
    // =============================================
    {
      id: 'sup-beverage-distribution', // ✅ Соответствует productDefinitions
      name: 'Jakarta Beverage Distribution',
      displayName: 'JBD',
      type: 'supplier',
      contactPerson: 'Ahmad Wijaya',
      phone: '+62-21-555-0004',
      email: 'ahmad@jbd.co.id',
      address: 'Jl. Raya Bekasi Km 18, Jakarta Timur 13920',
      website: 'www.jbd.co.id',
      productCategories: ['beverages'],
      description: 'Beverage distributor: Bintang beer, Coca-Cola, mineral water and other drinks.',
      paymentTerms: 'prepaid',
      currentBalance: 1200000, // предоплата
      creditLimit: 15000000,
      leadTimeDays: 2,
      deliverySchedule: 'weekly',
      minOrderAmount: 2000000, // 2M IDR minimum for bulk
      isActive: true,
      isPreferred: true,
      tags: ['official-distributor', 'bulk-discount'],
      notes: 'Official distributor of Bintang and Coca-Cola. Discounts for large orders.',
      totalOrders: 95,
      totalOrderValue: 85000000,
      lastOrderDate: TimeUtils.getCurrentLocalISO(),
      averageDeliveryTime: 1.5,
      createdAt: now,
      updatedAt: now
    },

    // =============================================
    // ПОСТАВЩИКИ СПЕЦИЙ И ПРИПРАВ
    // =============================================
    {
      id: 'sup-spice-world', // ✅ Соответствует productDefinitions
      name: 'Spice World Indonesia',
      displayName: 'Spice World',
      type: 'supplier',
      contactPerson: 'Rina Anggraini',
      phone: '+62-21-555-0005',
      email: 'rina@spiceworld.co.id',
      address: 'Jl. Pramuka No. 67, Jakarta Pusat 10570',
      website: 'www.spiceworld.co.id',
      productCategories: ['spices'],
      description:
        'Spices and seasonings for restaurants: salt, pepper, oregano, basil and other spices.',
      paymentTerms: 'after',
      currentBalance: -450000,
      creditLimit: 3000000,
      leadTimeDays: 5,
      deliverySchedule: 'weekly',
      minOrderAmount: 300000,
      isActive: true,
      isPreferred: true,
      tags: ['premium-spices', 'imported'],
      notes: 'Excellent quality spices. Both local and imported varieties.',
      totalOrders: 64,
      totalOrderValue: 15000000,
      lastOrderDate: TimeUtils.getCurrentLocalISO(),
      averageDeliveryTime: 4,
      createdAt: now,
      updatedAt: now
    },

    // =============================================
    // УНИВЕРСАЛЬНЫЙ ПОСТАВЩИК
    // =============================================
    {
      id: 'sup-specialty-foods', // ✅ Соответствует productDefinitions
      name: 'Specialty Foods Supply',
      displayName: 'Specialty Foods',
      type: 'supplier',
      contactPerson: 'David Kurniawan',
      phone: '+62-21-555-0006',
      email: 'david@specialtyfoods.co.id',
      address: 'Jl. MT Haryono No. 234, Jakarta Selatan 12810',
      website: 'www.specialtyfoods.co.id',
      productCategories: ['other'],
      description: 'Specialty ingredients: olive oil, imported products, gourmet ingredients.',
      paymentTerms: 'custom',
      currentBalance: 0,
      creditLimit: 12000000,
      leadTimeDays: 7,
      deliverySchedule: 'weekly',
      minOrderAmount: 1500000,
      isActive: true,
      isPreferred: false,
      tags: ['specialty', 'imported', 'gourmet'],
      notes: 'High-end specialty ingredients. Custom payment terms available.',
      totalOrders: 78,
      totalOrderValue: 45000000,
      lastOrderDate: TimeUtils.getCurrentLocalISO(),
      averageDeliveryTime: 6,
      createdAt: now,
      updatedAt: now
    },

    // =============================================
    // БАЗОВЫЕ ПОСТАВЩИКИ
    // =============================================
    {
      id: 'sup-basic-supplies', // ✅ Соответствует productDefinitions
      name: 'Basic Kitchen Supplies',
      displayName: 'Basic Supplies',
      type: 'supplier',
      contactPerson: 'Ibu Sinta',
      phone: '+62-21-555-0007',
      email: 'sinta@basicsupplies.co.id',
      address: 'Jl. Veteran No. 89, Jakarta Pusat 10110',
      productCategories: ['spices', 'other'],
      description: 'Basic kitchen supplies: salt, basic spices, cleaning supplies.',
      paymentTerms: 'after',
      currentBalance: 0,
      creditLimit: 2000000,
      leadTimeDays: 3,
      deliverySchedule: 'weekly',
      minOrderAmount: 200000,
      isActive: true,
      isPreferred: false,
      tags: ['basic', 'affordable'],
      notes: 'Reliable for basic supplies. Good prices for bulk orders.',
      totalOrders: 156,
      totalOrderValue: 25000000,
      lastOrderDate: TimeUtils.getCurrentLocalISO(),
      averageDeliveryTime: 3,
      createdAt: now,
      updatedAt: now
    },

    // =============================================
    // СЕРВИСНЫЕ КОМПАНИИ
    // =============================================
    {
      id: 'srv-cleaning-pro',
      name: 'Cleaning Service Pro',
      displayName: 'Clean Pro',
      type: 'service',
      contactPerson: 'Indra Setiawan',
      phone: '+62-21-555-0008',
      email: 'indra@cleanpro.co.id',
      address: 'Jl. Casablanca No. 15, Jakarta Selatan 12960',
      website: 'www.cleanpro.co.id',
      productCategories: ['cleaning'],
      description:
        'Professional restaurant cleaning: daily cleaning, deep cleaning, chemical cleaning.',
      paymentTerms: 'after',
      currentBalance: -1800000,
      creditLimit: 8000000,
      leadTimeDays: 1,
      deliverySchedule: 'daily',
      minOrderAmount: 500000,
      isActive: true,
      isPreferred: true,
      tags: ['professional', 'insured', '24-7'],
      notes: 'Very high quality cleaning. Available 24/7.',
      totalOrders: 24,
      totalOrderValue: 45000000,
      lastOrderDate: TimeUtils.getCurrentLocalISO(),
      averageDeliveryTime: 0,
      createdAt: now,
      updatedAt: now
    },

    {
      id: 'srv-tech-repair',
      name: 'Restaurant Tech Repair',
      displayName: 'Tech Repair',
      type: 'service',
      contactPerson: 'Tommy Lie',
      phone: '+62-21-555-0009',
      email: 'tommy@techrepair.co.id',
      address: 'Jl. Kebon Jeruk No. 45, Jakarta Barat 11530',
      productCategories: ['equipment'],
      description: 'Kitchen equipment repair and maintenance: stoves, refrigerators, dishwashers.',
      paymentTerms: 'on_delivery',
      currentBalance: 0,
      creditLimit: 5000000,
      leadTimeDays: 2,
      deliverySchedule: 'on_demand',
      minOrderAmount: 300000,
      isActive: true,
      isPreferred: false,
      tags: ['certified', 'warranty'],
      notes: 'Fast equipment repair. Warranty on services.',
      totalOrders: 18,
      totalOrderValue: 25000000,
      lastOrderDate: TimeUtils.getCurrentLocalISO(),
      averageDeliveryTime: 1.5,
      createdAt: now,
      updatedAt: now
    }
  ]
}

// =============================================
// УТИЛИТЫ ДЛЯ ИНТЕГРАЦИИ
// =============================================

/**
 * Получить поставщика по ID (для интеграции с Product Store)
 */
export function findCounteragentById(id: string): Counteragent | undefined {
  return generateCounteragentsMockData().find(ca => ca.id === id)
}

/**
 * Получить поставщиков по категории продуктов
 */
export function getCounteragentsByCategory(category: ProductCategory): Counteragent[] {
  return generateCounteragentsMockData().filter(
    ca => ca.productCategories.includes(category) && ca.isActive
  )
}

/**
 * Получить основного поставщика для категории
 */
export function getPrimarySupplierForCategory(category: ProductCategory): Counteragent | undefined {
  const suppliers = getCounteragentsByCategory(category)
  return suppliers.find(s => s.isPreferred) || suppliers[0]
}

/**
 * Получить активных поставщиков
 */
export function getActiveCounterAgents(): Counteragent[] {
  return generateCounteragentsMockData().filter(ca => ca.isActive)
}

/**
 * Получить предпочтительных поставщиков
 */
export function getPreferredCounterAgents(): Counteragent[] {
  return generateCounteragentsMockData().filter(ca => ca.isPreferred && ca.isActive)
}

/**
 * Генерация статистики для интеграции
 */
export function generateCounteragentsStatistics() {
  const counteragents = generateCounteragentsMockData()
  const active = counteragents.filter(ca => ca.isActive)
  const preferred = counteragents.filter(ca => ca.isPreferred && ca.isActive)

  const typeBreakdown = counteragents.reduce(
    (acc, ca) => {
      acc[ca.type] = (acc[ca.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const categoryBreakdown = counteragents.reduce(
    (acc, ca) => {
      ca.productCategories.forEach(category => {
        acc[category] = (acc[category] || 0) + 1
      })
      return acc
    },
    {} as Record<string, number>
  )

  const paymentBreakdown = counteragents.reduce(
    (acc, ca) => {
      acc[ca.paymentTerms] = (acc[ca.paymentTerms] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return {
    totalCounterAgents: counteragents.length,
    activeCounterAgents: active.length,
    preferredCounterAgents: preferred.length,
    typeBreakdown,
    productCategoryBreakdown: categoryBreakdown,
    paymentTermsBreakdown: paymentBreakdown
  }
}

// =============================================
// ЭКСПОРТ ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ
// =============================================

export const mockCounterAgents = generateCounteragentsMockData()

/**
 * Получить случайного контрагента (для обратной совместимости)
 */
export function getRandomCounteragent(): Counteragent {
  const counteragents = generateCounteragentsMockData()
  return counteragents[Math.floor(Math.random() * counteragents.length)]
}

/**
 * Получить контрагентов по типу (для обратной совместимости)
 */
export function getMockCounteragentsByType(type: string): Counteragent[] {
  if (type === 'all') return generateCounteragentsMockData()
  return generateCounteragentsMockData().filter(ca => ca.type === type)
}

/**
 * Получить контрагентов по категории (для обратной совместимости)
 */
export function getMockCounteragentsByCategory(category: string): Counteragent[] {
  if (category === 'all') return generateCounteragentsMockData()
  return getCounteragentsByCategory(category as any)
}

/**
 * Получить активных контрагентов (для обратной совместимости)
 */
export function getMockActiveCounterAgents(): Counteragent[] {
  return getActiveCounterAgents()
}

/**
 * Получить предпочтительных контрагентов (для обратной совместимости)
 */
export function getMockPreferredCounterAgents(): Counteragent[] {
  return getPreferredCounterAgents()
}

/**
 * Генерация статистики (для обратной совместимости)
 */
export function generateMockStatistics() {
  return generateCounteragentsStatistics()
}
