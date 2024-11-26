import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth.store'
import router from '@/router'

// Styles
import '@/styles/main.scss'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
// Plugins
import { vuetify } from '@/plugins/vuetify'

// App
import App from './App.vue'
import { DebugUtils } from './utils'

const MODULE_NAME = 'Main'

// Services initialization
const initServices = async () => {
  const authStore = useAuthStore()
  await authStore.initializeDefaultUsers?.()
}

// App initialization
async function initializeApp() {
  try {
    DebugUtils.info(MODULE_NAME, 'Starting application initialization')

    const app = createApp(App)
    const pinia = createPinia()

    // Register plugins
    app.use(pinia)
    app.use(router)
    app.use(vuetify)

    // Initialize services
    await initServices()

    // Mount application
    app.mount('#app')

    DebugUtils.info(MODULE_NAME, 'Application initialized successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to initialize application', { error })

    // Here we can add global error handling
    // For example, show error notification or redirect to error page
  }
}

initializeApp()
