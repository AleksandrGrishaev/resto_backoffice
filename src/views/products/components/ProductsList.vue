<!-- src/views/products/components/ProductsList.vue -->
<template>
  <div class="products-list">
    <!-- Пустое состояние -->
    <div v-if="!loading && products.length === 0" class="text-center pa-8">
      <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-package-variant-off</v-icon>
      <h3 class="text-h6 text-medium-emphasis mb-2">Продукты не найдены</h3>
      <p class="text-body-2 text-medium-emphasis">
        Попробуйте изменить параметры поиска или добавить новый продукт
      </p>
    </div>

    <!-- Список продуктов -->
    <div v-else>
      <!-- Мобильная версия (карточки) -->
      <div class="d-block d-md-none">
        <v-row>
          <v-col v-for="product in products" :key="product.id" cols="12" sm="6">
            <product-card
              :product="product"
              :loading="loading"
              @edit="$emit('edit', product)"
              @toggle-active="$emit('toggle-active', product)"
              @view-details="$emit('view-details', product)"
            />
          </v-col>
        </v-row>
      </div>

      <!-- Десктопная версия (таблица) -->
      <div class="d-none d-md-block">
        <v-data-table
          :headers="tableHeaders"
          :items="products"
          :loading="loading"
          item-key="id"
          class="elevation-0"
          :items-per-page="25"
          :search="undefined"
          show-current-page
        >
          <!-- Название продукта -->
          <template #[`item.name`]="{ item }">
            <div class="d-flex align-center">
              <div>
                <div class="font-weight-medium">{{ item.name }}</div>
                <div v-if="item.description" class="text-caption text-medium-emphasis">
                  {{ item.description }}
                </div>
              </div>
            </div>
          </template>

          <!-- Категория -->
          <template #[`item.category`]="{ item }">
            <v-chip :color="getCategoryColor(item.category)" size="small" variant="tonal">
              {{ getCategoryLabel(item.category) }}
            </v-chip>
          </template>

          <!-- Единица измерения -->
          <template #[`item.unit`]="{ item }">
            <v-chip size="small" variant="outlined">
              {{ getUnitLabel(item.unit) }}
            </v-chip>
          </template>

          <!-- Процент выхода -->
          <template #[`item.yieldPercentage`]="{ item }">
            <div class="text-center">
              <v-chip :color="getYieldColor(item.yieldPercentage)" size="small" variant="tonal">
                {{ item.yieldPercentage }}%
              </v-chip>
            </div>
          </template>

          <!-- Статус -->
          <template #[`item.isActive`]="{ item }">
            <v-chip :color="item.isActive ? 'success' : 'error'" size="small" variant="tonal">
              {{ item.isActive ? 'Активен' : 'Неактивен' }}
            </v-chip>
          </template>

          <!-- Дата создания -->
          <template #[`item.createdAt`]="{ item }">
            <div class="text-caption">
              {{ formatDate(item.createdAt) }}
            </div>
          </template>

          <!-- Действия -->
          <template #[`item.actions`]="{ item }">
            <div class="d-flex align-center ga-1">
              <v-btn
                icon="mdi-eye"
                size="small"
                variant="text"
                color="info"
                density="comfortable"
                @click="$emit('view-details', item)"
              >
                <v-icon>mdi-eye</v-icon>
                <v-tooltip activator="parent">Подробности</v-tooltip>
              </v-btn>

              <v-btn
                icon="mdi-pencil"
                size="small"
                variant="text"
                color="primary"
                density="comfortable"
                @click="$emit('edit', item)"
              >
                <v-icon>mdi-pencil</v-icon>
                <v-tooltip activator="parent">Редактировать</v-tooltip>
              </v-btn>

              <v-btn
                :icon="item.isActive ? 'mdi-pause' : 'mdi-play'"
                size="small"
                variant="text"
                :color="item.isActive ? 'warning' : 'success'"
                density="comfortable"
                :loading="loading"
                @click="$emit('toggle-active', item)"
              >
                <v-icon>{{ item.isActive ? 'mdi-pause' : 'mdi-play' }}</v-icon>
                <v-tooltip activator="parent">
                  {{ item.isActive ? 'Деактивировать' : 'Активировать' }}
                </v-tooltip>
              </v-btn>
            </div>
          </template>
        </v-data-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/stores/productsStore'
import { PRODUCT_CATEGORIES, MEASUREMENT_UNITS } from '@/stores/productsStore'
import { Formatter } from '@/utils'
import ProductCard from './ProductCard.vue'

// Props
interface Props {
  products: Product[]
  loading?: boolean
}

// Remove unused props assignment
defineProps<Props>()

// Emits
interface Emits {
  (e: 'edit', product: Product): void
  (e: 'toggle-active', product: Product): void
  (e: 'view-details', product: Product): void
}

defineEmits<Emits>()

// Заголовки таблицы
const tableHeaders = computed(() => [
  {
    title: 'Название',
    key: 'name',
    align: 'start' as const,
    sortable: true,
    width: '25%'
  },
  {
    title: 'Категория',
    key: 'category',
    align: 'center' as const,
    sortable: true,
    width: '15%'
  },
  {
    title: 'Ед. изм.',
    key: 'unit',
    align: 'center' as const,
    sortable: true,
    width: '10%'
  },
  {
    title: 'Выход',
    key: 'yieldPercentage',
    align: 'center' as const,
    sortable: true,
    width: '10%'
  },
  {
    title: 'Статус',
    key: 'isActive',
    align: 'center' as const,
    sortable: true,
    width: '10%'
  },
  {
    title: 'Создан',
    key: 'createdAt',
    align: 'center' as const,
    sortable: true,
    width: '15%'
  },
  {
    title: 'Действия',
    key: 'actions',
    align: 'center' as const,
    sortable: false,
    width: '15%'
  }
])

// Методы
const getCategoryLabel = (category: string): string => {
  return PRODUCT_CATEGORIES[category as keyof typeof PRODUCT_CATEGORIES] || category
}

const getUnitLabel = (unit: string): string => {
  return MEASUREMENT_UNITS[unit as keyof typeof MEASUREMENT_UNITS] || unit
}

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    meat: 'red',
    vegetables: 'green',
    fruits: 'orange',
    dairy: 'blue',
    cereals: 'amber',
    spices: 'purple',
    seafood: 'cyan',
    beverages: 'indigo',
    other: 'grey'
  }
  return colors[category] || 'grey'
}

const getYieldColor = (percentage: number): string => {
  if (percentage >= 90) return 'success'
  if (percentage >= 75) return 'warning'
  return 'error'
}

const formatDate = (dateString: string): string => {
  return Formatter.formatDate(dateString)
}
</script>

<style scoped>
.products-list {
  min-height: 200px;
}
</style>
