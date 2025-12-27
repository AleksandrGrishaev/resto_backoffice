<!-- src/views/pos/payment/widgets/PrinterStatus.vue -->
<!--
  Printer Status Widget
  Shows connection status and allows connect/disconnect
-->
<template>
  <v-chip
    :color="chipColor"
    :variant="isConnected ? 'flat' : 'outlined'"
    size="small"
    class="printer-status"
    @click="handleClick"
  >
    <v-icon start size="small">{{ statusIcon }}</v-icon>
    <span class="status-text">{{ statusLabel }}</span>

    <!-- Loading indicator -->
    <v-progress-circular v-if="isConnecting" indeterminate size="12" width="2" class="ml-1" />
  </v-chip>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePrinter } from '@/core/printing'

// Composable
const { isConnected, isConnecting, isAvailable, deviceName, connect, disconnect } = usePrinter()

// Emits
const emit = defineEmits<{
  click: []
}>()

// Computed
const chipColor = computed(() => {
  if (!isAvailable.value) return 'grey'
  if (isConnected.value) return 'success'
  if (isConnecting.value) return 'primary'
  return 'default'
})

const statusIcon = computed(() => {
  if (!isAvailable.value) return 'mdi-printer-off'
  if (isConnected.value) return 'mdi-printer-check'
  if (isConnecting.value) return 'mdi-printer-search'
  return 'mdi-printer'
})

const statusLabel = computed(() => {
  if (!isAvailable.value) return 'No Bluetooth'
  if (isConnecting.value) return 'Connecting...'
  if (isConnected.value) {
    return deviceName.value || 'Connected'
  }
  return 'Printer'
})

// Handlers
async function handleClick(): Promise<void> {
  emit('click')

  if (!isAvailable.value) {
    // Show message that Bluetooth is not available
    return
  }

  if (isConnecting.value) {
    // Don't do anything while connecting
    return
  }

  if (isConnected.value) {
    // Disconnect
    await disconnect()
  } else {
    // Connect - this must be called from user gesture
    await connect()
  }
}
</script>

<style scoped>
.printer-status {
  cursor: pointer;
  transition: all 0.2s ease;
}

.printer-status:hover {
  opacity: 0.9;
}

.status-text {
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
