# Current Sprint: PDF Export System - COMPLETED

## Goal

Implement PDF export for menu, recipes, and preparations with internal costs.

## Decisions

- Format: A4 Portrait
- Content: Costs only (internal reports)
- Branding: None (plain text)
- Recipe detail: Configurable
- Component breakdown: One level only
- POS receipts: Future sprint

## Tasks

### Step 1: Setup

- [x] Install html2pdf.js: `pnpm add html2pdf.js`
- [x] Create folder: `src/core/export/`

### Step 2: Core Types & Service

- [x] Create `src/core/export/types.ts`
- [x] Create `src/core/export/ExportService.ts`
- [x] Create `src/core/export/composables/useExport.ts`

### Step 3: Templates

- [x] Create `src/core/export/templates/ExportLayout.vue`
- [x] Create `src/core/export/templates/MenuExportTemplate.vue`
- [x] Create `src/core/export/templates/RecipeExportTemplate.vue`
- [x] Create `src/core/export/templates/PreparationExportTemplate.vue`

### Step 4: Styles

- [x] Create `src/core/export/styles/export.scss`
- [x] Create `src/core/export/index.ts`
- [x] Create `src/core/export/html2pdf.d.ts` (TypeScript types)

### Step 5: Integration

- [x] Add "Export PDF" button to MenuView
- [x] Add "Export PDF" button to RecipesView (exports both recipes and preparations)
- [x] Test PDF output - Build successful

## Implementation Summary

### Files Created

```
src/core/export/
├── index.ts                    # Module exports
├── types.ts                    # Export types and interfaces
├── ExportService.ts            # PDF generation service
├── html2pdf.d.ts               # TypeScript declarations
├── composables/
│   └── useExport.ts            # Vue composable for exports
├── templates/
│   ├── ExportLayout.vue        # Base layout component
│   ├── MenuExportTemplate.vue  # Menu export template
│   ├── RecipeExportTemplate.vue # Recipe export template
│   └── PreparationExportTemplate.vue # Preparation export template
└── styles/
    └── export.scss             # Print/export styles
```

### Usage

```typescript
import { useExport } from '@/core/export'

const { isExporting, exportMenu, exportRecipes, exportPreparations } = useExport()

// Export menu with costs
await exportMenu(menuData)

// Export recipes with instructions
await exportRecipes(recipeData, { includeInstructions: true })

// Export preparations
await exportPreparations(prepData)
```

### Notes

- pnpm upgraded from 7.14.0 to 9.15.9 (lockfile v9 compatibility)
- html2pdf.js bundle: ~725KB (includes html2canvas + jsPDF)
- Export buttons added to MenuView and RecipesView toolbars
