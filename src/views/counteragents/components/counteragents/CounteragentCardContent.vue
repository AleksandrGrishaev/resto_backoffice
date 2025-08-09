<!-- src/views/counteragents/components/counteragents/CounteragentCardContent.vue -->
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
  getPaymentTermsLabel,
  formatCurrency
} from '@/stores/counteragents'
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

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .actions-section {
    flex-direction: column;
  }
}
</style>
