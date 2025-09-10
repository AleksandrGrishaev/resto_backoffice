// src/router/debug.routes.ts
import { RouteRecordRaw } from 'vue-router'
import DebugStorePage from '@/views/debug/stores/DebugStorePage.vue'

export const debugRoutes: RouteRecordRaw[] = [
  {
    path: '/debug/stores',
    name: 'debug-stores',
    component: DebugStorePage,
    meta: {
      layout: 'empty',
      requiresAuth: true,
      roles: ['admin', 'cashier']
    }
  }
]
