// src/stores/discount.store.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ValidationResult } from '@/types'
import { DebugUtils } from '@/utils'
import { Discount } from '@/types/discount'

const MODULE_NAME = 'discountStore'

export const useDiscountStore = defineStore('discount', () => {
  // State
  const discounts = ref<Discount[]>([])

  // Getters
  const getActiveDiscounts = computed(() => discounts.value.filter(d => d.isActive))

  const getItemDiscounts = computed(() => getActiveDiscounts.value.filter(d => d.type === 'item'))

  const getCustomerDiscounts = computed(() =>
    getActiveDiscounts.value.filter(d => d.type === 'customer')
  )

  // Actions
  const validateDiscount = (amount: number, discount: Discount): ValidationResult => {
    if (!discount.isActive) {
      return {
        isValid: false,
        code: 'INACTIVE_DISCOUNT',
        message: 'Discount is not active'
      }
    }

    if (discount.minAmount && amount < discount.minAmount) {
      return {
        isValid: false,
        code: 'BELOW_MIN_AMOUNT',
        message: `Minimum amount required: ${discount.minAmount}`
      }
    }

    return {
      isValid: true,
      code: 'VALID',
      message: 'Discount can be applied'
    }
  }

  const calculateDiscountAmount = (amount: number, discountPercent: number): number => {
    return amount * (discountPercent / 100)
  }

  // Инициализация тестовых скидок
  const initializeDiscounts = () => {
    discounts.value = [
      {
        id: 'item_discount_10',
        name: 'Happy Hour 10%',
        type: 'item',
        value: 10,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'customer_discount_15',
        name: 'Regular Customer 15%',
        type: 'customer',
        value: 15,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]

    DebugUtils.debug(MODULE_NAME, 'Initialized test discounts', discounts.value)
  }

  return {
    discounts,
    getActiveDiscounts,
    getItemDiscounts,
    getCustomerDiscounts,
    validateDiscount,
    calculateDiscountAmount,
    initializeDiscounts
  }
})
