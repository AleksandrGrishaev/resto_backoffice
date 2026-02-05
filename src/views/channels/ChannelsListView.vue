<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useChannelsStore } from '@/stores/channels'
import type { SalesChannel, ChannelType } from '@/stores/channels/types'

const channelsStore = useChannelsStore()

const showDialog = ref(false)
const editingChannel = ref<Partial<SalesChannel> | null>(null)

const channels = computed(() => channelsStore.channels)
const isLoading = computed(() => channelsStore.isLoading)

const headers = [
  { title: 'Channel', key: 'name', sortable: true },
  { title: 'Code', key: 'code' },
  { title: 'Type', key: 'type' },
  { title: 'Tax %', key: 'taxPercent', align: 'end' as const },
  { title: 'Commission %', key: 'commissionPercent', align: 'end' as const },
  { title: 'Status', key: 'isActive', align: 'center' as const },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' as const }
]

onMounted(async () => {
  if (!channelsStore.initialized) {
    await channelsStore.initialize()
  }
})

function getChannelTypeLabel(type: string) {
  const labels: Record<string, string> = {
    internal: 'Internal',
    delivery_platform: 'Delivery Platform',
    pickup: 'Pickup'
  }
  return labels[type] || type
}

function getChannelTypeColor(type: string) {
  const colors: Record<string, string> = {
    internal: 'primary',
    delivery_platform: 'orange',
    pickup: 'teal'
  }
  return colors[type] || 'grey'
}

function getChannelIcon(type: string) {
  const icons: Record<string, string> = {
    internal: 'mdi-storefront',
    delivery_platform: 'mdi-moped',
    pickup: 'mdi-package-variant'
  }
  return icons[type] || 'mdi-help'
}

function openEditDialog(channel: SalesChannel) {
  editingChannel.value = { ...channel }
  showDialog.value = true
}

function openCreateDialog() {
  editingChannel.value = {
    code: '',
    name: '',
    type: 'internal' as ChannelType,
    isActive: true,
    commissionPercent: 0,
    taxPercent: 11,
    settings: {},
    sortOrder: channels.value.length + 1
  }
  showDialog.value = true
}

async function saveChannel() {
  if (!editingChannel.value) return

  try {
    if ('id' in editingChannel.value && editingChannel.value.id) {
      await channelsStore.updateChannel(editingChannel.value.id, editingChannel.value)
    } else {
      await channelsStore.createChannel(editingChannel.value as any)
    }
    showDialog.value = false
  } catch (error) {
    console.error('Failed to save channel:', error)
  }
}

async function toggleChannelActive(channel: SalesChannel) {
  await channelsStore.updateChannel(channel.id, { isActive: !channel.isActive })
}
</script>

<template>
  <v-container>
    <v-row>
      <v-col>
        <div class="d-flex align-center justify-space-between mb-4">
          <h1 class="text-h4">Sales Channels</h1>
          <v-btn color="primary" @click="openCreateDialog">
            <v-icon start>mdi-plus</v-icon>
            Add Channel
          </v-btn>
        </div>

        <v-card>
          <v-data-table :items="channels" :loading="isLoading" :headers="headers" item-key="id">
            <template #[`item.name`]="{ item }">
              <div class="d-flex align-center">
                <v-icon :color="getChannelTypeColor(item.type)" class="mr-2">
                  {{ getChannelIcon(item.type) }}
                </v-icon>
                {{ item.name }}
              </div>
            </template>

            <template #[`item.type`]="{ item }">
              <v-chip :color="getChannelTypeColor(item.type)" size="small">
                {{ getChannelTypeLabel(item.type) }}
              </v-chip>
            </template>

            <template #[`item.taxPercent`]="{ item }">
              <span :class="item.taxPercent === 0 ? 'text-success' : ''">
                {{ item.taxPercent }}%
              </span>
            </template>

            <template #[`item.commissionPercent`]="{ item }">
              <span v-if="item.commissionPercent > 0" class="text-warning">
                {{ item.commissionPercent }}%
              </span>
              <span v-else class="text-medium-emphasis">0%</span>
            </template>

            <template #[`item.isActive`]="{ item }">
              <v-switch
                :model-value="item.isActive"
                color="success"
                hide-details
                density="compact"
                @update:model-value="toggleChannelActive(item)"
              />
            </template>

            <template #[`item.actions`]="{ item }">
              <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEditDialog(item)" />
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Edit/Create Dialog -->
    <v-dialog v-model="showDialog" max-width="600">
      <v-card v-if="editingChannel">
        <v-card-title>
          {{ editingChannel.id ? 'Edit Channel' : 'Create Channel' }}
        </v-card-title>
        <v-card-text>
          <v-text-field v-model="editingChannel.name" label="Channel Name" class="mb-3" />
          <v-text-field
            v-model="editingChannel.code"
            label="Channel Code"
            hint="Unique identifier (e.g. dine_in, gobiz)"
            :disabled="!!editingChannel.id"
            class="mb-3"
          />
          <v-select
            v-model="editingChannel.type"
            :items="[
              { title: 'Internal', value: 'internal' },
              { title: 'Delivery Platform', value: 'delivery_platform' },
              { title: 'Pickup', value: 'pickup' }
            ]"
            label="Channel Type"
            class="mb-3"
          />
          <v-text-field
            v-model.number="editingChannel.taxPercent"
            label="Tax %"
            type="number"
            min="0"
            max="100"
            step="0.01"
            class="mb-3"
          />
          <v-text-field
            v-model.number="editingChannel.commissionPercent"
            label="Commission %"
            type="number"
            min="0"
            max="100"
            step="0.01"
            class="mb-3"
          />
          <v-text-field
            v-model.number="editingChannel.sortOrder"
            label="Sort Order"
            type="number"
            min="0"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="showDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            :disabled="!editingChannel.name || !editingChannel.code"
            @click="saveChannel"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
