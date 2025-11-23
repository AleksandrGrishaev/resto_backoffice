# 🐛 System Errors & Issues

> **Purpose:** Track runtime errors and bugs for future sprints
> **Status:** Active tracking
> **Last Updated:** 2025-11-22

---

## 📋 Table of Contents

- [POS Module](#pos-module)
- [Backoffice Module](#backoffice-module)
- [Kitchen Module](#kitchen-module)
- [Cross-Module Issues](#cross-module-issues)

---

## POS Module

### ✅ ERROR-POS-001: Write-off fails due to incorrect quantity calculation

**Status:** ✅ FIXED - 2025-11-23

**Discovered:** 2025-11-22T23:20:06

**Fixed:** 2025-11-23T15:45:00

**Module:** POS → Sales → Recipe Write-off

**Description:**
When processing payment for menu items, the recipe decomposition calculates incorrect ingredient quantities, causing write-off to fail with insufficient stock error.

**Error Flow:**

```
Payment → Sales Transaction → Recipe Write-off → Decomposition → Storage Write-off ❌
```

**Example Case:**

- **Menu Item:** Steak with Fries (1 portion)
- **Expected:** 250g beef steak per portion
- **Actual:** System tries to write off 62,500g (62.5 kg!)
- **Available Stock:** 7,100g (7.1 kg)
- **Error:** `Insufficient quantity. Need 62500, available 7100`

**Technical Details:**

```javascript
// Decomposition log shows incorrect multiplication:
{
  type: 'recipe',
  id: 'steak-recipe',
  quantity: 250,      // Recipe portion size (250g)
  multiplier: 250     // ❌ Wrong! Should be 1 (number of portions sold)
}
// In decomposeRecipe (line 208):
await decomposeComposition(menuComp, comp.quantity * quantity)
// = comp.quantity (250) * quantity (1) = 250 ❌ WRONG MULTIPLIER

// Then in decomposeProduct (line 154):
totalQuantity = comp.quantity * quantity
// = 250 (beef in recipe) * 250 (wrong multiplier) = 62,500g ❌
```

**Root Cause:**
Incorrect multiplier calculation in `useDecomposition.ts`:

- Lines 208 and 249 multiply `comp.quantity * quantity`
- This creates wrong multiplier: recipe portion size instead of sold quantity
- Should pass only `quantity` (number of portions sold)

**Impact:**

- All menu items with recipes/preparations fail to process payment
- Sales cannot be completed
- POS system unusable for items requiring ingredient write-off

**Affected Files:**

- `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts:208` - decomposeRecipe multiplier
- `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts:249` - decomposePreparation multiplier
- `src/stores/storage/storageService.ts:273` - Insufficient quantity check

**Fix Applied:**

1. **useDecomposition.ts line 208:** Changed `comp.quantity * quantity` → `quantity`
2. **useDecomposition.ts line 249:** Changed `comp.quantity * quantity` → `quantity`
3. **storageService.ts line 273:** Changed `throw new Error` → `DebugUtils.warn` (allow negative stock)

**Result:**

```javascript
// BEFORE: 250 * 250 = 62,500g
// AFTER:  250 * 1 = 250g ✅
```

**Secondary Fix:**
Removed hard block on insufficient quantity in `storageService.ts`. Now logs warning and allows negative stock (intentional for POS operations).

**Related Issues:** ERROR-POS-002

---

### 🔴 ERROR-POS-002: RecipesStore not initialized for cashier role

**Status:** 🔴 Critical - Blocks payment processing for cashiers

**Discovered:** 2025-11-23T14:40:00

**Module:** POS → Sales → Payment Processing

**Description:**
When cashier (PIN user) tries to process payment, SalesStore attempts to decompose menu items but RecipesStore is not initialized, causing payment to fail.

**Error Message:**

```
❌ RecipesStore is not initialized! Decomposition requires recipes and preparations data.
Ensure appInitializer loads recipesStore before processing payments.
```

**Error Flow:**

```
Process Payment → recordSalesTransaction → decomposeMenuItem →
checkStoresInitialized → RecipesStore not found ❌
```

**Root Cause:**
AppInitializer only loads RecipesStore for admin/manager roles (backoffice functionality). Cashier role only loads POS stores (tables, orders, payments, shifts). However, SalesStore.recordSalesTransaction() requires RecipesStore for decomposition to calculate ingredient write-offs.

**Code Location:**

```typescript
// src/core/appInitializer.ts
shouldInitializeBackoffice(userRoles) {
  return hasAnyRole(userRoles, ['admin', 'manager'])
  // ❌ Cashiers don't get backoffice stores including RecipesStore
}

// src/stores/sales/salesStore.ts:171
const menuItemDecomposition = await decomposeMenuItem(item.menuItemId)
// ❌ Tries to access RecipesStore which doesn't exist for cashiers
```

**Impact:**

- Payment processing fails for all cashiers
- POS system unusable for sales transactions
- Manual workaround: Admin must process all payments
- Revenue tracking broken

**Affected Files:**

- `src/core/appInitializer.ts:66` - Role-based initialization
- `src/stores/sales/salesStore.ts:171` - Decomposition call
- `src/stores/recipes/composables/useDecomposition.ts:23` - Store check

**Workaround:**
Login as admin/manager instead of cashier (they get all stores loaded)

**Fix Priority:** 🔥 Critical - Fix immediately

**Solution Options:**

1. Load RecipesStore for all roles (increases memory but simple)
2. Make decomposition optional if RecipesStore not available (skip write-off)
3. Lazy-load RecipesStore on first payment (complex but efficient)
4. Pre-compute decompositions and store in menu_items table (best performance)

**Related Issues:** ERROR-POS-001 (also related to recipe decomposition)

---

## Backoffice Module

### ✅ ERROR-AUTH-001: Infinite recursion in users table RLS policies

**Status:** ✅ FIXED - 2025-11-23

**Discovered:** 2025-11-23T14:31:42

**Module:** Authentication → Users Table → RLS Policies

**Description:**
When trying to query users table, PostgreSQL detects infinite recursion in RLS policy, causing 500 Internal Server Error.

**Error Message:**

```
{code: '42P17', details: null, hint: null,
 message: 'infinite recursion detected in policy for relation "users"'}
```

**Error Flow:**

```
Email Login → signInWithPassword → loadUserProfile →
SELECT FROM users → RLS Check → EXISTS(SELECT FROM users) →
RLS Check → EXISTS(SELECT FROM users) → INFINITE RECURSION ❌
```

**Root Cause:**
Admin RLS policies check the `users` table within the same table query:

```sql
-- Migration 008 - BROKEN POLICY
CREATE POLICY "admins_view_all_users" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u  -- ❌ This causes recursion!
      WHERE u.id = auth.uid()
      AND 'admin' = ANY(u.roles)
    )
  );
```

When PostgreSQL evaluates `SELECT FROM users`, it checks the policy.
The policy does `EXISTS(SELECT FROM users)`, which checks the policy again → recursion.

**Impact:**

- Email login fails completely
- PIN login fails completely
- Cannot load user profiles
- Authentication system unusable
- Application cannot start

**Affected Files:**

- `supabase/migrations/008_add_missing_users_admin_policies.sql` - Broken policies
- `src/stores/auth/authStore.ts:102` - loadUserProfile() fails

**Workaround:**
Enable SERVICE_KEY temporarily: `VITE_SUPABASE_USE_SERVICE_KEY=true`

**Fix Priority:** 🔥 Critical - Fix immediately

**Solution:**
Use SECURITY DEFINER function or check user metadata instead of querying users table.

---

### ✅ ERROR-AUTH-002: RPC function get_pin_user_credentials not found (404)

**Status:** ✅ FIXED - 2025-11-23

**Discovered:** 2025-11-23T14:31:27

**Module:** Authentication → PIN Login → RPC

**Description:**
RPC function `get_pin_user_credentials` returns 404 Not Found when called from client.

**Error:**

```
POST https://fjkfckjpnbcyuknsnchy.supabase.co/rest/v1/rpc/get_pin_user_credentials
404 (Not Found)
```

**Error Flow:**

```
PIN Login → authStore.loginWithPin() →
supabase.rpc('get_pin_user_credentials') → 404 Not Found ❌
```

**Root Cause:**
RPC function created via `mcp__supabase__apply_migration` but not exposed to PostgREST.

**Possible causes:**

1. Function not in `public` schema
2. Function not granted to `anon` role
3. PostgREST schema cache not refreshed
4. Function signature mismatch

**Impact:**

- PIN login completely broken
- Cashiers, kitchen staff, bartenders cannot login
- POS system inaccessible

**Affected Files:**

- `supabase/migrations/009_pin_auth_get_credentials.sql` - RPC function
- `src/stores/auth/authStore.ts:152` - Calls the RPC

**Workaround:**
None - PIN login unusable

**Fix Priority:** 🔥 Critical - Fix immediately

**Solution:**

1. Verify function exists in database
2. Grant execute to `anon` role: `GRANT EXECUTE ON FUNCTION get_pin_user_credentials TO anon`
3. Reload PostgREST schema cache

---

## Kitchen Module

> No critical errors reported yet

---

## Cross-Module Issues

> No cross-module issues reported yet

---

## 📊 Statistics

- **Total Errors:** 4
- **Fixed (✅):** 3
- **Open Critical (🔴):** 1
- **High Priority (🟠):** 0
- **Medium Priority (🟡):** 0
- **Low Priority (🟢):** 0

**By Module:**

- POS: 2 errors (1 fixed, 1 open)
- Backoffice/Auth: 2 errors (2 fixed)
- Kitchen: 0 errors

**Recently Fixed (2025-11-23):**

- ✅ ERROR-POS-001: Recipe decomposition multiplier fix
- ✅ ERROR-AUTH-001: RLS recursion fix (SECURITY DEFINER function)
- ✅ ERROR-AUTH-002: RPC permissions fix (GRANT EXECUTE)

---

## 🔧 Error Template

```markdown
### 🔴 ERROR-[MODULE]-[NUMBER]: Brief description

**Status:** 🔴/🟠/🟡/🟢 Priority level

**Discovered:** YYYY-MM-DDTHH:mm:ss

**Module:** Module path

**Description:**
Clear description of the error

**Error Flow:**
Step 1 → Step 2 → Step 3 ❌

**Technical Details:**
Code snippets, logs, stack traces

**Root Cause:**
Analysis of the underlying issue

**Impact:**
Business impact and affected functionality

**Affected Files:**

- file1.ts:line - description
- file2.ts:line - description

**Workaround:**
Temporary solution if available

**Fix Priority:** Priority level - timeline

**Related Issues:** Links or references
```

---

**Legend:**

- 🔴 Critical - System blocker, must fix immediately
- 🟠 High - Major functionality broken, fix in current sprint
- 🟡 Medium - Feature degraded, fix in next sprint
- 🟢 Low - Minor issue, fix when convenient
