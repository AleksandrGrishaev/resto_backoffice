<template>
  <div class="request-summary-panel">
    <!-- Empty State -->
    <div v-if="items.length === 0" class="text-center pa-8">
      <v-icon icon="mdi-cart-outline" size="64" color="grey" class="mb-4" />
      <div class="text-h6 mb-2">No Items Selected</div>
      <div class="text-body-2 text-medium-emphasis">
        Add items from suggestions or manually to create a request
      </div>
    </div>

    <!-- Items List -->
    <div v-else>
      <v-card variant="outlined" class="mb-4">
        <v-card-title class="text-subtitle-1 pa-3 bg-primary-lighten-5">
          <v-icon icon="mdi-cart" class="mr-2" />
          Selected Items ({{ items.length }})
        </v-card-title>
        <v-divider />

        <div class="pa-3">
          <div
            v-for="(item, index) in items"
            :key="item.itemId"
            class="item-row py-3"
            :class="{ 'border-b': index < items.length - 1 }"
          >
            <!-- Product Name and Package Info -->
            <div class="item-header">
              <div class="font-weight-bold text-subtitle-2">{{ item.itemName }}</div>
              <div class="text-body-2 text-medium-emphasis">
                {{ formatQuantity(item.requestedQuantity) }} {{ item.unit }}
              </div>
              <div v-if="item.notes" class="text-caption text-medium-emphasis mt-1">
                <v-icon size="14" class="mr-1">mdi-note-text</v-icon>
                {{ item.notes }}
              </div>
            </div>

            <!-- Package Display Area -->
            <div class="package-display">
              <div v-if="getPackageInfo(item)" class="package-info-card">
                <v-icon size="16" color="success" class="mr-1">mdi-package-variant</v-icon>
                <div class="package-details">
                  <div class="text-caption font-weight-bold">{{ getPackageInfo(item)?.name }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ getPackageInfo(item)?.quantity }} × {{ getPackageInfo(item)?.size }}
                  </div>
                </div>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  @click="togglePackageSelector(item.itemId)"
                >
                  <v-icon size="16">mdi-pencil</v-icon>
                </v-btn>
              </div>

              <v-btn
                v-else-if="hasPackages(item.itemId)"
                size="small"
                variant="outlined"
                prepend-icon="mdi-package-variant"
                @click="togglePackageSelector(item.itemId)"
              >
                Select Package
              </v-btn>

              <div v-else class="text-caption text-medium-emphasis">No packages available</div>
            </div>

            <!-- Quantity and Actions -->
            <div class="item-actions">
              <v-text-field
                :model-value="item.requestedQuantity"
                type="number"
                min="1"
                step="1"
                hide-details
                density="compact"
                variant="outlined"
                class="quantity-input"
                :suffix="item.unit"
                @update:model-value="updateQuantity(item.itemId, $event)"
              />

              <div class="cost-display">
                <div class="text-caption text-medium-emphasis">Cost</div>
                <div class="font-weight-bold">
                  {{ formatCurrency(getItemCost(item)) }}
                </div>
              </div>

              <v-btn
                icon="mdi-close"
                size="small"
                variant="text"
                color="error"
                @click="removeItem(item.itemId)"
              />
            </div>

            <!-- Package Selector Expansion -->
            <v-expand-transition>
              <div
                v-if="showPackageSelector === item.itemId"
                class="package-selector-container mt-3"
              >
                <PackageSelector
                  :product-id="item.itemId"
                  :required-base-quantity="item.requestedQuantity"
                  :selected-package-id="item.packageId"
                  mode="optional"
                  @package-selected="handlePackageSelected(item.itemId, $event)"
                  @update:selected-package-id="updatePackageId(item.itemId, $event)"
                />
              </div>
            </v-expand-transition>
          </div>
        </div>
      </v-card>

      <!-- Request Details Form -->
      <v-card variant="outlined" class="mb-4">
        <v-card-title class="text-subtitle-1 pa-3 bg-grey-lighten-4">
          <v-icon icon="mdi-information" class="mr-2" />
          Request Details
        </v-card-title>

        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="6">
              <v-text-field
                :model-value="requestedBy"
                label="Requested By *"
                variant="outlined"
                prepend-inner-icon="mdi-account"
                @update:model-value="$emit('update:requested-by', $event)"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                :model-value="priority"
                :items="priorityOptions"
                label="Priority"
                variant="outlined"
                prepend-inner-icon="mdi-flag"
                @update:model-value="$emit('update:priority', $event)"
              />
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>

      <!-- Summary Card -->
      <v-card variant="outlined">
        <v-card-text class="pa-4">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="text-body-2 text-medium-emphasis">Total Items</div>
              <div class="text-h6 font-weight-bold">{{ items.length }}</div>
            </div>

            <div class="summary-item">
              <div class="text-body-2 text-medium-emphasis">Items with Packages</div>
              <div class="text-h6 font-weight-bold">
                {{ itemsWithPackages }}
              </div>
            </div>

            <div class="summary-item">
              <div class="text-body-2 text-medium-emphasis">Avg. Cost per Item</div>
              <div class="text-h6 font-weight-bold">
                {{ formatCurrency(totalCost / items.length) }}
              </div>
            </div>

            <div class="summary-item">
              <div class="text-body-2 text-medium-emphasis">Estimated Total</div>
              <div class="text-h6 font-weight-bold text-primary">
                {{ formatCurrency(totalCost) }}
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import type { RequestItem } from '@/stores/supplier_2/types'
import PackageSelector from './package/PackageSelector.vue'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  items: RequestItem[]
  requestedBy: string
  priority: 'normal' | 'urgent'
}

interface Emits {
  (e: 'update:requested-by', value: string): void
  (e: 'update:priority', value: 'normal' | 'urgent'): void
  (e: 'update-quantity', itemId: string, quantity: number): void
  (
    e: 'update-package',
    itemId: string,
    packageData: {
      packageId?: string
      packageName?: string
      packageQuantity?: number
    }
  ): void
  (e: 'remove-item', itemId: string): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// STORES
// =============================================

const productsStore = useProductsStore()

// =============================================
// LOCAL STATE
// =============================================

const showPackageSelector = ref<string | null>(null)

const priorityOptions = [
  { title: 'Normal Priority', value: 'normal' },
  { title: 'Urgent Priority', value: 'urgent' }
]

// =============================================
// COMPUTED
// =============================================

const totalCost = computed(() => {
  return props.items.reduce((sum, item) => sum + getItemCost(item), 0)
})

const itemsWithPackages = computed(() => {
  return props.items.filter(item => item.packageId).length
})

// =============================================
// METHODS
// =============================================

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}

function getItemCost(item: RequestItem): number {
  const product = productsStore.getProductById(item.itemId)
  if (!product) return 0
  return product.baseCostPerUnit * item.requestedQuantity
}

function hasPackages(itemId: string): boolean {
  const packages = productsStore.getActivePackages(itemId)
  return packages.length > 0
}

function getPackageInfo(item: RequestItem): {
  name: string
  quantity: number
  size: string
} | null {
  const product = productsStore.getProductById(item.itemId)
  if (!product) return null

  // If package selected, show it
  if (item.packageId) {
    const pkg = productsStore.getPackageById(item.packageId)
    if (pkg) {
      const calculation = productsStore.calculatePackageQuantity(
        item.itemId,
        item.requestedQuantity,
        pkg.id
      )
      return {
        name: pkg.packageName,
        quantity: calculation.suggestedPackages,
        size: `${pkg.packageSize}${getUnitLabel(product.baseUnit)}`
      }
    }
  }

  // Show base package by default
  const baseUnitLabel = getUnitLabel(product.baseUnit)
  return {
    name: getBasePackageName(product.baseUnit),
    quantity: item.requestedQuantity,
    size: `1${baseUnitLabel}`
  }
}

function getBasePackageName(baseUnit: string): string {
  const names: Record<string, string> = {
    gram: 'Base Unit (gram)',
    ml: 'Base Unit (ml)',
    piece: 'Base Unit (piece)'
  }
  return names[baseUnit] || 'Base Unit'
}

function getUnitLabel(baseUnit: string): string {
  const labels: Record<string, string> = {
    gram: 'g',
    ml: 'ml',
    piece: 'pc'
  }
  return labels[baseUnit] || baseUnit
}

function togglePackageSelector(itemId: string): void {
  showPackageSelector.value = showPackageSelector.value === itemId ? null : itemId
}

function updateQuantity(itemId: string, value: string | number): void {
  const quantity = typeof value === 'string' ? parseInt(value) : Math.round(value)
  if (quantity > 0 && !isNaN(quantity)) {
    emits('update-quantity', itemId, quantity)
  }
}

function updatePackageId(itemId: string, packageId: string | undefined): void {
  if (!packageId) {
    emits('update-package', itemId, {
      packageId: undefined,
      packageName: undefined,
      packageQuantity: undefined
    })
    return
  }

  const pkg = productsStore.getPackageById(packageId)
  if (pkg) {
    emits('update-package', itemId, {
      packageId: pkg.id,
      packageName: pkg.packageName,
      packageQuantity: undefined
    })
  }
}

function handlePackageSelected(
  itemId: string,
  data: {
    packageId: string
    packageQuantity: number
    resultingBaseQuantity: number
    totalCost: number
  }
): void {
  const pkg = productsStore.getPackageById(data.packageId)
  if (pkg) {
    emits('update-package', itemId, {
      packageId: pkg.id,
      packageName: pkg.packageName,
      packageQuantity: data.packageQuantity
    })
  }

  // ❌ УБРАТЬ эту строку:
  // showPackageSelector.value = null

  // ✅ Пусть пользователь сам закроет selector
}

function removeItem(itemId: string): void {
  emits('remove-item', itemId)
}
</script>

<style scoped lang="scss">
.request-summary-panel {
  .item-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    grid-template-areas:
      'header package actions'
      'selector selector selector';
    gap: 16px;
    align-items: start;
  }

  .item-header {
    grid-area: header;
  }

  .package-display {
    grid-area: package;
    min-width: 200px;
  }

  .item-actions {
    grid-area: actions;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .package-selector-container {
    grid-area: selector;
  }

  .package-info-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background-color: rgb(var(--v-theme-success), 0.1);
    border: 1px solid rgb(var(--v-theme-success), 0.3);
    border-radius: 8px;
  }

  .package-details {
    flex: 1;
  }

  .quantity-input {
    width: auto;
    min-width: 120px;
    max-width: 150px;

    :deep(.v-field__input) {
      text-align: center;
    }
  }

  .cost-display {
    text-align: right;
    min-width: 100px;
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 16px;
  }

  .summary-item {
    text-align: center;
  }

  .border-b {
    border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  }

  .text-medium-emphasis {
    opacity: 0.7;
  }
}

@media (max-width: 960px) {
  .request-summary-panel {
    .item-row {
      grid-template-columns: 1fr;
      grid-template-areas:
        'header'
        'package'
        'actions'
        'selector';
      gap: 12px;
    }

    .item-actions {
      justify-content: space-between;
    }

    .package-display {
      min-width: unset;
    }
  }
}
</style>
