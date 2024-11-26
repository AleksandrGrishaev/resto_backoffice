// src/router/types.ts
import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    permission?: string
    title?: string
  }
}

export type AppRouteLocation = RouteLocationNormalized
export type AppNavigationGuard = NavigationGuardNext

export type AppRouteGuard = (
  to: AppRouteLocation,
  from: AppRouteLocation,
  next: AppNavigationGuard
) => void | Promise<void>
