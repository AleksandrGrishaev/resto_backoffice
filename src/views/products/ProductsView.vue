<!-- src/views/products/ProductsView.vue - Truly Clean Version -->
<template>
  <div class="products-view">
    <!-- Original header without analytics buttons -->
    <div class="products-toolbar">
      <v-row align="center" class="mb-4">
        <v-col>
          <div class="d-flex align-center ga-3">
            <v-icon size="40" color="primary">mdi-package-variant</v-icon>
            <div>
              <h1 class="text-h4">Продукты</h1>
              <p class="text-subtitle-1 text-medium-emphasis mt-1">
                Управление продуктами и ингредиентами
              </p>
            </div>
          </div>
        </v-col>
        <v-col cols="auto">
          <v-btn color="primary" prepend-icon="mdi-plus" size="large" @click="showCreateDialog">
            Добавить продукт
          </v-btn>
        </v-col>
      </v-row>
    </div>

    <!-- Mock mode indicator with simple test button (dev only) -->
    <v-alert v-if="useMockMode" type="info" variant="tonal" class="mb-4" density="compact">
      <template #prepend>
        <v-icon>mdi-database-outline</v-icon>
      </template>
      <div class="d-flex align-center justify-space-between">
        <span class="text-body-2">Режим разработки: используются координированные mock-данные</span>
        <!-- DEV: Simple test button -->
        <v-btn
          v-if="isDev"
          size="small"
          variant="outlined"
          color="info"
          @click="testStockRecommendations"
        >
          <v-icon start size="small">mdi-calculator</v-icon>
          Тест расчетов
        </v-btn>
      </div>
    </v-alert>

    <!-- Original filters -->
    <products-filters
      :filters="storeFilters"
      :loading="store.loading"
      @update:filters="updateFilters"
      @reset="resetFilters"
    />

    <!-- Original products list -->
    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <v-icon start>mdi-format-list-bulleted</v-icon>
        Список продуктов
        <v-spacer />
        <div class="d-flex align-center ga-2">
          <v-chip
            :color="store.filteredProducts.length > 0 ? 'primary' : 'default'"
            variant="outlined"
            size="small"
          >
            {{ store.filteredProducts.length }} из {{ store.products.length }}
          </v-chip>

          <v-progress-circular
            v-if="store.loading"
            size="20"
            width="2"
            color="primary"
            indeterminate
          />
        </div>
      </v-card-title>

      <v-divider />
      <v-progress-linear v-if="store.loading" indeterminate color="primary" />

      <v-alert
        v-if="store.error"
        type="error"
        variant="tonal"
        class="ma-4"
        closable
        @click:close="store.clearError()"
      >
        <template #title>Ошибка загрузки данных</template>
        {{ store.error }}
      </v-alert>

      <!-- Products list (enhanced store works in background, but UI stays simple) -->
      <products-list
        :products="store.filteredProducts"
        :loading="store.loading"
        @edit="editProduct"
        @toggle-active="toggleProductActive"
        @view-details="viewProductDetails"
      />
    </v-card>

    <!-- Original dialogs -->
    <product-dialog
      v-model="dialogs.product"
      :product="selectedProduct"
      :loading="operationLoading"
      @save="handleProductSave"
      @add-package="handleAddPackage"
      @update-package="handleUpdatePackage"
      @delete-package="handleDeletePackage"
      @set-recommended="handleSetRecommended"
    />

    <product-details-dialog v-model="dialogs.details" :product="selectedProduct" />

    <!-- Original notifications -->
    <v-snackbar
      v-model="notification.show"
      :color="notification.color"
      timeout="4000"
      location="top right"
    >
      {{ notification.message }}
      <template #actions>
        <v-btn icon="mdi-close" size="small" @click="notification.show = false" />
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import type {
  Product,
  CreateProductData,
  UpdateProductData,
  CreatePackageOptionDto,
  UpdatePackageOptionDto
} from '@/stores/productsStore'
import { DebugUtils } from '@/utils'

// Original components
import ProductsFilters from './components/ProductsFilters.vue'
import ProductsList from './components/ProductsList.vue'
import ProductDialog from './components/ProductDialog.vue'
import ProductDetailsDialog from './components/ProductDetailsDialog.vue'

const MODULE_NAME = 'ProductsView'

// Store
const store = useProductsStore()

// Original state
const operationLoading = ref(false)

const dialogs = ref({
  product: false,
  details: false
})

const selectedProduct = ref<Product | null>(null)

const notification = ref({
  show: false,
  message: '',
  color: 'success' as 'success' | 'error' | 'warning'
})

// Original computed
const isDev = computed(() => import.meta.env.DEV)
const useMockMode = computed(() => store.useMockMode)

const storeFilters = computed(() => ({
  category: store.filters.category,
  isActive: store.filters.isActive,
  search: store.filters.search,
  department: store.filters.department // ✅ ДОБАВИТЬ
}))

// Original methods
const showNotification = (message: string, color: 'success' | 'error' | 'warning' = 'success') => {
  notification.value = { show: true, message, color }
}

const showCreateDialog = (): void => {
  selectedProduct.value = null
  dialogs.value.product = true
  DebugUtils.debug(MODULE_NAME, 'Opening create product dialog')
}

const editProduct = (product: Product): void => {
  selectedProduct.value = product
  dialogs.value.product = true
  DebugUtils.debug(MODULE_NAME, 'Opening edit product dialog', { id: product.id })
}

const viewProductDetails = (product: Product): void => {
  selectedProduct.value = product
  dialogs.value.details = true
  DebugUtils.debug(MODULE_NAME, 'Opening product details dialog', { id: product.id })
}

const toggleProductActive = async (product: Product): Promise<void> => {
  try {
    operationLoading.value = true

    const updateData: UpdateProductData = {
      id: product.id,
      isActive: !product.isActive
    }

    await store.updateProduct(updateData)

    showNotification(
      `Продукт "${product.name}" ${!product.isActive ? 'активирован' : 'деактивирован'}`,
      'success'
    )

    DebugUtils.info(MODULE_NAME, 'Product status toggled', {
      id: product.id,
      newStatus: !product.isActive
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Ошибка при изменении статуса'
    showNotification(errorMessage, 'error')
    DebugUtils.error(MODULE_NAME, 'Error toggling product status', { error: err, id: product.id })
  } finally {
    operationLoading.value = false
  }
}

const handleProductSave = async (
  data: CreateProductData | UpdateProductData,
  packages: any[]
): Promise<void> => {
  try {
    operationLoading.value = true

    if ('id' in data) {
      // Edit mode - update product
      await store.updateProduct(data)

      // Update packages for existing product
      for (const pkg of packages) {
        if (pkg.id && !pkg.tempId) {
          // Existing package - update
          await store.updatePackageOption(pkg)
        } else if (pkg.tempId) {
          // New package for existing product
          const { tempId, ...packageData } = pkg
          await store.addPackageOption({
            ...packageData,
            productId: data.id
          })
        }
      }

      showNotification('Product updated successfully', 'success')
      DebugUtils.info(MODULE_NAME, 'Product updated', { id: data.id })
    } else {
      // Create mode - create product first
      const newProduct = await store.createProduct(data)

      // Then add additional packages (default package is auto-created in store)
      for (const pkg of packages) {
        const packageData = {
          packageName: pkg.packageName,
          packageSize: pkg.packageSize,
          packageUnit: pkg.packageUnit,
          brandName: pkg.brandName,
          packagePrice: pkg.packagePrice,
          baseCostPerUnit: pkg.baseCostPerUnit,
          notes: pkg.notes,
          isActive: pkg.isActive
        }

        await store.addPackageOption({
          ...packageData,
          productId: newProduct.id
        })
      }

      showNotification('Product created successfully', 'success')
      DebugUtils.info(MODULE_NAME, 'Product created', { id: newProduct.id })
    }

    dialogs.value.product = false
    selectedProduct.value = null
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error saving product'
    showNotification(errorMessage, 'error')
    DebugUtils.error(MODULE_NAME, 'Error saving product', { error: err, data })
  } finally {
    operationLoading.value = false
  }
}

const handleAddPackage = async (data: CreatePackageOptionDto): Promise<void> => {
  try {
    operationLoading.value = true
    await store.addPackageOption(data)
    showNotification('Package added successfully', 'success')
    DebugUtils.info(MODULE_NAME, 'Package added', { productId: data.productId })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error adding package'
    showNotification(errorMessage, 'error')
    DebugUtils.error(MODULE_NAME, 'Error adding package', { error: err })
  } finally {
    operationLoading.value = false
  }
}

const handleUpdatePackage = async (data: UpdatePackageOptionDto): Promise<void> => {
  try {
    operationLoading.value = true
    await store.updatePackageOption(data)
    showNotification('Package updated successfully', 'success')
    DebugUtils.info(MODULE_NAME, 'Package updated', { packageId: data.id })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error updating package'
    showNotification(errorMessage, 'error')
    DebugUtils.error(MODULE_NAME, 'Error updating package', { error: err })
  } finally {
    operationLoading.value = false
  }
}

const handleDeletePackage = async (productId: string, packageId: string): Promise<void> => {
  try {
    operationLoading.value = true
    await store.deletePackageOption(productId, packageId)
    showNotification('Package deleted successfully', 'success')
    DebugUtils.info(MODULE_NAME, 'Package deleted', { productId, packageId })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error deleting package'
    showNotification(errorMessage, 'error')
    DebugUtils.error(MODULE_NAME, 'Error deleting package', { error: err })
  } finally {
    operationLoading.value = false
  }
}

const handleSetRecommended = async (productId: string, packageId: string): Promise<void> => {
  try {
    operationLoading.value = true
    await store.setRecommendedPackage(productId, packageId)
    showNotification('Recommended package set successfully', 'success')
    DebugUtils.info(MODULE_NAME, 'Recommended package set', { productId, packageId })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error setting recommended package'
    showNotification(errorMessage, 'error')
    DebugUtils.error(MODULE_NAME, 'Error setting recommended package', { error: err })
  } finally {
    operationLoading.value = false
  }
}

// DEV ONLY: Simple test function (not visible in production)
const testStockRecommendations = async (): Promise<void> => {
  try {
    DebugUtils.info(MODULE_NAME, '🧪 Dev test: stock recommendations')

    if (typeof window.__TEST_STOCK_RECOMMENDATIONS__ === 'function') {
      const results = await window.__TEST_STOCK_RECOMMENDATIONS__()
      showNotification('Test completed! Check console.', 'success')
      DebugUtils.info(MODULE_NAME, '✅ Test completed', { recommendations: results?.length || 0 })
    } else {
      DebugUtils.warn(MODULE_NAME, 'Test function not available')
      showNotification('Test function not available', 'warning')
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, '❌ Test failed', { error })
    showNotification('Test failed', 'error')
  }
}

// Original filter methods
const updateFilters = (newFilters: typeof storeFilters.value): void => {
  console.log('📥 ProductsView: received filters', newFilters) // ✅ ДОБАВИТЬ
  console.log('🏪 ProductsView: calling store.updateFilters', newFilters) // ✅ ДОБАВИТЬ
  store.updateFilters(newFilters)
  DebugUtils.debug(MODULE_NAME, 'Filters updated', { filters: newFilters })
}

const resetFilters = (): void => {
  store.resetFilters()
  DebugUtils.debug(MODULE_NAME, 'Filters reset')
}

// Original mount
onMounted(async () => {
  DebugUtils.info(MODULE_NAME, '🎯 ProductsView mounted', {
    productsLoaded: store.products.length,
    useMockMode: store.useMockMode,
    hasError: !!store.error
  })

  if (store.products.length > 0) {
    showNotification(`Продукты загружены (${store.products.length})`, 'success')
  } else if (store.error) {
    showNotification('Ошибка загрузки продуктов', 'error')
  } else if (store.loading) {
    showNotification('Загрузка продуктов...', 'warning')
  }
})
</script>

<style scoped>
.products-view {
  padding: 0;
}

.products-toolbar {
  margin-bottom: 1rem;
}
</style>
