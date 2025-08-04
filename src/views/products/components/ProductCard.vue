<!-- src/views/products/components/ProductCard.vue -->
<template>
  <v-card
    class="product-card"
    :class="{ 'product-card--inactive': !product.isActive }"
    elevation="2"
    hover
  >
    <!-- Заголовок карточки -->
    <v-card-title class="pb-2">
      <div class="d-flex align-center justify-space-between w-100">
        <div class="flex-grow-1">
          <div class="product-name">{{ product.name }}</div>
          <div class="d-flex align-center ga-2 mt-1">
            <v-chip :color="getCategoryColor(product.category)" size="x-small" variant="tonal">
              {{ getCategoryLabel(product.category) }}
            </v-chip>
            <v-chip :color="product.isActive ? 'success' : 'error'" size="x-small" variant="tonal">
              {{ product.isActive ? 'Активен' : 'Неактивен' }}
            </v-chip>
          </div>
        </div>
      </div>
    </v-card-title>

    <!-- Описание -->
    <v-card-text class="py-2">
      <div v-if="product.description" class="text-body-2 text-medium-emphasis mb-3">
        {{ product.description }}
      </div>

      <!-- Основная информация -->
      <div class="product-info">
        <v-row dense>
          <v-col cols="6">
            <div class="info-item">
              <v-icon size="small" color="primary" class="me-2">mdi-scale</v-icon>
              <span class="text-caption">Единица:</span>
              <span class="font-weight-medium ms-1">
                {{ formatUnit(product.unit) }}
              </span>
            </div>
          </v-col>
          <v-col cols="6">
            <div class="info-item">
              <v-icon size="small" color="success" class="me-2">mdi-currency-usd</v-icon>
              <span class="text-caption">Цена:</span>
              <span class="font-weight-medium ms-1">
                {{ formatCurrency(product.costPerUnit) }}
              </span>
            </div>
          </v-col>
        </v-row>

        <v-row dense class="mt-1">
          <v-col cols="6">
            <div class="info-item">
              <v-icon size="small" color="primary" class="me-2">mdi-percent</v-icon>
              <span class="text-caption">Выход:</span>
              <v-chip
                :color="getYieldColor(product.yieldPercentage)"
                size="x-small"
                variant="tonal"
                class="ms-1"
              >
                {{ product.yieldPercentage }}%
              </v-chip>
            </div>
          </v-col>
          <v-col cols="6">
            <div class="info-item">
              <v-icon size="small" color="info" class="me-2">mdi-information</v-icon>
              <span class="text-caption">ID:</span>
              <span class="font-weight-medium ms-1 text-caption">
                {{ product.id.split('-')[0] }}...
              </span>
            </div>
          </v-col>
        </v-row>

        <!-- Дополнительная информация -->
        <v-row v-if="product.shelfLife || product.minStock" dense class="mt-1">
          <v-col v-if="product.shelfLife" cols="6">
            <div class="info-item">
              <v-icon size="small" color="warning" class="me-2">mdi-calendar-clock</v-icon>
              <span class="text-caption">Срок:</span>
              <span class="font-weight-medium ms-1">{{ product.shelfLife }} дн.</span>
            </div>
          </v-col>
          <v-col v-if="product.minStock" cols="6">
            <div class="info-item">
              <v-icon size="small" color="info" class="me-2">mdi-package-down</v-icon>
              <span class="text-caption">Мин.:</span>
              <span class="font-weight-medium ms-1">
                {{ product.minStock }} {{ formatUnit(product.unit) }}
              </span>
            </div>
          </v-col>
        </v-row>

        <!-- Условия хранения -->
        <div v-if="product.storageConditions" class="mt-3">
          <div class="d-flex align-start">
            <v-icon size="small" color="info" class="me-2 mt-1">mdi-thermometer</v-icon>
            <div>
              <div class="text-caption text-medium-emphasis">Хранение:</div>
              <div class="text-body-2">{{ product.storageConditions }}</div>
            </div>
          </div>
        </div>
      </div>
    </v-card-text>

    <!-- Действия -->
    <v-card-actions>
      <v-btn
        variant="text"
        size="small"
        color="info"
        prepend-icon="mdi-eye"
        @click="$emit('view-details', product)"
      >
        Подробнее
      </v-btn>

      <v-spacer />

      <v-btn
        variant="text"
        size="small"
        color="primary"
        icon="mdi-pencil"
        @click="$emit('edit', product)"
      >
        <v-icon>mdi-pencil</v-icon>
        <v-tooltip activator="parent">Редактировать</v-tooltip>
      </v-btn>

      <v-btn
        variant="text"
        size="small"
        :color="product.isActive ? 'warning' : 'success'"
        :icon="product.isActive ? 'mdi-pause' : 'mdi-play'"
        :loading="loading"
        @click="$emit('toggle-active', product)"
      >
        <v-icon>{{ product.isActive ? 'mdi-pause' : 'mdi-play' }}</v-icon>
        <v-tooltip activator="parent">
          {{ product.isActive ? 'Деактивировать' : 'Активировать' }}
        </v-tooltip>
      </v-btn>
    </v-card-actions>

    <!-- Дата создания в footer -->
    <v-divider />
    <div class="text-caption text-center pa-2 text-medium-emphasis">
      Создан: {{ formatDate(product.createdAt) }}
    </div>
  </v-card>
</template>

<script setup lang="ts">
import type { Product } from '@/stores/productsStore'
import { PRODUCT_CATEGORIES } from '@/stores/productsStore'
import { useMeasurementUnits } from '@/composables/useMeasurementUnits'
import { Formatter } from '@/utils'

// Props
interface Props {
  product: Product
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
interface Emits {
  (e: 'edit', product: Product): void
  (e: 'toggle-active', product: Product): void
  (e: 'view-details', product: Product): void
}

defineEmits<Emits>()

// Composables
const { getUnitName } = useMeasurementUnits()

// Методы
const getCategoryLabel = (category: string): string => {
  return PRODUCT_CATEGORIES[category as keyof typeof PRODUCT_CATEGORIES] || category
}

const formatUnit = (unit: string): string => {
  return getUnitName(unit as any)
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
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
.product-card {
  height: 100%;
  transition: all 0.3s ease;
}

.product-card--inactive {
  opacity: 0.7;
}

.product-card:hover {
  transform: translateY(-2px);
}

.product-name {
  font-weight: 500;
  font-size: 1.1rem;
  line-height: 1.2;
}

.product-info {
  background: rgba(var(--v-theme-surface-variant), 0.3);
  border-radius: 8px;
  padding: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
}
</style>
