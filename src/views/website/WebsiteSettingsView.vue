<template>
  <v-container fluid class="pa-4">
    <!-- Header -->
    <div class="d-flex align-center mb-4">
      <h1 class="text-h5">Website Settings</h1>
      <v-spacer />
      <v-btn
        icon="mdi-refresh"
        variant="text"
        size="small"
        :loading="store.loading"
        @click="store.loadAll()"
      />
    </div>

    <!-- Error -->
    <v-alert
      v-if="store.error"
      type="error"
      closable
      class="mb-4"
      @click:close="store.error = null"
    >
      {{ store.error }}
    </v-alert>

    <!-- Loading -->
    <div v-if="store.loading && !store.loaded" class="d-flex justify-center py-8">
      <v-progress-circular indeterminate />
    </div>

    <!-- Settings Tabs -->
    <v-card v-else>
      <v-tabs v-model="activeTab" color="primary" grow>
        <v-tab value="general">General</v-tab>
        <v-tab value="hours">Hours</v-tab>
        <v-tab value="social">Social</v-tab>
        <v-tab value="auth">Auth</v-tab>
        <v-tab value="seo">SEO</v-tab>
      </v-tabs>

      <v-card-text>
        <v-tabs-window v-model="activeTab">
          <!-- General -->
          <v-tabs-window-item value="general">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="store.settings.general.restaurant_name"
                  label="Restaurant Name"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="store.settings.general.tagline"
                  label="Tagline"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="store.settings.general.site_url"
                  label="Site URL"
                  variant="outlined"
                  density="comfortable"
                  placeholder="https://menu.solarkitchen.com"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="store.settings.general.whatsapp_number"
                  label="WhatsApp Number"
                  variant="outlined"
                  density="comfortable"
                  placeholder="+6281234567890"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="store.settings.general.address"
                  label="Address"
                  variant="outlined"
                  density="comfortable"
                />
              </v-col>
              <v-col cols="12">
                <v-text-field
                  v-model="store.settings.general.google_maps_url"
                  label="Google Maps URL"
                  variant="outlined"
                  density="comfortable"
                  placeholder="https://maps.google.com/..."
                />
              </v-col>
            </v-row>
            <div class="d-flex justify-end mt-4">
              <v-btn color="primary" :loading="store.saving === 'general'" @click="save('general')">
                Save General
              </v-btn>
            </div>
          </v-tabs-window-item>

          <!-- Hours -->
          <v-tabs-window-item value="hours">
            <v-row>
              <v-col cols="12" md="6">
                <div class="text-subtitle-2 mb-2">Monday — Friday</div>
                <div class="d-flex gap-2">
                  <v-text-field
                    v-model="store.settings.hours.mon_fri.open"
                    label="Open"
                    variant="outlined"
                    density="comfortable"
                    type="time"
                  />
                  <v-text-field
                    v-model="store.settings.hours.mon_fri.close"
                    label="Close"
                    variant="outlined"
                    density="comfortable"
                    type="time"
                  />
                </div>
              </v-col>
              <v-col cols="12" md="6">
                <div class="text-subtitle-2 mb-2">Saturday — Sunday</div>
                <div class="d-flex gap-2">
                  <v-text-field
                    v-model="store.settings.hours.sat_sun.open"
                    label="Open"
                    variant="outlined"
                    density="comfortable"
                    type="time"
                  />
                  <v-text-field
                    v-model="store.settings.hours.sat_sun.close"
                    label="Close"
                    variant="outlined"
                    density="comfortable"
                    type="time"
                  />
                </div>
              </v-col>
              <v-col cols="12">
                <v-textarea
                  v-model="store.settings.hours.special_note"
                  label="Special Note"
                  variant="outlined"
                  density="comfortable"
                  rows="2"
                  placeholder="e.g. Closed on public holidays"
                />
              </v-col>
            </v-row>
            <div class="d-flex justify-end mt-4">
              <v-btn color="primary" :loading="store.saving === 'hours'" @click="save('hours')">
                Save Hours
              </v-btn>
            </div>
          </v-tabs-window-item>

          <!-- Social -->
          <v-tabs-window-item value="social">
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="store.settings.social.instagram"
                  label="Instagram"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-instagram"
                  placeholder="https://instagram.com/..."
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="store.settings.social.facebook"
                  label="Facebook"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-facebook"
                  placeholder="https://facebook.com/..."
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="store.settings.social.tiktok"
                  label="TikTok"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-music-note"
                  placeholder="https://tiktok.com/@..."
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="store.settings.social.tripadvisor"
                  label="TripAdvisor"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-star"
                  placeholder="https://tripadvisor.com/..."
                />
              </v-col>
            </v-row>
            <div class="d-flex justify-end mt-4">
              <v-btn color="primary" :loading="store.saving === 'social'" @click="save('social')">
                Save Social
              </v-btn>
            </div>
          </v-tabs-window-item>

          <!-- Auth -->
          <v-tabs-window-item value="auth">
            <v-alert type="info" variant="tonal" class="mb-4">
              These toggles control which login buttons are visible on the website. OAuth
              credentials are configured in Supabase Dashboard.
            </v-alert>
            <v-row>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="store.settings.auth.google_enabled"
                  label="Google Login"
                  color="primary"
                  hide-details
                  class="mb-4"
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-switch
                  v-model="store.settings.auth.email_magic_link_enabled"
                  label="Email Magic Link"
                  color="primary"
                  hide-details
                  class="mb-4"
                />
              </v-col>
              <v-col cols="12">
                <v-divider class="mb-4" />
                <v-switch
                  v-model="store.settings.auth.telegram_enabled"
                  label="Telegram Login"
                  color="primary"
                  hide-details
                  class="mb-4"
                />
              </v-col>
              <v-col v-if="store.settings.auth.telegram_enabled" cols="12" md="6">
                <v-text-field
                  v-model="store.settings.auth.telegram_bot_token"
                  label="Telegram Bot Token"
                  variant="outlined"
                  density="comfortable"
                  :type="showTelegramToken ? 'text' : 'password'"
                  :append-inner-icon="showTelegramToken ? 'mdi-eye-off' : 'mdi-eye'"
                  @click:append-inner="showTelegramToken = !showTelegramToken"
                />
              </v-col>
              <v-col v-if="store.settings.auth.telegram_enabled" cols="12" md="6">
                <v-text-field
                  v-model="store.settings.auth.telegram_bot_username"
                  label="Telegram Bot Username"
                  variant="outlined"
                  density="comfortable"
                  placeholder="MyBot"
                />
              </v-col>
            </v-row>
            <div class="d-flex justify-end mt-4">
              <v-btn color="primary" :loading="store.saving === 'auth'" @click="save('auth')">
                Save Auth
              </v-btn>
            </div>
          </v-tabs-window-item>

          <!-- SEO -->
          <v-tabs-window-item value="seo">
            <v-row>
              <v-col cols="12">
                <v-textarea
                  v-model="store.settings.seo.meta_description"
                  label="Meta Description"
                  variant="outlined"
                  density="comfortable"
                  rows="3"
                  placeholder="Description for search engines..."
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="store.settings.seo.og_image_url"
                  label="OG Image URL"
                  variant="outlined"
                  density="comfortable"
                  placeholder="https://..."
                />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field
                  v-model="store.settings.seo.favicon_url"
                  label="Favicon URL"
                  variant="outlined"
                  density="comfortable"
                  placeholder="https://..."
                />
              </v-col>
            </v-row>
            <div class="d-flex justify-end mt-4">
              <v-btn color="primary" :loading="store.saving === 'seo'" @click="save('seo')">
                Save SEO
              </v-btn>
            </div>
          </v-tabs-window-item>
        </v-tabs-window>
      </v-card-text>
    </v-card>

    <!-- Snackbar -->
    <v-snackbar v-model="snackbar" :color="snackbarColor" :timeout="3000">
      {{ snackbarText }}
    </v-snackbar>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWebsiteSettingsStore } from '@/stores/website/settingsStore'
import type { SettingsKey } from '@/stores/website/settingsTypes'

const store = useWebsiteSettingsStore()

const activeTab = ref('general')
const showTelegramToken = ref(false)

const snackbar = ref(false)
const snackbarText = ref('')
const snackbarColor = ref('success')

onMounted(() => {
  if (!store.loaded) {
    store.loadAll()
  }
})

async function save(key: SettingsKey) {
  const success = await store.saveSection(key)
  snackbarText.value = success ? 'Settings saved' : store.error || 'Failed to save'
  snackbarColor.value = success ? 'success' : 'error'
  snackbar.value = true
}
</script>
