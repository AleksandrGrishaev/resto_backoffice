# Next Sprint - Print Documents for Inventory

## Task: Inventory Count Sheets (Печатные документы для инвентаризации)

### Concept

Создать раздел **Reports → Print Docs** с генерацией печатных документов для операционной работы.

**UI подход (минималистичный):**

- Список доступных документов (название + описание)
- Кнопка "Generate" для каждого документа
- Диалог с параметрами (департамент, дата, фильтры)
- Генерация PDF → скачивание

### Document #1: Inventory Count Sheet (Products)

**Назначение**: Лист для ручного подсчета остатков продуктов на складе

**Колонки:**
| # | Product | Code | Unit | Current Stock | Actual Count | Difference |
|---|---------|------|------|---------------|--------------|------------|
| 1 | Banana | P-001 | kg | 5.5 | \_\_\_\_\_\_\_\_\_ | \_\_\_\_\_\_\_\_\_ |
| 2 | Milk | P-002 | L | 12.0 | \_\_\_\_\_\_\_\_\_ | \_\_\_\_\_\_\_\_\_ |

**Параметры диалога:**

- Department: Kitchen / Bar / All
- Category filter (optional)
- Sort by: Name / Code / Category
- Include zero stock: Yes / No

**Источник данных:**

- `storageStore.productBalances` - текущие остатки
- `productsStore.products` - коды, названия, категории

### Document #2: Inventory Count Sheet (Preparations)

**Назначение**: Лист для подсчета полуфабрикатов

**Колонки:**
| # | Preparation | Code | Unit | Current Stock | Actual Count | Difference |
|---|-------------|------|------|---------------|--------------|------------|
| 1 | Banana Portion | PR-042 | portion | 8 | \_\_\_\_\_\_\_\_\_ | \_\_\_\_\_\_\_\_\_ |
| 2 | Simple Syrup | PR-015 | ml | 500 | \_\_\_\_\_\_\_\_\_ | \_\_\_\_\_\_\_\_\_ |

**Параметры диалога:**

- Department: Kitchen / Bar / All
- Sort by: Name / Code
- Include zero stock: Yes / No

**Источник данных:**

- `preparationStore.preparationBalances` - текущие остатки
- `recipesStore.preparations` - коды, названия

---

## Implementation Plan

### Phase 1: Infrastructure

**1.1 Create Print Docs View**

```
src/views/backoffice/reports/
└── PrintDocsView.vue          # Main view with document list
```

**1.2 Add Route**

```typescript
// router/index.ts
{
  path: '/reports/print-docs',
  name: 'print-docs',
  component: () => import('@/views/backoffice/reports/PrintDocsView.vue'),
  meta: { title: 'Print Documents', allowedRoles: ['admin', 'manager'] }
}
```

**1.3 Add Navigation**

```vue
<!-- NavigationMenu.vue - in Reports section -->
<v-list-item to="/reports/print-docs" prepend-icon="mdi-printer">
  <template #title>Print Documents</template>
</v-list-item>
```

### Phase 2: Document Types & Templates

**2.1 Types**

```typescript
// src/core/export/types.ts

interface PrintDocumentConfig {
  id: string
  name: string
  description: string
  icon: string
  category: 'inventory' | 'operations' | 'reports'
}

interface InventorySheetOptions extends ExportOptions {
  department: 'kitchen' | 'bar' | 'all'
  includeZeroStock: boolean
  sortBy: 'name' | 'code' | 'category'
  categoryFilter?: string[]
  showSignatureLine: boolean
  countDate: string
}

interface InventorySheetItem {
  index: number
  name: string
  code: string
  unit: string
  currentStock: number
  // Empty fields for manual entry
  actualCount: null
  difference: null
}

interface InventorySheetData {
  title: string
  date: string
  department: string
  preparedBy: string
  items: InventorySheetItem[]
  totalItems: number
}
```

**2.2 Export Templates**

```
src/core/export/templates/
├── InventorySheetTemplate.vue         # Products inventory sheet
└── PreparationInventoryTemplate.vue   # Preparations inventory sheet
```

**2.3 Parameter Dialogs**

```
src/views/backoffice/reports/dialogs/
└── InventorySheetOptionsDialog.vue    # Parameters dialog
```

### Phase 3: Data Building

**3.1 Composable**

```typescript
// src/views/backoffice/reports/composables/useInventorySheet.ts

export function useInventorySheet() {
  const storageStore = useStorageStore()
  const productsStore = useProductsStore()
  const preparationStore = usePreparationStore()
  const recipesStore = useRecipesStore()

  function buildProductsSheet(options: InventorySheetOptions): InventorySheetData {
    // Get balances from storage
    // Filter by department
    // Sort by selected field
    // Map to InventorySheetItem[]
  }

  function buildPreparationsSheet(options: InventorySheetOptions): InventorySheetData {
    // Similar logic for preparations
  }

  return { buildProductsSheet, buildPreparationsSheet }
}
```

### Phase 4: PDF Generation

**4.1 Template Design**

- A4 Portrait orientation
- Company header (optional)
- Document title + date
- Table with wide "Actual Count" column for handwriting
- Signature line at bottom
- Page numbers

**4.2 Integration with ExportService**

```typescript
// Use existing useExport() composable
const { generatePDF } = useExport()

async function generateInventorySheet(data: InventorySheetData) {
  await generatePDF(InventorySheetTemplate, data, {
    filename: `inventory-sheet-${data.date}.pdf`,
    pageSize: 'a4',
    orientation: 'portrait',
    showPageNumbers: true
  })
}
```

---

## File Structure (Final)

```
src/
├── views/backoffice/reports/
│   ├── PrintDocsView.vue                    # Document list
│   ├── dialogs/
│   │   └── InventorySheetOptionsDialog.vue  # Parameters
│   └── composables/
│       └── useInventorySheet.ts             # Data building
│
└── core/export/
    ├── types.ts                             # + new types
    └── templates/
        ├── InventorySheetTemplate.vue       # Products template
        └── PreparationInventoryTemplate.vue # Preparations template
```

---

## Available Print Documents (Future)

| Document                       | Description               | Status   |
| ------------------------------ | ------------------------- | -------- |
| Inventory Sheet (Products)     | For manual stock counting | Sprint 1 |
| Inventory Sheet (Preparations) | For prep counting         | Sprint 1 |
| Purchase Order                 | Order form for suppliers  | Future   |
| Receiving Checklist            | For checking deliveries   | Future   |
| Daily Production Sheet         | Prep tasks for kitchen    | Future   |
| Waste Log                      | For recording write-offs  | Future   |

---

## Previous Task (Archived)

<details>
<summary>Fix Export Cost Calculation</summary>

**Problem**: Export дублирует расчет стоимости вместо использования значений из store.

**Plan file**: `.claude/plans/fix-export-cost-calculation.md`

### Quick Summary

Текущий код пересчитывает стоимость из ингредиентов:

```
qty * product.baseCostPerUnit (loop all ingredients)
```

Нужно использовать уже рассчитанные значения:

```
preparation.last_known_cost * qty
recipe.cost * qty
```

</details>
