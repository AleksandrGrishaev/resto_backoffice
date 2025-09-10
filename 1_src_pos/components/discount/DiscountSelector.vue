// src/components/discount/DiscountSelector.vue
<template>
  <v-menu location="bottom" :close-on-content-click="false">
    <template #activator="{ props }">
      <v-btn
        color="primary"
        variant="outlined"
        v-bind="props"
        :disabled="!availableDiscounts.length"
      >
        <v-icon icon="mdi-ticket-percent" class="mr-2" />
        Add Discount
      </v-btn>
    </template>

    <v-card width="300" class="discount-selector">
      <v-card-title class="text-subtitle-1 px-4 pt-4 pb-2">Available Discounts</v-card-title>

      <v-card-text class="px-4 pb-4">
        <v-list>
          <v-list-item
            v-for="discount in availableDiscounts"
            :key="discount.id"
            density="compact"
            :disabled="loading"
            @click="handleDiscountSelect(discount)"
          >
            <template #prepend>
              <v-icon
                :icon="discount.type === 'item' ? 'mdi-food' : 'mdi-account'"
                size="20"
                class="mr-2"
              />
            </template>

            <v-list-item-title>{{ discount.name }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ formatDiscountValue(discount) }}
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-menu>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDiscountStore } from '@/stores/discount.store'
import { useBillStore } from '@/stores/bill.store'
import type { Discount } from '@/types/discount'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'DiscountSelector'

interface Props {
  type?: 'item' | 'bill'
  itemId?: string
}

const props = withDefaults(defineProps<Props>(), {
  type: 'bill'
})

const emit = defineEmits<{
  'discount-applied': [discount: Discount]
}>()

const loading = ref(false)
const discountStore = useDiscountStore()
const billStore = useBillStore()

// Получаем доступные скидки в зависимости от типа
const availableDiscounts = computed(() => {
  if (props.type === 'item') {
    return discountStore.getItemDiscounts
  }
  return discountStore.getCustomerDiscounts
})

// Форматируем значение скидки для отображения
const formatDiscountValue = (discount: Discount) => {
  return `${discount.value}%`
}

// Обработка выбора скидки
const handleDiscountSelect = async (discount: Discount) => {
  try {
    loading.value = true
    DebugUtils.debug(MODULE_NAME, 'Applying discount', { discount, type: props.type })

    let result
    if (props.type === 'item' && props.itemId) {
      result = await billStore.applyItemDiscount(props.itemId, discount)
    } else {
      result = await billStore.applyCustomerDiscount(discount)
    }

    if (result.isValid) {
      emit('discount-applied', discount)
    } else {
      throw new Error(result.message)
    }
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to apply discount', error)
    // TODO: Show error notification
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.discount-selector :deep(.v-list-item) {
  min-height: 48px;
  cursor: pointer;
}

.discount-selector :deep(.v-list-item:hover) {
  background-color: rgba(var(--v-theme-primary), 0.1);
}
</style>
