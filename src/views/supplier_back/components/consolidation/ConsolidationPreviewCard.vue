<!-- src/views/supplier/components/consolidation/ConsolidationPreviewCard.vue -->
<template>
  <v-card class="consolidation-preview-card">
    <!-- Simple Header -->
    <v-card-title class="d-flex align-center justify-space-between pa-4">
      <div>
        <h4 class="text-h6 font-weight-bold">Order Preview</h4>
        <p class="text-caption text-medium-emphasis ma-0">
          {{ consolidation.supplierGroups.length }} orders • {{ getTotalItemsCount() }} products •
          {{ formatCurrency(consolidation.totalEstimatedValue) }}
        </p>
      </div>

      <div class="d-flex gap-2">
        <v-btn variant="outlined" size="small" @click="$emit('edit')">Edit</v-btn>
        <v-btn
          color="success"
          variant="flat"
          size="small"
          :loading="creatingOrders"
          @click="$emit('create-orders')"
        >
          Create Orders
        </v-btn>
      </div>
    </v-card-title>

    <v-divider />

    <!-- Supplier Orders -->
    <div class="pa-4">
      <div
        v-for="(group, index) in consolidation.supplierGroups"
        :key="group.supplierId"
        class="supplier-order mb-6"
      >
        <!-- Supplier Header -->
        <div class="d-flex align-center justify-space-between mb-4">
          <div class="d-flex align-center">
            <v-avatar size="40" color="primary" class="mr-3">
              <span class="text-h6 font-weight-bold">
                {{ group.supplierName.charAt(0) }}
              </span>
            </v-avatar>
            <div>
              <div class="text-h6 font-weight-bold">{{ group.supplierName }}</div>
              <div class="text-caption text-medium-emphasis">
                Order {{ index + 1 }} • {{ group.items.length }} products
              </div>
            </div>
          </div>

          <div class="text-right">
            <div class="text-h5 font-weight-bold text-success">
              {{ formatCurrency(group.estimatedTotal) }}
            </div>
            <div class="text-caption text-medium-emphasis">Total</div>
          </div>
        </div>

        <!-- Products Grid -->
        <v-row>
          <v-col v-for="item in group.items" :key="item.itemId" cols="12" sm="6" md="4">
            <v-card variant="outlined" class="product-card h-100" hover>
              <v-card-text class="pa-4">
                <!-- Product Header -->
                <div class="d-flex align-center mb-3">
                  <v-avatar size="32" color="surface-variant" class="mr-3">
                    <span class="text-body-2">
                      {{ getProductIcon(item.itemName) }}
                    </span>
                  </v-avatar>
                  <div>
                    <div class="font-weight-bold text-body-1">
                      {{ item.itemName }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ item.unit }}
                    </div>
                  </div>
                </div>

                <!-- Quantity Breakdown -->
                <div class="quantity-breakdown mb-3">
                  <div class="d-flex justify-space-between align-center mb-2">
                    <span class="text-body-2 font-weight-medium">Total Quantity:</span>
                    <span class="text-h6 font-weight-bold text-primary">
                      {{ item.totalQuantity }} {{ item.unit }}
                    </span>
                  </div>

                  <div
                    v-if="item.kitchenQuantity > 0 || item.barQuantity > 0"
                    class="department-split"
                  >
                    <div v-if="item.kitchenQuantity > 0" class="d-flex justify-space-between">
                      <span class="text-caption">🍳 Kitchen:</span>
                      <span class="text-caption font-weight-medium">
                        {{ item.kitchenQuantity }} {{ item.unit }}
                      </span>
                    </div>
                    <div v-if="item.barQuantity > 0" class="d-flex justify-space-between">
                      <span class="text-caption">🍸 Bar:</span>
                      <span class="text-caption font-weight-medium">
                        {{ item.barQuantity }} {{ item.unit }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Price Info -->
                <div class="price-info mb-3">
                  <div class="d-flex justify-space-between align-center">
                    <span class="text-caption text-medium-emphasis">Unit Price:</span>
                    <span class="text-caption">
                      {{ formatCurrency(item.estimatedPrice || 0) }}/{{ item.unit }}
                    </span>
                  </div>
                  <div class="d-flex justify-space-between align-center">
                    <span class="text-body-2 font-weight-medium">Total:</span>
                    <span class="text-body-1 font-weight-bold text-success">
                      {{ formatCurrency(item.totalEstimatedCost || 0) }}
                    </span>
                  </div>
                </div>

                <!-- Source Requests -->
                <div class="source-requests">
                  <div class="text-caption text-medium-emphasis mb-2">
                    From {{ item.sourceRequests.length }} request{{
                      item.sourceRequests.length !== 1 ? 's' : ''
                    }}:
                  </div>
                  <div class="d-flex flex-wrap gap-1">
                    <v-chip
                      v-for="source in item.sourceRequests"
                      :key="source.requestId"
                      size="x-small"
                      variant="tonal"
                      :color="getDepartmentColor(source.department)"
                    >
                      {{ source.quantity }} {{ item.unit }}
                    </v-chip>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Separator between suppliers -->
        <v-divider v-if="index < consolidation.supplierGroups.length - 1" class="mt-4" />
      </div>
    </div>

    <!-- Summary Footer -->
    <v-divider />
    <v-card-text class="pa-4">
      <div class="d-flex align-center justify-space-between">
        <div class="d-flex gap-6">
          <div class="text-center">
            <div class="text-h6 font-weight-bold">
              {{ consolidation.supplierGroups.length }}
            </div>
            <div class="text-caption text-medium-emphasis">Orders</div>
          </div>
          <div class="text-center">
            <div class="text-h6 font-weight-bold">
              {{ getTotalItemsCount() }}
            </div>
            <div class="text-caption text-medium-emphasis">Products</div>
          </div>
          <div class="text-center">
            <div class="text-h6 font-weight-bold">
              {{ consolidation.sourceRequestIds.length }}
            </div>
            <div class="text-caption text-medium-emphasis">Requests</div>
          </div>
        </div>

        <div class="text-right">
          <div class="text-h5 font-weight-bold text-success">
            {{ formatCurrency(consolidation.totalEstimatedValue) }}
          </div>
          <div class="text-caption text-medium-emphasis">Total Value</div>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { formatCurrency } from '@/stores/supplier'
import type { RequestConsolidation } from '@/stores/supplier'

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

// Methods
function getTotalItemsCount(): number {
  return props.consolidation.supplierGroups.reduce((sum, group) => sum + group.items.length, 0)
}

function getProductIcon(itemName: string): string {
  const icons: Record<string, string> = {
    beef: '🥩',
    steak: '🥩',
    meat: '🥩',
    chicken: '🐔',
    potato: '🥔',
    tomato: '🍅',
    garlic: '🧄',
    onion: '🧅',
    salt: '🧂',
    pepper: '🌶️',
    spice: '🌿',
    herb: '🌿',
    beer: '🍺',
    wine: '🍷',
    cola: '🥤',
    water: '💧',
    milk: '🥛',
    cheese: '🧀',
    bread: '🍞',
    oil: '🫒',
    sauce: '🥫',
    rice: '🍚',
    pasta: '🍝'
  }

  const lowerName = itemName.toLowerCase()
  for (const [key, icon] of Object.entries(icons)) {
    if (lowerName.includes(key)) return icon
  }
  return '📦'
}

function getDepartmentColor(department: string): string {
  const colors = {
    kitchen: 'success',
    bar: 'info'
  }
  return colors[department as keyof typeof colors] || 'primary'
}
</script>

<style lang="scss" scoped>
.consolidation-preview-card {
  .supplier-order {
    &:not(:last-child) {
      position: relative;
    }
  }

  .product-card {
    transition: all 0.2s ease;
    border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      border-color: rgba(var(--v-theme-primary), 0.3);
    }
  }

  .quantity-breakdown {
    background: rgba(var(--v-theme-surface-variant), 0.3);
    border-radius: 8px;
    padding: 12px;
  }

  .department-split {
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    padding-top: 8px;
    margin-top: 8px;
  }

  .price-info {
    border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
    padding-top: 12px;
  }

  .source-requests {
    background: rgba(var(--v-theme-primary), 0.05);
    border-radius: 6px;
    padding: 8px;
  }
}

// Responsive adjustments
@media (max-width: 768px) {
  .consolidation-preview-card {
    .d-flex.justify-space-between {
      flex-direction: column;
      gap: 16px;
      align-items: flex-start;
    }

    .text-right {
      text-align: left;
      width: 100%;
    }
  }
}

// Subtle animation for cards
.product-card {
  animation: fadeInUp 0.3s ease-out forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// Stagger animation for multiple cards
.product-card {
  &:nth-child(1) {
    animation-delay: 0.1s;
  }
  &:nth-child(2) {
    animation-delay: 0.2s;
  }
  &:nth-child(3) {
    animation-delay: 0.3s;
  }
  &:nth-child(4) {
    animation-delay: 0.4s;
  }
  &:nth-child(5) {
    animation-delay: 0.5s;
  }
  &:nth-child(6) {
    animation-delay: 0.6s;
  }
}
</style>
