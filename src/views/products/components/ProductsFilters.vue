<!-- src/views/products/components/ProductsFilters.vue -->
<template>
  <v-card class="mb-4">
    <v-card-title class="pb-2">
      <v-icon start>mdi-filter</v-icon>
      Фильтры и поиск
      <v-spacer />
      <v-chip v-if="hasActiveFilters" color="primary" size="small" variant="tonal">
        {{ activeFiltersCount }} активных
      </v-chip>
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

      <!-- Расширенные фильтры -->
      <v-row v-if="showAdvancedFilters" class="mt-2">
        <v-col cols="12" md="3">
          <v-select
            v-model="localFilters.unit"
            :items="unitOptions"
            label="Единица измерения"
            variant="outlined"
            density="compact"
            clearable
            :loading="loading"
            @update:model-value="updateFilters"
          >
            <template #prepend-inner>
              <v-icon>mdi-scale</v-icon>
            </template>
          </v-select>
        </v-col>

        <v-col cols="12" md="3">
          <v-range-slider
            v-model="yieldRange"
            label="Выход продукта (%)"
            min="0"
            max="100"
            step="5"
            thumb-label="always"
            class="mt-4"
            @update:model-value="updateYieldFilter"
          />
        </v-col>

        <v-col cols="12" md="3">
          <v-switch
            v-model="localFilters.lowStock"
            label="Заканчивающиеся"
            color="warning"
            density="compact"
            hide-details
            @update:model-value="updateFilters"
          />
        </v-col>

        <v-col cols="12" md="3">
          <v-switch
            v-model="localFilters.expiringSoon"
            label="Истекает срок"
            color="error"
            density="compact"
            hide-details
            @update:model-value="updateFilters"
          />
        </v-col>
      </v-row>

      <!-- Переключатель расширенных фильтров -->
      <v-row class="mt-2">
        <v-col>
          <v-btn
            variant="text"
            size="small"
            color="primary"
            @click="showAdvancedFilters = !showAdvancedFilters"
          >
            <v-icon start>
              {{ showAdvancedFilters ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
            </v-icon>
            {{ showAdvancedFilters ? 'Скрыть' : 'Показать' }} расширенные фильтры
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

            <v-chip
              v-if="localFilters.unit"
              size="small"
              color="primary"
              variant="outlined"
              closable
              @click:close="clearUnitFilter"
            >
              Единица: {{ getUnitLabel(localFilters.unit) }}
            </v-chip>

            <v-chip
              v-if="hasYieldFilter"
              size="small"
              color="primary"
              variant="outlined"
              closable
              @click:close="clearYieldFilter"
            >
              Выход: {{ yieldRange[0] }}-{{ yieldRange[1] }}%
            </v-chip>

            <v-chip
              v-if="localFilters.lowStock"
              size="small"
              color="warning"
              variant="outlined"
              closable
              @click:close="clearLowStockFilter"
            >
              Заканчивающиеся
            </v-chip>

            <v-chip
              v-if="localFilters.expiringSoon"
              size="small"
              color="error"
              variant="outlined"
              closable
              @click:close="clearExpiringSoonFilter"
            >
              Истекает срок
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
import { useProductUnits } from '@/composables/useProductUnits'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ProductsFilters'

// Базовый тип фильтров
type BaseFilters = {
  category: ProductCategory | 'all'
  isActive: boolean | 'all'
  search: string
}

// Расширенные фильтры
interface ExtendedFilters extends BaseFilters {
  unit?: string
  yieldMin?: number
  yieldMax?: number
  lowStock?: boolean
  expiringSoon?: boolean
}

// Props
interface Props {
  filters: BaseFilters
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
interface Emits {
  (e: 'update:filters', filters: ExtendedFilters): void
  (e: 'reset'): void
}

const emit = defineEmits<Emits>()

// Composables
const { unitOptions: productUnitOptions } = useProductUnits()

// Локальное состояние
const showAdvancedFilters = ref(false)
const yieldRange = ref([0, 100])

const localFilters = ref<ExtendedFilters>({
  category: 'all',
  isActive: 'all',
  search: '',
  unit: undefined,
  yieldMin: 0,
  yieldMax: 100,
  lowStock: false,
  expiringSoon: false
})

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

const unitOptions = computed(() => [
  { title: 'Все единицы', value: '' },
  ...productUnitOptions.value
])

// Проверка наличия активных фильтров
const hasActiveFilters = computed(() => {
  return (
    localFilters.value.search !== '' ||
    localFilters.value.category !== 'all' ||
    localFilters.value.isActive !== 'all' ||
    !!localFilters.value.unit ||
    hasYieldFilter.value ||
    localFilters.value.lowStock ||
    localFilters.value.expiringSoon
  )
})

const hasYieldFilter = computed(() => {
  return yieldRange.value[0] > 0 || yieldRange.value[1] < 100
})

const activeFiltersCount = computed(() => {
  let count = 0
  if (localFilters.value.search) count++
  if (localFilters.value.category !== 'all') count++
  if (localFilters.value.isActive !== 'all') count++
  if (localFilters.value.unit) count++
  if (hasYieldFilter.value) count++
  if (localFilters.value.lowStock) count++
  if (localFilters.value.expiringSoon) count++
  return count
})

// Отслеживание изменений в props
watch(
  () => props.filters,
  newFilters => {
    localFilters.value = {
      ...localFilters.value,
      category: newFilters.category,
      isActive: newFilters.isActive,
      search: newFilters.search
    }
  },
  { deep: true, immediate: true }
)

// Методы
const updateFilters = (): void => {
  emit('update:filters', { ...localFilters.value })
  DebugUtils.debug(MODULE_NAME, 'Filters updated', { filters: localFilters.value })
}

const updateYieldFilter = (): void => {
  localFilters.value.yieldMin = yieldRange.value[0]
  localFilters.value.yieldMax = yieldRange.value[1]
  updateFilters()
}

const resetFilters = (): void => {
  localFilters.value = {
    category: 'all',
    isActive: 'all',
    search: '',
    unit: undefined,
    yieldMin: 0,
    yieldMax: 100,
    lowStock: false,
    expiringSoon: false
  }
  yieldRange.value = [0, 100]
  emit('reset')
  DebugUtils.debug(MODULE_NAME, 'Filters reset')
}

// Методы очистки отдельных фильтров
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

const clearUnitFilter = (): void => {
  localFilters.value.unit = undefined
  updateFilters()
}

const clearYieldFilter = (): void => {
  yieldRange.value = [0, 100]
  updateYieldFilter()
}

const clearLowStockFilter = (): void => {
  localFilters.value.lowStock = false
  updateFilters()
}

const clearExpiringSoonFilter = (): void => {
  localFilters.value.expiringSoon = false
  updateFilters()
}

// Вспомогательные методы для отображения
const getCategoryLabel = (category: ProductCategory | 'all'): string => {
  if (category === 'all') return 'Все категории'
  return PRODUCT_CATEGORIES[category] || category
}

const getStatusLabel = (status: boolean | 'all'): string => {
  if (status === 'all') return 'Все'
  return status ? 'Активные' : 'Неактивные'
}

const getUnitLabel = (unit: string): string => {
  const option = productUnitOptions.value.find(opt => opt.value === unit)
  return option?.title || unit
}
</script>

<style scoped>
/* Дополнительные стили при необходимости */
</style>
