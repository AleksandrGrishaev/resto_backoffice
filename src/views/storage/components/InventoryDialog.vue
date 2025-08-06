<!-- src/views/storage/components/InventoryDialog.vue - ИСПРАВЛЕННАЯ ВЕРСИЯ -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="900px"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h3>
            {{ currentInventory ? 'Edit' : 'Start' }} Inventory -
            {{ formatDepartment(department) }} {{ formatItemType(itemType) }}
          </h3>
          <div class="text-caption text-medium-emphasis">
            {{
              currentInventory
                ? `Editing ${currentInventory.documentNumber}`
                : 'Count all items and enter actual quantities'
            }}
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="handleClose" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <v-form ref="form" v-model="isFormValid">
          <!-- Responsible Person -->
          <v-text-field
            v-model="responsiblePerson"
            label="Responsible Person"
            :rules="[v => !!v || 'Required field']"
            prepend-inner-icon="mdi-account"
            variant="outlined"
            class="mb-4"
          />

          <!-- Progress and Filters -->
          <div class="mb-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <div>
                <div class="text-subtitle-1">
                  Progress: {{ countedItems }}/{{ totalItems }} items counted
                  <span v-if="categoryFilter !== 'all'" class="text-caption text-medium-emphasis">
                    (filtered)
                  </span>
                </div>
                <v-progress-linear
                  :model-value="progressPercentage"
                  height="6"
                  rounded
                  color="primary"
                  class="mt-1"
                />
              </div>

              <div class="d-flex gap-2">
                <v-btn-toggle v-model="filterType" density="compact">
                  <v-btn value="all" size="small">All</v-btn>
                  <v-btn value="discrepancy" size="small">Discrepancies</v-btn>
                  <v-btn value="uncounted" size="small">Uncounted</v-btn>
                </v-btn-toggle>
              </div>
            </div>

            <!-- ✅ ИСПРАВЛЕНО: Фильтр по категориям с количествами -->
            <div v-if="categoriesWithCount.length > 1" class="mb-2">
              <v-select
                v-model="categoryFilter"
                :items="categoriesWithCount"
                label="Filter by category"
                variant="outlined"
                density="compact"
                hide-details
                prepend-inner-icon="mdi-filter-variant"
              >
                <template #selection="{ item }">
                  <span class="text-body-2">{{ item.title }}</span>
                </template>
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps" :title="item.title">
                    <template #append>
                      <v-icon
                        v-if="item.value === categoryFilter"
                        icon="mdi-check"
                        color="primary"
                        size="16"
                      />
                    </template>
                  </v-list-item>
                </template>
              </v-select>
            </div>
          </div>

          <!-- Items List -->
          <div class="inventory-items">
            <div v-if="filteredItems.length === 0" class="text-center py-8 text-medium-emphasis">
              <v-icon icon="mdi-clipboard-list" size="48" class="mb-2" />
              <div v-if="categoryFilter !== 'all'">
                <div>No items in this category</div>
                <div class="text-caption">
                  Try selecting a different category or "All" to see all items
                </div>
                <v-btn size="small" variant="outlined" class="mt-2" @click="categoryFilter = 'all'">
                  Show All Items
                </v-btn>
              </div>
              <div v-else-if="filterType !== 'all'">
                <div>No items match current filter</div>
                <div class="text-caption">
                  Try selecting "All" to see all {{ formatItemType(itemType) }}
                </div>
                <v-btn size="small" variant="outlined" class="mt-2" @click="filterType = 'all'">
                  Show All Items
                </v-btn>
              </div>
              <div v-else>
                <div>No items to count</div>
                <div class="text-caption">All {{ formatItemType(itemType) }} have been counted</div>
              </div>
            </div>

            <div v-else>
              <!-- ✅ ДОБАВЛЕНО: Показываем информацию о фильтрации -->
              <div v-if="categoryFilter !== 'all' || filterType !== 'all'" class="text-center mb-3">
                <v-chip size="small" color="primary" variant="tonal">
                  <v-icon icon="mdi-filter" size="14" class="mr-1" />
                  Showing {{ filteredItems.length }} of {{ totalItems }} items
                  <v-btn
                    icon="mdi-close"
                    size="x-small"
                    variant="text"
                    class="ml-1"
                    @click="clearAllFilters"
                  />
                </v-chip>
              </div>

              <inventory-item-row
                v-for="item in filteredItems"
                :key="item.id"
                v-model="inventoryItems[getItemIndex(item.id)]"
                class="mb-2"
                @update:model-value="updateInventoryItem"
              />
            </div>
          </div>

          <!-- Summary -->
          <v-card v-if="hasSummary" variant="tonal" color="info" class="mt-4">
            <v-card-text>
              <div class="text-subtitle-1 font-weight-medium mb-2">Inventory Summary</div>
              <v-row>
                <v-col cols="12" md="3">
                  <div class="text-caption text-medium-emphasis">Total Items</div>
                  <div class="text-h6">{{ totalItems }}</div>
                </v-col>
                <v-col cols="12" md="3">
                  <div class="text-caption text-medium-emphasis">Discrepancies</div>
                  <div
                    class="text-h6"
                    :class="discrepancyCount > 0 ? 'text-warning' : 'text-success'"
                  >
                    {{ discrepancyCount }}
                  </div>
                </v-col>
                <v-col cols="12" md="3">
                  <div class="text-caption text-medium-emphasis">Value Difference</div>
                  <div
                    class="text-h6"
                    :class="valueDifference !== 0 ? 'text-warning' : 'text-success'"
                  >
                    {{ formatCurrency(valueDifference) }}
                  </div>
                </v-col>
                <v-col cols="12" md="3">
                  <div class="text-caption text-medium-emphasis">Status</div>
                  <v-chip :color="isComplete ? 'success' : 'warning'" size="small" variant="flat">
                    {{ isComplete ? 'Complete' : 'In Progress' }}
                  </v-chip>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Debug Info (только в dev режиме) -->
          <v-card v-if="showDebugInfo" variant="outlined" color="info" class="mt-4">
            <v-card-text>
              <div class="text-subtitle-2 mb-2">Debug Info:</div>
              <div class="text-caption">
                <div>Existing inventory: {{ !!props.existingInventory }}</div>
                <div>Current inventory: {{ !!currentInventory }}</div>
                <div>Inventory status: {{ currentInventory?.status || 'none' }}</div>
                <div>Has changes: {{ hasChanges }}</div>
                <div>Items with changes: {{ itemsWithChanges }}</div>
                <div>All items touched: {{ allItemsTouched }}</div>
                <div>Can save draft: {{ canSaveDraft }}</div>
                <div>Can finalize: {{ canFinalize }}</div>
                <div>Available categories: {{ availableCategories.join(', ') }}</div>
                <div>Categories with count: {{ categoriesWithCount.length }}</div>
              </div>
            </v-card-text>
          </v-card>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />

        <!-- Debug Toggle (только в dev) -->
        <v-btn
          v-if="isDev"
          icon="mdi-bug"
          variant="text"
          size="small"
          @click="showDebugInfo = !showDebugInfo"
        />

        <v-btn variant="outlined" @click="handleClose">Cancel</v-btn>

        <!-- Save Draft Button - показываем только для черновиков -->
        <v-btn
          v-if="!currentInventory || currentInventory.status === 'draft'"
          color="warning"
          variant="outlined"
          :loading="loading"
          :disabled="!canSaveDraft"
          @click="handleSaveDraft"
        >
          {{ currentInventory ? 'Update Draft' : 'Save Draft' }}
        </v-btn>

        <!-- Finalize Button -->
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          :disabled="!canFinalize"
          @click="handleFinalize"
        >
          {{
            currentInventory?.status === 'draft'
              ? 'Finalize Inventory'
              : currentInventory
                ? 'Update & Finalize'
                : 'Start & Finalize Inventory'
          }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useStorageStore } from '@/stores/storage'
import { useProductsStore } from '@/stores/productsStore' // ✅ ДОБАВЛЕНО: Импорт products store
import { useRecipesStore } from '@/stores/recipes' // ✅ ДОБАВЛЕНО: Импорт recipes store
import type {
  StorageDepartment,
  StorageItemType,
  CreateInventoryData,
  InventoryItem,
  InventoryDocument
} from '@/stores/storage'
import { DebugUtils } from '@/utils'
import { PRODUCT_CATEGORIES } from '@/stores/productsStore' // ✅ ДОБАВЛЕНО: Импорт констант категорий
import { PREPARATION_TYPES } from '@/stores/recipes' // ✅ ДОБАВЛЕНО: Импорт констант типов

// Components
import InventoryItemRow from './InventoryItemRow.vue'

const MODULE_NAME = 'InventoryDialog'

// Props
interface Props {
  modelValue: boolean
  department: StorageDepartment
  itemType: StorageItemType
  existingInventory?: InventoryDocument | null
}

const props = withDefaults(defineProps<Props>(), {
  existingInventory: null
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [message: string]
  error: [message: string]
}>()

// Stores
const storageStore = useStorageStore()
const productsStore = useProductsStore() // ✅ ДОБАВЛЕНО
const recipesStore = useRecipesStore() // ✅ ДОБАВЛЕНО

// State
const form = ref()
const isFormValid = ref(false)
const loading = ref(false)
const responsiblePerson = ref('')
const filterType = ref('all')
const categoryFilter = ref('all')
const inventoryItems = ref<InventoryItem[]>([])
const currentInventory = ref<InventoryDocument | null>(null)
const showDebugInfo = ref(false)

// ✅ ИСПРАВЛЕНО: Правильное определение dev режима
const isDev = computed(() => {
  return process.env.NODE_ENV === 'development' || import.meta.env?.DEV
})

// Computed
const availableBalances = computed(() =>
  storageStore.state.balances.filter(
    b => b.department === props.department && b.itemType === props.itemType && b.totalQuantity > 0
  )
)

// ✅ ИСПРАВЛЕНО: Правильное получение доступных категорий
const availableCategories = computed(() => {
  try {
    const categories = new Set<string>()

    if (props.itemType === 'product') {
      // Получаем категории только из товаров, которые есть в инвентаризации
      inventoryItems.value.forEach(item => {
        const product = productsStore.products.find(p => p.id === item.itemId)
        if (product && product.category) {
          categories.add(product.category)
        }
      })
    } else {
      // Получаем типы только из полуфабрикатов, которые есть в инвентаризации
      inventoryItems.value.forEach(item => {
        const preparation = recipesStore.preparations.find(p => p.id === item.itemId)
        if (preparation && preparation.type) {
          categories.add(preparation.type)
        }
      })
    }

    return Array.from(categories).sort()
  } catch (error) {
    console.warn('Error getting categories:', error)
    return []
  }
})

// ✅ ИСПРАВЛЕНО: Получение категорий с человеко-читаемыми названиями
const categoriesWithCount = computed(() => {
  const categoryMap = new Map<string, { count: number; name: string }>()

  try {
    if (props.itemType === 'product') {
      inventoryItems.value.forEach(item => {
        const product = productsStore.products.find(p => p.id === item.itemId)
        const category = product?.category || 'other'
        const categoryName = PRODUCT_CATEGORIES[category] || 'Прочее'

        if (!categoryMap.has(category)) {
          categoryMap.set(category, { count: 0, name: categoryName })
        }
        categoryMap.get(category)!.count++
      })
    } else {
      inventoryItems.value.forEach(item => {
        const preparation = recipesStore.preparations.find(p => p.id === item.itemId)
        const type = preparation?.type || 'other'
        const typeName = PREPARATION_TYPES.find(t => t.value === type)?.text || 'Прочее'

        if (!categoryMap.has(type)) {
          categoryMap.set(type, { count: 0, name: typeName })
        }
        categoryMap.get(type)!.count++
      })
    }

    // Формируем список с количествами
    const result = [
      {
        title: `All ${formatItemType(props.itemType)} (${inventoryItems.value.length})`,
        value: 'all'
      }
    ]

    // Сортируем категории по названию и добавляем в результат
    Array.from(categoryMap.entries())
      .sort(([, a], [, b]) => a.name.localeCompare(b.name))
      .forEach(([categoryKey, categoryData]) => {
        result.push({
          title: `${categoryData.name} (${categoryData.count})`,
          value: categoryKey
        })
      })

    return result
  } catch (error) {
    console.warn('Error creating categories with count:', error)
    return [{ title: `All ${formatItemType(props.itemType)}`, value: 'all' }]
  }
})

const filteredItems = computed(() => {
  let items = [...inventoryItems.value]

  // ✅ ИСПРАВЛЕНО: Фильтр по категориям
  if (categoryFilter.value !== 'all') {
    items = items.filter(item => {
      try {
        if (props.itemType === 'product') {
          const product = productsStore.products.find(p => p.id === item.itemId)
          return (product?.category || 'other') === categoryFilter.value
        } else {
          const preparation = recipesStore.preparations.find(p => p.id === item.itemId)
          return (preparation?.type || 'other') === categoryFilter.value
        }
      } catch (error) {
        console.warn('Error filtering by category:', error)
        return true
      }
    })
  }

  // Фильтр по статусу (все/расхождения/непосчитанные)
  switch (filterType.value) {
    case 'discrepancy':
      items = items.filter(item => Math.abs(item.difference) > 0.01)
      break
    case 'uncounted':
      items = items.filter(item => !hasItemBeenCounted(item))
      break
    default:
      // показываем все
      break
  }

  return items
})

const totalItems = computed(() => inventoryItems.value.length)

// ✅ ИСПРАВЛЕНО: Правильный подсчет пересчитанных товаров
const countedItems = computed(
  () => inventoryItems.value.filter(item => hasItemBeenCounted(item)).length
)

// ✅ НОВОЕ: Helper для определения, был ли товар пересчитан
function hasItemBeenCounted(item: InventoryItem): boolean {
  return (
    !!item.countedBy ||
    Math.abs(item.actualQuantity - item.systemQuantity) > 0.001 ||
    item.confirmed === true
  )
}

const progressPercentage = computed(() =>
  totalItems.value > 0 ? (countedItems.value / totalItems.value) * 100 : 0
)

const discrepancyCount = computed(
  () => inventoryItems.value.filter(item => Math.abs(item.difference) > 0.01).length
)

const valueDifference = computed(() =>
  inventoryItems.value.reduce((sum, item) => sum + item.valueDifference, 0)
)

// ✅ ИСПРАВЛЕНО: Проверяем, что хотя бы один товар был изменен
const hasChanges = computed(
  () =>
    inventoryItems.value.some(item => hasItemBeenCounted(item)) ||
    inventoryItems.value.every(item => item.confirmed === true)
)

// ✅ НОВОЕ: Дополнительные computed для отладки
const itemsWithChanges = computed(
  () => inventoryItems.value.filter(item => hasItemBeenCounted(item)).length
)

const allItemsTouched = computed(() => inventoryItems.value.every(item => hasItemBeenCounted(item)))

// ✅ ИСПРАВЛЕНО: Условие завершенности
const isComplete = computed(() => {
  if (totalItems.value === 0) return false
  const countedPercentage = (countedItems.value / totalItems.value) * 100
  return countedItems.value === totalItems.value || (countedItems.value > 0 && hasChanges.value)
})

const hasSummary = computed(() => inventoryItems.value.length > 0)

const canSaveDraft = computed(
  () => isFormValid.value && responsiblePerson.value && !loading.value && hasChanges.value
)

const canFinalize = computed(() => {
  if (!isFormValid.value || !responsiblePerson.value || loading.value) return false
  return hasChanges.value && totalItems.value > 0
})

// Methods
function formatDepartment(dept: StorageDepartment): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}

function formatItemType(type: StorageItemType): string {
  return type === 'product' ? 'Products' : 'Preparations'
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function getItemIndex(itemId: string): number {
  return inventoryItems.value.findIndex(item => item.id === itemId)
}

function clearAllFilters() {
  categoryFilter.value = 'all'
  filterType.value = 'all'
}

function updateInventoryItem(updatedItem: InventoryItem) {
  const index = inventoryItems.value.findIndex(item => item.id === updatedItem.id)
  if (index !== -1) {
    if (!updatedItem.countedBy && hasItemBeenCounted(updatedItem)) {
      updatedItem.countedBy = responsiblePerson.value || 'User'
    }

    inventoryItems.value[index] = updatedItem

    DebugUtils.info(MODULE_NAME, 'Inventory item updated', {
      itemId: updatedItem.itemId,
      itemName: updatedItem.itemName,
      systemQuantity: updatedItem.systemQuantity,
      actualQuantity: updatedItem.actualQuantity,
      difference: updatedItem.difference,
      countedBy: updatedItem.countedBy
    })
  }
}

function initializeInventoryItems() {
  inventoryItems.value = availableBalances.value.map(balance => ({
    id: `inv-item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    itemId: balance.itemId,
    itemType: balance.itemType,
    itemName: balance.itemName,
    systemQuantity: balance.totalQuantity,
    actualQuantity: balance.totalQuantity,
    difference: 0,
    unit: balance.unit,
    averageCost: balance.averageCost,
    valueDifference: 0,
    notes: '',
    countedBy: ''
  }))

  DebugUtils.info(MODULE_NAME, 'Inventory items initialized', {
    count: inventoryItems.value.length,
    department: props.department,
    itemType: props.itemType
  })
}

function loadExistingInventory() {
  if (!props.existingInventory) return

  try {
    DebugUtils.info(MODULE_NAME, 'Loading existing inventory', {
      inventoryId: props.existingInventory.id,
      status: props.existingInventory.status
    })

    currentInventory.value = props.existingInventory
    responsiblePerson.value = props.existingInventory.responsiblePerson

    if (props.existingInventory.items && props.existingInventory.items.length > 0) {
      inventoryItems.value = [...props.existingInventory.items]
    } else {
      initializeInventoryItems()
    }

    DebugUtils.info(MODULE_NAME, 'Existing inventory loaded', {
      itemCount: inventoryItems.value.length,
      status: props.existingInventory.status
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to load existing inventory', { error })
    initializeInventoryItems()
  }
}

async function handleSaveDraft() {
  if (!canSaveDraft.value) return

  try {
    loading.value = true
    DebugUtils.info(MODULE_NAME, 'Saving inventory draft', {
      department: props.department,
      itemType: props.itemType,
      responsiblePerson: responsiblePerson.value,
      itemsChanged: itemsWithChanges.value,
      totalItems: totalItems.value
    })

    if (!currentInventory.value) {
      const inventoryData: CreateInventoryData = {
        department: props.department,
        itemType: props.itemType,
        responsiblePerson: responsiblePerson.value
      }

      currentInventory.value = await storageStore.startInventory(inventoryData)
      DebugUtils.info(MODULE_NAME, 'New inventory created', {
        inventoryId: currentInventory.value.id
      })
    }

    if (storageStore.updateInventory) {
      const updatedInventory = await storageStore.updateInventory(
        currentInventory.value.id,
        inventoryItems.value
      )
      currentInventory.value = updatedInventory
    } else {
      DebugUtils.warn(MODULE_NAME, 'updateInventory method not available in store')
    }

    DebugUtils.info(MODULE_NAME, 'Inventory draft saved successfully', {
      inventoryId: currentInventory.value.id,
      itemCount: inventoryItems.value.length,
      discrepancies: discrepancyCount.value,
      valueDifference: valueDifference.value
    })

    emit(
      'success',
      `Inventory draft saved successfully. ${itemsWithChanges.value}/${totalItems.value} items counted.`
    )
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to save inventory draft', { error })
    emit('error', 'Failed to save inventory draft')
  } finally {
    loading.value = false
  }
}

async function handleFinalize() {
  if (!canFinalize.value) return

  try {
    loading.value = true
    DebugUtils.info(MODULE_NAME, 'Finalizing inventory', {
      department: props.department,
      itemType: props.itemType,
      responsiblePerson: responsiblePerson.value,
      discrepancies: discrepancyCount.value,
      valueDifference: valueDifference.value,
      allItemsCounted: isComplete.value
    })

    if (!currentInventory.value) {
      const inventoryData: CreateInventoryData = {
        department: props.department,
        itemType: props.itemType,
        responsiblePerson: responsiblePerson.value
      }

      currentInventory.value = await storageStore.startInventory(inventoryData)
    }

    if (storageStore.updateInventory) {
      await storageStore.updateInventory(currentInventory.value.id, inventoryItems.value)
    }

    if (storageStore.finalizeInventory) {
      await storageStore.finalizeInventory(currentInventory.value.id)
    }

    DebugUtils.info(MODULE_NAME, 'Inventory finalized successfully', {
      inventoryId: currentInventory.value.id,
      totalDiscrepancies: discrepancyCount.value,
      totalValueDifference: valueDifference.value
    })

    const discrepancyMessage =
      discrepancyCount.value > 0
        ? `${discrepancyCount.value} discrepancies found with ${formatCurrency(Math.abs(valueDifference.value))} value difference.`
        : 'No discrepancies found.'

    emit('success', `Inventory completed successfully. ${discrepancyMessage}`)
    handleClose()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to finalize inventory', { error })
    emit('error', 'Failed to finalize inventory')
  } finally {
    loading.value = false
  }
}

function handleClose() {
  resetForm()
  emit('update:modelValue', false)
}

function resetForm() {
  responsiblePerson.value = ''
  filterType.value = 'all'
  categoryFilter.value = 'all'
  inventoryItems.value = []
  currentInventory.value = null
  showDebugInfo.value = false

  if (form.value) {
    form.value.resetValidation()
  }
}

// ✅ ДОБАВЛЕНО: Инициализация stores при монтировании компонента
async function initializeStores() {
  try {
    // Загружаем данные stores если они еще не загружены
    if (productsStore.products.length === 0) {
      await productsStore.loadProducts(true) // используем mock данные
    }

    if (recipesStore.preparations.length === 0) {
      await recipesStore.fetchPreparations()
    }

    DebugUtils.info(MODULE_NAME, 'Stores initialized', {
      productsCount: productsStore.products.length,
      preparationsCount: recipesStore.preparations.length
    })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to initialize stores', { error })
  }
}

// Watch for dialog open
watch(
  () => props.modelValue,
  async isOpen => {
    if (isOpen) {
      // ✅ ДОБАВЛЕНО: Инициализируем stores перед загрузкой данных
      await initializeStores()

      if (props.existingInventory) {
        loadExistingInventory()
      } else {
        initializeInventoryItems()
      }
    }
  }
)

// Watch for existing inventory changes
watch(
  () => props.existingInventory,
  newInventory => {
    if (newInventory && props.modelValue) {
      loadExistingInventory()
    }
  }
)
</script>

<style lang="scss" scoped>
.inventory-items {
  max-height: 500px;
  overflow-y: auto;
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  border-radius: 8px;
  padding: 8px;
}
</style>
