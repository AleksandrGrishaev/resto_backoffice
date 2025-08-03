// src/stores/recipes/recipesService.ts
import { generateId } from '@/utils'
import type {
  Recipe,
  Ingredient,
  MenuRecipeLink,
  CostCalculation,
  CreateRecipeData,
  CreateIngredientData,
  Unit
} from './types'

export class IngredientService {
  private ingredients: Ingredient[] = []

  constructor(initialData: Ingredient[] = []) {
    this.ingredients = initialData
  }

  async getAll(): Promise<Ingredient[]> {
    return [...this.ingredients]
  }

  async getById(id: string): Promise<Ingredient | null> {
    return this.ingredients.find(item => item.id === id) || null
  }

  async getByCategory(category: string): Promise<Ingredient[]> {
    return this.ingredients.filter(item => item.category === category && item.isActive)
  }

  async getActiveIngredients(): Promise<Ingredient[]> {
    return this.ingredients.filter(item => item.isActive)
  }

  async getByCode(code: string): Promise<Ingredient | null> {
    return this.ingredients.find(item => item.code === code) || null
  }

  async checkCodeExists(code: string, excludeId?: string): Promise<boolean> {
    const existing = await this.getByCode(code)
    return existing !== null && existing.id !== excludeId
  }

  async create(data: CreateIngredientData): Promise<Ingredient> {
    // Check code uniqueness
    const codeExists = await this.checkCodeExists(data.code)
    if (codeExists) {
      throw new Error(`Ingredient with code ${data.code} already exists`)
    }

    const ingredient: Ingredient = {
      ...data,
      id: generateId(),
      isActive: true,
      isComposite: data.isComposite || false,
      allergens: data.allergens || [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.ingredients.push(ingredient)
    return ingredient
  }

  async update(id: string, data: Partial<Ingredient>): Promise<Ingredient> {
    const index = this.ingredients.findIndex(item => item.id === id)
    if (index === -1) {
      throw new Error('Ingredient not found')
    }

    // Check code uniqueness if code is being updated
    if (data.code && data.code !== this.ingredients[index].code) {
      const codeExists = await this.checkCodeExists(data.code, id)
      if (codeExists) {
        throw new Error(`Ingredient with code ${data.code} already exists`)
      }
    }

    this.ingredients[index] = {
      ...this.ingredients[index],
      ...data,
      updatedAt: new Date()
    }

    return this.ingredients[index]
  }

  async delete(id: string): Promise<void> {
    const index = this.ingredients.findIndex(item => item.id === id)
    if (index === -1) {
      throw new Error('Ingredient not found')
    }
    this.ingredients.splice(index, 1)
  }
}

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
      ingredients: [],
      instructions: [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
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
      updatedAt: new Date()
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

  async calculateCost(
    recipeId: string,
    ingredientService: IngredientService
  ): Promise<CostCalculation | null> {
    const recipe = await this.getById(recipeId)
    if (!recipe) return null

    let totalCost = 0
    const ingredientCosts: CostCalculation['ingredientCosts'] = []

    for (const recipeIngredient of recipe.ingredients) {
      const ingredient = await ingredientService.getById(recipeIngredient.ingredientId)
      if (!ingredient || !ingredient.costPerUnit) continue

      const cost = ingredient.costPerUnit * recipeIngredient.quantity
      totalCost += cost

      ingredientCosts.push({
        ingredientId: ingredient.id,
        cost,
        percentage: 0 // will be calculated after
      })
    }

    // Calculate percentages
    ingredientCosts.forEach(item => {
      item.percentage = totalCost > 0 ? (item.cost / totalCost) * 100 : 0
    })

    return {
      recipeId,
      totalCost,
      costPerPortion: totalCost / recipe.portionSize,
      ingredientCosts,
      calculatedAt: new Date()
    }
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
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.recipes.push(duplicate)
    return duplicate
  }
}

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
      createdAt: new Date(),
      updatedAt: new Date()
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
      updatedAt: new Date()
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

  async create(data: Omit<Unit, 'id'>): Promise<Unit> {
    const unit: Unit = {
      ...data,
      id: generateId()
    }

    this.units.push(unit)
    return unit
  }

  async update(id: string, data: Partial<Unit>): Promise<Unit> {
    const index = this.units.findIndex(item => item.id === id)
    if (index === -1) {
      throw new Error('Unit not found')
    }

    this.units[index] = {
      ...this.units[index],
      ...data
    }

    return this.units[index]
  }

  async delete(id: string): Promise<void> {
    const index = this.units.findIndex(item => item.id === id)
    if (index === -1) {
      throw new Error('Unit not found')
    }
    this.units.splice(index, 1)
  }
}
