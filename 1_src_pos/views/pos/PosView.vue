<template>
  <PosLayout>
    <template #tables>
      <TablesSidebar @dialog-confirm="handleConfirm" @dialog-cancel="handleCancel" />
    </template>

    <template #menu>
      <MenuSection />
    </template>

    <template #order>
      <OrderSection />
    </template>
  </PosLayout>
</template>

<script setup lang="ts">
import { useNavigationStore } from '@/stores/navigation.store'
import PosLayout from '@/layouts/PosLayout.vue'
import TablesSidebar from '@/components/pos/TablesSidebar.vue'
import MenuSection from '@/components/pos/MenuSection.vue'
import OrderSection from '@/components/pos/OrderSection.vue'
import { watch } from 'vue'
import { DebugUtils } from '@/utils'

const navigationStore = useNavigationStore()

watch(
  () => navigationStore.showUnsavedDialog,
  newValue => {
    DebugUtils.debug('PosView', 'Dialog visibility changed', { visible: newValue })
  }
)

const handleConfirm = () => {
  DebugUtils.debug('PosView', 'Dialog confirmed')
  navigationStore.handleConfirm()
}

const handleCancel = () => {
  DebugUtils.debug('PosView', 'Dialog cancelled')
  navigationStore.handleCancel()
}
</script>
