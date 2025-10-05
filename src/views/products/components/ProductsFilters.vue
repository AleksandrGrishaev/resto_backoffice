<!-- src/views/products/components/ProductsFilters.vue - Упрощенная версия -->
<template>
  <v-card class="mb-4">
    <v-card-text class="py-4">
      <v-row align="center">
        <!-- Поиск -->
        <v-col cols="12" md="5">
          <v-text-field
            v-model="localFilters.search"
            label="Поиск продуктов"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            clearable
            :loading="loading"
            placeholder="Введите название продукта..."
            hide-details
            @input="debouncedUpdate"
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
            hide-details
            @update:model-value="updateFilters"
          >
            <template #prepend-inner>
              <v-icon>mdi-tag</v-icon>
            </template>
          </v-select>
        </v-col>

        <!-- Department Filter -->
        <v-col cols="12" sm="6" md="2">
          <v-select
            v-model="localFilters.department"
            :items="departmentOptions"
            label="Department"
            variant="outlined"
            density="compact"
            hide-details
            @update:model-value="updateFilters"
          >
            <template #prepend-inner>
              <v-icon :icon="getDepartmentIcon(localFilters.department)" size="small" />
            </template>
          </v-select>
        </v-col>

        <!-- Статус активности -->
        <v-col cols="12" md="2">
          <v-select
            v-model="localFilters.isActive"
            :items="statusOptions"
            label="Статус"
            variant="outlined"
            density="compact"
            :loading="loading"
            hide-details
            @update:model-value="updateFilters"
          >
            <template #prepend-inner>
              <v-icon>mdi-check-circle</v-icon>
            </template>
          </v-select>
        </v-col>

        <!-- Кнопка сброса -->
        <v-col cols="12" md="2">
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

            <v-chip
              v-if="localFilters.department !== 'all'"
              size="small"
              color="primary"
              variant="outlined"
              closable
              @click:close="clearDepartmentFilter"
            >
              {{ getDepartmentLabel(localFilters.department) }}
              <!-- ✅ Динамическое значение -->
            </v-chip>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { ProductCategory, Department } from '@/stores/productsStore'
import { PRODUCT_CATEGORIES } from '@/stores/productsStore'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'ProductsFilters'

// Simplified filters type
type SimpleFilters = {
  category: ProductCategory | 'all'
  isActive: boolean | 'all'
  search: string
  department: Department | 'all' // ✅ ДОБАВИТЬ
}

// Props
interface Props {
  filters: SimpleFilters
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

// Emits
interface Emits {
  (e: 'update:filters', filters: SimpleFilters): void
  (e: 'reset'): void
}

const emit = defineEmits<Emits>()

// Локальное состояние
const localFilters = ref<SimpleFilters>({
  category: 'all',
  isActive: 'all',
  search: '',
  department: 'all' // ✅ ДОБАВИТЬ
})

// Debounced update for search
let searchTimeout: ReturnType<typeof setTimeout>
const debouncedUpdate = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    updateFilters()
  }, 300)
}

// ✅ ДОБАВИТЬ: Department options
const departmentOptions = computed(() => [
  { title: 'All Departments', value: 'all' },
  { title: 'Kitchen', value: 'kitchen' },
  { title: 'Bar', value: 'bar' }
])

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
    localFilters.value.isActive !== 'all' ||
    localFilters.value.department !== 'all'
  )
})

// Отслеживание изменений в props
watch(
  () => props.filters,
  newFilters => {
    localFilters.value = {
      category: newFilters.category,
      isActive: newFilters.isActive,
      search: newFilters.search,
      department: newFilters.department
    }
  },
  { deep: true, immediate: true }
)

// Методы
const updateFilters = (): void => {
  console.log('📤 ProductsFilters: emitting filters', { ...localFilters.value }) // ✅ ДОБАВИТЬ
  emit('update:filters', { ...localFilters.value })
  DebugUtils.debug(MODULE_NAME, 'Filters updated', { filters: localFilters.value })
}

const resetFilters = (): void => {
  localFilters.value = {
    category: 'all',
    isActive: 'all',
    search: '',
    department: 'all'
  }
  emit('reset')
  DebugUtils.debug(MODULE_NAME, 'Filters reset')
}

// ✅ ДОБАВИТЬ
const clearDepartmentFilter = (): void => {
  localFilters.value.department = 'all'
  updateFilters()
}

// ✅ ДОБАВИТЬ
const getDepartmentLabel = (department: Department | 'all'): string => {
  if (department === 'all') return 'All Departments'
  return department === 'kitchen' ? 'Kitchen' : 'Bar'
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

// Вспомогательные методы для отображения
const getCategoryLabel = (category: ProductCategory | 'all'): string => {
  if (category === 'all') return 'Все категории'
  return PRODUCT_CATEGORIES[category] || category
}

const getStatusLabel = (status: boolean | 'all'): string => {
  if (status === 'all') return 'Все'
  return status ? 'Активные' : 'Неактивные'
}

// ✅ ДОБАВИТЬ helper для иконок
const getDepartmentIcon = (dept: Department | 'all'): string => {
  if (dept === 'kitchen') return 'mdi-silverware-fork-knife'
  if (dept === 'bar') return 'mdi-coffee'
  return 'mdi-filter-outline'
}
</script>

<style scoped>
/* Минимальные стили */
</style>
