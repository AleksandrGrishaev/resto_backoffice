<!-- src/views/pos/order/components/CancellationRequestBanner.vue -->
<!-- Banner shown when a website customer requests order cancellation (cooking/ready status) -->
<template>
  <div v-if="hasPendingRequest" class="cancellation-banner">
    <div class="cancellation-banner-content">
      <div class="cancellation-info">
        <v-icon color="white" size="20" class="mr-2">mdi-alert-circle</v-icon>
        <div>
          <div class="cancellation-title">Customer requests cancellation</div>
          <div v-if="order.cancellationReason" class="cancellation-reason">
            "{{ order.cancellationReason }}"
          </div>
        </div>
      </div>

      <div class="cancellation-actions">
        <v-btn
          size="small"
          variant="outlined"
          color="white"
          :loading="loading === 'dismiss'"
          @click="handleDismiss"
        >
          Dismiss
        </v-btn>
        <v-btn
          size="small"
          variant="flat"
          color="white"
          class="text-error"
          :loading="loading === 'accept'"
          @click="handleAccept"
        >
          Accept Cancel
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PosOrder } from '@/stores/pos/types'
import { supabase } from '@/supabase/client'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'CancellationBanner'

interface Props {
  order: PosOrder
}

const props = defineProps<Props>()

const emit = defineEmits<{
  resolved: [action: 'accept' | 'dismiss']
}>()

const loading = ref<'accept' | 'dismiss' | null>(null)

const hasPendingRequest = computed(() => {
  return props.order.cancellationRequestedAt && !props.order.cancellationResolvedAt
})

async function handleAccept() {
  loading.value = 'accept'
  try {
    const { data, error } = await supabase.rpc('resolve_cancellation_request', {
      p_order_id: props.order.id,
      p_action: 'accept'
    })

    if (error) throw error
    if (data && !(data as any).success) throw new Error((data as any).error)

    DebugUtils.info(MODULE_NAME, 'Cancellation accepted', {
      orderNumber: props.order.orderNumber
    })
    emit('resolved', 'accept')
  } catch (err: any) {
    DebugUtils.error(MODULE_NAME, 'Failed to accept cancellation', { error: err.message })
  } finally {
    loading.value = null
  }
}

async function handleDismiss() {
  loading.value = 'dismiss'
  try {
    const { data, error } = await supabase.rpc('resolve_cancellation_request', {
      p_order_id: props.order.id,
      p_action: 'dismiss'
    })

    if (error) throw error
    if (data && !(data as any).success) throw new Error((data as any).error)

    DebugUtils.info(MODULE_NAME, 'Cancellation dismissed', {
      orderNumber: props.order.orderNumber
    })
    emit('resolved', 'dismiss')
  } catch (err: any) {
    DebugUtils.error(MODULE_NAME, 'Failed to dismiss cancellation', { error: err.message })
  } finally {
    loading.value = null
  }
}
</script>

<style scoped>
.cancellation-banner {
  background: rgb(var(--v-theme-error));
  color: white;
  animation: pulse-bg 2s ease-in-out 3;
}

.cancellation-banner-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  gap: 12px;
}

.cancellation-info {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.cancellation-title {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.2;
}

.cancellation-reason {
  font-size: 0.75rem;
  opacity: 0.9;
  font-style: italic;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.cancellation-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

@keyframes pulse-bg {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}
</style>
