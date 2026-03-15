// src/stores/website/settingsTypes.ts - Types for website settings

export interface GeneralSettings {
  site_url: string
  restaurant_name: string
  tagline: string
  whatsapp_number: string
  address: string
  google_maps_url: string
}

export interface WorkingHoursSlot {
  open: string
  close: string
}

export interface HoursSettings {
  mon_fri: WorkingHoursSlot
  sat_sun: WorkingHoursSlot
  closed_days: string[]
  special_note: string
}

export interface SocialSettings {
  instagram: string
  facebook: string
  tiktok: string
  tripadvisor: string
}

export interface AuthSettings {
  google_enabled: boolean
  email_magic_link_enabled: boolean
  telegram_enabled: boolean
  telegram_bot_token: string
  telegram_bot_username: string
}

export interface SeoSettings {
  meta_description: string
  og_image_url: string
  favicon_url: string
}

export type SettingsKey = 'general' | 'hours' | 'social' | 'auth' | 'seo'

export interface WebsiteSettingsRow {
  id: string
  key: SettingsKey
  value: Record<string, unknown>
  updated_at: string
  updated_by: string | null
}

export type SettingsMap = {
  general: GeneralSettings
  hours: HoursSettings
  social: SocialSettings
  auth: AuthSettings
  seo: SeoSettings
}
