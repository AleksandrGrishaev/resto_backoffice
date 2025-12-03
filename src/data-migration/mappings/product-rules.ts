/**
 * Product categorization rules based on CSV data analysis
 * Maps CSV categories and product codes to DB category keys
 */

export interface CategoryRule {
  csvCategory: string
  codePrefix?: string
  codeRange?: { start: string; end: string }
  specificCodes?: string[]
  targetCategory: string
  notes?: string
}

export const CATEGORY_RULES: CategoryRule[] = [
  // Dairy products
  { csvCategory: 'Dairy', targetCategory: 'dairy', notes: 'All dairy products' },
  { csvCategory: 'Fresh', specificCodes: ['V-1'], targetCategory: 'dairy', notes: 'Eggs' },

  // Vegetables
  {
    csvCategory: 'Fresh',
    codeRange: { start: 'V-2', end: 'V-35' },
    targetCategory: 'vegetables',
    notes: 'Vegetables and fresh herbs'
  },

  // Fruits
  {
    csvCategory: 'Fresh',
    codeRange: { start: 'V-36', end: 'V-45' },
    targetCategory: 'fruits',
    notes: 'Fruits'
  },

  // Meat
  {
    csvCategory: 'Daging / fish',
    specificCodes: ['M-1', 'M-5', 'M-6', 'M-7', 'M-8'],
    targetCategory: 'meat',
    notes: 'Beef, ham, bacon, chicken'
  },

  // Seafood
  {
    csvCategory: 'Daging / fish',
    specificCodes: ['M-2', 'M-3', 'M-4', 'M-9', 'M-10'],
    targetCategory: 'seafood',
    notes: 'Tuna, salmon, shrimp, squid'
  },

  // Spices & Herbs
  { csvCategory: 'Herbs', targetCategory: 'spices', notes: 'All herbs and spices' },
  {
    csvCategory: 'Can/bottle',
    specificCodes: ['C-7', 'C-8'],
    targetCategory: 'spices',
    notes: 'Oils (vegetable, olive)'
  },

  // Sauce
  {
    csvCategory: 'Can/bottle',
    codeRange: { start: 'C-9', end: 'C-21' },
    targetCategory: 'sauce',
    notes: 'Vinegar, sauces, honey, lemon juice'
  },
  {
    csvCategory: 'Other',
    specificCodes: ['O-4', 'O-5', 'O-6', 'O-10', 'O-11'],
    targetCategory: 'sauce',
    notes: 'Mayo, mustard, ketchup, tomato paste, tom yam'
  },

  // Beverages
  { csvCategory: 'Beverage', targetCategory: 'beverages', notes: 'Sodas' },
  { csvCategory: 'Water', targetCategory: 'beverages', notes: 'Water' },
  {
    csvCategory: 'Can/bottle',
    specificCodes: ['C-1', 'C-2', 'C-3', 'C-4'],
    targetCategory: 'beverages',
    notes: 'Monin, plant milks, coconut milk'
  },
  {
    csvCategory: 'Seed',
    specificCodes: ['S-17', 'S-18', 'S-21'],
    targetCategory: 'beverages',
    notes: 'Tea, matcha, coffee'
  },

  // Cereals
  {
    csvCategory: 'Seed',
    specificCodes: ['S-9', 'S-10', 'S-13', 'S-14', 'S-15', 'S-16', 'S-19', 'S-20'],
    targetCategory: 'cereals',
    notes: 'Sugar, flour, oats, chickpeas, granola, rice'
  },
  {
    csvCategory: 'Other',
    specificCodes: ['O-9'],
    targetCategory: 'cereals',
    notes: 'Spaghetti'
  },

  // Seeds
  {
    csvCategory: 'Seed',
    specificCodes: ['S-3', 'S-4', 'S-5', 'S-6', 'S-7', 'S-8'],
    targetCategory: 'seeds',
    notes: 'Sesame, coconut, raisin, dates'
  },

  // Nuts
  { csvCategory: 'Nut', targetCategory: 'nuts', notes: 'All nuts' },

  // Bread
  { csvCategory: 'Bread', targetCategory: 'bread', notes: 'Ciabatta, croissants, bread' },

  // Pastry
  { csvCategory: 'Cake', targetCategory: 'pastry', notes: 'Cheesecake, eclairs, cakes' },
  {
    csvCategory: 'Seed',
    specificCodes: ['S-11', 'S-12'],
    targetCategory: 'pastry',
    notes: 'Chocolate, cocoa powder'
  },

  // Other
  { csvCategory: 'Frozen', targetCategory: 'other', notes: 'Frozen items' },
  { csvCategory: 'Ready', targetCategory: 'other', notes: 'Ready products (dumplings, syrniki)' },
  { csvCategory: 'Paper', targetCategory: 'other', notes: 'Packaging' },
  {
    csvCategory: 'Can/bottle',
    specificCodes: ['C-5', 'C-6'],
    targetCategory: 'other',
    notes: 'Olives'
  },
  {
    csvCategory: 'Other',
    specificCodes: ['O-1', 'O-2', 'O-3', 'O-7', 'O-8'],
    targetCategory: 'other',
    notes: 'Baking powder, soda, vanilla, nori'
  }
]

/**
 * Determine category for a product based on CSV category and code
 */
export function getCategoryForProduct(csvCategory: string, code: string): string {
  // Find matching rule
  for (const rule of CATEGORY_RULES) {
    if (rule.csvCategory !== csvCategory) continue

    // Check specific codes
    if (rule.specificCodes && rule.specificCodes.includes(code)) {
      return rule.targetCategory
    }

    // Check code range
    if (rule.codeRange) {
      const [prefix, numStr] = code.split('-')
      const num = parseInt(numStr, 10)
      const [, startNum] = rule.codeRange.start.split('-')
      const [, endNum] = rule.codeRange.end.split('-')

      if (num >= parseInt(startNum, 10) && num <= parseInt(endNum, 10)) {
        return rule.targetCategory
      }
    }

    // If no specific conditions, match by category only
    if (!rule.specificCodes && !rule.codeRange) {
      return rule.targetCategory
    }
  }

  // Default to 'other' if no rule matches
  return 'other'
}
