/**
 * Composable for building and generating inventory count sheets
 */
import { useStorageStore } from '@/stores/storage'
import { usePreparationStore } from '@/stores/preparation'
import { useProductsStore } from '@/stores/productsStore'
import { useRecipesStore } from '@/stores/recipes'
import { useMenuStore } from '@/stores/menu'
import { useExport } from '@/core/export'
import type {
  InventorySheetOptions,
  InventorySheetData,
  InventorySheetItem,
  DepartmentFilter,
  ProductYieldReportOptions,
  ProductYieldReportData,
  ProductYieldItem,
  MenuCostReportOptions,
  MenuCostReportData,
  MenuCostCategoryGroup,
  MenuCostItemData,
  MenuCostVariantData
} from '@/core/export'
import type { StorageBalance } from '@/stores/storage/types'
import type { PreparationBalance } from '@/stores/preparation/types'
import type { MenuItem, MenuItemVariant, ModifierOption, Category } from '@/stores/menu/types'
import { calculateFoodCostRange } from '@/core/cost/modifierCostCalculator'

export function useInventorySheet() {
  const storageStore = useStorageStore()
  const preparationStore = usePreparationStore()
  const menuStore = useMenuStore()
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

  /**
   * Build product yield report data
   */
  function buildProductYieldData(options: ProductYieldReportOptions): ProductYieldReportData {
    let products = [...productsStore.products]

    // Filter by department
    if (options.department !== 'all') {
      products = products.filter(p =>
        p.usedInDepartments?.includes(options.department as 'kitchen' | 'bar')
      )
    }

    // Sort products
    products.sort((a, b) => {
      switch (options.sortBy) {
        case 'code':
          return a.id.localeCompare(b.id)
        case 'yield':
          return (b.yieldPercentage || 100) - (a.yieldPercentage || 100)
        case 'category': {
          const catA = productsStore.categories.find(c => c.id === a.category)?.name || ''
          const catB = productsStore.categories.find(c => c.id === b.category)?.name || ''
          return catA.localeCompare(catB) || a.name.localeCompare(b.name)
        }
        case 'name':
        default:
          return a.name.localeCompare(b.name)
      }
    })

    // Build items
    const items: ProductYieldItem[] = products.map((product, index) => {
      const category = productsStore.categories.find(c => c.id === product.category)

      // Determine department display
      let deptDisplay = 'Both'
      if (product.usedInDepartments?.length === 1) {
        deptDisplay = product.usedInDepartments[0] === 'kitchen' ? 'Kitchen' : 'Bar'
      }

      return {
        index: index + 1,
        name: product.name,
        code: product.id.substring(0, 8).toUpperCase(),
        category: category?.name,
        department: deptDisplay,
        yieldPercentage: product.yieldPercentage || 100,
        unit: product.baseUnit
      }
    })

    // Calculate average yield
    const totalYield = items.reduce((sum, item) => sum + item.yieldPercentage, 0)
    const averageYield = items.length > 0 ? totalYield / items.length : 100

    return {
      title: 'Product Yield List',
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      generatedAt: new Date().toISOString(),
      department: options.department,
      items,
      summary: {
        totalProducts: items.length,
        averageYield
      }
    }
  }

  /**
   * Generate and download product yield report PDF
   */
  async function generateProductYieldReport(options: ProductYieldReportOptions): Promise<void> {
    const data = buildProductYieldData(options)

    // Dynamic import of template
    const { default: ProductYieldTemplate } = await import(
      '@/core/export/templates/ProductYieldTemplate.vue'
    )

    const departmentSuffix = options.department === 'all' ? '' : `-${options.department}`
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')

    await generatePDF(ProductYieldTemplate, data, {
      filename: `product-yield${departmentSuffix}-${dateStr}.pdf`,
      pageSize: 'a4',
      orientation: 'portrait',
      showPageNumbers: true
    })
  }

  // =============================================
  // Menu Cost Report Functions
  // =============================================

  /**
   * Calculate variant base cost from composition
   */
  function calculateVariantBaseCost(variant: MenuItemVariant): number {
    let totalCost = 0

    for (const comp of variant.composition || []) {
      const quantity = comp.quantity || 0
      let unitCost = 0

      if (comp.type === 'product') {
        const product = productsStore.getProductById(comp.id)
        unitCost = product?.baseCostPerUnit || 0
      } else if (comp.type === 'recipe') {
        const recipeCost = recipesStore.getRecipeCostCalculation(comp.id)
        if (recipeCost && recipeCost.costPerPortion > 0) {
          unitCost = recipeCost.costPerPortion
        } else {
          const recipe = recipesStore.getRecipeById(comp.id)
          unitCost = recipe?.costPerPortion || 0
        }
      } else if (comp.type === 'preparation') {
        const prep = recipesStore.getPreparationById(comp.id)
        const prepCost = recipesStore.getPreparationCostCalculation(comp.id)
        unitCost = prepCost?.costPerOutputUnit || prep?.lastKnownCost || prep?.costPerPortion || 0
      }

      totalCost += quantity * unitCost
    }

    return totalCost
  }

  /**
   * Calculate modifier option cost
   */
  function calculateModifierCost(option: ModifierOption, portionMultiplier: number): number {
    let cost = 0

    if (option.composition && option.composition.length > 0) {
      for (const comp of option.composition) {
        const quantity = comp.quantity || 1
        let unitCost = 0

        if (comp.type === 'product') {
          const product = productsStore.getProductById(comp.id)
          unitCost = product?.baseCostPerUnit || 0
        } else if (comp.type === 'recipe') {
          const recipeCost = recipesStore.getRecipeCostCalculation(comp.id)
          if (recipeCost && recipeCost.costPerPortion > 0) {
            unitCost = recipeCost.costPerPortion
          } else {
            const recipe = recipesStore.getRecipeById(comp.id)
            unitCost = recipe?.costPerPortion || 0
          }
        } else if (comp.type === 'preparation') {
          const prep = recipesStore.getPreparationById(comp.id)
          const prepCost = recipesStore.getPreparationCostCalculation(comp.id)
          unitCost = prepCost?.costPerOutputUnit || prep?.lastKnownCost || prep?.costPerPortion || 0
        }

        cost += quantity * unitCost * portionMultiplier
      }
    }
    return cost
  }

  /**
   * Calculate min/max food cost for a variant considering modifiers
   * Uses the new heuristic algorithm that properly handles:
   * - Optional modifiers (not just required)
   * - Replacement modifiers (subtract replaced cost, add replacement)
   * - Price adjustments affecting FC% denominator
   */
  function calculateVariantCostRange(
    variant: MenuItemVariant,
    _baseCost: number, // Not used anymore, calculated internally
    item: MenuItem
  ): { minCost: number; maxCost: number; minPrice: number; maxPrice: number } {
    const context = {
      productsStore,
      recipesStore
    }

    const result = calculateFoodCostRange(variant, item, context)

    return {
      minCost: result.minCost,
      maxCost: result.maxCost,
      minPrice: result.minPrice,
      maxPrice: result.maxPrice
    }
  }

  /**
   * Build variant cost data
   */
  function buildVariantCostData(variant: MenuItemVariant, item: MenuItem): MenuCostVariantData {
    const baseCost = calculateVariantBaseCost(variant)
    const price = variant.price

    // For simple dishes, min = max = base cost
    // For modifiable dishes, calculate range from modifiers
    let minCost = baseCost
    let maxCost = baseCost
    let minPrice = price
    let maxPrice = price

    if (item.dishType === 'modifiable' && item.modifierGroups?.length) {
      const range = calculateVariantCostRange(variant, baseCost, item)
      minCost = range.minCost
      maxCost = range.maxCost
      minPrice = range.minPrice
      maxPrice = range.maxPrice
    }

    // Calculate FC% considering price adjustments from modifiers
    const minFoodCostPercent = maxPrice > 0 ? (minCost / maxPrice) * 100 : 0
    const maxFoodCostPercent = minPrice > 0 ? (maxCost / minPrice) * 100 : 0
    const margin = price - minCost

    return {
      name: variant.name || 'Standard',
      price,
      baseCost,
      minCost,
      maxCost,
      minFoodCostPercent,
      maxFoodCostPercent,
      margin
    }
  }

  /**
   * Build menu item cost data
   */
  function buildMenuItemCostData(item: MenuItem): MenuCostItemData {
    const activeVariants = (item.variants || []).filter(v => v.isActive)

    return {
      id: item.id,
      name: item.name,
      department: item.department,
      dishType: item.dishType,
      variants: activeVariants.map(v => buildVariantCostData(v, item))
    }
  }

  /**
   * Get category hierarchy path (for subcategories)
   */
  function getCategoryPath(category: Category): { name: string; parentName?: string } {
    if (category.parentId) {
      const parent = menuStore.categories.find(c => c.id === category.parentId)
      return {
        name: category.name,
        parentName: parent?.name
      }
    }
    return { name: category.name }
  }

  /**
   * Build menu cost report data
   */
  function buildMenuCostData(options: MenuCostReportOptions): MenuCostReportData {
    let items = [...menuStore.menuItems]

    // Filter by department
    if (options.department !== 'all') {
      items = items.filter(item => item.department === options.department)
    }

    // Filter inactive if needed
    if (!options.includeInactive) {
      items = items.filter(item => item.isActive)
    }

    // Build category groups
    const categoryGroups: MenuCostCategoryGroup[] = []

    if (options.groupByCategory !== false) {
      // Group by category/subcategory
      const categoryMap = new Map<string, MenuCostItemData[]>()

      for (const item of items) {
        const categoryId = item.categoryId || 'uncategorized'
        if (!categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, [])
        }
        categoryMap.get(categoryId)!.push(buildMenuItemCostData(item))
      }

      // Build category groups with proper hierarchy
      for (const [categoryId, categoryItems] of categoryMap) {
        const category = menuStore.categories.find(c => c.id === categoryId)

        if (category) {
          const path = getCategoryPath(category)
          categoryGroups.push({
            id: categoryId,
            name: path.parentName ? `${path.parentName} → ${path.name}` : path.name,
            isSubcategory: !!category.parentId,
            parentName: path.parentName,
            items: categoryItems
          })
        } else {
          categoryGroups.push({
            id: categoryId,
            name: 'Uncategorized',
            isSubcategory: false,
            items: categoryItems
          })
        }
      }

      // Sort category groups
      categoryGroups.sort((a, b) => a.name.localeCompare(b.name))
    } else {
      // Single group with all items
      categoryGroups.push({
        id: 'all',
        name: 'All Items',
        isSubcategory: false,
        items: items.map(buildMenuItemCostData)
      })
    }

    // Sort items within categories based on sortBy option
    for (const group of categoryGroups) {
      group.items.sort((a, b) => {
        switch (options.sortBy) {
          case 'foodCost': {
            const aFC = a.variants[0]?.minFoodCostPercent || 0
            const bFC = b.variants[0]?.minFoodCostPercent || 0
            return bFC - aFC // High to low
          }
          case 'price': {
            const aPrice = a.variants[0]?.price || 0
            const bPrice = b.variants[0]?.price || 0
            return bPrice - aPrice // High to low
          }
          case 'name':
          default:
            return a.name.localeCompare(b.name)
        }
      })
    }

    // Calculate summary stats
    let totalItems = 0
    let totalVariants = 0
    const allFoodCosts: number[] = []

    for (const group of categoryGroups) {
      totalItems += group.items.length
      for (const item of group.items) {
        totalVariants += item.variants.length
        for (const variant of item.variants) {
          if (variant.minFoodCostPercent > 0) {
            allFoodCosts.push(variant.minFoodCostPercent)
          }
          if (variant.maxFoodCostPercent > variant.minFoodCostPercent) {
            allFoodCosts.push(variant.maxFoodCostPercent)
          }
        }
      }
    }

    const averageFoodCost =
      allFoodCosts.length > 0 ? allFoodCosts.reduce((a, b) => a + b, 0) / allFoodCosts.length : 0
    const minFoodCost = allFoodCosts.length > 0 ? Math.min(...allFoodCosts) : 0
    const maxFoodCost = allFoodCosts.length > 0 ? Math.max(...allFoodCosts) : 0

    return {
      title: 'Menu Cost Summary',
      date: formatDate(new Date().toISOString().split('T')[0]),
      generatedAt: new Date().toISOString(),
      department: options.department,
      categories: categoryGroups,
      summary: {
        totalItems,
        totalVariants,
        averageFoodCost,
        minFoodCost,
        maxFoodCost,
        totalCategories: categoryGroups.length
      }
    }
  }

  /**
   * Generate and download menu cost report PDF
   */
  async function generateMenuCostReport(options: MenuCostReportOptions): Promise<void> {
    const data = buildMenuCostData(options)

    // Dynamic import of template
    const { default: MenuCostTemplate } = await import(
      '@/core/export/templates/MenuCostTemplate.vue'
    )

    const departmentSuffix = options.department === 'all' ? '' : `-${options.department}`
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '')

    await generatePDF(MenuCostTemplate, data, {
      filename: `menu-cost${departmentSuffix}-${dateStr}.pdf`,
      pageSize: 'a4',
      orientation: 'portrait',
      showPageNumbers: true
    })
  }

  return {
    buildProductsSheetData,
    buildPreparationsSheetData,
    generateProductsSheet,
    generatePreparationsSheet,
    buildProductYieldData,
    generateProductYieldReport,
    buildMenuCostData,
    generateMenuCostReport
  }
}
