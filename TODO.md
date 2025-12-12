# TODO: Food Cost KPI Implementation

## Summary

Implement Food Cost KPI for Kitchen Monitor with monthly COGS statistics:

- Sales COGS (FIFO) - cost of goods sold from sales
- Spoilage & Losses - write-offs
- Shortage - inventory adjustment (-)
- Surplus - inventory adjustment (+)
- Total COGS = Sales COGS + Spoilage + Shortage - Surplus

---

## Phase 1: Kitchen Monitor Food Cost KPI

### 1.1 Create Types

**File:** `src/stores/kitchenKpi/types.ts`

Add `FoodCostKpiMetrics` interface with:

- Period (start/end dates)
- Revenue (total, by department)
- COGS components (salesCOGS, spoilage, shortage, surplus, totalCOGS)
- Percentages for each component
- Target % and variance

### 1.2 Create Service

**File:** `src/stores/kitchenKpi/services/foodCostKpiService.ts`

Function: `getFoodCostKpiMonth(month?: Date, department?: 'kitchen' | 'bar' | null)`

- Load sales_transactions for the period
- Filter by department if specified
- Calculate salesCOGS from actualCost
- Load write-offs (spoilage, shortage)
- Load corrections (surplus)
- Return FoodCostKpiMetrics

### 1.3 Create Composable

**File:** `src/stores/kitchenKpi/composables/useFoodCostKpi.ts`

Pattern like `useTimeKpi`:

- Accepts `selectedDepartment` as Ref
- `loadMonthKpi(date?)` function
- Returns metrics, loading, error states

### 1.4 Implement FoodCostKpiCard

**File:** `src/views/kitchen/kpi/components/FoodCostKpiCard.vue`

Display:

- Month period
- Revenue
- COGS breakdown (Sales COGS, Spoilage, Shortage, Surplus)
- Total COGS %
- Target comparison with color coding

### 1.5 Implement FoodCostKpiTab

**File:** `src/views/kitchen/kpi/components/FoodCostKpiTab.vue`

Detailed table with COGS components

### 1.6 Integrate into KpiScreen

**File:** `src/views/kitchen/kpi/KpiScreen.vue`

- Enable Food Cost tab (remove disabled)
- Add `useFoodCostKpi(departmentRef)`
- Call `loadMonthKpi()` in loadData

### 1.7 Export from Index

**File:** `src/stores/kitchenKpi/composables/index.ts`

---

## Phase 2: Backoffice COGS Settings

### 2.1 Create Settings Store

**File:** `src/stores/kitchenKpi/cogsSettingsStore.ts`

Settings:

- **Target % per department:**
  - Kitchen: 30% (default)
  - Bar: 25% (default)
- **Product assignments for `kitchenAndBar` products:**
  - Map<productId, 'kitchen' | 'bar'>
  - Default: kitchen

### 2.2 Create Settings View

**File:** `src/views/backoffice/salary/CogsSettingsView.vue`

UI sections:

1. TARGET FOOD COST % - input fields for Kitchen and Bar targets
2. PRODUCT DEPARTMENT ASSIGNMENT - table with kitchenAndBar products and dropdown to assign department

### 2.3 Add Route

**File:** `src/router/index.ts`

```typescript
{
  path: '/salary/kpi-cogs',
  name: 'cogs-settings',
  component: () => import('@/views/backoffice/salary/CogsSettingsView.vue'),
  meta: { allowedRoles: ['admin', 'manager'] }
}
```

### 2.4 Update Service to Use Settings

**File:** `src/stores/kitchenKpi/services/foodCostKpiService.ts`

For `kitchenAndBar` products:

- Check `cogsSettingsStore.getAssignment(productId)`
- Include in COGS only if matches current department filter

---

## Files Summary

### Phase 1 (Kitchen Monitor)

1. `src/stores/kitchenKpi/types.ts` - FoodCostKpi types
2. `src/stores/kitchenKpi/services/foodCostKpiService.ts` - new service
3. `src/stores/kitchenKpi/composables/useFoodCostKpi.ts` - new composable
4. `src/stores/kitchenKpi/composables/index.ts` - export
5. `src/views/kitchen/kpi/KpiScreen.vue` - integration
6. `src/views/kitchen/kpi/components/FoodCostKpiCard.vue` - UI
7. `src/views/kitchen/kpi/components/FoodCostKpiTab.vue` - detailed UI

### Phase 2 (Backoffice)

8. `src/stores/kitchenKpi/cogsSettingsStore.ts` - settings store
9. `src/views/backoffice/salary/CogsSettingsView.vue` - settings view
10. `src/router/index.ts` - route `/salary/kpi-cogs`

---

## Department Logic

- Department is determined automatically by user role
- No department switcher in Kitchen Monitor UI
- Admin: can select department via KitchenSidebar tabs
- Kitchen staff: always 'kitchen'
- Bar staff: always 'bar'

## kitchenAndBar Products

- Products used in both departments need assignment
- Default assignment: kitchen
- Can be configured in Backoffice COGS Settings
- Applies to write-offs and COGS calculations

## Update Mode

- Load on KPI screen open
- Manual refresh button
- No realtime subscription
