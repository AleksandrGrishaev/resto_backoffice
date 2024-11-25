// src/router/types.ts
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    permission?: string
    title: string
  }
}
