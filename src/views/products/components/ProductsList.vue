<!-- src/views/products/components/ProductsList.vue - SAFE VERSION -->
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

    <!-- Таблица продуктов -->
    <div v-else>
      <v-data-table
        :headers="tableHeaders"
        :items="products"
        :loading="loading"
        item-key="id"
        class="elevation-0"
        :items-per-page="25"
        :search="undefined"
        show-current-page
        hover
      >
        <!-- Название продукта -->
        <template #[`item.name`]="{ item }">
          <div class="product-name-cell">
            <div class="font-weight-medium">{{ item.name }}</div>
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
            {{ formatUnit(item) }}
          </v-chip>
        </template>

        <!-- Стоимость -->
        <template #[`item.costPerUnit`]="{ item }">
          <div class="text-end">
            <div class="font-weight-medium">{{ formatCurrency(item.costPerUnit) }}</div>
          </div>
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
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/stores/productsStore'
import { PRODUCT_CATEGORIES } from '@/stores/productsStore'
import { getUnitShortName } from '@/types/measurementUnits'

// Props
interface Props {
  products: Product[]
  loading?: boolean
}

defineProps<Props>()

// Emits
interface Emits {
  (e: 'edit', product: Product): void
  (e: 'toggle-active', product: Product): void
  (e: 'view-details', product: Product): void
}

defineEmits<Emits>()

// Упрощенные заголовки таблицы
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
    title: 'Измерение',
    key: 'unit',
    align: 'center' as const,
    sortable: true,
    width: '12%'
  },
  {
    title: 'Стоимость',
    key: 'costPerUnit',
    align: 'end' as const,
    sortable: true,
    width: '15%'
  },
  {
    title: '%',
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
    width: '13%'
  },
  {
    title: 'Действия',
    key: 'actions',
    align: 'center' as const,
    sortable: false,
    width: '10%'
  }
])

// ✅ ИСПРАВЛЕННЫЕ МЕТОДЫ с защитой от undefined
const getCategoryLabel = (category: string): string => {
  return PRODUCT_CATEGORIES[category as keyof typeof PRODUCT_CATEGORIES] || category
}

/**
 * ✅ ИСПРАВЛЕНО: Безопасное форматирование единиц измерения
 */
const formatUnit = (product: Product): string => {
  // Проверяем разные возможные поля для единицы измерения
  const unit = product.unit || (product as any).baseUnit || (product as any).measurementUnit

  if (!unit) {
    // Если нет единицы измерения, возвращаем placeholder
    return 'н/д'
  }

  // Используем безопасную функцию getUnitShortName
  return getUnitShortName(unit)
}

const formatCurrency = (amount: number | undefined | null): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0 IDR'
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
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

const getYieldColor = (percentage: number | undefined | null): string => {
  if (typeof percentage !== 'number' || isNaN(percentage)) {
    return 'grey'
  }

  if (percentage >= 90) return 'success'
  if (percentage >= 75) return 'warning'
  return 'error'
}
</script>

<style scoped>
.products-list {
  min-height: 200px;
}

.product-name-cell {
  min-width: 150px;
}
</style>
