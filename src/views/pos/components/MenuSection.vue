<!-- src/views/pos/components/MenuSection.vue -->
<template>
  <div class="menu-section">
    <!-- Header with Categories -->
    <div class="menu-header pa-3">
      <v-chip-group v-model="selectedCategory" mandatory class="mb-2">
        <v-chip
          v-for="category in categories"
          :key="category.id"
          :value="category.id"
          variant="outlined"
          size="small"
        >
          {{ category.name }}
        </v-chip>
      </v-chip-group>

      <!-- Search -->
      <v-text-field
        v-model="searchQuery"
        placeholder="Поиск блюд..."
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        clearable
      />
    </div>

    <!-- Menu Items Grid -->
    <div class="menu-content pa-3">
      <v-row dense>
        <v-col v-for="item in filteredItems" :key="item.id" cols="6" sm="4" lg="3">
          <v-card
            variant="outlined"
            class="menu-item-card h-100"
            :disabled="!item.isAvailable"
            @click="addItemToOrder(item)"
          >
            <v-card-text class="pa-3 d-flex flex-column h-100">
              <!-- Item Image Placeholder -->
              <div class="item-image mb-2">
                <v-avatar size="48" color="grey-lighten-2" class="mx-auto d-block">
                  <v-icon>mdi-silverware-fork-knife</v-icon>
                </v-avatar>
              </div>

              <!-- Item Info -->
              <div class="flex-grow-1">
                <div class="text-subtitle-2 text-center mb-1">
                  {{ item.name }}
                </div>

                <div
                  v-if="item.description"
                  class="text-caption text-medium-emphasis text-center mb-2"
                >
                  {{ item.description }}
                </div>
              </div>

              <!-- Price and Availability -->
              <div class="text-center">
                <div class="text-h6 font-weight-bold text-primary">₽{{ item.price }}</div>

                <v-chip
                  v-if="!item.isAvailable"
                  color="error"
                  size="x-small"
                  variant="flat"
                  class="mt-1"
                >
                  Нет в наличии
                </v-chip>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- Empty State -->
      <div v-if="filteredItems.length === 0" class="text-center pa-8">
        <v-icon size="64" color="grey">mdi-food-off</v-icon>
        <div class="text-h6 text-medium-emphasis mt-2">Блюда не найдены</div>
        <div class="text-body-2 text-medium-emphasis">
          Попробуйте изменить категорию или поисковой запрос
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import type { PosMenuItem } from '@/stores/pos/types'

// Stores
const ordersStore = usePosOrdersStore()

// State
const selectedCategory = ref('hot')
const searchQuery = ref('')

// Mock data (TODO: заменить на реальные данные из menu store)
const categories = [
  { id: 'hot', name: 'Горячие блюда' },
  { id: 'cold', name: 'Холодные закуски' },
  { id: 'soups', name: 'Супы' },
  { id: 'drinks', name: 'Напитки' },
  { id: 'desserts', name: 'Десерты' }
]

const mockMenuItems: PosMenuItem[] = [
  // Горячие блюда
  {
    id: '1',
    name: 'Борщ украинский',
    categoryId: 'hot',
    categoryName: 'Горячие блюда',
    price: 180,
    isAvailable: true,
    description: 'С говядиной и сметаной'
  },
  {
    id: '2',
    name: 'Котлета по-киевски',
    categoryId: 'hot',
    categoryName: 'Горячие блюда',
    price: 220,
    isAvailable: true,
    description: 'С маслом и зеленью'
  },
  {
    id: '3',
    name: 'Паста карбонара',
    categoryId: 'hot',
    categoryName: 'Горячие блюда',
    price: 190,
    isAvailable: false
  },

  // Холодные закуски
  {
    id: '4',
    name: 'Салат Цезарь',
    categoryId: 'cold',
    categoryName: 'Холодные закуски',
    price: 160,
    isAvailable: true,
    description: 'С курицей и пармезаном'
  },
  {
    id: '5',
    name: 'Оливье',
    categoryId: 'cold',
    categoryName: 'Холодные закуски',
    price: 140,
    isAvailable: true
  },

  // Супы
  {
    id: '6',
    name: 'Солянка мясная',
    categoryId: 'soups',
    categoryName: 'Супы',
    price: 170,
    isAvailable: true
  },
  {
    id: '7',
    name: 'Крем-суп грибной',
    categoryId: 'soups',
    categoryName: 'Супы',
    price: 150,
    isAvailable: true
  },

  // Напитки
  {
    id: '8',
    name: 'Кофе эспрессо',
    categoryId: 'drinks',
    categoryName: 'Напитки',
    price: 90,
    isAvailable: true
  },
  {
    id: '9',
    name: 'Капучино',
    categoryId: 'drinks',
    categoryName: 'Напитки',
    price: 120,
    isAvailable: true
  },
  {
    id: '10',
    name: 'Чай черный',
    categoryId: 'drinks',
    categoryName: 'Напитки',
    price: 60,
    isAvailable: true
  },

  // Десерты
  {
    id: '11',
    name: 'Тирамису',
    categoryId: 'desserts',
    categoryName: 'Десерты',
    price: 130,
    isAvailable: true
  },
  {
    id: '12',
    name: 'Чизкейк',
    categoryId: 'desserts',
    categoryName: 'Десерты',
    price: 120,
    isAvailable: false
  }
]

// Computed
const filteredItems = computed(() => {
  let items = mockMenuItems.filter(item => item.categoryId === selectedCategory.value)

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(
      item =>
        item.name.toLowerCase().includes(query) || item.description?.toLowerCase().includes(query)
    )
  }

  return items
})

// Methods
async function addItemToOrder(item: PosMenuItem) {
  if (!item.isAvailable) return

  const currentOrder = ordersStore.currentOrder
  const activeBill = ordersStore.activeBill

  if (!currentOrder || !activeBill) {
    console.warn('⚠️ Нет активного заказа или счета')
    return
  }

  try {
    const result = await ordersStore.addItemToBill(
      currentOrder.id,
      activeBill.id,
      item,
      1 // количество
    )

    if (result.success) {
      console.log('✅ Товар добавлен:', item.name)
    } else {
      console.error('❌ Ошибка добавления товара:', result.error)
    }
  } catch (error) {
    console.error('❌ Ошибка:', error)
  }
}
</script>

<style scoped>
.menu-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.menu-header {
  flex-shrink: 0;
  background-color: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.menu-content {
  flex: 1;
  overflow-y: auto;
}

.menu-item-card {
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 160px;
}

.menu-item-card:hover:not(.v-card--disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.menu-item-card.v-card--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.item-image {
  text-align: center;
}
</style>
