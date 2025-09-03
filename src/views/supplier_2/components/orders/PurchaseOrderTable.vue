<!-- src/views/supplier_2/components/orders/PurchaseOrderTable.vue -->
<template>
  <div class="purchase-order-table">
    <!-- Filters Bar -->
    <v-card variant="outlined" class="mb-4">
      <v-card-text class="pa-4">
        <v-row align="center">
          <v-col cols="12" md="2">
            <v-select
              v-model="filters.status"
              :items="statusOptions"
              label="Order Status"
              variant="outlined"
              density="compact"
              clearable
              @update:model-value="updateFilters"
            />
          </v-col>

          <v-col cols="12" md="2">
            <v-select
              v-model="filters.billStatus"
              :items="billStatusOptions"
              label="Bill Status"
              variant="outlined"
              density="compact"
              clearable
              @update:model-value="updateFilters"
            />
          </v-col>

          <v-col cols="12" md="3">
            <v-select
              v-model="filters.supplier"
              :items="supplierOptions"
              label="Supplier"
              variant="outlined"
              density="compact"
              clearable
              @update:model-value="updateFilters"
            />
          </v-col>

          <v-col cols="12" md="2">
            <v-text-field
              v-model="searchQuery"
              label="Search orders..."
              variant="outlined"
              density="compact"
              prepend-inner-icon="mdi-magnify"
              clearable
              @update:model-value="handleSearch"
            />
          </v-col>

          <v-col cols="12" md="3">
            <div class="d-flex gap-2">
              <v-btn
                color="grey"
                variant="outlined"
                prepend-icon="mdi-filter-off"
                size="small"
                @click="clearFilters"
              >
                Clear Filters
              </v-btn>

              <v-btn
                color="primary"
                variant="flat"
                prepend-icon="mdi-refresh"
                size="small"
                :loading="loading"
                @click="refreshData"
              >
                Refresh
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Data Table -->
    <v-data-table
      :headers="headers"
      :items="filteredOrders"
      :loading="loading"
      class="elevation-1"
      :items-per-page="25"
      :sort-by="[{ key: 'orderDate', order: 'desc' }]"
    >
      <!-- Order Number -->
      <template #[`item.orderNumber`]="{ item }">
        <div class="d-flex align-center">
          <v-chip size="small" :color="getStatusColor(item.status)" variant="tonal" class="mr-2">
            {{ item.orderNumber }}
          </v-chip>

          <!-- Overdue indicator -->
          <v-icon
            v-if="isOverdueForDelivery(item)"
            icon="mdi-clock-alert"
            color="error"
            size="16"
            class="ml-1"
          >
            <v-tooltip activator="parent" location="top">Overdue for delivery</v-tooltip>
          </v-icon>
        </div>
      </template>

      <!-- Supplier -->
      <template #[`item.supplierName`]="{ item }">
        <div class="text-subtitle-2 font-weight-medium">
          {{ item.supplierName }}
        </div>
      </template>

      <!-- Order Status -->
      <template #[`item.status`]="{ item }">
        <v-chip size="small" :color="getStatusColor(item.status)" variant="tonal">
          <v-icon :icon="getStatusIcon(item.status)" size="14" class="mr-1" />
          {{ getStatusText(item.status) }}
        </v-chip>
      </template>

      <!-- Bill Status -->
      <template #[`item.billStatus`]="{ item }">
        <bill-status
          :bill="getBillForOrder(item)"
          :order-amount="item.totalAmount"
          :has-shortfall="item.hasShortfall"
          @show-sync-warning="handleSyncWarning(item)"
          @show-shortfall="handleShortfall(item)"
        />
      </template>

      <!-- Items Count -->
      <template #[`item.itemsCount`]="{ item }">
        <div class="text-center">
          <v-chip size="small" variant="outlined">{{ item.items.length }} items</v-chip>
        </div>
      </template>

      <!-- Total Amount -->
      <template #[`item.totalAmount`]="{ item }">
        <div class="text-right">
          <div class="font-weight-bold">
            {{ formatCurrency(item.totalAmount) }}
          </div>
          <div v-if="item.isEstimatedTotal" class="text-caption text-warning">Estimated</div>
        </div>
      </template>

      <!-- Order Date -->
      <template #[`item.orderDate`]="{ item }">
        <div class="text-body-2">
          {{ formatDate(item.orderDate) }}
        </div>
        <div v-if="item.expectedDeliveryDate" class="text-caption text-medium-emphasis">
          Expected: {{ formatDate(item.expectedDeliveryDate) }}
        </div>
      </template>

      <!-- Age -->
      <template #[`item.age`]="{ item }">
        <v-chip size="small" :color="getAgeColor(getOrderAge(item))" variant="tonal">
          {{ getOrderAge(item) }}d
        </v-chip>
      </template>

      <!-- Actions -->
      <template #[`item.actions`]="{ item }">
        <div class="d-flex align-center justify-center gap-1">
          <!-- View Details -->
          <v-tooltip location="top">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                icon
                variant="text"
                size="small"
                color="info"
                @click="viewOrderDetails(item)"
              >
                <v-icon>mdi-eye</v-icon>
              </v-btn>
            </template>
            <span>View Details</span>
          </v-tooltip>

          <!-- Edit (только для draft/sent) -->
          <v-tooltip v-if="canEditOrder(item)" location="top">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                icon
                variant="text"
                size="small"
                color="primary"
                @click="editOrder(item)"
              >
                <v-icon>mdi-pencil</v-icon>
              </v-btn>
            </template>
            <span>Edit Order</span>
          </v-tooltip>

          <!-- Send (только для draft) -->
          <v-tooltip v-if="canSendOrder(item)" location="top">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                icon
                variant="text"
                size="small"
                color="success"
                @click="sendOrder(item)"
              >
                <v-icon>mdi-send</v-icon>
              </v-btn>
            </template>
            <span>Send to Supplier</span>
          </v-tooltip>

          <!-- Start Receipt (только для confirmed/paid) -->
          <v-tooltip v-if="canStartReceipt(item)" location="top">
            <template #activator="{ props: tooltipProps }">
              <v-btn
                v-bind="tooltipProps"
                icon
                variant="text"
                size="small"
                color="purple"
                @click="startReceipt(item)"
              >
                <v-icon>mdi-truck-check</v-icon>
              </v-btn>
            </template>
            <span>Start Receipt</span>
          </v-tooltip>

          <!-- More Actions Menu -->
          <v-menu>
            <template #activator="{ props: menuProps }">
              <v-btn v-bind="menuProps" icon variant="text" size="small" color="grey">
                <v-icon>mdi-dots-vertical</v-icon>
              </v-btn>
            </template>

            <v-list density="compact" min-width="160">
              <v-list-item
                v-if="canDeleteOrder(item)"
                prepend-icon="mdi-delete"
                title="Delete"
                @click="deleteOrder(item)"
              />

              <v-list-item
                v-if="item.status !== 'cancelled'"
                prepend-icon="mdi-cancel"
                title="Cancel"
                @click="cancelOrder(item)"
              />

              <v-list-item
                prepend-icon="mdi-content-copy"
                title="Duplicate"
                @click="duplicateOrder(item)"
              />

              <v-list-item
                prepend-icon="mdi-download"
                title="Export PDF"
                @click="exportOrder(item)"
              />
            </v-list>
          </v-menu>
        </div>
      </template>

      <!-- Loading state -->
      <template #loading>
        <v-skeleton-loader type="table-row@10" />
      </template>

      <!-- No data state -->
      <template #no-data>
        <div class="text-center pa-4">
          <v-icon icon="mdi-package-variant-closed" size="48" color="grey" class="mb-2" />
          <div class="text-body-1 text-medium-emphasis">No purchase orders found</div>
          <div class="text-body-2 text-medium-emphasis">
            Try adjusting your filters or create orders from requests
          </div>
        </div>
      </template>
    </v-data-table>

    <!-- Order Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="1200px">
      <v-card v-if="selectedOrder">
        <v-card-title class="d-flex align-center justify-space-between pa-4 bg-primary text-white">
          <div>
            <div class="text-h6">{{ selectedOrder.orderNumber }}</div>
            <div class="text-caption opacity-90">Purchase Order Details</div>
          </div>
          <v-btn icon="mdi-close" variant="text" color="white" @click="showDetailsDialog = false" />
        </v-card-title>

        <v-card-text class="pa-0">
          <!-- Order Summary -->
          <div class="pa-4 border-b">
            <v-row>
              <v-col cols="6" md="3">
                <div class="text-subtitle-2 mb-1">Supplier</div>
                <div class="text-body-1 font-weight-bold">{{ selectedOrder.supplierName }}</div>
              </v-col>

              <v-col cols="6" md="3">
                <div class="text-subtitle-2 mb-1">Status</div>
                <v-chip size="small" :color="getStatusColor(selectedOrder.status)" variant="flat">
                  {{ getStatusText(selectedOrder.status) }}
                </v-chip>
              </v-col>

              <v-col cols="6" md="3">
                <div class="text-subtitle-2 mb-1">Total Amount</div>
                <div class="text-h6 font-weight-bold">
                  {{ formatCurrency(selectedOrder.totalAmount) }}
                </div>
                <div v-if="selectedOrder.isEstimatedTotal" class="text-caption text-warning">
                  Estimated Total
                </div>
              </v-col>

              <v-col cols="6" md="3">
                <div class="text-subtitle-2 mb-1">Order Date</div>
                <div class="text-body-2">{{ formatDate(selectedOrder.orderDate) }}</div>
              </v-col>

              <v-col cols="6" md="3">
                <div class="text-subtitle-2 mb-1">Expected Delivery</div>
                <div class="text-body-2">
                  {{
                    selectedOrder.expectedDeliveryDate
                      ? formatDate(selectedOrder.expectedDeliveryDate)
                      : 'Not set'
                  }}
                </div>
              </v-col>

              <v-col cols="6" md="3">
                <div class="text-subtitle-2 mb-1">Related Requests</div>
                <div class="d-flex flex-wrap gap-1">
                  <v-chip
                    v-for="requestId in selectedOrder.requestIds"
                    :key="requestId"
                    size="x-small"
                    variant="outlined"
                  >
                    {{ getRequestNumber(requestId) }}
                  </v-chip>
                </div>
              </v-col>

              <v-col cols="12">
                <div class="text-subtitle-2 mb-1">Notes</div>
                <div class="text-body-2">{{ selectedOrder.notes || 'No notes' }}</div>
              </v-col>

              <!-- Enhanced Payment Management Section -->
              <v-col cols="12">
                <div class="text-subtitle-2 mb-3">
                  <v-icon icon="mdi-credit-card-outline" class="mr-2" />
                  Payment Management
                </div>

                <!-- If no bills -->
                <div v-if="!orderBills || orderBills.length === 0" class="no-bills-section">
                  <v-card variant="outlined" class="pa-3">
                    <div class="d-flex justify-space-between align-center">
                      <div>
                        <div class="text-body-2 text-medium-emphasis">No bills created</div>
                        <div class="text-caption text-medium-emphasis">
                          Create or attach a bill to manage payments
                        </div>
                      </div>
                      <v-btn
                        color="primary"
                        variant="outlined"
                        size="small"
                        prepend-icon="mdi-plus"
                        @click="createBillForOrder(selectedOrder)"
                      >
                        Create Bill
                      </v-btn>
                    </div>
                  </v-card>
                </div>

                <!-- If bills exist -->
                <div v-else class="bills-section">
                  <!-- Payment Summary -->
                  <v-card variant="tonal" class="payment-summary pa-3 mb-3">
                    <v-row dense>
                      <v-col cols="6" md="3">
                        <div class="text-caption text-medium-emphasis">Bills</div>
                        <div class="text-subtitle-1 font-weight-bold">{{ orderBills.length }}</div>
                      </v-col>
                      <v-col cols="6" md="3">
                        <div class="text-caption text-medium-emphasis">Total Billed</div>
                        <div class="text-subtitle-1 font-weight-bold">
                          {{ formatCurrency(totalBilledAmount) }}
                        </div>
                      </v-col>
                      <v-col cols="6" md="3">
                        <div class="text-caption text-medium-emphasis">Order Amount</div>
                        <div class="text-subtitle-1" :class="amountDifferenceClass">
                          {{ formatCurrency(selectedOrder.totalAmount) }}
                        </div>
                      </v-col>
                      <v-col cols="6" md="3">
                        <div class="text-caption text-medium-emphasis">Payment Status</div>
                        <v-chip
                          :color="getPaymentStatusColor(paymentStatus)"
                          size="small"
                          variant="flat"
                        >
                          {{ getPaymentStatusText(paymentStatus) }}
                        </v-chip>
                      </v-col>
                    </v-row>

                    <!-- Amount mismatch warning -->
                    <v-alert
                      v-if="hasAmountMismatch"
                      :type="amountDifference > 0 ? 'warning' : 'error'"
                      variant="tonal"
                      density="compact"
                      class="mt-3"
                    >
                      <div class="d-flex align-center">
                        <v-icon
                          :icon="amountDifference > 0 ? 'mdi-alert-circle' : 'mdi-alert'"
                          class="mr-2"
                        />
                        <span class="text-caption">
                          Amount mismatch: {{ formatCurrency(Math.abs(amountDifference)) }}
                          {{ amountDifference > 0 ? 'over-billed' : 'under-billed' }}
                        </span>
                      </div>
                    </v-alert>
                  </v-card>

                  <!-- Detailed Bills List -->
                  <v-card variant="outlined">
                    <v-card-title class="d-flex justify-space-between align-center pa-3">
                      <span class="text-subtitle-1">
                        Associated Bills ({{ orderBills.length }})
                      </span>
                      <div class="d-flex gap-2">
                        <v-btn
                          color="primary"
                          variant="text"
                          size="small"
                          prepend-icon="mdi-link"
                          @click="attachExistingBill(selectedOrder)"
                        >
                          Attach Bill
                        </v-btn>
                        <v-btn
                          color="primary"
                          variant="text"
                          size="small"
                          prepend-icon="mdi-plus"
                          @click="createBillForOrder(selectedOrder)"
                        >
                          Create New
                        </v-btn>
                      </div>
                    </v-card-title>

                    <v-divider />

                    <v-card-text class="pa-0">
                      <div v-for="(bill, index) in orderBills" :key="bill.id" class="bill-item">
                        <div class="pa-3" :class="{ 'border-b': index < orderBills.length - 1 }">
                          <div class="d-flex justify-space-between align-center">
                            <!-- Bill Information -->
                            <div class="bill-info flex-grow-1">
                              <div class="d-flex align-center mb-1">
                                <v-chip
                                  :color="getStatusColor(bill.status)"
                                  size="x-small"
                                  variant="flat"
                                  class="mr-2"
                                >
                                  {{ getStatusText(bill.status) }}
                                </v-chip>
                                <div class="text-body-1 font-weight-medium">
                                  {{ bill.description }}
                                </div>
                              </div>

                              <div class="text-caption text-medium-emphasis mb-1">
                                ID: {{ bill.id.slice(-8) }} | Invoice:
                                {{ bill.invoiceNumber || 'N/A' }} | Priority: {{ bill.priority }}
                              </div>

                              <div v-if="bill.dueDate" class="text-caption text-medium-emphasis">
                                Due: {{ formatDate(bill.dueDate) }}
                                <span
                                  v-if="isOverdue(bill.dueDate)"
                                  class="text-error font-weight-bold ml-1"
                                >
                                  (OVERDUE)
                                </span>
                              </div>
                            </div>

                            <!-- Amount -->
                            <div class="bill-amount text-right mr-3">
                              <div class="text-h6 font-weight-bold">
                                {{ formatCurrency(bill.amount) }}
                              </div>
                              <div
                                v-if="bill.lastAmountUpdate"
                                class="text-caption text-medium-emphasis"
                              >
                                Updated: {{ formatDate(bill.lastAmountUpdate) }}
                              </div>
                            </div>

                            <!-- Actions -->
                            <div class="bill-actions d-flex gap-1">
                              <v-tooltip text="View Bill Details">
                                <template #activator="{ props: tooltipProps }">
                                  <v-btn
                                    v-bind="tooltipProps"
                                    icon="mdi-eye"
                                    variant="text"
                                    size="small"
                                    color="info"
                                    @click="viewBill(bill.id)"
                                  />
                                </template>
                              </v-tooltip>

                              <v-tooltip text="Process Payment">
                                <template #activator="{ props: tooltipProps }">
                                  <v-btn
                                    v-if="bill.status === 'pending'"
                                    v-bind="tooltipProps"
                                    icon="mdi-credit-card"
                                    variant="text"
                                    size="small"
                                    color="success"
                                    @click="processPayment(bill.id)"
                                  />
                                </template>
                              </v-tooltip>

                              <v-tooltip text="Detach from Order">
                                <template #activator="{ props: tooltipProps }">
                                  <v-btn
                                    v-if="bill.status === 'pending'"
                                    v-bind="tooltipProps"
                                    icon="mdi-link-off"
                                    variant="text"
                                    size="small"
                                    color="warning"
                                    @click="detachBillFromOrder(bill.id)"
                                  />
                                </template>
                              </v-tooltip>

                              <v-menu>
                                <template #activator="{ props: menuProps }">
                                  <v-btn
                                    v-bind="menuProps"
                                    icon="mdi-dots-vertical"
                                    variant="text"
                                    size="small"
                                    color="grey"
                                  />
                                </template>

                                <v-list density="compact">
                                  <v-list-item
                                    prepend-icon="mdi-pencil"
                                    title="Edit Amount"
                                    @click="editBillAmount(bill)"
                                  />
                                  <v-list-item
                                    v-if="bill.status === 'pending'"
                                    prepend-icon="mdi-cancel"
                                    title="Cancel Bill"
                                    @click="cancelBill(bill.id)"
                                  />
                                </v-list>
                              </v-menu>
                            </div>
                          </div>

                          <!-- Amount History (collapsible) -->
                          <div
                            v-if="bill.amountHistory?.length && showBillHistory[bill.id]"
                            class="mt-2"
                          >
                            <v-divider class="mb-2" />
                            <div class="text-caption text-medium-emphasis mb-1">
                              Amount History:
                            </div>
                            <div class="history-items">
                              <div
                                v-for="change in bill.amountHistory.slice(-3)"
                                :key="change.timestamp"
                                class="d-flex justify-space-between text-caption py-1"
                              >
                                <span>{{ change.reason }}</span>
                                <span>
                                  {{ formatCurrency(change.oldAmount) }} →
                                  {{ formatCurrency(change.newAmount) }}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </v-card-text>
                  </v-card>
                </div>
              </v-col>
            </v-row>
          </div>

          <!-- Items List -->
          <div class="pa-4">
            <div class="text-subtitle-1 font-weight-bold mb-3">
              Order Items ({{ selectedOrder.items.length }})
            </div>

            <v-data-table
              :headers="itemHeaders"
              :items="selectedOrder.items"
              density="compact"
              :items-per-page="-1"
              hide-default-footer
            >
              <template #[`item.pricePerUnit`]="{ item }">
                <div class="text-right">
                  {{ formatCurrency(item.pricePerUnit) }}
                  <div v-if="item.isEstimatedPrice" class="text-caption text-warning">
                    Est. ({{ formatDate(item.lastPriceDate || '') }})
                  </div>
                </div>
              </template>

              <template #[`item.totalPrice`]="{ item }">
                <div class="text-right font-weight-bold">
                  {{ formatCurrency(item.totalPrice) }}
                </div>
              </template>

              <template #[`item.status`]="{ item }">
                <v-chip size="x-small" :color="getItemStatusColor(item.status)" variant="tonal">
                  {{ item.status }}
                </v-chip>
              </template>
            </v-data-table>

            <!-- Order Total -->
            <div class="d-flex justify-end mt-4 pa-3 bg-surface rounded">
              <div>
                <div class="text-body-2 text-medium-emphasis mb-1">Order Total:</div>
                <div class="text-h6 font-weight-bold">
                  {{ formatCurrency(selectedOrder.totalAmount) }}
                </div>
              </div>
            </div>
          </div>
        </v-card-text>

        <!-- Dialog Actions -->
        <v-card-actions class="pa-4 border-t">
          <v-spacer />

          <v-btn
            v-if="canSendOrder(selectedOrder)"
            color="success"
            variant="flat"
            prepend-icon="mdi-send"
            @click="sendOrder(selectedOrder)"
          >
            Send to Supplier
          </v-btn>

          <v-btn
            v-if="canStartReceipt(selectedOrder)"
            color="purple"
            variant="flat"
            prepend-icon="mdi-truck-check"
            @click="startReceipt(selectedOrder)"
          >
            Start Receipt
          </v-btn>

          <v-btn color="grey" variant="outlined" @click="showDetailsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { usePurchaseOrders } from '@/stores/supplier_2/composables/usePurchaseOrders'
import type { PurchaseOrder, OrderFilters } from '@/stores/supplier_2/types'
import type { PendingPayment } from '@/stores/account/types'
import BillStatus from './BillStatus.vue'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  orders: PurchaseOrder[]
  loading: boolean
}

interface Emits {
  (e: 'edit-order', order: PurchaseOrder): void
  (e: 'send-order', order: PurchaseOrder): void
  (e: 'start-receipt', order: PurchaseOrder): void
  (e: 'manage-bill', order: PurchaseOrder): void
  (e: 'show-shortfall', order: PurchaseOrder): void
  (e: 'view-bill', billId: string): void
  (e: 'process-payment', billId: string): void
  (e: 'detach-bill', billId: string): void
  (e: 'edit-bill', billId: string): void
  (e: 'cancel-bill', billId: string): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// COMPOSABLES
// =============================================

const {
  filters,
  updateFilters,
  clearFilters,
  formatCurrency,
  getStatusColor,
  canEditOrder,
  canDeleteOrder,
  canSendOrder,
  canReceiveOrder,
  isReadyForReceipt,
  getOrderAge,
  isOverdueForDelivery
} = usePurchaseOrders()

// =============================================
// LOCAL STATE
// =============================================

const showDetailsDialog = ref(false)
const selectedOrder = ref<PurchaseOrder | null>(null)
const searchQuery = ref('')

// New state for bill management
const orderBills = ref<PendingPayment[]>([])
const showBillHistory = ref<Record<string, boolean>>({})

// =============================================
// TABLE CONFIGURATION
// =============================================

const headers = [
  { title: 'Order #', key: 'orderNumber', sortable: true, width: '140px' },
  { title: 'Supplier', key: 'supplierName', sortable: true, width: '180px' },
  { title: 'Status', key: 'status', sortable: true, width: '120px' },
  { title: 'Bill Status', key: 'billStatus', sortable: false, width: '220px' },
  { title: 'Items', key: 'itemsCount', sortable: false, width: '80px', align: 'center' },
  { title: 'Total', key: 'totalAmount', sortable: true, width: '120px', align: 'end' },
  { title: 'Order Date', key: 'orderDate', sortable: true, width: '140px' },
  { title: 'Age', key: 'age', sortable: false, width: '80px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '200px', align: 'center' }
]

const itemHeaders = [
  { title: 'Item', key: 'itemName', sortable: false },
  { title: 'Qty Ordered', key: 'orderedQuantity', sortable: false, width: '100px', align: 'end' },
  { title: 'Qty Received', key: 'receivedQuantity', sortable: false, width: '100px', align: 'end' },
  { title: 'Unit', key: 'unit', sortable: false, width: '80px' },
  { title: 'Price/Unit', key: 'pricePerUnit', sortable: false, width: '120px', align: 'end' },
  { title: 'Total', key: 'totalPrice', sortable: false, width: '120px', align: 'end' },
  { title: 'Status', key: 'status', sortable: false, width: '100px' }
]

// =============================================
// FILTER OPTIONS
// =============================================

const statusOptions = [
  { title: 'All Statuses', value: 'all' },
  { title: 'Draft', value: 'draft' },
  { title: 'Sent', value: 'sent' },
  { title: 'Delivered', value: 'delivered' },
  { title: 'Cancelled', value: 'cancelled' }
]

const billStatusOptions = [
  { title: 'All Bill Statuses', value: 'all' },
  { title: 'No Bill', value: 'no_bill' },
  { title: 'Pending', value: 'pending' },
  { title: 'Partial', value: 'processing' },
  { title: 'Paid', value: 'completed' }
]

const supplierOptions = computed(() => {
  const suppliers = new Set(props.orders?.map(order => order.supplierName) || [])
  return [
    { title: 'All Suppliers', value: 'all' },
    ...Array.from(suppliers).map(supplier => ({ title: supplier, value: supplier }))
  ]
})

// =============================================
// COMPUTED PROPERTIES
// =============================================

const filteredOrders = computed(() => {
  let filtered = props.orders || []

  // Apply filters
  if (filters.value.status && filters.value.status !== 'all') {
    filtered = filtered.filter(order => order.status === filters.value.status)
  }

  // Bill status filtering
  if (filters.value.billStatus && filters.value.billStatus !== 'all') {
    filtered = filtered.filter(order => {
      const bill = getBillForOrder(order)
      if (filters.value.billStatus === 'no_bill') {
        return !bill
      }
      return bill?.status === filters.value.billStatus
    })
  }

  if (filters.value.supplier && filters.value.supplier !== 'all') {
    filtered = filtered.filter(order => order.supplierName === filters.value.supplier)
  }

  // Apply search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(
      order =>
        order.orderNumber.toLowerCase().includes(query) ||
        order.supplierName.toLowerCase().includes(query) ||
        order.notes?.toLowerCase().includes(query)
    )
  }

  return filtered
})

// =============================================
// COMPUTED PROPERTIES FOR BILL MANAGEMENT
// =============================================

const totalBilledAmount = computed(() =>
  orderBills.value.reduce((sum, bill) => sum + bill.amount, 0)
)

const amountDifference = computed(
  () => totalBilledAmount.value - (selectedOrder.value?.totalAmount || 0)
)

const hasAmountMismatch = computed(() => Math.abs(amountDifference.value) > 1)

const amountDifferenceClass = computed(() => {
  if (!hasAmountMismatch.value) return ''
  return amountDifference.value > 0 ? 'text-warning' : 'text-error'
})

const paymentStatus = computed(() => {
  if (!orderBills.value.length) return 'not_billed'

  const completedBills = orderBills.value.filter(bill => bill.status === 'completed')
  const totalPaid = completedBills.reduce((sum, bill) => sum + bill.amount, 0)
  const totalBilled = totalBilledAmount.value

  if (totalPaid === 0) return 'pending'
  if (totalPaid < totalBilled) return 'partial'
  return 'paid'
})

// =============================================
// METHODS
// =============================================

function refreshData() {
  console.log('Refreshing purchase orders data')
}

function handleSearch() {
  // Search is handled by computed property
}

function viewOrderDetails(order: PurchaseOrder) {
  selectedOrder.value = order
  showDetailsDialog.value = true
}

function editOrder(order: PurchaseOrder) {
  emits('edit-order', order)
}

function sendOrder(order: PurchaseOrder) {
  emits('send-order', order)
  showDetailsDialog.value = false
}

function startReceipt(order: PurchaseOrder) {
  emits('start-receipt', order)
  showDetailsDialog.value = false
}

function duplicateOrder(order: PurchaseOrder) {
  console.log('Duplicate order:', order.id)
}

function exportOrder(order: PurchaseOrder) {
  console.log('Export order:', order.id)
}

function viewBill(billId: string) {
  console.log('View bill:', billId)
  emits('view-bill', billId)
}

function canStartReceipt(order: PurchaseOrder): boolean {
  return canReceiveOrder(order) && isReadyForReceipt(order)
}

function deleteOrder(order: PurchaseOrder) {
  console.log('Delete order:', order.id)
  // TODO: Implement delete functionality
}

function cancelOrder(order: PurchaseOrder) {
  console.log('Cancel order:', order.id)
  // TODO: Implement cancel functionality
}

// =============================================
// BILL MANAGEMENT METHODS
// =============================================

/**
 * Load bills for the current order
 */
async function loadOrderBills(order: PurchaseOrder) {
  if (!order) {
    orderBills.value = []
    return
  }

  try {
    const { supplierAccountIntegration } = await import(
      '@/stores/supplier_2/integrations/accountIntegration'
    )
    orderBills.value = await supplierAccountIntegration.getBillsForOrder(order.id)

    console.log(`Loaded ${orderBills.value.length} bills for order ${order.orderNumber}`)
  } catch (error) {
    console.error('Failed to load order bills:', error)
    orderBills.value = []
  }
}

/**
 * Get bill for order (temporary stub)
 */
function getBillForOrder(order: PurchaseOrder) {
  if (!order.billId) return null

  // Mock data for demonstration
  return {
    id: order.billId,
    amount: order.totalAmount || 0,
    paidAmount: 0,
    status: 'pending'
  }
}

/**
 * Handle sync warning
 */
function handleSyncWarning(order: PurchaseOrder): void {
  emits('manage-bill', order)
}

/**
 * Handle shortfall
 */
function handleShortfall(order: PurchaseOrder): void {
  emits('show-shortfall', order)
}

/**
 * Create bill for order
 */
function createBillForOrder(order: PurchaseOrder) {
  console.log('Creating bill for order:', order.orderNumber)
  emits('manage-bill', order)
}

/**
 * Attach existing bill to order
 */
function attachExistingBill(order: PurchaseOrder) {
  console.log('Attaching existing bill to order:', order.orderNumber)
  emits('manage-bill', order)
}

/**
 * Process payment for bill
 */
function processPayment(billId: string) {
  console.log('Processing payment for bill:', billId)
  emits('process-payment', billId)
}

/**
 * Detach bill from order
 */
function detachBillFromOrder(billId: string) {
  console.log('Detaching bill from order:', billId)
  emits('detach-bill', billId)
}

/**
 * Edit bill amount
 */
function editBillAmount(bill: PendingPayment) {
  console.log('Editing bill amount:', bill.id)
  emits('edit-bill', bill.id)
}

/**
 * Cancel bill
 */
function cancelBill(billId: string) {
  console.log('Cancelling bill:', billId)
  emits('cancel-bill', billId)
}

/**
 * Toggle bill history display
 */
function toggleBillHistory(billId: string) {
  showBillHistory.value[billId] = !showBillHistory.value[billId]
}

/**
 * Check if bill is overdue
 */
function isOverdue(dueDate: string): boolean {
  return new Date(dueDate) < new Date()
}

// =============================================
// HELPER FUNCTIONS
// =============================================

function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    pending: 'Pending',
    processing: 'Processing',
    completed: 'Completed'
  }
  return statusMap[status] || status
}

function getStatusIcon(status: string): string {
  const iconMap: Record<string, string> = {
    draft: 'mdi-file-edit',
    sent: 'mdi-send',
    delivered: 'mdi-truck-check',
    cancelled: 'mdi-cancel'
  }
  return iconMap[status] || 'mdi-help-circle'
}

function getItemStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    ordered: 'blue',
    received: 'green',
    cancelled: 'red'
  }
  return colorMap[status] || 'grey'
}

function getAgeColor(days: number): string {
  if (days <= 1) return 'green'
  if (days <= 3) return 'orange'
  return 'red'
}

function getRequestNumber(requestId: string): string {
  // Mock function - in real app, would get from store
  return `REQ-${requestId.slice(-3)}`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getPaymentStatusColor(status: string): string {
  switch (status) {
    case 'not_billed':
      return 'grey'
    case 'pending':
      return 'warning'
    case 'partial':
      return 'info'
    case 'paid':
      return 'success'
    default:
      return 'grey'
  }
}

function getPaymentStatusText(status: string): string {
  switch (status) {
    case 'not_billed':
      return 'Not Billed'
    case 'pending':
      return 'Pending Payment'
    case 'partial':
      return 'Partially Paid'
    case 'paid':
      return 'Fully Paid'
    default:
      return status
  }
}

// =============================================
// WATCHERS
// =============================================

// Load bills when order details dialog opens
watch(
  () => selectedOrder.value,
  order => {
    if (order) {
      loadOrderBills(order)
    } else {
      orderBills.value = []
    }
  },
  { immediate: true }
)
</script>

<style lang="scss" scoped>
.purchase-order-table {
  .v-data-table {
    border-radius: 8px;
  }
}

.bills-section {
  border: 1px solid rgb(var(--v-theme-outline-variant));
  border-radius: 8px;
  overflow: hidden;
}

.payment-summary {
  background: rgb(var(--v-theme-surface-variant));
}

.bill-item:not(:last-child) {
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
}

.bill-info {
  min-width: 0; /* Allows text to shrink */
}

.bill-actions {
  flex-shrink: 0;
}

.history-items {
  max-height: 120px;
  overflow-y: auto;
  background: rgb(var(--v-theme-surface));
  border-radius: 4px;
  padding: 8px;
}

.border-b {
  border-bottom: 1px solid rgb(var(--v-theme-surface-variant));
}

.border-t {
  border-top: 1px solid rgb(var(--v-theme-surface-variant));
}

.gap-1 {
  gap: 4px;
}

.gap-2 {
  gap: 8px;
}

.text-medium-emphasis {
  opacity: 0.7;
}

// Status chip animations
.v-chip {
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
  }
}

// Row hover effects
.v-data-table :deep(.v-data-table__tr:hover) {
  background-color: rgb(var(--v-theme-surface-variant), 0.1);
}

// Overdue highlighting
.v-icon.text-error {
  animation: blinkWarning 2s infinite;
}

@keyframes blinkWarning {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0.5;
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .v-data-table {
    :deep(.v-data-table__th),
    :deep(.v-data-table__td) {
      padding: 8px 4px;
      font-size: 0.8rem;
    }
  }

  .payment-summary .v-row {
    text-align: center;
  }

  .bill-item {
    flex-direction: column;
    align-items: stretch !important;
  }

  .bill-actions {
    justify-content: center;
    margin-top: 8px;
  }
}
</style>
