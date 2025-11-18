# Counteragents Store Migration to Supabase

## 📋 Overview

Migration of Counteragents Store from mock data to Supabase-only operations following Phase 2 mock cleanup pattern.

**Status:** 🔲 In Progress
**Priority:** High (Phase 2 cleanup)
**Database:** ✅ Table exists with data (9 counteragents)

---

## 🎯 Current State Analysis

### ✅ Database Ready

- **Table**: `public.counteragents` exists
- **Schema**: Full counteragent schema with UUID primary keys
- **Data**: 9 counteragents already seeded (7 suppliers, 2 service providers)
- **Indexes**: Proper indexes on type, is_active, is_preferred, name

### ❌ Frontend Issues Found

1. **counteragentsService.ts:12-17** - Imports mock functions
2. **counteragentsService.ts:35** - Uses mock data in constructor
3. **counteragents/index.ts:25-34** - Exports mock data functions
4. **No Supabase integration** - Store uses only localStorage + mock data

### 📊 Current Data Flow

```
counteragentsService.ts → Mock Data → UI
                ↓
        localStorage (fallback only)
```

### 🎯 Target Data Flow

```
counteragentsService.ts → Supabase → UI (with localStorage cache fallback)
```

---

## 🛠️ Migration Tasks

### Task 1: Create Supabase Service Layer

**File:** `src/stores/counteragents/supabase/counteragentsSupabaseService.ts`

**Pattern:** Follow existing pattern from `productsService.ts` and `menuService.ts`

**Requirements:**

- ✅ Use Supabase client with TypeScript types
- ✅ Implement CRUD operations with proper error handling
- ✅ Add localStorage cache fallback
- ✅ Use dual-write pattern (Supabase + localStorage)
- ✅ Map snake_case ↔ camelCase properly
- ✅ Handle UUID generation (auto from DB)
- ✅ Implement all existing service methods

**Methods to implement:**

```typescript
- fetchCounterAgents(filters?: CounteragentFilters)
- getCounteragentById(id: string)
- createCounteragent(data: CreateCounteragentData)
- updateCounteragent(id: string, data: Partial<Counteragent>)
- deleteCounteragent(id: string)
- searchCounterAgents(query: string)
- getCounteragentsByType(type: string)
- getCounteragentsByCategory(category: string)
- getCounteragentsStatistics()
- toggleCounteragentStatus(id: string)
- setPreferredStatus(id: string, isPreferred: boolean)
- bulkUpdateStatus(ids: string[], isActive: boolean)
- bulkDelete(ids: string[])
```

### Task 2: Create Supabase Mappers

**File:** `src/stores/counteragents/supabase/mappers.ts`

**Requirements:**

- ✅ Map Counteragent ↔ Database row
- ✅ Handle UUID fields properly
- ✅ Convert arrays (product_categories, tags)
- ✅ Handle JSONB fields (balance_history)
- ✅ Handle decimal fields (credit_limit, current_balance, etc.)

**Mapping:**

```typescript
// TypeScript → Supabase
interface Counteragent {
  id: string → id: uuid (auto-generated)
  name: string → name: text
  displayName: string → display_name: text
  type: CounteragentType → type: text
  productCategories: string[] → product_categories: text[]
  balanceHistory: BalanceHistoryEntry[] → balance_history: jsonb
  // ... other fields
}
```

### Task 3: Update Main Service

**File:** `src/stores/counteragents/counteragentsService.ts`

**Changes:**

- ✅ Import Supabase service instead of mock
- ✅ Remove mock data constructor
- ✅ Implement dual-write pattern
- ✅ Add localStorage cache fallback
- ✅ Maintain all existing method signatures
- ✅ Add error handling for Supabase failures

### Task 4: Clean Up Exports

**File:** `src/stores/counteragents/index.ts`

**Actions:**

- ✅ Remove mock data exports (lines 25-34)
- ✅ Keep types, store, and constants
- ✅ Add Supabase service export
- ✅ Maintain backward compatibility for existing imports

### Task 5: Delete Mock Files

**Files to remove:**

- `src/stores/counteragents/mock/counteragentsMock.ts`
- `src/stores/counteragents/mock/` directory (if empty)

### Task 6: Update App Initialization

**File:** `src/core/appInitializer.ts` (if needed)

**Actions:**

- ✅ Verify counteragents store initializes correctly
- ✅ No mock dependencies in initialization
- ✅ Store loads from Supabase properly

---

## 🔄 Implementation Pattern

### Follow Existing Pattern

Use the same pattern as successfully migrated stores:

1. **Products Store** - ✅ Migrated (Phase 1)
2. **Menu Store** - ✅ Migrated (Phase 2)
3. **Account Store** - ✅ Migrated (Phase 2)

### Code Template

```typescript
// counteragentsSupabaseService.ts
import { supabase } from '@/config/supabase'
import { DebugUtils } from '@/utils'
import type { Counteragent, CreateCounteragentData } from '../types'

export class CounteragentsSupabaseService {
  private static instance: CounteragentsSupabaseService

  static getInstance(): CounteragentsSupabaseService {
    if (!CounteragentsSupabaseService.instance) {
      CounteragentsSupabaseService.instance = new CounteragentsSupabaseService()
    }
    return CounteragentsSupabaseService.instance
  }

  async fetchCounterAgents(filters?: CounteragentFilters): Promise<CounteragentsResponse> {
    try {
      let query = supabase.from('counteragents').select('*', { count: 'exact' })

      // Apply filters
      if (filters) {
        if (filters.type && filters.type !== 'all') {
          query = query.eq('type', filters.type)
        }
        if (typeof filters.isActive === 'boolean') {
          query = query.eq('is_active', filters.isActive)
        }
        if (typeof filters.isPreferred === 'boolean') {
          query = query.eq('is_preferred', filters.isPreferred)
        }
        if (filters.search) {
          query = query.or(`name.ilike.%${filters.search}%,display_name.ilike.%${filters.search}%`)
        }
        // ... other filters
      }

      const { data, error, count } = await query

      if (error) throw error

      // Cache to localStorage
      localStorage.setItem(
        'counteragents_cache',
        JSON.stringify({
          data,
          timestamp: Date.now(),
          total: count
        })
      )

      return {
        data: data ? data.map(mapFromDatabase) : [],
        total: count || 0,
        page: filters?.page || 1,
        limit: filters?.limit || 10
      }
    } catch (error) {
      DebugUtils.error('CounteragentsSupabaseService', 'Failed to fetch counteragents', { error })

      // Fallback to cache
      return this.getFromCache()
    }
  }

  // ... other methods
}
```

---

## 📋 Database Schema Reference

```sql
CREATE TABLE public.counteragents (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4 (),
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  name text NOT NULL,
  display_name text NULL,
  type text NOT NULL CHECK (type IN ('supplier', 'service', 'other')),
  contact_person text NULL,
  phone text NULL,
  email text NULL,
  address text NULL,
  website text NULL,
  product_categories text[] NULL DEFAULT ARRAY[]::text[],
  payment_terms text NOT NULL DEFAULT 'on_delivery' CHECK (payment_terms IN ('prepaid', 'on_delivery', 'after', 'custom')),
  credit_limit numeric(15, 2) NULL,
  lead_time_days integer NOT NULL DEFAULT 1,
  delivery_schedule text NULL CHECK (delivery_schedule IN ('daily', 'weekly', 'biweekly', 'monthly', 'on_demand')),
  min_order_amount numeric(15, 2) NULL,
  description text NULL,
  tags text[] NULL DEFAULT ARRAY[]::text[],
  notes text NULL,
  is_active boolean NULL DEFAULT true,
  is_preferred boolean NULL DEFAULT false,
  total_orders integer NULL DEFAULT 0,
  total_order_value numeric(15, 2) NULL DEFAULT 0,
  last_order_date timestamp with time zone NULL,
  average_delivery_time numeric(5, 2) NULL,
  current_balance numeric(15, 2) NULL DEFAULT 0,
  balance_history jsonb NULL DEFAULT '[]'::jsonb,
  last_balance_update timestamp with time zone NULL,
  CONSTRAINT counteragents_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX idx_counteragents_type ON public.counteragents USING btree (type);
CREATE INDEX idx_counteragents_is_active ON public.counteragents USING btree (is_active);
CREATE INDEX idx_counteragents_is_preferred ON public.counteragents USING btree (is_preferred);
CREATE INDEX idx_counteragents_name ON public.counteragents USING btree (name);
```

---

## ✅ Acceptance Criteria

### Functional Requirements

1. ✅ Store reads from Supabase instead of mock data
2. ✅ All CRUD operations work with Supabase
3. ✅ localStorage cache fallback works when Supabase unavailable
4. ✅ No mock file imports in production code
5. ✅ UI displays real counteragent data from database
6. ✅ Filtering and search work with Supabase data
7. ✅ Statistics calculation works with real data

### Technical Requirements

1. ✅ TypeScript types match database schema
2. ✅ Proper error handling and logging
3. ✅ UUID generation handled by database
4. ✅ Snake_case ↔ camelCase mapping
5. ✅ Array fields (product_categories, tags) handled correctly
6. ✅ JSONB fields (balance_history) handled correctly

### Integration Requirements

1. ✅ App initializes without errors
2. ✅ Counteragents page loads with real data
3. ✅ Supplier selection works in other stores
4. ✅ No console errors about missing mock data
5. ✅ Build succeeds without mock dependencies

---

## 🧪 Testing Checklist

### Pre-Migration Tests

- [ ] Verify current app works with mock data
- [ ] Check all counteragent-related functionality
- [ ] Note current UI behavior

### Post-Migration Tests

- [ ] App loads without errors
- [ ] Counteragents list shows real data (9 records)
- [ ] Search and filtering work
- [ ] Create new counteragent works
- [ ] Edit existing counteragent works
- [ ] Delete counteragent works
- [ ] Statistics calculation works
- [ ] Bulk operations work
- [ ] Supplier selection works in other modules

### Integration Tests

- [ ] Products store can get supplier info
- [ ] Supplier store integration works
- [ ] Account store integration (future) works

---

## 📦 Dependencies

### Internal Dependencies

- ✅ Supabase client configuration
- ✅ DebugUtils for logging
- ✅ TimeUtils for timestamps
- ✅ Counteragent TypeScript types
- ✅ Existing localStorage cache structure

### External Dependencies

- ✅ Supabase JS client
- ✅ UUID generation (database-side)
- ✅ Browser localStorage API

---

## 🚨 Risks and Mitigations

### Risk 1: Data Type Mismatch

**Mitigation:** Use proper mappers and TypeScript validation

### Risk 2: API Rate Limits

**Mitigation:** Implement localStorage cache and optimistic updates

### Risk 3: Network Failures

**Mitigation:** Dual-write pattern with localStorage fallback

### Risk 4: Complex Query Performance

**Mitigation:** Use proper indexes and optimize filters

---

## 📈 Expected Outcomes

### Benefits

- ✅ Real data persistence
- ✅ Multi-user data consistency
- ✅ Production-ready counteragent management
- ✅ Cleaner codebase (no mock dependencies)
- ✅ Follows established migration pattern

### Performance

- ✅ Faster initial load (from cache)
- ✅ Real-time updates across users
- ✅ Better search performance (database indexes)

---

## 📝 Notes

1. **Database is ready** - Table exists with proper schema and data
2. **Follow established pattern** - Use same approach as products/menu stores
3. **Maintain backward compatibility** - Keep existing method signatures
4. **Handle complex fields** - Arrays (product_categories) and JSONB (balance_history)
5. **Cache strategy** - localStorage cache for offline resilience

---

**Last Updated:** 2025-11-18
**Status:** 🔲 Ready for implementation
**Priority:** High (Phase 2 cleanup)
