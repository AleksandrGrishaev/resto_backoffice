// src/views/storage/components/index.ts - ТОЛЬКО ПРОДУКТЫ

/**
 * Storage Management Components
 *
 * This module contains all UI components for the Storage Management system,
 * implementing FIFO inventory tracking for raw products across Kitchen and Bar departments.
 *
 * Storage now handles ONLY PRODUCTS (raw materials for cooking).
 * Preparations are managed in a separate Preparations module.
 */

// ========================
// MAIN DASHBOARD COMPONENTS
// ========================

/**
 * StorageAlerts - Alert banner component
 * Displays warnings for expired products, expiring products, and low stock alerts.
 * Used at the top of StorageView to show critical inventory issues.
 */
export { default as StorageAlerts } from './StorageAlerts.vue'

/**
 * StorageStockTable - Main product inventory table
 * Shows current stock levels, FIFO batch information, price trends, and alerts.
 * Supports filtering by expiry status, stock levels, and search functionality.
 * Displays only raw products with cost analytics and category grouping.
 */
export { default as StorageStockTable } from './StorageStockTable.vue'

/**
 * StorageOperationsTable - Operations history table
 * Displays recent storage operations (receipts, corrections, inventory).
 * Shows operation details, responsible persons, and financial impact.
 * Used in the "Recent Operations" tab of StorageView.
 */
export { default as StorageOperationsTable } from './StorageOperationsTable.vue'

// ========================
// CORRECTION WORKFLOW (replaces consumption)
// ========================

/**
 * NOTE: Consumption operations have been replaced with Correction operations.
 * Products are now corrected/written off instead of consumed, since actual
 * consumption happens during recipe production in the Preparations module.
 */

// ========================
// RECEIPT/CORRECTION WORKFLOW
// ========================

/**
 * ReceiptDialog - Product receipt dialog
 * Handles incoming stock from purchases, corrections, or opening balances.
 * Creates new FIFO batches with cost tracking and expiry date management.
 * Only works with raw products now.
 */
export { default as ReceiptDialog } from './ReceiptDialog.vue'

/**
 * ReceiptItemCard - Individual product card in receipt dialog
 * Input form for quantity, cost per unit, expiry date, and notes.
 * Shows total cost calculation and validation rules.
 * Simplified to work only with products.
 */
export { default as ReceiptItemCard } from './ReceiptItemCard.vue'

/**
 * AddReceiptItemDialog - Product selection dialog for receipts
 * Simple dialog to select products and set initial quantity
 * and cost before adding to receipt. Only shows raw products.
 */
export { default as AddReceiptItemDialog } from './AddReceiptItemDialog.vue'

// ========================
// INVENTORY MANAGEMENT
// ========================

/**
 * InventoryDialog - Product inventory counting dialog
 * Comprehensive inventory management with progress tracking, discrepancy detection,
 * and value impact calculation. Works only with raw products.
 * Removed item type selection since we only handle products.
 */
export { default as InventoryDialog } from './InventoryDialog.vue'

/**
 * InventoryItemRow - Individual product row in inventory count
 * Compact row showing system vs actual quantities, difference calculation,
 * value impact, and notes field. Real-time validation and status indicators.
 * Simplified for products only.
 */
export { default as InventoryItemRow } from './InventoryItemRow.vue'

/**
 * StorageInventoriesTable - Inventory records table
 * Shows historical inventory documents with filtering and details.
 * Product inventories only now.
 */
export { default as StorageInventoriesTable } from './StorageInventoriesTable.vue'

/**
 * InventoryDetailsDialog - Detailed inventory information modal
 * Shows completed inventory details, discrepancies, and corrections.
 */
export { default as InventoryDetailsDialog } from './InventoryDetailsDialog.vue'

// ========================
// DETAILED VIEWS
// ========================

/**
 * ItemDetailsDialog - Detailed product information modal
 * Comprehensive view of product details including:
 * - All FIFO batches with receipt dates and costs
 * - Price trend analysis and cost history
 * - Stock aging and expiry information
 * Only for products now.
 */
export { default as ItemDetailsDialog } from './ItemDetailsDialog.vue'

// ========================
// COMPONENT ARCHITECTURE NOTES
// ========================

/**
 * DESIGN PRINCIPLES:
 *
 * 1. **Products Only**: Storage now manages only raw products (ingredients)
 * 2. **FIFO Integration**: All components properly implement FIFO cost calculation
 * 3. **Real-time Updates**: Components automatically refresh data after operations
 * 4. **Department Separation**: All components respect Kitchen/Bar department boundaries
 * 5. **User Experience**: Intuitive workflows with clear visual feedback and validation
 *
 * COMPONENT HIERARCHY:
 *
 * StorageView (Main - Products Only)
 * ├── StorageAlerts (Alerts banner)
 * ├── StorageStockTable (Product stock overview)
 * │   └── ItemDetailsDialog (Product details modal)
 * ├── StorageOperationsTable (Operations history)
 * ├── StorageInventoriesTable (Inventory records)
 * │   └── InventoryDetailsDialog (Inventory details)
 * ├── ReceiptDialog (Product receipt workflow)
 * │   ├── ReceiptItemCard (Product cards)
 * │   └── AddReceiptItemDialog (Add products)
 * └── InventoryDialog (Product inventory workflow)
     └── InventoryItemRow (Product rows)
 *
 * DATA FLOW:
 *
 * 1. User actions trigger store methods
 * 2. Store updates backend via services
 * 3. Components reactively update from store state
 * 4. FIFO calculations happen in real-time
 * 5. Parent components handle success events and refresh data
 *
 * SEPARATION OF CONCERNS:
 *
 * - **Storage**: Raw products inventory management
 * - **Preparations**: Semi-finished goods from recipes
 * - **Recipes**: Production processes that consume products
 * - **Menu**: Final dishes that use preparations
 */
