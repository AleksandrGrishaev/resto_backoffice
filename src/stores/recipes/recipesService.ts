// src/stores/recipes/recipesService.ts
import { generateId } from '@/utils'
import type {
  Recipe,
  Preparation,
  MenuRecipeLink,
  CostCalculation,
  CreateRecipeData,
  CreatePreparationData,
  Unit
} from './types'

// =============================================
// PREPARATIONS SERVICE
// =============================================

export class PreparationService {
  private preparations: Preparation[] = []

  constructor(initialData: Preparation[] = []) {
    this.preparations = initialData
  }

  async getAll(): Promise<Preparation[]> {
    return [...this.preparations]
  }

  async getById(id: string): Promise<Preparation | null> {
    return this.preparations.find(item => item.id === id) || null
  }

  async getByType(type: string): Promise<Preparation[]> {
    return this.preparations.filter(item => item.type === type && item.isActive)
  }

  async getActivePreparations(): Promise<Preparation[]> {
    return this.preparations.filter(item => item.isActive)
  }

  async getByCode(code: string): Promise<Preparation | null> {
    return this.preparations.find(item => item.code === code) || null
  }

  async checkCodeExists(code: string, excludeId?: string): Promise<boolean> {
    const existing = await this.getByCode(code)
    return existing !== null && existing.id !== excludeId
  }

  async create(data: CreatePreparationData): Promise<Preparation> {
    // Check code uniqueness
    const codeExists = await this.checkCodeExists(data.code)
    if (codeExists) {
      throw new Error(`Preparation with code ${data.code} already exists`)
    }

    const preparation: Preparation = {
      ...data,
      id: generateId(),
      isActive: true,
      costPerPortion: 0, // будет рассчитано позже
      recipe: data.recipe || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.preparations.push(preparation)
    return preparation
  }

  async update(id: string, data: Partial<Preparation>): Promise<Preparation> {
    const index = this.preparations.findIndex(item => item.id === id)
    if (index === -1) {
      throw new Error('Preparation not found')
    }

    // Check code uniqueness if code is being updated
    if (data.code && data.code !== this.preparations[index].code) {
      const codeExists = await this.checkCodeExists(data.code, id)
      if (codeExists) {
        throw new Error(`Preparation with code ${data.code} already exists`)
      }
    }

    this.preparations[index] = {
      ...this.preparations[index],
      ...data,
      updatedAt: new Date().toISOString()
    }

    return this.preparations[index]
  }

  async delete(id: string): Promise<void> {
    const index = this.preparations.findIndex(item => item.id === id)
    if (index === -1) {
      throw new Error('Preparation not found')
    }
    this.preparations.splice(index, 1)
  }

  async toggleStatus(id: string): Promise<Preparation> {
    const preparation = await this.getById(id)
    if (!preparation) {
      throw new Error('Preparation not found')
    }

    return this.update(id, { isActive: !preparation.isActive })
  }
}

// =============================================
// RECIPES SERVICE
// =============================================

export class RecipeService {
  private recipes: Recipe[] = []

  constructor(initialData: Recipe[] = []) {
    this.recipes = initialData
  }

  async getAll(): Promise<Recipe[]> {
    return [...this.recipes]
  }

  async getById(id: string): Promise<Recipe | null> {
    return this.recipes.find(item => item.id === id) || null
  }

  async create(data: CreateRecipeData): Promise<Recipe> {
    const recipe: Recipe = {
      ...data,
      id: generateId(),
      components: [],
      instructions: [],
      isActive: true,
      cost: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.recipes.push(recipe)
    return recipe
  }

  async update(id: string, data: Partial<Recipe>): Promise<Recipe> {
    const index = this.recipes.findIndex(item => item.id === id)
    if (index === -1) {
      throw new Error('Recipe not found')
    }

    this.recipes[index] = {
      ...this.recipes[index],
      ...data,
      updatedAt: new Date().toISOString()
    }

    return this.recipes[index]
  }

  async delete(id: string): Promise<void> {
    const index = this.recipes.findIndex(item => item.id === id)
    if (index === -1) {
      throw new Error('Recipe not found')
    }
    this.recipes.splice(index, 1)
  }

  async getByCategory(category: string): Promise<Recipe[]> {
    return this.recipes.filter(item => item.category === category && item.isActive)
  }

  async getActiveRecipes(): Promise<Recipe[]> {
    return this.recipes.filter(item => item.isActive)
  }

  async toggleStatus(id: string): Promise<Recipe> {
    const recipe = await this.getById(id)
    if (!recipe) {
      throw new Error('Recipe not found')
    }

    return this.update(id, { isActive: !recipe.isActive })
  }

  async duplicateRecipe(recipeId: string, newName: string): Promise<Recipe> {
    const original = await this.getById(recipeId)
    if (!original) {
      throw new Error('Recipe not found')
    }

    const duplicate: Recipe = {
      ...original,
      id: generateId(),
      name: newName,
      code: undefined, // code should be unique
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.recipes.push(duplicate)
    return duplicate
  }

  // НОВОЕ: расчет себестоимости для композитных рецептов
  async calculateCost(
    recipeId: string,
    productsService: any, // ProductsService
    preparationsService: PreparationService
  ): Promise<CostCalculation | null> {
    const recipe = await this.getById(recipeId)
    if (!recipe) return null

    let totalCost = 0
    const componentCosts: CostCalculation['componentCosts'] = []

    for (const component of recipe.components) {
      let cost = 0

      if (component.componentType === 'product') {
        // Получаем стоимость продукта
        const product = await productsService.getById(component.componentId)
        if (product && product.costPerUnit) {
          cost = (product.costPerUnit * component.quantity) / 1000 // если единицы в граммах
        }
      } else if (component.componentType === 'preparation') {
        // Получаем стоимость полуфабриката
        const preparation = await preparationsService.getById(component.componentId)
        if (preparation && preparation.costPerPortion) {
          // Пропорциональная стоимость от общего выхода полуфабриката
          const portionRatio = component.quantity / preparation.outputQuantity
          cost = preparation.costPerPortion * portionRatio
        }
      }

      totalCost += cost

      if (cost > 0) {
        componentCosts.push({
          componentId: component.componentId,
          componentType: component.componentType,
          cost,
          percentage: 0 // will be calculated after
        })
      }
    }

    // Calculate percentages
    componentCosts.forEach(item => {
      item.percentage = totalCost > 0 ? (item.cost / totalCost) * 100 : 0
    })

    return {
      recipeId,
      totalCost,
      costPerPortion: totalCost / recipe.portionSize,
      componentCosts,
      calculatedAt: new Date()
    }
  }
}

// =============================================
// MENU RECIPE LINKS SERVICE (без изменений)
// =============================================

export class MenuRecipeLinkService {
  private links: MenuRecipeLink[] = []

  constructor(initialData: MenuRecipeLink[] = []) {
    this.links = initialData
  }

  async getAll(): Promise<MenuRecipeLink[]> {
    return [...this.links]
  }

  async getById(id: string): Promise<MenuRecipeLink | null> {
    return this.links.find(item => item.id === id) || null
  }

  async getByMenuItem(menuItemId: string, variantId?: string): Promise<MenuRecipeLink[]> {
    return this.links.filter(link => {
      const matchesMenuItem = link.menuItemId === menuItemId
      const matchesVariant = variantId ? link.variantId === variantId : !link.variantId
      return matchesMenuItem && matchesVariant
    })
  }

  async getByRecipe(recipeId: string): Promise<MenuRecipeLink[]> {
    return this.links.filter(link => link.recipeId === recipeId)
  }

  async create(
    menuItemId: string,
    recipeId: string,
    variantId?: string,
    portionMultiplier: number = 1
  ): Promise<MenuRecipeLink> {
    const link: MenuRecipeLink = {
      id: generateId(),
      menuItemId,
      variantId,
      recipeId,
      portionMultiplier,
      modifications: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    this.links.push(link)
    return link
  }

  async update(id: string, data: Partial<MenuRecipeLink>): Promise<MenuRecipeLink> {
    const index = this.links.findIndex(item => item.id === id)
    if (index === -1) {
      throw new Error('Menu recipe link not found')
    }

    this.links[index] = {
      ...this.links[index],
      ...data,
      updatedAt: new Date().toISOString()
    }

    return this.links[index]
  }

  async delete(id: string): Promise<void> {
    const index = this.links.findIndex(item => item.id === id)
    if (index === -1) {
      throw new Error('Menu recipe link not found')
    }
    this.links.splice(index, 1)
  }
}

// =============================================
// UNITS SERVICE (упрощенный)
// =============================================

export class UnitService {
  private units: Unit[] = []

  constructor(initialData: Unit[] = []) {
    this.units = initialData
  }

  async getAll(): Promise<Unit[]> {
    return [...this.units]
  }

  async getById(id: string): Promise<Unit | null> {
    return this.units.find(item => item.id === id) || null
  }

  async getByType(type: 'weight' | 'volume' | 'piece'): Promise<Unit[]> {
    return this.units.filter(unit => unit.type === type)
  }

  async convert(value: number, fromUnit: string, toUnit: string): Promise<number> {
    if (fromUnit === toUnit) return value

    const from = this.units.find(unit => unit.shortName === fromUnit)
    const to = this.units.find(unit => unit.shortName === toUnit)

    if (!from || !to) {
      throw new Error('Unit not found')
    }

    if (from.type !== to.type) {
      throw new Error('Cannot convert between different unit types')
    }

    // Simple conversion through base unit
    const fromBase = from.conversionRate || 1
    const toBase = to.conversionRate || 1

    return (value * fromBase) / toBase
  }
}
