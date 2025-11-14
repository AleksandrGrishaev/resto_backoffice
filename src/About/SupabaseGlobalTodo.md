# 🗄️ Supabase Global Integration Roadmap

## 📋 Overview

This document tracks the global migration process from **localStorage** to **Supabase (PostgreSQL)** for the entire Kitchen App ecosystem, covering both **POS** (offline-first) and **Backoffice** (online-first) systems.

**Goal:** Migrate all entities to Supabase while maintaining offline-first capability for POS and ensuring seamless synchronization.

---

## 🏗️ Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          KITCHEN APP ECOSYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────┐              ┌─────────────────────────┐         │
│  │   POS SYSTEM             │              │   BACKOFFICE SYSTEM     │         │
│  │   (Offline-First)        │              │   (Online-First)        │         │
│  ├─────────────────────────┤              ├─────────────────────────┤         │
│  │                          │              │                          │         │
│  │  • Tables Management     │              │  • Products Management   │         │
│  │  • Orders Processing     │              │  • Menu Configuration    │         │
│  │  • Payments Handling     │              │  • Shift History View    │         │
│  │  • Shift Operations      │              │  • Inventory Management  │         │
│  │  • Offline Capability    │              │  • Suppliers & Recipes   │         │
│  │                          │              │  • Account Store (acc_1) │         │
│  └──────────┬───────────────┘              └──────────┬───────────────┘         │
│             │                                         │                         │
│             │                                         │                         │
│             ▼                                         ▼                         │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │                    SERVICE LAYER                                     │       │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │       │
│  │  │ shifts/      │  │ orders/      │  │ payments/    │              │       │
│  │  │ services.ts  │  │ services.ts  │  │ services.ts  │  ...         │       │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │       │
│  │         │                  │                  │                      │       │
│  │         │  ┌───────────────┴──────────────────┘                     │       │
│  │         │  │                                                          │       │
│  │         ▼  ▼                                                          │       │
│  │  ┌─────────────────────────────────────────────────────────────┐    │       │
│  │  │           DUAL-WRITE STRATEGY                                │    │       │
│  │  │  ┌────────────────────┬─────────────────────────────┐       │    │       │
│  │  │  │  1. Try Supabase   │  2. Fallback: localStorage  │       │    │       │
│  │  │  │  (if online)       │  (always works)             │       │    │       │
│  │  │  └────────────────────┴─────────────────────────────┘       │    │       │
│  │  └─────────────────────────────────────────────────────────────┘    │       │
│  └───────────────────────┬──────────────────┬──────────────────────────┘       │
│                          │                  │                                   │
│        ┌─────────────────┘                  └─────────────────┐                │
│        │ ONLINE                                     OFFLINE    │                │
│        ▼                                                       ▼                │
│  ┌────────────────────────────────┐             ┌──────────────────────────┐  │
│  │     SUPABASE CLIENT            │             │   localStorage           │  │
│  │  (src/supabase/client.ts)      │             │  + SyncService Queue     │  │
│  │                                 │             │                          │  │
│  │  • Service Key (dev/PIN auth)  │             │  • Instant write         │  │
│  │  • RLS bypass for MVP          │             │  • Works offline         │  │
│  │  • PostgreSQL interface        │             │  • Queued for sync       │  │
│  └────────────┬───────────────────┘             └──────────┬───────────────┘  │
│               │                                             │                   │
│               ▼                                             │                   │
│  ┌────────────────────────────────┐                        │                   │
│  │     SUPABASE CLOUD             │                        │                   │
│  │    (PostgreSQL)                │                        │                   │
│  │                                 │                        │                   │
│  │  Tables:                        │                        │                   │
│  │  • shifts                       │                        │                   │
│  │  • orders                       │◄───────────────────────┘                   │
│  │  • payments                     │   (Sync when online)                       │
│  │  • products                     │                                            │
│  │  • tables                       │                                            │
│  │  • auth.users                   │                                            │
│  │                                 │                                            │
│  │  Features:                      │                                            │
│  │  • Row Level Security (RLS)    │                                            │
│  │  • Real-time (disabled in MVP)  │                                            │
│  │  • Auto backups                 │                                            │
│  └─────────────────────────────────┘                                            │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐       │
│  │           CENTRALIZED SYNCSERVICE                                    │       │
│  │           (src/core/sync/SyncService.ts)                             │       │
│  │                                                                       │       │
│  │  Features:                                                            │       │
│  │  • Priority-based queue (critical > high > normal > low)             │       │
│  │  • Exponential backoff retry (2^attempts, max 1 hour)               │       │
│  │  • Storage abstraction (LocalStorageSyncStorage → ApiSyncStorage)    │       │
│  │  • Adapter pattern for entity-specific sync logic                    │       │
│  │  • Conflict resolution strategies (server-wins, local-wins, merge)   │       │
│  │  • Sync history tracking                                              │       │
│  │                                                                       │       │
│  │  Entity Adapters:                                                     │       │
│  │  • ShiftSyncAdapter  ✅ (syncs shifts → Account Store + Supabase)   │       │
│  │  • OrderSyncAdapter  🔲 (planned)                                    │       │
│  │  • PaymentSyncAdapter 🔲 (planned)                                   │       │
│  └─────────────────────────────────────────────────────────────────────┘       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Synchronization Flows

### 1️⃣ **POS Online → Supabase (Immediate Sync)**

```
User Action (e.g., Create Order)
        ↓
┌───────────────────────┐
│ UI Component          │
│ (PosMainView.vue)     │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│ Pinia Store           │
│ (ordersStore.ts)      │
└──────────┬────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Service Layer                         │
│ (orders/services.ts)                  │
│                                       │
│  createOrder(order) {                │
│    if (navigator.onLine) {           │
│      // 1. Write to Supabase         │
│      const result = await supabase   │
│        .from('orders')               │
│        .insert(order)                │
│                                       │
│      if (result.error) {             │
│        // Fallback to localStorage   │
│        saveToLocalStorage(order)     │
│        addToSyncQueue(order)         │
│      } else {                        │
│        // Success: cache locally     │
│        saveToLocalStorage(order)     │
│      }                                │
│    }                                  │
│  }                                    │
└──────────┬───────────────────────────┘
           │
           ├──────────────┐
           │              │
           ▼              ▼
  ┌────────────┐   ┌─────────────┐
  │  Supabase  │   │ localStorage│
  │ (primary)  │   │  (cache)    │
  └────────────┘   └─────────────┘

  Result: ✅ Data in Supabase immediately
          ✅ Cached in localStorage for fast reads
```

### 2️⃣ **POS Offline → localStorage → Sync Queue**

```
User Action (e.g., Close Shift - No Internet)
        ↓
┌───────────────────────┐
│ UI Component          │
│ (EndShiftDialog.vue)  │
└──────────┬────────────┘
           │
           ▼
┌───────────────────────┐
│ Pinia Store           │
│ (shiftsStore.ts)      │
└──────────┬────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ Service Layer                         │
│ (shifts/services.ts)                  │
│                                       │
│  endShift(shiftId) {                 │
│    shift.status = 'completed'        │
│    shift.endTime = now()             │
│                                       │
│    if (navigator.onLine) {           │
│      await supabase.update(shift)    │
│    } else {                          │
│      // Mark for sync                │
│      shift.syncStatus = 'pending'    │
│      shift.pendingSync = true        │
│                                       │
│      // Add to SyncService queue     │
│      syncService.addToQueue({        │
│        entityType: 'shift',          │
│        entityId: shift.id,           │
│        operation: 'update',          │
│        priority: 'critical',         │
│        data: shift                   │
│      })                               │
│    }                                  │
│                                       │
│    // Always save to localStorage   │
│    saveToLocalStorage(shift)         │
│  }                                    │
└──────────┬───────────────────────────┘
           │
           ▼
  ┌─────────────────────────┐
  │  localStorage           │
  │  + SyncService Queue    │
  │                          │
  │  Queue Item:             │
  │  {                       │
  │    id: "uuid",          │
  │    entityType: "shift", │
  │    operation: "update", │
  │    priority: "critical",│
  │    data: { shift },     │
  │    status: "pending",   │
  │    attempts: 0          │
  │  }                       │
  └─────────────────────────┘

  Result: ✅ Data saved locally
          ✅ Queued for sync
          ✅ App continues working offline
```

### 3️⃣ **Network Restored → SyncService Processing**

```
Network Status Change (offline → online)
        ↓
┌───────────────────────────────────┐
│ Network Watcher (posStore.ts)    │
│                                    │
│  watch(isOnline, (online) => {   │
│    if (online) {                  │
│      syncService.processQueue()   │
│    }                               │
│  })                                │
└──────────┬────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│ SyncService.processQueue()                               │
│                                                           │
│  1. Get pending items from localStorage                 │
│  2. Sort by priority (critical → high → normal → low)   │
│  3. For each item:                                       │
│     - Check retry time (exponential backoff)            │
│     - Get adapter for entity type                       │
│     - Call adapter.sync(item)                            │
│     - Handle success/failure                             │
│     - Update queue status                                │
└──────────┬───────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│ ShiftSyncAdapter.sync(item)                              │
│                                                           │
│  1. Validate shift data                                  │
│  2. Create transactions in Account Store (acc_1)         │
│     - Income transaction (net sales)                     │
│     - Expense transactions (direct expenses)             │
│     - Correction transactions (cash adjustments)         │
│  3. Update shift in Supabase                             │
│     - Set syncedToAccount = true                         │
│     - Set syncedAt = now()                               │
│     - Set accountTransactionIds = [...]                  │
│  4. Update shift in localStorage                         │
│  5. Return success result                                │
└──────────┬───────────────────────────────────────────────┘
           │
           ├───────────────────────┐
           │                       │
           ▼                       ▼
  ┌────────────────┐     ┌─────────────────┐
  │ Account Store  │     │    Supabase     │
  │   (acc_1)      │     │   (shifts)      │
  │                │     │                 │
  │ Transactions:  │     │ Shift updated:  │
  │ • Income       │     │ • syncedToAcct  │
  │ • Expenses     │     │ • syncedAt      │
  │ • Corrections  │     │ • transactionIds│
  └────────────────┘     └─────────────────┘

  Result: ✅ Shift synced to Account Store
          ✅ Shift synced to Supabase
          ✅ Removed from sync queue
          ✅ Added to sync history
```

### 4️⃣ **Backoffice Reads from Supabase**

```
User navigates to Shift History
        ↓
┌───────────────────────────┐
│ ShiftHistoryView.vue      │
│                            │
│  onMounted(() => {        │
│    shiftsStore.loadShifts()│
│  })                        │
└──────────┬────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ shiftsStore.loadShifts()             │
│                                       │
│  await shiftsService.loadShifts()    │
└──────────┬───────────────────────────┘
           │
           ▼
┌──────────────────────────────────────┐
│ shifts/services.ts                    │
│                                       │
│  loadShifts() {                      │
│    // 1. Try Supabase (if online)    │
│    if (isSupabaseAvailable()) {      │
│      const { data } = await supabase │
│        .from('shifts')               │
│        .select('*')                  │
│        .order('created_at', 'desc')  │
│                                       │
│      if (data) {                     │
│        // Cache in localStorage      │
│        saveToLocalStorage(data)      │
│        return data                   │
│      }                                │
│    }                                  │
│                                       │
│    // 2. Fallback: read from cache  │
│    return loadFromLocalStorage()     │
│  }                                    │
└──────────┬───────────────────────────┘
           │
           ▼
  ┌────────────────────┐
  │   Supabase         │
  │   (source of truth)│
  │                    │
  │   • Always fresh   │
  │   • All devices    │
  │   • Shared data    │
  └────────────────────┘

  Result: ✅ Backoffice always shows latest data
          ✅ Reads from Supabase (not localStorage)
          ✅ Fast cache fallback if offline
```

---

## 📊 Migration Status

### ✅ **Completed Entities**

| Entity   | POS (Offline-First) | Backoffice (Online-First) | Sync Adapter | Status      |
| -------- | ------------------- | ------------------------- | ------------ | ----------- |
| `shifts` | ✅ CREATE           | ✅ READ                   | ✅ Done      | **TESTING** |
|          | ✅ UPDATE           | ✅ Supabase               |              |             |
|          | ✅ CLOSE            | ✅ Sync working           |              |             |
|          | ✅ Supabase sync    |                           |              |             |

### 🚧 **In Progress**

| Entity     | POS (Offline-First) | Backoffice (Online-First) | Sync Adapter | Priority | ETA         |
| ---------- | ------------------- | ------------------------- | ------------ | -------- | ----------- |
| `orders`   | 🔲 Pending          | 🔲 Pending                | 🔲 Pending   | Critical | Week 2 Day3 |
| `payments` | 🔲 Pending          | 🔲 Pending                | 🔲 Pending   | Critical | Week 2 Day3 |

### 🔲 **Planned Entities**

| Entity          | POS (Offline-First) | Backoffice (Online-First) | Sync Adapter | Priority | ETA         |
| --------------- | ------------------- | ------------------------- | ------------ | -------- | ----------- |
| `products`      | 🔲 READ only        | 🔲 CRUD                   | 🔲 Optional  | High     | Week 2 Day4 |
| `tables`        | 🔲 READ/UPDATE      | 🔲 CRUD                   | 🔲 Optional  | Normal   | Week 2 End  |
| `menu`          | 🔲 READ only        | 🔲 CRUD                   | 🔲 No        | Normal   | Sprint 8    |
| `recipes`       | 🔲 READ only        | 🔲 CRUD                   | 🔲 No        | Normal   | Sprint 8    |
| `storage`       | 🔲 Not used in POS  | 🔲 CRUD                   | 🔲 No        | Low      | Sprint 8-9  |
| `suppliers`     | 🔲 Not used in POS  | 🔲 CRUD                   | 🔲 No        | Low      | Sprint 8-9  |
| `counteragents` | 🔲 Not used in POS  | 🔲 CRUD                   | 🔲 No        | Low      | Sprint 8-9  |
| `preparations`  | 🔲 Not used in POS  | 🔲 CRUD                   | 🔲 No        | Low      | Sprint 8-9  |

---

## 🎯 Global Migration Roadmap

### **Sprint 7: Critical POS Entities (CURRENT)**

**Goal:** Get POS working with Supabase for critical operations

**Timeline:** 3 weeks (Week 2 in progress)

#### Week 2: Store Migration

- [x] **Day 1-2: Shifts Store → Supabase** ✅

  - [x] Mappers created (`supabaseMappers.ts`)
  - [x] Service layer updated (`shifts/services.ts`)
  - [x] CREATE → Supabase working
  - [x] UPDATE → Supabase working
  - [x] CLOSE → Supabase working
  - [x] ShiftSyncAdapter → Supabase working
  - [ ] **TESTING REQUIRED** (see SHIFT_TESTING_PLAN.md)

- [ ] **Day 2-3: Orders Store → Supabase**

  - [ ] Create `orders/supabaseMappers.ts`
  - [ ] Update `orders/services.ts` with Supabase calls
  - [ ] Implement dual-write strategy (Supabase + localStorage)
  - [ ] Add to SyncService queue for offline operations
  - [ ] Test CREATE/UPDATE/DELETE operations
  - [ ] Test offline → online sync

- [ ] **Day 2-3: Payments Store → Supabase**

  - [ ] Create `payments/supabaseMappers.ts`
  - [ ] Update `payments/services.ts` with Supabase calls
  - [ ] Implement dual-write strategy
  - [ ] Add to SyncService queue
  - [ ] Test payment processing flow
  - [ ] Test refund flow

- [ ] **Day 4: Products Store → Supabase**

  - [ ] Create `products/supabaseMappers.ts`
  - [ ] Update `productsStore/services.ts` (create if missing)
  - [ ] POS: READ only (no write operations)
  - [ ] Backoffice: Full CRUD
  - [ ] Migration script: Move mock products to Supabase (one-time)
  - [ ] Test product catalog sync

- [ ] **Day 5: Tables Store → Supabase**
  - [ ] Create `tables/supabaseMappers.ts`
  - [ ] Update `tables/services.ts`
  - [ ] POS: READ + UPDATE status (occupied/available)
  - [ ] Backoffice: Full CRUD
  - [ ] Test table status sync

#### Week 3: Deploy & Testing

- [ ] **Day 1-2: Deployment Setup**

  - [ ] Configure production environment
  - [ ] Setup Vercel/Netlify
  - [ ] Configure environment variables
  - [ ] Test production build locally

- [ ] **Day 2: Deploy to Production**

  - [ ] Deploy to Vercel
  - [ ] Verify Supabase connection
  - [ ] Test on multiple devices

- [ ] **Day 3: E2E Testing**

  - [ ] Test full POS flow (open shift → orders → payments → close shift)
  - [ ] Test Backoffice views (shift history, products, menu)
  - [ ] Test offline → online sync
  - [ ] Cross-browser testing

- [ ] **Day 4-5: Bug Fixes & Documentation**
  - [ ] Fix critical bugs
  - [ ] Update README
  - [ ] Update CLAUDE.md
  - [ ] Create backup/restore scripts

**Deliverables:**

- ✅ POS critical operations working with Supabase
- ✅ Offline-first capability maintained
- ✅ Backoffice reads from Supabase
- ✅ Deployed to production (web app accessible online)

---

### **Sprint 8-9: Full Migration (PLANNED)**

**Goal:** Migrate all remaining entities to Supabase

**Timeline:** 1-2 months

#### Entities to Migrate

1. **Menu & Recipes** (2 weeks)

   - Menu configuration
   - Recipe management
   - Product-recipe relationships

2. **Storage & Inventory** (2 weeks)

   - Warehouse operations
   - Stock tracking
   - Write-offs & corrections

3. **Suppliers & Counteragents** (1-2 weeks)

   - Supplier management
   - Counteragent relationships

4. **Preparations & Sales** (1 week)
   - Semi-finished products
   - Sales reports

**Deliverables:**

- ✅ All data in Supabase
- ✅ localStorage only for cache
- ✅ Backoffice fully migrated

---

### **Sprint 10: Production Hardening (PLANNED)**

**Goal:** Prepare for beta-testing with real users

**Timeline:** 3-4 weeks

#### Tasks

1. **Security Audit**

   - Penetration testing
   - Advanced RLS policies
   - Input sanitization

2. **Performance Optimization**

   - Caching strategy
   - Lazy loading
   - Code splitting

3. **Error Monitoring**

   - Sentry integration
   - User behavior tracking

4. **Advanced Features**
   - Conflict resolution
   - Comprehensive error handling
   - Real-time subscriptions (optional)

**Deliverables:**

- ✅ Beta-ready application
- ✅ Production-grade security
- ✅ Monitoring & analytics

---

## 🔧 Implementation Patterns

### **Pattern 1: Service Layer Updates (Recommended)**

For each entity, update the existing `services.ts` file:

```typescript
// src/stores/pos/orders/services.ts

import { supabase } from '@/supabase/client'
import { useSyncService } from '@/core/sync/SyncService'
import { ENV } from '@/config/environment'

class OrdersService {
  // Helper: Check if Supabase is available
  private isSupabaseAvailable(): boolean {
    return ENV.supabase.enabled && navigator.onLine
  }

  // CREATE Operation
  async createOrder(order: Order): Promise<ServiceResponse<Order>> {
    try {
      // 1. Try Supabase (online)
      if (this.isSupabaseAvailable()) {
        const { data, error } = await supabase
          .from('orders')
          .insert(toSupabaseInsert(order))
          .select()
          .single()

        if (!error && data) {
          // Success: save to cache
          await this.saveToLocalStorage(fromSupabase(data))
          return { success: true, data: fromSupabase(data) }
        }

        // Log error but continue to fallback
        console.warn('⚠️ Supabase insert failed, using localStorage', error)
      }

      // 2. Fallback: localStorage (offline or error)
      await this.saveToLocalStorage(order)

      // 3. Add to sync queue (if offline)
      if (!navigator.onLine) {
        useSyncService().addToQueue({
          entityType: 'order',
          entityId: order.id,
          operation: 'create',
          priority: 'high',
          data: order
        })
      }

      return { success: true, data: order }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // UPDATE Operation
  async updateOrder(orderId: string, updates: Partial<Order>): Promise<ServiceResponse<Order>> {
    try {
      // Get current order from localStorage
      const currentOrder = await this.getOrderFromLocalStorage(orderId)
      if (!currentOrder) {
        return { success: false, error: 'Order not found' }
      }

      const updatedOrder = { ...currentOrder, ...updates }

      // 1. Try Supabase (online)
      if (this.isSupabaseAvailable()) {
        const { error } = await supabase
          .from('orders')
          .update(toSupabaseUpdate(updatedOrder))
          .eq('id', orderId)

        if (!error) {
          await this.saveToLocalStorage(updatedOrder)
          return { success: true, data: updatedOrder }
        }

        console.warn('⚠️ Supabase update failed, using localStorage', error)
      }

      // 2. Fallback: localStorage
      await this.saveToLocalStorage(updatedOrder)

      // 3. Add to sync queue (if offline)
      if (!navigator.onLine) {
        useSyncService().addToQueue({
          entityType: 'order',
          entityId: orderId,
          operation: 'update',
          priority: 'high',
          data: updatedOrder
        })
      }

      return { success: true, data: updatedOrder }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // READ Operation
  async loadOrders(): Promise<ServiceResponse<Order[]>> {
    try {
      // 1. Try Supabase (online)
      if (this.isSupabaseAvailable()) {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })

        if (!error && data) {
          // Save to cache
          const orders = data.map(fromSupabase)
          await this.saveAllToLocalStorage(orders)
          return { success: true, data: orders }
        }

        console.warn('⚠️ Supabase read failed, using localStorage', error)
      }

      // 2. Fallback: localStorage
      const cachedOrders = await this.loadFromLocalStorage()
      return { success: true, data: cachedOrders }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // Helper: localStorage operations
  private async saveToLocalStorage(order: Order): Promise<void> {
    const orders = await this.loadFromLocalStorage()
    const index = orders.findIndex(o => o.id === order.id)

    if (index !== -1) {
      orders[index] = order
    } else {
      orders.push(order)
    }

    localStorage.setItem('pos_orders', JSON.stringify(orders))
  }

  private async loadFromLocalStorage(): Promise<Order[]> {
    const data = localStorage.getItem('pos_orders')
    return data ? JSON.parse(data) : []
  }
}

export const ordersService = new OrdersService()
```

### **Pattern 2: Supabase Mappers**

Create mappers to convert between app types and Supabase types:

```typescript
// src/stores/pos/orders/supabaseMappers.ts

import type { Order } from './types'
import type { Database } from '@/supabase/types'

type SupabaseOrder = Database['public']['Tables']['orders']['Row']
type SupabaseOrderInsert = Database['public']['Tables']['orders']['Insert']
type SupabaseOrderUpdate = Database['public']['Tables']['orders']['Update']

/**
 * Convert app Order to Supabase INSERT format
 */
export function toSupabaseInsert(order: Order): SupabaseOrderInsert {
  return {
    id: order.id,
    order_number: order.orderNumber,
    table_id: order.tableId || null,
    shift_id: order.shiftId || null,
    type: order.type,
    status: order.status,
    items: order.items as any, // JSONB
    subtotal: order.subtotal,
    discount: order.discount,
    tax: order.tax,
    total: order.total,
    payment_status: order.paymentStatus,
    payment_method: order.paymentMethod || null,
    paid_at: order.paidAt || null,
    notes: order.notes || null,
    customer_name: order.customerName || null,
    created_by: order.createdBy || null
  }
}

/**
 * Convert app Order to Supabase UPDATE format
 */
export function toSupabaseUpdate(order: Order): SupabaseOrderUpdate {
  return {
    status: order.status,
    items: order.items as any,
    subtotal: order.subtotal,
    discount: order.discount,
    tax: order.tax,
    total: order.total,
    payment_status: order.paymentStatus,
    payment_method: order.paymentMethod || null,
    paid_at: order.paidAt || null,
    notes: order.notes || null,
    updated_at: new Date().toISOString()
  }
}

/**
 * Convert Supabase Order to app Order format
 */
export function fromSupabase(supabaseOrder: SupabaseOrder): Order {
  return {
    id: supabaseOrder.id,
    orderNumber: supabaseOrder.order_number,
    tableId: supabaseOrder.table_id || undefined,
    shiftId: supabaseOrder.shift_id || undefined,
    type: supabaseOrder.type as Order['type'],
    status: supabaseOrder.status as Order['status'],
    items: supabaseOrder.items as Order['items'],
    subtotal: supabaseOrder.subtotal,
    discount: supabaseOrder.discount,
    tax: supabaseOrder.tax,
    total: supabaseOrder.total,
    paymentStatus: supabaseOrder.payment_status,
    paymentMethod: supabaseOrder.payment_method || undefined,
    paidAt: supabaseOrder.paid_at || undefined,
    notes: supabaseOrder.notes || undefined,
    customerName: supabaseOrder.customer_name || undefined,
    createdAt: supabaseOrder.created_at,
    updatedAt: supabaseOrder.updated_at,
    createdBy: supabaseOrder.created_by || undefined
  }
}
```

### **Pattern 3: Sync Adapter**

Create sync adapter for entity-specific sync logic:

```typescript
// src/core/sync/adapters/OrderSyncAdapter.ts

import type { ISyncAdapter, SyncQueueItem, SyncResult } from '../types'
import type { Order } from '@/stores/pos/orders/types'
import { supabase } from '@/supabase'
import { toSupabaseUpdate } from '@/stores/pos/orders/supabaseMappers'

export class OrderSyncAdapter implements ISyncAdapter<Order> {
  entityType = 'order' as const

  async validate(data: Order): Promise<boolean> {
    // Validate order data before syncing
    return !!(data.id && data.orderNumber && data.type)
  }

  async sync(item: SyncQueueItem<Order>): Promise<SyncResult> {
    const order = item.data

    try {
      if (item.operation === 'create') {
        // Insert new order
        const { error } = await supabase.from('orders').insert(toSupabaseInsert(order))

        if (error) throw new Error(error.message)
      } else if (item.operation === 'update') {
        // Update existing order
        const { error } = await supabase
          .from('orders')
          .update(toSupabaseUpdate(order))
          .eq('id', order.id)

        if (error) throw new Error(error.message)
      } else if (item.operation === 'delete') {
        // Delete order
        const { error } = await supabase.from('orders').delete().eq('id', order.id)

        if (error) throw new Error(error.message)
      }

      console.log(`✅ Synced order ${order.orderNumber} to Supabase`)
      return { success: true }
    } catch (error) {
      console.error(`❌ Failed to sync order ${order.orderNumber}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async onConflict(local: Order, remote: Order) {
    // For orders, server wins (financial data)
    return {
      strategy: 'server-wins' as const,
      data: remote,
      reason: 'Financial data - server is source of truth'
    }
  }
}
```

---

## 📝 Testing Checklist

### **Before Migration**

- [ ] Backup localStorage data
- [ ] Document current data structure
- [ ] Create rollback plan

### **During Migration**

- [ ] Test CREATE operations (online + offline)
- [ ] Test UPDATE operations (online + offline)
- [ ] Test DELETE operations (online + offline)
- [ ] Test READ operations (online + offline)
- [ ] Test offline → online sync
- [ ] Test sync queue processing
- [ ] Test error handling
- [ ] Test conflict resolution

### **After Migration**

- [ ] Verify data integrity in Supabase
- [ ] Verify localStorage cache working
- [ ] Verify Backoffice reads from Supabase
- [ ] Performance testing
- [ ] Cross-browser testing

---

## 🚨 Risks & Mitigation

### Risk 1: Data Loss During Migration

**Impact:** High
**Mitigation:**

- Always backup localStorage before migration
- Implement rollback mechanism
- Test migration on staging environment first

### Risk 2: Sync Conflicts

**Impact:** Medium
**Mitigation:**

- Use server-wins strategy for financial data
- Implement conflict resolution UI (Sprint 10)
- Log all conflicts for manual review

### Risk 3: Offline Sync Queue Overflow

**Impact:** Low
**Mitigation:**

- Limit queue size (max 100 items)
- Auto-cleanup old failed items (>30 days)
- Alert user when queue is full

### Risk 4: Supabase Rate Limits

**Impact:** Low (for MVP)
**Mitigation:**

- Monitor usage in Supabase dashboard
- Implement request throttling (Sprint 10)
- Upgrade Supabase plan if needed

---

## 📊 Success Metrics

### Sprint 7 (MVP)

- ✅ **Shifts syncing successfully** (CREATE/UPDATE/CLOSE)
- ✅ **Orders syncing successfully** (CREATE/UPDATE)
- ✅ **Payments syncing successfully** (CREATE/REFUND)
- ✅ **Products reading from Supabase**
- ✅ **Offline → online sync working**
- ✅ **Backoffice reading from Supabase**
- ✅ **Deployed to production (web accessible)**

### Sprint 8-9 (Full Migration)

- ✅ **All entities in Supabase**
- ✅ **localStorage only for cache**
- ✅ **Zero data loss during migration**
- ✅ **Sync success rate > 95%**

### Sprint 10 (Production Hardening)

- ✅ **Security audit passed**
- ✅ **Performance optimized (load < 2s)**
- ✅ **Error monitoring active**
- ✅ **Beta-ready for real users**

---

## 📚 Related Documentation

- **SHIFT_TESTING_PLAN.md** - Detailed shift sync testing scenarios
- **QUICK_START_TESTING.md** - 5-minute quick test guide
- **SHIFT_SYNC_SUMMARY.md** - Shift sync implementation summary
- **todo.md** - Sprint 7 detailed tasks and progress
- **CLAUDE.md** - Project architecture and guidelines
- **src/supabase/README.md** - Supabase setup documentation
- **src/core/sync/** - SyncService implementation

---

## 🎯 Next Actions

### Immediate (This Week)

1. **Testing Shifts Sync** (Priority: Critical)

   - [ ] Run test scenarios from SHIFT_TESTING_PLAN.md
   - [ ] Verify online shift closing → Supabase
   - [ ] Verify offline → online sync
   - [ ] Verify Backoffice reads updated shifts

2. **Start Orders Migration** (Priority: Critical)

   - [ ] Create `orders/supabaseMappers.ts`
   - [ ] Update `orders/services.ts`
   - [ ] Test CREATE/UPDATE operations
   - [ ] Test offline sync

3. **Start Payments Migration** (Priority: Critical)
   - [ ] Create `payments/supabaseMappers.ts`
   - [ ] Update `payments/services.ts`
   - [ ] Test payment processing
   - [ ] Test refund flow

### This Sprint (Week 2-3)

- [ ] Complete Orders Store → Supabase
- [ ] Complete Payments Store → Supabase
- [ ] Complete Products Store → Supabase (READ only for POS)
- [ ] Complete Tables Store → Supabase
- [ ] Deploy to production
- [ ] E2E testing

### Next Sprint (Sprint 8-9)

- [ ] Migrate Menu & Recipes
- [ ] Migrate Storage & Inventory
- [ ] Migrate Suppliers & Counteragents
- [ ] Migrate Preparations & Sales

---

**Last Updated:** 2025-11-14
**Current Status:** Sprint 7 - Week 2 (Shifts ✅, Orders/Payments 🚧)
**Overall Progress:** 🟡 20% (1 of 5 critical entities migrated)
