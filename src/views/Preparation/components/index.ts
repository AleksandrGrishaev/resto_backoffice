// src/views/preparation/components/index.ts

/**
 * Preparation Management Components
 *
 * This module contains all UI components for the Preparation Management system,
 * implementing FIFO inventory tracking for semi-finished products with short shelf life
 * management across Kitchen and Bar departments.
 */

// ========================
// MAIN DASHBOARD COMPONENTS
// ========================

/**
 * PreparationAlerts - Alert banner component
 * Displays warnings for expired preparations, expiring preparations (24h), and low stock alerts.
 * Used at the top of PreparationView to show critical inventory issues.
 */
export { default as PreparationAlerts } from './PreparationAlerts.vue'

/**
 * PreparationStockTable - Main preparation inventory table
 * Shows current stock levels, FIFO batch information, shelf life status, and alerts.
 * Supports filtering by expiry status, stock levels, and search functionality.
 * Displays preparations with cost analytics and short expiry warnings.
 */
export { default as PreparationStockTable } from './PreparationStockTable.vue'

/**
 * PreparationOperationsTable - Operations history table
 * Displays recent preparation operations (production, inventory, corrections).
 * Shows operation details, responsible persons, and financial impact.
 * Used in the "Recent Operations" tab of PreparationView.
 */
export { default as PreparationOperationsTable } from './PreparationOperationsTable.vue'

// ========================
// PRODUCTION WORKFLOW
// ========================

/**
 * DirectPreparationProductionDialog - ✅ SIMPLIFIED: Direct production dialog
 * Standalone dialog that handles complete production workflow in one step:
 * - Auto-fills responsible person from current user
 * - Only "Recipe Production" mode (correction/opening balance removed)
 * - Selects preparation and quantity
 * - Auto-calculates costs from recipes
 * - Creates production with automatic raw product write-off
 * - No intermediate steps or dialogs
 *
 * Replaces the old 3-dialog workflow:
 * - PreparationProductionDialog (removed)
 * - PreparationProductionItemCard (removed)
 * - AddPreparationProductionItemDialog (removed)
 */
export { default as DirectPreparationProductionDialog } from './DirectPreparationProductionDialog.vue'

// ========================
// INVENTORY MANAGEMENT
// ========================

/**
 * PreparationInventoryDialog - Full inventory counting dialog
 * Comprehensive inventory management with progress tracking, discrepancy detection,
 * and value impact calculation. Focused on preparation shelf life management.
 */
export { default as PreparationInventoryDialog } from './PreparationInventoryDialog.vue'

/**
 * PreparationInventoryItemRow - Individual item row in inventory count
 * Compact row showing system vs actual quantities, difference calculation,
 * value impact, and notes field. Real-time validation and status indicators.
 */
export { default as PreparationInventoryItemRow } from './PreparationInventoryItemRow.vue'

/**
 * PreparationInventoriesTable - Inventory records table
 * Displays historical preparation inventory records with filtering and search.
 * Shows inventory status, discrepancies, and value differences.
 */
export { default as PreparationInventoriesTable } from './PreparationInventoriesTable.vue'

// ========================
// DETAILED VIEWS
// ========================

/**
 * PreparationItemDetailsDialog - Detailed preparation information modal
 * Comprehensive view of preparation details including:
 * - All FIFO batches with production dates and costs
 * - Shelf life analysis and expiry information
 * - Usage analytics and consumption patterns
 * - Stock aging and quality status
 */
export { default as PreparationItemDetailsDialog } from './PreparationItemDetailsDialog.vue'

/**
 * InventoryDetailsDialog - Detailed inventory information modal
 * Shows inventory results with preparation-specific shelf life analysis
 */
export { default as InventoryDetailsDialog } from './InventoryDetailsDialog.vue'

// ========================
// COMPONENT ARCHITECTURE NOTES
// ========================

/**
 * DESIGN PRINCIPLES:
 *
 * 1. **Modularity**: Each component handles a specific workflow (production, inventory)
 * 2. **FIFO Integration**: All components properly implement FIFO cost calculation
 * 3. **Shelf Life Focus**: Components emphasize short expiry dates (1-2 days typical)
 * 4. **Real-time Updates**: Components automatically refresh data after operations
 * 5. **Department Separation**: All components respect Kitchen/Bar department boundaries
 * 6. **Recipe Integration**: Components integrate with recipe system for preparation data
 *
 * COMPONENT HIERARCHY:
 *
 * PreparationView (Main)
 * ├── PreparationAlerts (Alerts banner)
 * ├── PreparationStockTable (Stock overview)
 * │   └── PreparationItemDetailsDialog (Item details modal)
 * ├── PreparationOperationsTable (Operations history)
 * ├── DirectPreparationProductionDialog (✅ Simplified production workflow)
 * ├── PreparationInventoryDialog (Inventory workflow)
 * │   └── PreparationInventoryItemRow (Item rows)
 * ├── PreparationInventoriesTable (Inventory history)
 * └── InventoryDetailsDialog (Inventory details)
 *
 * DATA FLOW:
 *
 * 1. User actions trigger store methods
 * 2. Store updates backend via preparation service
 * 3. Components reactively update from store state
 * 4. FIFO calculations happen in real-time
 * 5. Parent components handle success events and refresh data
 * 6. Recipe integration provides preparation metadata
 *
 * KEY DIFFERENCES FROM STORAGE:
 *
 * 1. **Shorter Expiry Times**: 1-2 days vs weeks for products
 * 2. **Production Focus**: "Production" instead of "Receipt"
 * 3. **Recipe Integration**: Tight coupling with recipe system
 * 4. **Quality Emphasis**: More focus on freshness and quality
 * 5. **No Consumption**: Consumption tracking removed from main workflow
 */
