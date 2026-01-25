<!-- src/views/backoffice/analytics/ProductVarianceDetailDialog.vue -->
<!-- Product Variance Detail Dialog - Shows preparation breakdown for a product -->

<template>
  <v-dialog v-model="dialogVisible" max-width="900" scrollable>
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <div>
          <span>Product Variance Detail</span>
          <div v-if="detail" class="text-body-2 text-medium-emphasis">
            {{ detail.product.name }}
            <span v-if="detail.product.code">({{ detail.product.code }})</span>
          </div>
        </div>
        <v-btn icon variant="text" @click="close">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>

      <v-divider />

      <!-- Loading State -->
      <v-card-text v-if="loading" class="text-center py-8">
        <v-progress-circular indeterminate color="primary" size="48" />
        <p class="mt-4 text-medium-emphasis">Loading details...</p>
      </v-card-text>

      <!-- Error State -->
      <v-card-text v-else-if="error" class="py-4">
        <v-alert type="error" variant="tonal">
          {{ error }}
        </v-alert>
      </v-card-text>

      <!-- Content -->
      <v-card-text v-else-if="detail" class="pa-4">
        <!-- Product Info & Period -->
        <v-row class="mb-4">
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="h-100">
              <v-card-text>
                <div class="text-overline text-medium-emphasis">Product Info</div>
                <div class="d-flex align-center mt-2">
                  <v-icon
                    :color="detail.product.department === 'kitchen' ? 'orange' : 'purple'"
                    class="mr-2"
                  >
                    {{
                      detail.product.department === 'kitchen'
                        ? 'mdi-chef-hat'
                        : 'mdi-glass-cocktail'
                    }}
                  </v-icon>
                  <div>
                    <div class="font-weight-medium">{{ detail.product.name }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ detail.product.code }} | {{ detail.product.unit }} |
                      {{ detail.product.department }}
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card variant="outlined" class="h-100">
              <v-card-text>
                <div class="text-overline text-medium-emphasis">Period</div>
                <div class="mt-2">
                  <div>
                    <span class="font-weight-medium">From:</span>
                    {{ formatDate(detail.period.dateFrom) }}
                  </div>
                  <div>
                    <span class="font-weight-medium">To:</span>
                    {{ formatDate(detail.period.dateTo) }}
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Summary Cards -->
        <v-row class="mb-4">
          <v-col cols="6" md="3">
            <v-card variant="tonal" color="success">
              <v-card-text class="text-center">
                <div class="text-caption">Direct Sales</div>
                <div class="text-h6">{{ formatIDR(detail.directSales.amount) }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ formatQty(detail.directSales.quantity) }} {{ detail.product.unit }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="tonal" color="error">
              <v-card-text class="text-center">
                <div class="text-caption">Direct Loss</div>
                <div class="text-h6">{{ formatIDR(detail.directLoss.amount) }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ formatQty(detail.directLoss.quantity) }} {{ detail.product.unit }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="tonal" color="primary">
              <v-card-text class="text-center">
                <div class="text-caption">Traced Sales</div>
                <div class="text-h6">{{ formatIDR(detail.tracedTotals.salesAmount) }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ formatQty(detail.tracedTotals.salesQuantity) }} {{ detail.product.unit }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6" md="3">
            <v-card variant="tonal" color="warning">
              <v-card-text class="text-center">
                <div class="text-caption">Traced Loss</div>
                <div class="text-h6">{{ formatIDR(detail.tracedTotals.lossAmount) }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ formatQty(detail.tracedTotals.lossQuantity) }} {{ detail.product.unit }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Loss by Reason -->
        <div v-if="detail.lossByReason.length > 0" class="mb-4">
          <div class="text-subtitle-2 mb-2">Loss Breakdown by Reason</div>
          <v-chip-group>
            <v-chip
              v-for="loss in detail.lossByReason"
              :key="loss.reason"
              color="error"
              variant="tonal"
              size="small"
            >
              {{ formatReason(loss.reason) }}: {{ formatIDR(loss.amount) }} ({{
                formatQty(loss.quantity)
              }}
              {{ detail.product.unit }})
            </v-chip>
          </v-chip-group>
        </div>

        <!-- Preparations Table -->
        <div v-if="detail.preparations.length > 0">
          <div class="text-subtitle-2 mb-2">Preparations Using This Product</div>
          <v-card variant="outlined">
            <v-data-table
              :headers="prepHeaders"
              :items="detail.preparations"
              density="compact"
              class="elevation-0"
              :items-per-page="-1"
              hide-default-footer
            >
              <!-- Preparation Name -->
              <template #[`item.preparationName`]="{ item }">
                <span class="font-weight-medium">{{ item.preparationName }}</span>
              </template>

              <!-- Production (used to make) -->
              <template #[`item.production`]="{ item }">
                <div class="stacked-cell">
                  <div>{{ formatQty(item.production.quantity) }} {{ detail.product.unit }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ formatIDR(item.production.amount) }}
                  </div>
                </div>
              </template>

              <!-- Traced Sales -->
              <template #[`item.tracedSales`]="{ item }">
                <div class="stacked-cell">
                  <div class="text-success">
                    {{ formatQty(item.tracedSales.quantity) }} {{ detail.product.unit }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ formatIDR(item.tracedSales.amount) }}
                  </div>
                </div>
              </template>

              <!-- Traced Loss -->
              <template #[`item.tracedLoss`]="{ item }">
                <div class="stacked-cell">
                  <div :class="{ 'text-error': item.tracedLoss.quantity > 0 }">
                    {{ formatQty(item.tracedLoss.quantity) }} {{ detail.product.unit }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ formatIDR(item.tracedLoss.amount) }}
                  </div>
                </div>
              </template>
            </v-data-table>
          </v-card>
        </div>

        <!-- No Preparations -->
        <v-alert v-else type="info" variant="tonal" class="mt-4">
          This product is not used in any preparations.
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="close">Close</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useVarianceReportStore } from '@/stores/analytics/varianceReportStore'
import { formatIDR } from '@/utils/currency'
import type { ProductVarianceDetail } from '@/stores/analytics/types'

// Props
const props = defineProps<{
  modelValue: boolean
  productId: string | null
  dateFrom: string
  dateTo: string
}>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

// Store
const store = useVarianceReportStore()

// State
const error = ref<string | null>(null)

// Computed
const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

const loading = computed(() => store.loadingDetail)
const detail = computed(() => store.currentDetail)

const prepHeaders = [
  { title: 'Preparation', key: 'preparationName', sortable: true },
  { title: 'Production', key: 'production', sortable: false, width: '140px' },
  { title: 'Traced Sales', key: 'tracedSales', sortable: false, width: '140px' },
  { title: 'Traced Loss', key: 'tracedLoss', sortable: false, width: '140px' }
]

// Watch for dialog open
watch(
  () => props.modelValue,
  async newValue => {
    if (newValue && props.productId) {
      error.value = null
      try {
        await store.getProductDetail(props.productId, props.dateFrom, props.dateTo)
      } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load product detail'
      }
    }
  }
)

// Methods
function close() {
  dialogVisible.value = false
}

function formatQty(value: number): string {
  if (Math.abs(value) < 0.001) return '0'
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0
  })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function formatReason(reason: string): string {
  const reasonMap: Record<string, string> = {
    expired: 'Expired',
    spoiled: 'Spoiled',
    expiration: 'Expiration',
    other: 'Other'
  }
  return reasonMap[reason] || reason
}
</script>

<style scoped lang="scss">
.stacked-cell {
  line-height: 1.3;
  padding: 4px 0;
}
</style>
