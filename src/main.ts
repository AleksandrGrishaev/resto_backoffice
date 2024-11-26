// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.store'
import router from '@/router'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import '@mdi/font/css/materialdesignicons.css'

import App from './App.vue'
import { DebugUtils } from './utils'

const MODULE_NAME = 'Main'

const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi
    }
  },
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          primary: '#A395E9',
          secondary: '#BFB5F2',
          background: '#141416',
          surface: '#1A1A1E',
          error: '#FF9676',
          success: '#92C9AF',
          warning: '#FFB076'
        }
      }
    }
  },
  defaults: {
    VBtn: {
      variant: 'elevated',
      ripple: true
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary'
    }
  }
})

const initServices = async () => {
  const authStore = useAuthStore()
  await authStore.initializeDefaultUsers?.()
}

async function initializeApp() {
  try {
    DebugUtils.info(MODULE_NAME, 'Starting application initialization')

    const app = createApp(App)
    const pinia = createPinia()

    app.use(pinia)
    app.use(router)
    app.use(vuetify)

    await initServices()

    app.mount('#app')

    DebugUtils.info(MODULE_NAME, 'Application initialized successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to initialize application', { error })
    // Здесь можно добавить глобальную обработку ошибок
  }
}

initializeApp()
