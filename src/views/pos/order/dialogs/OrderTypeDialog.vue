<!-- src/views/pos/order/dialogs/OrderTypeDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-h6">
        {{
          showChannelSelection
            ? 'Select Delivery Channel'
            : showTableSelection
              ? 'Select Table'
              : 'Change Order Type'
        }}
      </v-card-title>

      <v-card-text>
        <!-- Step 3: Delivery Channel Selection -->
        <div v-if="showChannelSelection">
          <p class="mb-4">Select delivery channel:</p>
          <div class="channel-grid">
            <v-btn
              v-for="channel in deliveryChannelOptions"
              :key="channel.code"
              class="channel-btn"
              variant="outlined"
              size="large"
              @click="handleChannelConfirm(channel.code, channel.id)"
            >
              <template #prepend>
                <v-icon :icon="channel.icon" size="28" />
              </template>
              <div class="d-flex flex-column align-start ml-2">
                <div class="font-weight-bold">{{ channel.name }}</div>
                <div class="text-caption text-medium-emphasis">{{ channel.subtitle }}</div>
              </div>
            </v-btn>
          </div>
        </div>

        <!-- Step 1: Order Type Selection -->
        <div v-else-if="!showTableSelection">
          <p class="mb-4">Select new order type:</p>

          <v-radio-group v-model="selectedType">
            <v-radio value="dine_in">
              <template #label>
                <div class="d-flex align-center">
                  <v-icon icon="mdi-table-chair" class="mr-2" />
                  <div>
                    <div>Dine In</div>
                    <div class="text-caption text-grey">Table service</div>
                  </div>
                </div>
              </template>
            </v-radio>

            <v-radio value="takeaway">
              <template #label>
                <div class="d-flex align-center">
                  <v-icon icon="mdi-shopping" class="mr-2" />
                  <div>
                    <div>Takeaway</div>
                    <div class="text-caption text-grey">Customer pickup</div>
                  </div>
                </div>
              </template>
            </v-radio>

            <v-radio value="delivery">
              <template #label>
                <div class="d-flex align-center">
                  <v-icon icon="mdi-bike-fast" class="mr-2" />
                  <div>
                    <div>Delivery</div>
                    <div class="text-caption text-grey">Deliver to customer</div>
                  </div>
                </div>
              </template>
            </v-radio>
          </v-radio-group>

          <!-- Warning for dine-in conversion -->
          <v-alert
            v-if="
              selectedType === 'dine_in' &&
              currentOrder?.type !== 'dine_in' &&
              availableTables.length === 0
            "
            type="error"
            variant="tonal"
            class="mt-4"
          >
            No tables available. Please create tables first.
          </v-alert>
        </div>

        <!-- Step 2: Table Selection (only for converting to dine-in) -->
        <div v-else-if="showTableSelection">
          <p class="mb-4">Select a table for this order:</p>

          <!-- No tables available -->
          <div v-if="!availableTables?.length" class="text-center py-4">
            <v-icon size="48" color="grey" class="mb-2">mdi-alert-circle-outline</v-icon>
            <p class="text-body-1 text-grey">No tables available.</p>
          </div>

          <!-- Table selection -->
          <v-radio-group v-else v-model="selectedTableId">
            <div class="tables-list">
              <div
                v-for="table in sortedTables"
                :key="table.id"
                class="table-item"
                :class="{
                  'table-free': table.status === 'free',
                  'table-occupied': table.status === 'occupied'
                }"
              >
                <v-radio :value="table.id">
                  <template #label>
                    <div class="table-label">
                      <div class="table-info">
                        <span class="table-number">{{ table.number }}</span>
                        <v-chip
                          v-if="table.status === 'occupied'"
                          size="x-small"
                          color="warning"
                          class="ml-2"
                        >
                          Occupied
                        </v-chip>
                        <v-chip v-else size="x-small" color="success" class="ml-2">Free</v-chip>
                      </div>
                      <div class="table-details text-caption text-grey">
                        Capacity: {{ table.capacity }}
                      </div>
                    </div>
                  </template>
                </v-radio>
              </div>
            </div>
          </v-radio-group>

          <!-- Warning for occupied table -->
          <v-alert
            v-if="selectedTable?.status === 'occupied'"
            type="warning"
            variant="tonal"
            class="mt-4"
          >
            <v-alert-title>Merge Orders</v-alert-title>
            <div class="text-body-2">
              This table is currently occupied. All bills from this order will be merged into the
              existing order on
              <strong>{{ selectedTable.number }}</strong>
              .
            </div>
          </v-alert>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn v-if="showTableSelection || showChannelSelection" variant="text" @click="goBack">
          Back
        </v-btn>
        <v-btn variant="text" @click="handleCancel">Cancel</v-btn>
        <v-btn
          v-if="!showChannelSelection"
          color="primary"
          :disabled="isConfirmDisabled"
          @click="handleConfirm"
        >
          {{ confirmButtonText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { PosTable, OrderType } from '@/stores/pos/types'
import { useChannelsStore, getChannelVisual } from '@/stores/channels'

interface Props {
  modelValue: boolean
  currentOrder: any
  availableTables: PosTable[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [
    data: { orderType: OrderType; tableId?: string; channelId?: string; channelCode?: string }
  ]
}>()

const channelsStore = useChannelsStore()
const selectedType = ref<OrderType>('dine_in')
const selectedTableId = ref<string>('')
const showTableSelection = ref(false)
const showChannelSelection = ref(false)
const selectedChannelId = ref<string>('')

const deliveryChannelOptions = computed(() => {
  return channelsStore.deliveryChannels.map(ch => {
    const visual = getChannelVisual(ch.code)
    return {
      id: ch.id,
      code: ch.code,
      name: ch.name,
      icon: visual.icon,
      subtitle: visual.subtitle || ch.name
    }
  })
})

// Initialize selected type from current order
watch(
  () => props.currentOrder,
  order => {
    if (order?.type) {
      selectedType.value = order.type
    }
  },
  { immediate: true }
)

// Reset state when dialog opens
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      showTableSelection.value = false
      showChannelSelection.value = false
      selectedTableId.value = ''
      selectedChannelId.value = ''
      if (props.currentOrder?.type) {
        selectedType.value = props.currentOrder.type
      }
    }
  }
)

// Sort tables: free tables first, then occupied
const sortedTables = computed(() => {
  return [...props.availableTables].sort((a, b) => {
    // Free tables first
    if (a.status === 'free' && b.status !== 'free') return -1
    if (a.status !== 'free' && b.status === 'free') return 1

    // Within same status, sort by table number
    return a.number.localeCompare(b.number, undefined, { numeric: true })
  })
})

const selectedTable = computed(() => {
  return props.availableTables.find(t => t.id === selectedTableId.value)
})

const confirmButtonText = computed(() => {
  if (showTableSelection.value) {
    return selectedTable.value?.status === 'occupied' ? 'Merge Orders' : 'Select Table'
  }
  return 'Next'
})

const isConfirmDisabled = computed(() => {
  if (showTableSelection.value) {
    return !selectedTableId.value
  }
  // Disable if converting to dine-in but no tables available
  if (
    selectedType.value === 'dine_in' &&
    props.currentOrder?.type !== 'dine_in' &&
    props.availableTables.length === 0
  ) {
    return true
  }
  return false
})

function handleConfirm() {
  // If converting to dine-in from another type, show table selection
  if (
    selectedType.value === 'dine_in' &&
    props.currentOrder?.type !== 'dine_in' &&
    !showTableSelection.value
  ) {
    showTableSelection.value = true
    return
  }

  // If converting to delivery, show channel selection
  if (
    selectedType.value === 'delivery' &&
    !showChannelSelection.value &&
    !showTableSelection.value &&
    deliveryChannelOptions.value.length > 0
  ) {
    showChannelSelection.value = true
    return
  }

  // If on table selection step, emit with table ID
  if (showTableSelection.value) {
    emit('confirm', {
      orderType: selectedType.value,
      tableId: selectedTableId.value
    })
    return
  }

  // Otherwise, just emit order type change
  emit('confirm', {
    orderType: selectedType.value
  })
}

function handleChannelConfirm(channelCode: string, channelId: string) {
  emit('confirm', {
    orderType: 'delivery',
    channelId,
    channelCode
  })
}

function goBack() {
  if (showChannelSelection.value) {
    showChannelSelection.value = false
    return
  }
  showTableSelection.value = false
  selectedTableId.value = ''
}

function handleCancel() {
  showTableSelection.value = false
  showChannelSelection.value = false
  selectedTableId.value = ''
  selectedChannelId.value = ''
  emit('update:modelValue', false)
}
</script>

<style scoped lang="scss">
.channel-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.channel-btn {
  height: 80px !important;
  text-transform: none;
  border-radius: 12px;
  justify-content: flex-start;
}

.tables-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.table-item {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.2s;

  &.table-free {
    background-color: rgba(76, 175, 80, 0.05);
    border-color: rgba(76, 175, 80, 0.2);
  }

  &.table-occupied {
    background-color: rgba(255, 152, 0, 0.05);
    border-color: rgba(255, 152, 0, 0.2);
  }

  &:hover {
    border-color: rgb(var(--v-theme-primary));
  }
}

.table-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
}

.table-info {
  display: flex;
  align-items: center;
}

.table-number {
  font-weight: 600;
  font-size: 1rem;
}

.table-details {
  line-height: 1.2;
}
</style>
