<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useChannelsStore } from '@/stores/channels'
import { useMenuStore } from '@/stores/menu'
import { formatIDR } from '@/utils'
import type { VariantPricingRow } from '@/stores/channels/types'

const channelsStore = useChannelsStore()
const menuStore = useMenuStore()

// State
const showWithTax = ref(true)
const selectedCategory = ref<string | null>(null)
const searchQuery = ref('')
const editingCell = ref<{ channelId: string; menuItemId: string; variantId: string } | null>(null)
const editingValue = ref('')
const isCopying = ref(false)

// Copy prices
const copyFromChannel = ref('')
const copyToChannel = ref('')
const addDestinationTax = ref(true)

onMounted(async () => {
  if (!channelsStore.initialized) {
    await channelsStore.initialize()
  }
})

// Computed
const activeChannels = computed(() => channelsStore.activeChannels)
const categories = computed(() => menuStore.state?.categories?.filter(c => c.isActive) || [])

const pricingRows = computed((): VariantPricingRow[] => {
  const items = menuStore.state?.menuItems || []
  return items
    .filter(item => item.isActive)
    .filter(item => !selectedCategory.value || item.categoryId === selectedCategory.value)
    .filter(
      item =>
        !searchQuery.value || item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
    .flatMap(item =>
      item.variants
        .filter(v => v.isActive)
        .map(variant => ({
          menuItemId: item.id,
          menuItemName: item.name,
          variantId: variant.id,
          variantName: variant.name,
          baseNetPrice: variant.price,
          channels: activeChannels.value.map(channel => {
            const cp = channelsStore.getChannelPrice(channel.id, item.id, variant.id, variant.price)
            return {
              channelId: channel.id,
              channelCode: channel.code,
              netPrice: cp.netPrice,
              grossPrice: cp.grossPrice,
              taxPercent: channel.taxPercent,
              isAvailable: cp.isAvailable
            }
          })
        }))
    )
})

// Methods
function getDisplayPrice(netPrice: number, taxPercent: number): string {
  const price = showWithTax.value ? Math.round(netPrice * (1 + taxPercent / 100)) : netPrice
  return formatIDR(price)
}

function isDifferentFromBase(row: VariantPricingRow, channelIdx: number): boolean {
  const channelData = row.channels[channelIdx]
  return channelData.netPrice !== row.baseNetPrice
}

function startEdit(
  channelId: string,
  menuItemId: string,
  variantId: string,
  currentPrice: number,
  taxPercent: number
) {
  editingCell.value = { channelId, menuItemId, variantId }
  const displayPrice = showWithTax.value
    ? Math.round(currentPrice * (1 + taxPercent / 100))
    : currentPrice
  editingValue.value = String(displayPrice)
}

async function finishEdit() {
  if (!editingCell.value) return

  const { channelId, menuItemId, variantId } = editingCell.value
  const newPrice = parseInt(editingValue.value) || 0

  if (newPrice > 0) {
    const channel = channelsStore.getChannelById(channelId)
    const netPrice =
      showWithTax.value && channel
        ? Math.round(newPrice / (1 + channel.taxPercent / 100))
        : newPrice

    await channelsStore.setChannelPrice(channelId, menuItemId, variantId, netPrice)
  }

  editingCell.value = null
}

function cancelEdit() {
  editingCell.value = null
}

function isEditing(channelId: string, menuItemId: string, variantId: string): boolean {
  if (!editingCell.value) return false
  return (
    editingCell.value.channelId === channelId &&
    editingCell.value.menuItemId === menuItemId &&
    editingCell.value.variantId === variantId
  )
}

async function copyPrices() {
  const sourceChannel = channelsStore.getChannelById(copyFromChannel.value)
  const targetChannel = channelsStore.getChannelById(copyToChannel.value)
  if (!sourceChannel || !targetChannel) return

  isCopying.value = true

  try {
    const items = menuStore.state?.menuItems || []
    for (const item of items) {
      if (!item.isActive) continue
      for (const variant of item.variants) {
        if (!variant.isActive) continue

        const sourcePrice = channelsStore.getChannelPrice(
          sourceChannel.id,
          item.id,
          variant.id,
          variant.price
        )

        let targetNetPrice = sourcePrice.netPrice

        if (addDestinationTax.value && sourceChannel.taxPercent !== targetChannel.taxPercent) {
          const sourceGross = targetNetPrice * (1 + sourceChannel.taxPercent / 100)
          targetNetPrice = Math.round(sourceGross / (1 + targetChannel.taxPercent / 100))
        }

        await channelsStore.setChannelPrice(targetChannel.id, item.id, variant.id, targetNetPrice)
      }
    }
  } finally {
    isCopying.value = false
  }
}
</script>

<template>
  <v-container fluid>
    <h1 class="text-h4 mb-4">Channel Pricing</h1>

    <!-- Controls -->
    <v-row class="mb-4">
      <v-col cols="12" md="4">
        <v-btn-toggle v-model="showWithTax" mandatory density="compact" color="primary">
          <v-btn :value="false">Net Price</v-btn>
          <v-btn :value="true">With Tax</v-btn>
        </v-btn-toggle>
      </v-col>
      <v-col cols="12" md="4">
        <v-select
          v-model="selectedCategory"
          :items="[
            { title: 'All Categories', value: null },
            ...categories.map(c => ({ title: c.name, value: c.id }))
          ]"
          label="Category"
          density="compact"
          hide-details
          clearable
        />
      </v-col>
      <v-col cols="12" md="4">
        <v-text-field
          v-model="searchQuery"
          label="Search items..."
          prepend-inner-icon="mdi-magnify"
          density="compact"
          hide-details
          clearable
        />
      </v-col>
    </v-row>

    <!-- Copy Prices Panel -->
    <v-card class="mb-4" variant="outlined">
      <v-card-text>
        <div class="d-flex align-center flex-wrap gap-3">
          <span class="text-subtitle-2">Copy Prices</span>
          <v-select
            v-model="copyFromChannel"
            :items="activeChannels.map(c => ({ title: c.name, value: c.id }))"
            label="From"
            density="compact"
            hide-details
            style="max-width: 180px"
          />
          <v-icon>mdi-arrow-right</v-icon>
          <v-select
            v-model="copyToChannel"
            :items="
              activeChannels
                .filter(c => c.id !== copyFromChannel)
                .map(c => ({ title: c.name, value: c.id }))
            "
            label="To"
            density="compact"
            hide-details
            style="max-width: 180px"
          />
          <v-checkbox
            v-model="addDestinationTax"
            label="Adjust for tax"
            density="compact"
            hide-details
          />
          <v-btn
            color="primary"
            size="small"
            :loading="isCopying"
            :disabled="!copyFromChannel || !copyToChannel"
            @click="copyPrices"
          >
            Copy
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Pricing Table -->
    <v-card>
      <div class="pricing-table-wrapper">
        <table class="pricing-table">
          <thead>
            <tr>
              <th class="item-col">Item / Variant</th>
              <th class="price-col">Base Price</th>
              <th v-for="channel in activeChannels" :key="channel.id" class="price-col">
                {{ channel.name }}
                <div class="text-caption text-medium-emphasis">
                  {{ channel.taxPercent > 0 ? `${channel.taxPercent}% tax` : 'No tax' }}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in pricingRows" :key="`${row.menuItemId}-${row.variantId}`">
              <td class="item-col">
                <div class="text-body-2">{{ row.menuItemName }}</div>
                <div class="text-caption text-medium-emphasis">{{ row.variantName }}</div>
              </td>
              <td class="price-col">
                {{ getDisplayPrice(row.baseNetPrice, activeChannels[0]?.taxPercent ?? 0) }}
              </td>
              <td
                v-for="(channelData, idx) in row.channels"
                :key="channelData.channelId"
                class="price-col"
                :class="{
                  'price-different': isDifferentFromBase(row, idx),
                  'price-unavailable': !channelData.isAvailable
                }"
              >
                <template v-if="!channelData.isAvailable">
                  <v-chip
                    size="x-small"
                    color="grey"
                    variant="outlined"
                    class="cursor-pointer"
                    @click="
                      channelsStore.setMenuItemAvailability(
                        channelData.channelId,
                        row.menuItemId,
                        true
                      )
                    "
                  >
                    N/A
                  </v-chip>
                </template>
                <template
                  v-else-if="isEditing(channelData.channelId, row.menuItemId, row.variantId)"
                >
                  <v-text-field
                    v-model="editingValue"
                    density="compact"
                    hide-details
                    type="number"
                    variant="outlined"
                    class="price-input"
                    autofocus
                    @keyup.enter="finishEdit"
                    @keyup.escape="cancelEdit"
                    @blur="finishEdit"
                  />
                </template>
                <template v-else>
                  <span
                    class="price-value cursor-pointer"
                    @click="
                      startEdit(
                        channelData.channelId,
                        row.menuItemId,
                        row.variantId,
                        channelData.netPrice,
                        channelData.taxPercent
                      )
                    "
                  >
                    {{ getDisplayPrice(channelData.netPrice, channelData.taxPercent) }}
                  </span>
                </template>
              </td>
            </tr>
            <tr v-if="pricingRows.length === 0">
              <td
                :colspan="2 + activeChannels.length"
                class="text-center text-medium-emphasis pa-4"
              >
                No menu items found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </v-card>
  </v-container>
</template>

<style scoped lang="scss">
.pricing-table-wrapper {
  overflow-x: auto;
}

.pricing-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.pricing-table th,
.pricing-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  text-align: left;
}

.pricing-table th {
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-weight: 600;
  white-space: nowrap;
}

.item-col {
  min-width: 200px;
  position: sticky;
  left: 0;
  background: rgb(var(--v-theme-surface));
  z-index: 1;
}

.price-col {
  min-width: 120px;
  text-align: right !important;
  white-space: nowrap;
}

.price-different {
  background: rgba(var(--v-theme-warning), 0.08);
}

.price-unavailable {
  background: rgba(var(--v-theme-on-surface), 0.04);
  text-align: center !important;
}

.price-value {
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.15s;

  &:hover {
    background: rgba(var(--v-theme-primary), 0.1);
  }
}

.price-input {
  max-width: 120px;

  :deep(.v-field__input) {
    text-align: right;
    font-size: 0.875rem;
    padding: 4px 8px;
    min-height: 32px;
  }
}

.cursor-pointer {
  cursor: pointer;
}
</style>
