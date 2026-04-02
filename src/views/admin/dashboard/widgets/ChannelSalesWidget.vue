<!-- src/views/admin/dashboard/widgets/ChannelSalesWidget.vue -->
<template>
  <WidgetCard title="Sales by Channel" icon="mdi-store" size="medium" :loading="loading">
    <div v-if="channelSales.length" class="channel-content">
      <div v-for="ch in channelSales" :key="ch.channel" class="channel-row">
        <div class="channel-header">
          <v-icon size="16" :color="getChannelColor(ch.channel)">
            {{ getChannelIcon(ch.channel) }}
          </v-icon>
          <span class="channel-name">{{ getChannelLabel(ch.channel) }}</span>
          <span class="channel-orders">{{ ch.orders }} orders</span>
        </div>
        <div class="channel-bar-wrap">
          <div
            class="channel-bar"
            :style="{
              width: `${(ch.revenue / maxRevenue) * 100}%`,
              background: getChannelColor(ch.channel)
            }"
          />
        </div>
        <div class="channel-revenue">{{ formatIDR(ch.revenue) }}</div>
      </div>
    </div>
    <div v-else class="no-data">No channel data</div>
  </WidgetCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatIDR } from '@/utils'
import type { ChannelSale } from '../types'
import WidgetCard from '../components/WidgetCard.vue'

const props = defineProps<{
  channelSales: ChannelSale[]
  loading: boolean
}>()

const maxRevenue = computed(() => Math.max(...props.channelSales.map(c => c.revenue), 1))

function getChannelIcon(channel: string): string {
  const map: Record<string, string> = {
    dine_in: 'mdi-silverware-fork-knife',
    takeaway: 'mdi-shopping-outline',
    gobiz: 'mdi-motorbike',
    grab: 'mdi-car',
    direct: 'mdi-store'
  }
  return map[channel] || 'mdi-store'
}

function getChannelColor(channel: string): string {
  const map: Record<string, string> = {
    dine_in: '#a395e9',
    takeaway: '#92c9af',
    gobiz: '#ff9676',
    grab: '#76b0ff',
    direct: '#bfb5f2'
  }
  return map[channel] || '#ffb076'
}

function getChannelLabel(channel: string): string {
  const map: Record<string, string> = {
    dine_in: 'Dine In',
    takeaway: 'Takeaway',
    gobiz: 'GoFood',
    grab: 'Grab',
    direct: 'Direct'
  }
  return map[channel] || channel.charAt(0).toUpperCase() + channel.slice(1)
}
</script>

<style scoped lang="scss">
.channel-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.channel-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.channel-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.channel-name {
  font-size: 13px;
  font-weight: 600;
  flex: 1;
}

.channel-orders {
  font-size: 11px;
  opacity: 0.4;
}

.channel-bar-wrap {
  height: 8px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 4px;
  overflow: hidden;
}

.channel-bar {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}

.channel-revenue {
  font-size: 15px;
  font-weight: 700;
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80px;
  opacity: 0.4;
  font-size: 13px;
}
</style>
