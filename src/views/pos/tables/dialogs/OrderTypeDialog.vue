<!-- src/views/pos/tables/dialogs/OrderTypeDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="order-type-dialog">
      <v-card-text class="dialog-content">
        <div v-if="isLoadingChannels" class="d-flex justify-center pa-8">
          <v-progress-circular indeterminate />
        </div>

        <div v-else class="order-types-grid">
          <button
            v-for="option in channelOptions"
            :key="option.code"
            class="order-type-btn"
            :class="{ 'is-loading': loading && selectedCode === option.code }"
            :disabled="loading"
            @click="handleSelect(option)"
          >
            <v-progress-circular
              v-if="loading && selectedCode === option.code"
              indeterminate
              size="32"
            />
            <v-icon v-else :icon="option.icon" size="36" />
            <div class="btn-title">{{ option.name }}</div>
            <div class="btn-subtitle">{{ option.subtitle }}</div>
          </button>
        </div>
      </v-card-text>

      <v-card-actions class="dialog-actions">
        <v-spacer />
        <v-btn variant="text" :disabled="loading" @click="handleCancel">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { OrderType } from '@/stores/pos/types'
import { useChannelsStore } from '@/stores/channels'

// =============================================
// PROPS & EMITS
// =============================================

defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  create: [type: OrderType, data?: { channelId?: string; channelCode?: string }]
}>()

// =============================================
// STATE
// =============================================

const channelsStore = useChannelsStore()
const selectedCode = ref<string | null>(null)
const loading = ref(false)
const isLoadingChannels = ref(false)

// =============================================
// ICONS / SUBTITLES
// =============================================

const CHANNEL_META: Record<string, { icon: string; subtitle: string }> = {
  takeaway: { icon: 'mdi-shopping', subtitle: 'Pick up' },
  gobiz: { icon: 'mdi-food', subtitle: 'GoFood / GoBiz' },
  grab: { icon: 'mdi-car', subtitle: 'GrabFood' }
}

const DEFAULT_META = { icon: 'mdi-truck-delivery', subtitle: 'Delivery' }

// =============================================
// COMPUTED
// =============================================

const channelOptions = computed(() => {
  return channelsStore.activeChannels
    .filter(ch => ch.code !== 'dine_in')
    .map(ch => {
      const meta = CHANNEL_META[ch.code] || DEFAULT_META
      return {
        id: ch.id,
        code: ch.code,
        name: ch.name,
        type: ch.type,
        icon: meta.icon,
        subtitle: meta.subtitle
      }
    })
})

// =============================================
// ENSURE CHANNELS LOADED
// =============================================

watch(
  () => channelsStore.initialized,
  async initialized => {
    if (!initialized) {
      isLoadingChannels.value = true
      try {
        await channelsStore.initialize()
      } finally {
        isLoadingChannels.value = false
      }
    }
  },
  { immediate: true }
)

// =============================================
// METHODS
// =============================================

function getOrderType(channel: { code: string; type: string }): OrderType {
  if (channel.code === 'takeaway') return 'takeaway'
  return 'delivery'
}

function handleSelect(option: { id: string; code: string; type: string }): void {
  selectedCode.value = option.code
  const orderType = getOrderType(option)
  loading.value = true
  emit('create', orderType, { channelId: option.id, channelCode: option.code })
  handleClose()
}

function handleCancel(): void {
  handleClose()
}

function handleClose(): void {
  emit('update:modelValue', false)

  setTimeout(() => {
    selectedCode.value = null
    loading.value = false
  }, 300)
}
</script>

<style scoped>
.order-type-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.dialog-content {
  padding: 32px 24px 24px 24px;
}

.dialog-actions {
  padding: 0 24px 24px 24px;
}

.order-types-grid {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.order-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 140px;
  height: 140px;
  border-radius: 16px;
  border: 2px solid rgba(255, 255, 255, 0.24);
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 16px 8px;
}

.order-type-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.08);
}

.order-type-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.order-type-btn:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.btn-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.2;
  text-align: center;
}

.btn-subtitle {
  font-size: 0.8125rem;
  opacity: 0.6;
  line-height: 1;
  text-align: center;
}

@media (max-width: 480px) {
  .order-type-btn {
    width: 120px;
    height: 120px;
  }

  .dialog-content {
    padding: 24px 16px 16px 16px;
  }

  .dialog-actions {
    padding: 0 16px 16px 16px;
  }
}
</style>
