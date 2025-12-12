/**
 * KPI Settings Service
 *
 * Manages KPI configuration including:
 * - Excluded write-off reasons (education, test, etc.)
 * - Target percentages for kitchen and bar departments
 */

import { supabase } from '@/supabase/client'
import type { ExcludedReasons } from '@/stores/analytics/services/cogsService'

export interface KPISettings {
  id: string
  excludedReasons: ExcludedReasons
  targets: {
    kitchen: number
    bar: number
  }
  updatedAt: string
}

/**
 * Get KPI settings from database
 */
export async function getKPISettings(): Promise<KPISettings> {
  const { data, error } = await supabase
    .from('kpi_settings')
    .select('*')
    .eq('id', 'default')
    .single()

  if (error) {
    throw new Error(`Failed to get KPI settings: ${error.message}`)
  }

  return {
    id: data.id,
    excludedReasons: data.excluded_reasons,
    targets: data.targets,
    updatedAt: data.updated_at
  }
}

/**
 * Update KPI settings
 */
export async function updateKPISettings(
  settings: Partial<Pick<KPISettings, 'excludedReasons' | 'targets'>>
): Promise<KPISettings> {
  const updateData: Record<string, unknown> = {}

  if (settings.excludedReasons !== undefined) {
    updateData.excluded_reasons = settings.excludedReasons
  }
  if (settings.targets !== undefined) {
    updateData.targets = settings.targets
  }

  const { data, error } = await supabase
    .from('kpi_settings')
    .update(updateData)
    .eq('id', 'default')
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update KPI settings: ${error.message}`)
  }

  return {
    id: data.id,
    excludedReasons: data.excluded_reasons,
    targets: data.targets,
    updatedAt: data.updated_at
  }
}

/**
 * Get default excluded reasons for KPI
 * These are excluded from COGS calculation in KPI reports
 */
export function getDefaultExcludedReasons(): ExcludedReasons {
  return {
    storage: ['education', 'test'],
    preparation: ['education', 'test']
  }
}

/**
 * Get default target percentages
 */
export function getDefaultTargets(): { kitchen: number; bar: number } {
  return {
    kitchen: 30,
    bar: 25
  }
}
