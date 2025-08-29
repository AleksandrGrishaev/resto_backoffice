<!-- RequestSummaryTab.vue -->
<template>
  <div>
    <!-- Empty State -->
    <div v-if="selectedItems.length === 0" class="text-center pa-8">
      <v-icon icon="mdi-cart-outline" size="64" color="grey" class="mb-4" />
      <div class="text-h6 mb-2">No Items Selected</div>
      <div class="text-body-2 text-medium-emphasis">
        Add items from suggestions or manually to create a request
      </div>
    </div>

    <!-- Selected Items (without cost information) -->
    <div v-else>
      <v-card variant="outlined" class="mb-4">
        <v-card-title class="text-subtitle-1 pa-3 bg-primary-lighten-5">
          <v-icon icon="mdi-cart" class="mr-2" />
          Selected Items ({{ selectedItems.length }})
        </v-card-title>

        <v-divider />

        <div class="pa-3">
          <div
            v-for="(item, index) in selectedItems"
            :key="item.itemId"
            class="py-3"
            :class="{ 'border-b': index < selectedItems.length - 1 }"
          >
            <div class="d-flex align-center justify-space-between">
              <!-- Product Information -->
              <div class="flex-grow-1">
                <div class="font-weight-bold text-subtitle-2">{{ item.itemName }}</div>
                <div class="text-body-2 text-medium-emphasis">
                  {{ formatQuantityForSummary(item) }}
                </div>
                <div v-if="item.notes" class="text-caption text-medium-emphasis mt-1">
                  <v-icon size="14" class="mr-1">mdi-note-text</v-icon>
                  {{ item.notes }}
                </div>
              </div>

              <!-- Quantity Editor -->
              <div class="d-flex align-center mr-4">
                <v-text-field
                  :model-value="getEditableQuantity(item)"
                  type="number"
                  min="0.1"
                  step="0.1"
                  density="compact"
                  style="width: 100px"
                  variant="outlined"
                  hide-details
                  @update:model-value="value => handleQuantityUpdate(item, value)"
                />
                <span class="text-caption text-medium-emphasis ml-2">
                  {{ getItemUnit(item) }}
                </span>
              </div>

              <!-- Actions -->
              <div>
                <v-btn
                  icon="mdi-delete"
                  color="error"
                  variant="text"
                  size="small"
                  @click="$emit('removeItem', item.itemId)"
                />
              </div>
            </div>
          </div>
        </div>
      </v-card>

      <!-- Request Details (without cost summary) -->
      <v-card variant="outlined">
        <v-card-title class="text-subtitle-1 pa-3 bg-grey-lighten-4">
          <v-icon icon="mdi-clipboard-text" class="mr-2" />
          Request Details
        </v-card-title>

        <v-card-text class="pa-4">
          <v-row>
            <!-- Requested By -->
            <v-col cols="12" md="6">
              <v-text-field
                :model-value="requestedBy"
                label="Requested By"
                prepend-icon="mdi-account"
                :rules="[v => !!v || 'Requested by is required']"
                @update:model-value="$emit('update:requestedBy', $event)"
              />
            </v-col>

            <!-- Priority -->
            <v-col cols="12" md="6">
              <v-select
                :model-value="priority"
                :items="priorityOptions"
                label="Priority"
                prepend-icon="mdi-flag"
                @update:model-value="$emit('update:priority', $event)"
              />
            </v-col>
          </v-row>

          <!-- Summary Stats (quantity-focused, no costs) -->
          <v-row class="mt-2">
            <v-col cols="12" md="4">
              <div class="text-center">
                <div class="text-caption text-medium-emphasis">Total Items</div>
                <v-chip size="large" color="primary">
                  {{ selectedItems.length }}
                </v-chip>
              </div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-center">
                <div class="text-caption text-medium-emphasis">Urgent Items</div>
                <v-chip size="large" :color="urgentItemsCount > 0 ? 'error' : 'success'">
                  {{ urgentItemsCount }}
                </v-chip>
              </div>
            </v-col>
            <v-col cols="12" md="4">
              <div class="text-center">
                <div class="text-caption text-medium-emphasis">Categories</div>
                <v-chip size="large" color="info">
                  {{ uniqueCategories.length }}
                </v-chip>
              </div>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

// Props
interface Props {
  selectedItems: any[]
  requestedBy: string
  priority: string
}

const props = defineProps<Props>()

// Emits
defineEmits<{
  'update:requestedBy': [value: string]
  'update:priority': [value: string]
  updateItemQuantity: [item: any, quantity: number]
  removeItem: [itemId: string]
}>()

// Data
const priorityOptions = [
  { title: 'Low', value: 'low' },
  { title: 'Normal', value: 'normal' },
  { title: 'High', value: 'high' },
  { title: 'Urgent', value: 'urgent' }
]

// Computed
const urgentItemsCount = computed(() => {
  return props.selectedItems.filter(item => item.urgency === 'high' || item.priority === 'urgent')
    .length
})

const uniqueCategories = computed(() => {
  const categories = new Set(props.selectedItems.map(item => item.category || 'General'))
  return Array.from(categories)
})

// Methods
function formatQuantityForSummary(item: any): string {
  // Simple quantity formatting without complex conversions
  const quantity = item.requestedQuantity || item.suggestedQuantity || item.quantity || 0
  const unit = item.unit || 'units'

  if (quantity >= 1000 && (unit === 'g' || unit === 'gram')) {
    return `${(quantity / 1000).toFixed(1)}kg`
  }

  if (quantity >= 1000 && (unit === 'ml' || unit === 'milliliter')) {
    return `${(quantity / 1000).toFixed(1)}L`
  }

  return `${quantity}${unit}`
}

function getEditableQuantity(item: any): number {
  return item.requestedQuantity || item.suggestedQuantity || item.quantity || 0
}

function getItemUnit(item: any): string {
  return item.unit || 'units'
}
</script>

<style scoped>
.border-b {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
