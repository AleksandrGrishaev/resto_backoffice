// src/core/changelog/changelogService.ts — DB operations for entity change log

import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'
import type { EntityDiff } from './entityDiff'

const MODULE_NAME = 'ChangelogService'

/** PostgREST returns 404 when the table doesn't exist in the schema cache */
function isTableMissing(error: any): boolean {
  if (!error) return false
  const msg = String(error.message || '')
  return error.code === '42P01' || msg.includes('relation') || msg.includes('Not Found')
}

// =============================================
// TYPES
// =============================================

export type EntityType = 'recipe' | 'preparation' | 'product'
export type ChangeType = 'created' | 'updated' | 'archived' | 'restored' | 'cloned'

export interface ChangeLogEntry {
  id: string
  entityType: EntityType
  entityId: string
  entityName: string
  changedBy: string | null
  changedByName: string
  changeType: ChangeType
  changes: {
    fields?: { field: string; old: any; new: any }[]
    components?: {
      action: 'added' | 'removed' | 'modified'
      componentId: string
      componentName: string
      details?: { field: string; old: any; new: any }[]
    }[]
  }
  createdAt: string
}

// =============================================
// GET CURRENT USER
// =============================================

// Lazy reference — set by the first caller (recipesService sets this)
let _getCurrentUser: (() => { id: string; name: string } | null) | null = null

export function setCurrentUserProvider(fn: () => { id: string; name: string } | null) {
  _getCurrentUser = fn
}

function getCurrentUser(): { id: string; name: string } | null {
  return _getCurrentUser?.() ?? null
}

// =============================================
// CHANGELOG SERVICE
// =============================================

export const changelogService = {
  /**
   * Log a change to the entity_change_log table (non-blocking)
   */
  async logChange(params: {
    entityType: EntityType
    entityId: string
    entityName: string
    changeType: ChangeType
    changes: EntityDiff | object
  }): Promise<void> {
    try {
      const user = getCurrentUser()

      const diff =
        'hasChanges' in params.changes
          ? {
              fields: (params.changes as EntityDiff).fields,
              components: (params.changes as EntityDiff).components
            }
          : {}

      const { error } = await supabase.from('entity_change_log').insert({
        entity_type: params.entityType,
        entity_id: params.entityId,
        entity_name: params.entityName,
        changed_by: user?.id || null,
        changed_by_name: user?.name || 'Unknown',
        change_type: params.changeType,
        changes: diff
      })

      if (error && !isTableMissing(error)) {
        DebugUtils.error(MODULE_NAME, 'Failed to write changelog', { error, params })
      }
    } catch (err) {
      // Non-blocking — don't throw, just log
    }
  },

  /**
   * Get change history for a specific entity
   */
  async getHistory(
    entityType: EntityType,
    entityId: string,
    limit = 50
  ): Promise<ChangeLogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('entity_change_log')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        if (!isTableMissing(error)) {
          DebugUtils.error(MODULE_NAME, 'Failed to fetch history', { error })
        }
        return []
      }

      return (data || []).map(mapFromDb)
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Error fetching history', { err })
      return []
    }
  },

  /**
   * Get recent changes across all entities (for ConstructorHub)
   */
  async getRecentChanges(days = 30, limit = 100): Promise<ChangeLogEntry[]> {
    try {
      const since = new Date()
      since.setDate(since.getDate() - days)

      const { data, error } = await supabase
        .from('entity_change_log')
        .select('*')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        if (!isTableMissing(error)) {
          DebugUtils.error(MODULE_NAME, 'Failed to fetch recent changes', { error })
        }
        return []
      }

      return (data || []).map(mapFromDb)
    } catch (err) {
      DebugUtils.error(MODULE_NAME, 'Error fetching recent changes', { err })
      return []
    }
  }
}

// =============================================
// DB MAPPER
// =============================================

function mapFromDb(row: any): ChangeLogEntry {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    entityName: row.entity_name,
    changedBy: row.changed_by,
    changedByName: row.changed_by_name,
    changeType: row.change_type,
    changes: row.changes || {},
    createdAt: row.created_at
  }
}
