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

### 🔴 ERROR-POS-001: Write-off fails due to incorrect quantity calculation

**Status:** 🔴 Critical - Blocks sales operations

**Discovered:** 2025-11-22T23:20:06

**Module:** POS → Sales → Recipe Write-off

**Description:**
When processing payment for menu items, the recipe decomposition calculates incorrect ingredient quantities, causing write-off to fail with insufficient stock error.

**Error Flow:**
```
Payment → Sales Transaction → Recipe Write-off → Decomposition → Storage Write-off ❌
```

**Example Case:**
- **Menu Item:** French Fries (Regular Portion)
- **Expected:** Small amount of oil for frying (~20-30ml per portion)
- **Actual:** System tries to write off 40,000 ml (40 liters!)
- **Available Stock:** 1,500 ml
- **Error:** `Insufficient quantity. Need 40000, available 1500`

**Technical Details:**
```javascript
// Decomposition log shows incorrect multiplication:
{
  type: 'product',
  id: 'olive-oil-id',
  quantity: 200,      // Base quantity in recipe
  multiplier: 200     // ❌ Wrong multiplier (should be 1 for single portion)
}
// Result: 200 * 200 = 40,000 ml instead of 200 ml
```

**Root Cause:**
Likely issue in preparation recipe composition or decomposition multiplier calculation in `useDecomposition.ts`

**Impact:**
- All menu items with preparations fail to process payment
- Sales cannot be completed
- POS system unusable for items requiring ingredient write-off

**Affected Files:**
- `src/stores/recipes/composables/useDecomposition.ts:114` - Decomposition logic
- `src/stores/sales/recipeWriteOffStore.ts:129` - Write-off processing
- `src/stores/storage/storageService.ts:841` - FIFO allocation

**Workaround:**
None - payment processing blocked for affected items

**Fix Priority:** 🔥 Urgent - Next sprint

**Related Issues:** None

---

## Backoffice Module

> No critical errors reported yet

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
