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
    // Ключи должны точно соответствовать названиям компонентов
    VBtn: {
      variant: 'elevated',
      height: 44
    },
    VTextField: {
      variant: 'outlined'
    },
    VCard: {
      elevation: 0
    },
    VToolbar: {
      height: 44
    },
    VFooter: {
      height: 44
    },
    VList: {
      // Для списка лучше задавать настройки через пропсы в компоненте
      // так как они могут варьироваться
    },
    VListItem: {
      minHeight: 44,
      rounded: 'lg'
    },
    // ИСПРАВЛЕНИЯ ДЛЯ TOOLTIP И OVERLAY:
    VTooltip: {
      activator: 'parent',
      location: 'top',
      openDelay: 500,
      closeDelay: 100,
      transition: 'fade-transition',
      offset: 4
    },
    VMenu: {
      closeOnContentClick: true,
      closeOnBack: true,
      transition: 'scale-transition'
    },
    VOverlay: {
      scrim: false, // УБИРАЕМ ЗАТЕМНЕНИЕ!
      contained: true,
      persistent: false
    }
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
          success: variables.colorSuccess || '#92C9AF',
          warning: variables.colorWarning || '#FFB076'
        }
      }
    }
  }
})
