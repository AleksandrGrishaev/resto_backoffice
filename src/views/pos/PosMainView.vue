<!-- src/views/pos/PosMainView.vue -->
<template>
  <PosLayout>
    <!-- Tables Sidebar -->
    <template #tables>
      <TablesSidebar />
    </template>

    <!-- Menu Section -->
    <template #menu>
      <MenuSection />
    </template>

    <!-- Order Section -->
    <template #order>
      <OrderSection />
    </template>
  </PosLayout>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import PosLayout from '@/layouts/PosLayout.vue'
import TablesSidebar from './components/TablesSidebar.vue'
import MenuSection from './components/MenuSection.vue'
import OrderSection from './components/OrderSection.vue'

// Stores
import { usePosStore } from '@/stores/pos'

const posStore = usePosStore()

// Initialize POS when component mounts
onMounted(async () => {
  console.log('🚀 Инициализация POS системы...')

  try {
    await posStore.initializePOS()
    console.log('✅ POS система готова к работе')
  } catch (error) {
    console.error('❌ Ошибка инициализации POS:', error)
  }
})
</script>
