<!-- src/views/counteragents/components/counteragents/CounteragentCardContent.vue - UPDATED -->
<template>
  <div class="counteragent-content">
    <!-- Header Section -->
    <div class="content-header">
      <div class="name-section">
        <h2 class="counteragent-name">
          <v-icon :icon="getTypeIcon(counteragent.type)" class="me-2" />
          {{ counteragent.name }}
        </h2>
        <div v-if="counteragent.displayName" class="display-name">
          {{ counteragent.displayName }}
        </div>
      </div>

      <div class="status-badges">
        <v-chip
          :color="getTypeColor(counteragent.type)"
          :prepend-icon="getTypeIcon(counteragent.type)"
          variant="tonal"
          size="small"
        >
          {{ getTypeLabel(counteragent.type) }}
        </v-chip>

        <v-chip
          v-if="counteragent.isPreferred"
          color="warning"
          prepend-icon="mdi-star"
          variant="tonal"
          size="small"
        >
          Preferred
        </v-chip>

        <v-chip
          :color="counteragent.isActive ? 'success' : 'error'"
          :prepend-icon="counteragent.isActive ? 'mdi-check-circle' : 'mdi-close-circle'"
          variant="tonal"
          size="small"
        >
          {{ counteragent.isActive ? 'Active' : 'Inactive' }}
        </v-chip>
      </div>
    </div>

    <!-- Contact Information -->
    <ContactInfo :counteragent="counteragent" class="mb-4" />

    <!-- ✅ NEW: Supply Chain Information -->
    <div v-if="counteragent.type === 'supplier'" class="section mb-4">
      <h4 class="section-title">
        <v-icon icon="mdi-truck-delivery" class="me-2" />
        Supply Chain Details
      </h4>
      <div class="supply-chain-grid">
        <!-- Lead Time -->
        <div class="supply-item">
          <v-icon icon="mdi-clock-outline" class="supply-icon" color="info" />
          <div class="supply-details">
            <div class="supply-label">Lead Time</div>
            <div class="supply-value">
              {{ counteragent.leadTimeDays }} {{ counteragent.leadTimeDays === 1 ? 'day' : 'days' }}
            </div>
          </div>
          <v-chip :color="getLeadTimeColor(counteragent.leadTimeDays)" size="small" variant="tonal">
            {{ getLeadTimeLabel(counteragent.leadTimeDays) }}
          </v-chip>
        </div>

        <!-- Delivery Schedule -->
        <div v-if="counteragent.deliverySchedule" class="supply-item">
          <v-icon icon="mdi-calendar-clock" class="supply-icon" color="primary" />
          <div class="supply-details">
            <div class="supply-label">Delivery Schedule</div>
            <div class="supply-value">
              {{ getDeliveryScheduleLabel(counteragent.deliverySchedule) }}
            </div>
          </div>
          <v-chip
            :color="getDeliveryScheduleColor(counteragent.deliverySchedule)"
            :prepend-icon="getDeliveryScheduleIcon(counteragent.deliverySchedule)"
            size="small"
            variant="tonal"
          >
            {{ getDeliveryScheduleShort(counteragent.deliverySchedule) }}
          </v-chip>
        </div>

        <!-- Minimum Order Amount -->
        <div v-if="counteragent.minOrderAmount" class="supply-item">
          <v-icon icon="mdi-cash-multiple" class="supply-icon" color="success" />
          <div class="supply-details">
            <div class="supply-label">Minimum Order</div>
            <div class="supply-value">{{ formatCurrency(counteragent.minOrderAmount) }}</div>
          </div>
          <v-chip
            :color="getMinOrderColor(counteragent.minOrderAmount)"
            size="small"
            variant="tonal"
          >
            {{ getMinOrderLabel(counteragent.minOrderAmount) }}
          </v-chip>
        </div>
      </div>
    </div>

    <!-- Product Categories -->
    <div v-if="counteragent.productCategories.length > 0" class="section mb-4">
      <h4 class="section-title">
        <v-icon icon="mdi-package-variant" class="me-2" />
        Product Categories
      </h4>
      <div class="categories-grid">
        <v-chip
          v-for="category in counteragent.productCategories"
          :key="category"
          :prepend-icon="getCategoryIcon(category)"
          variant="outlined"
          size="small"
          class="me-1 mb-1"
        >
          {{ getCategoryLabel(category) }}
        </v-chip>
      </div>
    </div>

    <!-- Payment Terms -->
    <div class="section mb-4">
      <h4 class="section-title">
        <v-icon icon="mdi-credit-card" class="me-2" />
        Payment Terms
      </h4>
      <v-chip
        :color="getPaymentColor(counteragent.paymentTerms)"
        :prepend-icon="getPaymentIcon(counteragent.paymentTerms)"
        variant="tonal"
      >
        {{ getPaymentLabel(counteragent.paymentTerms) }}
      </v-chip>
    </div>

    <!-- Financial Information -->
    <div
      v-if="detailed && (counteragent.currentBalance || counteragent.creditLimit)"
      class="section mb-4"
    >
      <h4 class="section-title">
        <v-icon icon="mdi-cash" class="me-2" />
        Financial Information
      </h4>
      <div class="financial-info">
        <div v-if="counteragent.currentBalance !== undefined" class="balance-item">
          <span class="label">Current Balance:</span>
          <v-chip
            :color="getBalanceColor(counteragent.currentBalance)"
            size="small"
            variant="tonal"
          >
            {{ formatCurrency(counteragent.currentBalance) }}
          </v-chip>
        </div>
        <div v-if="counteragent.creditLimit" class="balance-item">
          <span class="label">Credit Limit:</span>
          <span class="value">{{ formatCurrency(counteragent.creditLimit) }}</span>
        </div>
      </div>
    </div>

    <!-- Description -->
    <div v-if="detailed && counteragent.description" class="section mb-4">
      <h4 class="section-title">
        <v-icon icon="mdi-text" class="me-2" />
        Description
      </h4>
      <p class="description-text">{{ counteragent.description }}</p>
    </div>

    <!-- Tags -->
    <div v-if="counteragent.tags && counteragent.tags.length > 0" class="section mb-4">
      <h4 class="section-title">
        <v-icon icon="mdi-tag-multiple" class="me-2" />
        Tags
      </h4>
      <div class="tags-grid">
        <v-chip
          v-for="tag in counteragent.tags"
          :key="tag"
          size="small"
          variant="outlined"
          prepend-icon="mdi-tag"
          class="me-1 mb-1"
        >
          {{ tag }}
        </v-chip>
      </div>
    </div>

    <!-- Statistics -->
    <div v-if="detailed && hasStatistics" class="section mb-4">
      <h4 class="section-title">
        <v-icon icon="mdi-chart-line" class="me-2" />
        Statistics
      </h4>
      <div class="stats-grid">
        <div v-if="counteragent.totalOrders" class="stat-item">
          <div class="stat-value">{{ counteragent.totalOrders }}</div>
          <div class="stat-label">Total Orders</div>
        </div>
        <div v-if="counteragent.totalOrderValue" class="stat-item">
          <div class="stat-value">{{ formatCurrency(counteragent.totalOrderValue) }}</div>
          <div class="stat-label">Total Value</div>
        </div>
        <div v-if="counteragent.averageDeliveryTime" class="stat-item">
          <div class="stat-value">{{ counteragent.averageDeliveryTime }} days</div>
          <div class="stat-label">Avg Delivery</div>
        </div>
        <div v-if="counteragent.lastOrderDate" class="stat-item">
          <div class="stat-value">{{ formatDate(counteragent.lastOrderDate) }}</div>
          <div class="stat-label">Last Order</div>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div v-if="detailed && counteragent.notes" class="section mb-4">
      <h4 class="section-title">
        <v-icon icon="mdi-note-text" class="me-2" />
        Notes
      </h4>
      <p class="notes-text">{{ counteragent.notes }}</p>
    </div>

    <!-- Actions -->
    <div class="actions-section">
      <v-btn
        color="primary"
        variant="outlined"
        prepend-icon="mdi-pencil"
        class="me-2"
        @click="$emit('edit')"
      >
        Edit
      </v-btn>

      <v-btn color="error" variant="outlined" prepend-icon="mdi-delete" @click="$emit('delete')">
        Delete
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  getCounteragentTypeLabel,
  getProductCategoryLabel,
  getPaymentTermsLabel
} from '@/stores/counteragents'
import { formatIDR } from '@/utils/currency'
import type { Counteragent } from '@/stores/counteragents'
import ContactInfo from '../shared/ContactInfo.vue'

interface Props {
  counteragent: Counteragent
  detailed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  detailed: false
})

defineEmits<{
  edit: []
  delete: []
}>()

// Computed
const hasStatistics = computed(() => {
  return (
    props.counteragent.totalOrders ||
    props.counteragent.totalOrderValue ||
    props.counteragent.averageDeliveryTime ||
    props.counteragent.lastOrderDate
  )
})

// =============================================
// ✅ NEW: Supply Chain Helper Functions
// =============================================

const getLeadTimeColor = (days: number): string => {
  if (days <= 1) return 'success'
  if (days <= 3) return 'info'
  if (days <= 7) return 'warning'
  return 'error'
}

const getLeadTimeLabel = (days: number): string => {
  if (days <= 1) return 'Fast'
  if (days <= 3) return 'Normal'
  if (days <= 7) return 'Slow'
  return 'Very Slow'
}

const getDeliveryScheduleLabel = (schedule: string): string => {
  const labels: Record<string, string> = {
    daily: 'Daily Delivery',
    weekly: 'Weekly Delivery',
    biweekly: 'Bi-weekly Delivery',
    monthly: 'Monthly Delivery',
    on_demand: 'On Demand'
  }
  return labels[schedule] || schedule
}

const getDeliveryScheduleShort = (schedule: string): string => {
  const labels: Record<string, string> = {
    daily: 'Daily',
    weekly: 'Weekly',
    biweekly: 'Bi-weekly',
    monthly: 'Monthly',
    on_demand: 'On Demand'
  }
  return labels[schedule] || schedule
}

const getDeliveryScheduleColor = (schedule: string): string => {
  const colors: Record<string, string> = {
    daily: 'success',
    weekly: 'primary',
    biweekly: 'info',
    monthly: 'warning',
    on_demand: 'secondary'
  }
  return colors[schedule] || 'default'
}

const getDeliveryScheduleIcon = (schedule: string): string => {
  const icons: Record<string, string> = {
    daily: 'mdi-calendar-today',
    weekly: 'mdi-calendar-week',
    biweekly: 'mdi-calendar-range',
    monthly: 'mdi-calendar-month',
    on_demand: 'mdi-calendar-question'
  }
  return icons[schedule] || 'mdi-calendar'
}

const getMinOrderColor = (amount: number): string => {
  if (amount <= 500000) return 'success' // <= 500K IDR
  if (amount <= 1000000) return 'info' // <= 1M IDR
  if (amount <= 2000000) return 'warning' // <= 2M IDR
  return 'error' // > 2M IDR
}

const getMinOrderLabel = (amount: number): string => {
  if (amount <= 500000) return 'Low'
  if (amount <= 1000000) return 'Medium'
  if (amount <= 2000000) return 'High'
  return 'Very High'
}

// =============================================
// EXISTING HELPER FUNCTIONS
// =============================================

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

const getBalanceColor = (balance: number): string => {
  if (balance > 0) return 'success'
  if (balance < 0) return 'warning'
  return 'default'
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatCurrency = (amount: number): string => {
  return formatIDR(amount)
}
</script>

<style scoped>
.counteragent-content {
  padding: 4px;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 16px;
}

.name-section {
  flex: 1;
}

.counteragent-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
}

.display-name {
  font-size: 1rem;
  color: #ccc;
  font-style: italic;
}

.status-badges {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.section {
  border-left: 2px solid #333;
  padding-left: 12px;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}

/* ✅ NEW: Supply Chain Styles */
.supply-chain-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.supply-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #222;
  border: 1px solid #333;
  border-radius: 8px;
}

.supply-icon {
  flex-shrink: 0;
}

.supply-details {
  flex: 1;
  min-width: 0;
}

.supply-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #ccc;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.supply-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
  margin-top: 2px;
}

.categories-grid,
.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.financial-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.balance-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-weight: 500;
  color: #ccc;
}

.value {
  font-weight: 600;
  color: #fff;
}

.description-text,
.notes-text {
  line-height: 1.6;
  color: #ccc;
  margin: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 12px;
  background: #222;
  border: 1px solid #333;
  border-radius: 8px;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1976d2;
}

.stat-label {
  font-size: 0.875rem;
  color: #ccc;
  margin-top: 4px;
}

.actions-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #333;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

@media (max-width: 600px) {
  .content-header {
    flex-direction: column;
    align-items: stretch;
  }

  .status-badges {
    flex-direction: row;
    align-items: flex-start;
  }

  .supply-item {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .actions-section {
    flex-direction: column;
  }
}
</style>
