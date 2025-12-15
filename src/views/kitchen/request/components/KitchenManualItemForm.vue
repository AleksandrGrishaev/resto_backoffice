<template>
  <v-card>
    <v-card-title class="text-subtitle-1 pa-3 bg-grey-lighten-4">
      <v-icon icon="mdi-plus" class="mr-2" />
      Add Manual Item
      <span class="text-caption text-medium-emphasis ml-2">(Click on product to add)</span>
    </v-card-title>

    <v-card-text class="pa-4">
      <!-- Product Search - always expanded -->
      <ItemSearchWidget
        :products="availableProductsForSearch"
        :existing-item-ids="existingItemIds"
        :show-supplier-filter="false"
        :show-stock-filter="true"
        :show-stock-info="true"
        :items-per-page="12"
        @product-selected="handleProductSelection"
      />
    </v-card-text>

    <!-- Quick Add Dialog -->
    <KitchenQuickAddDialog
      v-model="showQuickAddDialog"
      :product="selectedProduct"
      :existing-item-ids="existingItemIds"
      @add-item="handleQuickAdd"
    />
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { useStorageStore } from '@/stores/storage/storageStore'
import type { Product } from '@/stores/productsStore/types'
import ItemSearchWidget from './ItemSearchWidget.vue'
import KitchenQuickAddDialog from './KitchenQuickAddDialog.vue'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  existingItemIds?: string[]
  loading?: boolean
  department: 'kitchen' | 'bar' // Required - filter products by department
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

const showQuickAddDialog = ref(false)
const selectedProduct = ref<Product | null>(null)

// =============================================
// COMPUTED
// =============================================

const availableProductsForSearch = computed(() => {
  // Filter by department and active status
  const activeProducts = productsStore.products.filter(p => {
    if (!p.isActive) return false

    // Filter by department
    // Include products that:
    // 1. Are explicitly used in this department
    // 2. OR have no department restriction (usedInDepartments is empty/undefined)
    const usedInDept = p.usedInDepartments
    if (!usedInDept || usedInDept.length === 0) return true
    return usedInDept.includes(props.department)
  })

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

// =============================================
// METHODS
// =============================================

function handleProductSelection(product: Product) {
  // Open quick add dialog with selected product
  selectedProduct.value = product
  showQuickAddDialog.value = true
}

function handleQuickAdd(item: ManualItem) {
  emits('add-item', item)
  // Dialog closes itself, selectedProduct stays for potential re-add
}
</script>

<style scoped>
.text-medium-emphasis {
  opacity: 0.7;
}
</style>
