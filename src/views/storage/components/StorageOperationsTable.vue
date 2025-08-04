<!-- src/views/storage/components/StorageOperationsTable.vue -->
<template>
  <div class="storage-operations-table">
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Recent Operations</span>
        <v-chip size="small" variant="outlined">{{ operations.length }} operations</v-chip>
      </v-card-title>

      <v-data-table
        :headers="headers"
        :items="operations"
        :loading="loading"
        item-key="id"
        class="elevation-0"
        :items-per-page="10"
      >
        <!-- Operation Type -->
        <template #[`item.operationType`]="{ item }">
          <v-chip :color="getOperationColor(item.operationType)" size="small" variant="flat">
            <v-icon :icon="getOperationIcon(item.operationType)" size="14" class="mr-1" />
            {{ formatOperationType(item.operationType) }}
          </v-chip>
        </template>

        <!-- Document Number -->
        <template #[`item.documentNumber`]="{ item }">
          <div class="font-weight-medium">{{ item.documentNumber }}</div>
          <div class="text-caption text-medium-emphasis">
            {{ formatDateTime(item.operationDate) }}
          </div>
        </template>

        <!-- Items Summary -->
        <template #[`item.items`]="{ item }">
          <div>
            <div class="font-weight-medium">
              {{ item.items.length }} item{{ item.items.length !== 1 ? 's' : '' }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ getItemsSummary(item.items) }}
            </div>
          </div>
        </template>

        <!-- Responsible Person -->
        <template #[`item.responsiblePerson`]="{ item }">
          <div class="d-flex align-center">
            <v-avatar size="24" class="mr-2">
              <v-icon icon="mdi-account" size="16" />
            </v-avatar>
            {{ item.responsiblePerson }}
          </div>
        </template>

        <!-- Total Value -->
        <template #[`item.totalValue`]="{ item }">
          <div v-if="item.totalValue" class="font-weight-medium">
            {{ formatCurrency(item.totalValue) }}
          </div>
          <div v-else class="text-medium-emphasis">-</div>
        </template>

        <!-- Status -->
        <template #[`item.status`]="{ item }">
          <v-chip
            :color="item.status === 'confirmed' ? 'success' : 'warning'"
            size="small"
            variant="flat"
          >
            {{ item.status === 'confirmed' ? 'Confirmed' : 'Draft' }}
          </v-chip>
        </template>

        <!-- Actions -->
        <template #[`item.actions`]="{ item }">
          <v-btn
            size="small"
            variant="text"
            color="primary"
            icon="mdi-eye"
            @click="viewOperation(item)"
          >
            <v-icon />
            <v-tooltip activator="parent" location="top">View Details</v-tooltip>
          </v-btn>
        </template>

        <!-- No data -->
        <template #no-data>
          <div class="text-center py-8">
            <v-icon icon="mdi-history" size="64" class="text-medium-emphasis mb-4" />
            <div class="text-h6 text-medium-emphasis mb-2">No operations found</div>
            <div class="text-body-2 text-medium-emphasis">
              No recent operations for {{ department }}
            </div>
          </div>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  StorageOperation,
  StorageDepartment,
  OperationType,
  StorageOperationItem
} from '@/stores/storage'

// Props
interface Props {
  operations: StorageOperation[]
  loading: boolean
  department: StorageDepartment
}

defineProps<Props>()

// Computed
const headers = computed(() => [
  { title: 'Type', key: 'operationType', sortable: true },
  { title: 'Document', key: 'documentNumber', sortable: true },
  { title: 'Items', key: 'items', sortable: false },
  { title: 'Responsible', key: 'responsiblePerson', sortable: true },
  { title: 'Value', key: 'totalValue', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, width: '80px' }
])

// Methods
function getOperationIcon(type: OperationType): string {
  switch (type) {
    case 'receipt':
      return 'mdi-plus-circle'
    case 'consumption':
      return 'mdi-minus-circle'
    case 'inventory':
      return 'mdi-clipboard-list'
    case 'correction':
      return 'mdi-pencil'
    default:
      return 'mdi-file-document'
  }
}

function getOperationColor(type: OperationType): string {
  switch (type) {
    case 'receipt':
      return 'success'
    case 'consumption':
      return 'primary'
    case 'inventory':
      return 'info'
    case 'correction':
      return 'warning'
    default:
      return 'default'
  }
}

function formatOperationType(type: OperationType): string {
  switch (type) {
    case 'receipt':
      return 'Receipt'
    case 'consumption':
      return 'Consumption'
    case 'inventory':
      return 'Inventory'
    case 'correction':
      return 'Correction'
    default:
      return type
  }
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function getItemsSummary(items: StorageOperationItem[]): string {
  if (items.length === 0) return 'No items'
  if (items.length === 1) return items[0].itemName
  return `${items[0].itemName} +${items.length - 1} more`
}

function viewOperation(operation: StorageOperation) {
  // TODO: Implement operation details view
  console.log('View operation:', operation)
}
</script>

<style lang="scss" scoped>
.storage-operations-table {
  .v-card-title {
    background: rgba(var(--v-theme-surface), 0.8);
  }
}
</style>
