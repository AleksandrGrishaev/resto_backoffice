<!-- src/views/kitchen/request/components/package/PackageSelector.vue -->
<!-- Copy from supplier_2 for Kitchen Monitor -->
<template>
  <!-- Vertical Layout -->
  <div v-if="layout === 'vertical'" class="package-selector-vertical">
    <!-- Loading State -->
    <v-skeleton-loader v-if="loading" type="list-item-two-line" />

    <!-- Error State -->
    <v-alert v-else-if="error" type="error" variant="tonal" density="compact">
      {{ error }}
    </v-alert>

    <!-- Package Options as Cards -->
    <div v-else-if="availablePackages.length > 0">
      <div class="text-subtitle-2 font-weight-bold mb-2">Package Selection</div>
      <div class="text-caption text-medium-emphasis mb-3">
        Required: {{ formatQuantity(requiredBaseQuantity) }} {{ getBaseUnitLabel() }}
      </div>

      <div class="packages-grid">
        <v-card
          v-for="pkg in availablePackages"
          :key="pkg.id"
          :variant="internalSelectedPackageId === pkg.id ? 'tonal' : 'outlined'"
          :color="internalSelectedPackageId === pkg.id ? 'primary' : undefined"
          class="package-card"
          :class="{ 'package-card--selected': internalSelectedPackageId === pkg.id }"
          @click="selectPackage(pkg.id)"
        >
          <v-card-text class="pa-3">
            <div class="d-flex align-center justify-space-between mb-2">
              <div class="d-flex align-center gap-2">
                <v-avatar
                  :color="internalSelectedPackageId === pkg.id ? 'primary' : 'grey-lighten-2'"
                  size="32"
                >
                  <v-icon
                    :color="internalSelectedPackageId === pkg.id ? 'white' : 'grey'"
                    size="20"
                  >
                    {{ getPackageIcon(pkg) }}
                  </v-icon>
                </v-avatar>

                <div>
                  <div class="text-subtitle-2 font-weight-bold">{{ pkg.packageName }}</div>
                  <div v-if="pkg.brandName" class="text-caption text-medium-emphasis">
                    {{ pkg.brandName }}
                  </div>
                </div>
              </div>

              <v-icon v-if="internalSelectedPackageId === pkg.id" color="primary" size="20">
                mdi-check-circle
              </v-icon>
            </div>

            <v-divider class="my-2" />

            <div class="d-flex justify-space-between align-center">
              <div>
                <div class="text-caption text-medium-emphasis">Package size</div>
                <div class="text-body-2 font-weight-medium">
                  {{ pkg.packageSize }} {{ getBaseUnitLabel() }}
                </div>
              </div>

              <div class="text-right">
                <div class="text-caption text-medium-emphasis">Quantity</div>
                <div class="text-body-1 font-weight-bold text-primary">
                  {{ getPackageCalculation(pkg).suggestedPackages }} pkg
                </div>
              </div>
            </div>

            <div v-if="pkg.packagePrice || pkg.baseCostPerUnit" class="mt-2">
              <div class="d-flex justify-space-between">
                <span class="text-caption text-medium-emphasis">Price per package:</span>
                <span class="text-caption font-weight-medium">
                  {{ formatCurrency(getPackagePrice(pkg)) }}
                </span>
              </div>
              <div class="d-flex justify-space-between">
                <span class="text-caption text-medium-emphasis">Total:</span>
                <span class="text-body-2 font-weight-bold">
                  {{
                    formatCurrency(
                      getPackagePrice(pkg) * getPackageCalculation(pkg).suggestedPackages
                    )
                  }}
                </span>
              </div>
            </div>

            <v-chip
              v-if="pkg.id === recommendedPackageId"
              size="x-small"
              color="success"
              variant="flat"
              class="mt-2"
            >
              Recommended
            </v-chip>
          </v-card-text>
        </v-card>
      </div>

      <!-- Add New Package Button -->
      <v-btn
        v-if="allowAddPackage"
        variant="outlined"
        color="primary"
        prepend-icon="mdi-plus"
        class="mt-3 w-100"
        @click="showAddPackageDialog = true"
      >
        Add New Package
      </v-btn>

      <!-- Mode-specific hints -->
      <v-alert
        v-if="mode === 'optional'"
        type="info"
        variant="tonal"
        density="compact"
        class="mt-3"
      >
        <div class="text-caption">
          Package selection is optional. Selected package helps with ordering later.
        </div>
      </v-alert>

      <v-alert
        v-if="mode === 'required' && !internalSelectedPackageId"
        type="warning"
        variant="tonal"
        density="compact"
        class="mt-3"
      >
        <div class="text-caption">Please select a package before proceeding with the order.</div>
      </v-alert>
    </div>

    <!-- No Packages Available -->
    <v-alert v-else type="warning" variant="tonal" density="compact" class="mb-3">
      <div class="text-body-2">No packages available for this product.</div>
      <div class="text-caption">Add a package to continue.</div>
    </v-alert>

    <!-- Add Package Button when no packages exist -->
    <v-btn
      v-if="availablePackages.length === 0 && allowAddPackage"
      variant="flat"
      color="primary"
      prepend-icon="mdi-plus"
      class="w-100"
      @click="showAddPackageDialog = true"
    >
      Add First Package
    </v-btn>
  </div>

  <!-- Horizontal Layout -->
  <div v-else class="package-selector-horizontal">
    <!-- Loading State -->
    <div v-if="loading" class="d-flex align-center gap-3">
      <v-skeleton-loader type="chip" class="flex-grow-1" />
      <v-skeleton-loader type="chip" width="80" />
      <v-skeleton-loader type="chip" width="100" />
    </div>

    <!-- Error State -->
    <v-alert v-else-if="error" type="error" variant="tonal" density="compact">
      {{ error }}
    </v-alert>

    <!-- Main Content -->
    <div v-else-if="availablePackages.length > 0" class="d-flex align-center gap-3 flex-wrap">
      <!-- Package dropdown -->
      <v-select
        :model-value="internalSelectedPackageId"
        :items="packageOptions"
        item-title="displayName"
        item-value="id"
        label="Package"
        variant="outlined"
        density="compact"
        hide-details
        class="flex-grow-1"
        style="min-width: 180px; max-width: 300px"
        @update:model-value="selectPackage"
      >
        <template #item="{ props: itemProps, item }">
          <v-list-item v-bind="itemProps">
            <template #prepend>
              <v-icon size="20">{{ getPackageIcon(item.raw) }}</v-icon>
            </template>
            <v-list-item-title>{{ item.raw.packageName }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ item.raw.packageSize }} {{ getBaseUnitLabel() }}
              <span v-if="item.raw.packagePrice" class="text-success">
                • {{ formatCurrency(item.raw.packagePrice) }}
              </span>
            </v-list-item-subtitle>
          </v-list-item>
        </template>
      </v-select>

      <!-- Selected package info -->
      <div v-if="selectedPackage" class="package-info-block">
        <div class="info-item quantity-edit">
          <div class="info-label">Quantity</div>
          <div class="quantity-input-wrapper">
            <NumericInputField
              :model-value="calculatedQuantity"
              :min="0.1"
              :max="9999"
              :allow-decimal="true"
              :decimal-places="1"
              density="compact"
              variant="outlined"
              hide-details
              suffix="pkg"
              class="quantity-input"
              @update:model-value="handleQuantityChange(Number($event))"
            />
            <v-tooltip v-if="overrideQuantity !== null" location="top">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  icon="mdi-refresh"
                  size="x-small"
                  variant="text"
                  color="primary"
                  class="reset-btn"
                  @click="resetToSuggested"
                />
              </template>
              <span>Reset to suggested: {{ suggestedQuantity }} pkg</span>
            </v-tooltip>
          </div>
        </div>

        <v-divider vertical class="mx-3 d-none d-sm-block" />

        <div class="info-item">
          <div class="info-label">Total</div>
          <div class="info-value text-success">{{ formatCurrency(totalCost) }}</div>
        </div>

        <v-chip
          v-if="selectedPackage.id === recommendedPackageId"
          color="info"
          size="small"
          variant="tonal"
          class="ml-3"
        >
          Recommended
        </v-chip>

        <!-- Warning if no price -->
        <v-tooltip v-if="!selectedPackage.packagePrice" location="top">
          <template #activator="{ props: tooltipProps }">
            <v-icon v-bind="tooltipProps" color="warning" size="20" class="ml-2">
              mdi-alert-circle
            </v-icon>
          </template>
          <span>Price calculated from base cost</span>
        </v-tooltip>
      </div>

      <!-- Add Package Button (horizontal) -->
      <v-btn
        v-if="allowAddPackage"
        variant="outlined"
        color="primary"
        icon="mdi-plus"
        size="small"
        class="ml-3"
        @click="showAddPackageDialog = true"
      >
        <v-icon>mdi-plus</v-icon>
        <v-tooltip activator="parent" location="top">Add New Package</v-tooltip>
      </v-btn>
    </div>

    <!-- No Packages Available (horizontal) -->
    <div v-else class="d-flex align-center gap-2">
      <v-alert type="warning" variant="tonal" density="compact" class="flex-grow-1">
        No packages available
      </v-alert>
      <v-btn
        v-if="allowAddPackage"
        variant="flat"
        color="primary"
        prepend-icon="mdi-plus"
        @click="showAddPackageDialog = true"
      >
        Add Package
      </v-btn>
    </div>
  </div>

  <!-- Quick Add Package Dialog -->
  <PackageOptionDialog
    v-model="showAddPackageDialog"
    :product-id="productId"
    :base-unit="productForDialog?.baseUnit || 'gram'"
    :loading="packageDialogLoading"
    :product-base-cost="productForDialog?.baseCostPerUnit || 0"
    @save="handlePackageSaved"
  />
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { formatIDR } from '@/utils/currency'
import type { PackageOption, Product } from '@/stores/productsStore/types'
import PackageOptionDialog from '@/views/products/components/package/PackageOptionDialog.vue'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  productId: string
  requiredBaseQuantity: number
  selectedPackageId?: string
  mode: 'optional' | 'required' | 'change'
  layout?: 'vertical' | 'horizontal'
  allowAddPackage?: boolean
  overrideBaseCost?: number
}

interface Emits {
  (
    e: 'package-selected',
    value: {
      packageId: string
      packageQuantity: number
      resultingBaseQuantity: number
      totalCost: number
    }
  ): void
  (e: 'update:selectedPackageId', value: string | undefined): void
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'vertical',
  allowAddPackage: true,
  selectedPackageId: undefined
})

const emits = defineEmits<Emits>()

// =============================================
// STORES
// =============================================

const productsStore = useProductsStore()

// =============================================
// LOCAL STATE
// =============================================

const loading = ref(false)
const error = ref<string | null>(null)
const internalSelectedPackageId = ref<string | undefined>(props.selectedPackageId)
const overrideQuantity = ref<number | null>(null)
const showAddPackageDialog = ref(false)
const packageDialogLoading = ref(false)
const productForDialog = computed(() => {
  return productInfo.value
})

// =============================================
// COMPUTED
// =============================================

const productInfo = computed((): Product | null => {
  return productsStore.getProductById(props.productId)
})

const availablePackages = computed((): PackageOption[] => {
  if (!productInfo.value) return []
  return productsStore.getActivePackages(props.productId)
})

const recommendedPackageId = computed((): string | undefined => {
  return productInfo.value?.recommendedPackageId
})

const packageOptions = computed(() => {
  return availablePackages.value.map(pkg => ({
    ...pkg,
    displayName: pkg.brandName ? `${pkg.packageName} (${pkg.brandName})` : pkg.packageName
  }))
})

const selectedPackage = computed(() => {
  if (!internalSelectedPackageId.value) return null
  return availablePackages.value.find(p => p.id === internalSelectedPackageId.value) || null
})

const suggestedQuantity = computed(() => {
  if (!selectedPackage.value) return 0
  const calc = getPackageCalculation(selectedPackage.value)
  return calc.suggestedPackages
})

const calculatedQuantity = computed(() => {
  if (overrideQuantity.value !== null) return overrideQuantity.value
  return suggestedQuantity.value
})

const totalCost = computed(() => {
  if (!selectedPackage.value) return 0
  const packagePrice = getPackagePrice(selectedPackage.value)
  return packagePrice * calculatedQuantity.value
})

// =============================================
// METHODS
// =============================================

function getPackagePrice(pkg: PackageOption): number {
  if (props.overrideBaseCost && props.overrideBaseCost > 0) {
    return props.overrideBaseCost * pkg.packageSize
  }
  if (pkg.packagePrice && pkg.packagePrice > 0) {
    return pkg.packagePrice
  }
  return pkg.baseCostPerUnit * pkg.packageSize
}

function selectPackage(packageId: string) {
  internalSelectedPackageId.value = packageId
  overrideQuantity.value = null
  emits('update:selectedPackageId', packageId)
  emitPackageSelected(packageId)
}

function handleQuantityChange(newQuantity: number) {
  if (newQuantity <= 0) return

  overrideQuantity.value = newQuantity

  if (internalSelectedPackageId.value) {
    emitPackageSelected(internalSelectedPackageId.value)
  }
}

function resetToSuggested() {
  overrideQuantity.value = null
  if (internalSelectedPackageId.value) {
    emitPackageSelected(internalSelectedPackageId.value)
  }
}

function emitPackageSelected(packageId: string) {
  try {
    const pkg = availablePackages.value.find(p => p.id === packageId)
    if (!pkg) return

    const quantity = overrideQuantity.value ?? suggestedQuantity.value
    const packagePrice = getPackagePrice(pkg)
    const resultingBaseQuantity = quantity * pkg.packageSize

    emits('package-selected', {
      packageId: packageId,
      packageQuantity: quantity,
      resultingBaseQuantity: resultingBaseQuantity,
      totalCost: packagePrice * quantity
    })
  } catch (err) {
    console.error('Failed to calculate package quantity:', err)
  }
}

function getPackageCalculation(pkg: PackageOption) {
  try {
    return productsStore.calculatePackageQuantity(
      props.productId,
      props.requiredBaseQuantity,
      pkg.id
    )
  } catch {
    return {
      exactPackages: 0,
      suggestedPackages: 0,
      actualBaseQuantity: 0,
      difference: 0,
      packageOption: pkg
    }
  }
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

function getBaseUnitLabel(): string {
  if (!productInfo.value) return ''

  const labels: Record<string, string> = {
    gram: 'g',
    ml: 'ml',
    piece: 'pc'
  }

  return labels[productInfo.value.baseUnit] || productInfo.value.baseUnit
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value)
}

function formatCurrency(amount: number): string {
  return formatIDR(amount)
}

async function handlePackageSaved(packageData: any) {
  packageDialogLoading.value = true
  try {
    const newPackage = await productsStore.addPackageOption(packageData)
    selectPackage(newPackage.id)
    showAddPackageDialog.value = false
  } catch (err) {
    console.error('Failed to create package:', err)
  } finally {
    packageDialogLoading.value = false
  }
}

function initializeSelector() {
  loading.value = true
  error.value = null

  try {
    if (!productInfo.value) {
      error.value = 'Product not found'
      return
    }

    if (availablePackages.value.length > 0) {
      if (!props.selectedPackageId) {
        if (recommendedPackageId.value) {
          internalSelectedPackageId.value = recommendedPackageId.value
          emits('update:selectedPackageId', recommendedPackageId.value)
        } else {
          const firstPackage = availablePackages.value[0]
          if (firstPackage) {
            internalSelectedPackageId.value = firstPackage.id
            emits('update:selectedPackageId', firstPackage.id)
          }
        }
      } else {
        internalSelectedPackageId.value = props.selectedPackageId
      }
    }
  } catch (err) {
    console.error('Failed to initialize package selector:', err)
    error.value = 'Failed to load package options'
  } finally {
    loading.value = false
  }
}

// =============================================
// WATCHERS
// =============================================

watch(
  () => props.productId,
  () => {
    initializeSelector()
  }
)

watch(
  () => props.requiredBaseQuantity,
  () => {
    if (internalSelectedPackageId.value) {
      emitPackageSelected(internalSelectedPackageId.value)
    }
  }
)

watch(
  () => props.selectedPackageId,
  newValue => {
    if (newValue !== internalSelectedPackageId.value) {
      internalSelectedPackageId.value = newValue
    }
  }
)

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  initializeSelector()
})
</script>

<style scoped lang="scss">
.package-selector-horizontal {
  padding: 12px 16px;
  border-radius: 8px;
  border: 2px solid rgb(var(--v-theme-surface-variant));
  background-color: rgb(var(--v-theme-surface));
  transition: all 0.3s;

  &:has(select:focus) {
    border-color: rgb(var(--v-theme-primary));
  }

  .package-info-block {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    background: rgba(var(--v-theme-surface-variant), 0.3);
    border-radius: 8px;
    margin-left: 16px;
  }

  .info-item {
    text-align: center;
    min-width: 80px;
  }

  .info-label {
    font-size: 11px;
    color: rgba(var(--v-theme-on-surface), 0.6);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }

  .info-value {
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
  }

  .quantity-edit {
    min-width: 120px;
  }

  .quantity-input-wrapper {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .quantity-input {
    max-width: 100px;

    :deep(.v-field__input) {
      font-weight: 600;
      font-size: 14px;
      padding: 4px 8px;
      min-height: 32px;
    }

    :deep(.v-field__outline) {
      --v-field-border-opacity: 0.3;
    }

    :deep(.v-text-field__suffix) {
      font-size: 12px;
      opacity: 0.7;
    }
  }

  .reset-btn {
    opacity: 0.7;
    &:hover {
      opacity: 1;
    }
  }
}

.package-selector-vertical {
  .packages-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
  }

  .package-card {
    cursor: pointer;
    transition: all 0.2s ease;
    border-width: 2px;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    &--selected {
      border-color: rgb(var(--v-theme-primary));
    }
  }

  .text-medium-emphasis {
    opacity: 0.7;
  }

  .gap-2 {
    gap: 8px;
  }
}
</style>
