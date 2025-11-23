// src/plugins/vuetify.ts
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

// Design tokens (matches src/styles/variables.scss)
const colors = {
  primary: '#A395E9',
  secondary: '#BFB5F2',
  background: '#141416',
  surface: '#1A1A1E',
  error: '#FF9676',
  success: '#92C9AF',
  warning: '#FFB076'
}

export const vuetify = createVuetify({
  components,
  directives,
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi }
  },
  defaults: {
    VBtn: {
      variant: 'elevated',
      height: 44
    },
    VTextField: {
      variant: 'outlined'
    },
    VSelect: {
      variant: 'outlined',
      menuProps: {
        zIndex: 9999,
        contentClass: 'v-select-menu-content'
      }
    },
    VAutocomplete: {
      variant: 'outlined',
      menuProps: {
        zIndex: 9999,
        contentClass: 'v-autocomplete-menu-content'
      }
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
    VListItem: {
      minHeight: 44,
      rounded: 'lg'
    },
    VTooltip: {
      activator: 'parent',
      location: 'top',
      openDelay: 500,
      closeDelay: 100,
      transition: 'fade-transition',
      offset: 4,
      scrim: false,
      contained: false
    },
    VMenu: {
      closeOnContentClick: true,
      closeOnBack: true,
      transition: 'scale-transition',
      scrim: false,
      contained: false,
      zIndex: 9999
    },
    VDialog: {
      scrim: true,
      persistent: false,
      zIndex: 2400
    },
    VOverlay: {
      scrim: false,
      contained: true,
      persistent: false
    },
    VSnackbar: {
      scrim: false,
      contained: false,
      persistent: false,
      zIndex: 9999
    }
  },
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          background: colors.background,
          surface: colors.surface,
          primary: colors.primary,
          secondary: colors.secondary,
          error: colors.error,
          success: colors.success,
          warning: colors.warning
        }
      }
    }
  }
})
