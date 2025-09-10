<!-- src/views/pos/components/TablesSidebar.vue -->
<template>
  <div class="tables-sidebar">
    <!-- New Order Button -->
    <div class="new-order-section pa-2">
      <v-btn
        color="primary"
        block
        size="large"
        :loading="ordersStore.loading.create"
        @click="handleNewOrder"
      >
        <v-icon start>mdi-plus</v-icon>
        Новый заказ
      </v-btn>
    </div>

    <v-divider />

    <!-- Active Orders -->
    <div class="orders-section">
      <div class="section-title pa-3">
        <span class="text-caption text-medium-emphasis">АКТИВНЫЕ ЗАКАЗЫ</span>
      </div>

      <div class="orders-list pa-2">
        <v-card
          v-for="order in activeOrders"
          :key="order.id"
          variant="outlined"
          class="mb-2 order-card"
          :color="ordersStore.currentOrderId === order.id ? 'primary' : undefined"
          @click="selectOrder(order.id)"
        >
          <v-card-text class="pa-2">
            <div class="d-flex align-center">
              <v-icon :icon="getOrderTypeIcon(order.type)" size="16" class="me-2" />
              <div class="flex-grow-1">
                <div class="text-caption font-weight-bold">
                  {{ order.orderNumber }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ getOrderItemsCount(order) }} позиций
                </div>
              </div>
            </div>
            <div class="text-caption text-right font-weight-bold">₽{{ order.finalAmount }}</div>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <v-divider />

    <!-- Tables -->
    <div class="tables-section flex-grow-1">
      <div class="section-title pa-3">
        <span class="text-caption text-medium-emphasis">СТОЛЫ</span>
      </div>

      <div class="tables-grid pa-2">
        <v-btn
          v-for="table in tablesStore.tables"
          :key="table.id"
          :color="getTableColor(table)"
          :variant="table.status === 'free' ? 'outlined' : 'flat'"
          size="small"
          class="ma-1 table-btn"
          @click="handleTableClick(table)"
        >
          <div class="text-center">
            <v-icon :icon="getTableStatusIcon(table.status)" size="16" class="mb-1" />
            <div class="text-caption">{{ table.number }}</div>
          </div>
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePosStore } from '@/stores/pos'
import { usePosTablesStore } from '@/stores/pos/tables/tablesStore'
import { usePosOrdersStore } from '@/stores/pos/orders/ordersStore'
import type { PosTable, PosOrder } from '@/stores/pos/types'

// Stores
const posStore = usePosStore()
const tablesStore = usePosTablesStore()
const ordersStore = usePosOrdersStore()

// Computed
const activeOrders = computed(() => ordersStore.activeOrders)

// Methods
async function handleNewOrder() {
  try {
    // Создаем заказ на вынос по умолчанию
    const result = await posStore.createQuickOrder('takeaway')

    if (result.success) {
      console.log('✅ Создан новый заказ:', result.data)
    } else {
      console.error('❌ Ошибка создания заказа:', result.error)
    }
  } catch (error) {
    console.error('❌ Ошибка:', error)
  }
}

function selectOrder(orderId: string) {
  ordersStore.selectOrder(orderId)
  console.log('📋 Выбран заказ:', orderId)
}

async function handleTableClick(table: PosTable) {
  try {
    if (table.status === 'free') {
      // Создаем заказ за столом
      const result = await ordersStore.createOrder('dine_in', table.id)

      if (result.success) {
        console.log('✅ Создан заказ за столом:', table.number)
      }
    } else if (table.status === 'occupied' && table.currentOrderId) {
      // Выбираем существующий заказ
      selectOrder(table.currentOrderId)
    }
  } catch (error) {
    console.error('❌ Ошибка обработки стола:', error)
  }
}

// Helper functions
function getOrderTypeIcon(type: string): string {
  const icons = {
    dine_in: 'mdi-table-chair',
    takeaway: 'mdi-shopping',
    delivery: 'mdi-bike-fast'
  }
  return icons[type as keyof typeof icons] || 'mdi-help-circle'
}

function getOrderItemsCount(order: PosOrder): number {
  return order.bills.reduce(
    (total, bill) => total + bill.items.filter(item => item.status === 'active').length,
    0
  )
}

function getTableColor(table: PosTable): string {
  const colors = {
    free: 'success',
    occupied: 'warning',
    reserved: 'info',
    cleaning: 'secondary'
  }
  return colors[table.status] || 'grey'
}

function getTableStatusIcon(status: string): string {
  const icons = {
    free: 'mdi-table',
    occupied: 'mdi-table-chair',
    reserved: 'mdi-table-clock',
    cleaning: 'mdi-table-refresh'
  }
  return icons[status as keyof typeof icons] || 'mdi-table'
}
</script>

<style scoped>
.tables-sidebar {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.orders-section,
.tables-section {
  overflow-y: auto;
}

.order-card {
  cursor: pointer;
  transition: all 0.2s ease;
}

.order-card:hover {
  transform: translateY(-1px);
}

.tables-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.table-btn {
  min-width: 60px !important;
  height: 60px !important;
  flex-direction: column !important;
}

.section-title {
  background-color: rgba(255, 255, 255, 0.05);
}
</style>
