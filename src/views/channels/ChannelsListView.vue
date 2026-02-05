<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useChannelsStore } from '@/stores/channels'
import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'
import type { SalesChannel, ChannelType, TaxMode } from '@/stores/channels/types'

const channelsStore = useChannelsStore()
const paymentSettingsStore = usePaymentSettingsStore()

const showDialog = ref(false)
const editingChannel = ref<Partial<SalesChannel> | null>(null)
const selectedTaxIds = ref<string[]>([])
const selectedPaymentMethodIds = ref<string[]>([])

const channels = computed(() => channelsStore.channels)
const isLoading = computed(() => channelsStore.isLoading)
const availableTaxes = computed(() => channelsStore.availableTaxes)
const availablePaymentMethods = computed(() => paymentSettingsStore.activePaymentMethods)

const computedTotalTax = computed(() => {
  return availableTaxes.value
    .filter(t => selectedTaxIds.value.includes(t.id))
    .reduce((sum, t) => sum + t.percentage, 0)
})

const headers = [
  { title: 'Channel', key: 'name', sortable: true },
  { title: 'Code', key: 'code' },
  { title: 'Type', key: 'type' },
  { title: 'Tax', key: 'taxPercent', align: 'end' as const },
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

function getTaxModeLabel(mode: TaxMode) {
  return mode === 'inclusive' ? 'incl.' : 'excl.'
}

function getTaxModeColor(mode: TaxMode) {
  return mode === 'inclusive' ? 'info' : 'default'
}

async function ensureDataLoaded() {
  if (channelsStore.availableTaxes.length === 0) {
    await channelsStore.loadAvailableTaxes()
  }
  if (paymentSettingsStore.paymentMethods.length === 0) {
    await paymentSettingsStore.fetchPaymentMethods()
  }
}

async function openEditDialog(channel: SalesChannel) {
  await ensureDataLoaded()
  editingChannel.value = { ...channel }
  selectedTaxIds.value = channel.taxes.map(t => t.taxId)
  selectedPaymentMethodIds.value = channel.paymentMethods.map(pm => pm.paymentMethodId)
  showDialog.value = true
}

async function openCreateDialog() {
  await ensureDataLoaded()
  editingChannel.value = {
    code: '',
    name: '',
    type: 'internal' as ChannelType,
    isActive: true,
    commissionPercent: 0,
    taxPercent: 0,
    taxMode: 'exclusive' as TaxMode,
    taxes: [],
    paymentMethods: [],
    settings: {},
    sortOrder: channels.value.length + 1
  }
  selectedTaxIds.value = []
  selectedPaymentMethodIds.value = availablePaymentMethods.value.map(pm => pm.id)
  showDialog.value = true
}

async function saveChannel() {
  if (!editingChannel.value) return

  try {
    // Update taxPercent from selected taxes
    editingChannel.value.taxPercent = computedTotalTax.value

    if ('id' in editingChannel.value && editingChannel.value.id) {
      await channelsStore.updateChannel(editingChannel.value.id, editingChannel.value)
      await channelsStore.setChannelTaxes(editingChannel.value.id, selectedTaxIds.value)
      await channelsStore.setChannelPaymentMethods(
        editingChannel.value.id,
        selectedPaymentMethodIds.value
      )
    } else {
      const created = await channelsStore.createChannel(editingChannel.value as any)
      await channelsStore.setChannelTaxes(created.id, selectedTaxIds.value)
      await channelsStore.setChannelPaymentMethods(created.id, selectedPaymentMethodIds.value)
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
              <v-chip
                v-if="item.taxPercent > 0"
                :color="getTaxModeColor(item.taxMode)"
                size="x-small"
                class="ml-1"
              >
                {{ getTaxModeLabel(item.taxMode) }}
              </v-chip>
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

          <!-- Tax Mode Toggle -->
          <div class="mb-3">
            <div class="text-subtitle-2 mb-2">Tax Mode</div>
            <v-btn-toggle
              v-model="editingChannel.taxMode"
              mandatory
              density="compact"
              color="primary"
            >
              <v-btn value="exclusive">Exclusive (added on top)</v-btn>
              <v-btn value="inclusive">Inclusive (in price)</v-btn>
            </v-btn-toggle>
          </div>

          <!-- Tax Multi-Select -->
          <v-select
            v-model="selectedTaxIds"
            :items="
              availableTaxes.map(t => ({ title: `${t.name} (${t.percentage}%)`, value: t.id }))
            "
            label="Applied Taxes"
            multiple
            chips
            closable-chips
            class="mb-1"
          />

          <!-- Computed Total -->
          <div class="text-body-2 text-medium-emphasis mb-3">
            Total Tax:
            <strong>{{ computedTotalTax }}%</strong>
            <span v-if="computedTotalTax > 0">
              ({{ editingChannel.taxMode === 'inclusive' ? 'inclusive' : 'exclusive' }})
            </span>
          </div>

          <!-- Payment Methods Multi-Select -->
          <v-select
            v-model="selectedPaymentMethodIds"
            :items="availablePaymentMethods.map(pm => ({ title: pm.name, value: pm.id }))"
            label="Payment Methods"
            multiple
            chips
            closable-chips
            class="mb-3"
            hint="Which payment methods are available for this channel"
            persistent-hint
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
