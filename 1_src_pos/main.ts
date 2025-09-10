import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from '@/router'
import { vuetify } from '@/plugins/vuetify'
// Импортируем стили Vuetify
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
// Импортируем наши кастомные стили после Vuetify
import '@/theme/theme.css'
// Импортируем stores
import { useDiscountStore } from '@/stores/discount.store'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// Инициализируем stores
const discountStore = useDiscountStore()

discountStore.initializeDiscounts()

app.use(vuetify)
app.use(router)
app.mount('#app')
