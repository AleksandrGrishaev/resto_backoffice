// src/types/scss.d.ts
declare module '*.scss' {
  const content: {
    colorPrimary: string
    colorSecondary: string
    colorBackground: string
    colorSurface: string
    colorError: string
    colorSuccess: string
    colorWarning: string
    blackPrimary: string
    blackSurface: string
    [key: string]: string
  }
  export default content
}
