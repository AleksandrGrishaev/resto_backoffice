<!-- src/views/supplier/components/consolidation/ConsolidationPreviewCard.vue -->
<template>
  <v-card class="consolidation-preview-card">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon icon="mdi-merge" color="success" class="mr-2" />
        <div>
          <h4>Consolidation Preview</h4>
          <div class="text-caption text-medium-emphasis">
            Review consolidated requests before creating purchase orders
          </div>
        </div>
      </div>
      <div class="d-flex align-center gap-2">
        <v-chip
          :color="getConsolidationStatusColor(consolidation.status)"
          size="small"
          variant="flat"
        >
          <v-icon :icon="getStatusIcon(consolidation.status)" size="12" class="mr-1" />
          {{ getConsolidationStatusName(consolidation.status) }}
        </v-chip>
        <v-menu>
          <template #activator="{ props }">
            <v-btn icon="mdi-dots-vertical" variant="text" size="small" v-bind="props" />
          </template>
          <v-list density="compact">
            <v-list-item @click="exportConsolidation">
              <v-list-item-title>
                <v-icon icon="mdi-download" class="mr-2" />
                Export Preview
              </v-list-item-title>
            </v-list-item>
            <v-list-item @click="editConsolidation">
              <v-list-item-title>
                <v-icon icon="mdi-pencil" class="mr-2" />
                Edit Consolidation
              </v-list-item-title>
            </v-list-item>
            <v-divider />
            <v-list-item class="text-error" @click="cancelConsolidation">
              <v-list-item-title>
                <v-icon icon="mdi-cancel" class="mr-2" />
                Cancel Consolidation
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </v-card-title>

    <v-divider />

    <!-- Consolidation Summary -->
    <v-card-text class="pa-4">
      <v-row class="mb-4">
        <v-col cols="12" md="3">
          <v-card variant="tonal" color="info">
            <v-card-text class="text-center pa-3">
              <div class="text-h6 font-weight-bold">{{ consolidation.consolidationNumber }}</div>
              <div class="text-caption">Consolidation ID</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card variant="tonal" color="primary">
            <v-card-text class="text-center pa-3">
              <div class="text-h6 font-weight-bold">
                {{ consolidation.sourceRequestIds.length }}
              </div>
              <div class="text-caption">Source Requests</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card variant="tonal" color="success">
            <v-card-text class="text-center pa-3">
              <div class="text-h6 font-weight-bold">{{ consolidation.supplierGroups.length }}</div>
              <div class="text-caption">Purchase Orders</div>
            </v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="3">
          <v-card variant="tonal" color="warning">
            <v-card-text class="text-center pa-3">
              <div class="text-h6 font-weight-bold">
                {{ formatCurrency(consolidation.totalEstimatedValue) }}
              </div>
              <div class="text-caption">Estimated Total</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Consolidation Details -->
      <v-row class="mb-4">
        <v-col cols="12" md="6">
          <div class="detail-item">
            <div class="text-caption text-medium-emphasis">Created</div>
            <div class="font-weight-medium">
              {{ formatDateTime(consolidation.consolidationDate) }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ getRelativeTime(consolidation.consolidationDate) }}
            </div>
          </div>
        </v-col>
        <v-col cols="12" md="6">
          <div class="detail-item">
            <div class="text-caption text-medium-emphasis">Consolidated By</div>
            <div class="font-weight-medium">{{ consolidation.consolidatedBy }}</div>
          </div>
        </v-col>
        <v-col cols="12" md="6">
          <div class="detail-item">
            <div class="text-caption text-medium-emphasis">Departments</div>
            <div class="d-flex gap-1">
              <v-chip
                v-for="dept in consolidation.departments"
                :key="dept"
                size="small"
                variant="tonal"
                :color="getDepartmentColor(dept)"
              >
                {{ getDepartmentIcon(dept) }} {{ dept.charAt(0).toUpperCase() + dept.slice(1) }}
              </v-chip>
            </div>
          </div>
        </v-col>
        <v-col cols="12" md="6">
          <div class="detail-item">
            <div class="text-caption text-medium-emphasis">Total Items</div>
            <div class="font-weight-medium">{{ getTotalItemsCount() }} consolidated items</div>
          </div>
        </v-col>
      </v-row>

      <!-- Source Requests -->
      <div class="mb-6">
        <div class="d-flex align-center mb-3">
          <v-icon icon="mdi-clipboard-list" color="primary" class="mr-2" />
          <h5>Source Requests</h5>
          <v-spacer />
          <v-btn
            size="small"
            variant="outlined"
            prepend-icon="mdi-eye"
            @click="showSourceRequests = !showSourceRequests"
          >
            {{ showSourceRequests ? 'Hide' : 'Show' }} Details
          </v-btn>
        </div>

        <v-expand-transition>
          <div v-if="showSourceRequests">
            <v-row>
              <v-col
                v-for="requestId in consolidation.sourceRequestIds"
                :key="requestId"
                cols="12"
                md="6"
              >
                <v-card variant="outlined" class="source-request-card">
                  <v-card-text class="pa-3">
                    <div class="d-flex align-center justify-space-between mb-2">
                      <div class="font-weight-medium">{{ getRequestNumber(requestId) }}</div>
                      <v-chip
                        size="x-small"
                        :color="getDepartmentColor(getRequestDepartment(requestId))"
                        variant="flat"
                      >
                        {{ getDepartmentIcon(getRequestDepartment(requestId)) }}
                        {{ getRequestDepartment(requestId) }}
                      </v-chip>
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ getRequestItemsCount(requestId) }} items •
                      {{ getRequestBy(requestId) }}
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>
        </v-expand-transition>
      </div>

      <!-- Supplier Groups -->
      <div class="supplier-groups">
        <div class="d-flex align-center mb-4">
          <v-icon icon="mdi-store-multiple" color="success" class="mr-2" />
          <h5>Purchase Orders by Supplier</h5>
        </div>

        <div
          v-for="(group, index) in consolidation.supplierGroups"
          :key="group.supplierId"
          class="supplier-group mb-4"
        >
          <v-card variant="outlined" class="supplier-group-card">
            <!-- Supplier Header -->
            <v-card-text class="pa-4 pb-2">
              <div class="d-flex align-center justify-space-between mb-3">
                <div class="d-flex align-center">
                  <div class="supplier-icon mr-3">
                    {{ getSupplierIcon(group.supplierName) }}
                  </div>
                  <div>
                    <div class="text-h6 font-weight-bold">{{ group.supplierName }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ group.items.length }} consolidated item{{
                        group.items.length !== 1 ? 's' : ''
                      }}
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-h6 font-weight-bold text-success">
                    {{ formatCurrency(group.estimatedTotal) }}
                  </div>
                  <div class="text-caption text-medium-emphasis">Estimated Total</div>
                </div>
              </div>

              <!-- Quick Stats -->
              <v-row>
                <v-col cols="4">
                  <div class="text-center">
                    <div class="text-subtitle-2 font-weight-bold">{{ group.items.length }}</div>
                    <div class="text-caption text-medium-emphasis">Items</div>
                  </div>
                </v-col>
                <v-col cols="4">
                  <div class="text-center">
                    <div class="text-subtitle-2 font-weight-bold">
                      {{ getTotalQuantityForGroup(group) }}
                    </div>
                    <div class="text-caption text-medium-emphasis">Total Qty</div>
                  </div>
                </v-col>
                <v-col cols="4">
                  <div class="text-center">
                    <div class="text-subtitle-2 font-weight-bold">
                      {{ getSourceRequestsForGroup(group).size }}
                    </div>
                    <div class="text-caption text-medium-emphasis">Sources</div>
                  </div>
                </v-col>
              </v-row>
            </v-card-text>

            <v-divider />

            <!-- Items List -->
            <v-card-text class="pa-4">
              <div class="items-list">
                <div v-for="item in group.items" :key="item.itemId" class="consolidated-item">
                  <v-card variant="tonal" color="surface" class="mb-3">
                    <v-card-text class="pa-3">
                      <div class="d-flex align-center justify-space-between">
                        <div class="d-flex align-center">
                          <div class="item-icon mr-3">
                            {{ getItemIcon(item.itemName) }}
                          </div>
                          <div>
                            <div class="font-weight-medium">{{ item.itemName }}</div>
                            <div class="text-caption text-medium-emphasis">
                              {{ item.unit }} •
                              <span v-if="item.kitchenQuantity > 0">
                                Kitchen: {{ item.kitchenQuantity }}
                              </span>
                              <span
                                v-if="item.barQuantity > 0"
                                :class="item.kitchenQuantity > 0 ? 'ml-2' : ''"
                              >
                                Bar: {{ item.barQuantity }}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div class="text-right">
                          <div class="text-h6 font-weight-bold text-primary">
                            {{ item.totalQuantity }} {{ item.unit }}
                          </div>
                          <div class="text-caption text-medium-emphasis">
                            {{ formatCurrency(item.estimatedPrice || 0) }}/{{ item.unit }}
                          </div>
                          <div class="text-subtitle-2 font-weight-bold text-success">
                            {{ formatCurrency(item.totalEstimatedCost || 0) }}
                          </div>
                        </div>
                      </div>

                      <!-- Source Breakdown -->
                      <div class="source-breakdown mt-3">
                        <div class="text-caption text-medium-emphasis mb-2">Sources:</div>
                        <div class="d-flex flex-wrap gap-1">
                          <v-chip
                            v-for="source in item.sourceRequests"
                            :key="source.requestId"
                            size="x-small"
                            variant="outlined"
                            :color="getDepartmentColor(source.department)"
                          >
                            {{ source.requestNumber }}: {{ source.quantity }} {{ item.unit }}
                          </v-chip>
                        </div>
                        <div class="d-flex flex-wrap gap-1 mt-1">
                          <v-chip
                            v-for="source in item.sourceRequests"
                            :key="`reason-${source.requestId}`"
                            size="x-small"
                            variant="tonal"
                            :color="getReasonColor(source.reason)"
                          >
                            {{ getReasonText(source.reason) }}
                          </v-chip>
                        </div>
                      </div>
                    </v-card-text>
                  </v-card>
                </div>
              </div>
            </v-card-text>

            <!-- Supplier Summary -->
            <v-divider />
            <v-card-text class="pa-3 bg-surface-variant">
              <div class="d-flex align-center justify-between">
                <div class="text-subtitle-2">Purchase Order {{ index + 1 }} Summary</div>
                <div class="d-flex align-center gap-4">
                  <div class="text-center">
                    <div class="text-caption text-medium-emphasis">Items</div>
                    <div class="font-weight-medium">{{ group.items.length }}</div>
                  </div>
                  <div class="text-center">
                    <div class="text-caption text-medium-emphasis">Total</div>
                    <div class="font-weight-bold text-success">
                      {{ formatCurrency(group.estimatedTotal) }}
                    </div>
                  </div>
                  <div class="text-center">
                    <div class="text-caption text-medium-emphasis">Avg/Item</div>
                    <div class="font-weight-medium">
                      {{ formatCurrency(group.estimatedTotal / group.items.length) }}
                    </div>
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </div>
      </div>

      <!-- Consolidation Notes -->
      <div v-if="consolidation.notes" class="consolidation-notes mb-4">
        <div class="d-flex align-center mb-2">
          <v-icon icon="mdi-note-text" color="info" class="mr-2" />
          <h5>Notes</h5>
        </div>
        <v-card variant="tonal" color="info">
          <v-card-text>{{ consolidation.notes }}</v-card-text>
        </v-card>
      </div>

      <!-- Financial Summary -->
      <v-card variant="tonal" color="success" class="financial-summary">
        <v-card-text class="pa-4">
          <div class="d-flex align-center mb-3">
            <v-icon icon="mdi-calculator" class="mr-2" />
            <h5>Financial Summary</h5>
          </div>

          <v-row>
            <v-col cols="6" md="3">
              <div class="text-center">
                <div class="text-h6 font-weight-bold">
                  {{ formatCurrency(consolidation.totalEstimatedValue) }}
                </div>
                <div class="text-caption">Total Value</div>
              </div>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-center">
                <div class="text-h6 font-weight-bold">
                  {{
                    formatCurrency(
                      consolidation.totalEstimatedValue / consolidation.supplierGroups.length
                    )
                  }}
                </div>
                <div class="text-caption">Avg per Supplier</div>
              </div>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-center">
                <div class="text-h6 font-weight-bold">
                  {{ formatCurrency(consolidation.totalEstimatedValue / getTotalItemsCount()) }}
                </div>
                <div class="text-caption">Avg per Item</div>
              </div>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-center">
                <div class="text-h6 font-weight-bold">
                  {{ consolidation.supplierGroups.length }}
                </div>
                <div class="text-caption">Orders to Create</div>
              </div>
            </v-col>
          </v-row>

          <v-divider class="my-3" />

          <div class="text-caption text-medium-emphasis text-center">
            💡 This consolidation will create {{ consolidation.supplierGroups.length }} purchase
            order{{ consolidation.supplierGroups.length !== 1 ? 's' : '' }} from
            {{ consolidation.sourceRequestIds.length }} source request{{
              consolidation.sourceRequestIds.length !== 1 ? 's' : ''
            }}
          </div>
        </v-card-text>
      </v-card>
    </v-card-text>

    <!-- Action Bar -->
    <v-divider />
    <v-card-actions class="pa-4">
      <div class="d-flex align-center justify-space-between w-100">
        <div class="d-flex align-center gap-2">
          <v-chip
            v-if="consolidation.status === 'draft'"
            color="warning"
            size="small"
            variant="tonal"
          >
            <v-icon icon="mdi-clock" size="12" class="mr-1" />
            Ready to Process
          </v-chip>
          <v-chip
            v-else-if="consolidation.status === 'processed'"
            color="success"
            size="small"
            variant="tonal"
          >
            <v-icon icon="mdi-check-circle" size="12" class="mr-1" />
            Orders Created
          </v-chip>
        </div>

        <div class="d-flex gap-2">
          <v-btn
            v-if="
              consolidation.status === 'processed' && consolidation.generatedOrderIds.length > 0
            "
            variant="outlined"
            size="small"
            prepend-icon="mdi-package-variant"
            @click="viewGeneratedOrders"
          >
            View Orders ({{ consolidation.generatedOrderIds.length }})
          </v-btn>

          <v-btn v-if="consolidation.status === 'draft'" variant="outlined" @click="$emit('edit')">
            Edit Consolidation
          </v-btn>

          <v-btn
            v-if="consolidation.status === 'draft'"
            color="primary"
            variant="flat"
            :loading="creatingOrders"
            @click="$emit('create-orders')"
          >
            <v-icon icon="mdi-cart-plus" class="mr-2" />
            Create {{ consolidation.supplierGroups.length }} Purchase Order{{
              consolidation.supplierGroups.length !== 1 ? 's' : ''
            }}
          </v-btn>
        </div>
      </div>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSupplierStore } from '@/stores/supplier'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getRelativeTime,
  getConsolidationStatusName,
  getConsolidationStatusColor
} from '@/stores/supplier'
import type { RequestConsolidation, SupplierGroup } from '@/stores/supplier'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ConsolidationPreviewCard'

// Props
interface Props {
  consolidation: RequestConsolidation
  creatingOrders?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  creatingOrders: false
})

// Emits
const emit = defineEmits<{
  'create-orders': []
  edit: []
}>()

// Store
const supplierStore = useSupplierStore()

// State
const showSourceRequests = ref(false)

// Methods
function getStatusIcon(status: string): string {
  const icons = {
    draft: 'mdi-file-document',
    processed: 'mdi-check-circle',
    cancelled: 'mdi-cancel'
  }
  return icons[status as keyof typeof icons] || 'mdi-help'
}

function getDepartmentIcon(department: string): string {
  const icons = {
    kitchen: '👨‍🍳',
    bar: '🍸'
  }
  return icons[department as keyof typeof icons] || '📋'
}

function getDepartmentColor(department: string): string {
  const colors = {
    kitchen: 'success',
    bar: 'info'
  }
  return colors[department as keyof typeof colors] || 'default'
}

function getSupplierIcon(supplierName: string): string {
  const icons: Record<string, string> = {
    meat: '🥩',
    premium: '⭐',
    fresh: '🌿',
    market: '🏪',
    beverage: '🥤',
    distributor: '🚛',
    dairy: '🥛',
    spice: '🌶️'
  }

  const lowerName = supplierName.toLowerCase()
  for (const [key, icon] of Object.entries(icons)) {
    if (lowerName.includes(key)) return icon
  }
  return '🏪'
}

function getItemIcon(itemName: string): string {
  const icons: Record<string, string> = {
    beef: '🥩',
    steak: '🥩',
    meat: '🥩',
    potato: '🥔',
    tomato: '🍅',
    garlic: '🧄',
    onion: '🧅',
    salt: '🧂',
    pepper: '🌶️',
    spice: '🌿',
    beer: '🍺',
    cola: '🥤',
    water: '💧',
    drink: '🥤'
  }

  const lowerName = itemName.toLowerCase()
  for (const [key, icon] of Object.entries(icons)) {
    if (lowerName.includes(key)) return icon
  }
  return '📦'
}

function getReasonColor(reason: string): string {
  const colors = {
    low_stock: 'warning',
    out_of_stock: 'error',
    upcoming_menu: 'info',
    bulk_discount: 'success',
    other: 'default'
  }
  return colors[reason as keyof typeof colors] || 'default'
}

function getReasonText(reason: string): string {
  const texts = {
    low_stock: 'Low Stock',
    out_of_stock: 'Out of Stock',
    upcoming_menu: 'Menu Planning',
    bulk_discount: 'Bulk Order',
    other: 'Other'
  }
  return texts[reason as keyof typeof texts] || reason
}

function getTotalItemsCount(): number {
  return props.consolidation.supplierGroups.reduce((sum, group) => sum + group.items.length, 0)
}

function getTotalQuantityForGroup(group: SupplierGroup): number {
  return group.items.reduce((sum, item) => sum + item.totalQuantity, 0)
}

function getSourceRequestsForGroup(group: SupplierGroup): Set<string> {
  const sources = new Set<string>()
  group.items.forEach(item => {
    item.sourceRequests.forEach(source => {
      sources.add(source.requestId)
    })
  })
  return sources
}

// Request helpers (these would typically come from the store)
function getRequestNumber(requestId: string): string {
  const request = supplierStore.state.procurementRequests.find(r => r.id === requestId)
  return request?.requestNumber || requestId
}

function getRequestDepartment(requestId: string): string {
  const request = supplierStore.state.procurementRequests.find(r => r.id === requestId)
  return request?.department || 'unknown'
}

function getRequestItemsCount(requestId: string): number {
  const request = supplierStore.state.procurementRequests.find(r => r.id === requestId)
  return request?.items.length || 0
}

function getRequestBy(requestId: string): string {
  const request = supplierStore.state.procurementRequests.find(r => r.id === requestId)
  return request?.requestedBy || 'Unknown'
}

// Action handlers
function exportConsolidation() {
  DebugUtils.info(MODULE_NAME, 'Export consolidation', {
    consolidationId: props.consolidation.id,
    consolidationNumber: props.consolidation.consolidationNumber
  })
  // TODO: Implement export functionality
}

function editConsolidation() {
  DebugUtils.info(MODULE_NAME, 'Edit consolidation', {
    consolidationId: props.consolidation.id
  })
  emit('edit')
}

function cancelConsolidation() {
  DebugUtils.info(MODULE_NAME, 'Cancel consolidation', {
    consolidationId: props.consolidation.id
  })
  // TODO: Implement cancel functionality
}

function viewGeneratedOrders() {
  DebugUtils.info(MODULE_NAME, 'View generated orders', {
    consolidationId: props.consolidation.id,
    orderIds: props.consolidation.generatedOrderIds
  })
  // TODO: Navigate to orders view or open dialog
}
</script>

<style lang="scss" scoped>
.consolidation-preview-card {
  .detail-item {
    padding: 8px 0;
  }

  .supplier-group-card {
    border-left: 4px solid rgb(var(--v-theme-success));

    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transition: box-shadow 0.2s ease;
    }
  }

  .supplier-icon {
    font-size: 24px;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--v-theme-success), 0.1);
    border-radius: 8px;
    flex-shrink: 0;
  }

  .item-icon {
    font-size: 20px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--v-theme-primary), 0.1);
    border-radius: 6px;
    flex-shrink: 0;
  }

  .source-request-card {
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
  }

  .consolidated-item {
    .source-breakdown {
      background: rgba(var(--v-theme-surface), 0.5);
      border-radius: 6px;
      padding: 8px;
    }
  }

  .financial-summary {
    border: 2px solid rgba(var(--v-theme-success), 0.3);
  }

  .gap-2 {
    gap: 8px;
  }

  .gap-4 {
    gap: 16px;
  }
}

:deep(.v-card-text) {
  .v-row {
    .v-col {
      padding: 4px 8px;
    }
  }
}

// Animation for expand transition
.v-expand-transition-enter-active,
.v-expand-transition-leave-active {
  transition: all 0.3s ease;
}

// Responsive adjustments
@media (max-width: 768px) {
  .consolidation-preview-card {
    .d-flex.justify-space-between {
      flex-direction: column;
      gap: 12px;

      &.align-center {
        align-items: flex-start;
      }
    }

    .text-right {
      text-align: left;
    }

    .supplier-icon {
      width: 32px;
      height: 32px;
      font-size: 20px;
    }
  }
}

// Success state animation
.supplier-group-card {
  &.processed {
    animation: successPulse 0.5s ease-out;
  }
}

@keyframes successPulse {
  0% {
    background-color: rgba(var(--v-theme-success), 0);
  }
  50% {
    background-color: rgba(var(--v-theme-success), 0.1);
  }
  100% {
    background-color: rgba(var(--v-theme-success), 0);
  }
}

// Loading state for create orders button
.v-btn.v-btn--loading {
  .v-icon {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
