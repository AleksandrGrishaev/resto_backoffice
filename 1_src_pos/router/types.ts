import type { UserRole } from '@/types/auth' // Импортируем тип из auth

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    roles?: UserRole[]
  }
}
