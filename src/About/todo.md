# 📦 Current Sprint: Supplier Module - Supabase Migration

> **📋 Strategy:** 4-sprint incremental migration - Requests → Order Assistant → Orders → Receipts+Payments
> **🔴 CRITICAL RULE:** Always check TypeScript interface FIRST before creating/updating Supabase tables!

## 📊 Current Status (2025-11-21 - PLANNING PHASE)

**Sprint Goal: 🎯 Complete Supplier Module Supabase Migration (4 Sprints)**

**Current Sprint: Sprint 1 - Database Schema + Procurement Requests**

**🎯 Sprint Overview:**

- **Sprint 1** (7-10 days): Database Schema + Procurement Requests CRUD + Mock Data Migration
- **Sprint 2** (5-7 days): Order Assistant + Dynamic Suggestions
- **Sprint 3** (7-10 days): Purchase Orders + Storage Integration
- **Sprint 4** (7-10 days): Receipts + Payment Integration

**📋 Sprint 1 Status - NOT STARTED:**

- ⬜ Phase 1: Database Schema Creation (all 6 tables)
- ⬜ Phase 2: Data Mappers & Type Generation
- ⬜ Phase 3: Service Layer - Requests CRUD
- ⬜ Phase 4: Mock Data Migration Script
- ⬜ Phase 5: Store Layer Updates (loading/error states)
- ⬜ Phase 6: Composables Updates
- ⬜ Phase 7: UI Components Updates
- ⬜ Phase 8: Testing & Validation

---

## 🗄️ Supplier Tables Schema Reference

**Use this schema for implementation - avoid large `list_tables` queries**

### 1. `procurement_requests` - Department Procurement Requests

**Purpose:** Track procurement requests from departments (kitchen, bar, etc.)

**Structure:**

```sql
-- Main procurement requests table
CREATE TABLE procurement_requests (
  id                    TEXT PRIMARY KEY,
  request_number        TEXT UNIQUE NOT NULL,     -- Format: REQ-{DEPT}-{SEQ}
  department            TEXT NOT NULL,             -- 'kitchen' | 'bar'
  requested_by          TEXT NOT NULL,
  status                TEXT NOT NULL,             -- 'draft' | 'submitted' | 'converted' | 'cancelled'
  priority              TEXT NOT NULL DEFAULT 'normal', -- 'normal' | 'urgent'
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  created_by            TEXT,

  CONSTRAINT valid_status CHECK (status IN ('draft', 'submitted', 'converted', 'cancelled')),
  CONSTRAINT valid_priority CHECK (priority IN ('normal', 'urgent')),
  CONSTRAINT valid_department CHECK (department IN ('kitchen', 'bar'))
);

-- Indexes for performance
CREATE INDEX idx_procurement_requests_status ON procurement_requests(status);
CREATE INDEX idx_procurement_requests_department ON procurement_requests(department, status);
CREATE INDEX idx_procurement_requests_created ON procurement_requests(created_at DESC);
```

**TypeScript Interface Location:** `src/stores/supplier_2/types.ts` → `ProcurementRequest`

---

### 2. `procurement_request_items` - Items in Requests

**Purpose:** Individual items requested in procurement requests

**Structure:**

```sql
CREATE TABLE procurement_request_items (
  id                    TEXT PRIMARY KEY,
  request_id            TEXT NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
  item_id               TEXT NOT NULL,             -- Product ID from products table
  item_name             TEXT NOT NULL,             -- Cached product name
  requested_quantity    NUMERIC(10,3) NOT NULL,    -- Always in base units
  unit                  TEXT NOT NULL,             -- Base unit (gram, ml, piece)

  -- Package information (optional, for UI)
  package_id            TEXT,
  package_name          TEXT,
  package_quantity      NUMERIC(10,3),

  estimated_price       NUMERIC(10,2),
  priority              TEXT DEFAULT 'normal',     -- 'normal' | 'urgent'
  category              TEXT,
  notes                 TEXT,

  created_at            TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_priority CHECK (priority IN ('normal', 'urgent'))
);

-- Indexes for performance
CREATE INDEX idx_request_items_request ON procurement_request_items(request_id);
CREATE INDEX idx_request_items_product ON procurement_request_items(item_id);
CREATE INDEX idx_request_items_status_lookup ON procurement_request_items(request_id, item_id);
```

**TypeScript Interface Location:** `src/stores/supplier_2/types.ts` → `RequestItem`

---

### 3. `purchase_orders` - Purchase Orders to Suppliers

**Purpose:** Track purchase orders sent to suppliers

**Structure:**

```sql
CREATE TABLE purchase_orders (
  id                        TEXT PRIMARY KEY,
  order_number              TEXT UNIQUE NOT NULL,      -- Format: PO-{SEQ}
  supplier_id               TEXT NOT NULL,             -- FK to counteragents
  supplier_name             TEXT NOT NULL,             -- Cached supplier name
  order_date                TIMESTAMPTZ NOT NULL,
  expected_delivery_date    TIMESTAMPTZ,

  -- Financial information
  total_amount              NUMERIC(12,2) NOT NULL,
  is_estimated_total        BOOLEAN DEFAULT false,
  original_total_amount     NUMERIC(12,2),             -- Before receipt adjustments
  actual_delivered_amount   NUMERIC(12,2),             -- After receipt completion

  -- Status tracking
  status                    TEXT NOT NULL,             -- 'draft' | 'sent' | 'delivered' | 'cancelled'
  bill_status               TEXT NOT NULL DEFAULT 'not_billed', -- 6 states (see below)
  bill_status_calculated_at TIMESTAMPTZ,

  -- Relations
  bill_id                   TEXT,                      -- FK to Account Store (PendingPayment.id)
  receipt_id                TEXT,                      -- FK to goods_receipts

  -- Receipt discrepancies (JSONB)
  has_receipt_discrepancies BOOLEAN DEFAULT false,
  receipt_discrepancies     JSONB,                     -- Array of ReceiptDiscrepancyInfo
  receipt_completed_at      TIMESTAMPTZ,
  receipt_completed_by      TEXT,

  -- Legacy fields (backward compatibility)
  has_shortfall             BOOLEAN DEFAULT false,
  shortfall_amount          NUMERIC(12,2),

  notes                     TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  created_by_type           TEXT,                      -- 'user' | 'system'
  created_by_id             TEXT,
  created_by_name           TEXT,

  CONSTRAINT valid_status CHECK (status IN ('draft', 'sent', 'delivered', 'cancelled')),
  CONSTRAINT valid_bill_status CHECK (bill_status IN (
    'not_billed', 'partially_paid', 'fully_paid', 'overpaid', 'credit_used', 'pending'
  ))
);

-- Indexes for performance
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status, bill_status);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id, status);
CREATE INDEX idx_purchase_orders_dates ON purchase_orders(order_date DESC, expected_delivery_date);
CREATE INDEX idx_purchase_orders_bill ON purchase_orders(bill_id) WHERE bill_id IS NOT NULL;
```

**Bill Status Values:**

- `'not_billed'` - No bill created yet (order not sent)
- `'pending'` - Bill created, awaiting payment
- `'partially_paid'` - Some payments made, balance remaining
- `'fully_paid'` - Total paid = order amount
- `'overpaid'` - Total paid > order amount (creates supplier credit)
- `'credit_used'` - Supplier credit applied to this order

**Receipt Discrepancies JSONB Structure:**

```typescript
{
  type: 'quantity' | 'price' | 'both',
  itemId: string,
  itemName: string,
  ordered: {
    quantity: number,
    price: number,
    total: number
  },
  received: {
    quantity: number,
    price: number,
    total: number
  },
  impact: {
    quantityDifference: number,
    priceDifference: number,
    totalDifference: number
  }
}[]
```

**TypeScript Interface Location:** `src/stores/supplier_2/types.ts` → `PurchaseOrder`

---

### 4. `purchase_order_items` - Items in Purchase Orders

**Purpose:** Individual items in purchase orders with package information

**Structure:**

```sql
CREATE TABLE purchase_order_items (
  id                    TEXT PRIMARY KEY,
  order_id              TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id               TEXT NOT NULL,             -- Product ID
  item_name             TEXT NOT NULL,             -- Cached product name

  -- Quantities (always in base units)
  ordered_quantity      NUMERIC(10,3) NOT NULL,
  received_quantity     NUMERIC(10,3) DEFAULT 0,
  unit                  TEXT NOT NULL,             -- Base unit

  -- Package information
  package_id            TEXT NOT NULL,
  package_name          TEXT NOT NULL,
  package_quantity      NUMERIC(10,3) NOT NULL,
  package_unit          TEXT NOT NULL,

  -- Pricing
  price_per_unit        NUMERIC(10,2) NOT NULL,    -- Price per base unit
  package_price         NUMERIC(10,2) NOT NULL,    -- Price per package
  total_price           NUMERIC(12,2) NOT NULL,    -- Total for this item
  is_estimated_price    BOOLEAN DEFAULT false,

  -- Historical price tracking
  last_price_date       TIMESTAMPTZ,

  -- Status
  status                TEXT NOT NULL DEFAULT 'ordered', -- 'ordered' | 'received' | 'cancelled'

  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('ordered', 'received', 'cancelled'))
);

-- Indexes for performance
CREATE INDEX idx_order_items_order ON purchase_order_items(order_id);
CREATE INDEX idx_order_items_product ON purchase_order_items(item_id);
CREATE INDEX idx_order_items_status ON purchase_order_items(order_id, status);
```

**TypeScript Interface Location:** `src/stores/supplier_2/types.ts` → `OrderItem`

---

### 5. `goods_receipts` - Delivery Receipts

**Purpose:** Track received deliveries from suppliers

**Structure:**

```sql
CREATE TABLE goods_receipts (
  id                    TEXT PRIMARY KEY,
  receipt_number        TEXT UNIQUE NOT NULL,      -- Format: RCP-{SEQ}
  purchase_order_id     TEXT NOT NULL REFERENCES purchase_orders(id),
  delivery_date         TIMESTAMPTZ NOT NULL,
  received_by           TEXT NOT NULL,

  -- Status
  status                TEXT NOT NULL,             -- 'pending' | 'completed' | 'cancelled'
  has_discrepancies     BOOLEAN DEFAULT false,

  -- Storage integration
  storage_operation_id  TEXT,                      -- FK to storage_operations

  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'cancelled'))
);

-- Indexes for performance
CREATE INDEX idx_receipts_order ON goods_receipts(purchase_order_id);
CREATE INDEX idx_receipts_date ON goods_receipts(delivery_date DESC);
CREATE INDEX idx_receipts_status ON goods_receipts(status);
CREATE INDEX idx_receipts_storage_op ON goods_receipts(storage_operation_id) WHERE storage_operation_id IS NOT NULL;
```

**TypeScript Interface Location:** `src/stores/supplier_2/types.ts` → `Receipt`

---

### 6. `goods_receipt_items` - Items in Receipts

**Purpose:** Track received items with actual quantities and prices

**Structure:**

```sql
CREATE TABLE goods_receipt_items (
  id                        TEXT PRIMARY KEY,
  receipt_id                TEXT NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  order_item_id             TEXT NOT NULL REFERENCES purchase_order_items(id),
  item_id                   TEXT NOT NULL,             -- Product ID
  item_name                 TEXT NOT NULL,

  -- Ordered vs Received quantities
  ordered_quantity          NUMERIC(10,3) NOT NULL,
  received_quantity         NUMERIC(10,3) NOT NULL,
  unit                      TEXT NOT NULL,

  -- Package information
  package_id                TEXT NOT NULL,
  package_name              TEXT NOT NULL,
  ordered_package_quantity  NUMERIC(10,3) NOT NULL,
  received_package_quantity NUMERIC(10,3) NOT NULL,
  package_unit              TEXT NOT NULL,

  -- Ordered vs Actual pricing
  ordered_price             NUMERIC(10,2) NOT NULL,    -- Ordered price per unit
  actual_price              NUMERIC(10,2) NOT NULL,    -- Actual price per unit
  ordered_base_cost         NUMERIC(10,2) NOT NULL,    -- For cost tracking
  actual_base_cost          NUMERIC(10,2) NOT NULL,    -- For cost tracking

  notes                     TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_receipt_items_receipt ON goods_receipt_items(receipt_id);
CREATE INDEX idx_receipt_items_order_item ON goods_receipt_items(order_item_id);
CREATE INDEX idx_receipt_items_product ON goods_receipt_items(item_id);
```

**TypeScript Interface Location:** `src/stores/supplier_2/types.ts` → `ReceiptItem`

---

## 🎯 Migration Tasks - Sprint 1: Procurement Requests (7-10 days)

### ✅ Phase 1: Database Schema Creation (2-3 hours)

#### 1.1 Verify TypeScript Interfaces

- [ ] Review `src/stores/supplier_2/types.ts` for all interfaces
- [ ] Document all fields and their types
- [ ] Identify JSONB fields (receiptDiscrepancies, etc.)
- [ ] Note all relations (requests → orders, orders → receipts)
- [ ] Verify package calculation fields

**Key Interfaces to Review:**

- `ProcurementRequest` + `RequestItem`
- `PurchaseOrder` + `OrderItem`
- `Receipt` + `ReceiptItem`
- `ReceiptDiscrepancyInfo`
- `BillStatus` enum

#### 1.2 Create Database Migration (All 6 Tables)

- [ ] Create migration: `create_supplier_tables.sql`

```sql
-- Migration: Create Supplier Module Tables
-- Date: YYYY-MM-DD
-- Description: Complete schema for procurement, orders, and receipts

-- 1. Procurement Requests
CREATE TABLE procurement_requests (
  id                    TEXT PRIMARY KEY,
  request_number        TEXT UNIQUE NOT NULL,
  department            TEXT NOT NULL,
  requested_by          TEXT NOT NULL,
  status                TEXT NOT NULL,
  priority              TEXT NOT NULL DEFAULT 'normal',
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  created_by            TEXT,

  CONSTRAINT valid_status CHECK (status IN ('draft', 'submitted', 'converted', 'cancelled')),
  CONSTRAINT valid_priority CHECK (priority IN ('normal', 'urgent')),
  CONSTRAINT valid_department CHECK (department IN ('kitchen', 'bar'))
);

-- 2. Procurement Request Items
CREATE TABLE procurement_request_items (
  id                    TEXT PRIMARY KEY,
  request_id            TEXT NOT NULL REFERENCES procurement_requests(id) ON DELETE CASCADE,
  item_id               TEXT NOT NULL,
  item_name             TEXT NOT NULL,
  requested_quantity    NUMERIC(10,3) NOT NULL,
  unit                  TEXT NOT NULL,
  package_id            TEXT,
  package_name          TEXT,
  package_quantity      NUMERIC(10,3),
  estimated_price       NUMERIC(10,2),
  priority              TEXT DEFAULT 'normal',
  category              TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_priority CHECK (priority IN ('normal', 'urgent'))
);

-- 3. Purchase Orders
CREATE TABLE purchase_orders (
  id                        TEXT PRIMARY KEY,
  order_number              TEXT UNIQUE NOT NULL,
  supplier_id               TEXT NOT NULL,
  supplier_name             TEXT NOT NULL,
  order_date                TIMESTAMPTZ NOT NULL,
  expected_delivery_date    TIMESTAMPTZ,
  total_amount              NUMERIC(12,2) NOT NULL,
  is_estimated_total        BOOLEAN DEFAULT false,
  original_total_amount     NUMERIC(12,2),
  actual_delivered_amount   NUMERIC(12,2),
  status                    TEXT NOT NULL,
  bill_status               TEXT NOT NULL DEFAULT 'not_billed',
  bill_status_calculated_at TIMESTAMPTZ,
  bill_id                   TEXT,
  receipt_id                TEXT,
  has_receipt_discrepancies BOOLEAN DEFAULT false,
  receipt_discrepancies     JSONB,
  receipt_completed_at      TIMESTAMPTZ,
  receipt_completed_by      TEXT,
  has_shortfall             BOOLEAN DEFAULT false,
  shortfall_amount          NUMERIC(12,2),
  notes                     TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW(),
  created_by_type           TEXT,
  created_by_id             TEXT,
  created_by_name           TEXT,

  CONSTRAINT valid_status CHECK (status IN ('draft', 'sent', 'delivered', 'cancelled')),
  CONSTRAINT valid_bill_status CHECK (bill_status IN (
    'not_billed', 'partially_paid', 'fully_paid', 'overpaid', 'credit_used', 'pending'
  ))
);

-- 4. Purchase Order Items
CREATE TABLE purchase_order_items (
  id                    TEXT PRIMARY KEY,
  order_id              TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id               TEXT NOT NULL,
  item_name             TEXT NOT NULL,
  ordered_quantity      NUMERIC(10,3) NOT NULL,
  received_quantity     NUMERIC(10,3) DEFAULT 0,
  unit                  TEXT NOT NULL,
  package_id            TEXT NOT NULL,
  package_name          TEXT NOT NULL,
  package_quantity      NUMERIC(10,3) NOT NULL,
  package_unit          TEXT NOT NULL,
  price_per_unit        NUMERIC(10,2) NOT NULL,
  package_price         NUMERIC(10,2) NOT NULL,
  total_price           NUMERIC(12,2) NOT NULL,
  is_estimated_price    BOOLEAN DEFAULT false,
  last_price_date       TIMESTAMPTZ,
  status                TEXT NOT NULL DEFAULT 'ordered',
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('ordered', 'received', 'cancelled'))
);

-- 5. Goods Receipts
CREATE TABLE goods_receipts (
  id                    TEXT PRIMARY KEY,
  receipt_number        TEXT UNIQUE NOT NULL,
  purchase_order_id     TEXT NOT NULL REFERENCES purchase_orders(id),
  delivery_date         TIMESTAMPTZ NOT NULL,
  received_by           TEXT NOT NULL,
  status                TEXT NOT NULL,
  has_discrepancies     BOOLEAN DEFAULT false,
  storage_operation_id  TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('pending', 'completed', 'cancelled'))
);

-- 6. Goods Receipt Items
CREATE TABLE goods_receipt_items (
  id                        TEXT PRIMARY KEY,
  receipt_id                TEXT NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  order_item_id             TEXT NOT NULL REFERENCES purchase_order_items(id),
  item_id                   TEXT NOT NULL,
  item_name                 TEXT NOT NULL,
  ordered_quantity          NUMERIC(10,3) NOT NULL,
  received_quantity         NUMERIC(10,3) NOT NULL,
  unit                      TEXT NOT NULL,
  package_id                TEXT NOT NULL,
  package_name              TEXT NOT NULL,
  ordered_package_quantity  NUMERIC(10,3) NOT NULL,
  received_package_quantity NUMERIC(10,3) NOT NULL,
  package_unit              TEXT NOT NULL,
  ordered_price             NUMERIC(10,2) NOT NULL,
  actual_price              NUMERIC(10,2) NOT NULL,
  ordered_base_cost         NUMERIC(10,2) NOT NULL,
  actual_base_cost          NUMERIC(10,2) NOT NULL,
  notes                     TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] Apply migration: `mcp__supabase__apply_migration({ name: 'create_supplier_tables', query: '...' })`

#### 1.3 Create Performance Indexes

- [ ] Create migration: `add_supplier_indexes.sql`

```sql
-- Procurement Requests Indexes
CREATE INDEX idx_procurement_requests_status
  ON procurement_requests(status);
CREATE INDEX idx_procurement_requests_department
  ON procurement_requests(department, status);
CREATE INDEX idx_procurement_requests_created
  ON procurement_requests(created_at DESC);

-- Request Items Indexes
CREATE INDEX idx_request_items_request
  ON procurement_request_items(request_id);
CREATE INDEX idx_request_items_product
  ON procurement_request_items(item_id);
CREATE INDEX idx_request_items_status_lookup
  ON procurement_request_items(request_id, item_id);

-- Purchase Orders Indexes
CREATE INDEX idx_purchase_orders_status
  ON purchase_orders(status, bill_status);
CREATE INDEX idx_purchase_orders_supplier
  ON purchase_orders(supplier_id, status);
CREATE INDEX idx_purchase_orders_dates
  ON purchase_orders(order_date DESC, expected_delivery_date);
CREATE INDEX idx_purchase_orders_bill
  ON purchase_orders(bill_id) WHERE bill_id IS NOT NULL;

-- Order Items Indexes
CREATE INDEX idx_order_items_order
  ON purchase_order_items(order_id);
CREATE INDEX idx_order_items_product
  ON purchase_order_items(item_id);
CREATE INDEX idx_order_items_status
  ON purchase_order_items(order_id, status);

-- Receipts Indexes
CREATE INDEX idx_receipts_order
  ON goods_receipts(purchase_order_id);
CREATE INDEX idx_receipts_date
  ON goods_receipts(delivery_date DESC);
CREATE INDEX idx_receipts_status
  ON goods_receipts(status);
CREATE INDEX idx_receipts_storage_op
  ON goods_receipts(storage_operation_id) WHERE storage_operation_id IS NOT NULL;

-- Receipt Items Indexes
CREATE INDEX idx_receipt_items_receipt
  ON goods_receipt_items(receipt_id);
CREATE INDEX idx_receipt_items_order_item
  ON goods_receipt_items(order_item_id);
CREATE INDEX idx_receipt_items_product
  ON goods_receipt_items(item_id);
```

- [ ] Apply migration: `mcp__supabase__apply_migration({ name: 'add_supplier_indexes', query: '...' })`

#### 1.4 Add Foreign Key Constraints (Optional)

- [ ] Consider adding FKs to external tables (if needed):

```sql
-- Optional: Add foreign keys to other tables
-- Note: Only if counteragents/products tables exist in Supabase

-- ALTER TABLE purchase_orders
--   ADD CONSTRAINT fk_supplier
--   FOREIGN KEY (supplier_id) REFERENCES counteragents(id);

-- ALTER TABLE purchase_order_items
--   ADD CONSTRAINT fk_product
--   FOREIGN KEY (item_id) REFERENCES products(id);

-- ALTER TABLE goods_receipts
--   ADD CONSTRAINT fk_storage_operation
--   FOREIGN KEY (storage_operation_id) REFERENCES storage_operations(id);
```

#### 1.5 Generate TypeScript Types

- [ ] Run: `mcp__supabase__generate_typescript_types`
- [ ] Save output to `src/supabase/types.gen.ts`
- [ ] Compare generated types with existing `src/stores/supplier_2/types.ts`
- [ ] Document any discrepancies

#### 1.6 Run Security Advisors

- [ ] Check for security issues: `mcp__supabase__get_advisors({ type: 'security' })`
- [ ] Check for performance issues: `mcp__supabase__get_advisors({ type: 'performance' })`
- [ ] Address any critical warnings (especially RLS policies)

---

### Phase 2: Data Mappers & Type Generation (1 hour)

#### 2.1 Create Supabase Mappers File

- [ ] Create `src/stores/supplier_2/supabaseMappers.ts`

```typescript
// src/stores/supplier_2/supabaseMappers.ts

import type {
  ProcurementRequest,
  RequestItem,
  PurchaseOrder,
  OrderItem,
  Receipt,
  ReceiptItem,
  ReceiptDiscrepancyInfo
} from './types'

// =============================================
// PROCUREMENT REQUESTS MAPPERS
// =============================================

export function mapRequestFromDB(dbRequest: any): ProcurementRequest {
  return {
    id: dbRequest.id,
    requestNumber: dbRequest.request_number,
    department: dbRequest.department,
    requestedBy: dbRequest.requested_by,
    items: [], // Will be loaded separately
    status: dbRequest.status,
    priority: dbRequest.priority,
    purchaseOrderIds: [], // Will be populated from junction
    notes: dbRequest.notes,
    createdAt: dbRequest.created_at,
    updatedAt: dbRequest.updated_at,
    createdBy: dbRequest.created_by
  }
}

export function mapRequestToDB(request: Partial<ProcurementRequest>): any {
  return {
    id: request.id,
    request_number: request.requestNumber,
    department: request.department,
    requested_by: request.requestedBy,
    status: request.status,
    priority: request.priority,
    notes: request.notes,
    created_at: request.createdAt,
    updated_at: request.updatedAt,
    created_by: request.createdBy
  }
}

export function mapRequestItemFromDB(dbItem: any): RequestItem {
  return {
    id: dbItem.id,
    itemId: dbItem.item_id,
    itemName: dbItem.item_name,
    requestedQuantity: parseFloat(dbItem.requested_quantity),
    unit: dbItem.unit,
    packageId: dbItem.package_id,
    packageName: dbItem.package_name,
    packageQuantity: dbItem.package_quantity ? parseFloat(dbItem.package_quantity) : undefined,
    estimatedPrice: dbItem.estimated_price ? parseFloat(dbItem.estimated_price) : undefined,
    priority: dbItem.priority,
    category: dbItem.category,
    notes: dbItem.notes
  }
}

export function mapRequestItemToDB(item: RequestItem, requestId: string): any {
  return {
    id: item.id,
    request_id: requestId,
    item_id: item.itemId,
    item_name: item.itemName,
    requested_quantity: item.requestedQuantity,
    unit: item.unit,
    package_id: item.packageId,
    package_name: item.packageName,
    package_quantity: item.packageQuantity,
    estimated_price: item.estimatedPrice,
    priority: item.priority,
    category: item.category,
    notes: item.notes
  }
}

// =============================================
// PURCHASE ORDERS MAPPERS
// =============================================

export function mapOrderFromDB(dbOrder: any): PurchaseOrder {
  return {
    id: dbOrder.id,
    orderNumber: dbOrder.order_number,
    supplierId: dbOrder.supplier_id,
    supplierName: dbOrder.supplier_name,
    orderDate: dbOrder.order_date,
    expectedDeliveryDate: dbOrder.expected_delivery_date,
    items: [], // Will be loaded separately
    totalAmount: parseFloat(dbOrder.total_amount),
    isEstimatedTotal: dbOrder.is_estimated_total,
    originalTotalAmount: dbOrder.original_total_amount
      ? parseFloat(dbOrder.original_total_amount)
      : undefined,
    actualDeliveredAmount: dbOrder.actual_delivered_amount
      ? parseFloat(dbOrder.actual_delivered_amount)
      : undefined,
    status: dbOrder.status,
    billStatus: dbOrder.bill_status,
    billStatusCalculatedAt: dbOrder.bill_status_calculated_at,
    requestIds: [], // Will be populated from junction
    receiptId: dbOrder.receipt_id,
    billId: dbOrder.bill_id,
    hasReceiptDiscrepancies: dbOrder.has_receipt_discrepancies,
    receiptDiscrepancies: dbOrder.receipt_discrepancies as ReceiptDiscrepancyInfo[] | undefined,
    receiptCompletedAt: dbOrder.receipt_completed_at,
    receiptCompletedBy: dbOrder.receipt_completed_by,
    hasShortfall: dbOrder.has_shortfall,
    shortfallAmount: dbOrder.shortfall_amount ? parseFloat(dbOrder.shortfall_amount) : undefined,
    notes: dbOrder.notes,
    createdAt: dbOrder.created_at,
    updatedAt: dbOrder.updated_at,
    createdBy: dbOrder.created_by_type
      ? {
          type: dbOrder.created_by_type,
          id: dbOrder.created_by_id,
          name: dbOrder.created_by_name
        }
      : undefined
  }
}

export function mapOrderToDB(order: Partial<PurchaseOrder>): any {
  return {
    id: order.id,
    order_number: order.orderNumber,
    supplier_id: order.supplierId,
    supplier_name: order.supplierName,
    order_date: order.orderDate,
    expected_delivery_date: order.expectedDeliveryDate,
    total_amount: order.totalAmount,
    is_estimated_total: order.isEstimatedTotal,
    original_total_amount: order.originalTotalAmount,
    actual_delivered_amount: order.actualDeliveredAmount,
    status: order.status,
    bill_status: order.billStatus,
    bill_status_calculated_at: order.billStatusCalculatedAt,
    receipt_id: order.receiptId,
    bill_id: order.billId,
    has_receipt_discrepancies: order.hasReceiptDiscrepancies,
    receipt_discrepancies: order.receiptDiscrepancies,
    receipt_completed_at: order.receiptCompletedAt,
    receipt_completed_by: order.receiptCompletedBy,
    has_shortfall: order.hasShortfall,
    shortfall_amount: order.shortfallAmount,
    notes: order.notes,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
    created_by_type: order.createdBy?.type,
    created_by_id: order.createdBy?.id,
    created_by_name: order.createdBy?.name
  }
}

export function mapOrderItemFromDB(dbItem: any): OrderItem {
  return {
    id: dbItem.id,
    itemId: dbItem.item_id,
    itemName: dbItem.item_name,
    orderedQuantity: parseFloat(dbItem.ordered_quantity),
    receivedQuantity: parseFloat(dbItem.received_quantity),
    unit: dbItem.unit,
    packageId: dbItem.package_id,
    packageName: dbItem.package_name,
    packageQuantity: parseFloat(dbItem.package_quantity),
    packageUnit: dbItem.package_unit,
    pricePerUnit: parseFloat(dbItem.price_per_unit),
    packagePrice: parseFloat(dbItem.package_price),
    totalPrice: parseFloat(dbItem.total_price),
    isEstimatedPrice: dbItem.is_estimated_price,
    lastPriceDate: dbItem.last_price_date,
    status: dbItem.status,
    notes: dbItem.notes
  }
}

export function mapOrderItemToDB(item: OrderItem, orderId: string): any {
  return {
    id: item.id,
    order_id: orderId,
    item_id: item.itemId,
    item_name: item.itemName,
    ordered_quantity: item.orderedQuantity,
    received_quantity: item.receivedQuantity,
    unit: item.unit,
    package_id: item.packageId,
    package_name: item.packageName,
    package_quantity: item.packageQuantity,
    package_unit: item.packageUnit,
    price_per_unit: item.pricePerUnit,
    package_price: item.packagePrice,
    total_price: item.totalPrice,
    is_estimated_price: item.isEstimatedPrice,
    last_price_date: item.lastPriceDate,
    status: item.status,
    notes: item.notes
  }
}

// =============================================
// RECEIPTS MAPPERS
// =============================================

export function mapReceiptFromDB(dbReceipt: any): Receipt {
  return {
    id: dbReceipt.id,
    receiptNumber: dbReceipt.receipt_number,
    purchaseOrderId: dbReceipt.purchase_order_id,
    deliveryDate: dbReceipt.delivery_date,
    receivedBy: dbReceipt.received_by,
    items: [], // Will be loaded separately
    hasDiscrepancies: dbReceipt.has_discrepancies,
    status: dbReceipt.status,
    storageOperationId: dbReceipt.storage_operation_id,
    notes: dbReceipt.notes,
    createdAt: dbReceipt.created_at,
    updatedAt: dbReceipt.updated_at
  }
}

export function mapReceiptToDB(receipt: Partial<Receipt>): any {
  return {
    id: receipt.id,
    receipt_number: receipt.receiptNumber,
    purchase_order_id: receipt.purchaseOrderId,
    delivery_date: receipt.deliveryDate,
    received_by: receipt.receivedBy,
    has_discrepancies: receipt.hasDiscrepancies,
    status: receipt.status,
    storage_operation_id: receipt.storageOperationId,
    notes: receipt.notes,
    created_at: receipt.createdAt,
    updated_at: receipt.updatedAt
  }
}

export function mapReceiptItemFromDB(dbItem: any): ReceiptItem {
  return {
    id: dbItem.id,
    orderItemId: dbItem.order_item_id,
    itemId: dbItem.item_id,
    itemName: dbItem.item_name,
    orderedQuantity: parseFloat(dbItem.ordered_quantity),
    receivedQuantity: parseFloat(dbItem.received_quantity),
    unit: dbItem.unit,
    packageId: dbItem.package_id,
    packageName: dbItem.package_name,
    orderedPackageQuantity: parseFloat(dbItem.ordered_package_quantity),
    receivedPackageQuantity: parseFloat(dbItem.received_package_quantity),
    packageUnit: dbItem.package_unit,
    orderedPrice: parseFloat(dbItem.ordered_price),
    actualPrice: parseFloat(dbItem.actual_price),
    orderedBaseCost: parseFloat(dbItem.ordered_base_cost),
    actualBaseCost: parseFloat(dbItem.actual_base_cost),
    notes: dbItem.notes
  }
}

export function mapReceiptItemToDB(item: ReceiptItem, receiptId: string): any {
  return {
    id: item.id,
    receipt_id: receiptId,
    order_item_id: item.orderItemId,
    item_id: item.itemId,
    item_name: item.itemName,
    ordered_quantity: item.orderedQuantity,
    received_quantity: item.receivedQuantity,
    unit: item.unit,
    package_id: item.packageId,
    package_name: item.packageName,
    ordered_package_quantity: item.orderedPackageQuantity,
    received_package_quantity: item.receivedPackageQuantity,
    package_unit: item.packageUnit,
    ordered_price: item.orderedPrice,
    actual_price: item.actualPrice,
    ordered_base_cost: item.orderedBaseCost,
    actual_base_cost: item.actualBaseCost,
    notes: item.notes
  }
}
```

#### 2.2 Update Service Layer Imports

- [ ] Add Supabase client import to `supplierService.ts`:

```typescript
import { supabase } from '@/config/supabase'
import {
  mapRequestFromDB,
  mapRequestToDB,
  mapRequestItemFromDB,
  mapRequestItemToDB
  // ... other mappers
} from './supabaseMappers'
```

---

### Phase 3: Service Layer - Requests CRUD (3-4 hours)

#### 3.1 Update SupplierService Class

- [ ] Remove mock data arrays from `supplierService.ts`
- [ ] Remove `loadDataFromCoordinator()` method
- [ ] Keep constructor empty (no initialization needed)

```typescript
class SupplierService {
  // ✅ REMOVE: private requests: ProcurementRequest[] = []
  // ✅ REMOVE: async loadDataFromCoordinator(): void { ... }

  constructor() {
    // Empty - no initialization needed
  }

  // ... methods below
}
```

#### 3.2 Implement getRequests() - Fetch from Supabase

- [ ] Replace mock implementation with Supabase query

```typescript
async getRequests(
  filters?: {
    status?: RequestStatus
    department?: Department
    priority?: Priority
  }
): Promise<ProcurementRequest[]> {
  try {
    // 1. Build query
    let requestsQuery = supabase
      .from('procurement_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (filters?.status) {
      requestsQuery = requestsQuery.eq('status', filters.status)
    }
    if (filters?.department) {
      requestsQuery = requestsQuery.eq('department', filters.department)
    }
    if (filters?.priority) {
      requestsQuery = requestsQuery.eq('priority', filters.priority)
    }

    const { data: requestsData, error: requestsError } = await requestsQuery

    if (requestsError) throw requestsError

    if (!requestsData || requestsData.length === 0) {
      return []
    }

    // 2. Fetch all request items
    const requestIds = requestsData.map(r => r.id)
    const { data: itemsData, error: itemsError } = await supabase
      .from('procurement_request_items')
      .select('*')
      .in('request_id', requestIds)

    if (itemsError) throw itemsError

    // 3. Map and combine
    const requests = requestsData.map(dbReq => {
      const request = mapRequestFromDB(dbReq)
      request.items = (itemsData || [])
        .filter(item => item.request_id === request.id)
        .map(mapRequestItemFromDB)
      return request
    })

    DebugUtils.info(MODULE_NAME, 'Fetched requests from Supabase', {
      count: requests.length,
      filters
    })

    return requests
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to fetch requests', { error })
    throw error
  }
}
```

#### 3.3 Implement getRequestById() - Single Request

- [ ] Fetch single request with items

```typescript
async getRequestById(id: string): Promise<ProcurementRequest | null> {
  try {
    // 1. Fetch request
    const { data: requestData, error: requestError } = await supabase
      .from('procurement_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (requestError) {
      if (requestError.code === 'PGRST116') {
        return null // Not found
      }
      throw requestError
    }

    // 2. Fetch items
    const { data: itemsData, error: itemsError } = await supabase
      .from('procurement_request_items')
      .select('*')
      .eq('request_id', id)

    if (itemsError) throw itemsError

    // 3. Map and combine
    const request = mapRequestFromDB(requestData)
    request.items = (itemsData || []).map(mapRequestItemFromDB)

    return request
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to fetch request by ID', { id, error })
    throw error
  }
}
```

#### 3.4 Implement createRequest() - Insert to Supabase

- [ ] Create request with items in transaction

```typescript
async createRequest(data: CreateRequestData): Promise<ProcurementRequest> {
  try {
    const requestId = `req-${Date.now()}`
    const requestNumber = this.generateRequestNumber(data.department)
    const timestamp = new Date().toISOString()

    // 1. Create request record
    const newRequest: Partial<ProcurementRequest> = {
      id: requestId,
      requestNumber,
      department: data.department,
      requestedBy: data.requestedBy,
      status: 'draft',
      priority: data.priority || 'normal',
      purchaseOrderIds: [],
      notes: data.notes,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: data.requestedBy
    }

    const { error: requestError } = await supabase
      .from('procurement_requests')
      .insert([mapRequestToDB(newRequest)])

    if (requestError) throw requestError

    // 2. Create request items
    const items = data.items.map(item => ({
      ...item,
      id: `req-item-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    }))

    const itemsToInsert = items.map(item => mapRequestItemToDB(item, requestId))

    const { error: itemsError } = await supabase
      .from('procurement_request_items')
      .insert(itemsToInsert)

    if (itemsError) throw itemsError

    DebugUtils.info(MODULE_NAME, '✅ Request created in Supabase', {
      requestId,
      requestNumber,
      itemCount: items.length
    })

    // 3. Return complete request
    newRequest.items = items
    return newRequest as ProcurementRequest
  } catch (error) {
    DebugUtils.error(MODULE_NAME, '❌ Failed to create request', { error })
    throw error
  }
}
```

#### 3.5 Implement updateRequest() - Update in Supabase

- [ ] Update request and items

```typescript
async updateRequest(id: string, data: UpdateRequestData): Promise<ProcurementRequest> {
  try {
    const timestamp = new Date().toISOString()

    // 1. Update request record
    const updateData = {
      status: data.status,
      priority: data.priority,
      notes: data.notes,
      updated_at: timestamp
    }

    const { error: requestError } = await supabase
      .from('procurement_requests')
      .update(updateData)
      .eq('id', id)

    if (requestError) throw requestError

    // 2. If items updated, replace them
    if (data.items) {
      // Delete old items
      const { error: deleteError } = await supabase
        .from('procurement_request_items')
        .delete()
        .eq('request_id', id)

      if (deleteError) throw deleteError

      // Insert new items
      const itemsToInsert = data.items.map(item => mapRequestItemToDB(item, id))

      const { error: itemsError } = await supabase
        .from('procurement_request_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError
    }

    DebugUtils.info(MODULE_NAME, '✅ Request updated in Supabase', { id })

    // 3. Fetch and return updated request
    const updated = await this.getRequestById(id)
    if (!updated) throw new Error('Failed to fetch updated request')

    return updated
  } catch (error) {
    DebugUtils.error(MODULE_NAME, '❌ Failed to update request', { id, error })
    throw error
  }
}
```

#### 3.6 Implement deleteRequest() - Delete from Supabase

- [ ] Delete request (cascade deletes items)

```typescript
async deleteRequest(id: string): Promise<void> {
  try {
    // Items will be cascade deleted due to ON DELETE CASCADE
    const { error } = await supabase
      .from('procurement_requests')
      .delete()
      .eq('id', id)

    if (error) throw error

    DebugUtils.info(MODULE_NAME, '✅ Request deleted from Supabase', { id })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, '❌ Failed to delete request', { id, error })
    throw error
  }
}
```

#### 3.7 Helper: Generate Request Number

- [ ] Keep existing implementation (no changes needed)

```typescript
private generateRequestNumber(department: Department): string {
  const dept = department.toUpperCase().substring(0, 3)
  const date = new Date()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.random().toString(36).substring(2, 5).toUpperCase()

  return `REQ-${dept}-${month}${day}-${random}`
}
```

---

### Phase 4: Mock Data Migration Script (1-2 hours)

#### 4.1 Create Migration Script

- [ ] Create `src/stores/supplier_2/migrations/migrateMockDataToSupabase.ts`

```typescript
// src/stores/supplier_2/migrations/migrateMockDataToSupabase.ts

import { supabase } from '@/config/supabase'
import { mockDataCoordinator } from '@/stores/shared/mockDataCoordinator'
import {
  mapRequestToDB,
  mapRequestItemToDB,
  mapOrderToDB,
  mapOrderItemToDB,
  mapReceiptToDB,
  mapReceiptItemToDB
} from '../supabaseMappers'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'SupplierMigration'

export async function migrateMockDataToSupabase() {
  try {
    DebugUtils.info(MODULE_NAME, '🚀 Starting mock data migration to Supabase...')

    const supplierData = mockDataCoordinator.getSupplierStoreData()

    // =============================================
    // 1. MIGRATE PROCUREMENT REQUESTS
    // =============================================
    DebugUtils.info(MODULE_NAME, '📋 Migrating procurement requests...', {
      count: supplierData.requests.length
    })

    for (const request of supplierData.requests) {
      // Insert request
      const { error: requestError } = await supabase
        .from('procurement_requests')
        .insert([mapRequestToDB(request)])

      if (requestError) {
        DebugUtils.error(MODULE_NAME, `Failed to insert request ${request.id}`, {
          error: requestError
        })
        continue
      }

      // Insert request items
      const itemsToInsert = request.items.map(item => mapRequestItemToDB(item, request.id))

      const { error: itemsError } = await supabase
        .from('procurement_request_items')
        .insert(itemsToInsert)

      if (itemsError) {
        DebugUtils.error(MODULE_NAME, `Failed to insert items for request ${request.id}`, {
          error: itemsError
        })
      }
    }

    DebugUtils.info(MODULE_NAME, '✅ Procurement requests migrated')

    // =============================================
    // 2. MIGRATE PURCHASE ORDERS
    // =============================================
    DebugUtils.info(MODULE_NAME, '📦 Migrating purchase orders...', {
      count: supplierData.orders.length
    })

    for (const order of supplierData.orders) {
      // Insert order
      const { error: orderError } = await supabase
        .from('purchase_orders')
        .insert([mapOrderToDB(order)])

      if (orderError) {
        DebugUtils.error(MODULE_NAME, `Failed to insert order ${order.id}`, {
          error: orderError
        })
        continue
      }

      // Insert order items
      const itemsToInsert = order.items.map(item => mapOrderItemToDB(item, order.id))

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsToInsert)

      if (itemsError) {
        DebugUtils.error(MODULE_NAME, `Failed to insert items for order ${order.id}`, {
          error: itemsError
        })
      }
    }

    DebugUtils.info(MODULE_NAME, '✅ Purchase orders migrated')

    // =============================================
    // 3. MIGRATE RECEIPTS
    // =============================================
    DebugUtils.info(MODULE_NAME, '📥 Migrating receipts...', {
      count: supplierData.receipts.length
    })

    for (const receipt of supplierData.receipts) {
      // Insert receipt
      const { error: receiptError } = await supabase
        .from('goods_receipts')
        .insert([mapReceiptToDB(receipt)])

      if (receiptError) {
        DebugUtils.error(MODULE_NAME, `Failed to insert receipt ${receipt.id}`, {
          error: receiptError
        })
        continue
      }

      // Insert receipt items
      const itemsToInsert = receipt.items.map(item => mapReceiptItemToDB(item, receipt.id))

      const { error: itemsError } = await supabase.from('goods_receipt_items').insert(itemsToInsert)

      if (itemsError) {
        DebugUtils.error(MODULE_NAME, `Failed to insert items for receipt ${receipt.id}`, {
          error: itemsError
        })
      }
    }

    DebugUtils.info(MODULE_NAME, '✅ Receipts migrated')

    // =============================================
    // SUMMARY
    // =============================================
    DebugUtils.summary(MODULE_NAME, '🎉 Mock data migration complete!', {
      requests: supplierData.requests.length,
      orders: supplierData.orders.length,
      receipts: supplierData.receipts.length
    })

    return {
      success: true,
      migrated: {
        requests: supplierData.requests.length,
        orders: supplierData.orders.length,
        receipts: supplierData.receipts.length
      }
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, '❌ Mock data migration failed', { error })
    throw error
  }
}
```

#### 4.2 Create Migration UI Trigger (Optional)

- [ ] Add migration button to debug view or supplier view

```vue
<!-- Temporary migration trigger in SupplierView.vue -->
<template>
  <v-dialog v-model="showMigrationDialog" max-width="500">
    <template v-slot:activator="{ props }">
      <v-btn v-if="ENV.debugEnabled" v-bind="props" color="warning" variant="outlined" size="small">
        Migrate Mock Data to Supabase
      </v-btn>
    </template>

    <v-card>
      <v-card-title>Migrate Mock Data</v-card-title>
      <v-card-text>
        This will migrate all mock supplier data (requests, orders, receipts) to Supabase.
        <v-alert type="warning" class="mt-4">This operation should only be run once!</v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="showMigrationDialog = false">Cancel</v-btn>
        <v-btn @click="runMigration" color="primary" :loading="migrating">Migrate Now</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { migrateMockDataToSupabase } from '@/stores/supplier_2/migrations/migrateMockDataToSupabase'
import { ENV } from '@/config/environment'

const showMigrationDialog = ref(false)
const migrating = ref(false)

const runMigration = async () => {
  migrating.value = true
  try {
    await migrateMockDataToSupabase()
    alert('Migration completed successfully!')
    showMigrationDialog.value = false
  } catch (error) {
    alert('Migration failed: ' + error)
  } finally {
    migrating.value = false
  }
}
</script>
```

#### 4.3 Verify Migration

- [ ] Run migration script
- [ ] Check data in Supabase:

```sql
-- Verify requests
SELECT COUNT(*) FROM procurement_requests;
SELECT COUNT(*) FROM procurement_request_items;

-- Verify orders
SELECT COUNT(*) FROM purchase_orders;
SELECT COUNT(*) FROM purchase_order_items;

-- Verify receipts
SELECT COUNT(*) FROM goods_receipts;
SELECT COUNT(*) FROM goods_receipt_items;

-- Sample data check
SELECT * FROM procurement_requests ORDER BY created_at DESC LIMIT 5;
SELECT * FROM purchase_orders ORDER BY order_date DESC LIMIT 5;
```

- [ ] Verify relationships (request → order, order → receipt)
- [ ] Check JSONB fields are properly populated
- [ ] Verify all timestamps are correct

---

### Phase 5: Store Layer Updates (2 hours)

#### 5.1 Add Loading & Error States

- [ ] Update `supplierStore.ts` state

```typescript
const state = ref<SupplierState>({
  requests: [],
  orders: [],
  receipts: [],

  // ✅ NEW: Enhanced loading states
  loading: {
    requests: false,
    orders: false,
    receipts: false,
    suggestions: false
  },

  // ✅ NEW: Error state
  error: null as string | null,

  // ✅ NEW: Initialization state
  initializing: false,
  initialized: false,

  currentRequest: undefined,
  currentOrder: undefined,
  currentReceipt: undefined,

  selectedRequestIds: [],
  orderSuggestions: [],
  supplierBaskets: []
})
```

#### 5.2 Update Initialize Method

- [ ] Remove mock data loading, add Supabase initialization

```typescript
async function initialize() {
  if (state.value.initialized) {
    return
  }

  state.value.initializing = true
  state.value.error = null

  try {
    DebugUtils.info(MODULE_NAME, '🚀 Initializing supplier store...')

    // ✅ REMOVE: await supplierService.loadDataFromCoordinator()

    // Load initial data from Supabase
    await Promise.all([
      loadRequests()
      // Orders and receipts will be loaded in later sprints
      // loadOrders(),
      // loadReceipts()
    ])

    state.value.initialized = true

    DebugUtils.info(MODULE_NAME, '✅ Supplier store initialized', {
      requestsCount: state.value.requests.length
    })
  } catch (error) {
    state.value.error = error instanceof Error ? error.message : 'Initialization failed'
    DebugUtils.error(MODULE_NAME, '❌ Supplier store initialization failed', { error })
    throw error
  } finally {
    state.value.initializing = false
  }
}
```

#### 5.3 Create loadRequests() Method

- [ ] Add method to load requests from service

```typescript
async function loadRequests(filters?: {
  status?: RequestStatus
  department?: Department
  priority?: Priority
}) {
  state.value.loading.requests = true
  state.value.error = null

  try {
    const requests = await supplierService.getRequests(filters)
    state.value.requests = requests

    DebugUtils.store(MODULE_NAME, 'Requests loaded', {
      count: requests.length,
      filters
    })
  } catch (error) {
    state.value.error = error instanceof Error ? error.message : 'Failed to load requests'
    DebugUtils.error(MODULE_NAME, 'Failed to load requests', { error })
    throw error
  } finally {
    state.value.loading.requests = false
  }
}
```

#### 5.4 Update CRUD Methods with Loading States

- [ ] Update createRequest(), updateRequest(), deleteRequest()

```typescript
async function createRequest(data: CreateRequestData) {
  state.value.loading.requests = true
  state.value.error = null

  try {
    const newRequest = await supplierService.createRequest(data)

    // Reload requests
    await loadRequests()

    DebugUtils.info(MODULE_NAME, '✅ Request created', {
      id: newRequest.id,
      requestNumber: newRequest.requestNumber
    })

    return newRequest
  } catch (error) {
    state.value.error = error instanceof Error ? error.message : 'Failed to create request'
    DebugUtils.error(MODULE_NAME, '❌ Failed to create request', { error })
    throw error
  } finally {
    state.value.loading.requests = false
  }
}

async function updateRequest(id: string, data: UpdateRequestData) {
  state.value.loading.requests = true
  state.value.error = null

  try {
    const updated = await supplierService.updateRequest(id, data)

    // Reload requests
    await loadRequests()

    DebugUtils.info(MODULE_NAME, '✅ Request updated', { id })

    return updated
  } catch (error) {
    state.value.error = error instanceof Error ? error.message : 'Failed to update request'
    DebugUtils.error(MODULE_NAME, '❌ Failed to update request', { id, error })
    throw error
  } finally {
    state.value.loading.requests = false
  }
}

async function deleteRequest(id: string) {
  state.value.loading.requests = true
  state.value.error = null

  try {
    await supplierService.deleteRequest(id)

    // Reload requests
    await loadRequests()

    DebugUtils.info(MODULE_NAME, '✅ Request deleted', { id })
  } catch (error) {
    state.value.error = error instanceof Error ? error.message : 'Failed to delete request'
    DebugUtils.error(MODULE_NAME, '❌ Failed to delete request', { id, error })
    throw error
  } finally {
    state.value.loading.requests = false
  }
}
```

#### 5.5 Add clearError() Helper

- [ ] Add method to clear error state

```typescript
function clearError() {
  state.value.error = null
}
```

#### 5.6 Export New Methods

- [ ] Update return statement

```typescript
return {
  // State
  state,
  integrationState,

  // Initialization
  initialize,
  initialized: computed(() => state.value.initialized),
  initializing: computed(() => state.value.initializing),
  error: computed(() => state.value.error),
  clearError,

  // Requests
  loadRequests,
  createRequest,
  updateRequest,
  deleteRequest

  // ... other methods
}
```

---

### Phase 6: Composables Updates (1 hour)

#### 6.1 Update useProcurementRequests.ts

- [ ] Update `src/stores/supplier_2/composables/useProcurementRequests.ts`

```typescript
// src/stores/supplier_2/composables/useProcurementRequests.ts

import { computed } from 'vue'
import { useSupplierStore } from '../supplierStore'
import type { CreateRequestData, UpdateRequestData, RequestStatus, Department } from '../types'

export function useProcurementRequests() {
  const supplierStore = useSupplierStore()

  // =============================================
  // COMPUTED PROPERTIES
  // =============================================

  const requests = computed(() => supplierStore.state.requests)
  const loading = computed(() => supplierStore.state.loading.requests)
  const error = computed(() => supplierStore.error)

  const draftRequests = computed(() => requests.value.filter(r => r.status === 'draft'))

  const submittedRequests = computed(() => requests.value.filter(r => r.status === 'submitted'))

  const convertedRequests = computed(() => requests.value.filter(r => r.status === 'converted'))

  // =============================================
  // METHODS
  // =============================================

  const loadRequests = async (filters?: { status?: RequestStatus; department?: Department }) => {
    return await supplierStore.loadRequests(filters)
  }

  const createRequest = async (data: CreateRequestData) => {
    return await supplierStore.createRequest(data)
  }

  const updateRequest = async (id: string, data: UpdateRequestData) => {
    return await supplierStore.updateRequest(id, data)
  }

  const deleteRequest = async (id: string) => {
    return await supplierStore.deleteRequest(id)
  }

  const submitRequest = async (id: string) => {
    return await supplierStore.updateRequest(id, { status: 'submitted' })
  }

  const cancelRequest = async (id: string) => {
    return await supplierStore.updateRequest(id, { status: 'cancelled' })
  }

  const getRequestById = (id: string) => {
    return requests.value.find(r => r.id === id)
  }

  // =============================================
  // RETURN
  // =============================================

  return {
    // State
    requests,
    loading,
    error,
    draftRequests,
    submittedRequests,
    convertedRequests,

    // Methods
    loadRequests,
    createRequest,
    updateRequest,
    deleteRequest,
    submitRequest,
    cancelRequest,
    getRequestById
  }
}
```

---

### Phase 7: UI Components Updates (2 hours)

#### 7.1 Update SupplierView.vue

- [ ] Add loading/error states

```vue
<template>
  <div class="supplier-view">
    <!-- Loading state -->
    <div v-if="supplierStore.initializing" class="loading-container">
      <v-progress-circular indeterminate color="primary" />
      <p class="mt-4">Loading supplier data...</p>
    </div>

    <!-- Error state -->
    <v-alert
      v-else-if="supplierStore.error"
      type="error"
      closable
      @click:close="supplierStore.clearError()"
      class="mb-4"
    >
      {{ supplierStore.error }}
      <template v-slot:append>
        <v-btn @click="retry" variant="text" size="small" color="error">Retry</v-btn>
      </template>
    </v-alert>

    <!-- Content -->
    <div v-else>
      <!-- Existing supplier view content -->
      <v-tabs v-model="activeTab">
        <v-tab value="procurement">Procurement Requests</v-tab>
        <v-tab value="orders">Purchase Orders</v-tab>
        <v-tab value="receipts">Receipts</v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <!-- Procurement tab -->
        <v-window-item value="procurement">
          <!-- Request list component -->
        </v-window-item>

        <!-- Other tabs -->
      </v-window>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSupplierStore } from '@/stores/supplier_2'

const supplierStore = useSupplierStore()
const activeTab = ref('procurement')

onMounted(async () => {
  if (!supplierStore.initialized) {
    await supplierStore.initialize()
  }
})

const retry = async () => {
  supplierStore.clearError()
  await supplierStore.initialize()
}
</script>
```

#### 7.2 Update Request List Component

- [ ] Update `src/views/supplier_2/components/procurement/RequestList.vue`

```vue
<template>
  <div class="request-list">
    <!-- Data table with loading state -->
    <v-data-table
      :items="requests"
      :headers="headers"
      :loading="loading"
      loading-text="Loading requests..."
      :items-per-page="10"
    >
      <!-- Table content -->
      <template v-slot:item.actions="{ item }">
        <v-btn
          icon="mdi-pencil"
          size="small"
          variant="text"
          @click="editRequest(item)"
          :disabled="loading"
        />
        <v-btn
          icon="mdi-delete"
          size="small"
          variant="text"
          color="error"
          @click="deleteRequest(item)"
          :disabled="loading"
        />
      </template>
    </v-data-table>
  </div>
</template>

<script setup lang="ts">
import { useProcurementRequests } from '@/stores/supplier_2/composables'

const { requests, loading, deleteRequest: deleteRequestAction } = useProcurementRequests()

// ... existing methods
</script>
```

#### 7.3 Update Create/Edit Request Dialog

- [ ] Update `src/views/supplier_2/components/procurement/RequestDialog.vue`

```vue
<template>
  <v-dialog v-model="dialog" max-width="900px" persistent>
    <v-card>
      <v-card-title>
        {{ isEdit ? 'Edit Request' : 'Create Request' }}
      </v-card-title>

      <v-card-text>
        <!-- Form fields -->
        <v-form ref="form" v-model="valid">
          <!-- Department, requested by, items, etc. -->
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn @click="close" :disabled="loading">Cancel</v-btn>
        <v-btn @click="save" color="primary" :loading="loading" :disabled="!valid">
          {{ isEdit ? 'Update' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useProcurementRequests } from '@/stores/supplier_2/composables'

const { loading, createRequest, updateRequest } = useProcurementRequests()

// ... existing logic with loading state
</script>
```

---

### Phase 8: Testing & Validation (2 hours)

#### 8.1 Database Testing

**Test Data Integrity:**

- [ ] Query requests: `SELECT * FROM procurement_requests LIMIT 10`
- [ ] Query request items: `SELECT * FROM procurement_request_items LIMIT 10`
- [ ] Verify foreign keys work:

```sql
-- Test join
SELECT
  r.request_number,
  r.department,
  COUNT(ri.id) as item_count
FROM procurement_requests r
LEFT JOIN procurement_request_items ri ON ri.request_id = r.id
GROUP BY r.id, r.request_number, r.department
ORDER BY r.created_at DESC;
```

- [ ] Check indexes are being used:

```sql
EXPLAIN ANALYZE
SELECT * FROM procurement_requests
WHERE status = 'submitted'
ORDER BY created_at DESC;
```

**Test CRUD Operations:**

- [ ] Create new request via UI
- [ ] Verify insertion: `SELECT * FROM procurement_requests ORDER BY created_at DESC LIMIT 1`
- [ ] Verify items inserted: `SELECT * FROM procurement_request_items WHERE request_id = '...'`
- [ ] Update request status
- [ ] Verify update: Check `updated_at` timestamp changed
- [ ] Delete request
- [ ] Verify cascade delete: Items also deleted

#### 8.2 TypeScript Compilation

- [ ] Run `pnpm build` - verify no errors
- [ ] Check for type mismatches in mappers
- [ ] Verify all imports resolve
- [ ] Check no implicit any errors

#### 8.3 UI Testing

**Test Loading States:**

- [ ] Open `/supplier` view
- [ ] Verify loading spinner shows during initialization
- [ ] Verify table shows loading overlay when fetching
- [ ] Verify dialog buttons show loading state during save

**Test Error Handling:**

- [ ] Simulate network error (disconnect internet)
- [ ] Verify error alert shows with proper message
- [ ] Verify retry button works
- [ ] Reconnect and verify data loads

**Test CRUD Workflow:**

- [ ] Create new request with multiple items
- [ ] Verify appears in list immediately
- [ ] Edit request (change status, add/remove items)
- [ ] Verify changes persist after page refresh
- [ ] Delete request
- [ ] Verify removed from list

**Test Filters:**

- [ ] Filter by status (draft, submitted, etc.)
- [ ] Filter by department
- [ ] Filter by priority
- [ ] Verify filters work correctly

#### 8.4 Integration Testing

- [ ] Verify request-to-order conversion still works (placeholders OK for now)
- [ ] Check storage integration hooks are ready (will be implemented in Sprint 3)
- [ ] Verify no regressions in other stores

#### 8.5 Console Verification

- [ ] No TypeScript errors in browser console
- [ ] No network errors (failed Supabase queries)
- [ ] Verify DebugUtils logs show Supabase operations
- [ ] Check for any warnings or errors

#### 8.6 Performance Check

- [ ] Monitor initial load time
- [ ] Check request list rendering performance
- [ ] Verify Supabase query response times
- [ ] Check if indexes are helping (use EXPLAIN ANALYZE)

---

## ✅ Sprint 1 Success Criteria

### Database:

- ✅ All 6 tables created with correct schema
- ✅ Indexes created for performance
- ✅ Foreign keys and constraints working
- ✅ TypeScript types generated

### Data Migration:

- ✅ All mock requests migrated to Supabase
- ✅ All mock orders migrated to Supabase
- ✅ All mock receipts migrated to Supabase
- ✅ Data integrity verified

### Service Layer:

- ✅ Requests CRUD operations work with Supabase
- ✅ Mock data dependencies removed
- ✅ Mappers work bidirectionally
- ✅ All methods handle errors gracefully

### Store Layer:

- ✅ Loading and error states implemented
- ✅ Initialize method works
- ✅ All CRUD methods have loading states
- ✅ Error messages display correctly

### Composables:

- ✅ useProcurementRequests updated
- ✅ All methods work with async operations
- ✅ Proper error handling

### UI:

- ✅ Loading skeletons display during initialization
- ✅ Error alerts show with retry option
- ✅ All dialogs have loading states
- ✅ Tables show loading spinners
- ✅ No regressions in existing functionality

### Testing:

- ✅ All CRUD operations tested end-to-end
- ✅ TypeScript compiles without errors
- ✅ No console errors
- ✅ Data persists correctly after refresh
- ✅ Filters work correctly

---

## 📋 Sprint 2: Order Assistant + Dynamic Suggestions (5-7 days)

### Overview

**Goal:** Implement smart ordering suggestions based on storage balances and consumption patterns

**Key Features:**

- Generate order suggestions from storage balances
- Consider transit stock (orders in-flight)
- Calculate urgency levels
- Filter out items with pending requests/orders
- Integration with storage store

### High-Level Tasks

#### Phase 1: Service Layer - Suggestions (2-3h)

- Implement `generateOrderSuggestions()` method
- Fetch storage balances from Storage Store
- Fetch transit batches
- Calculate effective stock (current + transit - pending orders)
- Determine urgency (out_of_stock, critical, low, reorder)
- Return suggestions sorted by urgency

#### Phase 2: Order Assistant Composable (2h)

- Update `useOrderAssistant.ts`
- Implement suggestion filtering
- Implement "add to basket" functionality
- Handle bulk operations

#### Phase 3: UI Components (2-3h)

- Update Order Assistant view
- Display suggestions with urgency indicators
- Add filters (department, category, urgency)
- Implement suggestion actions

#### Phase 4: Testing (1-2h)

- Test suggestion generation
- Test urgency calculation
- Test integration with storage store

---

## 📋 Sprint 3: Purchase Orders + Storage Integration (7-10 days)

### Overview

**Goal:** Implement purchase order management with full storage integration

**Key Features:**

- Order CRUD with Supabase
- Request-to-order conversion
- Supplier basket logic
- Package calculations
- Price fetching from storage
- Transit batch creation
- Bill creation in Account Store

### High-Level Tasks

#### Phase 1: Service Layer - Orders (3-4h)

- Implement orders CRUD with Supabase
- Implement request-to-order conversion
- Implement supplier basket grouping
- Package calculation logic
- Price fetching from storage batches

#### Phase 2: Storage Integration (2-3h)

- Transit batch creation on order send
- Transit batch conversion on receipt
- Transit batch cleanup on cancel
- Integration with storage store

#### Phase 3: Bill Creation (2h)

- Create bill in Account Store when order sent
- Link billId to purchase order
- Handle bill status updates

#### Phase 4: Composables (2h)

- Update `usePurchaseOrders.ts`
- Implement order workflow methods

#### Phase 5: UI Components (3-4h)

- Update order views
- Implement order creation workflow
- Display bill status
- Show transit stock

#### Phase 6: Testing (2h)

- Test order CRUD
- Test storage integration
- Test bill creation

---

## 📋 Sprint 4: Receipts + Payment Integration (7-10 days)

### Overview

**Goal:** Implement receipt management with full payment integration

**Key Features:**

- Receipt CRUD with Supabase
- Discrepancy tracking (quantity/price)
- Storage operation creation
- Bill status calculation
- Payment tracking
- Supplier credit handling
- Complete workflow integration

### High-Level Tasks

#### Phase 1: Service Layer - Receipts (3-4h)

- Implement receipts CRUD with Supabase
- Implement discrepancy detection
- Calculate order adjustments
- Update order totals

#### Phase 2: Storage Operation Creation (2-3h)

- Create storage receipt operation
- Create storage batches with actual costs
- Update product prices from receipts

#### Phase 3: Payment Integration (3-4h)

- Bill status calculation logic
- Handle overpayments (supplier credit)
- Handle credit usage
- Update bill in Account Store
- Automated payment tracking

#### Phase 4: Composables (2h)

- Update `useReceipts.ts`
- Update `useOrderPayments.ts`
- Implement receipt workflow methods

#### Phase 5: UI Components (3-4h)

- Update receipt views
- Display discrepancies
- Show payment status
- Handle supplier credit UI

#### Phase 6: Testing (2-3h)

- Test receipt CRUD
- Test discrepancy tracking
- Test payment integration
- End-to-end workflow testing

---

## 📝 Implementation Notes

### Field Naming Convention

- **Database:** `snake_case` (item_id, cost_per_unit, order_date)
- **TypeScript:** `camelCase` (itemId, costPerUnit, orderDate)
- **Mappers:** Bidirectional conversion in `supabaseMappers.ts`

### Package System Logic

**Base Units:**

- All quantities ALWAYS stored in base units in database
- Product defines base unit (gram, ml, piece)

**Package Calculations:**

- UI displays packages (kg, liter, dozen)
- Conversion: `baseQuantity = packageQuantity * packageSize`
- Example: 5 kg = 5000 gram (1 kg package = 1000 gram)

**Package Fields:**

- `package_id`: ID of selected package
- `package_name`: Display name ("Килограмм", "Литр")
- `package_quantity`: How many packages
- `package_unit`: Unit of package (kg, liter)
- Base quantity stored separately in `ordered_quantity`, `received_quantity`

### JSONB Fields

**receiptDiscrepancies:**

```typescript
{
  type: 'quantity' | 'price' | 'both',
  itemId: string,
  itemName: string,
  ordered: { quantity, price, total },
  received: { quantity, price, total },
  impact: { quantityDifference, priceDifference, totalDifference }
}[]
```

### State Transitions

**Request Status:**

- `draft` → `submitted` → `converted` → (order created)
- `draft` → `cancelled`

**Order Status:**

- `draft` → `sent` → `delivered`
- `draft` → `cancelled`
- `sent` → `cancelled`

**Bill Status:**

- `not_billed` (order draft)
- `pending` (order sent, bill created)
- `partially_paid` (some payments made)
- `fully_paid` (total paid = order amount)
- `overpaid` (total paid > order amount, creates supplier credit)
- `credit_used` (supplier credit applied)

**Receipt Status:**

- `pending` (created, items being received)
- `completed` (all items received, storage operation created)
- `cancelled`

### Integration Points

**Storage Store Integration:**

- Fetch FIFO batches for price history
- Create transit batches on order send
- Convert transit → active on receipt
- Create storage receipt operation
- Update product costs from actual receipts

**Products Store Integration:**

- Fetch product definitions
- Get base units and package definitions
- Cache product names

**Counteragents Store Integration:**

- Fetch supplier information
- Cache supplier names
- Handle supplier credit balances

**Account Store Integration:**

- Create bills on order send
- Update bill status on payments
- Handle overpayments (supplier credit)
- Link billId to purchase order

### Cost Calculation

**Order Cost:**

- `total_amount = SUM(item.total_price)`
- `item.total_price = ordered_quantity * price_per_unit`

**Receipt Adjustments:**

- `actual_delivered_amount = SUM(item.actual_total)`
- `item.actual_total = received_quantity * actual_price`
- `discrepancy = ordered_total - actual_total`

**Bill Status Logic:**

```typescript
if (totalPaid === 0) return 'not_billed' or 'pending'
if (totalPaid < orderAmount) return 'partially_paid'
if (totalPaid === orderAmount) return 'fully_paid'
if (totalPaid > orderAmount) return 'overpaid' // Creates supplier credit
if (supplierCreditUsed) return 'credit_used'
```

### Error Handling Pattern

**Service Layer:**

```typescript
try {
  const { data, error } = await supabase.from('table').operation()
  if (error) throw error
  return mapFromDB(data)
} catch (error) {
  DebugUtils.error(MODULE_NAME, 'Operation failed', { error })
  throw error
}
```

**Store Layer:**

```typescript
state.loading = true
state.error = null
try {
  const result = await service.method()
  // Update state
} catch (error) {
  state.error = error.message
  throw error
} finally {
  state.loading = false
}
```

**Composable Layer:**

```typescript
const loading = ref(false)
const error = ref<string | null>(null)

const doAction = async () => {
  loading.value = true
  error.value = null
  try {
    await store.action()
  } catch (err) {
    error.value = err.message
    throw err
  } finally {
    loading.value = false
  }
}
```

---

## 🔗 Related Files

### Store Layer

- `src/stores/supplier_2/supplierStore.ts` - Main Pinia store (1633 lines)
- `src/stores/supplier_2/types.ts` - Type definitions (547 lines)
- `src/stores/supplier_2/supabaseMappers.ts` - **NEW** - Data mappers

### Service Layer

- `src/stores/supplier_2/supplierService.ts` - Main service (1050 lines)
- `src/stores/supplier_2/migrations/migrateMockDataToSupabase.ts` - **NEW** - Migration script

### Composables (5 files)

- `src/stores/supplier_2/composables/useProcurementRequests.ts`
- `src/stores/supplier_2/composables/useOrderAssistant.ts`
- `src/stores/supplier_2/composables/usePurchaseOrders.ts`
- `src/stores/supplier_2/composables/useReceipts.ts`
- `src/stores/supplier_2/composables/useOrderPayments.ts`

### Integration Modules

- `src/stores/supplier_2/integrations/storageIntegration.ts` - Storage Store integration
- `src/stores/supplier_2/integrations/accountIntegration.ts` - Account Store integration
- `src/stores/supplier_2/index.ts` - Public API exports

### UI Components (29+ files)

**Main View:**

- `src/views/supplier_2/SupplierView.vue` - Main supplier view

**Procurement Components:**

- `src/views/supplier_2/components/procurement/RequestList.vue`
- `src/views/supplier_2/components/procurement/RequestDialog.vue`
- `src/views/supplier_2/components/procurement/RequestItemTable.vue`

**Orders Components:**

- `src/views/supplier_2/components/orders/OrderList.vue`
- `src/views/supplier_2/components/orders/OrderDialog.vue`
- `src/views/supplier_2/components/orders/OrderItemTable.vue`
- `src/views/supplier_2/components/orders/SupplierBasketView.vue`

**Receipts Components:**

- `src/views/supplier_2/components/receipts/ReceiptList.vue`
- `src/views/supplier_2/components/receipts/ReceiptDialog.vue`
- `src/views/supplier_2/components/receipts/ReceiptItemTable.vue`
- `src/views/supplier_2/components/receipts/DiscrepancyAlert.vue`

**Shared Components:**

- `src/views/supplier_2/components/shared/PackageSelector.vue`
- `src/views/supplier_2/components/shared/PriceDisplay.vue`
- `src/views/supplier_2/components/shared/StatusChip.vue`

### Database

**Tables:**

- `procurement_requests` + `procurement_request_items`
- `purchase_orders` + `purchase_order_items`
- `goods_receipts` + `goods_receipt_items`

**Migrations:**

- `supabase/migrations/YYYYMMDDHHMMSS_create_supplier_tables.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_add_supplier_indexes.sql`

### External Integrations

- Storage Store: `src/stores/storage/`
- Products Store: `src/stores/productsStore/`
- Counteragents Store: `src/stores/counteragents/`
- Account Store: `src/stores/account/`

---

## 🚀 Next Steps

### Sprint 1 (Current):

1. ✅ Create database schema (all 6 tables)
2. ✅ Generate TypeScript types and create mappers
3. ✅ Implement requests CRUD with Supabase
4. ✅ Migrate mock data to database
5. ✅ Update store with loading/error states
6. ✅ Update composables for async operations
7. ✅ Update UI components with loading states
8. ✅ Test thoroughly

### Sprint 2:

1. Implement order suggestions from storage balances
2. Consider transit stock in calculations
3. Update Order Assistant UI

### Sprint 3:

1. Implement orders CRUD
2. Storage integration (transit batches)
3. Bill creation in Account Store

### Sprint 4:

1. Implement receipts CRUD
2. Discrepancy tracking
3. Payment integration
4. Complete workflow testing

---

**Last Updated:** 2025-11-21
**Estimated Total Time:** 40-50 days (all 4 sprints)
**Sprint 1 Time:** 7-10 days
**Status:** Sprint 1 Planning Phase - Ready to Start

---

## 📊 Progress Tracking

### Sprint 1 Progress: 0% Complete

- [ ] Phase 1: Database Schema Creation (0/6 tasks)
- [ ] Phase 2: Data Mappers (0/2 tasks)
- [ ] Phase 3: Service Layer (0/7 tasks)
- [ ] Phase 4: Mock Data Migration (0/3 tasks)
- [ ] Phase 5: Store Updates (0/6 tasks)
- [ ] Phase 6: Composables (0/1 tasks)
- [ ] Phase 7: UI Components (0/3 tasks)
- [ ] Phase 8: Testing (0/6 tasks)

**Total Tasks:** 34 tasks in Sprint 1
**Completed:** 0 tasks
**Remaining:** 34 tasks
