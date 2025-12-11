<!-- src/views/supplier_2/components/shared/QuickAddItemDialog.vue -->
<!-- Quick add item dialog - horizontal layout for tablet -->
<template>
  <v-dialog v-model="isOpen" max-width="720px" :persistent="false">
    <v-card v-if="product" class="quick-add-dialog">
      <!-- Compact Header -->
      <v-card-title class="d-flex align-center pa-3 bg-primary text-white">
        <v-avatar :color="getCategoryColor(product.category)" size="36" class="mr-2">
          <v-icon :icon="getCategoryIcon(product.category)" color="white" size="20" />
        </v-avatar>
        <div class="flex-grow-1">
          <div class="text-subtitle-1 font-weight-bold">{{ product.name }}</div>
          <div class="text-caption opacity-80">{{ getCategoryLabel(product.category) }}</div>
        </div>
        <!-- Stock Info Badge -->
        <div class="stock-badge mr-2 d-flex align-center">
          <v-icon size="14" class="mr-1" :class="getStockStatusClass()">
            {{ getStockStatusIcon() }}
          </v-icon>
          <span :class="getStockStatusClass()">{{ formatQuantityDisplay(currentStock) }}</span>
          <span class="opacity-60 ml-2">
            / Min: {{ formatQuantityDisplay(product.minStock || 0) }}
          </span>
        </div>
        <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog" />
      </v-card-title>

      <v-card-text class="pa-3">
        <!-- Main Grid: Package + Quantity | Price -->
        <div class="main-grid">
          <!-- Left Column: Package & Quantity -->
          <div class="left-column">
            <!-- Package Header Row -->
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-caption font-weight-medium text-medium-emphasis">PACKAGE</span>
              <v-btn
                variant="text"
                size="x-small"
                color="primary"
                density="compact"
                @click="showAddPackageDialog = true"
              >
                + Add
              </v-btn>
            </div>
            <!-- Package Select -->
            <v-select
              v-model="selectedPackageId"
              :items="packageOptions"
              item-title="displayName"
              item-value="id"
              variant="outlined"
              density="compact"
              hide-details
              :disabled="packageOptions.length === 0"
              :placeholder="packageOptions.length === 0 ? 'No packages' : 'Select'"
              class="mb-3"
            >
              <template #selection="{ item }">
                <span class="text-body-2">
                  {{ item.raw.packageName }} ({{ item.raw.packageSize }}{{ baseUnitLabel }})
                </span>
              </template>
            </v-select>

            <!-- Quantity -->
            <span class="text-caption font-weight-medium text-medium-emphasis">QUANTITY</span>
            <div class="quantity-row mt-1">
              <v-btn
                icon
                variant="tonal"
                color="error"
                size="small"
                :disabled="packageQuantity <= 1"
                @click="decrementQuantity"
              >
                <v-icon size="20">mdi-minus</v-icon>
              </v-btn>
              <v-text-field
                v-model.number="packageQuantity"
                type="number"
                min="1"
                variant="outlined"
                density="compact"
                hide-details
                class="quantity-input mx-2"
                :suffix="selectedPackage ? 'pkg' : baseUnitLabel"
              />
              <v-btn icon variant="tonal" color="success" size="small" @click="incrementQuantity">
                <v-icon size="20">mdi-plus</v-icon>
              </v-btn>
            </div>
            <div class="text-caption text-medium-emphasis mt-1">
              = {{ formatQuantityDisplay(totalBaseQuantity) }} total
            </div>
          </div>

          <!-- Right Column: Price -->
          <div class="right-column">
            <!-- Price Header Row (aligned with PACKAGE) -->
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="text-caption font-weight-medium text-medium-emphasis">PRICE</span>
              <v-btn-toggle
                v-model="priceMode"
                mandatory
                density="compact"
                divided
                variant="outlined"
              >
                <v-btn value="package" size="x-small" :disabled="!selectedPackage">/pkg</v-btn>
                <v-btn value="unit" size="x-small">/{{ baseUnitLabel }}</v-btn>
              </v-btn-toggle>
            </div>

            <!-- Price Input (aligned with Package Select) -->
            <v-text-field
              v-if="priceMode === 'package' && selectedPackage"
              v-model.number="pricePerPackage"
              type="number"
              min="0"
              variant="outlined"
              density="compact"
              hide-details
              prefix="Rp"
              class="mb-3"
            />
            <v-text-field
              v-else
              v-model.number="pricePerBaseUnit"
              type="number"
              min="0"
              step="0.01"
              variant="outlined"
              density="compact"
              hide-details
              prefix="Rp"
              class="mb-3"
            />

            <!-- Suggested & Calculated -->
            <div v-if="suggestedPrice > 0" class="text-caption text-medium-emphasis">
              Suggested: {{ formatCurrency(suggestedPrice) }}
              <v-btn variant="text" size="x-small" color="primary" @click="applySuggestedPrice">
                Use
              </v-btn>
            </div>
            <div v-if="calculatedOtherPrice" class="text-caption text-medium-emphasis">
              {{ calculatedOtherPrice }}
            </div>
          </div>
        </div>

        <!-- Notes (inline) -->
        <div v-if="showNotes" class="mt-3">
          <v-text-field
            v-model="notes"
            label="Notes"
            variant="outlined"
            density="compact"
            hide-details
            placeholder="Special requirements..."
          />
        </div>
        <v-btn
          v-else
          variant="text"
          size="x-small"
          prepend-icon="mdi-note-plus"
          color="grey"
          class="mt-2"
          @click="showNotes = true"
        >
          Add Notes
        </v-btn>

        <!-- Total Bar -->
        <div class="total-bar mt-3 pa-3 rounded d-flex align-center justify-space-between">
          <div>
            <span class="text-body-2 text-medium-emphasis">
              {{ packageQuantity }} {{ selectedPackage ? 'pkg' : baseUnitLabel }} ×
              {{ formatCurrency(effectivePricePerUnit) }}
            </span>
          </div>
          <div class="d-flex align-center gap-4">
            <span class="text-h5 font-weight-bold text-success">
              {{ formatCurrency(totalCost) }}
            </span>
            <v-btn
              color="success"
              variant="flat"
              prepend-icon="mdi-plus"
              :disabled="!canAdd"
              @click="handleAdd"
            >
              Add
            </v-btn>
          </div>
        </div>

        <!-- Warning if already added -->
        <v-alert
          v-if="isAlreadyAdded"
          type="warning"
          variant="tonal"
          density="compact"
          class="mt-2"
        >
          This item is already in your request
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Add Package Dialog -->
    <PackageOptionDialog
      v-model="showAddPackageDialog"
      :product-id="product?.id || ''"
      :base-unit="product?.baseUnit || 'gram'"
      :loading="packageDialogLoading"
      :product-base-cost="product?.baseCostPerUnit || 0"
      @save="handlePackageSaved"
    />
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { useStorageStore } from '@/stores/storage/storageStore'
import type { Product, PackageOption } from '@/stores/productsStore/types'
import PackageOptionDialog from '@/views/products/components/package/PackageOptionDialog.vue'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
  product: Product | null
  existingItemIds?: string[]
}

interface ManualItem {
  itemId: string
  itemName: string
  requestedQuantity: number
  unit: string
  packageId?: string
  packageName?: string
  packageQuantity?: number
  pricePerUnit?: number
  totalCost?: number
  notes?: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'add-item', item: ManualItem): void
}

const props = withDefaults(defineProps<Props>(), {
  existingItemIds: () => []
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

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

const selectedPackageId = ref<string | undefined>(undefined)
const packageQuantity = ref(1)
const priceMode = ref<'package' | 'unit'>('package')
const pricePerPackage = ref<number>(0)
const pricePerBaseUnit = ref<number>(0)
const notes = ref('')
const showNotes = ref(false)
const showAddPackageDialog = ref(false)
const packageDialogLoading = ref(false)

// =============================================
// COMPUTED
// =============================================

const currentStock = computed(() => {
  if (!props.product) return 0
  const balance = storageStore.state.balances.find(b => b.itemId === props.product!.id)
  return balance?.totalQuantity || props.product.currentStock || 0
})

const baseUnitLabel = computed(() => {
  if (!props.product) return ''
  const labels: Record<string, string> = {
    gram: 'g',
    ml: 'ml',
    piece: 'pc'
  }
  return labels[props.product.baseUnit] || props.product.baseUnit
})

const packageOptions = computed(() => {
  if (!props.product) return []
  const packages = productsStore.getActivePackages(props.product.id)
  return packages.map(pkg => ({
    ...pkg,
    displayName: pkg.brandName ? `${pkg.packageName} (${pkg.brandName})` : pkg.packageName
  }))
})

const selectedPackage = computed((): PackageOption | null => {
  if (!selectedPackageId.value) return null
  return packageOptions.value.find(p => p.id === selectedPackageId.value) || null
})

const suggestedPrice = computed(() => {
  if (priceMode.value === 'package' && selectedPackage.value) {
    if (selectedPackage.value.packagePrice && selectedPackage.value.packagePrice > 0) {
      return selectedPackage.value.packagePrice
    }
    return selectedPackage.value.baseCostPerUnit * selectedPackage.value.packageSize
  }
  if (props.product) {
    return props.product.baseCostPerUnit
  }
  return 0
})

const totalBaseQuantity = computed(() => {
  if (selectedPackage.value) {
    return packageQuantity.value * selectedPackage.value.packageSize
  }
  return packageQuantity.value
})

// Effective price per unit (package or base unit depending on mode)
const effectivePricePerUnit = computed(() => {
  if (priceMode.value === 'package' && selectedPackage.value) {
    return pricePerPackage.value || 0
  }
  return pricePerBaseUnit.value || 0
})

const totalCost = computed(() => {
  if (priceMode.value === 'package' && selectedPackage.value) {
    return packageQuantity.value * (pricePerPackage.value || 0)
  }
  // If using base unit price, multiply by total base quantity
  return totalBaseQuantity.value * (pricePerBaseUnit.value || 0)
})

// Show calculated other price (e.g. if entered per package, show per unit)
const calculatedOtherPrice = computed(() => {
  if (!selectedPackage.value) return null

  if (priceMode.value === 'package' && pricePerPackage.value > 0) {
    const perUnit = pricePerPackage.value / selectedPackage.value.packageSize
    return `= ${formatCurrency(perUnit)} per ${baseUnitLabel.value}`
  }

  if (priceMode.value === 'unit' && pricePerBaseUnit.value > 0) {
    const perPackage = pricePerBaseUnit.value * selectedPackage.value.packageSize
    return `= ${formatCurrency(perPackage)} per ${selectedPackage.value.packageName}`
  }

  return null
})

const isAlreadyAdded = computed(() => {
  if (!props.product) return false
  return props.existingItemIds.includes(props.product.id)
})

const canAdd = computed(() => {
  return props.product && packageQuantity.value > 0 && !isAlreadyAdded.value
})

// =============================================
// METHODS
// =============================================

function incrementQuantity() {
  packageQuantity.value++
}

function decrementQuantity() {
  if (packageQuantity.value > 1) {
    packageQuantity.value--
  }
}

function formatQuantityDisplay(value: number): string {
  if (!props.product) return `${value}`

  const baseUnit = props.product.baseUnit

  // Auto-convert to larger units
  if (baseUnit === 'gram' && value >= 1000) {
    return `${(value / 1000).toFixed(1)}kg`
  }
  if (baseUnit === 'ml' && value >= 1000) {
    return `${(value / 1000).toFixed(1)}L`
  }

  return `${Math.round(value)}${baseUnitLabel.value}`
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function getCategoryIcon(categoryId: string): string {
  const category = productsStore.categories.find(c => c.id === categoryId)
  return category?.icon || 'mdi-package-variant'
}

function getCategoryColor(categoryId: string): string {
  const category = productsStore.categories.find(c => c.id === categoryId)
  return category?.color || 'grey'
}

function getCategoryLabel(categoryId: string): string {
  return productsStore.getCategoryName(categoryId)
}

function getPackageIcon(pkg: PackageOption): string {
  const unitIcons: Record<string, string> = {
    pack: 'mdi-package-variant',
    box: 'mdi-package',
    bottle: 'mdi-bottle-wine',
    can: 'mdi-can',
    bag: 'mdi-shopping',
    kg: 'mdi-weight-kilogram',
    liter: 'mdi-water',
    piece: 'mdi-numeric-1-box'
  }
  return unitIcons[pkg.packageUnit] || 'mdi-package-variant'
}

function getStockStatusClass(): string {
  if (!props.product) return ''
  const min = props.product.minStock || 0

  if (currentStock.value <= 0) return 'text-error'
  if (currentStock.value <= min) return 'text-warning'
  return 'text-success'
}

function getStockStatusIcon(): string {
  if (!props.product) return 'mdi-help-circle'
  const min = props.product.minStock || 0

  if (currentStock.value <= 0) return 'mdi-alert-circle'
  if (currentStock.value <= min) return 'mdi-alert'
  return 'mdi-check-circle'
}

function resetForm() {
  selectedPackageId.value = undefined
  packageQuantity.value = 1
  priceMode.value = 'package'
  pricePerPackage.value = 0
  pricePerBaseUnit.value = 0
  notes.value = ''
  showNotes.value = false
}

function applySuggestedPrice() {
  if (priceMode.value === 'package') {
    pricePerPackage.value = suggestedPrice.value
  } else {
    pricePerBaseUnit.value = suggestedPrice.value
  }
}

async function handlePackageSaved(packageData: any) {
  packageDialogLoading.value = true
  try {
    const newPackage = await productsStore.addPackageOption(packageData)
    // Auto-select new package
    selectedPackageId.value = newPackage.id
    priceMode.value = 'package'
    showAddPackageDialog.value = false
  } catch (error) {
    console.error('Failed to create package:', error)
  } finally {
    packageDialogLoading.value = false
  }
}

function closeDialog() {
  isOpen.value = false
  resetForm()
}

function handleAdd() {
  if (!props.product || !canAdd.value) return

  // Calculate actual price per base unit for storage
  let actualPricePerUnit = pricePerBaseUnit.value
  if (priceMode.value === 'package' && selectedPackage.value && pricePerPackage.value > 0) {
    actualPricePerUnit = pricePerPackage.value / selectedPackage.value.packageSize
  }

  const item: ManualItem = {
    itemId: props.product.id,
    itemName: props.product.name,
    requestedQuantity: totalBaseQuantity.value,
    unit: baseUnitLabel.value,
    packageId: selectedPackageId.value,
    packageName: selectedPackage.value?.packageName,
    packageQuantity: selectedPackage.value ? packageQuantity.value : undefined,
    pricePerUnit: actualPricePerUnit || undefined,
    totalCost: totalCost.value || undefined,
    notes: notes.value || undefined
  }

  emits('add-item', item)
  closeDialog()
}

// =============================================
// WATCHERS
// =============================================

// Initialize when product changes
watch(
  () => props.product,
  newProduct => {
    if (newProduct && isOpen.value) {
      resetForm()

      // Wait for packageOptions to be computed
      setTimeout(() => {
        const packages = productsStore.getActivePackages(newProduct.id)

        // Auto-select recommended package or first available
        const recommendedId = newProduct.recommendedPackageId
        if (recommendedId && packages.find(p => p.id === recommendedId)) {
          selectedPackageId.value = recommendedId
          priceMode.value = 'package'
        } else if (packages.length > 0) {
          selectedPackageId.value = packages[0].id
          priceMode.value = 'package'
        } else {
          // No packages - use unit price mode
          priceMode.value = 'unit'
          pricePerBaseUnit.value = newProduct.baseCostPerUnit || 0
        }
      }, 0)
    }
  },
  { immediate: true }
)

// Also watch dialog open to initialize
watch(isOpen, newValue => {
  if (newValue && props.product) {
    resetForm()

    setTimeout(() => {
      const packages = productsStore.getActivePackages(props.product!.id)
      const recommendedId = props.product!.recommendedPackageId

      if (recommendedId && packages.find(p => p.id === recommendedId)) {
        selectedPackageId.value = recommendedId
        priceMode.value = 'package'
      } else if (packages.length > 0) {
        selectedPackageId.value = packages[0].id
        priceMode.value = 'package'
      } else {
        priceMode.value = 'unit'
        pricePerBaseUnit.value = props.product!.baseCostPerUnit || 0
      }
    }, 0)
  }
})

// Update price when package changes
watch(selectedPackageId, newPackageId => {
  if (newPackageId && selectedPackage.value) {
    // Set package price from package data
    if (selectedPackage.value.packagePrice && selectedPackage.value.packagePrice > 0) {
      pricePerPackage.value = selectedPackage.value.packagePrice
    } else {
      pricePerPackage.value =
        selectedPackage.value.baseCostPerUnit * selectedPackage.value.packageSize
    }
    priceMode.value = 'package'
  } else if (props.product) {
    priceMode.value = 'unit'
    pricePerBaseUnit.value = props.product.baseCostPerUnit || 0
  }
})

// When switching price mode, sync prices
watch(priceMode, newMode => {
  if (newMode === 'unit' && pricePerPackage.value > 0 && selectedPackage.value) {
    // Calculate unit price from package price
    pricePerBaseUnit.value = pricePerPackage.value / selectedPackage.value.packageSize
  } else if (newMode === 'package' && pricePerBaseUnit.value > 0 && selectedPackage.value) {
    // Calculate package price from unit price
    pricePerPackage.value = pricePerBaseUnit.value * selectedPackage.value.packageSize
  }
})
</script>

<style scoped lang="scss">
.quick-add-dialog {
  // Stock badge in header
  .stock-badge {
    text-align: right;
    padding: 4px 12px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
  }

  // Main two-column grid
  .main-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    align-items: start;
  }

  .left-column,
  .right-column {
    display: flex;
    flex-direction: column;
  }

  .quantity-row {
    display: flex;
    align-items: center;
  }

  .quantity-input {
    flex: 1;
    min-width: 100px;
    max-width: 140px;

    :deep(.v-field__input) {
      text-align: center;
      font-size: 1.1rem;
      font-weight: bold;
    }
  }

  .total-bar {
    border: 2px solid rgba(var(--v-theme-success), 0.3);
    background: rgba(var(--v-theme-success), 0.08);
  }

  .text-medium-emphasis {
    opacity: 0.7;
  }

  .gap-3 {
    gap: 12px;
  }

  .gap-4 {
    gap: 16px;
  }

  .w-100 {
    width: 100%;
  }

  // Mobile: stack vertically
  @media (max-width: 600px) {
    .main-grid {
      grid-template-columns: 1fr;
      gap: 16px;
    }
  }
}
</style>
