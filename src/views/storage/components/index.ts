// src/views/storage/components/index.ts

/**
 * Storage Management Components
 *
 * This module contains all UI components for the Storage Management system,
 * implementing FIFO inventory tracking, multi-item consumption, and real-time
 * stock management across Kitchen and Bar departments.
 */

// ========================
// MAIN DASHBOARD COMPONENTS
// ========================

/**
 * StorageAlerts - Alert banner component
 * Displays warnings for expired items, expiring items, and low stock alerts.
 * Used at the top of StorageView to show critical inventory issues.
 */
export { default as StorageAlerts } from './StorageAlerts.vue'

/**
 * StorageStockTable - Main inventory table
 * Shows current stock levels, FIFO batch information, price trends, and alerts.
 * Supports filtering by expiry status, stock levels, and search functionality.
 * Displays both Products and Preparations with cost analytics.
 */
export { default as StorageStockTable } from './StorageStockTable.vue'

/**
 * StorageOperationsTable - Operations history table
 * Displays recent storage operations (receipts, consumption, inventory, corrections).
 * Shows operation details, responsible persons, and financial impact.
 * Used in the "Recent Operations" tab of StorageView.
 */
export { default as StorageOperationsTable } from './StorageOperationsTable.vue'

// ========================
// CONSUMPTION WORKFLOW
// ========================

/**
 * MultiConsumptionDialog - Main consumption dialog
 * Allows users to consume multiple items in a single operation.
 * Features quick-add buttons for popular items, FIFO cost calculation,
 * usage tracking (recipe/menu item/waste), and batch allocation preview.
 */
export { default as MultiConsumptionDialog } from './MultiConsumptionDialog.vue'

/**
 * ConsumptionItemCard - Individual item card in consumption dialog
 * Shows item details, available stock, quantity input, FIFO allocation preview,
 * and real-time cost calculation. Includes stock availability warnings.
 */
export { default as ConsumptionItemCard } from './ConsumptionItemCard.vue'

/**
 * AddConsumptionItemDialog - Item selection dialog for consumption
 * Allows users to search and select items to add to consumption.
 * Separate tabs for Products and Preparations with stock level indicators.
 */
export { default as AddConsumptionItemDialog } from './AddConsumptionItemDialog.vue'

// ========================
// RECEIPT/CORRECTION WORKFLOW
// ========================

/**
 * ReceiptDialog - Goods receipt and correction dialog
 * Handles incoming stock from purchases, production, corrections, or opening balances.
 * Creates new FIFO batches with cost tracking and expiry date management.
 */
export { default as ReceiptDialog } from './ReceiptDialog.vue'

/**
 * ReceiptItemCard - Individual item card in receipt dialog
 * Input form for quantity, cost per unit, expiry date, and notes.
 * Shows total cost calculation and validation rules.
 */
export { default as ReceiptItemCard } from './ReceiptItemCard.vue'

/**
 * AddReceiptItemDialog - Item selection dialog for receipts
 * Simple dialog to select products/preparations and set initial quantity
 * and cost before adding to receipt. Separate tabs for item types.
 */
export { default as AddReceiptItemDialog } from './AddReceiptItemDialog.vue'

// ========================
// INVENTORY MANAGEMENT
// ========================

/**
 * InventoryDialog - Full inventory counting dialog
 * Comprehensive inventory management with progress tracking, discrepancy detection,
 * and value impact calculation. Separate workflows for Products and Preparations.
 */
export { default as InventoryDialog } from './InventoryDialog.vue'

/**
 * InventoryItemRow - Individual item row in inventory count
 * Compact row showing system vs actual quantities, difference calculation,
 * value impact, and notes field. Real-time validation and status indicators.
 */
export { default as InventoryItemRow } from './InventoryItemRow.vue'

// ========================
// DETAILED VIEWS
// ========================

/**
 * ItemDetailsDialog - Detailed item information modal
 * Comprehensive view of item details including:
 * - All FIFO batches with receipt dates and costs
 * - Price trend analysis and cost history
 * - Usage analytics and consumption patterns
 * - Stock aging and expiry information
 */
export { default as ItemDetailsDialog } from './ItemDetailsDialog.vue'

// ========================
// COMPONENT ARCHITECTURE NOTES
// ========================

/**
 * DESIGN PRINCIPLES:
 *
 * 1. **Modularity**: Each component handles a specific workflow (consumption, receipt, inventory)
 * 2. **FIFO Integration**: All components properly implement FIFO cost calculation
 * 3. **Real-time Updates**: Components automatically refresh data after operations
 * 4. **Department Separation**: All components respect Kitchen/Bar department boundaries
 * 5. **User Experience**: Intuitive workflows with clear visual feedback and validation
 *
 * COMPONENT HIERARCHY:
 *
 * StorageView (Main)
 * ├── StorageAlerts (Alerts banner)
 * ├── StorageStockTable (Stock overview)
 * │   └── ItemDetailsDialog (Item details modal)
 * ├── StorageOperationsTable (Operations history)
 * ├── MultiConsumptionDialog (Consumption workflow)
 * │   ├── ConsumptionItemCard (Item cards)
 * │   └── AddConsumptionItemDialog (Add items)
 * ├── ReceiptDialog (Receipt workflow)
 * │   ├── ReceiptItemCard (Item cards)
 * │   └── AddReceiptItemDialog (Add items)
 * └── InventoryDialog (Inventory workflow)
     └── InventoryItemRow (Item rows)
 *
 * DATA FLOW:
 *
 * 1. User actions trigger store methods
 * 2. Store updates backend via services
 * 3. Components reactively update from store state
 * 4. FIFO calculations happen in real-time
 * 5. Parent components handle success events and refresh data
 */
