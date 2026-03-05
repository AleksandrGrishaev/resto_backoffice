<!-- src/views/admin/channels/ChannelsScreen.vue -->
<template>
  <div class="channels-screen">
    <div class="screen-header">
      <h2>CHANNEL PRICING</h2>
    </div>

    <!-- Channel tabs -->
    <v-tabs v-model="selectedChannel" density="compact" color="primary">
      <v-tab v-for="channel in channels" :key="channel.id" :value="channel.id">
        {{ channel.name }}
      </v-tab>
    </v-tabs>

    <!-- Items for selected channel -->
    <div class="items-list">
      <div v-for="item in channelMenuItems" :key="item.id" class="channel-item-card">
        <div class="item-info">
          <h4>{{ item.name }}</h4>
          <span class="item-dept">{{ item.department }}</span>
        </div>
        <div class="item-variants">
          <div v-for="variant in item.variants" :key="variant.id" class="variant-price-row">
            <span class="variant-label">{{ variant.name || 'Standard' }}</span>
            <span class="variant-price">{{ formatIDR(variant.price) }}</span>
          </div>
        </div>
      </div>

      <div v-if="channelMenuItems.length === 0" class="empty-state">
        <p>No items configured for this channel</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useChannelsStore } from '@/stores/channels'
import { useMenuStore } from '@/stores/menu'
import { formatIDR } from '@/utils'
import type { MenuItem } from '@/stores/menu/types'

const channelsStore = useChannelsStore()
const menuStore = useMenuStore()

const channels = computed(() => channelsStore.channels || [])
const selectedChannel = ref<string | null>(null)

// Default to first channel on load
onMounted(() => {
  if (channels.value.length > 0 && !selectedChannel.value) {
    selectedChannel.value = channels.value[0].id
  }
})

// Get menu items that are active for the selected channel
const channelMenuItems = computed(() => {
  if (!selectedChannel.value) return []

  // Filter channelMenuItems by selected channel
  const channelItems = (channelsStore.channelMenuItems as any[]).filter(
    (ci: any) => ci.channelId === selectedChannel.value
  )
  const itemIds = new Set(channelItems.map((ci: any) => ci.menuItemId))

  return (menuStore.menuItems as MenuItem[]).filter(mi => itemIds.has(mi.id))
})
</script>

<style scoped lang="scss">
.channels-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.screen-header {
  padding: 16px;

  h2 {
    font-size: 1.1rem;
    font-weight: 600;
  }
}

.items-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.channel-item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.item-info {
  flex: 1;

  h4 {
    font-weight: 600;
  }
}

.item-dept {
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: capitalize;
}

.item-variants {
  text-align: right;
}

.variant-price-row {
  display: flex;
  gap: 8px;
  font-size: 0.85rem;
}

.variant-label {
  color: rgba(255, 255, 255, 0.6);
}

.variant-price {
  font-weight: 500;
}

.empty-state {
  text-align: center;
  padding: 48px 0;
  color: rgba(255, 255, 255, 0.4);
}
</style>
