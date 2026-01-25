# Architecture Guide - Kitchen App (Backoffice)

> **Purpose**: This document describes the architectural patterns, structure, and best practices used in the Kitchen App. Use this as a reference when building similar applications with the same architecture.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Principles](#core-principles)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Store Architecture](#store-architecture)
6. [Component Architecture](#component-architecture)
7. [Router & Navigation](#router--navigation)
8. [Initialization System](#initialization-system)
9. [Environment Configuration](#environment-configuration)
10. [Data Persistence](#data-persistence)
11. [UI/UX Patterns](#uiux-patterns)
12. [Build & Development](#build--development)
13. [Best Practices](#best-practices)

---

## Overview

### Application Type

**Single Repository + Role-based UI Architecture**

- One codebase → Multiple deployment targets
- Role-based feature loading (lazy initialization)
- Multiple interfaces within single app:
  - **Backoffice**: Admin/Manager interface (online-first)
  - **POS**: Point of Sale (offline-first)
  - **Kitchen**: Kitchen display system

### Deployment Targets

- **Web**: Browser-based (Vercel hosting)
- **Mobile**: Capacitor-based iOS/Android apps

---

## Core Principles

#

### 2. Modular Store Design

**Pattern**: Domain-driven stores with clear boundaries

```
Store Module Structure:
store/
├── index.ts              # Public API (exports types, store, services, composables)
├── types.ts              # Type definitions
├── {name}Store.ts        # Main store (Pinia)
├── services.ts           # Persistence layer (API/localStorage)
├── composables/          # Reusable logic
│   ├── useFeatureA.ts
│   └── useFeatureB.ts
└── [optional folders]
    ├── integrations/     # External system integrations
    └── utils/            # Helper functions
```

**Key Rules**:

- Each store exports everything via `index.ts` (single import point)
- Composables extract reusable logic from stores
- Services handle all persistence (abstract storage implementation)
- Types are co-located with the domain

### 3. Separation of Concerns

**Three-Layer Architecture**:

```
UI Layer (Views/Components)
    ↓
Store Layer (Pinia stores + Composables)
    ↓
Service Layer (API/localStorage/Supabase)
```

**Example**:

```typescript
// ❌ BAD: UI directly calls API
async function saveProduct() {
  await fetch('/api/products', { ... })
}

// ✅ GOOD: UI → Store → Service
async function saveProduct() {
  await productsStore.createProduct(productData)
}

// Store implementation
async createProduct(data: CreateProductData) {
  return await productService.create(data)
}
```

### 5. Type Safety

**Strict TypeScript Configuration**:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

**Patterns**:

- Use `interface` for object shapes
- Use `type` for unions and complex types
- Export all types via `index.ts`
- Use `import type { ... }` for type-only imports

---

## Tech Stack

### Core Framework

- **Vue 3.5+**: Composition API with `<script setup>`
- **TypeScript 5.3+**: Strict mode enabled
- **Pinia 2.2+**: State management (replaces Vuex)
- **Vue Router 4**: Client-side routing

### UI Framework

- **Vuetify 3.7+**: Material Design component library
- **SCSS**: Custom styling with design tokens
- **@mdi/font**: Material Design Icons

### Backend & Database

- **Supabase**: Primary backend (PostgreSQL + Auth + Realtime)
- **MCP Integration**: Direct database operations via Claude Code

### Build & Tools

- **Vite 5+**: Build tool and dev server
- **ESLint + Prettier**: Code quality
- **Husky + lint-staged**: Pre-commit hooks
- **Capacitor**: Mobile deployment

### Development Tools

- **TSX**: TypeScript script execution (for seeding)
- **date-fns**: Date manipulation
- **lodash**: Utility functions

---

## Project Structure

### Directory Layout

Возможно я все же добавил изначальные папки backend \ frontend - даже если это vue, и в backend поместил supabase, может еще что. Или потом сервер отдельно. Так как есть тяжелые запросы, которые не должны обрабатываться на frontend

```
backoffice/
├── .env.development          # Dev environment variables
├── .env.production           # Prod environment variables
├── .mcp.json                 # MCP Supabase integration config
├── CLAUDE.md                 # Claude Code instructions
│
├── src/
│   ├── main.ts               # App entry point (minimal bootstrap)
│   ├── App.vue               # Root component (handles initialization)
│   │
│   ├── config/
│   │   └── environment.ts    # Centralized environment config
│   │
│   ├── core/                 # Core systems
│   │   ├── appInitializer.ts # Orchestrates store initialization
│   │   ├── initialization/   # Initialization strategies
│   │   │   ├── types.ts
│   │   │   ├── DevInitializationStrategy.ts
│   │   │   └── ProductionInitializationStrategy.ts
│   │   ├── sync/             # Background sync system
│   │   │   ├── SyncService.ts
│   │   │   ├── types.ts
│   │   │   ├── storage/
│   │   │   └── adapters/
│   │   └── hmrState.ts       # Hot module reload optimization
│   │
│   ├── stores/               # Pinia stores (domain-driven)
│   │   ├── auth/             # Authentication & permissions
│   │   │   ├── index.ts
│   │   │   ├── authStore.ts
│   │   │   ├── types.ts
│   │   │   ├── composables/
│   │   │   │   ├── useAuth.ts
│   │   │   │   └── usePermissions.ts
│   │   │   └── services/
│   │   │       └── session.service.ts
│   │   │
│   │   ├── pos/              # POS system (complex subsystem)
│   │   │   ├── index.ts      # Coordinator (not data store)
│   │   │   ├── types.ts
│   │   │   ├── orders/       # Order management
│   │   │   │   ├── ordersStore.ts
│   │   │   │   ├── services.ts
│   │   │   │   └── composables/
│   │   │   ├── tables/       # Table management
│   │   │   ├── payments/     # Payment processing
│   │   │   └── shifts/       # Shift management
│   │   │
│   │   ├── productsStore/    # Product catalog
│   │   │   ├── index.ts
│   │   │   ├── productsStore.ts
│   │   │   ├── types.ts
│   │   │   ├── services.ts
│   │   │   └── composables/
│   │   │
│   │   ├── recipes/          # Recipe management
│   │   ├── storage/          # Warehouse operations
│   │   ├── supplier_2/       # Supplier management
│   │   ├── menu/             # Menu configuration
│   │   ├── account/          # Financial accounts
│   │   ├── counteragents/    # Business partners
│   │   └── kitchen/          # Kitchen display system
│   │
│   ├── views/                # Page-level components
│   │   ├── auth/             # Login, Unauthorized
│   │   ├── products/         # Products management
│   │   ├── recipes/          # Recipes management
│   │   ├── menu/             # Menu configuration
│   │   ├── storage/          # Warehouse operations
│   │   ├── supplier_2/       # Supplier management
│   │   ├── pos/              # POS interface
│   │   │   ├── PosMainView.vue     # Main entry point
│   │   │   ├── tables/             # Table UI components
│   │   │   ├── order/              # Order UI components
│   │   │   ├── menu/               # Menu selection UI
│   │   │   └── shifts/             # Shift management UI
│   │   ├── kitchen/          # Kitchen display
│   │   └── debug/            # Debug tools (dev only)
│   │
│   ├── components/           # Reusable components
│   │   ├── common/           # Generic UI components
│   │   └── [feature]/        # Feature-specific components
│   │
│   ├── layouts/              # Layout components
│   │   ├── MainLayout.vue    # Default layout (sidebar + header)
│   │   ├── AuthLayout.vue    # Login layout
│   │   └── PosLayout.vue     # POS full-screen layout
│   │
│   ├── router/               # Vue Router configuration
│   │   └── index.ts          # Routes + guards
│   │
│   ├── composables/          # Global composables
│   │   ├── usePlatform.ts    # Platform detection (web/mobile)
│   │   └── usePersistence.ts # Adaptive persistence
│   │
│   ├── utils/                # Utility functions
│   │   ├── debugger.ts       # Debug utilities (DebugUtils)
│   │   ├── time.ts           # Time utilities (TimeUtils)
│   │   ├── currency.ts       # Currency formatting
│   │   ├── formatter.ts      # General formatters
│   │   └── id.ts             # ID generation
│   │
│   ├── styles/               # Global styles
│   │   ├── main.scss         # Utility classes
│   │   └── variables.scss    # Design tokens
│   │
│   ├── supabase/             # Supabase integration
│   │   ├── client.ts         # Supabase client instance
│   │   ├── types.gen.ts      # Generated types from DB
│   │   ├── migrations/       # Database migrations
│   │   └── functions/        # RPC function source code
│   │
│   └── repositories/         # Repository pattern (legacy)
│       └── base/
│           ├── IRepository.ts
│           └── LocalStorageRepository.ts
│
├── public/                   # Static assets
└── dist/                     # Build output
```

### Key Directories

**`src/stores/`**: Domain-driven stores

- Each domain has its own folder
- Complex domains (like `pos/`) have sub-modules
- Always export via `index.ts`

**`src/views/`**: Page-level components

- Mirror store structure for consistency
- Views use stores and composables
- No business logic in views

**`src/components/`**: Reusable UI components

- Generic components in `common/`
- Feature-specific components in feature folders

**`src/core/`**: Core systems

- Initialization logic
- Background sync
- HMR optimization

**`src/utils/`**: Utility functions

- Centralized utilities (avoid duplication)
- DebugUtils, TimeUtils, currency formatting, etc.

---

## Store Architecture

### Store Module Pattern

**Template for a new store:**

```typescript
// src/stores/example/index.ts
export type { ExampleItem, CreateExampleData, UpdateExampleData } from './types'
export { useExampleStore } from './exampleStore'
export { exampleService } from './services'
export { useExampleFeature } from './composables/useExampleFeature'

// src/stores/example/types.ts
export interface ExampleItem {
  id: string
  name: string
  createdAt: string
}

export interface CreateExampleData {
  name: string
}

export interface UpdateExampleData {
  id: string
  name?: string
}

// src/stores/example/exampleStore.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ExampleItem, CreateExampleData, UpdateExampleData } from './types'
import { exampleService } from './services'

export const useExampleStore = defineStore('example', () => {
  // State
  const items = ref<ExampleItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)

  // Getters
  const itemCount = computed(() => items.value.length)
  const hasError = computed(() => error.value !== null)

  // Actions
  async function initialize(): Promise<void> {
    if (initialized.value) return

    loading.value = true
    error.value = null

    try {
      const result = await exampleService.loadAll()
      if (result.success && result.data) {
        items.value = result.data
        initialized.value = true
      } else {
        throw new Error(result.error || 'Failed to load items')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  async function createItem(data: CreateExampleData): Promise<void> {
    loading.value = true
    error.value = null

    try {
      const result = await exampleService.create(data)
      if (result.success && result.data) {
        items.value.push(result.data)
      } else {
        throw new Error(result.error || 'Failed to create item')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearError(): void {
    error.value = null
  }

  return {
    // State
    items,
    loading,
    error,
    initialized,
    // Getters
    itemCount,
    hasError,
    // Actions
    initialize,
    createItem,
    clearError
  }
})

// src/stores/example/services.ts
import type { ExampleItem, CreateExampleData } from './types'
import type { ServiceResponse } from '@/repositories/base'
import { supabase } from '@/supabase/client'

export const exampleService = {
  async loadAll(): Promise<ServiceResponse<ExampleItem[]>> {
    try {
      const { data, error } = await supabase
        .from('example_items')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      return {
        success: true,
        data: data || [],
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'api'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load items',
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'api'
        }
      }
    }
  },

  async create(data: CreateExampleData): Promise<ServiceResponse<ExampleItem>> {
    try {
      const { data: result, error } = await supabase
        .from('example_items')
        .insert([data])
        .select()
        .single()

      if (error) throw error

      return {
        success: true,
        data: result,
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'api'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create item',
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'api'
        }
      }
    }
  }
}

// src/stores/example/composables/useExampleFeature.ts
import { computed } from 'vue'
import { useExampleStore } from '../exampleStore'

export function useExampleFeature() {
  const store = useExampleStore()

  const activeItems = computed(() => store.items.filter(item => item.active))

  async function doSomethingComplex(itemId: string): Promise<void> {
    // Complex business logic extracted to composable
    const item = store.items.find(i => i.id === itemId)
    if (!item) throw new Error('Item not found')

    // ... complex logic ...
  }

  return {
    activeItems,
    doSomethingComplex
  }
}
```

### Coordinator Store Pattern (POS Example)

**When to use**: For complex subsystems with multiple child stores

```typescript
// src/stores/pos/index.ts - Coordinator (NOT a data store)
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { usePosTablesStore } from './tables/tablesStore'
import { usePosOrdersStore } from './orders/ordersStore'
import { usePosPaymentsStore } from './payments/paymentsStore'

export const usePosStore = defineStore('pos', () => {
  const isInitialized = ref(false)

  // References to child stores
  const tablesStore = usePosTablesStore()
  const ordersStore = usePosOrdersStore()
  const paymentsStore = usePosPaymentsStore()

  // Orchestration logic
  async function initializePOS(): Promise<void> {
    if (isInitialized.value) return

    // Initialize child stores in parallel
    await Promise.all([
      tablesStore.initialize(),
      ordersStore.loadOrders(),
      paymentsStore.initialize()
    ])

    isInitialized.value = true
  }

  return {
    isInitialized,
    // Expose child stores
    tablesStore,
    ordersStore,
    paymentsStore,
    // Orchestration methods
    initializePOS
  }
})
```

**Key characteristics**:

- Coordinator doesn't hold data
- Manages initialization of child stores
- Provides unified API for subsystem
- Handles cross-store operations

---

## Component Architecture

### View Component Pattern

**Location**: `src/views/{domain}/{DomainName}View.vue`

**Structure**:

```vue
<template>
  <div class="domain-view">
    <!-- Header section -->
    <div class="toolbar">
      <h1>Page Title</h1>
      <v-btn @click="showCreateDialog">Add Item</v-btn>
    </div>

    <!-- Filters section (if applicable) -->
    <filters-component :filters="filters" @update:filters="updateFilters" />

    <!-- Main content -->
    <v-card>
      <items-list :items="store.filteredItems" :loading="store.loading" @edit="editItem" />
    </v-card>

    <!-- Dialogs -->
    <item-dialog v-model="dialogs.item" :item="selectedItem" @save="handleSave" />

    <!-- Notifications -->
    <v-snackbar v-model="notification.show">
      {{ notification.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useExampleStore } from '@/stores/example'
import type { ExampleItem } from '@/stores/example'

const store = useExampleStore()

// Local state
const dialogs = ref({ item: false })
const selectedItem = ref<ExampleItem | null>(null)
const notification = ref({ show: false, message: '' })

// Initialize store on mount
onMounted(async () => {
  if (!store.initialized) {
    await store.initialize()
  }
})

// Event handlers
function showCreateDialog() {
  selectedItem.value = null
  dialogs.value.item = true
}

function editItem(item: ExampleItem) {
  selectedItem.value = item
  dialogs.value.item = true
}

async function handleSave(data: any) {
  try {
    if (selectedItem.value) {
      await store.updateItem(data)
    } else {
      await store.createItem(data)
    }
    dialogs.value.item = false
    notification.value = { show: true, message: 'Saved successfully' }
  } catch (error) {
    notification.value = { show: true, message: 'Failed to save' }
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.domain-view {
  padding: var(--spacing-md);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-md);
}
</style>
```

### Component Types

**1. View Components** (`src/views/`)

- Page-level components
- Connected to stores
- Handle routing and initialization
- Compose smaller components

**2. Feature Components** (`src/views/{domain}/components/`)

- Domain-specific reusable components
- Example: `ProductsList.vue`, `RecipeCard.vue`
- Receive data via props, emit events

**3. Dialog Components** (`src/views/{domain}/dialogs/`)

- Modal dialogs for CRUD operations
- Example: `ProductDialog.vue`, `OrderCheckoutDialog.vue`
- Use `v-model` for show/hide state

**4. Common Components** (`src/components/common/`)

- Generic reusable components
- Example: `BaseButton.vue`, `ConfirmDialog.vue`
- No domain knowledge

### Component Communication

**Props down, events up**:

```vue
<!-- Parent -->
<template>
  <item-list :items="filteredItems" :loading="loading" @edit="handleEdit" @delete="handleDelete" />
</template>

<!-- Child -->
<script setup lang="ts">
defineProps<{
  items: Item[]
  loading: boolean
}>()

const emit = defineEmits<{
  edit: [item: Item]
  delete: [id: string]
}>()
</script>
```

**Store access**:

```typescript
// ✅ GOOD: Access store in view component
// src/views/products/ProductsView.vue
const store = useProductsStore()

// ✅ GOOD: Pass data to child via props
<products-list :items="store.products" />

// ❌ BAD: Access store in child component
// Child components should receive data via props
```

---

## Router & Navigation

### Route Structure

```typescript
// src/router/index.ts
const routes: RouteRecordRaw[] = [
  // Auth routes (no layout)
  {
    path: '/auth',
    component: AuthLayout,
    children: [{ path: 'login', component: LoginView }]
  },

  // Backoffice routes (MainLayout)
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true, allowedRoles: ['admin', 'manager'] },
    children: [
      { path: 'products', component: ProductsView },
      { path: 'recipes', component: RecipesView }
      // ... more routes
    ]
  },

  // POS routes (no layout, full-screen)
  {
    path: '/pos',
    component: PosMainView,
    meta: { requiresAuth: true, allowedRoles: ['admin', 'cashier'] }
  },

  // Debug routes (dev only)
  {
    path: '/debug',
    component: DebugView,
    meta: { requiresAuth: true, devOnly: true }
  }
]
```

### Navigation Guards

**Authentication guard**:

```typescript
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  if (requiresAuth && !authStore.isAuthenticated) {
    return next({ path: '/auth/login', query: { redirect: to.fullPath } })
  }

  next()
})
```

**Role-based guard**:

```typescript
router.beforeEach((to, from, next) => {
  const { hasAnyRole } = usePermissions()
  const allowedRoles = to.meta.allowedRoles as UserRole[] | undefined

  if (allowedRoles && !hasAnyRole(allowedRoles)) {
    return next('/unauthorized')
  }

  next()
})
```

**Lazy store loading guard** (Sprint 10):

```typescript
const createLazyStoreGuard = (
  storeName: string,
  loader: () => Promise<void>
) => {
  return async (_to, _from, next) => {
    try {
      await loader()
      next()
    } catch (error) {
      console.error(`Failed to load store ${storeName}`, error)
      next()
    }
  }
}

// Usage in route
{
  path: 'storage',
  component: StorageView,
  beforeEnter: createLazyStoreGuard('storage', async () => {
    const { useStorageStore } = await import('@/stores/storage')
    await useStorageStore().initialize()
  })
}
```

### Default Route Selection

```typescript
// src/stores/auth/composables/useAuth.ts
function getDefaultRoute(): string {
  const user = currentUser.value
  if (!user) return '/auth/login'

  const roles = user.roles || []

  // Admin/Manager → Backoffice
  if (roles.includes('admin') || roles.includes('manager')) {
    return '/menu'
  }

  // Cashier/Waiter → POS
  if (roles.includes('cashier') || roles.includes('waiter')) {
    return '/pos'
  }

  // Kitchen → Kitchen display
  if (roles.includes('kitchen')) {
    return '/kitchen'
  }

  return '/menu' // Default fallback
}
```

---

## Initialization System

### Overview

The initialization system (`src/core/appInitializer.ts`) orchestrates the loading of stores based on user roles and context.

### Strategy Pattern

**Dev Strategy**: Aggressive caching, debug logging

```typescript
export class DevInitializationStrategy implements InitializationStrategy {
  async initializeCriticalStores(roles: UserRole[]): Promise<StoreInitResult[]> {
    // Load all critical stores in parallel
    const results = await Promise.all([
      this.initStore('products', () => useProductsStore().initialize()),
      this.initStore('recipes', () => useRecipesStore().initialize())
      // ...
    ])
    return results
  }
}
```

**Production Strategy**: Lazy loading, minimal logging

```typescript
export class ProductionInitializationStrategy implements InitializationStrategy {
  async initializeCriticalStores(roles: UserRole[]): Promise<StoreInitResult[]> {
    // Load only essential stores
    // Defer others to route-based lazy loading
  }
}
```

### Context-Aware Initialization

```typescript
// Determine context from route
const context = getContextFromPath(window.location.pathname)
// context: 'backoffice' | 'pos' | 'kitchen'

// Initialize stores for that context only
await appInitializer.initializeForContext(context, userRoles)
```

### HMR Optimization

**Problem**: Hot module reload reinitializes all stores (slow)

**Solution**: Cache initialization state

```typescript
// src/core/hmrState.ts
export function saveHMRState(storesInitialized: boolean, userRoles: UserRole[]) {
  sessionStorage.setItem(
    'hmr_state',
    JSON.stringify({
      storesInitialized,
      userRoles,
      timestamp: Date.now()
    })
  )
}

export function shouldReinitializeStores(currentRoles: UserRole[]): boolean {
  const state = getHMRState()
  if (!state) return true

  // Reinitialize if roles changed
  if (JSON.stringify(state.userRoles) !== JSON.stringify(currentRoles)) {
    return true
  }

  // Reinitialize if state is old (> 5 minutes)
  if (Date.now() - state.timestamp > 5 * 60 * 1000) {
    return true
  }

  return false
}
```

---

## Environment Configuration

### Configuration Files

```
.env.development        # Development config
.env.production         # Production config
.env.mobile             # Mobile-specific overrides
.env.seed.production    # Production seeding (service key)
```

### Environment Structure

```typescript
// src/config/environment.ts
interface EnvironmentConfig {
  // Platform
  platform: 'web' | 'mobile'
  isMobile: boolean
  isWeb: boolean

  // Data sources
  useAPI: boolean
  useSupabase: boolean
  useFirebase: boolean

  // Offline capabilities
  enableOffline: boolean
  offlineFirst: boolean

  // Debug
  debugEnabled: boolean
  debugLevel: 'silent' | 'standard' | 'verbose'

  // Supabase
  supabase: {
    url: string
    anonKey: string
    serviceKey: string
    enabled: boolean
  }

  // POS specific
  pos: {
    offlineFirst: boolean
    cacheTTL: number
    autoSyncInterval: number
  }
}
```

### Usage

```typescript
import { ENV } from '@/config/environment'

if (ENV.useSupabase) {
  // Use Supabase client
}

if (ENV.debugEnabled) {
  DebugUtils.info('ModuleName', 'Debug message')
}
```

---

## Data Persistence

### ServiceResponse Pattern

**All persistence operations return standardized responses**:

```typescript
interface ServiceResponse<T> {
  success: boolean
  data?: T
  error?: string
  metadata?: {
    timestamp: string
    source: 'local' | 'api' | 'cache'
    version?: string
    platform?: 'web' | 'mobile'
  }
}
```

**Example**:

```typescript
const result = await productService.create(productData)

if (result.success && result.data) {
  // Success path
  products.value.push(result.data)
} else {
  // Error path
  console.error('Failed to create product:', result.error)
}
```

### Persistence Strategies

**1. Online-first (Backoffice)**:

```typescript
// Always hit API, use cache as fallback
async function loadProducts(): Promise<ServiceResponse<Product[]>> {
  try {
    const result = await api.getProducts()
    localStorage.setItem('products_cache', JSON.stringify(result.data))
    return result
  } catch (error) {
    // Fallback to cache
    const cached = localStorage.getItem('products_cache')
    if (cached) {
      return {
        success: true,
        data: JSON.parse(cached),
        metadata: { source: 'cache', timestamp: new Date().toISOString() }
      }
    }
    throw error
  }
}
```

**2. Offline-first (POS)**:

```typescript
// Write to localStorage first, sync later
async function createOrder(orderData: CreateOrderData): Promise<ServiceResponse<Order>> {
  // 1. Save to localStorage immediately
  const order: Order = {
    id: generateId(),
    ...orderData,
    createdAt: new Date().toISOString(),
    syncStatus: 'pending'
  }

  const orders = loadFromLocalStorage()
  orders.push(order)
  saveToLocalStorage(orders)

  // 2. Queue for background sync
  syncService.addToQueue({
    entityType: 'order',
    entityId: order.id,
    operation: 'create',
    priority: 'high',
    data: order
  })

  // 3. Return immediately
  return {
    success: true,
    data: order,
    metadata: { source: 'local', timestamp: order.createdAt }
  }
}
```

## UI/UX Patterns

### Design System

**Location**: `src/styles/`

**Design Tokens** (`variables.scss`):

```scss
:root {
  // Colors
  --color-primary: #1976d2;
  --color-surface: #ffffff;
  --color-error: #b00020;

  // Spacing (responsive with clamp)
  --spacing-xs: clamp(4px, 0.5vw, 8px);
  --spacing-sm: clamp(8px, 1vw, 12px);
  --spacing-md: clamp(12px, 1.5vw, 16px);
  --spacing-lg: clamp(16px, 2vw, 24px);
  --spacing-xl: clamp(24px, 3vw, 32px);

  // Typography
  --text-xs: clamp(10px, 1.5vw, 12px);
  --text-sm: clamp(12px, 1.8vw, 14px);
  --text-base: clamp(14px, 2vw, 16px);
  --text-lg: clamp(16px, 2.2vw, 18px);
  --text-xl: clamp(18px, 2.5vw, 20px);

  // Touch targets
  --touch-min: 44px;
  --touch-button: 48px;
}
```

**Utility Classes** (`main.scss`):

```scss
// Layout
.flex {
  display: flex;
}
.flex-col {
  flex-direction: column;
}
.gap-sm {
  gap: var(--spacing-sm);
}
.gap-md {
  gap: var(--spacing-md);
}

// Spacing
.p-sm {
  padding: var(--spacing-sm);
}
.p-md {
  padding: var(--spacing-md);
}
.m-sm {
  margin: var(--spacing-sm);
}

// Typography
.text-sm {
  font-size: var(--text-sm);
}
.text-base {
  font-size: var(--text-base);
}
.text-lg {
  font-size: var(--text-lg);
}

// Touch targets
.touch-target {
  min-height: var(--touch-min);
}
.h-button {
  height: var(--touch-button);
}
```

**Usage in Components**:

```vue
<template>
  <div class="flex flex-col gap-md p-md">
    <v-btn class="h-button touch-target">Click Me</v-btn>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.custom-element {
  padding: var(--spacing-md);
  font-size: var(--text-base);
  color: var(--color-primary);
}
</style>
```

### UI Language

**IMPORTANT: All user-facing UI elements MUST be in English**

- Button labels, form fields, error messages, etc.
- Internal comments can be in Russian (team preference)

---

## Build & Development

### Development Commands

```bash
# Development server (port 5174)
pnpm dev

# Type checking + build
pnpm build

# Preview production build
pnpm preview

# Linting
pnpm lint
pnpm lint:fix

# Formatting
pnpm format

# Database seeding
pnpm seed:users          # DEV database
pnpm seed:products       # DEV database
pnpm seed:users:prod     # PROD database (uses service key)
```

### Build Configuration

**Vite Config** (`vite.config.ts`):

```typescript
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    target: 'es2015',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vuetify: ['vuetify'],
          vendor: ['vue', 'vue-router', 'pinia'],
          icons: ['@mdi/font/css/materialdesignicons.css']
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: false, // Keep console.log (controlled by DebugUtils)
        drop_debugger: false
      }
    }
  },
  server: {
    port: 5174,
    hmr: {
      overlay: true
    },
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**'],
      awaitWriteFinish: {
        stabilityThreshold: 500, // Debounce file changes
        pollInterval: 100
      }
    }
  }
})
```

### TypeScript Configuration

**tsconfig.json**:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "strict": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "resolveJsonModule": true,
    "esModuleInterop": true
  }
}
```

### Git Hooks (Husky + lint-staged)

**Pre-commit**:

```json
{
  "lint-staged": {
    "*.{vue,js,ts,cjs,mjs}": ["eslint --fix"],
    "*.{json,css,scss,md}": ["prettier --write"]
  }
}
```

---

## Best Practices

### 1. Store Design

✅ **DO**:

- Export everything via `index.ts`
- Use composables for reusable logic
- Initialize stores via `initialize()` method
- Use `ServiceResponse` for all persistence operations
- Keep stores domain-focused (single responsibility)

❌ **DON'T**:

- Access other stores directly (use composables instead)
- Put UI logic in stores
- Make stores too generic (avoid "god stores")

### 2. Component Design

✅ **DO**:

- Use `<script setup>` with Composition API
- Define props and emits with TypeScript
- Keep components focused (single responsibility)
- Use utility classes from design system
- Extract complex logic to composables

❌ **DON'T**:

- Access stores in child components (use props)
- Put business logic in components
- Nest components more than 3 levels deep
- Use inline styles (use scoped SCSS)

### 3. Type Safety

✅ **DO**:

- Define interfaces for all data structures
- Use `import type { ... }` for types
- Export types via `index.ts`
- Use strict TypeScript config

❌ **DON'T**:

- Use `any` type (use `unknown` if needed)
- Disable TypeScript checks
- Use type assertions (`as`) without validation

### 4. Error Handling

✅ **DO**:

- Return `ServiceResponse` with error info
- Show user-friendly error messages
- Log errors with `DebugUtils.error()`
- Provide fallback behavior

❌ **DON'T**:

- Throw unhandled errors
- Show technical error messages to users
- Ignore errors silently

### 5. Performance

✅ **DO**:

- Lazy load stores (route-based)
- Use `computed` for derived state
- Load data in parallel when possible
- Cache frequently accessed data
- Use HMR state to avoid reinitialization

❌ **DON'T**:

- Load all stores upfront
- Recalculate values on every render
- Make unnecessary API calls
- Store large objects in reactive state

### 6. Code Organization

✅ **DO**:

- Follow the established directory structure
- Co-locate related files (types, services, composables)
- Use path aliases (`@/stores/...`)
- Keep files under 500 lines

❌ **DON'T**:

- Mix concerns in one file
- Create deep directory hierarchies
- Use relative imports (`../../..`)

### 7. Debugging

✅ **DO**:

- Use `DebugUtils` for all logging
- Set module names consistently
- Use emoji prefixes for visual scanning
- Control debug output with `ENV.debugLevel`

```typescript
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ProductsStore'

DebugUtils.info(MODULE_NAME, '📦 Loading products...')
DebugUtils.store(MODULE_NAME, '✅ Products loaded', { count: products.length })
DebugUtils.error(MODULE_NAME, '❌ Failed to load products', { error })
```

❌ **DON'T**:

- Use `console.log` directly
- Leave debug logs in production code
- Log sensitive data

---

## Migration Guide

### From Firebase to Supabase

The app is currently migrating from Firebase to Supabase. Here's the pattern:

**Before (Firebase)**:

```typescript
import { db } from '@/firebase/config'
import { collection, getDocs } from 'firebase/firestore'

const snapshot = await getDocs(collection(db, 'products'))
const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
```

**After (Supabase)**:

```typescript
import { supabase } from '@/supabase/client'

const { data: products, error } = await supabase.from('products').select('*')

if (error) throw error
```

**Migration Strategy**:

2. Add `ENV.useSupabase` flag in environment config
3. Implement Supabase version first
4. Test in parallel
5. Switch flag to enable Supabase
6. Remove Firebase code once stable

---

## Summary Checklist

When building a new application with this architecture:

- [ ] Set up project structure matching directory layout
- [ ] Configure environment files (.env.development, .env.production)
- [ ] Implement centralized config (environment.ts)
- [ ] Create base store module structure (index.ts, types.ts, store.ts, services.ts)
- [ ] Set up router with navigation guards
- [ ] Implement AppInitializer with strategy pattern
- [ ] Create design system (variables.scss, main.scss)
- [ ] Set up TypeScript with strict config
- [ ] Configure Vite build with chunking
- [ ] Set up ESLint + Prettier + Husky
- [ ] Implement ServiceResponse pattern
- [ ] Create utility functions (DebugUtils, TimeUtils, etc.)
- [ ] Set up Supabase client
- [ ] Implement authentication system
- [ ] Create role-based initialization logic
- [ ] Set up background sync (if offline-first needed)
- [ ] Create common components (buttons, dialogs, etc.)
- [ ] Implement HMR optimization
- [ ] Set up deployment pipeline (Vercel/other)

---

## Additional Resources

- **CLAUDE.md**: Detailed project instructions for AI assistants
- **todo.md**: General project plan and strategy
- **NextTodo.md**: Current sprint with implementation details
- **src/About/errors.md**: Known issues and bugs

---

**This guide is a living document. Update it as the architecture evolves.**
