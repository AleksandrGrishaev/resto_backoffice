<!-- src/views/backoffice/sales/components/ShiftSyncRetryButton.vue -->
<template>
  <v-tooltip location="top">
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        :color="syncStatus === 'synced' ? 'success' : 'warning'"
        :icon="true"
        size="small"
        :loading="retrying"
        @click="retrySync"
      >
        <v-icon>
          {{ syncStatus === 'synced' ? 'mdi-check-circle' : 'mdi-sync-alert' }}
        </v-icon>
      </v-btn>
    </template>
    <span>
      {{ syncStatus === 'synced' ? 'Synced to Account' : 'Retry Sync to Account' }}
    </span>
  </v-tooltip>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSyncService } from '@/core/sync/SyncService'
import type { PosShift } from '@/stores/pos/shifts/types'

const props = defineProps<{
  shift: PosShift
}>()

const emit = defineEmits<{
  synced: []
  error: [message: string]
}>()

const syncService = useSyncService()
const retrying = ref(false)

const syncStatus = computed(() => {
  return props.shift.syncedToAccount ? 'synced' : 'pending'
})

async function retrySync() {
  if (retrying.value || props.shift.syncedToAccount) return

  try {
    retrying.value = true
    console.log(`🔄 Manual sync retry for shift ${props.shift.shiftNumber}`)

    // Add to sync queue
    syncService.addToQueue({
      entityType: 'shift',
      entityId: props.shift.id,
      operation: 'update',
      priority: 'high',
      data: props.shift,
      maxAttempts: 3
    })

    // Process queue
    const report = await syncService.processQueue()

    if (report.succeeded > 0) {
      console.log(`✅ Shift ${props.shift.shiftNumber} synced successfully`)
      emit('synced')
    } else {
      const errorMsg = report.errors.length > 0 ? report.errors[0] : 'Sync failed'
      console.error(`❌ Sync failed:`, report.errors)
      emit('error', errorMsg)
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Retry sync failed'
    console.error('❌ Retry sync failed:', error)
    emit('error', errorMsg)
  } finally {
    retrying.value = false
  }
}
</script>
