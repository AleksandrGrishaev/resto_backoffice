# 🐛 System Errors & Issues

> **Purpose:** Track runtime errors and bugs for future sprints
> **Status:** Active tracking
> **Last Updated:** 2025-11-23

---

## 📋 Table of Contents

- [POS Module](#pos-module)
- [Backoffice Module](#backoffice-module)
- [Kitchen Module](#kitchen-module)
- [Cross-Module Issues](#cross-module-issues)

---

## POS Module

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
- `src/stores/sales/recipeWriteOff/composables/useDecomposition.ts:23` - Store check

**Workaround:**
Login as admin/manager instead of cashier (they get all stores loaded)

**Fix Priority:** 🔥 Critical - Fix in next sprint

**Solution Options:**

1. Load RecipesStore for all roles (increases memory but simple)
2. Make decomposition optional if RecipesStore not available (skip write-off)
3. Lazy-load RecipesStore on first payment (complex but efficient)
4. Pre-compute decompositions and store in menu_items table (best performance)

---

## Backoffice Module

> No open errors

---

## Kitchen Module

> No critical errors reported yet

---

## Cross-Module Issues

> No cross-module issues reported yet

---

## 📊 Statistics

- **Total Errors:** 1
- **Critical (🔴):** 1
- **High Priority (🟠):** 0
- **Medium Priority (🟡):** 0
- **Low Priority (🟢):** 0

**By Module:**

- POS: 1 error
- Backoffice: 0 errors
- Kitchen: 0 errors

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
