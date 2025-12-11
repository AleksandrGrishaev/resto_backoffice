<!-- src/views/counteragents/components/counteragents/CounteragentsTable.vue -->
<template>
  <v-card class="table-card" elevation="0">
    <!-- Table View -->
    <div v-if="viewMode === 'table'">
      <v-data-table
        v-model="selected"
        :headers="headers"
        :items="filteredItems"
        :loading="store.loading.counteragents"
        :items-per-page="store.viewSettings.itemsPerPage"
        :sort-by="[{ key: store.viewSettings.sortBy, order: store.viewSettings.sortOrder }]"
        item-value="id"
        show-select
        class="counteragents-table"
        @update:sort-by="handleSort"
        @update:model-value="updateSelection"
      >
        <!-- Name Column -->
        <template #[`item.name`]="{ item }">
          <div class="name-cell clickable" @click="$emit('view', item)">
            <div class="name-primary">{{ item.name }}</div>
            <div v-if="item.displayName" class="name-secondary">
              {{ item.displayName }}
            </div>
          </div>
        </template>

        <!-- Type Column -->
        <template #[`item.type`]="{ item }">
          <v-chip
            :color="getTypeColor(item.type)"
            :prepend-icon="getTypeIcon(item.type)"
            variant="tonal"
            size="small"
          >
            {{ getTypeLabel(item.type) }}
          </v-chip>
        </template>

        <!-- ✅ Balance Column (receipt-based calculation) -->
        <template #[`item.currentBalance`]="{ item }">
          <div class="balance-cell">
            <!-- Показываем баланс только для поставщиков -->
            <div v-if="item.type === 'supplier'" class="balance-content">
              <v-chip
                v-if="hasReceiptBalance(item)"
                :color="getBalanceColor(getReceiptBalance(item.id))"
                :prepend-icon="getBalanceIcon(getReceiptBalance(item.id))"
                size="small"
                variant="flat"
                class="balance-chip"
              >
                {{ formatBalance(getReceiptBalance(item.id)) }}
              </v-chip>
              <span v-else class="text-medium-emphasis">—</span>
            </div>
            <!-- Для остальных типов показываем прочерк -->
            <span v-else class="text-medium-emphasis">—</span>
          </div>
        </template>

        <!-- Categories Column -->
        <template #[`item.productCategories`]="{ item }">
          <div class="categories-cell">
            <v-chip
              v-for="category in item.productCategories.slice(0, 2)"
              :key="category"
              :prepend-icon="getCategoryIcon(category)"
              size="x-small"
              variant="outlined"
              class="me-1 mb-1"
            >
              {{ getCategoryLabel(category) }}
            </v-chip>
            <v-chip v-if="item.productCategories.length > 2" size="x-small" variant="outlined">
              +{{ item.productCategories.length - 2 }}
            </v-chip>
          </div>
        </template>

        <!-- Payment Terms Column -->
        <template #[`item.paymentTerms`]="{ item }">
          <v-chip
            :color="getPaymentColor(item.paymentTerms)"
            :prepend-icon="getPaymentIcon(item.paymentTerms)"
            variant="tonal"
            size="small"
          >
            {{ getPaymentLabel(item.paymentTerms) }}
          </v-chip>
        </template>

        <!-- Status Column -->
        <template #[`item.isActive`]="{ item }">
          <v-switch
            :model-value="item.isActive"
            color="success"
            density="compact"
            hide-details
            @update:model-value="toggleStatus(item)"
          />
        </template>

        <!-- Preferred Column -->
        <template #[`item.isPreferred`]="{ item }">
          <v-btn
            :color="item.isPreferred ? 'warning' : 'default'"
            :icon="item.isPreferred ? 'mdi-star' : 'mdi-star-outline'"
            variant="text"
            size="small"
            @click="togglePreferred(item)"
          />
        </template>

        <!-- Actions Column -->
        <template #[`item.actions`]="{ item }">
          <div class="actions-cell">
            <v-btn icon="mdi-pencil" variant="text" size="small" @click="$emit('edit', item)" />
            <v-btn
              icon="mdi-delete"
              variant="text"
              size="small"
              color="error"
              @click="$emit('delete', item)"
            />
          </div>
        </template>

        <!-- No data slot -->
        <template #no-data>
          <div class="no-data">
            <v-icon icon="mdi-database-off" size="64" color="grey" />
            <h3>No counteragents found</h3>
            <p>Try adjusting your filters or add a new counteragent</p>
          </div>
        </template>

        <!-- Loading slot -->
        <template #loading>
          <div class="loading-state">
            <v-progress-circular indeterminate color="primary" />
            <p>Loading counteragents...</p>
          </div>
        </template>
      </v-data-table>
    </div>

    <!-- Grid View -->
    <div v-else class="grid-view">
      <v-row>
        <v-col v-for="item in filteredItems" :key="item.id" cols="12" sm="6" md="4" lg="3">
          <CounteragentCard
            :counteragent="item"
            :selected="selected.includes(item.id)"
            compact
            @click="toggleSelection(item.id)"
            @edit="$emit('edit', item)"
            @delete="$emit('delete', item)"
          />
        </v-col>
      </v-row>
    </div>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useCounteragentsStore } from '@/stores/counteragents'
import {
  getCounteragentTypeLabel,
  getProductCategoryLabel,
  getPaymentTermsLabel
} from '@/stores/counteragents'
import type { Counteragent } from '@/stores/counteragents'
import CounteragentCard from './CounteragentCard.vue'
import { useCounteragentBalance } from '@/stores/counteragents/composables/useCounteragentBalance'

// Props & Emits
defineEmits<{
  edit: [counteragent: Counteragent]
  view: [counteragent: Counteragent]
  delete: [counteragent: Counteragent]
}>()

const store = useCounteragentsStore()
const { getBalanceBreakdown, getBalanceColor, getBalanceIcon, formatBalance } =
  useCounteragentBalance()

// Local state
const selected = ref<string[]>([])
const viewMode = ref<'table' | 'grid'>('table')

// Balance map for receipt-based calculation
const balanceMap = ref<Map<string, number>>(new Map())

// Load balances for all suppliers
const loadBalances = async () => {
  const suppliers = store.counteragents.filter(c => c.type === 'supplier')
  for (const supplier of suppliers) {
    const breakdown = await getBalanceBreakdown(supplier.id)
    balanceMap.value.set(supplier.id, breakdown.balance)
  }
}

// Get receipt-based balance for a counteragent
const getReceiptBalance = (counteragentId: string): number => {
  return balanceMap.value.get(counteragentId) ?? 0
}

// Has receipt-based balance
const hasReceiptBalance = (counteragent: Counteragent): boolean => {
  if (counteragent.type !== 'supplier') return false
  const balance = balanceMap.value.get(counteragent.id)
  return balance !== undefined && balance !== 0
}

// Load balances on mount and when counteragents change
watch(
  () => store.counteragents,
  () => {
    loadBalances()
  },
  { immediate: true }
)

// Table headers
const headers = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Type', key: 'type', sortable: true },
  { title: 'Balance', key: 'currentBalance', sortable: true, width: '120px' }, // ✅ НОВАЯ КОЛОНКА
  { title: 'Categories', key: 'productCategories', sortable: false },
  { title: 'Payment Terms', key: 'paymentTerms', sortable: true },
  { title: 'Status', key: 'isActive', sortable: true },
  { title: 'Preferred', key: 'isPreferred', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, width: '120' }
]

// Computed
const filteredItems = computed(() => store.filteredCounterAgents)

// Methods
const handleSort = (sortBy: any[]) => {
  if (sortBy.length > 0) {
    store.setSortBy(sortBy[0].key)
  }
}

const updateSelection = (newSelected: string[]) => {
  selected.value = newSelected
  store.selectedIds = [...newSelected]
}

const toggleSelection = (id: string) => {
  store.toggleCounteragentSelection(id)
}

const toggleStatus = async (item: Counteragent) => {
  await store.toggleCounteragentStatus(item.id)
}

const togglePreferred = async (item: Counteragent) => {
  await store.setPreferredStatus(item.id, !item.isPreferred)
}

// Helper functions
const getTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    supplier: 'primary',
    service: 'secondary',
    other: 'info'
  }
  return colors[type] || 'default'
}

const getTypeIcon = (type: string): string => {
  const icons: Record<string, string> = {
    supplier: 'mdi-truck',
    service: 'mdi-tools',
    other: 'mdi-help-circle'
  }
  return icons[type] || 'mdi-circle'
}

const getTypeLabel = (type: string): string => {
  return getCounteragentTypeLabel(type as any)
}

const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    meat: 'mdi-food-steak',
    vegetables: 'mdi-carrot',
    dairy: 'mdi-cow',
    beverages: 'mdi-bottle-soda',
    spices: 'mdi-shaker',
    equipment: 'mdi-tools',
    cleaning: 'mdi-spray-bottle',
    other: 'mdi-package-variant'
  }
  return icons[category] || 'mdi-circle'
}

const getCategoryLabel = (category: string): string => {
  return getProductCategoryLabel(category as any)
}

const getPaymentColor = (terms: string): string => {
  const colors: Record<string, string> = {
    prepaid: 'success',
    on_delivery: 'warning',
    after: 'info',
    custom: 'secondary'
  }
  return colors[terms] || 'default'
}

const getPaymentIcon = (terms: string): string => {
  const icons: Record<string, string> = {
    prepaid: 'mdi-credit-card',
    on_delivery: 'mdi-truck-delivery',
    after: 'mdi-calendar-clock',
    custom: 'mdi-handshake'
  }
  return icons[terms] || 'mdi-cash'
}

const getPaymentLabel = (terms: string): string => {
  return getPaymentTermsLabel(terms as any)
}

// Watch store selection
watch(
  () => store.selectedIds,
  newIds => {
    selected.value = [...newIds]
  }
)
</script>

<style scoped>
.table-card {
  border: 1px solid #333;
  background-color: rgb(var(--v-theme-surface));
}

.name-cell {
  min-width: 160px;
  cursor: pointer;
}

.name-cell.clickable:hover .name-primary {
  color: #1976d2;
}

.name-primary {
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.name-secondary {
  font-size: 0.875rem;
  color: rgb(var(--v-theme-on-surface-variant));
}

.categories-cell {
  min-width: 140px;
}

.actions-cell {
  display: flex;
  gap: 4px;
}

.no-data {
  text-align: center;
  padding: 48px 24px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.loading-state {
  text-align: center;
  padding: 48px 24px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.balance-content {
  display: flex;
  align-items: center;
}

.grid-view {
  padding: 20px;
}

:deep(.v-data-table__td) {
  padding: 12px 16px;
  vertical-align: top;
  border-bottom: 1px solid #333;
}

:deep(.v-data-table__th) {
  background-color: transparent !important;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  border-bottom: 1px solid #333;
}

:deep(.v-data-table) {
  background-color: transparent;
}

:deep(.v-card-title) {
  background: #000 !important;
}

:deep(.v-card-title::before),
:deep(.v-card-title::after) {
  display: none !important;
}

:deep(.v-card::before),
:deep(.v-card::after) {
  display: none !important;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
  }
}
</style>
