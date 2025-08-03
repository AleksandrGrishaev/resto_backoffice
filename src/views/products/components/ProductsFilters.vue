<!-- src/views/products/components/ProductsFilters.vue -->
<template>
  <v-card class="mb-4">
    <v-card-title class="pb-2">
      <v-icon start>mdi-filter</v-icon>
      Фильтры
    </v-card-title>

    <v-card-text>
      <v-row>
        <!-- Поиск -->
        <v-col cols="12" md="4">
          <v-text-field
            v-model="localFilters.search"
            label="Поиск продуктов"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            clearable
            :loading="loading"
            placeholder="Введите название продукта..."
            @input="updateFilters"
          />
        </v-col>

        <!-- Категория -->
        <v-col cols="12" md="3">
          <v-select
            v-model="localFilters.category"
            :items="categoryOptions"
            label="Категория"
            variant="outlined"
            density="compact"
            :loading="loading"
            @update:model-value="updateFilters"
          >
            <template #prepend-inner>
              <v-icon>mdi-tag</v-icon>
            </template>
          </v-select>
        </v-col>

        <!-- Статус активности -->
        <v-col cols="12" md="3">
          <v-select
            v-model="localFilters.isActive"
            :items="statusOptions"
            label="Статус"
            variant="outlined"
            density="compact"
            :loading="loading"
            @update:model-value="updateFilters"
          >
            <template #prepend-inner>
              <v-icon>mdi-check-circle</v-icon>
            </template>
          </v-select>
        </v-col>

        <!-- Кнопка сброса -->
        <v-col cols="12" md="2" class="d-flex align-center">
          <v-btn
            variant="outlined"
            color="primary"
            block
            :disabled="loading || !hasActiveFilters"
            @click="resetFilters"
          >
            <v-icon start>mdi-refresh</v-icon>
            Сбросить
          </v-btn>
        </v-col>
      </v-row>

      <!-- Индикатор активных фильтров -->
      <v-row v-if="hasActiveFilters" class="mt-2">
        <v-col>
          <div class="d-flex align-center flex-wrap ga-2">
            <span class="text-caption text-medium-emphasis">Активные фильтры:</span>

            <v-chip
              v-if="localFilters.search"
              size="small"
              color="primary"
              variant="outlined"
              closable
              @click:close="clearSearchFilter"
            >
              Поиск: "{{ localFilters.search }}"
            </v-chip>

            <v-chip
              v-if="localFilters.category !== 'all'"
              size="small"
              color="primary"
              variant="outlined"
              closable
              @click:close="clearCategoryFilter"
            >
              {{ getCategoryLabel(localFilters.category) }}
            </v-chip>

            <v-chip
              v-if="localFilters.isActive !== 'all'"
              size="small"
              color="primary"
              variant="outlined"
              closable
              @click:close="clearStatusFilter"
            >
              {{ getStatusLabel(localFilters.isActive) }}
            </v-chip>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ProductsState, ProductCategory } from '@/stores/productsStore'
import { PRODUCT_CATEGORIES } from '@/stores/productsStore'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ProductsFilters'

// Props
interface Props {
  filters: ProductsState['filters']
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
interface Emits {
  (e: 'update:filters', filters: ProductsState['filters']): void
  (e: 'reset'): void
}

const emit = defineEmits<Emits>()

// Локальное состояние фильтров
const localFilters = ref({ ...props.filters })

// Опции для селектов
const categoryOptions = computed(() => [
  { title: 'Все категории', value: 'all' },
  ...Object.entries(PRODUCT_CATEGORIES).map(([value, title]) => ({
    title,
    value
  }))
])

const statusOptions = computed(() => [
  { title: 'Все', value: 'all' },
  { title: 'Активные', value: true },
  { title: 'Неактивные', value: false }
])

// Проверка наличия активных фильтров
const hasActiveFilters = computed(() => {
  return (
    localFilters.value.search !== '' ||
    localFilters.value.category !== 'all' ||
    localFilters.value.isActive !== 'all'
  )
})

// Отслеживание изменений в props
watch(
  () => props.filters,
  newFilters => {
    localFilters.value = { ...newFilters }
  },
  { deep: true }
)

// Методы
const updateFilters = (): void => {
  emit('update:filters', { ...localFilters.value })
  DebugUtils.debug(MODULE_NAME, 'Filters updated', { filters: localFilters.value })
}

const resetFilters = (): void => {
  localFilters.value = {
    category: 'all',
    isActive: 'all',
    search: ''
  }
  emit('reset')
  DebugUtils.debug(MODULE_NAME, 'Filters reset')
}

const clearSearchFilter = (): void => {
  localFilters.value.search = ''
  updateFilters()
}

const clearCategoryFilter = (): void => {
  localFilters.value.category = 'all'
  updateFilters()
}

const clearStatusFilter = (): void => {
  localFilters.value.isActive = 'all'
  updateFilters()
}

const getCategoryLabel = (category: ProductCategory | 'all'): string => {
  if (category === 'all') return 'Все категории'
  return PRODUCT_CATEGORIES[category] || category
}

const getStatusLabel = (status: boolean | 'all'): string => {
  if (status === 'all') return 'Все'
  return status ? 'Активные' : 'Неактивные'
}
</script>

<style scoped>
/* Дополнительные стили при необходимости */
</style>
