// src/stores/recipes/recipesService.ts - Clean version with composables

// Re-export all services from composables
export { usePreparations } from './composables/usePreparations'
export { useRecipes } from './composables/useRecipes'
export { useCostCalculation } from './composables/useCostCalculation'
export { useRecipeIntegration } from './composables/useRecipeIntegration'
export { useMenuRecipeLinks } from './composables/useMenuRecipeLinks'
export { useUnits } from './composables/useUnits'

// Legacy class-based services for backward compatibility
import { ref } from 'vue'
import type {
  Preparation,
  Recipe,
  MenuRecipeLink,
  Unit,
  CreatePreparationData,
  CreateRecipeData
} from './types'

// =============================================
// LEGACY: PreparationService (simplified)
// =============================================
export class PreparationService {
  private preparations = ref<Preparation[]>([])

  constructor(initialData: Preparation[] = []) {
    this.preparations.value = initialData
  }

  async getAll(): Promise<Preparation[]> {
    return [...this.preparations.value]
  }

  async getById(id: string): Promise<Preparation | null> {
    return this.preparations.value.find(item => item.id === id) || null
  }

  async create(data: CreatePreparationData): Promise<Preparation> {
    // Use composable for actual implementation
    const { createPreparation } = await import('./composables/usePreparations')
    return createPreparation(data)
  }

  // Other methods delegate to composables...
  async update(id: string, data: Partial<Preparation>): Promise<Preparation> {
    const { updatePreparation } = await import('./composables/usePreparations')
    return updatePreparation(id, data)
  }

  async delete(id: string): Promise<void> {
    const { deletePreparation } = await import('./composables/usePreparations')
    return deletePreparation(id)
  }

  async getActivePreparations(): Promise<Preparation[]> {
    return this.preparations.value.filter(p => p.isActive)
  }

  // Cost calculation methods delegate to cost composable
  async calculateAndStoreCost(id: string) {
    const { calculatePreparationCost } = await import('./composables/useCostCalculation')
    return calculatePreparationCost(id)
  }

  async getCostCalculation(id: string) {
    const { getPreparationCost } = await import('./composables/useCostCalculation')
    return getPreparationCost(id)
  }

  async getAllCostCalculations() {
    const { getAllPreparationCosts } = await import('./composables/useCostCalculation')
    return getAllPreparationCosts()
  }

  getPreparationsForRecipes() {
    return this.preparations.value
      .filter(prep => prep.isActive)
      .map(prep => ({
        id: prep.id,
        name: prep.name,
        code: prep.code,
        type: prep.type,
        outputQuantity: prep.outputQuantity,
        outputUnit: prep.outputUnit,
        costPerOutputUnit: prep.costPerPortion || 0,
        isActive: prep.isActive
      }))
  }

  // Integration methods delegate to integration composable
  setProductProvider(callback: any) {
    // Delegate to integration composable
  }

  async recalculateOnPriceChange(productId: string): Promise<string[]> {
    const { recalculateOnPriceChange } = await import('./composables/useRecipeIntegration')
    return recalculateOnPriceChange(productId, 'preparation')
  }

  async recalculateAllCosts(): Promise<void> {
    const { recalculateAllCosts } = await import('./composables/useCostCalculation')
    return recalculateAllCosts('preparation')
  }

  getProductUsageInPreparations(productId: string) {
    const usage: any[] = []

    for (const preparation of this.preparations.value) {
      for (const ingredient of preparation.recipe) {
        if (ingredient.id === productId) {
          usage.push({
            preparationId: preparation.id,
            preparationName: preparation.name,
            preparationCode: preparation.code,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            notes: ingredient.notes,
            isActive: preparation.isActive
          })
        }
      }
    }

    return usage
  }
}

// =============================================
// LEGACY: RecipeService (simplified)
// =============================================
export class RecipeService {
  private recipes = ref<Recipe[]>([])

  constructor(initialData: Recipe[] = []) {
    this.recipes.value = initialData
  }

  async getAll(): Promise<Recipe[]> {
    return [...this.recipes.value]
  }

  async getById(id: string): Promise<Recipe | null> {
    return this.recipes.value.find(item => item.id === id) || null
  }

  async create(data: CreateRecipeData): Promise<Recipe> {
    const { createRecipe } = await import('./composables/useRecipes')
    return createRecipe(data)
  }

  async update(id: string, data: Partial<Recipe>): Promise<Recipe> {
    const { updateRecipe } = await import('./composables/useRecipes')
    return updateRecipe(id, data)
  }

  async delete(id: string): Promise<void> {
    const { deleteRecipe } = await import('./composables/useRecipes')
    return deleteRecipe(id)
  }

  async getActiveRecipes(): Promise<Recipe[]> {
    return this.recipes.value.filter(r => r.isActive)
  }

  async getByCategory(category: string): Promise<Recipe[]> {
    return this.recipes.value.filter(item => item.category === category && item.isActive)
  }

  async toggleStatus(id: string): Promise<Recipe> {
    const recipe = await this.getById(id)
    if (!recipe) throw new Error('Recipe not found')
    return this.update(id, { isActive: !recipe.isActive })
  }

  async duplicateRecipe(recipeId: string, newName: string): Promise<Recipe> {
    const { duplicateRecipe } = await import('./composables/useRecipes')
    return duplicateRecipe(recipeId, newName)
  }

  // Integration methods
  setIntegrationCallbacks(getProduct: any, getPreparationCost: any) {
    // Delegate to integration composable
  }

  async calculateAndStoreCost(id: string) {
    const { calculateRecipeCost } = await import('./composables/useCostCalculation')
    return calculateRecipeCost(id)
  }

  async getCostCalculation(id: string) {
    const { getRecipeCost } = await import('./composables/useCostCalculation')
    return getRecipeCost(id)
  }

  async getAllCostCalculations() {
    const { getAllRecipeCosts } = await import('./composables/useCostCalculation')
    return getAllRecipeCosts()
  }

  async recalculateOnItemChange(
    itemId: string,
    itemType: 'product' | 'preparation'
  ): Promise<string[]> {
    const { recalculateOnPriceChange } = await import('./composables/useRecipeIntegration')
    return recalculateOnPriceChange(itemId, itemType)
  }

  async recalculateAllCosts(): Promise<void> {
    const { recalculateAllCosts } = await import('./composables/useCostCalculation')
    return recalculateAllCosts('recipe')
  }

  getProductUsageInRecipes(productId: string) {
    const usage: any[] = []

    for (const recipe of this.recipes.value) {
      for (const component of recipe.components) {
        if (component.componentId === productId && component.componentType === 'product') {
          usage.push({
            recipeId: recipe.id,
            recipeName: recipe.name,
            recipeCode: recipe.code,
            quantity: component.quantity,
            unit: component.unit,
            notes: component.notes,
            isActive: recipe.isActive
          })
        }
      }
    }

    return usage
  }

  getPreparationUsageInRecipes(preparationId: string) {
    const usage: any[] = []

    for (const recipe of this.recipes.value) {
      for (const component of recipe.components) {
        if (component.componentId === preparationId && component.componentType === 'preparation') {
          usage.push({
            recipeId: recipe.id,
            recipeName: recipe.name,
            recipeCode: recipe.code,
            quantity: component.quantity,
            unit: component.unit,
            notes: component.notes,
            isActive: recipe.isActive
          })
        }
      }
    }

    return usage
  }
}

// =============================================
// LEGACY: MenuRecipeLinkService (simplified)
// =============================================
export class MenuRecipeLinkService {
  private links = ref<MenuRecipeLink[]>([])

  constructor(initialData: MenuRecipeLink[] = []) {
    this.links.value = initialData
  }

  async getAll(): Promise<MenuRecipeLink[]> {
    return [...this.links.value]
  }

  async getById(id: string): Promise<MenuRecipeLink | null> {
    return this.links.value.find(item => item.id === id) || null
  }

  async create(
    menuItemId: string,
    recipeId: string,
    variantId?: string,
    portionMultiplier: number = 1
  ): Promise<MenuRecipeLink> {
    const { createMenuRecipeLink } = await import('./composables/useMenuRecipeLinks')
    return createMenuRecipeLink(menuItemId, recipeId, variantId, portionMultiplier)
  }

  async update(id: string, data: Partial<MenuRecipeLink>): Promise<MenuRecipeLink> {
    const { updateMenuRecipeLink } = await import('./composables/useMenuRecipeLinks')
    return updateMenuRecipeLink(id, data)
  }

  async delete(id: string): Promise<void> {
    const { deleteMenuRecipeLink } = await import('./composables/useMenuRecipeLinks')
    return deleteMenuRecipeLink(id)
  }

  async getByMenuItem(menuItemId: string, variantId?: string): Promise<MenuRecipeLink[]> {
    return this.links.value.filter(link => {
      const matchesMenuItem = link.menuItemId === menuItemId
      const matchesVariant = variantId ? link.variantId === variantId : !link.variantId
      return matchesMenuItem && matchesVariant
    })
  }

  async getByRecipe(recipeId: string): Promise<MenuRecipeLink[]> {
    return this.links.value.filter(link => link.recipeId === recipeId)
  }
}

// =============================================
// LEGACY: UnitService (simplified)
// =============================================
export class UnitService {
  private units = ref<Unit[]>([])

  constructor(initialData: Unit[] = []) {
    this.units.value = initialData
  }

  async getAll(): Promise<Unit[]> {
    return [...this.units.value]
  }

  async getById(id: string): Promise<Unit | null> {
    return this.units.value.find(item => item.id === id) || null
  }

  async getByType(type: 'weight' | 'volume' | 'piece'): Promise<Unit[]> {
    return this.units.value.filter(unit => unit.type === type)
  }

  async convert(value: number, fromUnit: string, toUnit: string): Promise<number> {
    const { convertUnits } = await import('./composables/useUnits')
    return convertUnits(value, fromUnit, toUnit)
  }
}
