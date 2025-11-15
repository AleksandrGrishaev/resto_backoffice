<!-- src/views/kitchen/orders/components/StatusButton.vue -->
<template>
  <v-btn
    :color="buttonColor"
    :variant="variant"
    :disabled="disabled || isReady"
    :loading="loading"
    :prepend-icon="buttonIcon"
    block
    size="large"
    @click="handleClick"
  >
    {{ buttonText }}
  </v-btn>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useKitchenStatus } from '@/stores/kitchen/composables'
import type { OrderStatus } from '@/stores/pos/types'

// =============================================
// PROPS
// =============================================

interface Props {
  currentStatus: OrderStatus
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
})

// =============================================
// EMITS
// =============================================

const emit = defineEmits<{
  click: []
}>()

// =============================================
// COMPOSABLES
// =============================================

const { getNextStatus, getStatusButtonText, getStatusColor, getStatusIcon, canUpdateStatus } =
  useKitchenStatus()

// =============================================
// STATE
// =============================================

const loading = ref(false)

// =============================================
// COMPUTED PROPERTIES
// =============================================

/**
 * Check if order is ready (no further status updates)
 */
const isReady = computed(() => props.currentStatus === 'ready')

/**
 * Button text based on current status
 */
const buttonText = computed(() => {
  if (isReady.value) return 'Ready for Pickup'
  return getStatusButtonText(props.currentStatus)
})

/**
 * Button color based on next status
 */
const buttonColor = computed(() => {
  const nextStatus = getNextStatus(props.currentStatus)
  if (!nextStatus) return 'grey'
  return getStatusColor(nextStatus)
})

/**
 * Button variant
 */
const variant = computed(() => {
  if (isReady.value) return 'outlined'
  return 'flat'
})

/**
 * Button icon based on next status
 */
const buttonIcon = computed(() => {
  const nextStatus = getNextStatus(props.currentStatus)
  if (!nextStatus) return 'mdi-check-circle'
  return getStatusIcon(nextStatus)
})

// =============================================
// METHODS
// =============================================

const handleClick = () => {
  if (props.disabled || isReady.value) return
  if (!canUpdateStatus(props.currentStatus)) return

  emit('click')
}
</script>

<style scoped lang="scss">
/* Component-specific styles if needed */
</style>
