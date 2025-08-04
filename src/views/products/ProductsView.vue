<!-- src/views/products/ProductsView.vue -->
<template>
  <div class="products-view">
    <!-- Заголовок и кнопка добавления -->
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

    <!-- Фильтры и поиск -->
    <products-filters
      :filters="filters"
      :loading="loading"
      @update:filters="updateFilters"
      @reset="resetFilters"
    />

    <!-- Статистика -->
    <v-row class="mb-4">
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="text-center">
            <div class="d-flex align-center justify-center ga-3 mb-2">
              <v-icon color="primary" size="24">mdi-package-variant</v-icon>
              <div class="text-h4 primary--text">{{ statistics.total }}</div>
            </div>
            <div class="text-subtitle-2">Всего продуктов</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="text-center">
            <div class="d-flex align-center justify-center ga-3 mb-2">
              <v-icon color="success" size="24">mdi-check-circle</v-icon>
              <div class="text-h4 success--text">{{ statistics.active }}</div>
            </div>
            <div class="text-subtitle-2">Активных</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="text-center">
            <div class="d-flex align-center justify-center ga-3 mb-2">
              <v-icon color="warning" size="24">mdi-pause-circle</v-icon>
              <div class="text-h4 warning--text">{{ statistics.inactive }}</div>
            </div>
            <div class="text-subtitle-2">Неактивных</div>
          </v-card-text>
        </v-card>
      </v-col>
      <v-col cols="12" sm="6" md="3">
        <v-card>
          <v-card-text class="text-center">
            <div class="d-flex align-center justify-center ga-3 mb-2">
              <v-icon color="info" size="24">mdi-chart-line</v-icon>
              <div class="text-h4 info--text">{{ statistics.categories }}</div>
            </div>
            <div class="text-subtitle-2">Категорий</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Список продуктов -->
    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <v-icon start>mdi-format-list-bulleted</v-icon>
        Список продуктов
        <v-spacer />
        <div class="d-flex align-center ga-2">
          <v-chip
            :color="filteredProducts.length > 0 ? 'primary' : 'default'"
            variant="outlined"
            size="small"
          >
            {{ filteredProducts.length }} из {{ allProducts.length }}
          </v-chip>

          <!-- Индикатор загрузки -->
          <v-progress-circular v-if="loading" size="20" width="2" color="primary" indeterminate />
        </div>
      </v-card-title>

      <v-divider />

      <!-- Прогресс-бар загрузки -->
      <v-progress-linear v-if="loading" indeterminate color="primary" />

      <!-- Алерт с ошибкой -->
      <v-alert
        v-if="error"
        type="error"
        variant="tonal"
        class="ma-4"
        closable
        @click:close="clearError"
      >
        <template #title>Ошибка загрузки данных</template>
        {{ error }}
      </v-alert>

      <!-- Список продуктов -->
      <products-list
        :products="filteredProducts"
        :loading="loading"
        @edit="editProduct"
        @toggle-active="toggleProductActive"
        @view-details="viewProductDetails"
      />
    </v-card>

    <!-- Диалог создания/редактирования -->
    <product-dialog
      v-model="dialogs.product"
      :product="selectedProduct"
      :loading="operationLoading"
      @save="handleProductSave"
    />

    <!-- Диалог детальной информации -->
    <product-details-dialog v-model="dialogs.details" :product="selectedProduct" />

    <!-- Уведомления -->
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
import type { Product, CreateProductData, UpdateProductData } from '@/stores/productsStore'
import { mockProducts } from '@/stores/productsStore/productsMock'
import { DebugUtils } from '@/utils'

// Компоненты
import ProductsFilters from './components/ProductsFilters.vue'
import ProductsList from './components/ProductsList.vue'
import ProductDialog from './components/ProductDialog.vue'
import ProductDetailsDialog from './components/ProductDetailsDialog.vue'

const MODULE_NAME = 'ProductsView'

// Базовый тип фильтров
type BaseFilters = {
  category: string
  isActive: boolean | 'all'
  search: string
}

// Расширенные фильтры
type ExtendedFilters = BaseFilters & {
  unit?: string
  yieldMin?: number
  yieldMax?: number
  lowStock?: boolean
  expiringSoon?: boolean
}

// Состояние
const loading = ref(false)
const operationLoading = ref(false)
const error = ref<string | null>(null)
const allProducts = ref<Product[]>([])

// Фильтры
const filters = ref<ExtendedFilters>({
  category: 'all',
  isActive: 'all',
  search: '',
  unit: undefined,
  yieldMin: 0,
  yieldMax: 100,
  lowStock: false,
  expiringSoon: false
})

// Состояние диалогов
const dialogs = ref({
  product: false,
  details: false
})

// Выбранный продукт для редактирования/просмотра
const selectedProduct = ref<Product | null>(null)

// Уведомления
const notification = ref({
  show: false,
  message: '',
  color: 'success'
})

// Computed
const filteredProducts = computed(() => {
  let result = [...allProducts.value]

  // Поиск
  if (filters.value.search) {
    const searchTerm = filters.value.search.toLowerCase()
    result = result.filter(
      product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm)
    )
  }

  // Фильтр по категории
  if (filters.value.category !== 'all') {
    result = result.filter(product => product.category === filters.value.category)
  }

  // Фильтр по активности
  if (filters.value.isActive !== 'all') {
    result = result.filter(product => product.isActive === filters.value.isActive)
  }

  // Фильтр по единице измерения
  if (filters.value.unit) {
    result = result.filter(product => product.unit === filters.value.unit)
  }

  // Фильтр по проценту выхода
  if (filters.value.yieldMin !== undefined && filters.value.yieldMax !== undefined) {
    result = result.filter(
      product =>
        product.yieldPercentage >= filters.value.yieldMin! &&
        product.yieldPercentage <= filters.value.yieldMax!
    )
  }

  // Фильтр заканчивающихся продуктов
  if (filters.value.lowStock) {
    result = result.filter(
      product => product.minStock && product.minStock > 0 // Здесь в будущем будет проверка остатков
    )
  }

  // Фильтр истекающих по сроку
  if (filters.value.expiringSoon) {
    result = result.filter(
      product => product.shelfLife && product.shelfLife <= 7 // Истекает в течение недели
    )
  }

  return result.sort((a, b) => a.name.localeCompare(b.name))
})

const statistics = computed(() => ({
  total: allProducts.value.length,
  active: allProducts.value.filter(p => p.isActive).length,
  inactive: allProducts.value.filter(p => !p.isActive).length,
  categories: new Set(allProducts.value.map(p => p.category)).size
}))

// Методы
const showNotification = (message: string, color: 'success' | 'error' | 'warning' = 'success') => {
  notification.value = { show: true, message, color }
}

const clearError = (): void => {
  error.value = null
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

    // Имитация API запроса
    await new Promise(resolve => setTimeout(resolve, 500))

    // Обновляем продукт в локальном состоянии
    const index = allProducts.value.findIndex(p => p.id === product.id)
    if (index !== -1) {
      allProducts.value[index] = {
        ...allProducts.value[index],
        isActive: !product.isActive,
        updatedAt: new Date().toISOString()
      }
    }

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
    error.value = errorMessage
    showNotification(errorMessage, 'error')
    DebugUtils.error(MODULE_NAME, 'Error toggling product status', { error: err, id: product.id })
  } finally {
    operationLoading.value = false
  }
}

const handleProductSave = async (data: CreateProductData | UpdateProductData): Promise<void> => {
  try {
    operationLoading.value = true

    // Имитация API запроса
    await new Promise(resolve => setTimeout(resolve, 1000))

    if ('id' in data) {
      // Обновление существующего продукта
      const index = allProducts.value.findIndex(p => p.id === data.id)
      if (index !== -1) {
        allProducts.value[index] = {
          ...allProducts.value[index],
          ...data,
          updatedAt: new Date().toISOString()
        }
      }
      showNotification('Продукт успешно обновлен', 'success')
      DebugUtils.info(MODULE_NAME, 'Product updated', { id: data.id })
    } else {
      // Создание нового продукта
      const newProduct: Product = {
        ...data,
        id: `prod-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      allProducts.value.push(newProduct)
      showNotification('Продукт успешно создан', 'success')
      DebugUtils.info(MODULE_NAME, 'Product created', { id: newProduct.id })
    }

    dialogs.value.product = false
    selectedProduct.value = null
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Ошибка при сохранении продукта'
    error.value = errorMessage
    showNotification(errorMessage, 'error')
    DebugUtils.error(MODULE_NAME, 'Error saving product', { error: err, data })
  } finally {
    operationLoading.value = false
  }
}

const updateFilters = (newFilters: ExtendedFilters): void => {
  filters.value = { ...newFilters }
  DebugUtils.debug(MODULE_NAME, 'Filters updated', { filters: newFilters })
}

const resetFilters = (): void => {
  filters.value = {
    category: 'all',
    isActive: 'all',
    search: '',
    unit: undefined,
    yieldMin: 0,
    yieldMax: 100,
    lowStock: false,
    expiringSoon: false
  }
  DebugUtils.debug(MODULE_NAME, 'Filters reset')
}

// Загрузка данных при монтировании
onMounted(async () => {
  try {
    loading.value = true
    error.value = null

    DebugUtils.info(MODULE_NAME, 'Component mounted, loading mock products')

    // Имитация загрузки с сервера
    await new Promise(resolve => setTimeout(resolve, 800))

    // Загружаем mock данные
    allProducts.value = [...mockProducts]

    showNotification(`Загружено ${allProducts.value.length} продуктов`, 'success')
    DebugUtils.info(MODULE_NAME, 'Products loaded successfully', {
      count: allProducts.value.length
    })
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Ошибка при загрузке продуктов'
    error.value = errorMessage
    showNotification(errorMessage, 'error')
    DebugUtils.error(MODULE_NAME, 'Error loading products on mount', { error: err })
  } finally {
    loading.value = false
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
