<!-- src/views/admin/channels/ChannelsScreen.vue -->
<template>
  <div class="channels-screen">
    <!-- Header -->
    <div class="screen-header">
      <h2>CHANNELS</h2>
      <div class="header-controls">
        <!-- Display mode toggles -->
        <v-btn-toggle v-model="displayModes" multiple density="compact" color="primary">
          <v-btn value="availability" size="small">
            <v-icon size="16" class="mr-1">mdi-check-circle-outline</v-icon>
            Available
          </v-btn>
          <v-btn value="pricing" size="small">
            <v-icon size="16" class="mr-1">mdi-currency-usd</v-icon>
            Pricing
          </v-btn>
        </v-btn-toggle>

        <!-- Net / +Tax toggle (only when pricing visible) -->
        <v-btn-toggle
          v-if="showPricing"
          v-model="showWithTax"
          mandatory
          density="compact"
          color="secondary"
          class="ml-2"
        >
          <v-btn :value="false" size="small">Net</v-btn>
          <v-btn :value="true" size="small">+Tax</v-btn>
        </v-btn-toggle>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-row">
      <v-text-field
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        placeholder="Search items..."
        density="compact"
        hide-details
        clearable
        class="filter-search"
      />
      <v-select
        v-model="filterCategory"
        :items="categoryOptions"
        item-title="name"
        item-value="id"
        label="Category"
        density="compact"
        hide-details
        clearable
        class="filter-select"
      />
      <v-select
        v-model="filterDepartment"
        :items="departmentOptions"
        label="Department"
        density="compact"
        hide-details
        clearable
        class="filter-select"
      />
    </div>

    <!-- Combined Table -->
    <div class="table-container">
      <v-table density="compact" fixed-header class="channel-table">
        <thead>
          <tr>
            <th class="item-col sticky-col">Item</th>
            <th v-for="channel in activeChannels" :key="channel.id" class="channel-col text-center">
              <div>
                {{ channel.name }}
                <v-icon
                  v-if="channel.linkedChannelId"
                  size="12"
                  color="info"
                  :title="'Linked to ' + getLinkedName(channel.linkedChannelId)"
                >
                  mdi-link
                </v-icon>
              </div>
              <div v-if="showPricing" class="text-caption" style="opacity: 0.45">
                {{ channel.taxPercent }}% {{ channel.taxMode === 'inclusive' ? 'incl' : 'excl' }}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="item in filteredItems" :key="item.id">
            <!-- Availability row -->
            <tr v-if="showAvailability" class="row-availability">
              <td class="item-col sticky-col">
                <div class="d-flex align-center gap-2">
                  <v-chip
                    size="x-small"
                    :color="item.department === 'kitchen' ? 'orange' : 'blue'"
                    variant="flat"
                    class="dept-chip"
                  >
                    {{ item.department === 'kitchen' ? 'K' : 'B' }}
                  </v-chip>
                  <span class="item-name">{{ item.name }}</span>
                </div>
              </td>
              <td
                v-for="channel in activeChannels"
                :key="channel.id"
                class="channel-col text-center"
              >
                <v-checkbox
                  :model-value="channelsStore.isMenuItemAvailable(channel.id, item.id)"
                  density="compact"
                  hide-details
                  class="inline-checkbox"
                  @update:model-value="toggleAvailability(channel.id, item.id, $event as boolean)"
                />
              </td>
            </tr>

            <!-- Pricing rows (per variant) -->
            <template v-if="showPricing">
              <tr
                v-for="variant in getActiveVariants(item)"
                :key="`${item.id}-${variant.id}`"
                class="row-pricing"
              >
                <td class="item-col sticky-col">
                  <div class="d-flex align-center gap-2 pl-7">
                    <v-icon size="14" color="grey" class="shrink-0">mdi-tag-outline</v-icon>
                    <span v-if="!showAvailability" class="item-name-sm">{{ item.name }}</span>
                    <span class="variant-label">{{ variant.name || 'Standard' }}</span>
                    <span class="base-price">{{ formatDisplay(variant.price, 0) }}</span>
                  </div>
                </td>
                <td
                  v-for="channel in activeChannels"
                  :key="channel.id"
                  class="channel-col text-center"
                  :class="{
                    'cell-unavailable': !channelsStore.isMenuItemAvailable(channel.id, item.id)
                  }"
                >
                  <template v-if="!channelsStore.isMenuItemAvailable(channel.id, item.id)">
                    <span class="text-disabled">--</span>
                  </template>
                  <template v-else-if="isEditing(channel.id, item.id, variant.id)">
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
                      class="price-value"
                      :class="{
                        'price-custom':
                          getChannelNetPrice(channel.id, item.id, variant.id, variant.price) !==
                          variant.price
                      }"
                      @click="
                        startEdit(
                          channel.id,
                          item.id,
                          variant.id,
                          getChannelNetPrice(channel.id, item.id, variant.id, variant.price),
                          channel.taxPercent
                        )
                      "
                    >
                      {{
                        formatDisplay(
                          getChannelNetPrice(channel.id, item.id, variant.id, variant.price),
                          channel.taxPercent
                        )
                      }}
                    </span>
                  </template>
                </td>
              </tr>
            </template>
          </template>

          <!-- Empty state -->
          <tr v-if="filteredItems.length === 0">
            <td :colspan="1 + activeChannels.length" class="text-center pa-8 text-medium-emphasis">
              No items match your filters
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChannelsStore } from '@/stores/channels'
import { useMenuStore } from '@/stores/menu'
import { formatIDR } from '@/utils'
import type { MenuItem, MenuItemVariant } from '@/stores/menu/types'

const channelsStore = useChannelsStore()
const menuStore = useMenuStore()

// State
const displayModes = ref<string[]>(['availability', 'pricing'])
const showWithTax = ref(true)
const search = ref('')
const filterCategory = ref<string | null>(null)
const filterDepartment = ref<string | null>(null)
const editingCell = ref<{ channelId: string; menuItemId: string; variantId: string } | null>(null)
const editingValue = ref('')

// Display mode helpers
const showAvailability = computed(() => displayModes.value.includes('availability'))
const showPricing = computed(() => displayModes.value.includes('pricing'))

const activeChannels = computed(() => channelsStore.activeChannels)

const categoryOptions = computed(() =>
  menuStore.categories.filter(c => c.isActive).map(c => ({ id: c.id, name: c.name }))
)

const departmentOptions = ['kitchen', 'bar']

const filteredItems = computed(() => {
  let items: MenuItem[] = menuStore.menuItems.filter(i => i.isActive)

  if (search.value) {
    const q = search.value.toLowerCase()
    items = items.filter(i => i.name.toLowerCase().includes(q))
  }
  if (filterCategory.value) {
    items = items.filter(i => i.categoryId === filterCategory.value)
  }
  if (filterDepartment.value) {
    items = items.filter(i => i.department === filterDepartment.value)
  }

  return items.sort((a, b) => a.name.localeCompare(b.name))
})

// Helpers
function getLinkedName(linkedId: string): string {
  return channelsStore.getChannelById(linkedId)?.name || ''
}

function getActiveVariants(item: MenuItem): MenuItemVariant[] {
  return item.variants.filter(v => v.isActive)
}

function getChannelNetPrice(
  channelId: string,
  menuItemId: string,
  variantId: string,
  basePrice: number
): number {
  return channelsStore.getChannelPrice(channelId, menuItemId, variantId, basePrice).netPrice
}

function formatDisplay(netPrice: number, taxPercent: number): string {
  const price = showWithTax.value ? Math.round(netPrice * (1 + taxPercent / 100)) : netPrice
  return formatIDR(price)
}

// Availability
async function toggleAvailability(
  channelId: string,
  menuItemId: string,
  isAvailable: boolean
): Promise<void> {
  await channelsStore.setMenuItemAvailability(channelId, menuItemId, isAvailable)
}

// Inline price editing
function isEditing(channelId: string, menuItemId: string, variantId: string): boolean {
  if (!editingCell.value) return false
  return (
    editingCell.value.channelId === channelId &&
    editingCell.value.menuItemId === menuItemId &&
    editingCell.value.variantId === variantId
  )
}

function startEdit(
  channelId: string,
  menuItemId: string,
  variantId: string,
  currentNetPrice: number,
  taxPercent: number
) {
  editingCell.value = { channelId, menuItemId, variantId }
  const display = showWithTax.value
    ? Math.round(currentNetPrice * (1 + taxPercent / 100))
    : currentNetPrice
  editingValue.value = String(display)
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
</script>

<style scoped lang="scss">
.channels-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.screen-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  flex-shrink: 0;

  h2 {
    font-size: 1.1rem;
    font-weight: 600;
  }
}

.header-controls {
  display: flex;
  align-items: center;
}

.filters-row {
  display: flex;
  gap: 12px;
  padding: 0 16px 12px;
  flex-shrink: 0;
}

.filter-search {
  flex: 1;
  max-width: 240px;
}

.filter-select {
  width: 140px;
  flex-shrink: 0;
}

.table-container {
  flex: 1;
  overflow: auto;
  padding: 0 16px 16px;
}

// Sticky first column
.sticky-col {
  position: sticky;
  left: 0;
  background: rgb(var(--v-theme-surface));
  z-index: 1;
}

.channel-table {
  .item-col {
    min-width: 220px;
  }

  .channel-col {
    min-width: 110px;
  }
}

// Row types
.row-availability {
  td {
    border-bottom: none !important;
    padding-top: 10px;
    padding-bottom: 0;
  }
}

.row-pricing {
  td {
    padding-top: 2px;
    padding-bottom: 10px;
  }
}

// When only pricing is shown (no availability row above), restore normal padding
.row-pricing + .row-pricing {
  td {
    padding-top: 2px;
  }
}

.item-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.item-name-sm {
  font-weight: 500;
  font-size: 0.85rem;
  opacity: 0.7;
  margin-right: 2px;
}

.dept-chip {
  flex-shrink: 0;
  font-weight: 700;
  min-width: 22px;
}

.variant-label {
  font-size: 0.8rem;
  opacity: 0.55;
}

.base-price {
  font-size: 0.8rem;
  opacity: 0.35;
  margin-left: auto;
}

.shrink-0 {
  flex-shrink: 0;
}

// Checkbox alignment
.inline-checkbox {
  display: flex;
  justify-content: center;
}

// Price cells
.cell-unavailable {
  opacity: 0.3;
}

.price-value {
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.85rem;
  transition: background 0.15s;

  &:hover {
    background: rgba(var(--v-theme-primary), 0.12);
  }
}

.price-custom {
  color: rgb(var(--v-theme-warning));
  font-weight: 600;
}

.price-input {
  max-width: 100px;
  display: inline-flex;

  :deep(.v-field__input) {
    text-align: right;
    font-size: 0.85rem;
    padding: 2px 6px;
    min-height: 28px;
  }
}
</style>
