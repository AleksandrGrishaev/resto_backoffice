/**
 * Parse Products CSV and generate SQL migration
 *
 * This script:
 * 1. Reads "Product list of Winter - Order list.csv"
 * 2. Parses product data
 * 3. Maps categories and suppliers
 * 4. Generates SQL INSERT statements for products and package_options
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'
import { getCategoryForProduct } from '../mappings/product-rules.js'

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load mappings
const SUPPLIERS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../mappings/suppliers.json'), 'utf-8')
)
const CATEGORIES = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../mappings/categories.json'), 'utf-8')
)

interface ProductRow {
  category: string // CSV category
  code: string // Product code (D-1, V-1, etc.)
  product: string // Product name
  brand: string
  supplier: string
  priceBiji: string // Price per package (with formatting)
  item: string // Package unit (lt, kg, pc, etc.)
  quantity: string // Package size (1000, 250, etc.)
  losePercent: string // Loss percentage (0%, 10%, etc.)
  priceNet: string // Price per base unit (calculated)
  unit: string // Base unit (ml, gr, pc)
  qMin: string // Min stock
  qToOrder: string // Order quantity
  orderTime: string // Order frequency
  price0424: string // Historical price
}

interface Product {
  code: string
  name: string
  nameRu: string
  categoryId: string
  supplierId: string | null
  baseUnit: string
  baseCostPerUnit: number
  yieldPercentage: number
  minStock: number
  price: number // Selling price (markup)
  packageName: string
  packageSize: number
  packageUnit: string
  packagePrice: number
}

/**
 * Clean number string (remove commas, parse)
 */
function parseNumber(str: string): number {
  if (!str || str === '0' || str === '1') return 0
  return parseFloat(str.replace(/,/g, ''))
}

/**
 * Clean percentage string (10% -> 10)
 */
function parsePercent(str: string): number {
  if (!str) return 0
  return parseFloat(str.replace('%', ''))
}

/**
 * Get supplier UUID by name (case-insensitive, handles variations)
 */
function getSupplierIdByName(name: string): string | null {
  if (!name || name.trim() === '') return null

  const trimmed = name.trim()
  return SUPPLIERS[trimmed] || SUPPLIERS['']
}

/**
 * Determine base unit from package unit and context
 * Returns full unit names compatible with useMeasurementUnits.ts
 */
function getBaseUnit(packageUnit: string, baseUnitFromCSV: string): string {
  // Priority: use baseUnitFromCSV if available
  if (baseUnitFromCSV && baseUnitFromCSV !== 'gr' && baseUnitFromCSV !== 'ml') {
    // If base unit is 'pc', use 'piece' (full name)
    if (baseUnitFromCSV === 'pc') return 'piece'
  }

  // Map package unit to base unit (using FULL unit names from measurementUnits.ts)
  const unitMap: Record<string, string> = {
    lt: 'ml', // liter package → ml base
    kg: 'gram', // kilogram package → gram base
    pc: 'piece', // piece → piece
    pk: 'piece', // pack → piece
    bt: 'ml', // bottle → ml
    ml: 'ml', // milliliter → ml
    gr: 'gram' // gram → gram
  }

  return unitMap[packageUnit.toLowerCase()] || 'piece'
}

/**
 * Calculate selling price with markup (cost * 3)
 */
function calculateSellingPrice(cost: number): number {
  return Math.round(cost * 3)
}

/**
 * Parse a single product row from CSV
 */
function parseProductRow(row: string[]): Product | null {
  // Skip empty rows or header
  if (!row[1] || row[1] === 'Code') return null

  const [
    category, // 0
    code, // 1
    product, // 2
    brand, // 3
    supplier, // 4
    priceBiji, // 5
    item, // 6
    quantity, // 7
    losePercent, // 8
    priceNet, // 9
    unit, // 10
    _empty, // 11 - empty column
    qMin, // 12
    qToOrder, // 13
    orderTime, // 14
    price0424 // 15
  ] = row

  // Skip if no code or name
  if (!code || !product) return null

  // Parse numeric values
  const packagePrice = parseNumber(priceBiji)
  const packageSize = parseNumber(quantity)
  const baseCostPerUnit = parseNumber(priceNet)
  const losePercentValue = parsePercent(losePercent)
  const minStock = parseNumber(qMin) * 1000 // Convert to grams/ml

  // Calculate yield percentage (100 - lose%)
  const yieldPercentage = 100 - losePercentValue

  // Determine category
  const categoryKey = getCategoryForProduct(category, code)
  const categoryId = CATEGORIES[categoryKey]

  if (!categoryId) {
    console.warn(`⚠️  No category found for ${code}: ${category} -> ${categoryKey}`)
    return null
  }

  // Get supplier
  const supplierId = getSupplierIdByName(supplier)

  // Determine base unit
  const baseUnit = getBaseUnit(item, unit)

  // Calculate selling price
  const sellingPrice = calculateSellingPrice(baseCostPerUnit)

  return {
    code,
    name: product,
    nameRu: product, // Same for now
    categoryId,
    supplierId,
    baseUnit,
    baseCostPerUnit,
    yieldPercentage,
    minStock,
    price: sellingPrice,
    packageName: `${packageSize} ${item}`,
    packageSize,
    packageUnit: item,
    packagePrice
  }
}

/**
 * Generate SQL INSERT statement for a product
 */
function generateProductSQL(product: Product): string {
  const {
    code,
    name,
    nameRu,
    categoryId,
    supplierId,
    baseUnit,
    baseCostPerUnit,
    yieldPercentage,
    minStock,
    price
  } = product

  const supplierField = supplierId ? `'${supplierId}'` : 'NULL'

  return `INSERT INTO products (
    code, name, name_ru, category, primary_supplier_id,
    base_unit, base_cost_per_unit, yield_percentage,
    min_stock, price, unit, is_active, track_stock
  ) VALUES (
    '${code}',
    '${name.replace(/'/g, "''")}',
    '${nameRu.replace(/'/g, "''")}',
    '${categoryId}',
    ${supplierField},
    '${baseUnit}',
    ${baseCostPerUnit},
    ${yieldPercentage},
    ${minStock},
    ${price},
    '${baseUnit}',
    true,
    true
  );`
}

/**
 * Generate SQL INSERT statement for package_options
 */
function generatePackageSQL(product: Product): string {
  const { code, packageName, packageSize, packageUnit, packagePrice, baseCostPerUnit } = product

  return `INSERT INTO package_options (
    product_id, package_name, package_size, package_unit,
    package_price, base_cost_per_unit, is_active
  ) VALUES (
    (SELECT id FROM products WHERE code = '${code}'),
    '${packageName.replace(/'/g, "''")}',
    ${packageSize},
    '${packageUnit}',
    ${packagePrice},
    ${baseCostPerUnit},
    true
  );`
}

/**
 * Main function: Parse CSV and generate SQL
 */
function main() {
  console.log('🚀 Starting CSV parsing...\n')

  // Read CSV file
  const csvPath = path.join(
    __dirname,
    '../../../dist/ docs/Product list of Winter - Order list .csv'
  )
  const csvContent = fs.readFileSync(csvPath, 'utf-8')

  // Parse CSV using csv-parse
  const records = parse(csvContent, {
    skip_empty_lines: true,
    relax_column_count: true
  })

  const products: Product[] = []

  let skipped = 0
  let processed = 0

  // Skip first 2 rows (empty + header)
  for (let i = 2; i < records.length; i++) {
    const row = records[i]
    const product = parseProductRow(row)

    if (product) {
      products.push(product)
      processed++
    } else {
      skipped++
    }
  }

  console.log(`📊 Parsed ${processed} products, skipped ${skipped} rows\n`)

  // Generate SQL
  const sqlLines: string[] = [
    '-- Migration: Import products from Winter menu CSV',
    '-- Generated: ' + new Date().toISOString(),
    '-- Total products: ' + products.length,
    '',
    '-- Insert products',
    'BEGIN;',
    ''
  ]

  products.forEach(product => {
    sqlLines.push(generateProductSQL(product))
  })

  sqlLines.push('', '-- Insert package options', '')

  products.forEach(product => {
    sqlLines.push(generatePackageSQL(product))
  })

  sqlLines.push('', 'COMMIT;', '')

  // Write SQL file
  const sqlPath = path.join(__dirname, '../sql/import_products.sql')
  fs.writeFileSync(sqlPath, sqlLines.join('\n'), 'utf-8')

  console.log(`✅ SQL generated: ${sqlPath}`)
  console.log(`📦 Total products: ${products.length}`)
  console.log('\nNext steps:')
  console.log('1. Review the generated SQL file')
  console.log('2. Apply to production: npx tsx src/data-migration/scripts/applyMigration.ts')
}

// Run
main()
