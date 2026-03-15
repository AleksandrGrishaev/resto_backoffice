// src/stores/website/index.ts - Re-exports

export { useWebsiteStore } from './websiteStore'
export { websiteService } from './websiteService'
export type { HomepageSection, HomepageFeaturedItem } from './types'

export { useWebsiteSettingsStore } from './settingsStore'
export { websiteSettingsService } from './settingsService'
export type {
  GeneralSettings,
  HoursSettings,
  SocialSettings,
  AuthSettings,
  SeoSettings,
  SettingsKey,
  SettingsMap
} from './settingsTypes'
