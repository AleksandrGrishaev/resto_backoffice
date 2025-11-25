# Kitchen App - TODO

**Last Updated:** 2025-01-25
**Current Branch:** `dev`
**Project Version:** 0.0.320
**Current Sprint:** Preparation Inventory System (see NextTodo.md)

---

## 🏗️ SYSTEM ARCHITECTURE - Inventory & Sales Flow

### Complete Hierarchy (4 Levels)

```
┌──────────────────────────────────────────────────────────────────┐
│ LEVEL 1: RAW PRODUCTS (Сырьё)                                   │
│ - Purchased from suppliers                                       │
│ - Stored in warehouse with FIFO batches                         │
│ - Can be sold directly (if canBeSold = true)                    │
│ - Examples: Tomatoes, Beef, Rice, Drinks                        │
└──────────────────────────────────────────────────────────────────┘
                        ↓ Used in recipes
┌──────────────────────────────────────────────────────────────────┐
│ LEVEL 2: PREPARATIONS (Полуфабрикаты)                           │
│ - Made from Products (recipe = list of products)                │
│ - Stored in preparation batches with FIFO                       │
│ - Have shelf life (kitchen: 2 days, bar: 7 days)                │
│ - Cannot be sold directly                                        │
│ - Examples: Burger Sauce, Pizza Dough, Marinated Meat           │
└──────────────────────────────────────────────────────────────────┘
                        ↓ Used in recipes
┌──────────────────────────────────────────────────────────────────┐
│ LEVEL 3: DISHES (Блюда)                                         │
│ - Made from Preparations + Products                              │
│ - Recipe composition can include both:                           │
│   • Preparations (e.g., 100g Burger Sauce)                      │
│   • Products (e.g., 200g Beef Patty)                            │
│ - Cannot be sold directly (not in sales system)                 │
│ - Examples: Burger, Pizza Margherita, Caesar Salad              │
└──────────────────────────────────────────────────────────────────┘
                        ↓ Used in menu
┌──────────────────────────────────────────────────────────────────┐
│ LEVEL 4: MENU ITEMS (Позиции меню)                              │
│ - Created from Dishes + Products (canBeSold = true)             │
│ - This is what customers see and order                           │
│ - Examples:                                                      │
│   • "Classic Burger" (dish) + "Coke" (product)                  │
│   • "Pizza Margherita" (dish) + "Extra Cheese" (product)        │
│ - Sold through POS system                                        │
└──────────────────────────────────────────────────────────────────┘
                        ↓ Order placed
┌──────────────────────────────────────────────────────────────────┐
│ REVERSE DECOMPOSITION (POS Sales)                               │
│                                                                  │
│ Customer orders "Classic Burger"                                 │
│         ↓                                                        │
│ Menu Item → Dish ("Burger") + Product ("Coke")                  │
│         ↓                                                        │
│ Dish → Preparations + Products                                   │
│   • Burger Sauce (100g preparation)                             │
│   • Beef Patty (200g product)                                   │
│   • Bun (2 pcs product)                                         │
│         ↓                                                        │
│ WRITE-OFF DECISION:                                             │
│                                                                  │
│ Option A (Current/Simple):                                      │
│   - Decompose preparations → raw products                        │
│   - Write off only raw products                                  │
│   - Preparation batches not consumed                             │
│                                                                  │
│ Option B (Future/Ideal):                                        │
│   - Check preparation stock                                      │
│   - If available → consume from prep batches (FIFO)             │
│   - If not → decompose to raw products                          │
│                                                                  │
│ Result: Storage/Preparation batches updated (FIFO)              │
└──────────────────────────────────────────────────────────────────┘
```

### Key Rules

1. **Production Flow (Forward):**

   ```
   Products → Preparations → Dishes → Menu Items
   ```

2. **Sales Flow (Reverse Decomposition):**

   ```
   Menu Item → Dish + Products → Preparations + Products → Raw Products
   ```

3. **Write-off Points:**

   - **Production:** Products written off when making Preparations ✅ (Sprint 1)
   - **Sales:** Products/Preparations written off when selling Menu Items 🔄 (Sprint 2)

4. **Direct Sales Exceptions:**
   - Products with `canBeSold = true` can be added to menu directly
   - Examples: Drinks, Desserts, Packaged items
   - These skip Dish/Preparation levels

---

## 🎯 SPRINT 1: Preparation Production with Auto Write-off

**Status:** 🚀 In Progress
**Duration:** 2 days
**Goal:** Implement automatic raw product write-off when producing preparations + UI for batch creation

### Sprint 1 Scope

**What we're building:**

- Products → Preparations (forward flow only)
- Auto write-off of raw products when making prep batches
- Dynamic expiry calculation (production_date + shelf_life)
- UI for creating new preparation batches with preview

**What we're NOT building (Sprint 2):**

- Menu Item decomposition
- Sales consumption tracking (reverse flow)
- POS integration
- WriteOffHistoryView integration

### Sprint 1 Phases

#### Phase 0: Database Migration ✅

- [x] Create migration file `012_add_preparation_shelf_life.sql`
- [ ] Apply to DEV database via MCP
- [ ] Test migration on production
- [ ] Verify data integrity

**Changes:**

- Add `shelf_life` column to `preparations` table
- Add `related_preparation_operation_id` to `storage_operations`
- Create performance index
- Backfill shelf_life (kitchen: 2 days, bar: 7 days)

#### Phase 1: Auto Write-off + UI 🔥

- [ ] Update `preparationService.createReceipt()` with auto write-off logic
- [ ] Update `storageService.createWriteOff()` to support `production_consumption` reason
- [ ] Update `AddPreparationProductionItemDialog.vue`:
  - [ ] Auto-calculate expiry based on shelf_life
  - [ ] Show raw products preview (what will be written off)
  - [ ] Add warning if no recipe defined
- [ ] Update TypeScript types (`WriteOffReason`, `StorageOperation`, `Preparation`)
- [ ] Add error handling and transaction rollback
- [ ] Test with real recipes

**Key Features:**

- Decompose preparation recipe → raw products
- Auto write-off products from storage (FIFO)
- Create preparation batch
- Link operations via `related_preparation_operation_id`

#### Phase 2: Dynamic Expiry Calculation

- [ ] Update `preparationStore` getters to calculate expiry dynamically
- [ ] Add `calculateExpiryDate()` helper
- [ ] Add `calculateRemainingShelfLife()` helper
- [ ] Add `isBatchExpired()` helper
- [ ] Add `getBatchesExpiringSoon()` helper
- [ ] Update all UI components to use computed expiry
- [ ] Remove hardcoded expiry calculations

**Formula:** `expiry_date = production_date + preparation.shelf_life days`

### Sprint 1 Success Criteria

1. ✅ **Auto write-off on production:** Raw products automatically deducted when making preparations
2. ✅ **No double write-off:** Products written off once (during production, not again during sales)
3. ✅ **Recipe decomposition:** Preparation recipes properly decomposed to raw products
4. ✅ **Linked operations:** Storage write-offs linked to prep operations for audit trail
5. ✅ **Dynamic expiry:** Expiry calculated on-the-fly, not stored in database
6. ✅ **UI preview:** Users see what products will be written off before confirming
7. ✅ **Type safety:** All TypeScript types updated and synchronized

### Sprint 1 Deliverables

**Database:**

- Migration applied to DEV and production
- `preparations.shelf_life` column populated
- `storage_operations.related_preparation_operation_id` ready

**Backend:**

- `preparationService.createReceipt()` with auto write-off
- `storageService.createWriteOff()` supporting new reasons
- Dynamic expiry calculation in `preparationStore`

**Frontend:**

- Enhanced `AddPreparationProductionItemDialog` with preview
- Auto-calculated expiry dates
- Warning for preparations without recipes

**Types:**

- `WriteOffReason` type updated (+ `production_consumption`)
- `StorageOperation` interface updated (+ `related_preparation_operation_id`)
- `Preparation` interface updated (+ `shelfLife`)

---

## 🎯 SPRINT 2: Sales Consumption via Reverse Decomposition

**Status:** 📋 Planned
**Duration:** 3-4 days
**Goal:** Implement Menu → Dish → Prep/Products decomposition for POS sales with hybrid consumption

### Sprint 2 Context

**The Problem:**
Currently when selling through POS, we decompose all the way to raw products:

```
Menu Item → Dish → Preparation → Raw Products (write-off)
```

But preparations exist as batches! We should consume from prep batches when available:

```
Menu Item → Dish → Preparation (check stock) → Consume prep batch OR decompose to products
```

**The Solution:**
Implement **reverse decomposition** with **hybrid consumption strategy**:

- If preparation batch available → consume from prep_batches (FIFO)
- If not available → decompose prep → consume raw products (FIFO)

### Sprint 2 Architecture

#### Current Flow (Needs Update)

```typescript
// src/stores/pos/orders/composables/useKitchenDecomposition.ts
Menu Item → Dish composition → Preparations → Products
                                      ↓
                              Recursively decompose prep.recipe
                                      ↓
                              Final result: Only raw products
```

**Problem:** Preparations always decomposed, batches never consumed

#### Target Flow (Sprint 2)

```typescript
Menu Item → Dish + Direct Products
    ↓
Dish → Preparations + Products
    ↓
For each Preparation:
  - Check prep batch stock (preparationStore.getBalance())
  - If available: Consume from preparation_batches (FIFO)
  - If not: Decompose to raw products → Consume from storage (FIFO)

For each Product:
  - Consume from storage_batches (FIFO)
```

### Sprint 2 Phases

#### Phase 1: Menu Item Decomposition (Day 1)

**Goal:** Update decomposition logic to handle Menu Items

**Tasks:**

- [ ] Analyze current `useKitchenDecomposition.ts` structure
- [ ] Add Menu Item support to decomposition
- [ ] Separate decomposition layers:
  - [ ] Menu Item → Dish + Products
  - [ ] Dish → Preparations + Products
  - [ ] Preparation → (stock check) → Prep batch OR Products
- [ ] Update `DecompositionItem` interface to track entity type
- [ ] Add tests for multi-level decomposition

**Files:**

- `src/stores/pos/orders/composables/useKitchenDecomposition.ts`
- `src/stores/menu/types.ts` (if needed)

#### Phase 2: Preparation Stock Checking (Day 1-2)

**Goal:** Add real-time preparation batch stock checking

**Tasks:**

- [ ] Create `usePreparationStockCheck.ts` composable:
  - [ ] `checkPreparationStock(prepId, quantity, department)` → boolean
  - [ ] `getAvailableBatches(prepId, department)` → PreparationBatch[]
  - [ ] `canFulfillFromStock(prepId, quantity)` → { available: boolean, shortage: number }
- [ ] Integrate with `preparationStore.getBalance()`
- [ ] Add department filtering (kitchen/bar)
- [ ] Handle edge cases (negative balance, expired batches)

**Files:**

- `src/stores/preparation/composables/usePreparationStockCheck.ts` (NEW)
- `src/stores/preparation/preparationStore.ts`

#### Phase 3: Hybrid Consumption Logic (Day 2)

**Goal:** Implement smart consumption (prep batches OR raw products)

**Tasks:**

- [ ] Create `useHybridConsumption.ts` composable:
  - [ ] `consumePreparation(prepId, quantity, orderId)` → ConsumptionResult
  - [ ] Try prep batches first (FIFO)
  - [ ] Fallback to raw product decomposition if needed
  - [ ] Track consumption source (prep_batch vs raw_products)
- [ ] Create consumption operations:
  - [ ] `preparation_operations` (type: consumption) when using batches
  - [ ] `storage_operations` (type: write_off, reason: sales_consumption) when using products
- [ ] Link consumption to order (for audit trail)
- [ ] Handle partial stock scenarios

**Files:**

- `src/stores/preparation/composables/useHybridConsumption.ts` (NEW)
- `src/stores/preparation/preparationService.ts`
- `src/stores/storage/storageService.ts`

**Consumption Decision Tree:**

```typescript
async function consumePreparation(prepId: string, quantity: number, orderId: string) {
  // 1. Check prep batch stock
  const { available, shortage } = await checkPreparationStock(prepId, quantity)

  if (available) {
    // 2a. Consume from prep batches (FIFO)
    return await consumeFromPrepBatches(prepId, quantity, orderId)
  } else if (shortage === quantity) {
    // 2b. No stock at all → decompose to raw products
    return await consumeFromRawProducts(prepId, quantity, orderId)
  } else {
    // 2c. Partial stock → hybrid approach
    // Use what's available from batches, rest from raw products
    const fromBatches = await consumeFromPrepBatches(prepId, available, orderId)
    const fromProducts = await consumeFromRawProducts(prepId, shortage, orderId)
    return { ...fromBatches, ...fromProducts }
  }
}
```

#### Phase 4: POS Integration (Day 3)

**Goal:** Integrate hybrid consumption with POS order flow

**Tasks:**

- [ ] Update `ordersStore.confirmOrder()`:
  - [ ] Decompose order items
  - [ ] Group by entity type (preparations vs products)
  - [ ] Consume preparations via `useHybridConsumption`
  - [ ] Consume products via existing logic
- [ ] Add consumption tracking to order metadata
- [ ] Show consumption details in order view
- [ ] Handle consumption errors gracefully
- [ ] Test with real POS orders

**Files:**

- `src/stores/pos/orders/ordersStore.ts`
- `src/views/pos/order/OrderSection.vue`

#### Phase 5: WriteOffHistoryView Integration (Day 3-4)

**Goal:** Show all write-offs in unified view

**Tasks:**

- [ ] Update `WriteOffHistoryView.vue`:
  - [ ] Add "Source" filter (Sales, Production, Storage, Preparations)
  - [ ] Add "Reason" filter (dynamic based on source)
  - [ ] Fetch from multiple tables:
    - [ ] `recipe_writeoffs` (existing sales)
    - [ ] `storage_operations` (production + sales consumption)
    - [ ] `preparation_operations` (preparation consumption)
  - [ ] Unified data model for display
  - [ ] Sort by date (most recent first)
- [ ] Update `WriteOffDetailDialog.vue`:
  - [ ] Show linked operations (prep operation → storage write-off)
  - [ ] Show consumption source (prep_batch vs raw_products)
  - [ ] Show FIFO allocation details
  - [ ] Cost breakdown
- [ ] Add color coding for write-off types
- [ ] Add export functionality

**Files:**

- `src/views/backoffice/inventory/WriteOffHistoryView.vue`
- `src/views/backoffice/inventory/components/WriteOffDetailDialog.vue`

**Unified Write-off Interface:**

```typescript
interface UnifiedWriteOffRecord {
  id: string
  date: string
  source: 'sales' | 'production' | 'storage' | 'preparation'
  reason: WriteOffReason
  affectsKPI: boolean
  department: string
  totalCost: number
  items: WriteOffItem[]
  relatedTo?: {
    type: 'order' | 'preparation_operation' | 'storage_operation'
    id: string
    reference: string // Order number, document number, etc.
  }
}
```

#### Phase 6: Testing & Validation (Day 4)

**Goal:** Ensure no double write-offs, correct FIFO behavior

**Tasks:**

- [ ] Integration tests:
  - [ ] Production flow: products → prep batch (Sprint 1)
  - [ ] Sales flow: menu → dish → prep/products → consumption
  - [ ] Hybrid consumption: partial prep stock scenario
  - [ ] FIFO allocation: oldest batches used first
  - [ ] No double write-off: products written off once
- [ ] Manual testing:
  - [ ] Create prep batch (verify auto write-off)
  - [ ] Sell menu item with prep (verify consumption)
  - [ ] Sell when no prep stock (verify fallback to products)
  - [ ] Check WriteOffHistoryView (verify all sources visible)
- [ ] Edge case testing:
  - [ ] Expired prep batches (skip in FIFO)
  - [ ] Negative balance handling
  - [ ] Concurrent orders (race conditions)
  - [ ] Order cancellation (rollback consumption)

### Sprint 2 Success Criteria

1. ✅ **Menu decomposition:** Menu Items correctly decomposed to Dishes + Products
2. ✅ **Hybrid consumption:** System checks prep stock first, falls back to raw products
3. ✅ **FIFO allocation:** Both prep batches and raw products consumed in FIFO order
4. ✅ **No double write-off:** Products written off during production, NOT again during sales
5. ✅ **Linked operations:** All consumptions linked to orders for audit trail
6. ✅ **Unified history:** WriteOffHistoryView shows all write-off types
7. ✅ **Real-time stock:** Prep batches and raw products updated immediately on sale
8. ✅ **Error handling:** Graceful fallback if prep stock runs out mid-order

### Sprint 2 Deliverables

**Backend:**

- `useHybridConsumption.ts` composable
- `usePreparationStockCheck.ts` composable
- Updated `useKitchenDecomposition.ts` (Menu Item support)
- Consumption operations creation (prep + storage)

**Frontend:**

- Updated `WriteOffHistoryView.vue` (unified view)
- Updated `WriteOffDetailDialog.vue` (linked operations)
- POS order view with consumption details

**Database:**

- New operation types: `preparation_operations.type = 'consumption'`
- New write-off reason: `storage_operations.write_off_details.reason = 'sales_consumption'`

**Testing:**

- Integration test suite
- Manual test scenarios
- Edge case coverage

### Sprint 2 Technical Challenges

**Challenge 1: FIFO Allocation Complexity**

- Need to allocate across multiple batches
- Handle partial quantities
- Skip expired batches
- Solution: Reuse existing FIFO logic from `preparationService.ts`

**Challenge 2: Atomic Operations**

- Multiple write-offs in single order
- Need transaction-like behavior
- Rollback on failure
- Solution: Wrap in try/catch, revert on error

**Challenge 3: Performance**

- Real-time stock checking on every order
- Multiple database queries
- Solution: Batch queries, cache prep balances

**Challenge 4: Mixed Consumption Tracking**

- Some orders use prep batches, some use products
- Need clear audit trail
- Solution: Store consumption_source in operation metadata

### Sprint 2 Migration Path

**From Current State:**

```
Menu Item → Dish → Prep → Products (recursive) → Write-off products
```

**To Target State:**

```
Menu Item → Dish → Prep (check stock) → {
  IF stock: Write-off prep batch
  ELSE: Write-off products
}
```

**Backward Compatibility:**

- Old orders: Continue to work (already decomposed)
- New orders: Use hybrid consumption
- No data migration needed

---

## 📍 Current Status

**Development Environment:** ✅ **DEPLOYED ON VERCEL**

### Deployment Information

We are now using **Vercel** for all deployments:

- **Dev (Preview):** Auto-deploys from `dev` branch

  - URL: https://resto-backoffice-git-dev-alexs-projects-f4358626.vercel.app
  - Environment: Preview with development settings
  - Debug enabled: Yes
  - Service key: No (removed for security)

- **Production:** Not yet configured
  - Will deploy from `main` branch
  - Production Supabase database
  - Debug disabled
  - No service key (security)

**Vercel Configuration:**

- Framework: Vite (auto-detected)
- Build command: `pnpm build`
- Output directory: `dist`
- Node version: 20.x
- Environment variables: Configured via Vercel dashboard

---

## ✅ Recently Completed

### Sprint 1: Authentication & Session Management Refactoring (2025-11-25) ✅ COMPLETED

- ✅ Cross-tab logout synchronization (localStorage broadcast mechanism)
- ✅ Complete store reset service (resets all 15 Pinia stores on logout)
- ✅ Fixed App.vue race conditions (removed immediate watcher, added loading overlay)
- ✅ Session consolidation (removed AuthSessionService, Supabase-only sessions)
- ✅ Navigation & session persistence (fixed page reload detection)
- ✅ Eliminated ghost data on page reload
- ✅ Single source of truth for authentication

### Previous Achievements

- ✅ Supabase integration (dev + prod databases, 36 tables migrated)
- ✅ Authentication system (Email + PIN auth for POS/Kitchen)
- ✅ RLS policies fixed (infinite recursion, RPC permissions)
- ✅ Recipe decomposition formula fixed (ERROR-POS-001)
- ✅ Negative stock allowed for POS operations
- ✅ CI/CD workflows (GitHub Actions)
- ✅ Vercel deployment setup (dev environment)
- ✅ Fixed critical build errors
- ✅ Environment variables configured for Preview

---

## 🎯 Active Sprint

**Current Sprint:** Sprint 2 - Production Readiness & POS Enhancements (see `NextTodo.md` for details)

**Sprint Duration:** 2-3 weeks
**Sprint Goals:**

1. ✅ **COMPLETED**: Authentication & Session Management Refactoring (Sprint 1)
2. Prepare production database with seed data (users, products, warehouse, menu)
3. Integrate thermal printer for POS receipt printing
4. Deploy production environment on Vercel
5. Stabilize code quality and fix bugs

### High Priority Tasks

#### 1. Production Database Seeding

- Create seed scripts for users, products, warehouse, menu
- Run seeds on production Supabase
- Verify data integrity

#### 3. Production Deployment

- Configure production environment variables in Vercel
- Set production branch to `main`
- Merge dev → main after testing
- Verify production deployment

### Medium Priority Tasks

#### 4. Code Quality & Bug Fixes

- Fix debug logging in preview environment
- Fix TypeScript errors (10 errors)
- Run Prettier formatting
- Address critical ESLint warnings

#### 5. Documentation

- Update README.md with deployment info
- Create DEPLOYMENT.md guide
- Create PRINTER_INTEGRATION.md
- Update CLAUDE.md

---

## 🐛 Known Issues

### 1. Debug Logs Not Working (Preview)

- **Impact:** No console output in dev environment
- **Cause:** Production build strips console.log
- **Fix:** Check `VITE_DEBUG_ENABLED` env var

### 2. Code Quality

- 40 prettier errors
- 10 TypeScript errors
- 838 ESLint warnings

---

## 🚀 Future Phases

### Sprint 2: POS Printer Integration (First Production Update)

**Goal:** Add thermal printer support for receipt printing + practice hot updates in production

**Why this sprint:** This will be our first feature added to live production system, providing valuable experience with:

- Hot deployments to production
- Testing updates without breaking existing functionality
- Rollback procedures if something goes wrong
- Version management and release process

**Tasks:**

1. **Research & Planning**

   - Evaluate thermal printer libraries (escpos, star-prnt, capacitor-thermal-printer)
   - Choose web-compatible library for browser-based printing
   - Research Capacitor plugin for mobile (future)
   - Document supported printer models (Epson, Star, etc.)

2. **Core Implementation**

   - Create PrinterService (`src/services/PrinterService.ts`)
     - Printer detection and connection
     - Print queue management
     - Error handling and retry logic
     - Support for USB, Network, and Bluetooth printers
   - Create receipt template (`src/templates/receipt.ts`)
     - Restaurant header (name, address, phone)
     - Order details (items, quantities, prices)
     - Subtotal, tax, discounts, total
     - Payment method and change
     - Footer (thank you message, date/time)
     - QR code support (optional, for digital receipts)

3. **POS Integration**

   - Add "Print Receipt" button in CheckoutDialog
   - Auto-print on successful payment (configurable)
   - Handle printer errors gracefully
   - Add printer status indicator in POS toolbar

4. **Settings & Configuration**

   - Create PrinterSettings.vue page
   - Printer selection and configuration
   - Test print functionality
   - Paper size settings (58mm, 80mm)
   - Auto-print preferences
   - Printer status monitoring

5. **Testing & Deployment**

   - Test in dev environment
   - Test in preview environment
   - Create release branch
   - Deploy to production
   - Monitor for errors
   - Test rollback if needed

6. **Documentation**
   - Create PRINTER_INTEGRATION.md
   - Update user guide
   - Document troubleshooting

**Technical Notes:**

- Web printing: Use ESC/POS library or window.print() with custom CSS
- Mobile printing: Capacitor plugin (future)
- Printer types: USB (web), Network (web + mobile), Bluetooth (mobile only)
- Fallback: Generate PDF receipt if printer unavailable

**Success Criteria:**

- Receipts print correctly from POS checkout
- Printer settings page works
- No breaking changes to existing functionality
- Production deployment successful
- Rollback procedure documented and tested

### Sprint 3: Mobile App Deployment (Capacitor)

**Goal:** Deploy mobile apps for iOS and Android

- Mobile-specific environment configuration
- Capacitor plugin integration (printer, camera, storage)
- Offline-first optimization for POS
- Mobile UI/UX adjustments
- App store submission (iOS App Store, Google Play)
- In-app updates and versioning

### Sprint 4: Kitchen Display System (KDS)

**Goal:** Real-time kitchen order display and management

- Kitchen display interface (Vue components)
- Real-time order updates (Supabase subscriptions)
- Order status workflow (new → preparing → ready → served)
- Department-based filtering (kitchen, bar, grill)
- Audio/visual notifications for new orders
- Timer and SLA tracking
- Kitchen staff authentication (PIN-based)

### Sprint 5: Advanced Reporting & Analytics

**Goal:** Business intelligence and data insights

- Sales reports (daily, weekly, monthly)
- Product performance analytics
- Inventory tracking and alerts
- Staff performance reports
- Customer analytics (order history, preferences)
- Financial reports (profit/loss, cash flow)
- Export to Excel/PDF
- Dashboard with charts and KPIs

### Sprint 6: Performance Optimization

**Goal:** Improve app performance and bundle size

- Code splitting and lazy loading
- Bundle size optimization (target: <1MB main chunk)
- Image optimization (WebP, lazy loading)
- Database query optimization
- Caching strategies (service workers)
- Performance monitoring (Lighthouse, Web Vitals)

### Sprint 7: Multi-Restaurant Support

**Goal:** Support multiple restaurant locations

- Restaurant/location management
- Multi-tenant data isolation
- Cross-location reporting
- Central admin dashboard
- Location-specific menus and pricing
- Inventory transfer between locations

### Sprint 8: Advanced POS Features

**Goal:** Enhance POS functionality

- Customer loyalty program
- Gift cards and vouchers
- Advanced discounts (BOGO, bundle deals)
- Split payments (multiple payment methods)
- Refunds and returns
- Email receipts (alternative to printing)
- QR code payment integration (QRIS, GoPay, OVO)
- Reservation system integration

### Sprint 9: Integration & Automation

**Goal:** Third-party integrations and workflow automation

- Accounting software integration (Xero, QuickBooks)
- Payment gateway integration (Stripe, Midtrans)
- Delivery platform integration (GrabFood, GoFood)
- Email marketing (Mailchimp, SendGrid)
- SMS notifications (Twilio)
- Automated inventory ordering
- Scheduled reports and backups

### Long-term Vision

- AI-powered demand forecasting
- Recipe optimization and cost analysis
- Employee scheduling and payroll
- Supplier management and procurement
- Quality control and food safety compliance
- Franchise management tools

---

## 📊 Quick Stats

**Build:**

- Build time: ~28s
- Bundle size: 6.7 MB
- Main chunk: 1.96 MB (needs optimization)

**Codebase:**

- ~50,000 lines of code
- 100+ components
- 15+ stores
- 25+ routes

**CI/CD:**

- 3 GitHub workflows
- Auto-deploy on push to dev (Vercel)
- Artifact retention: 7 days (dev), 30 days (prod)

---

## 📝 Environment Variables

**Required for all environments:**

- `VITE_APP_TITLE`
- `VITE_PLATFORM`
- `VITE_USE_SUPABASE`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Dev only:**

- `VITE_DEBUG_ENABLED=true`
- `VITE_DEBUG_STORES=true`
- `VITE_SHOW_DEV_TOOLS=true`
- `VITE_SUPABASE_USE_SERVICE_KEY=true` (⚠️ DEV ONLY!)

**Production:**

- All debug flags = false
- NO service key
- `VITE_USE_API=true`

---

## 🎯 Next Actions

1. **Immediate:** Fix debug logging for Preview environment
2. **This week:** Configure production deployment
3. **Next week:** Code quality cleanup
4. **Next week:** Documentation updates

---

**Current Focus:** Stabilizing dev deployment and fixing environment-specific issues

**Deployment Strategy:** Vercel auto-deploy (dev → Preview, main → Production)
