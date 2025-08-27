// src/stores/shared/mockDataCoordinator.ts - UNIFIED WITH FULL INTEGRATION

import {
  CORE_PRODUCTS,
  type CoreProductDefinition,
  validateAllProducts
} from './productDefinitions'
import type { Product, ProductPriceHistory } from '@/stores/productsStore/types'
import type { Counteragent } from '@/stores/counteragents/types'
import type {
  ProcurementRequest,
  PurchaseOrder,
  Receipt,
  OrderSuggestion,
  RequestItem,
  OrderItem,
  ReceiptItem
} from '@/stores/supplier_2/types'
import { generateCounteragentsMockData } from '@/stores/counteragents/mock/counteragentsMock'
import { DebugUtils, TimeUtils } from '@/utils'

const MODULE_NAME = 'MockDataCoordinator'

export class MockDataCoordinator {
  private productsData: {
    products: Product[]
    priceHistory: ProductPriceHistory[]
  } | null = null

  private counteragentsData: {
    counteragents: Counteragent[]
    suppliers: Counteragent[]
  } | null = null

  private supplierStoreData: {
    requests: ProcurementRequest[]
    orders: PurchaseOrder[]
    receipts: Receipt[]
    suggestions: OrderSuggestion[]
  } | null = null

  private storageStoreData: {
    operations: any[]
    balances: any[]
    batches: any[]
  } | null = null

  constructor() {
    DebugUtils.info(
      MODULE_NAME,
      '🏗️ Initializing unified mock data coordinator with full integration'
    )

    // Валидируем определения продуктов при инициализации
    if (import.meta.env.DEV) {
      this.validateProductDefinitions()
    }
  }

  // =============================================
  // ВАЛИДАЦИЯ ОПРЕДЕЛЕНИЙ
  // =============================================

  private validateProductDefinitions(): void {
    const validation = validateAllProducts()

    if (!validation.isValid) {
      DebugUtils.error(MODULE_NAME, '❌ Product definitions validation failed:', {
        errors: validation.errors,
        invalidProducts: validation.invalidProducts
      })

      // В dev режиме показываем подробную информацию
      console.error('=== PRODUCT DEFINITIONS VALIDATION ERRORS ===')
      validation.errors.forEach(error => console.error('❌', error))

      if (validation.warnings.length > 0) {
        console.warn('=== WARNINGS ===')
        validation.warnings.forEach(warning => console.warn('⚠️', warning))
      }
    } else {
      DebugUtils.info(MODULE_NAME, '✅ All product definitions are valid', {
        validProducts: validation.validProducts,
        warnings: validation.warnings.length
      })

      if (validation.warnings.length > 0) {
        DebugUtils.warn(MODULE_NAME, 'Product definition warnings:', validation.warnings)
      }
    }
  }

  // =============================================
  // PRODUCTS STORE DATA
  // =============================================

  getProductsStoreData() {
    if (!this.productsData) {
      this.productsData = this.generateProductsData()
    }
    return this.productsData
  }

  getProductDefinition(productId: string): CoreProductDefinition | undefined {
    return CORE_PRODUCTS.find(p => p.id === productId)
  }

  // =============================================
  // COUNTERAGENTS STORE DATA
  // =============================================

  getCounteragentsStoreData() {
    if (!this.counteragentsData) {
      this.counteragentsData = this.generateCounteragentsData()
    }
    return this.counteragentsData
  }

  // Добавляем совместимый метод для старого кода
  getCounterAgentsStoreData() {
    return this.getCounteragentsStoreData()
  }

  private generateCounteragentsData() {
    DebugUtils.info(MODULE_NAME, '🏪 Generating counteragents data with product integration')

    const counteragents = generateCounteragentsMockData()
    const suppliers = counteragents.filter(ca => ca.type === 'supplier')

    // Проверяем связи поставщиков с продуктами
    this.validateSupplierProductLinks(counteragents)

    const result = {
      counteragents,
      suppliers
    }

    DebugUtils.info(MODULE_NAME, '✅ Counteragents data generated', {
      total: counteragents.length,
      suppliers: suppliers.length,
      services: counteragents.filter(ca => ca.type === 'service').length,
      active: counteragents.filter(ca => ca.isActive).length,
      preferred: counteragents.filter(ca => ca.isPreferred).length
    })

    return result
  }

  private validateSupplierProductLinks(counteragents: Counteragent[]): void {
    DebugUtils.debug(MODULE_NAME, '🔗 Validating supplier-product links')

    const suppliers = counteragents.filter(ca => ca.type === 'supplier')
    const supplierIds = new Set(suppliers.map(s => s.id))

    // Проверяем, что у всех продуктов есть поставщики
    const orphanedProducts: string[] = []
    const linkedProducts: string[] = []

    CORE_PRODUCTS.forEach(product => {
      if (product.primarySupplierId && supplierIds.has(product.primarySupplierId)) {
        linkedProducts.push(product.id)
      } else {
        orphanedProducts.push(product.id)
        DebugUtils.warn(MODULE_NAME, 'Product has invalid supplier link', {
          productId: product.id,
          productName: product.name,
          invalidSupplierId: product.primarySupplierId
        })
      }
    })

    // Проверяем, что у поставщиков есть продукты в соответствующих категориях
    suppliers.forEach(supplier => {
      const supplierProducts = CORE_PRODUCTS.filter(p => p.primarySupplierId === supplier.id)
      const supplierCategories = new Set(supplier.productCategories)

      supplierProducts.forEach(product => {
        if (!supplierCategories.has(product.category)) {
          DebugUtils.warn(MODULE_NAME, 'Supplier category mismatch', {
            supplierId: supplier.id,
            supplierName: supplier.name,
            supplierCategories: Array.from(supplierCategories),
            productId: product.id,
            productCategory: product.category
          })
        }
      })
    })

    DebugUtils.info(MODULE_NAME, '✅ Supplier-product links validated', {
      totalProducts: CORE_PRODUCTS.length,
      linkedProducts: linkedProducts.length,
      orphanedProducts: orphanedProducts.length,
      totalSuppliers: suppliers.length,
      supplierIds: Array.from(supplierIds)
    })

    if (orphanedProducts.length > 0) {
      DebugUtils.warn(MODULE_NAME, 'Found orphaned products without valid suppliers', {
        orphanedProducts
      })
    }
  }

  // =============================================
  // STORAGE STORE DATA
  // =============================================

  getStorageStoreData() {
    if (!this.storageStoreData) {
      this.storageStoreData = this.generateStorageStoreData()
    }
    return this.storageStoreData
  }

  private generateStorageStoreData() {
    try {
      DebugUtils.info(MODULE_NAME, '📦 Generating storage store data...')

      const productsData = this.getProductsStoreData()
      const operations: any[] = []
      const balances: any[] = []
      const batches: any[] = []

      // Генерируем балансы для каждого продукта
      productsData.products.forEach(product => {
        // Kitchen balance
        const kitchenBalance = this.generateProductBalance(product, 'kitchen')
        if (kitchenBalance) {
          balances.push(kitchenBalance)
        }

        // Bar balance (для напитков)
        if (this.isBarItem(product.id)) {
          const barBalance = this.generateProductBalance(product, 'bar')
          if (barBalance) {
            balances.push(barBalance)
          }
        }
      })

      DebugUtils.info(MODULE_NAME, '✅ Storage store data generated', {
        operations: operations.length,
        balances: balances.length,
        batches: batches.length
      })

      return { operations, balances, batches }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to generate storage store data', { error })
      return { operations: [], balances: [], batches: [] }
    }
  }

  private generateProductBalance(product: Product, department: 'kitchen' | 'bar') {
    const productDef = this.getProductDefinition(product.id)
    if (!productDef) return null

    // Генерируем случайный текущий остаток
    const minStock = productDef.minStock || 1
    const maxStock = productDef.maxStock || minStock * 3

    // 70% chance of normal stock, 20% low stock, 10% out of stock
    let currentStock: number
    const rand = Math.random()
    if (rand < 0.1) {
      currentStock = 0 // Out of stock
    } else if (rand < 0.3) {
      currentStock = Math.random() * minStock * 0.5 // Low stock
    } else {
      currentStock = minStock + Math.random() * (maxStock - minStock) // Normal stock
    }

    const newestBatchDate = new Date()
    newestBatchDate.setDate(newestBatchDate.getDate() - Math.floor(Math.random() * 7))

    return {
      itemId: product.id,
      itemName: product.name,
      department,
      totalQuantity: Math.round(currentStock * 1000) / 1000,
      unit: productDef.baseUnit,
      latestCost: productDef.baseCostPerUnit,
      newestBatchDate: newestBatchDate.toISOString(),
      oldestBatchDate: newestBatchDate.toISOString(), // Simplified
      batchCount: 1
    }
  }

  // =============================================
  // SUPPLIER STORE DATA
  // =============================================

  getSupplierStoreData() {
    if (!this.supplierStoreData) {
      this.supplierStoreData = this.generateSupplierStoreData()
    }
    return this.supplierStoreData
  }

  private generateSupplierStoreData() {
    try {
      DebugUtils.info(MODULE_NAME, 'Generating integrated supplier store data...')

      // 1. Generate suggestions from storage data
      const suggestions = this.generateSuggestionsFromStorage()

      // 2. Generate realistic requests based on suggestions
      const requests = this.generateRealisticRequests(suggestions)

      // 3. Generate orders from some requests
      const orders = this.generateOrdersFromRequests(requests)

      // 4. Generate receipts from some orders
      const receipts = this.generateReceiptsFromOrders(orders)

      DebugUtils.info(MODULE_NAME, 'Supplier store data generated successfully', {
        suggestions: suggestions.length,
        requests: requests.length,
        orders: orders.length,
        receipts: receipts.length
      })

      return { requests, orders, receipts, suggestions }
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to generate supplier store data', { error })

      // Fallback to minimal data
      return {
        requests: [],
        orders: [],
        receipts: [],
        suggestions: []
      }
    }
  }

  private generateSuggestionsFromStorage(): OrderSuggestion[] {
    try {
      const storageData = this.getStorageStoreData()
      const productsData = this.getProductsStoreData()
      const suggestions: OrderSuggestion[] = []

      // Get products that need reordering
      const products = productsData.products.filter(product => product.isActive)

      for (const product of products) {
        const productDef = this.getProductDefinition(product.id)
        if (!productDef) continue

        // Find storage balances for this product
        const kitchenBalance = storageData.balances.find(
          b => b.itemId === product.id && b.department === 'kitchen'
        )
        const barBalance = storageData.balances.find(
          b => b.itemId === product.id && b.department === 'bar'
        )

        // Check kitchen department
        if (this.shouldSuggestReorder(productDef, kitchenBalance)) {
          suggestions.push(
            this.createSuggestionFromBalance(product, productDef, kitchenBalance, 'kitchen')
          )
        }

        // Check bar department
        if (this.shouldSuggestReorder(productDef, barBalance)) {
          suggestions.push(this.createSuggestionFromBalance(product, productDef, barBalance, 'bar'))
        }
      }

      // Sort by urgency
      suggestions.sort((a, b) => {
        const urgencyOrder = { high: 3, medium: 2, low: 1 }
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
      })

      return suggestions.slice(0, 15) // Limit to reasonable number
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to generate suggestions from storage', { error })
      return []
    }
  }

  private shouldSuggestReorder(productDef: CoreProductDefinition, balance?: any): boolean {
    if (!balance) {
      return false // No balance data = no suggestion
    }

    const currentStock = balance.totalQuantity || 0
    const minStock = productDef.minStock || 0

    // Suggest if out of stock or below minimum
    return currentStock <= 0 || (minStock > 0 && currentStock < minStock)
  }

  private createSuggestionFromBalance(
    product: Product,
    productDef: CoreProductDefinition,
    balance: any,
    department: 'kitchen' | 'bar'
  ): OrderSuggestion {
    const currentStock = balance?.totalQuantity || 0
    const minStock = productDef.minStock || 0
    const latestCost = balance?.latestCost || productDef.baseCostPerUnit || 0

    // Calculate suggested quantity
    let suggestedQuantity = 1
    if (currentStock <= 0) {
      suggestedQuantity = Math.max(minStock * 2, 1)
    } else if (minStock > 0) {
      suggestedQuantity = Math.max(Math.ceil(minStock * 1.5 - currentStock), 1)
    }

    // Determine urgency
    let urgency: 'low' | 'medium' | 'high' = 'low'
    if (currentStock <= 0) {
      urgency = 'high'
    } else if (currentStock < minStock * 0.5) {
      urgency = 'high'
    } else if (currentStock < minStock * 0.8) {
      urgency = 'medium'
    }

    return {
      itemId: product.id,
      itemName: product.name,
      currentStock: Math.round(currentStock * 1000) / 1000,
      minStock: minStock,
      suggestedQuantity: suggestedQuantity,
      urgency: urgency,
      reason: currentStock <= 0 ? 'out_of_stock' : 'below_minimum',
      estimatedPrice: Math.round(latestCost),
      lastPriceDate: balance?.newestBatchDate
    }
  }

  private generateRealisticRequests(suggestions: OrderSuggestion[]): ProcurementRequest[] {
    const requests: ProcurementRequest[] = []

    // Group suggestions by department and urgency
    const kitchenUrgent = suggestions.filter(
      s => s.urgency === 'high' && this.isKitchenItem(s.itemId)
    )
    const barUrgent = suggestions.filter(s => s.urgency === 'high' && this.isBarItem(s.itemId))

    // Create urgent kitchen request
    if (kitchenUrgent.length > 0) {
      requests.push(
        this.createRequestFromSuggestions(
          kitchenUrgent.slice(0, 5),
          'kitchen',
          'urgent',
          'Chef Maria',
          -2 // 2 days ago
        )
      )
    }

    // Create urgent bar request
    if (barUrgent.length > 0) {
      requests.push(
        this.createRequestFromSuggestions(
          barUrgent.slice(0, 3),
          'bar',
          'urgent',
          'Bar Manager',
          -1 // 1 day ago
        )
      )
    }

    // Create regular requests
    const kitchenRegular = suggestions
      .filter(s => s.urgency !== 'high' && this.isKitchenItem(s.itemId))
      .slice(0, 8)

    if (kitchenRegular.length > 0) {
      requests.push(
        this.createRequestFromSuggestions(
          kitchenRegular,
          'kitchen',
          'normal',
          'Sous Chef',
          0 // today
        )
      )
    }

    return requests
  }

  private createRequestFromSuggestions(
    suggestions: OrderSuggestion[],
    department: 'kitchen' | 'bar',
    priority: 'normal' | 'urgent',
    requestedBy: string,
    daysOffset: number
  ): ProcurementRequest {
    const requestDate = new Date()
    requestDate.setDate(requestDate.getDate() + daysOffset)

    const items: RequestItem[] = suggestions.map((suggestion, index) => ({
      id: `req-item-${Date.now()}-${index}`,
      itemId: suggestion.itemId,
      itemName: suggestion.itemName,
      category: this.getItemCategory(suggestion.itemId),
      requestedQuantity: suggestion.suggestedQuantity,
      unit: this.getItemUnit(suggestion.itemId),
      estimatedPrice: suggestion.estimatedPrice,
      priority: suggestion.urgency === 'high' ? 'urgent' : 'normal',
      notes: `${suggestion.reason} - Current stock: ${suggestion.currentStock}`
    }))

    return {
      id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      requestNumber: this.generateRequestNumber(department, Date.now()),
      department,
      requestedBy,
      items,
      status: daysOffset < 0 ? 'submitted' : 'draft',
      priority,
      notes: `Generated from Order Assistant - ${priority} priority`,
      createdAt: requestDate.toISOString(),
      updatedAt: requestDate.toISOString()
    }
  }

  private generateOrdersFromRequests(requests: ProcurementRequest[]): PurchaseOrder[] {
    const orders: PurchaseOrder[] = []

    // Only process submitted requests
    const submittedRequests = requests.filter(r => r.status === 'submitted')

    for (const request of submittedRequests.slice(0, 2)) {
      // Limit to 2 orders
      const order = this.createOrderFromRequest(request, orders.length)
      orders.push(order)
    }

    return orders
  }

  private createOrderFromRequest(request: ProcurementRequest, orderIndex: number): PurchaseOrder {
    const orderDate = new Date(request.createdAt)
    orderDate.setHours(orderDate.getHours() + 2) // Order created 2 hours after request

    const supplierId = this.selectSupplierForRequest(request)
    const counteragentsData = this.getCounteragentsStoreData()
    const supplier = counteragentsData.suppliers.find(s => s.id === supplierId)

    const items: OrderItem[] = request.items.map((reqItem, index) => ({
      id: `po-item-${Date.now()}-${index}`,
      itemId: reqItem.itemId,
      itemName: reqItem.itemName,
      orderedQuantity: reqItem.requestedQuantity,
      unit: reqItem.unit,
      pricePerUnit: reqItem.estimatedPrice,
      totalPrice: reqItem.requestedQuantity * reqItem.estimatedPrice,
      isEstimatedPrice: true,
      lastPriceDate: this.getLastPriceDate(reqItem.itemId),
      status: 'ordered'
    }))

    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0)

    return {
      id: `po-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      orderNumber: this.generateOrderNumber(orderIndex + 1),
      supplierId: supplierId,
      supplierName: supplier?.name || 'Default Supplier',
      orderDate: orderDate.toISOString(),
      items,
      totalAmount: Math.round(totalAmount),
      isEstimatedTotal: true,
      status: orderIndex === 0 ? 'sent' : 'draft',
      paymentStatus: orderIndex === 0 ? 'paid' : 'pending',
      requestIds: [request.id],
      expectedDeliveryDate: this.calculateDeliveryDate(orderDate),
      notes: `Order from request ${request.requestNumber}`,
      createdAt: orderDate.toISOString(),
      updatedAt: orderDate.toISOString()
    }
  }

  private generateReceiptsFromOrders(orders: PurchaseOrder[]): Receipt[] {
    const receipts: Receipt[] = []

    // Only process paid orders
    const paidOrders = orders.filter(o => o.paymentStatus === 'paid' && o.status === 'sent')

    for (const order of paidOrders.slice(0, 1)) {
      // Create 1 receipt
      const receipt = this.createReceiptFromOrder(order, receipts.length)
      receipts.push(receipt)
    }

    return receipts
  }

  private createReceiptFromOrder(order: PurchaseOrder, receiptIndex: number): Receipt {
    const deliveryDate = new Date(order.orderDate)
    deliveryDate.setDate(deliveryDate.getDate() + 2) // Delivered 2 days after order

    const items: ReceiptItem[] = order.items.map((orderItem, index) => {
      // Simulate some realistic variations
      const receivedQuantity = this.simulateReceivedQuantity(orderItem.orderedQuantity)
      const actualPrice = this.simulateActualPrice(orderItem.pricePerUnit)

      return {
        id: `receipt-item-${Date.now()}-${index}`,
        orderItemId: orderItem.id,
        itemId: orderItem.itemId,
        itemName: orderItem.itemName,
        orderedQuantity: orderItem.orderedQuantity,
        receivedQuantity: receivedQuantity,
        orderedPrice: orderItem.pricePerUnit,
        actualPrice: actualPrice !== orderItem.pricePerUnit ? actualPrice : undefined,
        notes: this.generateReceiptItemNotes(
          receivedQuantity,
          orderItem.orderedQuantity,
          actualPrice,
          orderItem.pricePerUnit
        )
      }
    })

    const hasQuantityDiscrepancies = items.some(
      item => Math.abs(item.receivedQuantity - item.orderedQuantity) > 0.001
    )
    const hasPriceDiscrepancies = items.some(
      item => item.actualPrice && Math.abs(item.actualPrice - item.orderedPrice) > 0.01
    )

    return {
      id: `receipt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      receiptNumber: this.generateReceiptNumber(receiptIndex + 1),
      purchaseOrderId: order.id,
      deliveryDate: deliveryDate.toISOString(),
      receivedBy: order.supplierId.includes('vegetables') ? 'Kitchen Staff' : 'Warehouse Manager',
      items,
      hasDiscrepancies: hasQuantityDiscrepancies || hasPriceDiscrepancies,
      status: 'completed',
      storageOperationId: `op-${Date.now()}`, // Mock storage operation ID
      notes: 'Receipt processed successfully',
      createdAt: deliveryDate.toISOString(),
      updatedAt: deliveryDate.toISOString()
    }
  }

  // =============================================
  // ИНТЕГРАЦИОННЫЕ МЕТОДЫ
  // =============================================

  getSupplierForProduct(productId: string): Counteragent | undefined {
    const product = this.getProductDefinition(productId)
    if (!product?.primarySupplierId) {
      return undefined
    }

    const counteragentsData = this.getCounteragentsStoreData()
    return counteragentsData.counteragents.find(ca => ca.id === product.primarySupplierId)
  }

  getProductsForSupplier(supplierId: string): CoreProductDefinition[] {
    return CORE_PRODUCTS.filter(p => p.primarySupplierId === supplierId)
  }

  getSuppliersForCategory(category: string): Counteragent[] {
    const counteragentsData = this.getCounteragentsStoreData()
    return counteragentsData.counteragents.filter(
      ca => ca.type === 'supplier' && ca.isActive && ca.productCategories.includes(category as any)
    )
  }

  validateStoreIntegration(): {
    isValid: boolean
    errors: string[]
    warnings: string[]
    summary: {
      productsCount: number
      counteragentsCount: number
      linkedProductsCount: number
      orphanedProductsCount: number
      supplierCoverage: Record<string, number>
    }
  } {
    DebugUtils.info(MODULE_NAME, '🔍 Validating complete store integration')

    const errors: string[] = []
    const warnings: string[] = []

    const productsData = this.getProductsStoreData()
    const counteragentsData = this.getCounteragentsStoreData()

    const products = productsData.products
    const counteragents = counteragentsData.counteragents
    const suppliers = counteragents.filter(ca => ca.type === 'supplier')

    // Проверяем связи продуктов с поставщиками
    let linkedProductsCount = 0
    let orphanedProductsCount = 0
    const supplierCoverage: Record<string, number> = {}

    products.forEach(product => {
      const productDef = this.getProductDefinition(product.id)
      if (productDef?.primarySupplierId) {
        const supplier = suppliers.find(s => s.id === productDef.primarySupplierId)
        if (supplier) {
          linkedProductsCount++
          supplierCoverage[supplier.id] = (supplierCoverage[supplier.id] || 0) + 1
        } else {
          orphanedProductsCount++
          errors.push(
            `Product ${product.name} has invalid supplier ID: ${productDef.primarySupplierId}`
          )
        }
      } else {
        orphanedProductsCount++
        warnings.push(`Product ${product.name} has no primary supplier`)
      }
    })

    // Проверяем неиспользуемых поставщиков
    suppliers.forEach(supplier => {
      if (!supplierCoverage[supplier.id]) {
        warnings.push(`Supplier ${supplier.name} has no assigned products`)
      }
    })

    const summary = {
      productsCount: products.length,
      counteragentsCount: counteragents.length,
      linkedProductsCount,
      orphanedProductsCount,
      supplierCoverage
    }

    const isValid = errors.length === 0

    DebugUtils.info(MODULE_NAME, '✅ Store integration validation completed', {
      isValid,
      errorsCount: errors.length,
      warningsCount: warnings.length,
      summary
    })

    return {
      isValid,
      errors,
      warnings,
      summary
    }
  }

  // =============================================
  // ГЕНЕРАЦИЯ ПРОДУКТОВ
  // =============================================

  private generateProductsData() {
    DebugUtils.info(MODULE_NAME, '🛍️ Generating products data with base units')

    const products = this.generateEnhancedProducts()
    const priceHistory = this.generateEnhancedPriceHistory()

    const result = {
      products,
      priceHistory
    }

    DebugUtils.info(MODULE_NAME, '✅ Products data generated', {
      total: products.length,
      sellable: products.filter(p => p.canBeSold).length,
      rawMaterials: products.filter(p => !p.canBeSold).length,
      priceRecords: priceHistory.length,
      baseUnitsUsed: this.getBaseUnitsStats(products)
    })

    // В dev режиме показываем примеры расчетов
    if (import.meta.env.DEV) {
      this.demonstrateCorrectCalculations(products)
    }

    return result
  }

  private generateEnhancedProducts(): Product[] {
    const now = new Date().toISOString()

    return CORE_PRODUCTS.map(productDef => {
      // ✅ НОВАЯ СТРУКТУРА: Product с базовыми единицами
      const product = {
        // Основная информация
        id: productDef.id,
        name: productDef.name,
        nameEn: productDef.nameEn,
        description: this.generateDescription(productDef),
        category: productDef.category,

        // ✅ БАЗОВЫЕ ЕДИНИЦЫ для расчетов себестоимости
        baseUnit: productDef.baseUnit, // gram, ml, или piece
        baseCostPerUnit: productDef.baseCostPerUnit, // IDR за грамм/мл/штуку

        // ✅ ЕДИНИЦЫ ЗАКУПКИ (для удобства ввода)
        purchaseUnit: productDef.purchaseUnit, // кг, литр, упаковка
        purchaseToBaseRatio: productDef.purchaseToBaseRatio, // коэффициент перевода
        purchaseCost: productDef.purchaseCost, // IDR за единицу закупки

        // ✅ ТЕКУЩАЯ ЦЕНА (дублируем для совместимости)
        costPerUnit: productDef.purchaseCost, // Цена за purchaseUnit (для совместимости)
        currentCostPerUnit: productDef.baseCostPerUnit, // Цена за baseUnit

        // Существующие поля
        yieldPercentage: productDef.yieldPercentage,
        canBeSold: productDef.canBeSold,
        isActive: true,

        // ✅ ИНТЕГРАЦИЯ: Поставщик
        primarySupplierId: productDef.primarySupplierId,

        // Дополнительные поля
        storageConditions: this.getStorageConditions(productDef.category),
        shelfLife: productDef.shelfLifeDays,
        minStock: this.calculateMinStock(productDef),
        maxStock: this.calculateMaxStock(productDef),
        leadTimeDays: productDef.leadTimeDays,
        tags: this.generateTags(productDef),

        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: now
      } as Product & {
        baseUnit: 'gram' | 'ml' | 'piece'
        baseCostPerUnit: number
        purchaseUnit: string
        purchaseToBaseRatio: number
        purchaseCost: number
        currentCostPerUnit: number
        primarySupplierId?: string
      }

      // ✅ ВАЛИДАЦИЯ: Проверяем правильность расчета базовой стоимости
      const expectedBaseCost = productDef.purchaseCost / productDef.purchaseToBaseRatio
      if (Math.abs(expectedBaseCost - productDef.baseCostPerUnit) > 0.01) {
        DebugUtils.error(MODULE_NAME, `❌ Base cost calculation error for ${productDef.name}`, {
          expected: expectedBaseCost,
          actual: productDef.baseCostPerUnit,
          purchaseCost: productDef.purchaseCost,
          ratio: productDef.purchaseToBaseRatio
        })
      }

      return product as Product
    })
  }

  private generateEnhancedPriceHistory(): ProductPriceHistory[] {
    const now = new Date().toISOString()

    return CORE_PRODUCTS.map(productDef => ({
      id: `price-${productDef.id}-current`,
      productId: productDef.id,

      // ✅ НОВЫЕ ПОЛЯ: Цена в базовых единицах
      basePricePerUnit: productDef.baseCostPerUnit, // IDR за грамм/мл/штуку

      // Информация о закупке
      purchasePrice: productDef.purchaseCost, // IDR за единицу закупки
      purchaseUnit: productDef.purchaseUnit, // кг, литр, упаковка
      purchaseQuantity: productDef.purchaseToBaseRatio, // количество базовых единиц в упаковке

      effectiveDate: now,
      sourceType: 'manual_update' as const,
      notes: `Base cost: ${productDef.baseCostPerUnit} IDR/${productDef.baseUnit}`,
      createdAt: now,
      updatedAt: now
    })) as ProductPriceHistory[]
  }

  // =============================================
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // =============================================

  private isKitchenItem(itemId: string): boolean {
    return !this.isBarItem(itemId)
  }

  private isBarItem(itemId: string): boolean {
    return (
      itemId.includes('beer') ||
      itemId.includes('cola') ||
      itemId.includes('water') ||
      itemId.includes('wine') ||
      itemId.includes('spirit') ||
      itemId.includes('juice')
    )
  }

  private getItemCategory(itemId: string): string {
    const productsData = this.getProductsStoreData()
    const product = productsData.products.find(p => p.id === itemId)
    return product?.category || 'other'
  }

  private getItemUnit(itemId: string): string {
    const productDef = this.getProductDefinition(itemId)
    return productDef?.baseUnit || 'kg'
  }

  private selectSupplierForRequest(request: ProcurementRequest): string {
    const counteragents = this.getCounteragentsStoreData()
    const suppliers = counteragents.suppliers.filter(s => s.isActive)

    // Simple logic: vegetables supplier for vegetables, general for others
    const hasVegetables = request.items.some(
      item => item.category === 'vegetables' || item.category === 'fruits'
    )

    if (hasVegetables) {
      const vegSupplier = suppliers.find(s => s.name.toLowerCase().includes('vegetables'))
      if (vegSupplier) return vegSupplier.id
    }

    return suppliers[0]?.id || 'supplier-1'
  }

  private getLastPriceDate(itemId: string): string | undefined {
    const storageData = this.getStorageStoreData()
    const balance = storageData.balances.find(b => b.itemId === itemId)
    return balance?.newestBatchDate
  }

  private calculateDeliveryDate(orderDate: Date): string {
    const deliveryDate = new Date(orderDate)
    deliveryDate.setDate(deliveryDate.getDate() + 3) // 3 days lead time
    return deliveryDate.toISOString()
  }

  private simulateReceivedQuantity(orderedQuantity: number): number {
    // 90% chance of exact quantity, 10% chance of small variation
    if (Math.random() < 0.9) {
      return orderedQuantity
    } else {
      // ±5% variation
      const variation = (Math.random() - 0.5) * 0.1 * orderedQuantity
      return Math.max(0, Math.round((orderedQuantity + variation) * 1000) / 1000)
    }
  }

  private simulateActualPrice(orderedPrice: number): number {
    // 80% chance of same price, 20% chance of small change
    if (Math.random() < 0.8) {
      return orderedPrice
    } else {
      // ±10% price variation
      const variation = (Math.random() - 0.5) * 0.2 * orderedPrice
      return Math.max(0, Math.round(orderedPrice + variation))
    }
  }

  private generateReceiptItemNotes(
    receivedQty: number,
    orderedQty: number,
    actualPrice: number,
    orderedPrice: number
  ): string {
    const notes: string[] = []

    if (Math.abs(receivedQty - orderedQty) > 0.001) {
      const diff = receivedQty - orderedQty
      notes.push(diff > 0 ? `Extra ${Math.abs(diff)} received` : `Short ${Math.abs(diff)}`)
    }

    if (Math.abs(actualPrice - orderedPrice) > 0.01) {
      const diff = actualPrice - orderedPrice
      notes.push(diff > 0 ? `Price increased by ${diff}` : `Price reduced by ${Math.abs(diff)}`)
    }

    if (notes.length === 0) {
      notes.push('As ordered')
    }

    return notes.join(', ')
  }

  private generateRequestNumber(department: 'kitchen' | 'bar', timestamp: number): string {
    const prefix = department === 'kitchen' ? 'KIT' : 'BAR'
    const date = new Date(timestamp)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const count = Math.floor(Math.random() * 999) + 1
    return `REQ-${prefix}-${month}${day}-${String(count).padStart(3, '0')}`
  }

  private generateOrderNumber(count: number): string {
    const date = new Date()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `PO-${month}${day}-${String(count).padStart(3, '0')}`
  }

  private generateReceiptNumber(count: number): string {
    const date = new Date()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `RCP-${month}${day}-${String(count).padStart(3, '0')}`
  }

  // =============================================
  // УТИЛИТЫ ДЛЯ ГЕНЕРАЦИИ ПРОДУКТОВ
  // =============================================

  private demonstrateCorrectCalculations(products: Product[]): void {
    console.log('\n' + '='.repeat(60))
    console.log('🧮 ДЕМОНСТРАЦИЯ ПРАВИЛЬНОГО РАСЧЕТА СЕБЕСТОИМОСТИ')
    console.log('='.repeat(60))

    // Находим нужные продукты
    const oliveOil = products.find(p => p.id === 'prod-olive-oil')
    const garlic = products.find(p => p.id === 'prod-garlic')
    const salt = products.find(p => p.id === 'prod-salt')
    const pepper = products.find(p => p.id === 'prod-black-pepper')

    if (oliveOil && garlic && salt && pepper) {
      console.log('\n📝 РЕЦЕПТ: Заправка для салата классическая')
      console.log('Выход: 130 мл\n')

      console.log('ИНГРЕДИЕНТЫ:')

      // Оливковое масло: 120 мл
      const oilCost = 120 * (oliveOil as any).baseCostPerUnit
      console.log(
        `• Olive Oil: 120 мл × ${(oliveOil as any).baseCostPerUnit} IDR/мл = ${oilCost} IDR`
      )

      // Чеснок: 10 г
      const garlicCost = 10 * (garlic as any).baseCostPerUnit
      console.log(`• Garlic: 10 г × ${(garlic as any).baseCostPerUnit} IDR/г = ${garlicCost} IDR`)

      // Соль: 3 г
      const saltCost = 3 * (salt as any).baseCostPerUnit
      console.log(`• Salt: 3 г × ${(salt as any).baseCostPerUnit} IDR/г = ${saltCost} IDR`)

      // Перец: 1 г
      const pepperCost = 1 * (pepper as any).baseCostPerUnit
      console.log(
        `• Black Pepper: 1 г × ${(pepper as any).baseCostPerUnit} IDR/г = ${pepperCost} IDR`
      )

      const totalCost = oilCost + garlicCost + saltCost + pepperCost
      const costPerMl = totalCost / 130

      console.log(`\n📊 ИТОГО: ${totalCost} IDR`)
      console.log(`💰 Себестоимость за мл: ${costPerMl.toFixed(2)} IDR/мл`)

      console.log('\n✅ Теперь расчеты корректны!')
    }

    console.log('\n' + '='.repeat(60))
  }

  private getBaseUnitsStats(products: Product[]): Record<string, number> {
    const stats = { gram: 0, ml: 0, piece: 0 }

    products.forEach(product => {
      const baseUnit = (product as any).baseUnit
      if (baseUnit && stats.hasOwnProperty(baseUnit)) {
        stats[baseUnit]++
      }
    })

    return stats
  }

  private generateDescription(productDef: CoreProductDefinition): string {
    const baseDescriptions: Record<string, string> = {
      meat: 'Premium quality meat for restaurant preparation',
      vegetables: 'Fresh vegetables sourced from local suppliers',
      dairy: 'Fresh dairy products with proper storage requirements',
      spices: 'High-quality spices and seasonings',
      beverages: 'Ready-to-serve beverages for direct sale',
      other: 'Quality ingredient for food preparation'
    }

    const baseDesc = baseDescriptions[productDef.category] || 'Quality product for restaurant use'

    // Добавляем информацию о единицах
    const unitInfo = `Price: ${productDef.baseCostPerUnit} IDR/${productDef.baseUnit} (${productDef.purchaseCost} IDR/${productDef.purchaseUnit})`

    return `${baseDesc}. ${unitInfo}`
  }

  private getStorageConditions(category: string): string {
    const conditions: Record<string, string> = {
      meat: 'Refrigerator +2°C to +4°C',
      dairy: 'Fresh dairy products with proper storage requirements',
      vegetables: 'Cool dry place',
      beverages: 'Room temperature or refrigerated',
      spices: 'Dry place, room temperature',
      other: 'As per packaging instructions'
    }
    return conditions[category] || 'Room temperature'
  }

  private calculateMinStock(productDef: CoreProductDefinition): number {
    // Простая формула: daily consumption * lead time * safety factor
    return Math.round(productDef.dailyConsumption * productDef.leadTimeDays * 1.5 * 100) / 100
  }

  private calculateMaxStock(productDef: CoreProductDefinition): number {
    // Простая формула: min stock * 3
    return Math.round(this.calculateMinStock(productDef) * 3 * 100) / 100
  }

  private generateTags(productDef: CoreProductDefinition): string[] {
    const tags: string[] = []

    if (productDef.canBeSold) {
      tags.push('direct-sale')
    } else {
      tags.push('raw-material')
    }

    if (productDef.shelfLifeDays <= 7) {
      tags.push('perishable')
    }

    if (productDef.priceVolatility > 0.08) {
      tags.push('volatile-price')
    }

    // Добавляем тег базовой единицы
    tags.push(`base-unit-${productDef.baseUnit}`)

    tags.push(productDef.category)

    return tags
  }

  // =============================================
  // STUB МЕТОДЫ ДЛЯ БУДУЩИХ STORES
  // =============================================

  getRecipeStoreData() {
    DebugUtils.debug(MODULE_NAME, '👨‍🍳 Recipe data not implemented yet')
    return {
      recipes: [],
      preparations: []
    }
  }
}

// Singleton instance
export const mockDataCoordinator = new MockDataCoordinator()

// =============================================
// DEV HELPERS
// =============================================

if (import.meta.env.DEV) {
  // Глобальные функции для отладки
  ;(window as any).__MOCK_DATA_COORDINATOR__ = mockDataCoordinator
  ;(window as any).__VALIDATE_STORE_INTEGRATION__ = () => {
    return mockDataCoordinator.validateStoreIntegration()
  }
  ;(window as any).__TEST_SUPPLIER_INTEGRATION__ = () => {
    const productsData = mockDataCoordinator.getProductsStoreData()
    const counteragentsData = mockDataCoordinator.getCounteragentsStoreData()

    console.log('=== SUPPLIER INTEGRATION TEST ===')
    console.log('Products:', productsData.products.length)
    console.log('Counteragents:', counteragentsData.counteragents.length)

    // Тестируем поиск поставщика для продукта
    const testProduct = productsData.products[0]
    const supplier = mockDataCoordinator.getSupplierForProduct(testProduct.id)

    console.log('Test product:', testProduct.name)
    console.log('Supplier found:', supplier?.name || 'None')

    return { testProduct, supplier, productsData, counteragentsData }
  }
  ;(window as any).__TEST_STORAGE_INTEGRATION__ = () => {
    const storageData = mockDataCoordinator.getStorageStoreData()
    const supplierData = mockDataCoordinator.getSupplierStoreData()

    console.log('=== STORAGE INTEGRATION TEST ===')
    console.log('Storage balances:', storageData.balances.length)
    console.log('Supplier suggestions:', supplierData.suggestions.length)
    console.log('Supplier requests:', supplierData.requests.length)
    console.log('Supplier orders:', supplierData.orders.length)
    console.log('Supplier receipts:', supplierData.receipts.length)

    return { storageData, supplierData }
  }

  // Автоматический тест при загрузке в dev режиме
  setTimeout(() => {
    console.log('\n🎯 Unified Mock Data Coordinator загружен!')
    console.log('Доступные команды:')
    console.log('• window.__VALIDATE_STORE_INTEGRATION__() - проверка интеграции')
    console.log('• window.__TEST_SUPPLIER_INTEGRATION__() - тест поставщиков')
    console.log('• window.__TEST_STORAGE_INTEGRATION__() - тест storage + supplier интеграции')
  }, 100)
}
