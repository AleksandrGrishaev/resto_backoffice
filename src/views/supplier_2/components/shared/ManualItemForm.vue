<template>
  <v-card>
    <v-card-title class="text-subtitle-1 pa-3 bg-grey-lighten-4">
      <v-icon icon="mdi-plus" class="mr-2" />
      Add Manual Item
    </v-card-title>

    <v-card-text class="pa-4">
      <!-- Step 1: Product Search -->
      <v-expansion-panels v-model="expandedPanels" variant="accordion" class="mb-4">
        <v-expansion-panel value="search">
          <v-expansion-panel-title>
            <div class="d-flex align-center">
              <v-icon icon="mdi-numeric-1-circle" color="primary" class="mr-2" />
              <span class="font-weight-bold">Select Product</span>
              <v-chip
                v-if="selectedProduct"
                size="small"
                color="success"
                variant="flat"
                class="ml-3"
              >
                <v-icon icon="mdi-check" size="16" class="mr-1" />
                {{ selectedProduct.name }}
              </v-chip>
            </div>
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <ItemSearchWidget
              :products="availableProductsForSearch"
              :existing-item-ids="existingItemIds"
              :show-supplier-filter="false"
              :show-stock-filter="true"
              :show-stock-info="true"
              :items-per-page="10"
              @product-selected="handleProductSelection"
            />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <!-- Step 2: Configure Order (shown after product selected) -->
      <v-expand-transition>
        <v-card v-if="localItem.itemId && selectedProduct" variant="outlined" class="mb-4">
          <v-card-title class="text-subtitle-2 pa-3 bg-grey-lighten-4 d-flex align-center">
            <v-icon icon="mdi-numeric-2-circle" color="primary" class="mr-2" />
            Configure Order
          </v-card-title>
          <v-card-text class="pa-4">
            <v-row>
              <!-- Package Selector -->
              <v-col cols="12">
                <PackageSelector
                  :product-id="localItem.itemId"
                  :required-base-quantity="estimatedBaseQuantity"
                  :selected-package-id="localItem.packageId"
                  mode="optional"
                  @package-selected="handlePackageSelected"
                  @update:selected-package-id="localItem.packageId = $event"
                />
              </v-col>

              <!-- Base Quantity Input -->
              <v-col cols="12" md="6">
                <v-text-field
                  v-model.number="localItem.requestedQuantity"
                  label="Quantity *"
                  type="number"
                  min="1"
                  step="1"
                  variant="outlined"
                  :suffix="baseUnitLabel"
                  hint="Enter quantity in base units"
                  persistent-hint
                  prepend-inner-icon="mdi-counter"
                />
              </v-col>

              <!-- Notes -->
              <v-col cols="12">
                <v-textarea
                  v-model="localItem.notes"
                  label="Notes (optional)"
                  variant="outlined"
                  rows="2"
                  prepend-inner-icon="mdi-note-text"
                  placeholder="Add any special requirements or notes..."
                />
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-expand-transition>

      <v-row>
        <!-- Preview Card -->
        <v-col v-if="localItem.itemId && localItem.requestedQuantity > 0" cols="12">
          <v-card variant="tonal" color="info">
            <v-card-text class="pa-3">
              <div class="d-flex justify-space-between align-center mb-2">
                <div class="text-subtitle-2 font-weight-bold">Preview</div>
                <v-chip
                  v-if="selectedPackageInfo"
                  size="small"
                  color="success"
                  variant="flat"
                  prepend-icon="mdi-package-variant"
                >
                  {{ selectedPackageInfo.packageName }}
                </v-chip>
              </div>

              <v-divider class="mb-2" />

              <div class="d-flex justify-space-between align-center">
                <div>
                  <div class="text-body-1 font-weight-bold">
                    {{ selectedProduct?.name }}
                  </div>
                  <div class="text-body-2 text-medium-emphasis">
                    {{ formatQuantity(localItem.requestedQuantity) }} {{ baseUnitLabel }}
                  </div>
                  <div v-if="selectedPackageInfo" class="text-caption text-medium-emphasis">
                    ≈ {{ selectedPackageInfo.packageQuantity }} ×
                    {{ selectedPackageInfo.packageName }}
                  </div>
                </div>
                <div class="text-right">
                  <div class="text-caption text-medium-emphasis">Estimated Cost</div>
                  <div class="text-h6 font-weight-bold text-primary">
                    {{ formatCurrency(estimatedCost) }}
                  </div>
                  <div v-if="selectedPackageInfo?.totalCost" class="text-caption">
                    ({{ formatCurrency(selectedPackageInfo.totalCost) }} for packages)
                  </div>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Validation Messages -->
        <v-col v-if="validationMessage" cols="12">
          <v-alert :type="validationMessage.type" density="compact" variant="tonal">
            {{ validationMessage.text }}
          </v-alert>
        </v-col>
      </v-row>
    </v-card-text>

    <v-card-actions class="pa-4">
      <v-btn variant="outlined" prepend-icon="mdi-refresh" @click="resetForm">Reset</v-btn>
      <v-spacer />
      <v-btn color="success" prepend-icon="mdi-plus" :disabled="!canAdd" @click="handleAdd">
        Add to Request
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { useStorageStore } from '@/stores/storage/storageStore'
import type { Product } from '@/stores/productsStore/types'
import PackageSelector from './package/PackageSelector.vue'
import ItemSearchWidget from '../procurement/ItemSearchWidget.vue'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  existingItemIds?: string[]
  loading?: boolean
}

interface ManualItem {
  itemId: string
  itemName: string
  requestedQuantity: number
  unit: string
  packageId?: string
  packageName?: string
  packageQuantity?: number
  notes?: string
}

interface Emits {
  (e: 'add-item', item: ManualItem): void
  (e: 'error', message: string): void
}

const props = withDefaults(defineProps<Props>(), {
  existingItemIds: () => [],
  loading: false
})

const emits = defineEmits<Emits>()

// =============================================
// STORES
// =============================================

const productsStore = useProductsStore()
const storageStore = useStorageStore()

// =============================================
// LOCAL STATE
// =============================================

const expandedPanels = ref<string[]>(['search'])

const localItem = ref<ManualItem>({
  itemId: '',
  itemName: '',
  requestedQuantity: 1,
  unit: '',
  notes: ''
})

const selectedPackageData = ref<{
  packageId: string
  packageQuantity: number
  resultingBaseQuantity: number
  totalCost: number
} | null>(null)

// =============================================
// COMPUTED
// =============================================

const availableProductsForSearch = computed(() => {
  const activeProducts = productsStore.products.filter(p => p.isActive)

  // Enrich products with currentStock from storageStore
  return activeProducts.map(product => {
    const balance = storageStore.state.balances.find(b => b.itemId === product.id)

    return {
      ...product,
      currentStock: balance?.totalQuantity || 0,
      minStock: product.minStock || 0
    }
  })
})

const selectedProduct = computed((): Product | null => {
  if (!localItem.value.itemId) return null
  return productsStore.getProductById(localItem.value.itemId)
})

const baseUnitLabel = computed(() => {
  if (!selectedProduct.value) return ''
  return getBaseUnitLabel(selectedProduct.value)
})

const estimatedBaseQuantity = computed(() => {
  return localItem.value.requestedQuantity || 1
})

const estimatedCost = computed(() => {
  if (!selectedProduct.value) return 0
  return selectedProduct.value.baseCostPerUnit * localItem.value.requestedQuantity
})

const selectedPackageInfo = computed(() => {
  if (!selectedPackageData.value || !selectedProduct.value) return null

  const pkg = productsStore.getPackageById(selectedPackageData.value.packageId)
  if (!pkg) return null

  return {
    packageId: pkg.id,
    packageName: pkg.packageName,
    packageQuantity: selectedPackageData.value.packageQuantity,
    totalCost: selectedPackageData.value.totalCost
  }
})

const validationMessage = computed(() => {
  if (!localItem.value.itemId) return null

  if (props.existingItemIds.includes(localItem.value.itemId)) {
    return {
      type: 'warning' as const,
      text: 'This item is already in your request'
    }
  }

  if (localItem.value.requestedQuantity <= 0) {
    return {
      type: 'error' as const,
      text: 'Quantity must be greater than 0'
    }
  }

  if (selectedProduct.value?.baseUnit === 'piece') {
    if (localItem.value.requestedQuantity % 1 !== 0) {
      return {
        type: 'error' as const,
        text: 'Piece quantities must be whole numbers'
      }
    }
  }

  return null
})

const canAdd = computed(() => {
  return (
    localItem.value.itemId !== '' &&
    localItem.value.requestedQuantity > 0 &&
    !props.existingItemIds.includes(localItem.value.itemId) &&
    !validationMessage.value?.type.includes('error')
  )
})

// =============================================
// METHODS
// =============================================

function getBaseUnitLabel(product: Product): string {
  const labels: Record<string, string> = {
    gram: 'g',
    ml: 'ml',
    piece: 'pc'
  }
  return labels[product.baseUnit] || product.baseUnit
}

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

function handleProductSelection(product: Product) {
  // Update local item with selected product
  localItem.value.itemId = product.id
  localItem.value.itemName = product.name
  localItem.value.unit = getBaseUnitLabel(product)

  // Reset package selection when product changes
  localItem.value.packageId = undefined
  localItem.value.packageName = undefined
  localItem.value.packageQuantity = undefined
  selectedPackageData.value = null

  // Set recommended package as default
  const recommendedPackage = productsStore.getRecommendedPackage(product.id)
  if (recommendedPackage) {
    localItem.value.packageId = recommendedPackage.id
  }

  // Collapse the search panel after selection
  expandedPanels.value = []
}

function handlePackageSelected(data: {
  packageId: string
  packageQuantity: number
  resultingBaseQuantity: number
  totalCost: number
}) {
  selectedPackageData.value = data

  const pkg = productsStore.getPackageById(data.packageId)
  if (pkg) {
    localItem.value.packageId = pkg.id
    localItem.value.packageName = pkg.packageName
    localItem.value.packageQuantity = data.packageQuantity
  }

  // Optionally update base quantity to match package quantity
  // Uncomment if you want auto-adjustment:
  // localItem.value.requestedQuantity = data.resultingBaseQuantity
}

function handleAdd() {
  if (!canAdd.value) return

  const itemToAdd: ManualItem = {
    itemId: localItem.value.itemId,
    itemName: localItem.value.itemName,
    requestedQuantity: localItem.value.requestedQuantity,
    unit: localItem.value.unit,
    packageId: localItem.value.packageId,
    packageName: localItem.value.packageName,
    packageQuantity: localItem.value.packageQuantity,
    notes: localItem.value.notes || undefined
  }

  emits('add-item', itemToAdd)
  resetForm()
}

function resetForm() {
  localItem.value = {
    itemId: '',
    itemName: '',
    requestedQuantity: 1,
    unit: '',
    notes: ''
  }
  selectedPackageData.value = null
  expandedPanels.value = ['search']
}

// =============================================
// WATCHERS
// =============================================

watch(
  () => localItem.value.requestedQuantity,
  newQty => {
    // Recalculate package selection when quantity changes
    if (newQty > 0 && selectedPackageData.value) {
      // Package selector will auto-recalculate through its own watchers
    }
  }
)
</script>

<style scoped>
.text-medium-emphasis {
  opacity: 0.7;
}
</style>
