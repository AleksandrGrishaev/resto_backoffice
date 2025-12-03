/**
 * Recipe Parser for Winter Menu Migration
 *
 * Parses recipes CSV and generates SQL for recipes + recipe_components
 * Handles polymorphic relationships: components can be products OR preparations
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'
import {
  getCategoryForRecipe,
  getCategoryName,
  getDifficulty,
  getPrepTime,
  getCookTime
} from '../mappings/recipe-rules.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load product-to-prep replacements
const REPLACEMENTS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../mappings/product-to-prep-replacements.json'), 'utf-8')
)

interface RecipeComponent {
  code: string // Product or prep code (M-2, V-25, P-1, etc.)
  ingredientName: string
  preparation: string // e.g., "2 sp", "1 tsp", "3 slc"
  quantity: number
  unit: string
  costPerUnit: number
  totalCost: number
}

interface Recipe {
  category: string // Dinner, Breakfast
  dishName: string
  components: RecipeComponent[]
  totalCost: number
  categoryId: string
  difficulty: string
  prepTime: number
  cookTime: number
}

/**
 * Parse number from CSV (handles quoted numbers with commas)
 */
function parseNumber(str: string | undefined): number {
  if (!str || str === '0' || str === '') return 0
  return parseFloat(str.replace(/,/g, ''))
}

/**
 * Normalize unit names to match measurement system
 */
function normalizeUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    gr: 'gram',
    pc: 'piece',
    ml: 'ml',
    lt: 'liter'
  }
  const normalized = unit.toLowerCase().trim()
  return unitMap[normalized] || normalized
}

/**
 * Determine if code is a preparation (P-XX) or product
 */
function isPreparation(code: string): boolean {
  return code.trim().toUpperCase().startsWith('P-')
}

/**
 * Try to replace product with preparation if matching quantity/unit exists
 */
function tryReplaceWithPrep(
  productCode: string,
  quantity: number,
  unit: string
): { code: string; name: string; replaced: boolean } {
  const replacements = REPLACEMENTS.replacements[productCode]
  if (!replacements) {
    return { code: productCode, name: '', replaced: false }
  }

  // Find matching quantity and unit
  const match = replacements.find((r: any) => r.quantity === quantity && r.unit === unit)
  if (match) {
    return { code: match.prepCode, name: match.prepName, replaced: true }
  }

  return { code: productCode, name: '', replaced: false }
}

/**
 * Main parser function
 */
function parseRecipes(): Recipe[] {
  console.log('📖 Parsing recipes from CSV...\n')

  // Read CSV
  const csvPath = path.join(
    __dirname,
    '../../../dist/ docs/Product list of Winter - Copy of Recipes.csv'
  )
  const csvContent = fs.readFileSync(csvPath, 'utf-8')

  // Parse CSV (handles quoted commas)
  const records = parse(csvContent, {
    skip_empty_lines: true,
    relax_column_count: true
  })

  const recipes: Recipe[] = []
  let currentRecipe: Recipe | null = null
  let recipeIndex = 0
  let lastDishName = ''

  // Process records (skip header row 0)
  for (let i = 1; i < records.length; i++) {
    const row = records[i]
    const [
      category,
      dishName,
      code,
      ingredientName,
      preparation,
      quantity,
      costPerUnit,
      unit,
      totalCost
    ] = row

    // Empty row or "Total:" row - finalize current recipe
    if (!code || code.trim() === '' || !ingredientName || ingredientName.trim() === '') {
      if (currentRecipe && currentRecipe.components.length > 0) {
        recipes.push(currentRecipe)
        recipeIndex++
        console.log(
          `✅ R-${recipeIndex}: ${currentRecipe.dishName} (${currentRecipe.components.length} components, Rp ${currentRecipe.totalCost.toFixed(1)})`
        )
        currentRecipe = null
        lastDishName = ''
      }
      continue
    }

    // New recipe - ONLY when dishName CHANGES (not just exists)
    if (dishName && dishName.trim() !== '' && dishName.trim() !== lastDishName) {
      // Finalize previous recipe if exists
      if (currentRecipe && currentRecipe.components.length > 0) {
        recipes.push(currentRecipe)
        recipeIndex++
        console.log(
          `✅ R-${recipeIndex}: ${currentRecipe.dishName} (${currentRecipe.components.length} components, Rp ${currentRecipe.totalCost.toFixed(1)})`
        )
      }

      // Start new recipe
      lastDishName = dishName.trim()
      const categoryId = getCategoryForRecipe(dishName)
      currentRecipe = {
        category,
        dishName,
        components: [],
        totalCost: 0,
        categoryId,
        difficulty: 'medium', // will be calculated later
        prepTime: getPrepTime(dishName),
        cookTime: getCookTime(dishName)
      }
    }

    // Add component to current recipe
    if (currentRecipe) {
      const originalCode = code.trim()
      let finalCode = originalCode
      let finalIngredientName = ingredientName.trim()
      const qty = parseNumber(quantity)
      const normalizedUnit = normalizeUnit(unit || 'gram')

      // Try to replace product with preparation
      if (!isPreparation(finalCode)) {
        const replacement = tryReplaceWithPrep(finalCode, qty, normalizedUnit)
        if (replacement.replaced) {
          finalCode = replacement.code
          finalIngredientName = replacement.name + ` (was ${originalCode})`
        }
      }

      const component: RecipeComponent = {
        code: finalCode,
        ingredientName: finalIngredientName,
        preparation: preparation?.trim() || '',
        quantity: qty,
        unit: normalizedUnit,
        costPerUnit: parseNumber(costPerUnit),
        totalCost: parseNumber(totalCost)
      }

      currentRecipe.components.push(component)
      currentRecipe.totalCost += component.totalCost
    }
  }

  // Add last recipe
  if (currentRecipe && currentRecipe.components.length > 0) {
    recipes.push(currentRecipe)
    recipeIndex++
    console.log(
      `✅ R-${recipeIndex}: ${currentRecipe.dishName} (${currentRecipe.components.length} components, Rp ${currentRecipe.totalCost.toFixed(1)})`
    )
  }

  // Calculate difficulty for all recipes
  recipes.forEach(recipe => {
    recipe.difficulty = getDifficulty(recipe.components.length, recipe.dishName)
  })

  return recipes
}

/**
 * Generate SQL for recipes and components
 */
function generateSQL(recipes: Recipe[]): string[] {
  const lines: string[] = [
    '-- Migration: Import recipes from Winter menu CSV',
    '-- Generated: ' + new Date().toISOString(),
    '-- Total recipes: ' + recipes.length,
    '',
    'BEGIN;',
    ''
  ]

  recipes.forEach((recipe, index) => {
    const recipeCode = `R-${index + 1}`
    const categoryName = getCategoryName(recipe.categoryId)

    lines.push(
      `-- Recipe ${recipeCode}: ${recipe.dishName} (${categoryName}, ${recipe.components.length} components)`
    )

    // Generate recipe INSERT
    lines.push(
      `INSERT INTO recipes (legacy_id, code, name, category, portion_size, portion_unit, cost, difficulty, prep_time, cook_time, is_active) VALUES (`,
      `  '${recipeCode}',`,
      `  '${recipeCode}',`,
      `  '${recipe.dishName.replace(/'/g, "''")}',`,
      `  '${recipe.categoryId}',`,
      `  1, -- portion_size (default to 1 serving)`,
      `  'piece',`,
      `  ${recipe.totalCost.toFixed(2)},`,
      `  '${recipe.difficulty}',`,
      `  ${recipe.prepTime},`,
      `  ${recipe.cookTime},`,
      `  true`,
      `);`,
      ``
    )

    // Generate recipe_components INSERTs
    recipe.components.forEach((component, compIndex) => {
      const isPrep = isPreparation(component.code)
      const componentType = isPrep ? 'preparation' : 'product'

      lines.push(
        `-- Component ${compIndex + 1}: ${component.ingredientName} (${component.code}, ${componentType})`,
        `INSERT INTO recipe_components (recipe_id, component_id, component_type, quantity, unit, preparation, sort_order) VALUES (`,
        `  (SELECT id FROM recipes WHERE code = '${recipeCode}'),`,
        `  (SELECT id FROM ${isPrep ? 'preparations' : 'products'} WHERE code = '${component.code}'),`,
        `  '${componentType}',`,
        `  ${component.quantity},`,
        `  '${component.unit}',`,
        `  ${component.preparation ? `'${component.preparation.replace(/'/g, "''")}'` : 'NULL'},`,
        `  ${compIndex}`,
        `);`,
        ``
      )
    })

    lines.push('')
  })

  lines.push('COMMIT;')
  lines.push('')
  lines.push(`-- Summary:`)
  lines.push(`-- Total recipes: ${recipes.length}`)
  lines.push(`-- Total components: ${recipes.reduce((sum, r) => sum + r.components.length, 0)}`)
  lines.push(
    `-- Preparations used: ${recipes.reduce((sum, r) => sum + r.components.filter(c => isPreparation(c.code)).length, 0)}`
  )
  lines.push(
    `-- Products used: ${recipes.reduce((sum, r) => sum + r.components.filter(c => !isPreparation(c.code)).length, 0)}`
  )

  return lines
}

/**
 * Generate verification SQL to check missing references
 */
function generateVerificationSQL(recipes: Recipe[]): string[] {
  const lines: string[] = [
    '-- Verification: Check all product/prep codes exist in database',
    '',
    'WITH component_codes AS (',
    '  SELECT DISTINCT unnest(ARRAY['
  ]

  // Collect all unique codes
  const allCodes = new Set<string>()
  recipes.forEach(recipe => {
    recipe.components.forEach(component => {
      allCodes.add(component.code)
    })
  })

  const codeArray = Array.from(allCodes).sort()
  const codeLines = codeArray.map((code, idx) => {
    const isLast = idx === codeArray.length - 1
    return `    '${code}'${isLast ? '' : ','}`
  })
  lines.push(...codeLines)

  lines.push(
    '  ]) AS code',
    '),',
    'preps AS (',
    "  SELECT code FROM preparations WHERE code LIKE 'P-%'",
    '),',
    'prods AS (',
    '  SELECT code FROM products',
    ')',
    'SELECT',
    '  cc.code,',
    '  CASE',
    "    WHEN cc.code LIKE 'P-%' THEN 'preparation'",
    "    ELSE 'product'",
    '  END as expected_type,',
    '  CASE',
    "    WHEN preps.code IS NOT NULL THEN '✅ Found in preparations'",
    "    WHEN prods.code IS NOT NULL THEN '✅ Found in products'",
    "    ELSE '❌ Missing'",
    '  END as status',
    'FROM component_codes cc',
    'LEFT JOIN preps ON cc.code = preps.code',
    'LEFT JOIN prods ON cc.code = prods.code',
    'ORDER BY cc.code;'
  )

  return lines
}

/**
 * Main execution
 */
function main() {
  try {
    // Parse recipes
    const recipes = parseRecipes()

    console.log(`\n📊 Parsing Summary:`)
    console.log(`   Total recipes: ${recipes.length}`)
    console.log(`   Total components: ${recipes.reduce((sum, r) => sum + r.components.length, 0)}`)
    console.log(
      `   Preparations used: ${recipes.reduce((sum, r) => sum + r.components.filter(c => isPreparation(c.code)).length, 0)}`
    )
    console.log(
      `   Products used: ${recipes.reduce((sum, r) => sum + r.components.filter(c => !isPreparation(c.code)).length, 0)}`
    )

    // Generate SQL
    const sqlLines = generateSQL(recipes)
    const sqlPath = path.join(__dirname, '../sql/import_recipes.sql')
    fs.writeFileSync(sqlPath, sqlLines.join('\n'), 'utf-8')
    console.log(`\n✅ SQL generated: ${sqlPath}`)
    console.log(`   Lines: ${sqlLines.length}`)

    // Generate verification SQL
    const verifyLines = generateVerificationSQL(recipes)
    const verifyPath = path.join(__dirname, '../sql/verify_recipe_components.sql')
    fs.writeFileSync(verifyPath, verifyLines.join('\n'), 'utf-8')
    console.log(`\n✅ Verification SQL generated: ${verifyPath}`)
    console.log(`   Run this first to check all codes exist!`)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
