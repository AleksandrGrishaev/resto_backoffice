<!-- src/views/pos/PosMainView.vue -->
<template>
  <PosLayout>
    <!-- Tables Sidebar -->
    <template #tables>
      <TablesSidebar
        @new-order="handleNewOrder"
        @select-table="handleSelectTable"
        @select-order="handleSelectOrder"
      />
    </template>

    <!-- Menu Section -->
    <template #menu>
      <MenuSection @add-item="handleAddItem" @item-click="handleItemClick" />
    </template>

    <!-- Order Section -->
    <template #order>
      <OrderSection
        @edit-item="handleEditItem"
        @remove-item="handleRemoveItem"
        @payment="handlePayment"
      />
    </template>
  </PosLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PosLayout from '@/layouts/PosLayout.vue'

// TODO: Импорты компонентов (создадим следующими)
// import TablesSidebar from './components/TablesSidebar.vue'
// import MenuSection from './components/MenuSection.vue'
// import OrderSection from './components/OrderSection.vue'

// Временные заглушки компонентов для тестирования
import { defineAsyncComponent } from 'vue'

const TablesSidebar = defineAsyncComponent(() =>
  Promise.resolve({
    template: `
      <div class="tables-sidebar-placeholder pa-4">
        <h3 class="text-subtitle-2 mb-4">Столы и заказы</h3>

        <!-- New Order Button -->
        <v-btn
          color="primary"
          block
          class="mb-4"
          @click="$emit('new-order')"
        >
          <v-icon start>mdi-plus</v-icon>
          Новый заказ
        </v-btn>

        <!-- Active Orders -->
        <div class="mb-4">
          <div class="text-caption text-medium-emphasis mb-2">АКТИВНЫЕ ЗАКАЗЫ</div>
          <v-card
            v-for="order in mockOrders"
            :key="order.id"
            variant="outlined"
            class="mb-2 pa-2"
            :color="order.id === selectedOrderId ? 'primary' : undefined"
            @click="$emit('select-order', order.id)"
          >
            <div class="text-caption">{{ order.name }}</div>
            <div class="text-caption text-medium-emphasis">{{ order.items }} позиций</div>
          </v-card>
        </div>

        <!-- Tables -->
        <div>
          <div class="text-caption text-medium-emphasis mb-2">СТОЛЫ</div>
          <v-btn
            v-for="table in mockTables"
            :key="table.id"
            :color="table.occupied ? 'warning' : 'surface'"
            variant="outlined"
            size="small"
            class="ma-1"
            @click="$emit('select-table', table.id)"
          >
            {{ table.number }}
          </v-btn>
        </div>
      </div>
    `,
    emits: ['new-order', 'select-table', 'select-order'],
    setup() {
      const selectedOrderId = ref('order-1')

      const mockOrders = [
        { id: 'order-1', name: 'Заказ #001', items: 3 },
        { id: 'order-2', name: 'Доставка #002', items: 5 }
      ]

      const mockTables = [
        { id: 'T1', number: 'T1', occupied: false },
        { id: 'T2', number: 'T2', occupied: true },
        { id: 'T3', number: 'T3', occupied: false },
        { id: 'I1', number: 'I1', occupied: true }
      ]

      return { selectedOrderId, mockOrders, mockTables }
    }
  })
)

const MenuSection = defineAsyncComponent(() =>
  Promise.resolve({
    template: `
      <div class="menu-section-placeholder pa-4">
        <h3 class="text-subtitle-2 mb-4">Меню</h3>

        <!-- Categories -->
        <v-chip-group v-model="selectedCategory" mandatory class="mb-4">
          <v-chip
            v-for="category in categories"
            :key="category.id"
            :value="category.id"
            variant="outlined"
          >
            {{ category.name }}
          </v-chip>
        </v-chip-group>

        <!-- Menu Items Grid -->
        <v-row dense>
          <v-col
            v-for="item in filteredItems"
            :key="item.id"
            cols="6"
            sm="4"
            md="3"
          >
            <v-card
              variant="outlined"
              class="menu-item-card"
              @click="$emit('add-item', item)"
            >
              <v-card-text class="pa-3">
                <div class="text-subtitle-2">{{ item.name }}</div>
                <div class="text-body-2 text-primary font-weight-bold">₽{{ item.price }}</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>
    `,
    emits: ['add-item', 'item-click'],
    setup() {
      const selectedCategory = ref('hot')

      const categories = [
        { id: 'hot', name: 'Горячие блюда' },
        { id: 'cold', name: 'Холодные закуски' },
        { id: 'drinks', name: 'Напитки' }
      ]

      const menuItems = [
        { id: '1', name: 'Борщ', price: 180, category: 'hot' },
        { id: '2', name: 'Котлета', price: 220, category: 'hot' },
        { id: '3', name: 'Салат Цезарь', price: 160, category: 'cold' },
        { id: '4', name: 'Кофе', price: 90, category: 'drinks' },
        { id: '5', name: 'Чай', price: 60, category: 'drinks' }
      ]

      const filteredItems = computed(() =>
        menuItems.filter(item => item.category === selectedCategory.value)
      )

      return { selectedCategory, categories, filteredItems }
    }
  })
)

const OrderSection = defineAsyncComponent(() =>
  Promise.resolve({
    template: `
      <div class="order-section-placeholder pa-4">
        <h3 class="text-subtitle-2 mb-4">Текущий заказ</h3>

        <!-- Order Items -->
        <div class="order-items mb-4">
          <v-card
            v-for="item in orderItems"
            :key="item.id"
            variant="outlined"
            class="mb-2"
          >
            <v-card-text class="pa-3">
              <div class="d-flex align-center">
                <div class="flex-grow-1">
                  <div class="text-subtitle-2">{{ item.name }}</div>
                  <div class="text-caption">{{ item.quantity }} x ₽{{ item.price }}</div>
                </div>
                <div class="text-right">
                  <div class="text-body-1 font-weight-bold">₽{{ item.total }}</div>
                  <v-btn
                    icon="mdi-close"
                    size="x-small"
                    variant="text"
                    @click="$emit('remove-item', item.id)"
                  />
                </div>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <!-- Order Summary -->
        <v-card variant="outlined" class="mb-4">
          <v-card-text class="pa-3">
            <div class="d-flex justify-space-between">
              <span>Подытог:</span>
              <span>₽{{ orderTotal }}</span>
            </div>
            <div class="d-flex justify-space-between">
              <span>Налог (10%):</span>
              <span>₽{{ orderTax }}</span>
            </div>
            <v-divider class="my-2" />
            <div class="d-flex justify-space-between text-h6">
              <span>Итого:</span>
              <span>₽{{ orderFinalTotal }}</span>
            </div>
          </v-card-text>
        </v-card>

        <!-- Actions -->
        <v-btn
          color="success"
          block
          size="large"
          @click="$emit('payment')"
        >
          Оплата
        </v-btn>
      </div>
    `,
    emits: ['edit-item', 'remove-item', 'payment'],
    setup() {
      const orderItems = ref([
        { id: '1', name: 'Борщ', quantity: 1, price: 180, total: 180 },
        { id: '2', name: 'Кофе', quantity: 2, price: 90, total: 180 }
      ])

      const orderTotal = computed(() => orderItems.value.reduce((sum, item) => sum + item.total, 0))

      const orderTax = computed(() => Math.round(orderTotal.value * 0.1))
      const orderFinalTotal = computed(() => orderTotal.value + orderTax.value)

      return { orderItems, orderTotal, orderTax, orderFinalTotal }
    }
  })
)

// Event handlers
const handleNewOrder = () => {
  console.log('Новый заказ')
  // TODO: Создание нового заказа
}

const handleSelectTable = (tableId: string) => {
  console.log('Выбран стол:', tableId)
  // TODO: Выбор стола
}

const handleSelectOrder = (orderId: string) => {
  console.log('Выбран заказ:', orderId)
  // TODO: Выбор заказа
}

const handleAddItem = (item: any) => {
  console.log('Добавить товар:', item)
  // TODO: Добавление товара в заказ
}

const handleItemClick = (item: any) => {
  console.log('Клик по товару:', item)
  // TODO: Обработка клика по товару
}

const handleEditItem = (itemId: string) => {
  console.log('Редактировать позицию:', itemId)
  // TODO: Редактирование позиции заказа
}

const handleRemoveItem = (itemId: string) => {
  console.log('Удалить позицию:', itemId)
  // TODO: Удаление позиции заказа
}

const handlePayment = () => {
  console.log('Переход к оплате')
  // TODO: Открытие диалога оплаты
}

// Lifecycle
onMounted(() => {
  console.log('POS система инициализирована')
  // TODO: Инициализация POS stores
})
</script>

<style scoped>
.tables-sidebar-placeholder,
.menu-section-placeholder,
.order-section-placeholder {
  height: 100%;
  overflow-y: auto;
}

.menu-item-card {
  cursor: pointer;
  transition: all 0.2s ease;
}

.menu-item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.order-items {
  max-height: 60vh;
  overflow-y: auto;
}
</style>
