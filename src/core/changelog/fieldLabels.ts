// src/core/changelog/fieldLabels.ts — Human-readable labels for changelog fields

const FIELD_LABELS: Record<string, string> = {
  // Recipe
  name: 'Name',
  code: 'Code',
  category: 'Category',
  department: 'Department',
  portionSize: 'Portion Size',
  portionUnit: 'Portion Unit',

  // Preparation
  type: 'Type',
  outputQuantity: 'Output Quantity',
  outputUnit: 'Output Unit',
  portionType: 'Portion Type',
  preparationTime: 'Preparation Time',
  shelfLife: 'Shelf Life',

  // Component fields
  quantity: 'Quantity',
  unit: 'Unit'
}

export function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field
}

/**
 * Format a field value for human-readable display
 */
export function formatFieldValue(field: string, value: any): string {
  if (value === null || value === undefined) return '—'

  switch (field) {
    case 'department':
      return String(value).charAt(0).toUpperCase() + String(value).slice(1)
    case 'preparationTime':
      return `${value} min`
    case 'shelfLife':
      return `${value} days`
    case 'portionSize':
    case 'outputQuantity':
    case 'quantity':
      return String(value)
    case 'portionType':
      return value === 'portion' ? 'Portion' : 'Weight'
    default:
      return String(value)
  }
}
