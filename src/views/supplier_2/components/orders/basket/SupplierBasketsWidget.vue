<template>
  <div class="supplier-baskets-widget">
    <div class="d-flex align-center justify-space-between mb-3">
      <div class="text-h6 font-weight-bold">
        🏪 Supplier Baskets ({{ baskets.filter(b => b.items.length > 0).length }})
      </div>
      <v-btn size="small" prepend-icon="mdi-plus" @click="$emit('add-supplier')">
        Add Supplier
      </v-btn>
    </div>

    <!-- Одна колонка вместо grid -->
    <div class="baskets-list">
      <v-card
        v-for="basket in baskets.filter(b => b.items.length > 0)"
        :key="basket.supplierId"
        variant="outlined"
        class="mb-4"
      >
        <!-- Header -->
        <v-card-title class="pa-3 bg-surface">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="font-weight-bold">{{ basket.supplierName }}</div>
              <div class="text-body-2 text-medium-emphasis">
                {{ basket.totalItems }} items • {{ formatCurrency(basket.estimatedTotal) }}
              </div>
            </div>
            <v-btn
              color="primary"
              size="small"
              :disabled="!allItemsHavePackages(basket)"
              @click="$emit('create-order', basket)"
            >
              Create Order
            </v-btn>
          </div>
        </v-card-title>

        <v-divider />

        <!-- Items list -->
        <v-card-text class="pa-3">
          <div v-for="item in basket.items" :key="item.itemId" class="item-row pa-3 mb-3">
            <!-- Item header -->
            <div class="d-flex align-center justify-space-between mb-3">
              <div>
                <div class="font-weight-bold text-body-1">{{ item.itemName }}</div>
                <div class="text-body-2 text-medium-emphasis">
                  Required: {{ item.totalQuantity }} {{ item.unit }}
                </div>
              </div>
              <v-btn
                icon="mdi-arrow-left"
                size="small"
                variant="text"
                @click="$emit('move-to-unassigned', item.itemId, basket.supplierId)"
              />
            </div>

            <!-- Package Selector - горизонтальный -->
            <div class="package-selector-horizontal mb-3">
              <PackageSelector
                :product-id="item.itemId"
                :required-base-quantity="item.totalQuantity"
                :selected-package-id="item.packageId"
                mode="required"
                layout="horizontal"
                @package-selected="handlePackageSelected(basket.supplierId, item.itemId, $event)"
                @update:selected-package-id="
                  updatePackageId(basket.supplierId, item.itemId, $event)
                "
              />
            </div>

            <!-- Footer: Sources + Cost -->
            <div class="d-flex align-center justify-space-between">
              <!-- Sources -->
              <div class="d-flex flex-wrap gap-1">
                <v-chip
                  v-for="source in item.sources"
                  :key="source.requestId"
                  size="x-small"
                  variant="tonal"
                >
                  {{ source.requestNumber }}: {{ source.quantity }}
                </v-chip>
              </div>

              <!-- Cost -->
              <div class="ml-4">
                <div v-if="item.packageId" class="text-body-1 font-weight-bold text-success">
                  {{ formatCurrency(calculateItemCost(item)) }}
                </div>
                <div v-else class="text-body-2 text-warning">⚠️ Select package</div>
              </div>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import type { SupplierBasket, UnassignedItem } from '@/stores/supplier_2/types'
import PackageSelector from '../../shared/package/PackageSelector.vue'

interface Props {
  baskets: SupplierBasket[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'create-order': [basket: SupplierBasket]
  'move-to-unassigned': [itemId: string, supplierId: string]
  'add-supplier': []
  'package-selected': [supplierId: string, itemId: string, data: any]
  'package-id-updated': [supplierId: string, itemId: string, packageId: string | undefined]
  'items-initialized': []
}>()

const productsStore = useProductsStore()

onMounted(() => {
  props.baskets.forEach(basket => {
    basket.items.forEach(item => {
      if (item.packageId && !item.estimatedPackagePrice) {
        initializeItemPackage(basket.supplierId, item)
      }
    })
  })
  emit('items-initialized')
})

function initializeItemPackage(supplierId: string, item: UnassignedItem) {
  if (!item.packageId) return

  const pkg = productsStore.getPackageById(item.packageId)
  if (!pkg) return

  const packageQuantity = Math.ceil(item.totalQuantity / pkg.packageSize)
  const packagePrice = pkg.packagePrice || pkg.baseCostPerUnit * pkg.packageSize
  const totalCost = packagePrice * packageQuantity

  emit('package-selected', supplierId, item.itemId, {
    packageId: item.packageId,
    packageQuantity,
    resultingBaseQuantity: packageQuantity * pkg.packageSize,
    totalCost
  })
}

function handlePackageSelected(supplierId: string, itemId: string, data: any) {
  emit('package-selected', supplierId, itemId, data)
}

function updatePackageId(supplierId: string, itemId: string, packageId: string | undefined) {
  emit('package-id-updated', supplierId, itemId, packageId)
}

function allItemsHavePackages(basket: SupplierBasket): boolean {
  return basket.items.every(item => item.packageId && item.packageQuantity)
}

function calculateItemCost(item: UnassignedItem): number {
  if (item.packageId && item.estimatedPackagePrice && item.packageQuantity) {
    return item.estimatedPackagePrice * item.packageQuantity
  }

  if (item.packageId && item.packageQuantity) {
    const pkg = productsStore.getPackageById(item.packageId)
    if (pkg) {
      const packagePrice = pkg.packagePrice || pkg.baseCostPerUnit * pkg.packageSize
      return packagePrice * item.packageQuantity
    }
  }

  return (item.estimatedBaseCost || 0) * item.totalQuantity
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(val)
}
</script>

<style scoped>
.baskets-list {
  max-width: 100%;
}

.item-row {
  border-radius: 8px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background-color: rgb(var(--v-theme-surface));
}

.package-selector-horizontal {
  /* PackageSelector будет занимать всю ширину */
  width: 100%;
}
</style>
