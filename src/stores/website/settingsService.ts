// src/stores/website/settingsService.ts - Service for website_settings CRUD

import { supabase } from '@/supabase/client'
import type { SettingsKey, WebsiteSettingsRow } from './settingsTypes'

class WebsiteSettingsService {
  async loadAll(): Promise<WebsiteSettingsRow[]> {
    const { data, error } = await supabase.from('website_settings').select('*').order('key')

    if (error) throw new Error(`Failed to load website settings: ${error.message}`)
    return (data || []) as WebsiteSettingsRow[]
  }

  async save(key: SettingsKey, value: Record<string, unknown>): Promise<WebsiteSettingsRow> {
    const { data, error } = await supabase
      .from('website_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      .select()
      .single()

    if (error) throw new Error(`Failed to save ${key} settings: ${error.message}`)
    return data as WebsiteSettingsRow
  }
}

export const websiteSettingsService = new WebsiteSettingsService()
