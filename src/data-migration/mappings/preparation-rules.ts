/**
 * Preparation categorization rules based on CSV data analysis
 * Maps preparation codes and names to category keys
 */

export interface PreparationRule {
  code?: string
  namePattern?: RegExp
  targetCategory: string
  notes?: string
}

export const PREPARATION_RULES: PreparationRule[] = [
  // Sauces
  {
    namePattern: /(holondaise|hollandaise|concase|pepper souce|mushroom souce|cheese souce)/i,
    targetCategory: 'sauces',
    notes: 'Sauce preparations'
  },

  // Dips & Spreads
  {
    namePattern: /humus/i,
    targetCategory: 'dips',
    notes: 'Hummus varieties'
  },

  // Infused Oils
  {
    namePattern: /oil-(garden|greek)/i,
    targetCategory: 'oils',
    notes: 'Flavored oils'
  },

  // Side Dishes
  {
    namePattern: /(mush.*potato|potato)/i,
    targetCategory: 'sides',
    notes: 'Potato-based sides'
  },

  // Condiments & Jams
  {
    namePattern: /jam/i,
    targetCategory: 'condiments',
    notes: 'Jams and preserves'
  },

  // Garnishes
  {
    namePattern: /lemongrass/i,
    targetCategory: 'garnishes',
    notes: 'Garnishing elements'
  }
]

/**
 * Determine category for a preparation based on code and name
 */
export function getCategoryForPreparation(code: string, name: string): string {
  // Try to match by name pattern
  for (const rule of PREPARATION_RULES) {
    if (rule.namePattern && rule.namePattern.test(name)) {
      return rule.targetCategory
    }

    // Match by specific code
    if (rule.code && rule.code === code) {
      return rule.targetCategory
    }
  }

  // Default to sauces if no match (most preparations are sauces)
  return 'sauces'
}
