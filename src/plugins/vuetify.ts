// src/plugins/vuetify.ts
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import * as variables from '@/styles/variables.scss'

export const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi }
  },
  defaults: {
    VBtn: { variant: 'elevated' },
    VTextField: { variant: 'outlined' },
    VCard: { elevation: 0 }
  },
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          background: variables.colorBackground || '#141416',
          surface: variables.colorSurface || '#1A1A1E',
          primary: variables.colorPrimary || '#A395E9',
          secondary: variables.colorSecondary || '#BFB5F2',
          error: variables.colorError || '#FF9676',
          info: '#2196F3',
          success: variables.colorSuccess || '#92C9AF',
          warning: variables.colorWarning || '#FFB076'
        }
      }
    }
  }
})
