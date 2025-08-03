<!-- src/views/products/components/ProductDetailsDialog.vue -->
<template>
  <v-dialog v-model="localModelValue" max-width="700px" scrollable>
    <v-card v-if="product">
      <!-- Заголовок -->
      <v-card-title class="d-flex align-center">
        <v-icon start color="info">mdi-information</v-icon>
        <span>Детали продукта</span>
        <v-spacer />
        <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog" />
      </v-card-title>

      <v-divider />

      <!-- Основная информация -->
      <v-card-text class="pa-0">
        <!-- Заголовок продукта -->
        <div class="pa-6 pb-4">
          <div class="d-flex align-center justify-space-between mb-4">
            <div>
              <h2 class="text-h5 mb-2">{{ product.name }}</h2>
              <div class="d-flex align-center ga-2">
                <v-chip :color="getCategoryColor(product.category)" variant="tonal">
                  {{ getCategoryLabel(product.category) }}
                </v-chip>
                <v-chip :color="product.isActive ? 'success' : 'error'" variant="tonal">
                  {{ product.isActive ? 'Активен' : 'Неактивен' }}
                </v-chip>
                <v-chip :color="getYieldColor(product.yieldPercentage)" variant="tonal">
                  Выход: {{ product.yieldPercentage }}%
                </v-chip>
              </div>
            </div>
          </div>

          <div v-if="product.description" class="mb-4">
            <h3 class="text-h6 mb-2">Описание</h3>
            <p class="text-body-1">{{ product.description }}</p>
          </div>
        </div>

        <v-divider />

        <!-- Детальная информация -->
        <div class="pa-6">
          <h3 class="text-h6 mb-4">Характеристики</h3>

          <v-row>
            <!-- Основные параметры -->
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="h-100">
                <v-card-title class="text-subtitle-1">
                  <v-icon start color="primary">mdi-information-outline</v-icon>
                  Основные параметры
                </v-card-title>
                <v-card-text>
                  <div class="detail-items">
                    <div class="detail-item">
                      <span class="detail-label">Единица измерения:</span>
                      <v-chip size="small" variant="outlined">
                        {{ getUnitLabel(product.unit) }}
                      </v-chip>
                    </div>

                    <div class="detail-item">
                      <span class="detail-label">Процент выхода:</span>
                      <v-chip
                        :color="getYieldColor(product.yieldPercentage)"
                        size="small"
                        variant="tonal"
                      >
                        {{ product.yieldPercentage }}%
                      </v-chip>
                    </div>

                    <div class="detail-item">
                      <span class="detail-label">Статус:</span>
                      <v-chip
                        :color="product.isActive ? 'success' : 'error'"
                        size="small"
                        variant="tonal"
                      >
                        {{ product.isActive ? 'Активен' : 'Неактивен' }}
                      </v-chip>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Хранение и учет -->
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="h-100">
                <v-card-title class="text-subtitle-1">
                  <v-icon start color="warning">mdi-package-variant</v-icon>
                  Хранение и учет
                </v-card-title>
                <v-card-text>
                  <div class="detail-items">
                    <div v-if="product.storageConditions" class="detail-item">
                      <span class="detail-label">Условия хранения:</span>
                      <span class="detail-value">{{ product.storageConditions }}</span>
                    </div>

                    <div v-if="product.shelfLife" class="detail-item">
                      <span class="detail-label">Срок годности:</span>
                      <span class="detail-value">{{ product.shelfLife }} дней</span>
                    </div>

                    <div v-if="product.minStock" class="detail-item">
                      <span class="detail-label">Минимальный остаток:</span>
                      <span class="detail-value">
                        {{ product.minStock }} {{ getUnitLabel(product.unit) }}
                      </span>
                    </div>

                    <div
                      v-if="!product.storageConditions && !product.shelfLife && !product.minStock"
                      class="text-center text-medium-emphasis"
                    >
                      <v-icon>mdi-information-outline</v-icon>
                      <div class="text-caption mt-2">Дополнительная информация не указана</div>
                    </div>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <v-divider />

        <!-- Временные метки -->
        <div class="pa-6">
          <h3 class="text-h6 mb-4">История</h3>

          <v-row>
            <v-col cols="12" md="6">
              <div class="d-flex align-center">
                <v-icon color="success" class="me-3">mdi-calendar-plus</v-icon>
                <div>
                  <div class="text-body-2 font-weight-medium">Создан</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ formatDateTime(product.createdAt) }}
                  </div>
                </div>
              </div>
            </v-col>

            <v-col cols="12" md="6">
              <div class="d-flex align-center">
                <v-icon color="info" class="me-3">mdi-calendar-edit</v-icon>
                <div>
                  <div class="text-body-2 font-weight-medium">Последнее изменение</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ formatDateTime(product.updatedAt) }}
                  </div>
                </div>
              </div>
            </v-col>
          </v-row>
        </div>

        <!-- Будущие интеграции -->
        <v-divider />
        <div class="pa-6">
          <h3 class="text-h6 mb-4">Связанная информация</h3>

          <v-alert type="info" variant="tonal" class="mb-4">
            <template #title>
              <v-icon start>mdi-lightbulb-on</v-icon>
              Планируемый функционал
            </template>
            <div class="text-body-2">
              В следующих версиях здесь будет отображаться:
              <ul class="mt-2">
                <li>Текущие остатки продукта</li>
                <li>История поставок и цены</li>
                <li>Использование в блюдах</li>
                <li>Аналитика потребления</li>
              </ul>
            </div>
          </v-alert>

          <v-row>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="text-center pa-4">
                <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-warehouse</v-icon>
                <div class="text-body-2 font-weight-medium">Остатки</div>
                <div class="text-caption text-medium-emphasis">Скоро</div>
              </v-card>
            </v-col>

            <v-col cols="12" md="4">
              <v-card variant="outlined" class="text-center pa-4">
                <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-truck-delivery</v-icon>
                <div class="text-body-2 font-weight-medium">Поставки</div>
                <div class="text-caption text-medium-emphasis">Скоро</div>
              </v-card>
            </v-col>

            <v-col cols="12" md="4">
              <v-card variant="outlined" class="text-center pa-4">
                <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-chart-line</v-icon>
                <div class="text-body-2 font-weight-medium">Аналитика</div>
                <div class="text-caption text-medium-emphasis">Скоро</div>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </v-card-text>

      <!-- Действия -->
      <v-divider />
      <v-card-actions class="px-6 py-4">
        <v-spacer />
        <v-btn variant="text" @click="closeDialog">Закрыть</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Product } from '@/stores/productsStore'
import { PRODUCT_CATEGORIES, MEASUREMENT_UNITS } from '@/stores/productsStore'
import { Formatter } from '@/utils'

// Props
interface Props {
  modelValue: boolean
  product?: Product | null
}

const props = withDefaults(defineProps<Props>(), {
  product: null
})

// Emits
interface Emits {
  (e: 'update:modelValue', value: boolean): void
}

const emit = defineEmits<Emits>()

// Computed
const localModelValue = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

// Методы
const closeDialog = (): void => {
  emit('update:modelValue', false)
}

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

const formatDateTime = (dateString: string): string => {
  return Formatter.formatFullDateTime(dateString)
}
</script>

<style scoped>
.detail-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.detail-label {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  min-width: 120px;
}

.detail-value {
  font-size: 0.875rem;
  font-weight: 500;
  text-align: right;
}
</style>
