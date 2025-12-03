/**
 * Recipe categorization rules for Winter menu migration
 *
 * Categories:
 * - breakfast: General breakfast dishes (Big breakfast, Shakshuka, Porridge, etc.)
 * - steak: Meat steaks (Tuna steak, Chicken steak, Beef steak)
 * - pasta: Pasta dishes (Bolognese, Carbonara)
 * - poke_bowl: Poke bowls and sushi wraps
 * - salad: Salads (Greek, Fruit)
 * - soup: Soups (TomYum, Pumpkin)
 * - sandwich: Sandwiches, ciabattas, croissants, burgers
 * - smoothie: Smoothie bowls
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load category mappings
const CATEGORIES = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'recipe-categories.json'), 'utf-8')
) as Record<string, string>

/**
 * Determine recipe category based on dish name
 */
export function getCategoryForRecipe(dishName: string): string {
  const name = dishName.toLowerCase().trim()

  // Steaks (highest priority - contains "steak")
  if (name.includes('steak')) {
    return CATEGORIES.steak
  }

  // Poke bowls and sushi
  if (name.includes('poke') || name.includes('sushi')) {
    return CATEGORIES.poke_bowl
  }

  // Pasta
  if (name.includes('pasta')) {
    return CATEGORIES.pasta
  }

  // Soups
  if (name.includes('soup') || name.includes('tomyum')) {
    return CATEGORIES.soup
  }

  // Smoothies
  if (name.includes('smoothie')) {
    return CATEGORIES.smoothie
  }

  // Salads
  if (name.includes('salad')) {
    return CATEGORIES.salad
  }

  // Sandwiches, ciabattas, croissants, burgers
  if (
    name.includes('ciabatta') ||
    name.includes('croissant') ||
    name.includes('burger') ||
    name.includes('toast')
  ) {
    return CATEGORIES.sandwich
  }

  // Dumplings - treat as breakfast
  if (name.includes('dumpling')) {
    return CATEGORIES.breakfast
  }

  // Default: breakfast for everything else from CSV
  return CATEGORIES.breakfast
}

/**
 * Get display category name for logging
 */
export function getCategoryName(categoryId: string): string {
  const entry = Object.entries(CATEGORIES).find(([_, id]) => id === categoryId)
  return entry ? entry[0] : 'unknown'
}

/**
 * Determine difficulty level based on ingredient count and dish complexity
 */
export function getDifficulty(ingredientCount: number, dishName: string): string {
  const name = dishName.toLowerCase()

  // Complex dishes
  if (
    name.includes('steak') ||
    name.includes('pasta') ||
    name.includes('dumpling') ||
    name.includes('shakshuka')
  ) {
    return 'hard'
  }

  // Medium complexity
  if (
    name.includes('soup') ||
    name.includes('poke') ||
    name.includes('burger') ||
    ingredientCount >= 10
  ) {
    return 'medium'
  }

  // Simple dishes
  if (name.includes('smoothie') || name.includes('salad') || ingredientCount <= 5) {
    return 'easy'
  }

  return 'medium'
}

/**
 * Estimate prep time based on dish type (in minutes)
 */
export function getPrepTime(dishName: string): number {
  const name = dishName.toLowerCase()

  if (name.includes('smoothie') || name.includes('salad')) return 5
  if (name.includes('toast') || name.includes('porridge')) return 10
  if (name.includes('ciabatta') || name.includes('sandwich')) return 15
  if (name.includes('soup') || name.includes('poke')) return 20
  if (name.includes('pasta') || name.includes('steak')) return 25
  if (name.includes('dumpling') || name.includes('shakshuka')) return 30

  return 15 // default
}

/**
 * Estimate cook time based on dish type (in minutes)
 */
export function getCookTime(dishName: string): number {
  const name = dishName.toLowerCase()

  if (name.includes('smoothie') || name.includes('salad')) return 0
  if (name.includes('toast')) return 5
  if (name.includes('ciabatta') || name.includes('sandwich')) return 10
  if (name.includes('soup')) return 15
  if (name.includes('poke') || name.includes('pasta')) return 15
  if (name.includes('steak')) return 20
  if (name.includes('dumpling')) return 25

  return 10 // default
}
