# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kitchen App Backoffice - Vue 3 + TypeScript application for restaurant management with dual-mode operation (Backoffice for admin/manager, POS for cashiers). Built with Vite, Vuetify 3, Pinia, and Firebase.

**Tech Stack:**

- Vue 3.5+ with Composition API (`<script setup>`)
- TypeScript (strict mode enabled)
- Vuetify 3.7+ (Material Design UI)
- Pinia (state management)
- Vue Router 4
- Firebase 12+ (authentication, data persistence)
- Vite 5+ (build tool)

## Development Commands

```bash
# Development server (runs on port 5174)
pnpm dev

# Type checking and build
pnpm build

# Preview production build
pnpm preview

# Linting
pnpm lint          # Check for issues
pnpm lint:fix      # Auto-fix issues

# Formatting
pnpm format        # Format all files

# Git hooks (pre-commit)
pnpm prepare       # Install Husky hooks

# Release (creates version tag and updates changelog)
pnpm release
```

## Architecture

### Role-Based Initialization

The app uses **role-based lazy loading** to optimize initialization:

- **Admin/Manager roles**: Load backoffice stores (products, recipes, storage, suppliers, menu, etc.)
- **Cashier role**: Load POS stores only (tables, orders, payments, shifts)
- **Mixed roles**: Load both sets of stores

This is controlled in `src/core/appInitializer.ts` via the `AppInitializer` class:

- `shouldInitializeBackoffice(userRoles)` - checks for admin/manager
- `shouldInitializePOS(userRoles)` - checks for admin/cashier

### Store Architecture

Stores follow a **domain-driven pattern** with modular organization:

```
src/stores/
├── auth/              # Authentication & permissions
│   ├── composables/   # useAuth, usePermissions
│   ├── services/      # session.service.ts
│   └── authStore.ts
├── pos/               # POS system (tables, orders, payments, shifts)
│   ├── core/          # Core POS logic
│   ├── orders/        # Order management
│   ├── payments/      # Payment processing
│   ├── shifts/        # Shift management
│   ├── tables/        # Table management
│   └── index.ts       # Main POS store
├── storage/           # Warehouse operations
│   ├── composables/   # useWriteOff, useInventory
│   └── storageStore.ts
├── productsStore/     # Product catalog
├── recipes/           # Recipe management
├── menu/              # Menu configuration
├── supplier_2/        # Supplier management
├── counteragents/     # Counteragents (suppliers, customers)
├── preparation/       # Semi-finished products
└── account/           # Financial accounts
```

**Key Store Patterns:**

- Each store exports types, services, and composables via `index.ts`
- Stores use composables for reusable logic (e.g., `useWriteOff`, `useInventory`)
- Initialization happens via `initialize()` method called by AppInitializer

### Repository Pattern

The codebase uses a **Repository pattern** for data persistence (`src/repositories/base/`):

- `IRepository.ts` - Repository interface contract
- `LocalStorageRepository.ts` - localStorage implementation
- `ServiceResponse.ts` - Standardized response wrapper

Repositories abstract storage operations (Firebase, localStorage, API) from business logic.

### Environment Configuration

Configuration is centralized in `src/config/environment.ts`:

```typescript
import { ENV } from '@/config/environment'

ENV.useMockData // Use mock data instead of Firebase
ENV.useFirebase // Enable Firebase integration
ENV.debugEnabled // Enable debug logging
ENV.platform // 'web' | 'mobile'
ENV.pos.offlineFirst // POS offline-first mode
```

Environment variables are loaded from:

- `.env.development` - Development config
- `.env.production` - Production config
- `.env.mobile` - Mobile-specific config (Capacitor features)

### Router & Authentication

Router configuration: `src/router/index.ts`

**Route structure:**

- `/auth/login` - Login page (no auth required)
- `/` - Backoffice routes (admin/manager, uses MainLayout)
  - `/menu`, `/products`, `/recipes`, `/storage`, etc.
- `/pos` - POS interface (admin/cashier, no layout wrapper)
- `/debug/*` - Debug views (DEV mode only)

**Navigation Guards:**

- Authentication check via `authStore.isAuthenticated`
- Role-based access via `meta.allowedRoles` and `usePermissions().hasAnyRole()`
- Default route selection via `authStore.getDefaultRoute()` (based on user role)

### Initialization Flow

1. **main.ts**: Minimal app bootstrap (Pinia, Router, Vuetify)
2. **App.vue**: After authentication, calls `AppInitializer.initialize(userRoles)`
3. **appInitializer.ts**:
   - Loads stores based on user roles
   - Handles dependencies (products → recipes)
   - Parallel loading for independent stores
   - Shows initialization summary in console

### Debug System

Debug utilities in `src/utils/debugger.ts` (exported as `DebugUtils`):

```typescript
import { DebugUtils } from '@/utils'

DebugUtils.info(MODULE_NAME, 'Message', { data })
DebugUtils.error(MODULE_NAME, 'Error message', { error })
DebugUtils.store(MODULE_NAME, 'Store operation', { count })
DebugUtils.summary('Title', { key: 'value' })
```

Debug store (`src/stores/debug/`) provides runtime inspection of all stores.

## Code Style & Conventions

**TypeScript:**

- Strict mode enabled (noImplicitAny, noImplicitThis, noUnusedLocals, etc.)
- Use type imports: `import type { ... }`
- Prefer interfaces over types for object shapes

**Vue:**

- Use `<script setup lang="ts">` with Composition API
- Import types explicitly
- Multi-word component names rule disabled

**Linting:**

- ESLint with Vue 3 + TypeScript presets
- Prettier integration (single quotes, no semicolons, 100 char width)
- Pre-commit hooks via Husky + lint-staged

**Comments:**

- Russian comments are common in the codebase (preserved for team consistency)
- Use emojis in logs for visual clarity (✅, ❌, 🔄, 📦, etc.)

## Path Aliases

```typescript
'@' → 'src/'
```

Example: `import { useProductsStore } from '@/stores/productsStore'`

## Firebase Integration

Firebase config: `src/firebase/config.ts`

Firebase is used for:

- Authentication (`src/stores/auth/`)
- Data persistence (Firestore)
- Offline support (enabled via ENV.enableOffline)

Converters in `src/firebase/converters.ts` handle data transformation between Firebase and app models.

## Common Patterns

**Store initialization check:**

```typescript
if (!store.initialized) {
  await store.initialize()
}
```

**Permission checks:**

```typescript
import { usePermissions } from '@/stores/auth/composables'

const { hasAnyRole, hasRole } = usePermissions()
if (hasAnyRole(['admin', 'manager'])) {
  // ...
}
```

**Environment-based logic:**

```typescript
import { ENV } from '@/config/environment'

if (ENV.useMockData) {
  // Use mock data
} else {
  // Use Firebase
}
```

## POS System Notes

The POS module (`src/stores/pos/`) is a complex subsystem with:

- Table management (dine-in orders)
- Order processing (with real-time updates)
- Payment handling (multiple payment types)
- Shift management (opening/closing shifts)
- Offline-first capability (when enabled)

POS routes bypass the MainLayout and render directly for performance.

## Testing

Integration tests are available in `src/core/appInitializerTests.ts` and run automatically in DEV mode when `ENV.debugEnabled` is true.

## Build Configuration

Vite config (`vite.config.ts`):

- Dev server on port 5174
- Manual chunk splitting (vuetify, vendor, icons)
- Terser minification with console/debugger removal in production
- Source maps disabled in production
