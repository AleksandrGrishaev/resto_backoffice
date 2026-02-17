// src/stores/supplier_2/__tests__/supplierIntegration.test.ts
// ✅ NEW: Integration tests for Supplier Store with Storage and Products stores

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSupplierStore } from '../supplierStore'
import { useStorageStore } from '@/stores/storage'
import { useProductsStore } from '@/stores/productsStore'

// Mock the dependencies
vi.mock('@/stores/storage')
vi.mock('@/stores/productsStore')
vi.mock('@/utils', () => ({
  DebugUtils: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}))

describe('Supplier Store Integration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Order Suggestions Generation', () => {
    it('should generate suggestions from storage balances', async () => {
      const supplierStore = useSupplierStore()
      const storageStore = useStorageStore()
      const productsStore = useProductsStore()

      // Mock storage balances with low stock
      vi.mocked(storageStore.state).balances = [
        {
          itemId: 'prod-tomato',
          itemName: 'Fresh Tomato',
          department: 'kitchen',
          totalQuantity: 0, // Out of stock
          latestCost: 12000,
          belowMinStock: true,
          newestBatchDate: '2025-08-01T00:00:00Z'
        },
        {
          itemId: 'prod-beef',
          itemName: 'Beef Steak',
          department: 'kitchen',
          totalQuantity: 2,
          latestCost: 180000,
          belowMinStock: true,
          newestBatchDate: '2025-08-02T00:00:00Z'
        }
      ]

      // Mock products data
      vi.mocked(productsStore.products) = [
        {
          id: 'prod-tomato',
          name: 'Fresh Tomato',
          isActive: true,
          minStock: 5,
          unit: 'kg',
          costPerUnit: 12000,
          category: 'vegetables'
        },
        {
          id: 'prod-beef',
          name: 'Beef Steak',
          isActive: true,
          minStock: 10,
          unit: 'kg',
          costPerUnit: 180000,
          category: 'meat'
        }
      ]

      // Mock store methods
      vi.mocked(storageStore.departmentBalances).mockReturnValue(storageStore.state.balances)
      vi.mocked(storageStore.fetchBalances).mockResolvedValue(undefined)
      vi.mocked(productsStore.loadProducts).mockResolvedValue(undefined)

      await supplierStore.initialize()
      await supplierStore.refreshSuggestions('kitchen')

      const suggestions = supplierStore.state.orderSuggestions

      expect(suggestions).toHaveLength(2)
      expect(suggestions[0].itemId).toBe('prod-tomato')
      expect(suggestions[0].urgency).toBe('high') // Out of stock
      expect(suggestions[0].reason).toBe('out_of_stock')
      expect(suggestions[0].estimatedPrice).toBe(12000)

      expect(suggestions[1].itemId).toBe('prod-beef')
      expect(suggestions[1].urgency).toBe('high') // Very low stock
      expect(suggestions[1].reason).toBe('below_minimum')
    })

    it('should filter suggestions by department correctly', async () => {
      const supplierStore = useSupplierStore()
      const storageStore = useStorageStore()
      const productsStore = useProductsStore()

      // Mock mixed department data
      vi.mocked(storageStore.state).balances = [
        {
          itemId: 'prod-beer',
          itemName: 'Beer',
          department: 'bar',
          totalQuantity: 0,
          latestCost: 15000,
          belowMinStock: true
        },
        {
          itemId: 'prod-tomato',
          itemName: 'Tomato',
          department: 'kitchen',
          totalQuantity: 0,
          latestCost: 12000,
          belowMinStock: true
        }
      ]

      vi.mocked(productsStore.products) = [
        {
          id: 'prod-beer',
          name: 'Beer',
          isActive: true,
          minStock: 24,
          category: 'beverages'
        },
        {
          id: 'prod-tomato',
          name: 'Tomato',
          isActive: true,
          minStock: 5,
          category: 'vegetables'
        }
      ]

      vi.mocked(storageStore.departmentBalances).mockImplementation(dept =>
        storageStore.state.balances.filter(b => b.department === dept)
      )

      await supplierStore.refreshSuggestions('kitchen')
      const kitchenSuggestions = supplierStore.state.orderSuggestions

      expect(kitchenSuggestions).toHaveLength(1)
      expect(kitchenSuggestions[0].itemId).toBe('prod-tomato')

      await supplierStore.refreshSuggestions('bar')
      const barSuggestions = supplierStore.state.orderSuggestions

      expect(barSuggestions).toHaveLength(1)
      expect(barSuggestions[0].itemId).toBe('prod-beer')
    })
  })

  describe('Receipt Storage Integration', () => {
    it('should create storage operation when completing receipt', async () => {
      const supplierStore = useSupplierStore()
      const storageStore = useStorageStore()

      // Setup mock data
      supplierStore.state.receipts = [
        {
          id: 'receipt-1',
          receiptNumber: 'RCP-001',
          purchaseOrderId: 'order-1',
          receivedBy: 'Test User',
          status: 'draft',
          items: [
            {
              id: 'item-1',
              orderItemId: 'order-item-1',
              itemId: 'prod-tomato',
              itemName: 'Tomato',
              orderedQuantity: 5,
              receivedQuantity: 5,
              orderedPrice: 12000,
              actualPrice: 12500 // Price increase
            }
          ],
          hasDiscrepancies: true,
          createdAt: '2025-08-01T00:00:00Z',
          updatedAt: '2025-08-01T00:00:00Z'
        }
      ]

      supplierStore.state.orders = [
        {
          id: 'order-1',
          orderNumber: 'PO-001',
          supplierId: 'supplier-1',
          supplierName: 'Test Supplier',
          orderDate: '2025-08-01T00:00:00Z',
          items: [
            {
              id: 'order-item-1',
              itemId: 'prod-tomato',
              itemName: 'Tomato',
              orderedQuantity: 5,
              unit: 'kg',
              pricePerUnit: 12000,
              totalPrice: 60000,
              status: 'ordered'
            }
          ],
          totalAmount: 60000,
          status: 'sent',
          paymentStatus: 'paid',
          requestIds: ['req-1'],
          createdAt: '2025-08-01T00:00:00Z',
          updatedAt: '2025-08-01T00:00:00Z'
        }
      ]

      // Mock storage store methods
      const mockStorageOperation = {
        id: 'op-12345',
        operationType: 'receipt' as const,
        totalValue: 62500
      }
      vi.mocked(storageStore.createReceipt).mockResolvedValue({
        operation: mockStorageOperation,
        reconciliations: []
      })

      // Complete the receipt
      const completedReceipt = await supplierStore.completeReceipt('receipt-1', {
        status: 'completed',
        notes: 'Receipt completed'
      })

      // Verify storage operation was created
      expect(storageStore.createReceipt).toHaveBeenCalledWith({
        department: 'kitchen', // Tomato should go to kitchen
        responsiblePerson: 'Test User',
        items: [
          {
            itemId: 'prod-tomato',
            quantity: 5,
            costPerUnit: 12500, // Updated price
            notes: 'Receipt: RCP-001',
            expiryDate: expect.any(String)
          }
        ],
        sourceType: 'purchase',
        notes: expect.stringContaining('Receipt RCP-001')
      })

      // Verify receipt was updated with operation ID
      expect(completedReceipt.storageOperationId).toBe('op-12345')
      expect(completedReceipt.status).toBe('completed')
    })

    it('should handle storage operation failure gracefully', async () => {
      const supplierStore = useSupplierStore()
      const storageStore = useStorageStore()

      // Setup receipt data
      supplierStore.state.receipts = [
        {
          id: 'receipt-1',
          receiptNumber: 'RCP-001',
          purchaseOrderId: 'order-1',
          receivedBy: 'Test User',
          status: 'draft',
          items: [],
          hasDiscrepancies: false,
          createdAt: '2025-08-01T00:00:00Z',
          updatedAt: '2025-08-01T00:00:00Z'
        }
      ]

      supplierStore.state.orders = [
        {
          id: 'order-1',
          orderNumber: 'PO-001',
          supplierId: 'supplier-1',
          supplierName: 'Test Supplier',
          orderDate: '2025-08-01T00:00:00Z',
          items: [],
          totalAmount: 0,
          status: 'sent',
          paymentStatus: 'paid',
          requestIds: [],
          createdAt: '2025-08-01T00:00:00Z',
          updatedAt: '2025-08-01T00:00:00Z'
        }
      ]

      // Mock storage failure
      vi.mocked(storageStore.createReceipt).mockRejectedValue(new Error('Storage operation failed'))

      // Should not throw error even if storage fails
      const completedReceipt = await supplierStore.completeReceipt('receipt-1', {
        status: 'completed'
      })

      expect(completedReceipt.status).toBe('completed')
      expect(completedReceipt.storageOperationId).toBeUndefined()
    })
  })

  describe('Price Integration', () => {
    it('should enhance request with latest prices from storage', async () => {
      const supplierStore = useSupplierStore()
      const storageStore = useStorageStore()

      // Mock getBalance to return updated prices
      vi.mocked(storageStore.getBalance).mockImplementation(itemId => {
        if (itemId === 'prod-tomato') {
          return {
            itemId: 'prod-tomato',
            latestCost: 15000, // Price increased
            averageCost: 14000
          }
        }
        return null
      })

      const originalRequestData = {
        department: 'kitchen' as const,
        requestedBy: 'Test User',
        items: [
          {
            itemId: 'prod-tomato',
            itemName: 'Tomato',
            category: 'vegetables',
            requestedQuantity: 5,
            unit: 'kg',
            estimatedPrice: 12000, // Old price
            priority: 'normal' as const,
            notes: 'Test item'
          }
        ],
        notes: 'Test request'
      }

      // Enhance with latest prices
      const enhancedData = await supplierStore.enhanceRequestWithLatestPrices(originalRequestData)

      expect(enhancedData.items[0].estimatedPrice).toBe(15000) // Updated price
      expect(enhancedData.items[0].notes).toContain('Price updated from 12000 to 15000')
    })
  })

  describe('Integration Status', () => {
    it('should report integration health correctly', async () => {
      const supplierStore = useSupplierStore()
      const storageStore = useStorageStore()
      const productsStore = useProductsStore()

      // Mock successful initialization
      vi.mocked(storageStore.state).balances = [
        /* some balances */
      ]
      vi.mocked(productsStore.products) = [
        /* some products */
      ]
      vi.mocked(storageStore.initialize).mockResolvedValue(undefined)
      vi.mocked(productsStore.loadProducts).mockResolvedValue(undefined)

      await supplierStore.initialize()

      const status = supplierStore.getIntegrationStatus()

      expect(status.isInitialized).toBe(true)
      expect(status.useMockData).toBe(false)
      expect(status.hasErrors).toBe(false)
      expect(status.storageConnected).toBe(true)
      expect(status.productsConnected).toBe(true)
    })

    it('should handle initialization failure correctly', async () => {
      const supplierStore = useSupplierStore()
      const storageStore = useStorageStore()

      // Mock initialization failure
      vi.mocked(storageStore.initialize).mockRejectedValue(new Error('Storage init failed'))

      await supplierStore.initialize()

      const status = supplierStore.getIntegrationStatus()

      expect(status.useMockData).toBe(true)
      expect(status.hasErrors).toBe(true)
      expect(status.errors).toContain(expect.stringContaining('Storage init failed'))
    })
  })

  describe('Statistics', () => {
    it('should calculate enhanced statistics with integration data', () => {
      const supplierStore = useSupplierStore()

      // Setup test data
      const now = new Date()
      const thisMonthDate = new Date(now.getFullYear(), now.getMonth(), 15).toISOString()

      supplierStore.state.orders = [
        {
          id: 'order-1',
          orderNumber: 'PO-001',
          supplierId: 'supplier-1',
          supplierName: 'Test Supplier',
          orderDate: thisMonthDate,
          items: [],
          totalAmount: 100000,
          status: 'sent',
          paymentStatus: 'paid',
          requestIds: [],
          createdAt: thisMonthDate,
          updatedAt: thisMonthDate
        }
      ]

      supplierStore.state.receipts = [
        {
          id: 'receipt-1',
          receiptNumber: 'RCP-001',
          purchaseOrderId: 'order-1',
          receivedBy: 'Test User',
          status: 'completed',
          items: [],
          hasDiscrepancies: false,
          createdAt: thisMonthDate,
          updatedAt: thisMonthDate
        }
      ]

      supplierStore.integrationState.lastSuggestionsUpdate = now.toISOString()

      const stats = supplierStore.statistics

      expect(stats.currentMonthOrderValue).toBe(100000)
      expect(stats.currentMonthReceiptCount).toBe(1)
      expect(stats.integrationHealth).toBe('healthy')
      expect(stats.lastDataUpdate).toBe(now.toISOString())
      expect(stats.dataSource).toBe('integrated')
    })
  })
})
