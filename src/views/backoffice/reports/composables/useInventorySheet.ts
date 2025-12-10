/**
 * Composable for building and generating inventory count sheets
 */
import { useStorageStore } from '@/stores/storage'
import { usePreparationStore } from '@/stores/preparation'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { useExport } from '@/core/export'
import type {
  InventorySheetOptions,
  InventorySheetData,
  InventorySheetItem,
  DepartmentFilter
} from '@/core/export'
import type { StorageBalance } from '@/stores/storage/types'
import type { PreparationBalance } from '@/stores/preparation/types'

export function useInventorySheet() {
  const storageStore = useStorageStore()
  const preparationStore = usePreparationStore()
  const productsStore = useProductsStore()
  const recipesStore = useRecipesStore()
  const { generatePDF } = useExport()

  /**
   * Get department display name
   */
  function getDepartmentName(department: DepartmentFilter): string {
    switch (department) {
      case 'kitchen':
        return 'Kitchen'
      case 'bar':
        return 'Bar'
      default:
        return 'All Departments'
    }
  }

  /**
   * Format current date for display
   */
  function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  /**
   * Build inventory sheet data for products
   */
  function buildProductsSheetData(options: InventorySheetOptions): InventorySheetData {
    // Get all product balances from storage store
    let balances: StorageBalance[] = [...(storageStore.state?.balances || [])]

    // Filter by department
    if (options.department !== 'all') {
      balances = balances.filter(balance => {
        const product = productsStore.products.find(p => p.id === balance.itemId)
        return product?.usedInDepartments?.includes(options.department as 'kitchen' | 'bar')
      })
    }

    // Filter zero stock if needed
    if (!options.includeZeroStock) {
      balances = balances.filter(b => b.totalQuantity > 0)
    }

    // Sort balances
    balances.sort((a, b) => {
      switch (options.sortBy) {
        case 'code': {
          // Sort by product ID (as proxy for code)
          return a.itemId.localeCompare(b.itemId)
        }
        case 'category': {
          const productA = productsStore.products.find(p => p.id === a.itemId)
          const productB = productsStore.products.find(p => p.id === b.itemId)
          const catA = productA?.category || ''
          const catB = productB?.category || ''
          return catA.localeCompare(catB) || a.itemName.localeCompare(b.itemName)
        }
        case 'name':
        default:
          return a.itemName.localeCompare(b.itemName)
      }
    })

    // Build items with categories
    const items: InventorySheetItem[] = balances.map((balance, index) => {
      const product = productsStore.products.find(p => p.id === balance.itemId)
      const categoryId = product?.category
      const category = productsStore.categories.find(c => c.id === categoryId)

      return {
        index: index + 1,
        name: balance.itemName,
        code: balance.itemId.substring(0, 8).toUpperCase(), // First 8 chars of UUID as code
        category: category?.name,
        unit: balance.unit,
        currentStock: Math.round(balance.totalQuantity * 100) / 100, // Round to 2 decimals
        actualCount: null,
        difference: null
      }
    })

    // Count unique categories
    const uniqueCategories = new Set(items.map(i => i.category).filter(Boolean))

    return {
      title: 'Inventory Count Sheet - Products',
      subtitle: getDepartmentName(options.department),
      date: formatDate(options.countDate),
      generatedAt: new Date().toISOString(),
      department: options.department,
      items,
      summary: {
        totalItems: items.length,
        totalCategories: uniqueCategories.size
      },
      showSignatureLine: options.showSignatureLine
    }
  }

  /**
   * Build inventory sheet data for preparations
   */
  function buildPreparationsSheetData(options: InventorySheetOptions): InventorySheetData {
    // Get preparation balances
    let balances: PreparationBalance[] = [...(preparationStore.state?.balances || [])]

    // Filter by department
    if (options.department !== 'all') {
      balances = balances.filter(b => b.department === options.department)
    }

    // Filter zero stock if needed
    if (!options.includeZeroStock) {
      balances = balances.filter(b => b.totalQuantity > 0)
    }

    // Sort balances
    balances.sort((a, b) => {
      switch (options.sortBy) {
        case 'code': {
          // Get preparation codes
          const prepA = recipesStore.preparations.find(p => p.id === a.preparationId)
          const prepB = recipesStore.preparations.find(p => p.id === b.preparationId)
          return (prepA?.code || '').localeCompare(prepB?.code || '')
        }
        case 'name':
        default:
          return a.preparationName.localeCompare(b.preparationName)
      }
    })

    // Build items
    const items: InventorySheetItem[] = balances.map((balance, index) => {
      const preparation = recipesStore.preparations.find(p => p.id === balance.preparationId)

      return {
        index: index + 1,
        name: balance.preparationName,
        code: preparation?.code || balance.preparationId.substring(0, 8).toUpperCase(),
        category: undefined, // Preparations don't have categories in this context
        unit: balance.unit,
        currentStock: Math.round(balance.totalQuantity * 100) / 100,
        actualCount: null,
        difference: null
      }
    })

    return {
      title: 'Inventory Count Sheet - Preparations',
      subtitle: getDepartmentName(options.department),
      date: formatDate(options.countDate),
      generatedAt: new Date().toISOString(),
      department: options.department,
      items,
      summary: {
        totalItems: items.length,
        totalCategories: 0 // No categories for preparations
      },
      showSignatureLine: options.showSignatureLine
    }
  }

  /**
   * Generate and download products inventory sheet PDF
   */
  async function generateProductsSheet(options: InventorySheetOptions): Promise<void> {
    const data = buildProductsSheetData(options)

    // Dynamic import of template
    const { default: InventorySheetTemplate } = await import(
      '@/core/export/templates/InventorySheetTemplate.vue'
    )

    const departmentSuffix = options.department === 'all' ? '' : `-${options.department}`
    const dateStr = options.countDate.replace(/-/g, '')

    await generatePDF(InventorySheetTemplate, data, {
      filename: `inventory-products${departmentSuffix}-${dateStr}.pdf`,
      pageSize: 'a4',
      orientation: 'portrait',
      showPageNumbers: true
    })
  }

  /**
   * Generate and download preparations inventory sheet PDF
   */
  async function generatePreparationsSheet(options: InventorySheetOptions): Promise<void> {
    const data = buildPreparationsSheetData(options)

    // Dynamic import of template
    const { default: InventorySheetTemplate } = await import(
      '@/core/export/templates/InventorySheetTemplate.vue'
    )

    const departmentSuffix = options.department === 'all' ? '' : `-${options.department}`
    const dateStr = options.countDate.replace(/-/g, '')

    await generatePDF(InventorySheetTemplate, data, {
      filename: `inventory-preparations${departmentSuffix}-${dateStr}.pdf`,
      pageSize: 'a4',
      orientation: 'portrait',
      showPageNumbers: true
    })
  }

  return {
    buildProductsSheetData,
    buildPreparationsSheetData,
    generateProductsSheet,
    generatePreparationsSheet
  }
}
