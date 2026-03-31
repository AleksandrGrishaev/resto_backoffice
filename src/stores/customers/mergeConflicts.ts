import type { Customer } from './types'

export interface MergeField {
  key: keyof Customer
  dbKey: string
  label: string
  format?: (val: any) => string
}

export interface ConflictItem {
  field: MergeField
  sourceValue: any
  targetValue: any
}

export const MERGE_FIELDS: MergeField[] = [
  { key: 'name', dbKey: 'name', label: 'Name' },
  { key: 'phone', dbKey: 'phone', label: 'Phone' },
  { key: 'telegramUsername', dbKey: 'telegram_username', label: 'Telegram' },
  { key: 'notes', dbKey: 'notes', label: 'Notes' },
  { key: 'tier', dbKey: 'tier', label: 'Tier' },
  { key: 'loyaltyProgram', dbKey: 'loyalty_program', label: 'Loyalty Program' },
  {
    key: 'personalDiscount',
    dbKey: 'personal_discount',
    label: 'Personal Discount',
    format: v => `${v}%`
  },
  { key: 'discountNote', dbKey: 'discount_note', label: 'Discount Note' },
  {
    key: 'disableLoyaltyAccrual',
    dbKey: 'disable_loyalty_accrual',
    label: 'Disable Accrual',
    format: v => (v ? 'Yes' : 'No')
  }
]

function isEmpty(val: any): boolean {
  if (val === null || val === undefined || val === '') return true
  if (typeof val === 'number' && val === 0) return true
  if (typeof val === 'boolean') return false // false is a valid value
  return false
}

export function detectConflicts(source: Customer, target: Customer): ConflictItem[] {
  return MERGE_FIELDS.filter(f => {
    const sv = source[f.key]
    const tv = target[f.key]
    return !isEmpty(sv) && !isEmpty(tv) && sv !== tv
  }).map(f => ({
    field: f,
    sourceValue: source[f.key],
    targetValue: target[f.key]
  }))
}

export function buildOverrides(
  choices: Record<string, 'source' | 'target'>,
  source: Customer
): Record<string, any> {
  const overrides: Record<string, any> = {}
  for (const f of MERGE_FIELDS) {
    if (choices[f.key] === 'source') {
      overrides[f.dbKey] = source[f.key]
    }
    // 'target' or undefined = no override (SQL defaults to target)
  }
  return overrides
}
