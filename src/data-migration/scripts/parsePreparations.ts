/**
 * Parse Preparations CSV and generate SQL migration
 *
 * This script:
 * 1. Reads "Product list of Winter - Prep-recipes.csv"
 * 2. Parses preparation data with ingredients
 * 3. Maps categories and ingredients to products
 * 4. Generates SQL INSERT statements for preparations and preparation_ingredients
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'
import { getCategoryForPreparation } from '../mappings/preparation-rules.js'

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load mappings
const PREP_CATEGORIES = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../mappings/preparation-categories.json'), 'utf-8')
)

interface Ingredient {
  productCode: string
  productName: string
  quantity: number
  unit: string
  notes?: string
}

interface Preparation {
  code: string
  name: string
  categoryId: string
  outputQuantity: number
  outputUnit: string
  costPerPortion: number
  ingredients: Ingredient[]
  department: string
  preparationTime: number
}

/**
 * Clean number string (remove commas, parse)
 */
function parseNumber(str: string): number {
  if (!str || str === '0' || str === '1') return 0
  return parseFloat(str.replace(/,/g, ''))
}

/**
 * Fuzzy match preparation names (handles variations like "Holondaise basil" vs "Holondaise")
 */
function fuzzyMatchPreparation(summaryName: string, ingredientName: string): boolean {
  const s = summaryName.toLowerCase().trim()
  const i = ingredientName.toLowerCase().trim()

  // Exact match
  if (s === i) return true

  // Summary name starts with ingredient name (e.g., "Holondaise basil" starts with "Holondaise")
  if (s.startsWith(i)) return true

  // Ingredient name starts with summary name
  if (i.startsWith(s)) return true

  // First word match (e.g., "Holondaise" matches "Holondaise basil")
  const summaryFirstWord = s.split(/\s+/)[0]
  const ingredientFirstWord = i.split(/\s+/)[0]
  if (summaryFirstWord === ingredientFirstWord && summaryFirstWord.length > 3) return true

  return false
}

/**
 * Parse a single preparation summary row (left side of CSV)
 */
function parsePreparationSummary(row: string[]): {
  code: string
  name: string
  costPerPortion: number
  outputUnit: string
} | null {
  const [, index, preparation, harga, item] = row

  // Skip if no code or name
  if (!index || !preparation || index === 'Index') return null

  return {
    code: index.trim(),
    name: preparation.trim(),
    costPerPortion: parseNumber(harga),
    outputUnit: item?.trim() || 'gr'
  }
}

/**
 * Parse ingredient row (right side of CSV)
 */
function parseIngredient(row: string[]): Ingredient | null {
  // Right side columns: 7=prep name, 8=index, 9=bahan, 10=masak, 11=berapa, 12=harga, 13=unit, 14=harga
  const [, , , , , , , preparationName, productCode, productName, cookingNotes, quantity, , unit] =
    row

  // Skip if no product code or if this is a "Total:" row
  if (!productCode || productCode === 'Index' || !productName || productName === 'Total:') {
    return null
  }

  const parsedQuantity = parseNumber(quantity)
  if (parsedQuantity === 0) return null

  return {
    productCode: productCode.trim(),
    productName: productName.trim(),
    quantity: parsedQuantity,
    unit: unit?.trim() || 'gr',
    notes: cookingNotes?.trim() || undefined
  }
}

/**
 * Group ingredients by preparation name
 */
function groupIngredients(records: string[][]): Map<string, Ingredient[]> {
  const ingredientsByPrep = new Map<string, Ingredient[]>()

  for (let i = 1; i < records.length; i++) {
    const row = records[i]
    const preparationName = row[7]?.trim()

    if (!preparationName || preparationName === 'Preparation') continue

    const ingredient = parseIngredient(row)
    if (!ingredient) {
      continue
    }

    if (!ingredientsByPrep.has(preparationName)) {
      ingredientsByPrep.set(preparationName, [])
    }

    ingredientsByPrep.get(preparationName)!.push(ingredient)
  }

  return ingredientsByPrep
}

/**
 * Calculate output quantity from ingredients
 */
function calculateOutputQuantity(ingredients: Ingredient[], declaredUnit: string): number {
  // Sum up all ingredient quantities that match the declared unit
  let total = 0
  for (const ing of ingredients) {
    if (ing.unit === declaredUnit || (declaredUnit === 'gr' && ing.unit === 'gr')) {
      total += ing.quantity
    }
  }

  // If no match, use a default output (300 is common for sauces)
  return total > 0 ? total : 300
}

/**
 * Generate SQL INSERT statement for a preparation
 */
function generatePreparationSQL(prep: Preparation): string {
  const { code, name, categoryId, outputQuantity, outputUnit, costPerPortion, department } = prep

  return `INSERT INTO preparations (
    code, name, type, output_quantity, output_unit,
    cost_per_portion, preparation_time, instructions,
    is_active, department, shelf_life
  ) VALUES (
    '${code}',
    '${name.replace(/'/g, "''")}',
    '${categoryId}',
    ${outputQuantity},
    '${outputUnit}',
    ${costPerPortion},
    30,
    'See recipe card for detailed instructions',
    true,
    '${department}',
    2
  );`
}

/**
 * Generate SQL INSERT statement for preparation ingredients
 */
function generateIngredientsSQL(prep: Preparation): string[] {
  const sqls: string[] = []

  prep.ingredients.forEach((ing, index) => {
    const notes = ing.notes ? `'${ing.notes.replace(/'/g, "''")}'` : 'NULL'

    sqls.push(`INSERT INTO preparation_ingredients (
    id, preparation_id, type, product_id, quantity, unit, notes, sort_order
  ) VALUES (
    gen_random_uuid(),
    (SELECT id FROM preparations WHERE code = '${prep.code}'),
    'product',
    (SELECT id FROM products WHERE code = '${ing.productCode}'),
    ${ing.quantity},
    '${ing.unit}',
    ${notes},
    ${index}
  );`)
  })

  return sqls
}

/**
 * Main function: Parse CSV and generate SQL
 */
function main() {
  console.log('🚀 Starting preparations CSV parsing...\n')

  // Read CSV file
  const csvPath = path.join(
    __dirname,
    '../../../dist/ docs/Product list of Winter - Prep-recipes.csv'
  )
  const csvContent = fs.readFileSync(csvPath, 'utf-8')

  // Parse CSV using csv-parse
  const records = parse(csvContent, {
    skip_empty_lines: true,
    relax_column_count: true
  })

  console.log(`📄 Total rows: ${records.length}\n`)

  // Step 1: Parse preparation summaries (left side)
  const preparationSummaries = new Map<string, any>()
  for (let i = 1; i < records.length; i++) {
    const row = records[i]
    const summary = parsePreparationSummary(row)

    if (summary) {
      preparationSummaries.set(summary.name, summary)
    }
  }

  console.log(`📦 Found ${preparationSummaries.size} preparation summaries\n`)

  // Step 2: Parse ingredients (right side)
  const ingredientsByPrep = groupIngredients(records)

  console.log(`🥘 Found ingredients for ${ingredientsByPrep.size} preparations\n`)

  // Step 3: Merge summaries with ingredients
  const preparations: Preparation[] = []
  let skipped = 0

  ingredientsByPrep.forEach((ingredients, prepName) => {
    // Find matching summary using fuzzy matching (prefer exact or longest match)
    let summary: any = null
    let bestMatch: { name: string; data: any; score: number } | null = null

    for (const [summaryName, summaryData] of preparationSummaries.entries()) {
      if (fuzzyMatchPreparation(summaryName, prepName)) {
        // Calculate match score (longer matches = better)
        const score = Math.min(summaryName.length, prepName.length)

        if (!bestMatch || score > bestMatch.score) {
          bestMatch = { name: summaryName, data: summaryData, score }
        }
      }
    }

    if (bestMatch) {
      summary = bestMatch.data
    }

    if (!summary) {
      console.warn(`⚠️  No summary found for: ${prepName}`)
      skipped++
      return
    }

    // Skip if cost is placeholder (1 unit means no real data)
    if (summary.costPerPortion === 1 && ingredients.length === 0) {
      console.log(`⏭️  Skipping placeholder: ${prepName}`)
      skipped++
      return
    }

    // Determine category
    const categoryKey = getCategoryForPreparation(summary.code, summary.name)
    const categoryId = PREP_CATEGORIES[categoryKey]

    if (!categoryId) {
      console.warn(`⚠️  No category found for ${summary.code}: ${summary.name}`)
      skipped++
      return
    }

    // Calculate output quantity
    const outputQuantity = calculateOutputQuantity(ingredients, summary.outputUnit)

    preparations.push({
      code: summary.code,
      name: summary.name,
      categoryId,
      outputQuantity,
      outputUnit: summary.outputUnit,
      costPerPortion: summary.costPerPortion,
      ingredients,
      department: 'kitchen',
      preparationTime: 30 // Default 30 minutes
    })
  })

  console.log(`✅ Processed ${preparations.length} preparations, skipped ${skipped}\n`)

  // Step 4: Generate SQL
  const sqlLines: string[] = [
    '-- Migration: Import preparations from Winter menu CSV',
    '-- Generated: ' + new Date().toISOString(),
    '-- Total preparations: ' + preparations.length,
    '',
    '-- Insert preparations',
    'BEGIN;',
    ''
  ]

  preparations.forEach(prep => {
    sqlLines.push(generatePreparationSQL(prep))
    console.log(
      `  ${prep.code}: ${prep.name} (${prep.ingredients.length} ingredients, ${prep.outputQuantity} ${prep.outputUnit})`
    )
  })

  sqlLines.push('', '-- Insert preparation ingredients', '')

  preparations.forEach(prep => {
    const ingredientSQLs = generateIngredientsSQL(prep)
    sqlLines.push(...ingredientSQLs)
    sqlLines.push('') // Empty line between preparations
  })

  sqlLines.push('COMMIT;', '')

  // Write SQL file
  const sqlPath = path.join(__dirname, '../sql/import_preparations.sql')
  fs.writeFileSync(sqlPath, sqlLines.join('\n'), 'utf-8')

  console.log(`\n✅ SQL generated: ${sqlPath}`)
  console.log(`📦 Total preparations: ${preparations.length}`)
  console.log(
    `🥘 Total ingredients: ${preparations.reduce((sum, p) => sum + p.ingredients.length, 0)}`
  )
  console.log('\nNext steps:')
  console.log('1. Review the generated SQL file')
  console.log('2. Apply to production via Supabase SQL Editor')
}

// Run
main()
