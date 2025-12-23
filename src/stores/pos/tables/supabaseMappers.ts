// src/stores/pos/tables/supabaseMappers.ts
// Mappers for PosTable ↔ Supabase tables table

import type { PosTable } from '../types'
import type { Database } from '@/supabase/types'

type SupabaseTable = Database['public']['Tables']['tables']['Row']
type SupabaseTableInsert = Database['public']['Tables']['tables']['Insert']
type SupabaseTableUpdate = Database['public']['Tables']['tables']['Update']

/**
 * Convert PosTable to Supabase INSERT format
 */
export function toSupabaseInsert(table: PosTable): SupabaseTableInsert {
  return {
    id: table.id,
    table_number: table.number,
    area: table.section, // map section → area
    capacity: table.capacity,
    status: mapStatusToSupabase(table.status),
    current_order_id: table.currentOrderId || null,
    created_at: table.createdAt,
    updated_at: table.updatedAt
  }
}

/**
 * Convert PosTable to Supabase UPDATE format
 */
export function toSupabaseUpdate(table: PosTable): SupabaseTableUpdate {
  const insert = toSupabaseInsert(table)
  // Remove created_at (immutable)
  const { created_at, ...update } = insert
  return update
}

/**
 * Convert Supabase row to PosTable
 */
export function fromSupabase(row: SupabaseTable): PosTable {
  return {
    id: row.id,
    number: row.table_number,
    section: (row.area || 'main') as 'main' | 'island' | 'bar', // map area → section
    floor: 1, // Default floor (not in Supabase schema)
    capacity: row.capacity,
    status: mapStatusFromSupabase(row.status),
    sortOrder: (row as any).sort_order || 0, // Sort order for display
    currentOrderId: row.current_order_id || undefined,
    notes: undefined, // Not in Supabase schema
    reservedUntil: undefined, // Not in Supabase schema
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/**
 * Map PosTable status to Supabase status
 */
function mapStatusToSupabase(
  status: 'free' | 'occupied' | 'reserved'
): 'available' | 'occupied' | 'reserved' {
  if (status === 'free') return 'available'
  return status
}

/**
 * Map Supabase status to PosTable status
 */
function mapStatusFromSupabase(status: string): 'free' | 'occupied' | 'reserved' {
  if (status === 'available') return 'free'
  return status as 'occupied' | 'reserved'
}
