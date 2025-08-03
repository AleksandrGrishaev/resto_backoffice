<!-- src/views/products/ProductsView.vue -->
<template>
  <div class="products-view">
    <!-- Заголовок и кнопка добавления -->
    <div class="products-toolbar">
      <v-row align="center" class="mb-4">
        <v-col>
          <h1 class="text-h4">Продукты</h1>
          <p class="text-subtitle-1 text-medium-emphasis mt-1">
            Управление продуктами и ингредиентами
          </p>
        </v-col>
        <v-col cols="auto">
          <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog">
            Добавить продукт
          </v-btn>
        </v-col>
      </v-row>
    </div>

    <!-- Фильтры и поиск -->
    <products-filters
      v-model:filters="store.filters"
      :loading="store.loading"
      @reset="store.resetFilters"
    />

    <!-- Статистика -->
    <v-row class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="text-center">
            <div class="text-h4 primary--text">{{ store.statistics.total }}</div>
            <div class="text-subtitle-2">Всего продуктов</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="text-center">
            <div class="text-h4 success--text">{{ store.statistics.active }}</div>
            <div class="text-subtitle-2">Активных</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="text-center">
            <div class="text-h4 warning--text">{{ store.statistics.inactive }}</div>
            <div class="text-subtitle-2">Неактивных</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="text-center">
            <div class="text-h4 info--text">{{ store.lowStockProducts.length }}</div>
            <div class="text-subtitle-2">Заканчивается</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Список продуктов -->
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon start>mdi-package-variant</v-icon>
        Список продуктов
        <v-spacer />
        <v-chip
          :color="store.filteredProducts.length > 0 ? 'primary' : 'default'"
          variant="outlined"
          size="small"
        >
          {{ store.filteredProducts.length }} из {{ store.products.length }}
        </v-chip>
      </v-card-title>

      <v-divider />

      <!-- Загрузка -->
      <v-progress-linear v-if="store.loading" indeterminate color="primary" />

      <!-- Ошибка -->
      <v-alert
        v-if="store.error"
        type="error"
        variant="tonal"
        class="ma-4"
        closable
        @click:close="store.clearError"
      >
        {{ store.error }}
      </v-alert>

      <!-- Список продуктов -->
      <products-list
        :products="store.filteredProducts"
        :loading="store.loading"
        @edit="editProduct"
        @toggle-active="toggleProductActive"
        @view-details="viewProductDetails"
      />
    </v-card>

    <!-- Диалог создания/редактирования -->
    <product-dialog
      v-model="dialogs.product"
      :product="selectedProduct"
      :loading="store.loading"
      @save="handleProductSave"
    />

    <!-- Диалог детальной информации -->
    <product-details-dialog v-model="dialogs.details" :product="selectedProduct" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import type { Product, CreateProductData, UpdateProductData } from '@/stores/productsStore'
import { DebugUtils } from '@/utils'

// Компоненты
import ProductsFilters from './components/ProductsFilters.vue'
import ProductsList from './components/ProductsList.vue'
import ProductDialog from './components/ProductDialog.vue'
import ProductDetailsDialog from './components/ProductDetailsDialog.vue'

const MODULE_NAME = 'ProductsView'
const store = useProductsStore()

// Состояние диалогов
const dialogs = ref({
  product: false,
  details: false
})

// Выбранный продукт для редактирования/просмотра
const selectedProduct = ref<Product | null>(null)

// Методы
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
    if (product.isActive) {
      await store.deactivateProduct(product.id)
    } else {
      await store.activateProduct(product.id)
    }
    DebugUtils.info(MODULE_NAME, 'Product status toggled', {
      id: product.id,
      newStatus: !product.isActive
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Error toggling product status', { error, id: product.id })
  }
}

const handleProductSave = async (data: CreateProductData | UpdateProductData): Promise<void> => {
  try {
    if ('id' in data) {
      // Обновление существующего продукта
      await store.updateProduct(data as UpdateProductData)
      DebugUtils.info(MODULE_NAME, 'Product updated', { id: data.id })
    } else {
      // Создание нового продукта
      await store.createProduct(data as CreateProductData)
      DebugUtils.info(MODULE_NAME, 'Product created')
    }

    dialogs.value.product = false
    selectedProduct.value = null
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Error saving product', { error, data })
  }
}

// Загрузка данных при монтировании
onMounted(async () => {
  try {
    DebugUtils.info(MODULE_NAME, 'Component mounted, loading products')
    // Используем моковые данные для разработки
    await store.loadProducts(true)
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Error loading products on mount', { error })
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
