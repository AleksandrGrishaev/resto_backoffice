// src/theme/index.ts
import { ThemeDefinition } from 'vuetify'
import { themeColors } from './colors'
import { componentDefaults } from './defaults'

export const darkTheme: ThemeDefinition = {
  dark: true,
  colors: themeColors
}

export const createThemeConfig = () => ({
  defaultTheme: 'dark',
  themes: {
    dark: darkTheme
  }
})

export { themeColors, componentDefaults }
