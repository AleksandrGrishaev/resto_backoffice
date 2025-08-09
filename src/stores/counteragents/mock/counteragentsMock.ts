// src/stores/counteragents/mock/counteragentsMock.ts

import type { Counteragent } from '../types'

const now = new Date().toISOString()

export const mockCounterAgents: Counteragent[] = [
  // =============================================
  // ПОСТАВЩИКИ МЯСА И ПТИЦЫ
  // =============================================
  {
    id: 'ca-premium-meat-co',
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
      'Премиальные мясные продукты высшего качества. Поставляем говядину, свинину, птицу для ресторанов.',
    paymentTerms: 'on_delivery',
    currentBalance: -2500000, // долг поставщику
    creditLimit: 10000000, // 10 млн IDR
    isActive: true,
    isPreferred: true,
    tags: ['halal', 'premium', 'fast-delivery'],
    notes: 'Надежный поставщик, всегда качественное мясо. Доставка 2 раза в неделю.',
    totalOrders: 145,
    totalOrderValue: 125000000,
    lastOrderDate: '2025-08-07T10:30:00Z',
    averageDeliveryTime: 1,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // ПОСТАВЩИКИ ОВОЩЕЙ И ФРУКТОВ
  // =============================================
  {
    id: 'ca-fresh-veg-market',
    name: 'Fresh Vegetable Market',
    displayName: 'Fresh Veg',
    type: 'supplier',
    contactPerson: 'Maria Sari',
    phone: '+62-21-555-0002',
    email: 'maria@freshveg.co.id',
    address: 'Pasar Induk Kramat Jati, Jakarta Timur 13550',
    productCategories: ['vegetables'],
    description:
      'Свежие овощи и зелень ежедневно с рынка. Картофель, помидоры, лук, чеснок и другие овощи.',
    paymentTerms: 'after',
    currentBalance: 0,
    creditLimit: 5000000,
    isActive: true,
    isPreferred: true,
    tags: ['fresh', 'daily-delivery', 'local'],
    notes: 'Ежедневная доставка свежих овощей. Очень хорошие цены.',
    totalOrders: 220,
    totalOrderValue: 45000000,
    lastOrderDate: '2025-08-08T06:00:00Z',
    averageDeliveryTime: 0.5,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // ПОСТАВЩИКИ МОЛОЧНЫХ ПРОДУКТОВ
  // =============================================
  {
    id: 'ca-dairy-plus',
    name: 'Dairy Products Plus',
    displayName: 'Dairy Plus',
    type: 'supplier',
    contactPerson: 'Budi Santoso',
    phone: '+62-21-555-0003',
    email: 'budi@dairyplus.co.id',
    address: 'Jl. Gatot Subroto No. 112, Jakarta Selatan 12870',
    website: 'www.dairyplus.co.id',
    productCategories: ['dairy'],
    description: 'Молочные продукты: молоко, сливочное масло, сыры, сливки для ресторанов.',
    paymentTerms: 'on_delivery',
    currentBalance: -850000,
    creditLimit: 7000000,
    isActive: true,
    isPreferred: false,
    tags: ['quality', 'imported'],
    notes: 'Хорошее качество молочных продуктов. Иногда задержки с доставкой.',
    totalOrders: 87,
    totalOrderValue: 38000000,
    lastOrderDate: '2025-08-06T14:20:00Z',
    averageDeliveryTime: 2,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // ПОСТАВЩИКИ НАПИТКОВ
  // =============================================
  {
    id: 'ca-beverage-distribution',
    name: 'Jakarta Beverage Distribution',
    displayName: 'JBD',
    type: 'supplier',
    contactPerson: 'Ahmad Wijaya',
    phone: '+62-21-555-0004',
    email: 'ahmad@jbd.co.id',
    address: 'Jl. Raya Bekasi Km 18, Jakarta Timur 13920',
    website: 'www.jbd.co.id',
    productCategories: ['beverages'],
    description:
      'Дистрибьютор напитков: пиво Bintang, Coca-Cola, минеральная вода и другие напитки.',
    paymentTerms: 'prepaid',
    currentBalance: 1200000, // предоплата
    creditLimit: 15000000,
    isActive: true,
    isPreferred: true,
    tags: ['official-distributor', 'bulk-discount'],
    notes: 'Официальный дистрибьютор Bintang и Coca-Cola. Скидки при больших заказах.',
    totalOrders: 95,
    totalOrderValue: 85000000,
    lastOrderDate: '2025-08-07T16:45:00Z',
    averageDeliveryTime: 1,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // ПОСТАВЩИКИ СПЕЦИЙ И ПРИПРАВ
  // =============================================
  {
    id: 'ca-spice-world',
    name: 'Spice World Indonesia',
    displayName: 'Spice World',
    type: 'supplier',
    contactPerson: 'Rina Anggraini',
    phone: '+62-21-555-0005',
    email: 'rina@spiceworld.co.id',
    address: 'Jl. Pramuka No. 67, Jakarta Pusat 10570',
    website: 'www.spiceworld.co.id',
    productCategories: ['spices'],
    description: 'Специи и приправы для ресторанов: соль, перец, орегано, базилик и другие специи.',
    paymentTerms: 'after',
    currentBalance: -450000,
    creditLimit: 3000000,
    isActive: true,
    isPreferred: true,
    tags: ['premium-spices', 'imported'],
    notes: 'Отличное качество специй. Есть как местные, так и импортные.',
    totalOrders: 64,
    totalOrderValue: 15000000,
    lastOrderDate: '2025-08-05T11:15:00Z',
    averageDeliveryTime: 2,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // УНИВЕРСАЛЬНЫЙ ПОСТАВЩИК
  // =============================================
  {
    id: 'ca-restaurant-supply',
    name: 'Restaurant Supply Co',
    displayName: 'Rest Supply',
    type: 'supplier',
    contactPerson: 'David Kurniawan',
    phone: '+62-21-555-0006',
    email: 'david@restsupply.co.id',
    address: 'Jl. MT Haryono No. 234, Jakarta Selatan 12810',
    website: 'www.restsupply.co.id',
    productCategories: ['other', 'equipment'],
    description: 'Универсальный поставщик для ресторанов: масла, готовые продукты, оборудование.',
    paymentTerms: 'custom',
    currentBalance: 0,
    creditLimit: 12000000,
    isActive: true,
    isPreferred: false,
    tags: ['one-stop-shop', 'flexible-terms'],
    notes: 'Удобно заказывать разные товары в одном месте. Гибкие условия оплаты.',
    totalOrders: 156,
    totalOrderValue: 95000000,
    lastOrderDate: '2025-08-07T09:20:00Z',
    averageDeliveryTime: 3,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // ПОСТАВЩИК ГОТОВЫХ ПРОДУКТОВ
  // =============================================
  {
    id: 'ca-bakery-delicious',
    name: 'Delicious Bakery House',
    displayName: 'Delicious Bakery',
    type: 'supplier',
    contactPerson: 'Sarah Chen',
    phone: '+62-21-555-0007',
    email: 'sarah@deliciousbakery.co.id',
    address: 'Jl. Senopati No. 88, Jakarta Selatan 12190',
    website: 'www.deliciousbakery.co.id',
    productCategories: ['other'],
    description: 'Пекарня: свежий хлеб, багеты, торты и другая выпечка для ресторанов.',
    paymentTerms: 'on_delivery',
    currentBalance: -320000,
    creditLimit: 4000000,
    isActive: true,
    isPreferred: true,
    tags: ['fresh-baked', 'daily-delivery'],
    notes: 'Отличная выпечка, всегда свежая. Доставка каждое утро.',
    totalOrders: 178,
    totalOrderValue: 28000000,
    lastOrderDate: '2025-08-08T07:30:00Z',
    averageDeliveryTime: 0.5,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // СЕРВИСНЫЕ КОМПАНИИ
  // =============================================
  {
    id: 'ca-cleaning-pro',
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
      'Профессиональная уборка ресторанов: ежедневная уборка, генеральная уборка, химчистка.',
    paymentTerms: 'after',
    currentBalance: -1800000,
    creditLimit: 8000000,
    isActive: true,
    isPreferred: true,
    tags: ['professional', 'insured', '24-7'],
    notes: 'Очень качественная уборка. Работают круглосуточно.',
    totalOrders: 24,
    totalOrderValue: 45000000,
    lastOrderDate: '2025-08-07T20:00:00Z',
    averageDeliveryTime: 0,
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'ca-tech-repair',
    name: 'Restaurant Tech Repair',
    displayName: 'Tech Repair',
    type: 'service',
    contactPerson: 'Tommy Lie',
    phone: '+62-21-555-0009',
    email: 'tommy@techrepair.co.id',
    address: 'Jl. Kebon Jeruk No. 45, Jakarta Barat 11530',
    productCategories: ['equipment'],
    description:
      'Ремонт и обслуживание кухонного оборудования: плиты, холодильники, посудомоечные машины.',
    paymentTerms: 'on_delivery',
    currentBalance: 0,
    creditLimit: 5000000,
    isActive: true,
    isPreferred: false,
    tags: ['certified', 'warranty'],
    notes: 'Быстрый ремонт оборудования. Дают гарантию на работы.',
    totalOrders: 18,
    totalOrderValue: 25000000,
    lastOrderDate: '2025-08-01T13:45:00Z',
    averageDeliveryTime: 1,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // ДОПОЛНИТЕЛЬНЫЕ ПОСТАВЩИКИ
  // =============================================
  {
    id: 'ca-organic-farm',
    name: 'Jakarta Organic Farm',
    displayName: 'Organic Farm',
    type: 'supplier',
    contactPerson: 'Green Wijaya',
    phone: '+62-21-555-0010',
    email: 'green@organicfarm.co.id',
    address: 'Bogor, Jawa Barat 16110',
    website: 'www.organicfarm.co.id',
    productCategories: ['vegetables', 'spices'],
    description: 'Органические овощи и травы с собственной фермы. Экологически чистые продукты.',
    paymentTerms: 'prepaid',
    currentBalance: 800000,
    creditLimit: 6000000,
    isActive: true,
    isPreferred: false,
    tags: ['organic', 'eco-friendly', 'farm-fresh'],
    notes: 'Органические продукты высокого качества, но дорогие.',
    totalOrders: 34,
    totalOrderValue: 18000000,
    lastOrderDate: '2025-08-04T15:20:00Z',
    averageDeliveryTime: 2,
    createdAt: now,
    updatedAt: now
  },

  {
    id: 'ca-import-foods',
    name: 'Premium Import Foods',
    displayName: 'Import Foods',
    type: 'supplier',
    contactPerson: 'Michael Johnson',
    phone: '+62-21-555-0011',
    email: 'michael@importfoods.co.id',
    address: 'Jl. Thamrin No. 230, Jakarta Pusat 10350',
    website: 'www.importfoods.co.id',
    productCategories: ['dairy', 'meat', 'other'],
    description: 'Импортные продукты премиум класса: европейские сыры, мясо, деликатесы.',
    paymentTerms: 'custom',
    currentBalance: -2200000,
    creditLimit: 20000000,
    isActive: true,
    isPreferred: false,
    tags: ['imported', 'premium', 'luxury'],
    notes: 'Дорогие импортные продукты для особых блюд.',
    totalOrders: 45,
    totalOrderValue: 75000000,
    lastOrderDate: '2025-08-03T12:00:00Z',
    averageDeliveryTime: 5,
    createdAt: now,
    updatedAt: now
  },

  // =============================================
  // НЕАКТИВНЫЙ ПОСТАВЩИК (для тестирования)
  // =============================================
  {
    id: 'ca-old-supplier',
    name: 'Old Reliable Supplier',
    displayName: 'Old Reliable',
    type: 'supplier',
    contactPerson: 'Pak Agus',
    phone: '+62-21-555-0012',
    email: 'agus@oldsupplier.co.id',
    address: 'Jl. Veteran No. 123, Jakarta Pusat 10110',
    productCategories: ['vegetables', 'other'],
    description: 'Старый поставщик, с которым больше не работаем.',
    paymentTerms: 'after',
    currentBalance: 0,
    creditLimit: 2000000,
    isActive: false, // ❌ неактивный
    isPreferred: false,
    tags: ['old', 'discontinued'],
    notes: 'Перестали работать из-за проблем с качеством.',
    totalOrders: 89,
    totalOrderValue: 35000000,
    lastOrderDate: '2025-05-15T10:00:00Z',
    averageDeliveryTime: 4,
    createdAt: now,
    updatedAt: now
  }
]

// Утилиты для работы с mock данными
export function getRandomCounteragent(): Counteragent {
  return mockCounterAgents[Math.floor(Math.random() * mockCounterAgents.length)]
}

export function getMockCounteragentsByType(type: string): Counteragent[] {
  if (type === 'all') return mockCounterAgents
  return mockCounterAgents.filter(ca => ca.type === type)
}

export function getMockCounteragentsByCategory(category: string): Counteragent[] {
  if (category === 'all') return mockCounterAgents
  return mockCounterAgents.filter(ca => ca.productCategories.includes(category as any))
}

export function getMockActiveCounterAgents(): Counteragent[] {
  return mockCounterAgents.filter(ca => ca.isActive)
}

export function getMockPreferredCounterAgents(): Counteragent[] {
  return mockCounterAgents.filter(ca => ca.isPreferred && ca.isActive)
}

export function findCounteragentById(id: string): Counteragent | undefined {
  return mockCounterAgents.find(ca => ca.id === id)
}

// Генерация статистики
export function generateMockStatistics() {
  const active = mockCounterAgents.filter(ca => ca.isActive)
  const preferred = mockCounterAgents.filter(ca => ca.isPreferred && ca.isActive)

  const typeBreakdown = mockCounterAgents.reduce(
    (acc, ca) => {
      acc[ca.type] = (acc[ca.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const categoryBreakdown = mockCounterAgents.reduce(
    (acc, ca) => {
      ca.productCategories.forEach(category => {
        acc[category] = (acc[category] || 0) + 1
      })
      return acc
    },
    {} as Record<string, number>
  )

  const paymentBreakdown = mockCounterAgents.reduce(
    (acc, ca) => {
      acc[ca.paymentTerms] = (acc[ca.paymentTerms] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return {
    totalCounterAgents: mockCounterAgents.length,
    activeCounterAgents: active.length,
    preferredCounterAgents: preferred.length,
    typeBreakdown,
    productCategoryBreakdown: categoryBreakdown,
    paymentTermsBreakdown: paymentBreakdown
  }
}
