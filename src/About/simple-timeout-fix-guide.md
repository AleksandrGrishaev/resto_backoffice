# Supabase Timeout Fix - Simple Guide for Junior Developer

**Date:** 2025-11-26
**Status:** READY TO IMPLEMENT
**Difficulty:** 🟢 Beginner-friendly
**Time:** ~2 hours

---

## 📋 Task

Find all services that use the **old pattern** with `withTimeout()` and `SUPABASE_TIMEOUT = 5000`, and replace them with the **new pattern** using `executeSupabaseQuery()`.

---

## 🎯 Goal

Fix timeout errors in Supabase requests:

- ❌ **Before:** Timeout after 5 seconds, no retry → requests fail
- ✅ **After:** Timeout after 15 seconds, 3 retry attempts → requests succeed

---

## 🔍 Step 1: Find all files with the problem

### Search using grep:

```bash
# Find all files with withTimeout
grep -r "withTimeout" src/stores --include="*.ts"

# Find all files with SUPABASE_TIMEOUT
grep -r "SUPABASE_TIMEOUT" src/stores --include="*.ts"
```

### Or use VSCode Search:

1. Open Search (`Cmd+Shift+F` or `Ctrl+Shift+F`)
2. Search for: `withTimeout`
3. Filter: `src/stores/**/*.ts`

### Expected files:

```
src/stores/supplier_2/supplierService.ts
src/stores/storage/storageService.ts
src/stores/recipes/recipeService.ts
... (and others)
```

---

## 🛠️ Step 2: Fix each file

### Replacement pattern (3 simple actions):

#### **Action 1:** Remove old code

**DELETE this block:**

```typescript
// Helper: Timeout wrapper for Supabase requests
const SUPABASE_TIMEOUT = 5000 // 5 seconds

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = SUPABASE_TIMEOUT
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase request timeout')), timeoutMs)
    )
  ])
}
```

#### **Action 2:** Add import

**ADD to imports:**

```typescript
import { executeSupabaseQuery } from '@/utils'
```

**Example:**

```typescript
// BEFORE
import { DebugUtils } from '@/utils'

// AFTER
import { DebugUtils, executeSupabaseQuery } from '@/utils'
```

#### **Action 3:** Replace queries

**BEFORE (old pattern):**

```typescript
async getAllSomething(): Promise<Something[]> {
  try {
    const { data, error } = await withTimeout(
      supabase.from('table_name').select('*').order('name', { ascending: true })
    )

    if (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to fetch', error)
      throw error
    }

    const items = data ? data.map(mapFromSupabase) : []
    DebugUtils.info(MODULE_NAME, 'Items loaded', { count: items.length })
    return items
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Error', error)
    throw error
  }
}
```

**AFTER (new pattern):**

```typescript
async getAllSomething(): Promise<Something[]> {
  try {
    const data = await executeSupabaseQuery(
      supabase.from('table_name').select('*').order('name', { ascending: true }),
      `${MODULE_NAME}.getAllSomething`
    )

    const items = data.map(mapFromSupabase)
    DebugUtils.info(MODULE_NAME, 'Items loaded', { count: items.length })
    return items
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Error', error)
    throw error
  }
}
```

---

## 📚 Examples

### Example 1: Simple SELECT query

#### **BEFORE:**

```typescript
async getOrders(): Promise<Order[]> {
  const { data, error } = await withTimeout(
    supabase.from('orders').select('*')
  )

  if (error) throw error
  return data || []
}
```

#### **AFTER:**

```typescript
async getOrders(): Promise<Order[]> {
  const data = await executeSupabaseQuery(
    supabase.from('orders').select('*'),
    `${MODULE_NAME}.getOrders`
  )

  return data
}
```

**Key changes:**

- ❌ Remove `withTimeout()`
- ❌ Remove `const { data, error } = await`
- ❌ Remove `if (error) throw error`
- ❌ Remove `data || []`
- ✅ Use `executeSupabaseQuery()`
- ✅ Just return `data` (already an array)

---

### Example 2: SELECT with join

#### **BEFORE:**

```typescript
async getOrdersWithItems(): Promise<Order[]> {
  const { data, error } = await withTimeout(
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })
  )

  if (error) {
    DebugUtils.error(MODULE_NAME, 'Failed', error)
    throw error
  }

  return data || []
}
```

#### **AFTER:**

```typescript
async getOrdersWithItems(): Promise<Order[]> {
  const data = await executeSupabaseQuery(
    supabase
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false }),
    `${MODULE_NAME}.getOrdersWithItems`
  )

  return data
}
```

---

### Example 3: SELECT single (with .single())

**For single queries use `executeSupabaseSingle`:**

#### **BEFORE:**

```typescript
async getById(id: string): Promise<Item | null> {
  const { data, error } = await withTimeout(
    supabase.from('items').select('*').eq('id', id).single()
  )

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }

  return data
}
```

#### **AFTER:**

```typescript
import { executeSupabaseSingle } from '@/utils'

async getById(id: string): Promise<Item | null> {
  const data = await executeSupabaseSingle(
    supabase.from('items').select('*').eq('id', id),
    `${MODULE_NAME}.getById`
  )

  return data // executeSupabaseSingle already handles PGRST116 (not found)
}
```

**Note:** Don't add `.single()` - `executeSupabaseSingle` does it automatically!

---

### Example 4: Parallel queries (Promise.all)

#### **BEFORE:**

```typescript
async loadAll(): Promise<void> {
  const [productsResult, categoriesResult] = await Promise.all([
    withTimeout(supabase.from('products').select('*')),
    withTimeout(supabase.from('categories').select('*'))
  ])

  if (productsResult.error) throw productsResult.error
  if (categoriesResult.error) throw categoriesResult.error

  this.products = productsResult.data || []
  this.categories = categoriesResult.data || []
}
```

#### **AFTER:**

```typescript
async loadAll(): Promise<void> {
  const [products, categories] = await Promise.all([
    executeSupabaseQuery(
      supabase.from('products').select('*'),
      `${MODULE_NAME}.loadAll.products`
    ),
    executeSupabaseQuery(
      supabase.from('categories').select('*'),
      `${MODULE_NAME}.loadAll.categories`
    )
  ])

  this.products = products
  this.categories = categories
}
```

**Much cleaner!** No error checks, no `data || []`, just simple code.

---

## ✅ Checklist for each file

For **each file** with `withTimeout`:

- [ ] 1. Delete `SUPABASE_TIMEOUT` constant
- [ ] 2. Delete `withTimeout()` function
- [ ] 3. Add `executeSupabaseQuery` to imports
- [ ] 4. Replace all `withTimeout(supabase.from(...)...)` with `executeSupabaseQuery()`
- [ ] 5. Remove `if (error)` checks (executeSupabaseQuery throws automatically)
- [ ] 6. Remove `data || []` (executeSupabaseQuery always returns array)
- [ ] 7. Save file and check for TypeScript errors

---

## 🧪 How to verify everything works

### 1. Find remaining withTimeout:

```bash
grep -r "withTimeout" src/stores --include="*.ts"
```

**Expected result:** Empty (0 files)

### 2. Find remaining SUPABASE_TIMEOUT:

```bash
grep -r "SUPABASE_TIMEOUT" src/stores --include="*.ts"
```

**Expected result:** Empty (0 files)

### 3. Run the app:

```bash
pnpm dev
```

### 4. Open browser console and check logs:

**✅ Good - normal operation:**

```
[INFO] [SupplierService]: ✅ Orders loaded from Supabase {count: 5}
```

**✅ Good - retry worked:**

```
[WARN] [SupabaseRetryHandler]: ⏳ SupplierService.getOrders failed, retrying...
[INFO] [SupabaseRetryHandler]: ✅ SupplierService.getOrders succeeded after retry
[INFO] [SupplierService]: ✅ Orders loaded from Supabase {count: 5}
```

**❌ Bad - error still exists:**

```
[ERROR] [SupplierService]: Failed to fetch orders: Supabase request timeout
```

→ Something was missed, check again

---

## 📝 List of files to fix

Check these files (not all may use withTimeout):

```
src/stores/supplier_2/supplierService.ts
src/stores/storage/storageService.ts
src/stores/recipes/recipeService.ts
src/stores/preparation/preparationService.ts
src/stores/counteragents/counteragentsService.ts
```

**Tip:** Use grep to find exact list:

```bash
grep -l "withTimeout" src/stores/**/*.ts
```

---

## ❓ FAQ

### Q: What about INSERT/UPDATE/DELETE queries?

**A:** Use `executeSupabaseMutation`:

```typescript
import { executeSupabaseMutation } from '@/utils'

async deleteOrder(id: string): Promise<void> {
  await executeSupabaseMutation(
    async () => {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    `${MODULE_NAME}.deleteOrder`
  )
}
```

### Q: What if there's localStorage cache fallback?

**A:** Keep the fallback, just wrap Supabase query:

```typescript
async getAll(): Promise<Item[]> {
  try {
    // Try Supabase with retry
    const data = await executeSupabaseQuery(
      supabase.from('items').select('*'),
      `${MODULE_NAME}.getAll`
    )

    // Cache to localStorage
    localStorage.setItem('items_cache', JSON.stringify(data))
    return data
  } catch (error) {
    // Fallback to cache
    const cached = localStorage.getItem('items_cache')
    if (cached) return JSON.parse(cached)
    return []
  }
}
```

### Q: What if I get TypeScript errors?

**A:** Check:

1. Import added? `import { executeSupabaseQuery } from '@/utils'`
2. Old `withTimeout` removed?
3. Correct syntax? See examples above

---

## 🎓 Additional information

### Documentation:

- `src/core/request/SupabaseRetryHandler.ts` - retry logic
- `src/utils/supabase.ts` - helper functions
- `src/config/environment.ts` - timeout/retry configuration

### Settings (can be changed in `.env.development`):

```bash
VITE_SUPABASE_TIMEOUT=15000        # Timeout in milliseconds
VITE_SUPABASE_MAX_RETRIES=3        # Number of retry attempts
VITE_SUPABASE_RETRY_DELAY=1000     # Delay between retries (exponential)
```

---

## ✅ Done!

After fixing everything:

1. ✅ All timeout errors should disappear
2. ✅ App should work stably even with slow internet
3. ✅ Retry logs should appear in console when there are network issues

**If something is unclear - ask!** 🚀
