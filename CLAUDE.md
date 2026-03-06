# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL: Two Separate Databases with Dual MCP Servers

**The project uses TWO completely separate Supabase databases, each with its own MCP server:**

### Development Database

- **URL:** `https://fjkfckjpnbcyuknsnchy.supabase.co`
- **Project ref:** `fjkfckjpnbcyuknsnchy`
- **Config:** `.env.development`
- **Purpose:** Local development, testing, experiments
- **MCP tools prefix:** `mcp__supabase_dev__*`
- **Seed Scripts:** `pnpm seed:users`, `pnpm seed:products`, etc.

### Production Database

- **URL:** `https://bkntdcvzatawencxghob.supabase.co`
- **Project ref:** `bkntdcvzatawencxghob`
- **Config:** `.env.production` (anon key only) + `.env.seed.production` (service key for seeding)
- **Purpose:** Live production environment
- **MCP tools prefix:** `mcp__supabase_prod__*`
- **Seed Scripts:** `pnpm seed:users:prod`, `pnpm seed:products:prod`, etc.

### MCP Tool Naming Convention

Both databases are accessible simultaneously — no switching needed:

| Operation       | DEV database                                   | PROD database                                   |
| --------------- | ---------------------------------------------- | ----------------------------------------------- |
| List tables     | `mcp__supabase_dev__list_tables`               | `mcp__supabase_prod__list_tables`               |
| Execute SQL     | `mcp__supabase_dev__execute_sql`               | `mcp__supabase_prod__execute_sql`               |
| Apply migration | `mcp__supabase_dev__apply_migration`           | `mcp__supabase_prod__apply_migration`           |
| List migrations | `mcp__supabase_dev__list_migrations`           | `mcp__supabase_prod__list_migrations`           |
| Get advisors    | `mcp__supabase_dev__get_advisors`              | `mcp__supabase_prod__get_advisors`              |
| Get logs        | `mcp__supabase_dev__get_logs`                  | `mcp__supabase_prod__get_logs`                  |
| Generate types  | `mcp__supabase_dev__generate_typescript_types` | `mcp__supabase_prod__generate_typescript_types` |

### Important Notes

1. **Default to DEV for all development work**

   - Always use `mcp__supabase_dev__*` tools for testing, experiments, and development
   - Use `mcp__supabase_prod__*` tools only when explicitly working with production

2. **⚠️ Production safety:**

   - **Never run `mcp__supabase_prod__apply_migration` without explicit user confirmation**
   - Always test migrations on DEV first, then apply to PROD
   - Production `execute_sql` for SELECT queries is safe; for DML (INSERT/UPDATE/DELETE) — confirm with user

3. **PostgREST Schema Cache Issue:**

   - Both databases have schema cache problems
   - Tables/functions exist but not visible via PostgREST API
   - Use direct SQL via `execute_sql` or seed scripts
   - Reload cache: `NOTIFY pgrst, 'reload schema';`

4. **Seed Script Architecture:**

   ```bash
   # Development (uses .env.development)
   pnpm seed:users          # DEV database
   pnpm seed:products       # DEV database

   # Production (uses .env.seed.production with service key)
   pnpm seed:users:prod     # PROD database
   pnpm seed:products:prod  # PROD database
   ```

## ⚠️ CRITICAL: Database Migrations Policy

**MANDATORY: All database schema changes MUST be accompanied by migration files.**

### Migration Workflow

**When making ANY database changes (DDL operations), you MUST follow this process:**

1. **Test changes on DEV database first** using MCP tools:

   ```typescript
   mcp__supabase_dev__apply_migration({
     name: 'descriptive_name',
     query: 'ALTER TABLE ...'
   })
   ```

2. **Create migration file** in `src/supabase/migrations/`:

   - Naming: `NNN_descriptive_name.sql` (e.g., `011_make_codes_required.sql`)
   - Include full DDL statements
   - Add validation and rollback logic where possible
   - Document the purpose and context

3. **Migration file structure:**

   ```sql
   -- Migration: NNN_descriptive_name
   -- Description: What this migration does
   -- Date: YYYY-MM-DD
   -- Author: Your name

   -- CONTEXT: Why this change is needed

   -- PRE-MIGRATION VALIDATION (if applicable)
   -- Check data integrity before making changes

   -- ACTUAL CHANGES
   -- DDL statements here

   -- POST-MIGRATION VALIDATION
   -- Verify changes were applied correctly
   ```

4. **Apply to production:**
   - Review the migration file
   - Test on DEV first via `mcp__supabase_dev__apply_migration`
   - Apply to production via `mcp__supabase_prod__apply_migration` (with user confirmation)
   - Alternatively, apply manually via Supabase SQL Editor or CLI

### Examples of Changes Requiring Migrations

✅ **ALWAYS create migration files for:**

- Creating/altering/dropping tables
- Adding/removing/modifying columns
- Adding/removing constraints (NOT NULL, UNIQUE, FOREIGN KEY, CHECK)
- Creating/modifying indexes
- Creating/modifying database functions (RPC)
- Creating/modifying triggers
- Updating RLS policies
- Any other DDL operations

❌ **Do NOT create migration files for:**

- Data seeding (use seed scripts instead)
- Temporary development queries
- SELECT queries for data exploration

### Migration File Location

```
src/supabase/migrations/
├── 001_initial_schema.sql
├── 002_add_missing_shift_fields.sql
├── 003_update_orders_payments_schema.sql
├── ...
└── NNN_your_new_migration.sql
```

### Why This Is Critical

1. **Production Sync**: Production database must stay in sync with development
2. **Version Control**: All schema changes are tracked in git
3. **Reproducibility**: New environments can be set up from migration files
4. **Rollback Capability**: Easier to understand and potentially reverse changes
5. **Team Collaboration**: Other developers can see what changed and why
6. **Audit Trail**: Complete history of database evolution

### Common Mistake to Avoid

❌ **BAD**: Use `mcp__supabase_dev__apply_migration` on DEV → forget to create migration file → production gets out of sync

✅ **GOOD**: `mcp__supabase_dev__apply_migration` on DEV → create migration file → `mcp__supabase_prod__apply_migration` on PROD (with confirmation)

**Remember: Always test on DEV first. Always create migration files. Confirm before applying to PROD.**

## ⚠️ CRITICAL: RPC Functions Policy

**MANDATORY: All Supabase RPC functions MUST be version-controlled in two places:**

```
src/supabase/
├── migrations/025_complete_receipt_rpc.sql  # Migration (applied to DB)
└── functions/complete_receipt_full.sql      # Source code (for git/reference)
```

**Why two copies?**

- `migrations/` - Applied to DB via `mcp__supabase_dev__apply_migration` / `mcp__supabase_prod__apply_migration`
- `functions/` - Version-controlled source code with comments (NOT executed)

**Workflow:**

1. Write function in `functions/function_name.sql` with detailed comments
2. Copy same code to `migrations/NNN_function_name.sql`
3. Apply migration to DEV: `mcp__supabase_dev__apply_migration({ name, query })`
4. Use in client: `supabase.rpc('function_name', { params })`

**Best practices:**

- Always use `SECURITY DEFINER` for permissions
- Always return JSONB: `{ success: boolean, ... }`
- Always include `EXCEPTION WHEN OTHERS` for error handling
- Always test on DEV first

**⚠️ PostgREST registration:** Always use `mcp__supabase_dev__apply_migration` (or `_prod__`) to create functions. Manual SQL Editor functions require cache reload.

## Documentation Structure

The project uses a structured approach to documentation and task management:

### Task Management Files

- **`todo.md`** - General plan, strategy and tactics

  - High-level roadmap
  - Strategic direction
  - General tasks without detailed code examples
  - Long-term goals and phases

- **`NextTodo.md`** - Current sprint with detailed implementation

  - Current sprint tasks
  - Detailed implementation plans
  - Code examples and snippets
  - Step-by-step instructions
  - Migration queries and SQL

- **`src/About/errors.md`** - All discovered errors and issues
  - Bug reports
  - Error logs
  - Known issues
  - Workarounds and fixes

### Slash Commands

- **`/todo`** - View or update general project plan (todo.md)
- **`/next_todo`** - View or update current sprint (NextTodo.md)

## How to Work with Sprints

1. **Planning Phase:**

   - Update `todo.md` with strategic goals
   - Break down into phases and milestones
   - Keep it high-level

2. **Sprint Start:**

   - Create/update `NextTodo.md` with current sprint
   - Add detailed implementation steps
   - Include code examples, migrations, queries

3. **During Development:**

   - Track errors in `src/About/errors.md`
   - Update `NextTodo.md` with progress
   - Mark completed tasks

4. **Sprint Complete:**
   - Archive sprint details from `NextTodo.md`
   - Update `todo.md` with next phase
   - Clean up `NextTodo.md` for next sprint

**IMPORTANT: All project files MUST use UTF-8 encoding.**

## Project Overview

Kitchen App - **единое приложение** с множественными интерфейсами и режимами работы для управления рестораном.

**Архитектурный подход: Single Repository + Role-based UI**

Один код → множественные варианты развертывания:

- **Backoffice** (админ/менеджер): Online-first, полный функционал управления
- **POS** (кассиры/официанты): Offline-first, критические операции продаж
- **Deployment**: Web app (браузер) + Mobile app (Capacitor)

**Tech Stack:**

- Vue 3.5+ with Composition API (`<script setup>`)
- TypeScript (strict mode enabled)
- Vuetify 3.7+ (Material Design UI)
- Pinia (state management)
- Vue Router 4
- Supabase (database, authentication - replacing Firebase)
- Vite 5+ (build tool)
- Capacitor (mobile deployment)

## ⚠️ Build Policy

**Do NOT run `pnpm build` automatically.** Only run it when the user explicitly asks to check for errors or build the project. The build takes significant time and should not be triggered by default after code changes.

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

**Two architectural approaches:**

1. **Backoffice (Store + Service)**: Online-first, simple pattern

   ```
   UI Components → Pinia Store → Service Layer → API/localStorage
   ```

   - Easy development and debugging
   - Synchronous operations with async interfaces
   - Easy transition from localStorage to API

2. **POS (Store + Repository + Sync)**: Offline-first, complex pattern
   ```
   UI Components → Pinia Store → Repository Interface → Local/API Repository + Sync Service
   ```
   - Instant UI response
   - Automatic background synchronization
   - Conflict resolution strategies
   - Critical for operations without internet

Repositories abstract storage operations (Firebase, localStorage, API) from business logic.

### Environment Configuration

Configuration is centralized in `src/config/environment.ts`:

```typescript
import { ENV } from '@/config/environment'

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

## UI/UX Guidelines

**IMPORTANT: All user-facing UI elements MUST be in English.**

- All component labels, buttons, placeholders, and error messages in English
- Internal comments can be in Russian (for team consistency)

**Styling System (`src/styles/`):**

When creating UI components, use the existing design system:

- `src/styles/variables.scss` - Design tokens (colors, spacing, typography, touch targets)
- `src/styles/main.scss` - Utility classes (`.flex`, `.p-md`, `.text-lg`, `.gap-sm`, etc.)

```vue
<template>
  <!-- Use utility classes for consistent styling -->
  <div class="flex flex-col gap-md p-md">
    <v-btn class="h-button touch-target">Click Me</v-btn>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.custom-element {
  padding: var(--spacing-md);
  color: var(--color-primary);
  font-size: var(--text-base);
}
</style>
```

**Key design tokens:**

- Colors: `--color-primary`, `--color-surface`, `--black-primary`
- Spacing: `--spacing-xs/sm/md/lg/xl` (responsive with clamp)
- Typography: `--text-xs/sm/base/lg/xl/2xl/3xl`
- Touch targets: `--touch-min` (44px), `--touch-button` (48px)

## Utility Functions

Centralized utilities in `src/utils/` - always use these instead of reimplementing:

```typescript
import { DebugUtils, TimeUtils, formatIDR, generateId } from '@/utils'

// Debugging with blacklist filtering
DebugUtils.info(MODULE_NAME, 'Message', { data })
DebugUtils.store(MODULE_NAME, 'Store operation', { count })

// Time operations
TimeUtils.getCurrentLocalISO()
TimeUtils.formatDateForDisplay(date) // "15 Jan 2024"
TimeUtils.formatDateTimeForDisplay(date) // "15 Jan 2024, 14:30"
TimeUtils.getRelativeTime(date) // "2 дня назад"

// Currency formatting
formatIDR(7500) // "Rp 7.500"
formatIDR(1250000, { compact: true }) // "Rp 1.25M"
formatIDRWithUnit(850, 'ml') // "Rp 850/ml"
parseIDR('Rp 1.250.000') // 1250000

// ID generation
generateId() // UUID
generateShortId() // Short ID
```

See `src/utils/debugger.ts`, `src/utils/time.ts`, `src/utils/currency.ts`, `src/utils/formatter.ts`, `src/utils/id.ts` for full API.

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

## Supabase Integration

Supabase config: `src/config/environment.ts` (supabase section)

Supabase is used for:

- Database (PostgreSQL)
- Authentication (future migration from local storage)
- Real-time subscriptions (implemented for Kitchen and POS)
- Storage (future implementation)

Current state: Fully integrated for most stores. Uses Supabase as primary data source with localStorage for offline caching (POS only).

### Working with Database via MCP

The project has **two MCP Supabase servers** — one for DEV, one for PROD — both accessible simultaneously.

**Tool prefixes:** `mcp__supabase_dev__*` (development) and `mcp__supabase_prod__*` (production)

See the "Two Separate Databases" section above for the full tool reference table.

**Common workflows:**

```typescript
// 1. Inspect DEV database structure
mcp__supabase_dev__list_tables({ schemas: ['public'] })

// 2. Query DEV data
mcp__supabase_dev__execute_sql({
  query: 'SELECT * FROM products WHERE category = $1 LIMIT 10'
})

// 3. Apply migration to DEV first
mcp__supabase_dev__apply_migration({
  name: 'add_products_category_index',
  query: 'CREATE INDEX idx_products_category ON products(category);'
})

// 4. Then apply same migration to PROD (with user confirmation)
mcp__supabase_prod__apply_migration({
  name: 'add_products_category_index',
  query: 'CREATE INDEX idx_products_category ON products(category);'
})

// 5. Check for issues on both databases
mcp__supabase_dev__get_advisors({ type: 'security' })
mcp__supabase_prod__get_advisors({ type: 'security' })
```

**Best practices:**

- Always use `_dev__` tools for development; use `_prod__` tools only with user confirmation
- Use `list_tables` first to understand database structure
- Use `execute_sql` for DML operations (SELECT, INSERT, UPDATE, DELETE)
- Use `apply_migration` for DDL operations (CREATE, ALTER, DROP)
- Run `get_advisors` regularly after schema changes to catch missing RLS policies
- **CRITICAL: Always use `apply_migration` for creating RPC functions (stored procedures)**
  - Functions created manually via SQL Editor are NOT registered in PostgREST
  - They will NOT be accessible via Supabase REST API (`.rpc()` calls)
  - Use migrations to ensure functions are properly registered and accessible
  - Example: `mcp__supabase_dev__apply_migration({ name: 'create_auth_functions', query: 'CREATE FUNCTION ...' })`

**Quick command:** Use `/db` slash command for common database operations (see `.claude/commands/db.md`)

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

if (ENV.useSupabase) {
  // Use Supabase (primary data source)
} else if (ENV.useFirebase) {
  // Use Firebase (legacy, being phased out)
}
```

## POS System Architecture

The POS (Point of Sale) system is a complex subsystem with parallel Store and View layers.

### POS Store Layer

Location: `src/stores/pos/`

```
pos/
├── index.ts              # Main POS coordinator (posStore)
│                         # - Initialization via initializePOS()
│                         # - Shift management (startShift, endShift)
│                         # - Network status monitoring
│                         # - Server synchronization
├── types.ts              # Common POS types and interfaces
├── core/                 # Core POS business logic
│   └── posSystem.ts      # System-level operations
├── orders/               # Order management
│   ├── ordersStore.ts    # Main orders state and actions
│   ├── services.ts       # Order persistence services
│   ├── composables.ts    # Composable exports
│   └── composables/
│       ├── useOrders.ts            # Order operations logic
│       └── useOrderCalculations.ts # Order calculations (totals, tax, etc.)
├── tables/               # Table management
│   ├── tablesStore.ts    # Table state (occupied, available, reserved)
│   ├── services.ts       # Table persistence services
│   ├── types.ts          # Table-specific types
│   └── composables/
│       └── useTables.ts  # Table operations logic
├── payments/             # Payment processing
│   ├── paymentsStore.ts  # Payment state and actions
│   ├── services.ts       # Payment persistence services
│   └── composables.ts    # Payment composables
├── shifts/               # Shift management
│   ├── shiftsStore.ts    # Shift state (current, history)
│   ├── services.ts       # Shift persistence services
│   └── types.ts          # Shift-specific types
└── service/              # Service modules
    └── DepartmentNotificationService.ts  # Kitchen notifications
```

**Key Store Patterns:**

- Each module follows: `store.ts` + `services.ts` + `composables/` + `types.ts`
- `index.ts` (posStore) acts as coordinator, not data store
- Composables extract reusable logic (useOrders, useTables, useOrderCalculations)
- Services handle persistence (localStorage, API, Firebase)

### POS View Layer

Location: `src/views/pos/`

```
pos/
├── PosMainView.vue       # Main POS interface entry point
│                         # - Initialization & error handling
│                         # - Coordinates Tables + Menu + Order sections
│                         # - Uses PosLayout (full-screen, no MainLayout)
├── tables/               # Table management UI
│   ├── TablesSidebar.vue # Sidebar with table/order list
│   ├── TableItem.vue     # Individual table display
│   ├── OrderItem.vue     # Order item in sidebar
│   ├── components/       # Table-specific components
│   │   └── SidebarItem.vue
│   └── dialogs/          # Table-related dialogs
│       └── OrderTypeDialog.vue
├── order/                # Order processing UI
│   ├── OrderSection.vue  # Main order display section
│   ├── components/       # Order components
│   │   ├── BillsManager.vue    # Multiple bills management
│   │   ├── BillsTabs.vue       # Bill tabs navigation
│   │   ├── BillItem.vue        # Individual bill item
│   │   ├── OrderActions.vue    # Action buttons
│   │   ├── OrderTotals.vue     # Order totals display
│   │   └── OrderInfo.vue       # Order metadata
│   └── dialogs/          # Order-related dialogs
│       ├── CheckoutDialog.vue        # Payment checkout
│       ├── BillDiscountDialog.vue    # Discount application
│       ├── BillItemEditDialog.vue    # Edit item in bill
│       ├── BillItemCancelDialog.vue  # Cancel item
│       ├── MoveItemsDialog.vue       # Move items between bills
│       ├── BulkActionsDialog.vue     # Bulk operations
│       └── OrderTypeDialog.vue       # Change order type
├── menu/                 # Menu selection UI
│   ├── MenuSection.vue   # Main menu display section
│   └── components/       # Menu-specific components
├── shifts/               # Shift management UI
│   └── dialogs/          # Shift-related dialogs
├── components/           # Shared POS components
└── Common/               # Common utility components
```

**Key View Patterns:**

- View structure mirrors store structure (orders/, tables/, payments/, etc.)
- Each section has main component + components/ + dialogs/
- `PosMainView.vue` is the single entry point for all POS operations
- **IMPORTANT**: POS views bypass MainLayout for performance (render directly)
- Components communicate via events and store mutations

### POS Initialization Flow

1. **Router**: User navigates to `/pos` route
2. **PosMainView.vue**:
   - Checks user permissions (`canUsePOS` - admin/cashier roles)
   - Shows loading state
   - Calls `posStore.initializePOS()`
3. **posStore.initializePOS()**:
   - Verifies child stores are available (tables, orders, payments)
   - Sets up network monitoring
   - Restores active shift from localStorage
   - Marks system as initialized
4. **PosMainView.vue**: Shows main interface (Tables + Menu + Order sections)

### POS Key Features

- **Table management**: Track occupied, available, and reserved tables (dine-in orders)
- **Order processing**: Real-time order updates, multiple bills per order
- **Payment handling**: Multiple payment types (cash, card, QR)
- **Shift management**: Opening/closing shifts with reports
- **Offline-first capability**: Works without internet (when enabled)
- **Network resilience**: Auto-sync when connection restored

### Centralized SyncService (Sprint 6)

The app uses a **centralized SyncService** for managing background synchronization of all entity types.

**Architecture:**

```
src/core/sync/
├── types.ts                    # Core sync types and interfaces
├── SyncService.ts              # Main sync service (singleton)
├── storage/                    # Storage abstraction layer
│   ├── LocalStorageSyncStorage.ts   # localStorage implementation (dev/mobile)
│   ├── ApiSyncStorage.ts            # API implementation (production)
│   └── index.ts
├── adapters/                   # Entity-specific sync adapters
│   └── ShiftSyncAdapter.ts    # Shift sync to Account Store
└── migrations/
    └── migrateLegacyShiftQueue.ts  # Sprint 5 → Sprint 6 migration
```

**Key Features:**

- **Generic sync queue**: Supports any entity type (shifts, transactions, discounts, etc.)
- **Priority-based processing**: `critical` > `high` > `normal` > `low`
- **Exponential backoff**: Automatic retry with increasing delays (2^attempts, max 1 hour)
- **Storage abstraction**: Easy transition from localStorage to API
- **Adapter pattern**: Each entity implements `ISyncAdapter` for custom sync logic
- **Conflict resolution**: Configurable strategies (server-wins, local-wins, merge, manual)

**Usage:**

```typescript
import { useSyncService } from '@/core/sync/SyncService'
import { ShiftSyncAdapter } from '@/core/sync/adapters/ShiftSyncAdapter'

// Initialize (done in posStore.initializePOS())
const syncService = useSyncService()
syncService.registerAdapter(new ShiftSyncAdapter())

// Add to queue
syncService.addToQueue({
  entityType: 'shift',
  entityId: shift.id,
  operation: 'update',
  priority: 'critical',
  data: shift,
  maxAttempts: 10
})

// Process queue (auto-called on app start and network restore)
await syncService.processQueue()
```

**Production API Switch:**

```typescript
import { ENV } from '@/config/environment'
import { LocalStorageSyncStorage, ApiSyncStorage } from '@/core/sync/storage'

// Switch based on environment
const storage = ENV.useApi ? new ApiSyncStorage() : new LocalStorageSyncStorage()
const syncService = new SyncService(storage)
```

**Current Adapters:**

- `ShiftSyncAdapter`: Syncs completed shifts to Account Store (acc_1), creates income/expense/correction transactions

**Future Adapters:**

- `TransactionSyncAdapter` (Sprint 7)
- `DiscountSyncAdapter` (Sprint 8)
- `CustomerSyncAdapter` (Sprint 9)

## Testing

Integration tests are available in `src/core/appInitializerTests.ts` and run automatically in DEV mode when `ENV.debugEnabled` is true.

## Build Configuration

Vite config (`vite.config.ts`):

- Dev server on port 5174
- Manual chunk splitting (vuetify, vendor, icons)
- Terser minification with console/debugger removal in production
- Source maps disabled in production

### Deployment Modes

**Build scripts:**

```bash
pnpm build:web      # Web deployment (browser)
pnpm build:mobile   # Mobile deployment (Capacitor) + sync
pnpm ios            # Run iOS app
pnpm android        # Run Android app
```

**Environment files:**

- `.env.web` - Web mode (online-first, API enabled)
- `.env.mobile` - Mobile mode (offline-first, local storage)
- `.env.development` - Development config
- `.env.production` - Production config

## Deployment Strategy

### Vercel Hosting

The application is deployed using **Vercel** with automatic deployments:

**Deployment Flow:**

```
Push to dev  → Vercel Auto-build → Preview Deployment
Push to main → Vercel Auto-build → Production Deployment
```

**Environments:**

1. **Preview (Development)**

   - Branch: `dev`
   - Auto-generated preview URL
   - Debug enabled
   - Auto-deploy on every push

2. **Production**
   - Branch: `main`
   - Production domain
   - Debug disabled
   - Auto-deploy on every push

**Vercel Configuration:**

- Framework: Vite (auto-detected)
- Build command: `pnpm build`
- Output directory: `dist`
- Environment variables: Configured in Vercel Dashboard

**IMPORTANT Security:**

- **NEVER** use `VITE_SUPABASE_SERVICE_KEY` in any Vercel deployment
- Service keys only for local development
- All deployed environments use `VITE_SUPABASE_ANON_KEY` with RLS policies

## Persistence Strategies

### Adaptive Persistence Layer

The app uses role-based persistence strategies via `usePersistence()` composable:

**Online-first (Backoffice roles):**

```
API Request → Success: Update Local Cache
           → Failure: Show Error + Use Cache if available
```

**Offline-first (POS roles):**

```
Local Storage → Always works (instant UI)
             → Queue for Sync → Background API calls
```

**Hybrid (Shared data):**

```
Check Online → Online: API + Update Cache
            → Offline: Use Cache + Queue updates
```

### Platform Detection

Use `usePlatform()` composable to adapt logic:

```typescript
import { usePlatform } from '@/composables/usePlatform'

const { isMobile, isWeb, platform, offlineEnabled } = usePlatform()

// Conditional initialization
if (isMobile.value && offlineEnabled) {
  await initializeOfflineSync()
}
```

## User Roles

```typescript
type UserRole = 'admin' | 'manager' | 'cashier' | 'waiter' | 'kitchen'
```

**Role behaviors:**

- **admin/manager**: Backoffice access, online-first, full functionality
- **cashier/waiter**: POS access, offline-first (mobile), critical operations only
- **kitchen**: Kitchen display system (future)

**Mixed roles**: Users with multiple roles load both Backoffice and POS stores

## ServiceResponse Pattern

All persistence operations return standardized responses:

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

This enables consistent error handling and debugging across all stores.
