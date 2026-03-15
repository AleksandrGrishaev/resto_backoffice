// src/stores/website/settingsStore.ts - Pinia store for website settings

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { websiteSettingsService } from './settingsService'
import type {
  SettingsKey,
  SettingsMap,
  GeneralSettings,
  HoursSettings,
  SocialSettings,
  AuthSettings,
  SeoSettings,
  KitchenHoursSettings,
  MenuSettings
} from './settingsTypes'

const DEFAULTS: SettingsMap = {
  general: {
    site_url: '',
    restaurant_name: '',
    tagline: '',
    whatsapp_number: '',
    address: '',
    google_maps_url: ''
  },
  hours: {
    mon_fri: { open: '08:00', close: '22:00' },
    sat_sun: { open: '09:00', close: '23:00' },
    closed_days: [],
    special_note: ''
  },
  social: {
    instagram: '',
    facebook: '',
    tiktok: '',
    tripadvisor: ''
  },
  auth: {
    google_enabled: true,
    email_magic_link_enabled: true,
    telegram_enabled: false,
    telegram_bot_token: '',
    telegram_bot_username: ''
  },
  seo: {
    meta_description: '',
    og_image_url: '',
    favicon_url: ''
  },
  kitchen_hours: {
    enabled: true,
    schedule: {
      mon: { open: '09:00', close: '21:00' },
      tue: { open: '09:00', close: '21:00' },
      wed: { open: '09:00', close: '21:00' },
      thu: { open: '09:00', close: '21:00' },
      fri: { open: '09:00', close: '21:00' },
      sat: { open: '10:00', close: '21:00' },
      sun: { open: '10:00', close: '21:00' }
    }
  },
  menu: {
    excluded_categories: []
  }
}

export const useWebsiteSettingsStore = defineStore('websiteSettings', () => {
  const settings = ref<SettingsMap>(JSON.parse(JSON.stringify(DEFAULTS)))
  const loading = ref(false)
  const saving = ref<SettingsKey | null>(null)
  const error = ref<string | null>(null)
  const loaded = ref(false)

  // Getters
  const general = computed(() => settings.value.general)
  const hours = computed(() => settings.value.hours)
  const social = computed(() => settings.value.social)
  const auth = computed(() => settings.value.auth)
  const seo = computed(() => settings.value.seo)
  const kitchenHours = computed(() => settings.value.kitchen_hours)
  const menu = computed(() => settings.value.menu)

  async function loadAll() {
    loading.value = true
    error.value = null
    try {
      const rows = await websiteSettingsService.loadAll()
      for (const row of rows) {
        const key = row.key as SettingsKey
        if (key in DEFAULTS) {
          settings.value[key] = { ...DEFAULTS[key], ...row.value } as any
        }
      }
      loaded.value = true
    } catch (e: any) {
      error.value = e.message || 'Failed to load settings'
      console.error('[WebsiteSettingsStore] loadAll error:', e)
    } finally {
      loading.value = false
    }
  }

  async function saveSection(key: SettingsKey): Promise<boolean> {
    saving.value = key
    error.value = null
    try {
      await websiteSettingsService.save(key, settings.value[key] as Record<string, unknown>)
      return true
    } catch (e: any) {
      error.value = e.message || `Failed to save ${key}`
      console.error(`[WebsiteSettingsStore] save ${key} error:`, e)
      return false
    } finally {
      saving.value = null
    }
  }

  function updateSettings<K extends SettingsKey>(key: K, value: Partial<SettingsMap[K]>) {
    settings.value[key] = { ...settings.value[key], ...value } as any
  }

  return {
    settings,
    loading,
    saving,
    error,
    loaded,
    general,
    hours,
    social,
    auth,
    seo,
    kitchenHours,
    menu,
    loadAll,
    saveSection,
    updateSettings
  }
})
