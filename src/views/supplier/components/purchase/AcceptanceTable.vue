<!-- src/views/supplier/components/purchase/AcceptanceTable.vue -->
<template>
  <div class="acceptance-table">
    <!-- Filters and Actions -->
    <div class="d-flex align-center justify-space-between mb-4">
      <div class="d-flex align-center gap-2">
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Search acceptances..."
          variant="outlined"
          density="compact"
          hide-details
          style="width: 300px"
          clearable
        />

        <v-select
          v-model="supplierFilter"
          :items="supplierOptions"
          label="Supplier"
          variant="outlined"
          density="compact"
          hide-details
          style="width: 200px"
        />

        <v-select
          v-model="statusFilter"
          :items="statusOptions"
          label="Status"
          variant="outlined"
          density="compact"
          hide-details
          style="width: 150px"
        />

        <v-select
          v-model="discrepancyFilter"
          :items="discrepancyOptions"
          label="Discrepancies"
          variant="outlined"
          density="compact"
          hide-details
          style="width: 150px"
        />

        <v-menu>
          <template #activator="{ props }">
            <v-btn variant="outlined" size="small" prepend-icon="mdi-calendar" v-bind="props">
              Date Range
            </v-btn>
          </template>
          <v-card min-width="300">
            <v-card-text>
              <v-row>
                <v-col cols="12">
                  <v-text-field
                    v-model="dateFrom"
                    type="date"
                    label="From Date"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
                <v-col cols="12">
                  <v-text-field
                    v-model="dateTo"
                    type="date"
                    label="To Date"
                    variant="outlined"
                    density="compact"
                  />
                </v-col>
              </v-row>
            </v-card-text>
            <v-card-actions>
              <v-btn size="small" @click="clearDateFilter">Clear</v-btn>
              <v-spacer />
              <v-btn color="primary" size="small" @click="applyDateFilter">Apply</v-btn>
            </v-card-actions>
          </v-card>
        </v-menu>

        <v-btn
          v-if="hasActiveFilters"
          color="warning"
          variant="outlined"
          size="small"
          prepend-icon="mdi-filter-off"
          @click="clearFilters"
        >
          Clear Filters
        </v-btn>
      </div>

      <div class="d-flex gap-2">
        <v-btn
          color="success"
          variant="outlined"
          prepend-icon="mdi-truck-check"
          @click="$emit('start-acceptance')"
        >
          Start Acceptance
        </v-btn>

        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-download"
          @click="exportAcceptances"
        >
          Export
        </v-btn>
      </div>
    </div>

    <!-- Active Filters Display -->
    <div v-if="hasActiveFilters" class="mb-3">
      <div class="d-flex align-center gap-2">
        <span class="text-caption text-medium-emphasis">Active filters:</span>

        <v-chip
          v-if="supplierFilter !== 'all'"
          size="small"
          closable
          color="primary"
          @click:close="supplierFilter = 'all'"
        >
          Supplier: {{ getSupplierName(supplierFilter) }}
        </v-chip>

        <v-chip
          v-if="statusFilter !== 'all'"
          size="small"
          closable
          color="info"
          @click:close="statusFilter = 'all'"
        >
          Status: {{ getAcceptanceStatusName(statusFilter) }}
        </v-chip>

        <v-chip
          v-if="discrepancyFilter !== 'all'"
          size="small"
          closable
          color="warning"
          @click:close="discrepancyFilter = 'all'"
        >
          {{ discrepancyFilter === 'with' ? 'With Discrepancies' : 'No Discrepancies' }}
        </v-chip>

        <v-chip
          v-if="dateFrom || dateTo"
          size="small"
          closable
          color="secondary"
          @click:close="clearDateFilter"
        >
          Date: {{ formatDateRange() }}
        </v-chip>
      </div>
    </div>

    <!-- Quick Stats -->
    <v-row class="mb-4">
      <v-col cols="6" md="3">
        <v-card variant="tonal" color="info">
          <v-card-text class="text-center pa-3">
            <div class="text-h6 font-weight-bold">{{ totalAcceptances }}</div>
            <div class="text-caption">Total Acceptances</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="tonal" color="warning">
          <v-card-text class="text-center pa-3">
            <div class="text-h6 font-weight-bold">{{ withDiscrepancies }}</div>
            <div class="text-caption">With Issues</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="tonal" color="success">
          <v-card-text class="text-center pa-3">
            <div class="text-h6 font-weight-bold">{{ cleanAcceptances }}</div>
            <div class="text-caption">Clean Delivery</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="6" md="3">
        <v-card variant="tonal" color="error">
          <v-card-text class="text-center pa-3">
            <div class="text-h6 font-weight-bold">{{ formatCurrency(totalDiscrepancyValue) }}</div>
            <div class="text-caption">Total Loss</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Table -->
    <v-card>
      <v-data-table
        v-model="selectedAcceptances"
        :headers="headers"
        :items="filteredAcceptances"
        :loading="loading"
        :search="searchQuery"
        item-key="id"
        class="elevation-0"
        :items-per-page="15"
        :sort-by="[{ key: 'deliveryDate', order: 'desc' }]"
        show-select
      >
        <!-- Acceptance Number & Purchase Order -->
        <template #[`item.acceptanceNumber`]="{ item }">
          <div class="d-flex align-center">
            <div class="acceptance-icon mr-3">
              {{ getAcceptanceIcon(item.status) }}
            </div>
            <div class="acceptance-info">
              <div class="font-weight-medium">{{ item.acceptanceNumber }}</div>
              <div class="text-caption text-medium-emphasis">
                PO: {{ getPurchaseOrderNumber(item.purchaseOrderId) }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ getSupplierName(item.supplierId) }}
              </div>
            </div>
          </div>
        </template>

        <!-- Delivery Date & Personnel -->
        <template #[`item.deliveryDate`]="{ item }">
          <div>
            <div class="font-weight-medium">{{ formatDate(item.deliveryDate) }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ getRelativeTime(item.deliveryDate) }}
            </div>
            <div class="text-caption text-primary">
              <v-icon icon="mdi-account-check" size="12" class="mr-1" />
              {{ item.acceptedBy }}
            </div>
          </div>
        </template>

        <!-- Items & Quality Overview -->
        <template #[`item.items`]="{ item }">
          <div>
            <div class="font-weight-medium">
              {{ item.items.length }} item{{ item.items.length !== 1 ? 's' : '' }}
            </div>

            <!-- Quality Distribution -->
            <div class="mt-1">
              <div class="quality-bar">
                <div class="d-flex mb-1">
                  <div
                    v-for="qualityLevel in getQualityDistribution(item)"
                    :key="qualityLevel.level"
                    :style="{
                      width: `${qualityLevel.percentage}%`,
                      backgroundColor: getQualityColor(qualityLevel.level)
                    }"
                    class="quality-segment"
                  />
                </div>
              </div>
              <div class="text-caption text-medium-emphasis">
                Quality: {{ getAverageQuality(item) }}
              </div>
            </div>

            <!-- Items preview -->
            <div class="mt-2">
              <v-chip
                v-for="(previewItem, index) in getItemsPreview(item)"
                :key="index"
                size="x-small"
                :color="getItemQualityColor(previewItem.quality)"
                variant="outlined"
                class="mr-1 mb-1"
              >
                {{ previewItem.name }}
                <v-icon
                  v-if="previewItem.hasIssues"
                  icon="mdi-alert-circle"
                  size="10"
                  class="ml-1"
                />
              </v-chip>
              <v-chip v-if="item.items.length > 3" size="x-small" variant="text" color="primary">
                +{{ item.items.length - 3 }} more
              </v-chip>
            </div>
          </div>
        </template>

        <!-- Discrepancies & Issues -->
        <template #[`item.discrepancies`]="{ item }">
          <div>
            <div v-if="item.hasDiscrepancies" class="mb-2">
              <v-chip color="warning" size="small" variant="flat">
                <v-icon icon="mdi-alert" size="14" class="mr-1" />
                {{ item.totalDiscrepancies }} issue{{ item.totalDiscrepancies !== 1 ? 's' : '' }}
              </v-chip>
            </div>
            <div v-else class="mb-2">
              <v-chip color="success" size="small" variant="flat">
                <v-icon icon="mdi-check-circle" size="14" class="mr-1" />
                No Issues
              </v-chip>
            </div>

            <!-- Financial Impact -->
            <div v-if="item.totalValueDifference !== 0">
              <div class="text-caption text-medium-emphasis">Financial Impact</div>
              <div
                class="font-weight-medium"
                :class="item.totalValueDifference < 0 ? 'text-error' : 'text-success'"
              >
                {{ item.totalValueDifference < 0 ? '-' : '+'
                }}{{ formatCurrency(Math.abs(item.totalValueDifference)) }}
              </div>
            </div>

            <!-- Quality Issues Summary -->
            <div v-if="hasQualityIssues(item)" class="mt-1">
              <div class="text-caption text-error">
                <v-icon icon="mdi-alert-circle" size="12" class="mr-1" />
                Quality concerns
              </div>
            </div>
          </div>
        </template>

        <!-- Status -->
        <template #[`item.status`]="{ item }">
          <v-chip :color="getAcceptanceStatusColor(item.status)" size="small" variant="flat">
            <v-icon :icon="getStatusIcon(item.status)" size="14" class="mr-1" />
            {{ getAcceptanceStatusName(item.status) }}
          </v-chip>
        </template>

        <!-- Storage Integration -->
        <template #[`item.storageIntegration`]="{ item }">
          <div>
            <div v-if="item.storageOperationId">
              <v-chip color="success" size="small" variant="tonal">
                <v-icon icon="mdi-database-check" size="14" class="mr-1" />
                Integrated
              </v-chip>
              <div class="text-caption text-medium-emphasis mt-1">
                Op: {{ item.storageOperationId }}
              </div>
            </div>
            <div v-else>
              <v-chip color="warning" size="small" variant="tonal">
                <v-icon icon="mdi-database-alert" size="14" class="mr-1" />
                Pending
              </v-chip>
            </div>

            <!-- Correction Operations -->
            <div v-if="item.correctionOperationIds.length > 0" class="mt-1">
              <div class="text-caption text-info">
                <v-icon icon="mdi-wrench" size="12" class="mr-1" />
                {{ item.correctionOperationIds.length }} correction{{
                  item.correctionOperationIds.length !== 1 ? 's' : ''
                }}
              </div>
            </div>
          </div>
        </template>

        <!-- Actions -->
        <template #[`item.actions`]="{ item }">
          <div class="d-flex justify-center gap-1">
            <v-btn
              size="small"
              variant="text"
              color="primary"
              icon="mdi-eye"
              @click="viewAcceptanceDetails(item)"
            >
              <v-icon />
              <v-tooltip activator="parent" location="top">View Details</v-tooltip>
            </v-btn>

            <v-btn
              v-if="canEdit(item)"
              size="small"
              variant="text"
              color="warning"
              icon="mdi-pencil"
              @click="$emit('edit-acceptance', item)"
            >
              <v-icon />
              <v-tooltip activator="parent" location="top">Edit Acceptance</v-tooltip>
            </v-btn>

            <v-menu>
              <template #activator="{ props }">
                <v-btn
                  size="small"
                  variant="text"
                  color="info"
                  icon="mdi-dots-vertical"
                  v-bind="props"
                >
                  <v-icon />
                  <v-tooltip activator="parent" location="top">More Actions</v-tooltip>
                </v-btn>
              </template>

              <v-list density="compact">
                <v-list-item v-if="canFinalize(item)" @click="finalizeAcceptance(item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-check-circle" class="mr-2" />
                    Finalize Acceptance
                  </v-list-item-title>
                </v-list-item>

                <v-list-item v-if="canCreateCorrection(item)" @click="createCorrection(item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-wrench" class="mr-2" />
                    Create Correction
                  </v-list-item-title>
                </v-list-item>

                <v-list-item @click="viewPurchaseOrder(item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-package-variant" class="mr-2" />
                    View Purchase Order
                  </v-list-item-title>
                </v-list-item>

                <v-list-item @click="exportAcceptanceReport(item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-file-document" class="mr-2" />
                    Export Report
                  </v-list-item-title>
                </v-list-item>

                <v-list-item @click="contactSupplier(item)">
                  <v-list-item-title>
                    <v-icon icon="mdi-phone" class="mr-2" />
                    Contact Supplier
                  </v-list-item-title>
                </v-list-item>

                <v-divider />

                <v-list-item
                  v-if="canReject(item)"
                  class="text-error"
                  @click="rejectAcceptance(item)"
                >
                  <v-list-item-title>
                    <v-icon icon="mdi-close-circle" class="mr-2" />
                    Reject Acceptance
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </template>

        <!-- No data -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon icon="mdi-truck-check-outline" size="64" class="text-medium-emphasis mb-4" />
            <div class="text-h6 text-medium-emphasis mb-2">
              {{
                hasActiveFilters ? 'No acceptances match filters' : 'No receipt acceptances found'
              }}
            </div>
            <div class="text-body-2 text-medium-emphasis mb-4">
              {{
                hasActiveFilters
                  ? 'Try adjusting or clearing your filters'
                  : 'Acceptances will appear here when deliveries are received and processed'
              }}
            </div>
            <div v-if="hasActiveFilters" class="d-flex justify-center gap-2">
              <v-btn size="small" variant="outlined" @click="clearFilters">Clear Filters</v-btn>
            </div>
            <div v-else class="d-flex justify-center gap-2">
              <v-btn color="success" variant="flat" @click="$emit('start-acceptance')">
                <v-icon icon="mdi-truck-check" class="mr-2" />
                Start Acceptance
              </v-btn>
            </div>
          </div>
        </template>

        <!-- Loading -->
        <template #loading>
          <div class="text-center py-8">
            <v-progress-circular indeterminate color="primary" class="mb-2" />
            <div>Loading receipt acceptances...</div>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Bulk Actions (when acceptances are selected) -->
    <v-expand-transition>
      <v-card v-if="selectedAcceptances.length > 0" variant="tonal" color="primary" class="mt-4">
        <v-card-text class="d-flex align-center justify-space-between">
          <div>
            <div class="font-weight-medium">
              {{ selectedAcceptances.length }} acceptance{{
                selectedAcceptances.length !== 1 ? 's' : ''
              }}
              selected
            </div>
            <div class="text-caption">
              Total discrepancy value: {{ formatCurrency(getSelectedDiscrepancyValue()) }}
            </div>
          </div>

          <div class="d-flex gap-2">
            <v-btn
              color="success"
              variant="outlined"
              size="small"
              prepend-icon="mdi-check-circle"
              :disabled="!canBulkFinalize"
              @click="bulkFinalizeAcceptances"
            >
              Finalize All
            </v-btn>

            <v-btn
              color="info"
              variant="outlined"
              size="small"
              prepend-icon="mdi-wrench"
              :disabled="!canBulkCreateCorrections"
              @click="bulkCreateCorrections"
            >
              Create Corrections
            </v-btn>

            <v-btn
              color="warning"
              variant="outlined"
              size="small"
              prepend-icon="mdi-file-document"
              @click="bulkExportReports"
            >
              Export Reports
            </v-btn>

            <v-btn
              color="error"
              variant="outlined"
              size="small"
              prepend-icon="mdi-close-circle"
              :disabled="!canBulkReject"
              @click="bulkRejectAcceptances"
            >
              Reject All
            </v-btn>

            <v-btn variant="text" size="small" @click="selectedAcceptances = []">
              Clear Selection
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </v-expand-transition>

    <!-- Acceptance Details Dialog -->
    <v-dialog v-model="showDetailsDialog" max-width="1200px" scrollable>
      <v-card v-if="selectedAcceptance">
        <v-card-title class="d-flex align-center justify-space-between">
          <div>
            <h3>{{ selectedAcceptance.acceptanceNumber }}</h3>
            <div class="text-caption text-medium-emphasis">
              Delivery acceptance for
              {{ getPurchaseOrderNumber(selectedAcceptance.purchaseOrderId) }}
            </div>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="showDetailsDialog = false" />
        </v-card-title>

        <v-divider />

        <v-card-text class="pa-6" style="max-height: 800px">
          <!-- Acceptance Info -->
          <v-row class="mb-4">
            <v-col cols="6" md="3">
              <div class="text-caption text-medium-emphasis">Delivery Date</div>
              <div class="font-weight-medium">
                {{ formatDateTime(selectedAcceptance.deliveryDate) }}
              </div>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-caption text-medium-emphasis">Accepted By</div>
              <div class="font-weight-medium">{{ selectedAcceptance.acceptedBy }}</div>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-caption text-medium-emphasis">Status</div>
              <v-chip
                :color="getAcceptanceStatusColor(selectedAcceptance.status)"
                size="small"
                variant="flat"
              >
                {{ getAcceptanceStatusName(selectedAcceptance.status) }}
              </v-chip>
            </v-col>
            <v-col cols="6" md="3">
              <div class="text-caption text-medium-emphasis">Total Items</div>
              <div class="font-weight-medium">{{ selectedAcceptance.items.length }}</div>
            </v-col>
          </v-row>

          <!-- Discrepancy Summary -->
          <div v-if="selectedAcceptance.hasDiscrepancies" class="mb-4">
            <v-card variant="tonal" color="warning">
              <v-card-text class="pa-4">
                <div class="d-flex align-center mb-2">
                  <v-icon icon="mdi-alert" class="mr-2" />
                  <h4>Discrepancies Found</h4>
                </div>
                <v-row>
                  <v-col cols="4">
                    <div class="text-caption text-medium-emphasis">Total Issues</div>
                    <div class="text-h6 font-weight-bold">
                      {{ selectedAcceptance.totalDiscrepancies }}
                    </div>
                  </v-col>
                  <v-col cols="4">
                    <div class="text-caption text-medium-emphasis">Financial Impact</div>
                    <div class="text-h6 font-weight-bold text-error">
                      {{ formatCurrency(Math.abs(selectedAcceptance.totalValueDifference)) }}
                    </div>
                  </v-col>
                  <v-col cols="4">
                    <div class="text-caption text-medium-emphasis">Corrections</div>
                    <div class="text-h6 font-weight-bold">
                      {{ selectedAcceptance.correctionOperationIds.length }}
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </div>

          <!-- Items List -->
          <div class="mb-4">
            <h4 class="mb-3">Accepted Items</h4>
            <v-card
              v-for="item in selectedAcceptance.items"
              :key="item.id"
              variant="outlined"
              class="mb-2"
              :color="
                item.quantityDiscrepancy !== 0 ||
                item.quality === 'poor' ||
                item.quality === 'rejected'
                  ? 'warning'
                  : 'default'
              "
            >
              <v-card-text class="pa-3">
                <div class="d-flex align-center justify-space-between">
                  <div>
                    <div class="font-weight-medium">{{ item.itemName }}</div>
                    <div class="text-caption text-medium-emphasis">
                      Ordered: {{ item.orderedQuantity }} • Delivered:
                      {{ item.deliveredQuantity }} • Accepted: {{ item.acceptedQuantity }}
                    </div>
                    <div class="mt-1">
                      <v-chip :color="getQualityColor(item.quality)" size="x-small" variant="flat">
                        {{ item.quality.toUpperCase() }}
                      </v-chip>
                      <v-chip
                        v-if="item.quantityDiscrepancy !== 0"
                        :color="item.quantityDiscrepancy > 0 ? 'success' : 'error'"
                        size="x-small"
                        variant="outlined"
                        class="ml-1"
                      >
                        {{ item.quantityDiscrepancy > 0 ? '+' : '' }}{{ item.quantityDiscrepancy }}
                      </v-chip>
                    </div>
                    <div v-if="item.qualityIssues" class="text-caption text-error mt-1">
                      <v-icon icon="mdi-alert-circle" size="12" class="mr-1" />
                      {{ item.qualityIssues }}
                    </div>
                    <div v-if="item.notes" class="text-caption text-medium-emphasis mt-1">
                      <v-icon icon="mdi-note-text" size="12" class="mr-1" />
                      {{ item.notes }}
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-weight-medium">
                      {{ formatCurrency(item.orderedPrice) }} per unit
                    </div>
                    <div
                      v-if="item.acceptedPrice && item.acceptedPrice !== item.orderedPrice"
                      class="text-caption text-warning"
                    >
                      Adjusted: {{ formatCurrency(item.acceptedPrice) }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      Value impact:
                      <span :class="item.quantityDiscrepancy < 0 ? 'text-error' : 'text-success'">
                        {{ formatCurrency(Math.abs(item.quantityDiscrepancy * item.orderedPrice)) }}
                      </span>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </div>

          <!-- Notes -->
          <div v-if="selectedAcceptance.notes" class="mb-4">
            <h4 class="mb-2">Acceptance Notes</h4>
            <v-card variant="tonal" color="info">
              <v-card-text>{{ selectedAcceptance.notes }}</v-card-text>
            </v-card>
          </div>

          <!-- Storage Integration Status -->
          <div>
            <h4 class="mb-2">Storage Integration</h4>
            <div v-if="selectedAcceptance.storageOperationId">
              <v-chip color="success" variant="tonal" class="mr-2">
                <v-icon icon="mdi-database-check" size="14" class="mr-1" />
                Storage Updated: {{ selectedAcceptance.storageOperationId }}
              </v-chip>
            </div>
            <div v-else>
              <v-chip color="warning" variant="tonal">
                <v-icon icon="mdi-database-alert" size="14" class="mr-1" />
                Storage Update Pending
              </v-chip>
            </div>

            <div v-if="selectedAcceptance.correctionOperationIds.length > 0" class="mt-2">
              <div class="text-caption text-medium-emphasis mb-1">Correction Operations:</div>
              <v-chip
                v-for="correctionId in selectedAcceptance.correctionOperationIds"
                :key="correctionId"
                color="info"
                variant="outlined"
                size="small"
                class="mr-1 mb-1"
              >
                {{ correctionId }}
              </v-chip>
            </div>
          </div>
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="outlined" @click="showDetailsDialog = false">Close</v-btn>
          <v-btn
            v-if="canEdit(selectedAcceptance)"
            color="warning"
            variant="flat"
            @click="handleEditAcceptance"
          >
            Edit Acceptance
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSupplierStore } from '@/stores/supplier'
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  ACCEPTANCE_STATUSES,
  QUALITY_RATINGS
} from '@/stores/supplier'
import type { ReceiptAcceptance } from '@/stores/supplier'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'AcceptanceTable'

// Props
interface Props {
  acceptances: ReceiptAcceptance[]
  loading: boolean
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'edit-acceptance': [acceptance: ReceiptAcceptance]
  'start-acceptance': []
}>()

// Store
const supplierStore = useSupplierStore()

// State
const searchQuery = ref('')
const supplierFilter = ref('all')
const statusFilter = ref('all')
const discrepancyFilter = ref('all')
const dateFrom = ref('')
const dateTo = ref('')
const selectedAcceptances = ref<ReceiptAcceptance[]>([])

const showDetailsDialog = ref(false)
const selectedAcceptance = ref<ReceiptAcceptance | null>(null)

// Options
const supplierOptions = computed(() => [
  { title: 'All Suppliers', value: 'all' },
  ...Array.from(new Set(props.acceptances.map(a => a.supplierId))).map(id => ({
    title: getSupplierName(id),
    value: id
  }))
])

const statusOptions = [
  { title: 'All Statuses', value: 'all' },
  ...Object.entries(ACCEPTANCE_STATUSES).map(([value, title]) => ({ title, value }))
]

const discrepancyOptions = [
  { title: 'All', value: 'all' },
  { title: 'With Discrepancies', value: 'with' },
  { title: 'No Discrepancies', value: 'without' }
]

// Computed
const headers = computed(() => [
  { title: 'Acceptance', key: 'acceptanceNumber', sortable: true, width: '220px' },
  { title: 'Delivery Date', key: 'deliveryDate', sortable: true, width: '160px' },
  { title: 'Items & Quality', key: 'items', sortable: false, width: '280px' },
  {
    title: 'Issues & Impact',
    key: 'discrepancies',
    sortable: true,
    value: 'hasDiscrepancies',
    width: '200px'
  },
  { title: 'Status', key: 'status', sortable: true, width: '120px' },
  { title: 'Storage', key: 'storageIntegration', sortable: false, width: '140px' },
  { title: 'Actions', key: 'actions', sortable: false, width: '120px' }
])

const filteredAcceptances = computed(() => {
  let acceptances = [...props.acceptances]

  // Supplier filter
  if (supplierFilter.value !== 'all') {
    acceptances = acceptances.filter(a => a.supplierId === supplierFilter.value)
  }

  // Status filter
  if (statusFilter.value !== 'all') {
    acceptances = acceptances.filter(a => a.status === statusFilter.value)
  }

  // Discrepancy filter
  if (discrepancyFilter.value !== 'all') {
    const hasDiscrepancies = discrepancyFilter.value === 'with'
    acceptances = acceptances.filter(a => a.hasDiscrepancies === hasDiscrepancies)
  }

  // Date range filter
  if (dateFrom.value) {
    acceptances = acceptances.filter(a => new Date(a.deliveryDate) >= new Date(dateFrom.value))
  }
  if (dateTo.value) {
    acceptances = acceptances.filter(a => new Date(a.deliveryDate) <= new Date(dateTo.value))
  }

  return acceptances
})

const hasActiveFilters = computed(
  () =>
    supplierFilter.value !== 'all' ||
    statusFilter.value !== 'all' ||
    discrepancyFilter.value !== 'all' ||
    dateFrom.value ||
    dateTo.value
)

// Stats
const totalAcceptances = computed(() => filteredAcceptances.value.length)
const withDiscrepancies = computed(
  () => filteredAcceptances.value.filter(a => a.hasDiscrepancies).length
)
const cleanAcceptances = computed(
  () => filteredAcceptances.value.filter(a => !a.hasDiscrepancies).length
)
const totalDiscrepancyValue = computed(() =>
  filteredAcceptances.value.reduce((sum, a) => sum + Math.abs(a.totalValueDifference), 0)
)

// Bulk actions computed
const canBulkFinalize = computed(() => selectedAcceptances.value.some(a => a.status === 'draft'))

const canBulkCreateCorrections = computed(() =>
  selectedAcceptances.value.some(a => a.hasDiscrepancies && a.correctionOperationIds.length === 0)
)

const canBulkReject = computed(() => selectedAcceptances.value.some(a => a.status === 'draft'))

// Methods
function handleEditAcceptance() {
  if (selectedAcceptance.value) {
    emit('edit-acceptance', selectedAcceptance.value)
    showDetailsDialog.value = false
  }
}

function getAcceptanceIcon(status: string): string {
  const icons = {
    draft: '📝',
    accepted: '✅',
    rejected: '❌'
  }
  return icons[status as keyof typeof icons] || '📋'
}

function getSupplierName(supplierId: string): string {
  const supplier = supplierStore.state.suppliers.find(s => s.id === supplierId)
  return supplier?.name || supplierId
}

function getPurchaseOrderNumber(orderId: string): string {
  const order = supplierStore.state.purchaseOrders.find(o => o.id === orderId)
  return order?.orderNumber || orderId
}

function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

  if (diffDays > 0) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  } else {
    return 'Today'
  }
}

function getQualityDistribution(acceptance: ReceiptAcceptance) {
  const distribution = acceptance.items.reduce(
    (acc, item) => {
      acc[item.quality] = (acc[item.quality] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const total = acceptance.items.length

  return Object.entries(distribution).map(([level, count]) => ({
    level,
    count,
    percentage: (count / total) * 100
  }))
}

function getQualityColor(quality: string): string {
  const colors = {
    excellent: '#4CAF50',
    good: '#8BC34A',
    acceptable: '#FFC107',
    poor: '#FF9800',
    rejected: '#F44336'
  }
  return colors[quality as keyof typeof colors] || '#9E9E9E'
}

function getAverageQuality(acceptance: ReceiptAcceptance): string {
  const qualityScores = {
    excellent: 5,
    good: 4,
    acceptable: 3,
    poor: 2,
    rejected: 1
  }

  const totalScore = acceptance.items.reduce((sum, item) => {
    return sum + (qualityScores[item.quality as keyof typeof qualityScores] || 0)
  }, 0)

  const averageScore = totalScore / acceptance.items.length

  if (averageScore >= 4.5) return 'Excellent'
  if (averageScore >= 3.5) return 'Good'
  if (averageScore >= 2.5) return 'Acceptable'
  if (averageScore >= 1.5) return 'Poor'
  return 'Rejected'
}

function getItemsPreview(acceptance: ReceiptAcceptance) {
  return acceptance.items.slice(0, 3).map(item => ({
    name: item.itemName,
    quality: item.quality,
    hasIssues:
      item.quantityDiscrepancy !== 0 || item.quality === 'poor' || item.quality === 'rejected'
  }))
}

function getItemQualityColor(quality: string): string {
  const colors = {
    excellent: 'success',
    good: 'info',
    acceptable: 'warning',
    poor: 'error',
    rejected: 'error'
  }
  return colors[quality as keyof typeof colors] || 'default'
}

function hasQualityIssues(acceptance: ReceiptAcceptance): boolean {
  return acceptance.items.some(
    item => item.quality === 'poor' || item.quality === 'rejected' || item.qualityIssues
  )
}

function getAcceptanceStatusName(status: string): string {
  return ACCEPTANCE_STATUSES[status as keyof typeof ACCEPTANCE_STATUSES] || status
}

function getAcceptanceStatusColor(status: string): string {
  const colors = {
    draft: 'warning',
    accepted: 'success',
    rejected: 'error'
  }
  return colors[status as keyof typeof colors] || 'default'
}

function getStatusIcon(status: string): string {
  const icons = {
    draft: 'mdi-file-document-outline',
    accepted: 'mdi-check-circle',
    rejected: 'mdi-close-circle'
  }
  return icons[status as keyof typeof icons] || 'mdi-help'
}

function formatDateRange(): string {
  if (dateFrom.value && dateTo.value) {
    return `${formatDate(dateFrom.value)} - ${formatDate(dateTo.value)}`
  } else if (dateFrom.value) {
    return `From ${formatDate(dateFrom.value)}`
  } else if (dateTo.value) {
    return `Until ${formatDate(dateTo.value)}`
  }
  return ''
}

function getSelectedDiscrepancyValue(): number {
  return selectedAcceptances.value.reduce((sum, acceptance) => {
    return sum + Math.abs(acceptance.totalValueDifference)
  }, 0)
}

// Permission checks
function canEdit(acceptance: ReceiptAcceptance): boolean {
  return acceptance.status === 'draft'
}

function canFinalize(acceptance: ReceiptAcceptance): boolean {
  return acceptance.status === 'draft'
}

function canCreateCorrection(acceptance: ReceiptAcceptance): boolean {
  return acceptance.hasDiscrepancies && acceptance.correctionOperationIds.length === 0
}

function canReject(acceptance: ReceiptAcceptance): boolean {
  return acceptance.status === 'draft'
}

// Filter methods
function clearFilters() {
  supplierFilter.value = 'all'
  statusFilter.value = 'all'
  discrepancyFilter.value = 'all'
  dateFrom.value = ''
  dateTo.value = ''
  searchQuery.value = ''
}

function clearDateFilter() {
  dateFrom.value = ''
  dateTo.value = ''
}

function applyDateFilter() {
  // Date filter is applied automatically through computed
}

// Action Methods
function viewAcceptanceDetails(acceptance: ReceiptAcceptance) {
  selectedAcceptance.value = acceptance
  showDetailsDialog.value = true

  DebugUtils.info(MODULE_NAME, 'View acceptance details', {
    acceptanceId: acceptance.id,
    acceptanceNumber: acceptance.acceptanceNumber
  })
}

async function finalizeAcceptance(acceptance: ReceiptAcceptance) {
  try {
    DebugUtils.info(MODULE_NAME, 'Finalize acceptance', {
      acceptanceId: acceptance.id,
      acceptanceNumber: acceptance.acceptanceNumber
    })

    // TODO: Implement finalize acceptance logic
    // This would update the acceptance status and create storage operations
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to finalize acceptance', { error })
  }
}

function createCorrection(acceptance: ReceiptAcceptance) {
  DebugUtils.info(MODULE_NAME, 'Create correction for acceptance', {
    acceptanceId: acceptance.id,
    acceptanceNumber: acceptance.acceptanceNumber,
    discrepancies: acceptance.totalDiscrepancies
  })

  // TODO: Implement correction creation logic
  // This would create storage correction operations for discrepancies
}

function viewPurchaseOrder(acceptance: ReceiptAcceptance) {
  DebugUtils.info(MODULE_NAME, 'View related purchase order', {
    acceptanceId: acceptance.id,
    purchaseOrderId: acceptance.purchaseOrderId
  })

  // TODO: Navigate to purchase order or open in dialog
}

function exportAcceptanceReport(acceptance: ReceiptAcceptance) {
  DebugUtils.info(MODULE_NAME, 'Export acceptance report', {
    acceptanceId: acceptance.id,
    acceptanceNumber: acceptance.acceptanceNumber
  })

  // TODO: Implement PDF export of acceptance report
}

function contactSupplier(acceptance: ReceiptAcceptance) {
  DebugUtils.info(MODULE_NAME, 'Contact supplier about acceptance', {
    acceptanceId: acceptance.id,
    supplierId: acceptance.supplierId
  })

  // TODO: Open supplier contact information or email template
}

async function rejectAcceptance(acceptance: ReceiptAcceptance) {
  try {
    DebugUtils.info(MODULE_NAME, 'Reject acceptance', {
      acceptanceId: acceptance.id,
      acceptanceNumber: acceptance.acceptanceNumber
    })

    // TODO: Implement reject acceptance logic
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to reject acceptance', { error })
  }
}

function exportAcceptances() {
  DebugUtils.info(MODULE_NAME, 'Export all acceptances', {
    count: filteredAcceptances.value.length
  })

  // TODO: Implement bulk export of acceptances
}

// Bulk Actions
async function bulkFinalizeAcceptances() {
  const draftAcceptances = selectedAcceptances.value.filter(a => a.status === 'draft')

  try {
    DebugUtils.info(MODULE_NAME, 'Bulk finalize acceptances', {
      count: draftAcceptances.length,
      acceptanceIds: draftAcceptances.map(a => a.id)
    })

    // TODO: Implement bulk finalize
    selectedAcceptances.value = []
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to bulk finalize acceptances', { error })
  }
}

function bulkCreateCorrections() {
  const acceptancesWithIssues = selectedAcceptances.value.filter(
    a => a.hasDiscrepancies && a.correctionOperationIds.length === 0
  )

  DebugUtils.info(MODULE_NAME, 'Bulk create corrections', {
    count: acceptancesWithIssues.length,
    acceptanceIds: acceptancesWithIssues.map(a => a.id)
  })

  // TODO: Implement bulk correction creation
}

function bulkExportReports() {
  DebugUtils.info(MODULE_NAME, 'Bulk export reports', {
    count: selectedAcceptances.value.length,
    acceptanceIds: selectedAcceptances.value.map(a => a.id)
  })

  // TODO: Implement bulk report export
}

async function bulkRejectAcceptances() {
  const draftAcceptances = selectedAcceptances.value.filter(a => a.status === 'draft')

  try {
    DebugUtils.info(MODULE_NAME, 'Bulk reject acceptances', {
      count: draftAcceptances.length,
      acceptanceIds: draftAcceptances.map(a => a.id)
    })

    // TODO: Implement bulk reject
    selectedAcceptances.value = []
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to bulk reject acceptances', { error })
  }
}
</script>

<style lang="scss" scoped>
.acceptance-table {
  .gap-2 {
    gap: 8px;
  }

  .acceptance-icon {
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

  .acceptance-info {
    min-width: 0;
    flex: 1;
  }

  .quality-bar {
    width: 100%;
    height: 4px;
    background: #f5f5f5;
    border-radius: 2px;
    overflow: hidden;

    .quality-segment {
      height: 100%;
      display: inline-block;
      transition: all 0.3s ease;

      &:hover {
        opacity: 0.8;
      }
    }
  }
}

:deep(.v-data-table) {
  .v-data-table__td {
    padding: 8px 16px;
  }

  .v-data-table__th {
    font-weight: 600;
  }
}

:deep(.v-dialog .v-card) {
  .v-card-text {
    .v-row {
      margin: 0;

      .v-col {
        padding: 4px 8px;
      }
    }
  }
}
</style>
