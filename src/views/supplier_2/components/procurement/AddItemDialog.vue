<!-- src/views/supplier_2/components/procurement/AddItemDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="600px" persistent>
    <v-card>
      <v-card-title class="pa-4">
        <span class="text-h6">Add Item to Request</span>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-row>
          <!-- Category Filter -->
          <v-col cols="12">
            <v-select
              v-model="selectedCategory"
              :items="categoryOptions"
              item-title="label"
              item-value="value"
              label="Filter by Category"
              variant="outlined"
              prepend-inner-icon="mdi-filter-variant"
              clearable
              @update:model-value="onCategoryChange"
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props">
                  <template #prepend>
                    <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
                  </template>
                  <v-list-item-title>{{ item.raw.label }}</v-list-item-title>
                  <v-list-item-subtitle>{{ item.raw.count }} items</v-list-item-subtitle>
                </v-list-item>
              </template>
            </v-select>
          </v-col>

          <!-- Item Selection -->
          <v-col cols="12">
            <v-select
              v-model="selectedItemId"
              :items="filteredItems"
              item-title="name"
              item-value="id"
              label="Select Item"
              :rules="[rules.required]"
              variant="outlined"
              return-object
              :no-data-text="noDataText"
              :loading="productsStore.loading"
              @update:model-value="handleItemSelection"
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props">
                  <template #prepend>
                    <v-avatar
                      size="32"
                      :color="getCategoryColor(item.raw.category)"
                      variant="tonal"
                    >
                      <v-icon size="18">{{ getCategoryIcon(item.raw.category) }}</v-icon>
                    </v-avatar>
                  </template>
                  <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                  <v-list-item-subtitle>
                    {{ getCategoryLabel(item.raw.category) }} •
                    <strong>{{ getDisplayUnit(item.raw) }}</strong>
                    <v-chip v-if="!item.raw.isActive" size="x-small" color="warning" class="ml-2">
                      Inactive
                    </v-chip>
                    <v-chip
                      v-if="item.raw.baseUnit === 'piece'"
                      size="x-small"
                      color="info"
                      class="ml-1"
                    >
                      Whole units only
                    </v-chip>
                  </v-list-item-subtitle>
                </v-list-item>
              </template>
            </v-select>
          </v-col>

          <!-- Quantity and Unit Row -->
          <v-col cols="8">
            <v-text-field
              v-model.number="quantity"
              type="number"
              label="Quantity"
              :min="quantityMin"
              :step="quantityStep"
              :rules="[rules.required, rules.positive, rules.integer]"
              variant="outlined"
              :hint="quantityHint"
              persistent-hint
            />
          </v-col>

          <v-col cols="4">
            <v-text-field
              :key="selectedItem?.id || 'empty'"
              :model-value="displayUnit"
              label="Unit"
              readonly
              variant="outlined"
              :placeholder="selectedItem ? '' : 'Select item first'"
            />
          </v-col>

          <!-- Notes -->
          <v-col cols="12">
            <v-textarea
              v-model="notes"
              label="Notes (Optional)"
              variant="outlined"
              rows="2"
              auto-grow
              placeholder="Add any special requirements or notes..."
            />
          </v-col>

          <!-- Preview Card -->
          <v-col v-if="selectedItem" cols="12">
            <v-card variant="tonal" :color="getCategoryColor(selectedItem.category)" class="mb-2">
              <v-card-text class="pa-3">
                <div class="d-flex align-center justify-space-between">
                  <div class="d-flex align-center">
                    <v-avatar
                      size="40"
                      :color="getCategoryColor(selectedItem.category)"
                      variant="flat"
                      class="mr-3"
                    >
                      <v-icon color="white">{{ getCategoryIcon(selectedItem.category) }}</v-icon>
                    </v-avatar>
                    <div>
                      <div class="text-subtitle-2 font-weight-bold">{{ selectedItem.name }}</div>
                      <div class="text-body-2">
                        {{ quantity }} {{ displayUnit }}
                        <v-chip
                          size="x-small"
                          :color="getCategoryColor(selectedItem.category)"
                          class="ml-2"
                        >
                          {{ getCategoryLabel(selectedItem.category) }}
                        </v-chip>
                      </div>
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="text-caption">Estimated Price</div>
                    <div class="text-subtitle-2 font-weight-bold">
                      {{ formatCurrency(estimatedTotalPrice) }}
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatCurrency(estimatedUnitPrice) }} per {{ displayUnit }}
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- Loading State -->
          <v-col v-if="productsStore.loading" cols="12">
            <v-card variant="outlined" class="pa-4">
              <div class="d-flex align-center">
                <v-progress-circular size="24" indeterminate class="mr-3" />
                <span>Loading products...</span>
              </div>
            </v-card>
          </v-col>

          <!-- Error State -->
          <v-col v-if="productsStore.error" cols="12">
            <v-alert type="error" variant="tonal">
              <template #title>Error Loading Products</template>
              {{ productsStore.error }}
              <template #append>
                <v-btn size="small" @click="reloadProducts">Retry</v-btn>
              </template>
            </v-alert>
          </v-col>
        </v-row>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn color="grey" variant="outlined" @click="cancel">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!isValid"
          :loading="adding"
          @click="addItem"
        >
          Add Item
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import type { RequestItem } from '@/stores/supplier_2/types'
import type { Product, ProductCategory } from '@/stores/productsStore/types'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
  department?: 'kitchen' | 'bar'
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'item-added', item: RequestItem): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// STORE
// =============================================

const productsStore = useProductsStore()

// =============================================
// LOCAL STATE
// =============================================

const selectedItemId = ref<Product | null>(null)
const quantity = ref(1)
const notes = ref('')
const selectedCategory = ref<ProductCategory | 'all' | null>(null)
const adding = ref(false)

// =============================================
// COMPUTED
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

const selectedItem = computed(() => {
  return selectedItemId.value
})

// Получаем правильную единицу измерения для отображения
const displayUnit = computed(() => {
  if (!selectedItem.value) return ''

  // Приоритет: purchaseUnit > unit
  return selectedItem.value.purchaseUnit || selectedItem.value.unit || ''
})

// Проверяем, является ли товар штучным
const isUnitItem = computed(() => {
  if (!selectedItem.value) return false
  return selectedItem.value.baseUnit === 'piece'
})

// Параметры для поля количества
const quantityMin = computed(() => (isUnitItem.value ? 1 : 0.01))
const quantityStep = computed(() => (isUnitItem.value ? 1 : 0.01))
const quantityHint = computed(() => {
  if (!selectedItem.value) return ''
  return isUnitItem.value ? 'Enter whole number of items' : 'Enter quantity (decimal allowed)'
})

// Фильтруем продукты по отделению и активности
const availableItems = computed(() => {
  const items = productsStore.products.filter(product => {
    // Основные фильтры
    if (!product.isActive) return false

    // Фильтр по отделению (если указан)
    if (props.department) {
      if (props.department === 'kitchen') {
        // Для кухни исключаем только напитки
        return !['beverages'].includes(product.category)
      } else if (props.department === 'bar') {
        // Для бара только напитки и основные ингредиенты
        return ['beverages', 'fruits', 'dairy'].includes(product.category)
      }
    }

    return true
  })

  // Сортируем по названию
  return items.sort((a, b) => a.name.localeCompare(b.name))
})

// Фильтрованные товары по категории
const filteredItems = computed(() => {
  if (!selectedCategory.value || selectedCategory.value === 'all') {
    return availableItems.value
  }
  return availableItems.value.filter(item => item.category === selectedCategory.value)
})

// Опции категорий с подсчетом товаров
const categoryOptions = computed(() => {
  const categories = [...new Set(availableItems.value.map(item => item.category))]

  const options = [
    {
      value: 'all',
      label: 'All Categories',
      icon: 'mdi-view-grid',
      color: 'primary',
      count: availableItems.value.length
    }
  ]

  categories.forEach(category => {
    const count = availableItems.value.filter(item => item.category === category).length
    if (count > 0) {
      options.push({
        value: category,
        label: getCategoryLabel(category),
        icon: getCategoryIcon(category),
        color: getCategoryColor(category),
        count
      })
    }
  })

  return options.sort((a, b) => {
    if (a.value === 'all') return -1
    if (b.value === 'all') return 1
    return a.label.localeCompare(b.label)
  })
})

const noDataText = computed(() => {
  if (productsStore.loading) return 'Loading products...'
  if (productsStore.error) return 'Error loading products'
  if (selectedCategory.value && selectedCategory.value !== 'all') {
    return `No active items found in ${getCategoryLabel(selectedCategory.value)} category`
  }
  return 'No active products available'
})

// Расчет цены
const estimatedUnitPrice = computed(() => {
  if (!selectedItem.value) return 0

  // Просто берём baseCostPerUnit из продукта
  return selectedItem.value.baseCostPerUnit || 0
})

const estimatedTotalPrice = computed(() => {
  if (!selectedItem.value) return 0

  const product = selectedItem.value
  let baseQuantity = quantity.value

  // Конвертируем если нужно
  const displayUnit = getDisplayUnit(product)
  if (displayUnit !== product.baseUnit) {
    if (displayUnit === 'kg' && product.baseUnit === 'gram') {
      baseQuantity = quantity.value * 1000
    } else if (displayUnit === 'liter' && product.baseUnit === 'ml') {
      baseQuantity = quantity.value * 1000
    }
  }

  return baseQuantity * (product.baseCostPerUnit || 0)
})

const isValid = computed(() => {
  return selectedItem.value && quantity.value > 0
})

// =============================================
// VALIDATION RULES
// =============================================

const rules = {
  required: (value: any) => !!value || 'This field is required',
  positive: (value: number) => value > 0 || 'Quantity must be greater than 0',
  integer: (value: number) => {
    if (!isUnitItem.value) return true // Для не штучных товаров разрешаем дробные
    return Number.isInteger(value) || 'Must be a whole number for piece items'
  }
}

// =============================================
// WATCHERS
// =============================================

// Reset form when dialog opens
watch(isOpen, newValue => {
  if (newValue) {
    resetForm()
    ensureProductsLoaded()
  }
})

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  ensureProductsLoaded()
})

// =============================================
// METHODS
// =============================================

async function ensureProductsLoaded() {
  if (productsStore.products.length === 0 && !productsStore.loading) {
    try {
      await productsStore.loadProducts()
    } catch (error) {
      console.error('Failed to load products:', error)
    }
  }
}

async function reloadProducts() {
  try {
    await productsStore.loadProducts()
  } catch (error) {
    console.error('Failed to reload products:', error)
  }
}

function resetForm() {
  selectedItemId.value = null
  quantity.value = 1
  notes.value = ''
  selectedCategory.value = null
}

function onCategoryChange(category: ProductCategory | 'all' | null) {
  // Если выбрана другая категория, сбрасываем выбранный товар
  if (selectedItem.value && selectedItem.value.category !== category && category !== 'all') {
    selectedItemId.value = null
  }
}

function handleItemSelection(item: Product | null) {
  selectedItemId.value = item

  // Сбрасываем количество до правильного значения для типа товара
  if (item) {
    quantity.value = item.baseUnit === 'piece' ? 1 : 1
  }
}

function cancel() {
  isOpen.value = false
}

async function addItem() {
  if (!isValid.value) return

  adding.value = true

  try {
    const newItem: RequestItem = {
      id: `temp-${Date.now()}`, // temporary ID
      itemId: selectedItem.value!.id,
      itemName: selectedItem.value!.name,
      requestedQuantity: quantity.value,
      unit: getDisplayUnit(selectedItem.value!),
      notes: notes.value || undefined
    }

    emits('item-added', newItem)
    isOpen.value = false
  } catch (error) {
    console.error('Error adding item:', error)
  } finally {
    adding.value = false
  }
}

// =============================================
// HELPER METHODS
// =============================================

function getDisplayUnit(product: Product): string {
  // Приоритет: purchaseUnit > unit
  const unit = product.purchaseUnit || product.unit || 'kg'

  // Преобразуем некоторые единицы в более понятные названия
  const unitMap: Record<string, string> = {
    piece: 'pcs',
    kg: 'kg',
    liter: 'L',
    gram: 'g',
    ml: 'ml',
    pack: 'pack',
    bottle: 'bottle'
  }

  return unitMap[unit] || unit
}

function getCategoryIcon(category: ProductCategory): string {
  const icons: Record<ProductCategory, string> = {
    meat: 'mdi-food-steak',
    vegetables: 'mdi-carrot',
    fruits: 'mdi-food-apple',
    beverages: 'mdi-bottle-soda-classic',
    dairy: 'mdi-cow',
    cereals: 'mdi-grain',
    spices: 'mdi-chili-hot',
    seafood: 'mdi-fish',
    other: 'mdi-package-variant'
  }
  return icons[category] || 'mdi-package-variant'
}

function getCategoryColor(category: ProductCategory): string {
  const colors: Record<ProductCategory, string> = {
    meat: 'red',
    vegetables: 'green',
    fruits: 'orange',
    beverages: 'blue',
    dairy: 'indigo',
    cereals: 'amber',
    spices: 'deep-orange',
    seafood: 'teal',
    other: 'grey'
  }
  return colors[category] || 'grey'
}

// ✅ UPDATED: Get category label from store
function getCategoryLabel(categoryId: string): string {
  return productsStore.getCategoryName(categoryId)
}

function getEstimatedPrice(product: Product): number {
  // Приоритет цен:
  // 1. currentPurchasePrice (текущая цена закупки)
  // 2. baseCostPerUnit * purchaseToBaseRatio (рассчитанная цена за единицу закупки)
  // 3. costPerUnit (старая цена)

  if (product.currentPurchasePrice) {
    return product.currentPurchasePrice
  }

  if (product.baseCostPerUnit && product.purchaseToBaseRatio) {
    return product.baseCostPerUnit * product.purchaseToBaseRatio
  }

  return product.costPerUnit || 0
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(amount)
}
</script>

<style scoped>
.v-card-text {
  max-height: 70vh;
  overflow-y: auto;
}

.v-list-item-subtitle {
  opacity: 0.8 !important;
}

/* Стили для preview карточки */
.v-card[variant='tonal'] .v-avatar[variant='flat'] {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Стили для неактивных продуктов */
.v-list-item--disabled {
  opacity: 0.6;
}
</style>
