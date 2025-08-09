# 🔄 Supplier Workflow - Complete Transparency Plan

## 🎯 **Target Complete Workflow:**

```
1. Request Creation → 2. Request Consolidation → 3. PO Creation →
4. Bill Generation → 5. Payment Processing → 6. Receipt Acceptance →
7. Financial Integration
```

---

## ❌ **Current Gaps Analysis:**

### **Gap 1: Request Consolidation Missing**

```
Problem:
- Kitchen requests milk (5L)
- Bar requests milk (3L)
- No interface to combine into single 8L order

Solution: Add consolidation logic and UI
```

### **Gap 2: No Bills/Invoice Management**

```
Problem:
- PO created but no invoice tracking
- No payment status management
- No due date tracking

Solution: Add Bill entity and management
```

### **Gap 3: Disconnected Financial Flow**

```
Problem:
- No integration with AccountStore
- No automatic transaction creation
- No supplier debt tracking

Solution: Add financial integration layer
```

### **Gap 4: Incomplete Status Tracking**

```
Problem:
- Request status doesn't update after PO creation
- No clear visibility of workflow stages
- Missing status transitions

Solution: Add comprehensive status management
```

---

## 🏗️ **Phase 1: Complete Supplier Entity Structure**

### **1.1 Add Bill Entity:**

```typescript
// Add to src/stores/supplier/types.ts

export interface Bill extends BaseEntity {
  // Identification
  billNumber: string // "BILL-MEAT-001"
  purchaseOrderId: string
  supplierId: string
  supplierName: string // cached

  // Financial details
  totalAmount: number
  taxAmount?: number
  discountAmount?: number
  finalAmount: number // calculated final amount

  // Payment terms
  paymentTerms: PaymentTerms
  issueDate: string
  dueDate: string

  // Status and tracking
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'
  paymentStatus: 'unpaid' | 'partial' | 'paid'

  // Integration
  accountTransactionId?: string // link to payment transaction

  // Metadata
  notes?: string
  issuedBy: string
  paidAt?: string
}

export interface CreateBillData {
  purchaseOrderId: string
  supplierId: string
  totalAmount: number
  paymentTerms: PaymentTerms
  dueDate: string
  notes?: string
  issuedBy: string
}
```

### **1.2 Add Consolidation Types:**

```typescript
export interface RequestConsolidation extends BaseEntity {
  // Basic info
  consolidationNumber: string // "CONS-001"
  consolidationDate: string
  consolidatedBy: string

  // Source requests
  sourceRequestIds: string[]
  departments: ('kitchen' | 'bar')[]

  // Consolidated items grouped by supplier
  supplierGroups: SupplierGroup[]

  // Status
  status: 'draft' | 'processed' | 'cancelled'

  // Results
  generatedOrderIds: string[]
  totalEstimatedValue: number
}

export interface SupplierGroup {
  supplierId: string
  supplierName: string
  items: ConsolidatedItem[]
  estimatedTotal: number
}

export interface ConsolidatedItem {
  itemId: string
  itemName: string
  unit: string

  // Quantities by department
  kitchenQuantity: number
  barQuantity: number
  totalQuantity: number

  // Source requests
  sourceRequests: {
    requestId: string
    requestNumber: string
    department: 'kitchen' | 'bar'
    quantity: number
    reason: string
  }[]

  // Pricing
  estimatedPrice?: number
  totalEstimatedCost?: number
}
```

### **1.3 Extend Store State:**

```typescript
export interface SupplierState {
  // ... existing state

  // New additions:
  bills: Bill[]
  consolidations: RequestConsolidation[]

  // Enhanced loading states
  loading: {
    suppliers: boolean
    requests: boolean
    orders: boolean
    acceptance: boolean
    bills: boolean // NEW
    consolidation: boolean // NEW
    payment: boolean // NEW
  }

  // Workflow state
  currentConsolidation?: RequestConsolidation
  selectedRequestIds: string[]
}
```

---

## 🔄 **Phase 2: Enhanced Workflow Methods**

### **2.1 Request Consolidation Service:**

```typescript
// Add to supplierService.ts

async createConsolidation(
  requestIds: string[],
  consolidatedBy: string
): Promise<RequestConsolidation> {

  // 1. Validate requests
  const requests = await this.getRequestsByIds(requestIds)

  // 2. Group items by supplier
  const supplierGroups = this.groupItemsBySupplier(requests)

  // 3. Calculate totals
  const totalEstimatedValue = this.calculateTotalValue(supplierGroups)

  // 4. Create consolidation
  const consolidation: RequestConsolidation = {
    id: `cons-${Date.now()}`,
    consolidationNumber: `CONS-${String(this.consolidations.length + 1).padStart(3, '0')}`,
    consolidationDate: new Date().toISOString(),
    consolidatedBy,
    sourceRequestIds: requestIds,
    departments: this.extractDepartments(requests),
    supplierGroups,
    status: 'draft',
    generatedOrderIds: [],
    totalEstimatedValue,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  this.consolidations.push(consolidation)
  return consolidation
}

async createOrdersFromConsolidation(
  consolidationId: string
): Promise<PurchaseOrder[]> {

  const consolidation = this.getConsolidationById(consolidationId)
  const createdOrders: PurchaseOrder[] = []

  // Create one PO per supplier group
  for (const group of consolidation.supplierGroups) {
    const orderData: CreatePurchaseOrderData = {
      supplierId: group.supplierId,
      requestIds: consolidation.sourceRequestIds,
      items: this.convertConsolidatedItems(group.items),
      notes: `Created from consolidation ${consolidation.consolidationNumber}`
    }

    const order = await this.createPurchaseOrder(orderData)
    createdOrders.push(order)
  }

  // Update consolidation status
  await this.updateConsolidation(consolidationId, {
    status: 'processed',
    generatedOrderIds: createdOrders.map(o => o.id)
  })

  // Update source requests status
  await this.updateRequestsStatus(consolidation.sourceRequestIds, 'converted')

  return createdOrders
}
```

### **2.2 Bills Management Service:**

```typescript
async createBillFromPurchaseOrder(
  purchaseOrderId: string,
  issuedBy: string,
  customDueDate?: string
): Promise<Bill> {

  const purchaseOrder = await this.getPurchaseOrderById(purchaseOrderId)
  if (!purchaseOrder) throw new Error('Purchase Order not found')

  // Calculate due date based on payment terms
  const dueDate = customDueDate || this.calculateDueDate(
    purchaseOrder.orderDate,
    purchaseOrder.paymentTerms
  )

  const bill: Bill = {
    id: `bill-${Date.now()}`,
    billNumber: `BILL-${purchaseOrder.orderNumber}`,
    purchaseOrderId,
    supplierId: purchaseOrder.supplierId,
    supplierName: purchaseOrder.supplierName,
    totalAmount: purchaseOrder.totalAmount,
    taxAmount: purchaseOrder.taxAmount,
    discountAmount: purchaseOrder.discountAmount,
    finalAmount: purchaseOrder.totalAmount, // TODO: calculate with tax/discount
    paymentTerms: purchaseOrder.paymentTerms,
    issueDate: new Date().toISOString(),
    dueDate,
    status: 'issued',
    paymentStatus: 'unpaid',
    issuedBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }

  this.bills.push(bill)

  // Update purchase order
  await this.updatePurchaseOrder(purchaseOrderId, {
    billId: bill.id,
    paymentStatus: 'pending'
  })

  return bill
}

async markBillAsPaid(
  billId: string,
  accountTransactionId: string
): Promise<void> {

  const bill = this.getBillById(billId)
  if (!bill) throw new Error('Bill not found')

  await this.updateBill(billId, {
    status: 'paid',
    paymentStatus: 'paid',
    paidAt: new Date().toISOString(),
    accountTransactionId
  })

  // Update purchase order payment status
  await this.updatePurchaseOrder(bill.purchaseOrderId, {
    paymentStatus: 'paid'
  })

  // Update supplier balance
  const supplier = await this.getSupplierById(bill.supplierId)
  if (supplier) {
    await this.updateSupplier(bill.supplierId, {
      currentBalance: supplier.currentBalance + bill.finalAmount,
      totalPaid: (supplier.totalPaid || 0) + bill.finalAmount
    })
  }
}
```

---

## 🎨 **Phase 3: Enhanced UI Components**

### **3.1 New Orders Tab Structure:**

```vue
<!-- NewOrdersTab.vue -->
<template>
  <div class="new-orders-tab">
    <!-- Step 1: Request Selection -->
    <request-selection-card
      v-model:selected="selectedRequestIds"
      :requests="pendingRequests"
      @consolidate="handleConsolidation"
    />

    <!-- Step 2: Consolidation Preview -->
    <consolidation-preview-card
      v-if="currentConsolidation"
      :consolidation="currentConsolidation"
      @create-orders="handleCreateOrders"
      @edit="handleEditConsolidation"
    />

    <!-- Step 3: Bills Management -->
    <bills-management-card
      :bills="unpaidBills"
      @create-bill="handleCreateBill"
      @pay-bill="handlePayBill"
    />

    <!-- Step 4: Workflow Overview -->
    <workflow-overview-card :statistics="workflowStatistics" />
  </div>
</template>
```

### **3.2 Enhanced Status Tracking:**

```vue
<!-- WorkflowStatusIndicator.vue -->
<template>
  <v-card class="workflow-status">
    <v-card-text>
      <v-stepper v-model="currentStep" :items="workflowSteps" hide-actions>
        <template #item.icon="{ item }">
          <v-icon :color="getStepColor(item)" :icon="getStepIcon(item)" />
        </template>
      </v-stepper>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
const workflowSteps = [
  { title: 'Request Created', value: 1, status: 'completed' },
  { title: 'Consolidated', value: 2, status: 'current' },
  { title: 'Order Created', value: 3, status: 'pending' },
  { title: 'Bill Issued', value: 4, status: 'pending' },
  { title: 'Payment Made', value: 5, status: 'pending' },
  { title: 'Delivered', value: 6, status: 'pending' }
]
</script>
```

---

## 📋 **Implementation Roadmap:**

### **Week 4 Day 1-2: Core Entities**

- [ ] Add Bill and Consolidation types
- [ ] Extend SupplierStore state
- [ ] Create mock data for testing

### **Week 4 Day 3-4: Service Methods**

- [ ] Implement consolidation logic
- [ ] Add bills management methods
- [ ] Create workflow status tracking

### **Week 4 Day 5-6: UI Components**

- [ ] Create NewOrdersTab
- [ ] Build consolidation components
- [ ] Add bills management interface

### **Week 4 Day 7: Integration & Polish**

- [ ] Connect all workflow steps
- [ ] Add status transitions
- [ ] Test complete workflow

---

## 🎯 **Success Metrics:**

✅ **Complete transparency:** Every step visible and trackable
✅ **No workflow gaps:** Smooth transition between all stages
✅ **Clear status:** Always know where each request/order stands
✅ **Financial integration:** Ready for AccountStore connection
