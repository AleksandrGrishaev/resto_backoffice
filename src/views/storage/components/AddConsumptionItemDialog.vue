<!-- src/views/storage/components/AddConsumptionItemDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h3>Add Item to Consumption</h3>
          <div class="text-caption text-medium-emphasis">
            Select item from {{ formatDepartment(department) }} inventory
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="handleClose" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6">
        <!-- Item Type Tabs -->
        <v-tabs v-model="selectedItemType" class="mb-4">
          <v-tab value="product">
            <v-icon icon="mdi-food" class="mr-2" />
            Products
          </v-tab>
          <v-tab value="preparation">
            <v-icon icon="mdi-chef-hat" class="mr-2" />
            Preparations
          </v-tab>
        </v-tabs>

        <!-- Search -->
        <v-text-field
          v-model="searchQuery"
          label="Search items..."
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          clearable
          class="mb-4"
        />

        <!-- Items List -->
        <div class="items-list">
          <div v-if="filteredItems.length === 0" class="text-center py-8 text-medium-emphasis">
            <v-icon icon="mdi-package-variant-closed" size="48" class="mb-2" />
            <div>No items found</div>
            <div class="text-caption">
              No {{ formatItemType(selectedItemType) }} available in
              {{ formatDepartment(department) }}
            </div>
          </div>

          <v-list v-else class="pa-0">
            <v-list-item
              v-for="item in filteredItems"
              :key="item.itemId"
              class="item-row"
              @click="selectItem(item)"
            >
              <template #prepend>
                <div class="item-icon mr-3">
                  {{ getItemIcon(item.itemType) }}
                </div>
              </template>

              <v-list-item-title>
                <div class="d-flex align-center justify-space-between">
                  <div>
                    <div class="font-weight-medium">{{ getItemName(item.itemId) }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatItemType(item.itemType) }}
                    </div>
                  </div>

                  <div class="text-right">
                    <div class="font-weight-medium">{{ item.totalQuantity }} {{ item.unit }}</div>
                    <div class="text-caption text-medium-emphasis">
                      {{ formatCurrency(item.averageCost) }}/{{ item.unit }}
                    </div>
                  </div>
                </div>
              </v-list-item-title>

              <template #append>
                <div class="d-flex align-center">
                  <!-- Status indicators -->
                  <div class="mr-2">
                    <v-chip v-if="item.hasExpired" size="x-small" color="error" variant="flat">
                      Expired
                    </v-chip>
                    <v-chip
                      v-else-if="item.hasNearExpiry"
                      size="x-small"
                      color="warning"
                      variant="flat"
                    >
                      Expiring
                    </v-chip>
                    <v-chip
                      v-else-if="item.belowMinStock"
                      size="x-small"
                      color="info"
                      variant="flat"
                    >
                      Low Stock
                    </v-chip>
                  </div>

                  <v-icon icon="mdi-chevron-right" color="primary" />
                </div>
              </template>
            </v-list-item>
          </v-list>
        </div>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="handleClose">Cancel</v-btn>
      </v-card-actions>
    </v-card>

    <!-- Quantity Dialog -->
    <v-dialog v-model="showQuantityDialog" max-width="400px" persistent>
      <v-card>
        <v-card-title>
          <h3>Set Quantity</h3>
        </v-card-title>

        <v-card-text class="pa-6">
          <div class="text-center mb-4">
            <div class="item-icon-large mb-2">
              {{ getItemIcon(selectedItem?.itemType || 'product') }}
            </div>
            <div class="text-h6">{{ getItemName(selectedItem?.itemId || '') }}</div>
            <div class="text-caption text-medium-emphasis">
              Available: {{ selectedItem?.totalQuantity || 0 }} {{ selectedItem?.unit || 'unit' }}
            </div>
          </div>

          <v-text-field
            v-model.number="quantity"
            label="Quantity to consume"
            type="number"
            min="0.01"
            step="0.01"
            :max="selectedItem?.totalQuantity || 0"
            :suffix="selectedItem?.unit || 'unit'"
            variant="outlined"
            autofocus
            :rules="quantityRules"
          />
        </v-card-text>

        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="outlined" @click="showQuantityDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :disabled="!isQuantityValid"
            @click="confirmAddItem"
          >
            Add Item
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStorageStore } from '@/stores/storage'
import type {
  StorageDepartment,
  StorageItemType,
  StorageBalance,
  ConsumptionItem
} from '@/stores/storage'

// Props
interface Props {
  modelValue: boolean
  department: StorageDepartment
}

const props = defineProps<Props>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'add-item': [item: ConsumptionItem]
}>()

// Store
const storageStore = useStorageStore()

// State
const selectedItemType = ref<StorageItemType>('product')
const searchQuery = ref('')
const showQuantityDialog = ref(false)
const selectedItem = ref<StorageBalance | null>(null)
const quantity = ref(1)

// Computed
const availableItems = computed(() =>
  storageStore.state.balances.filter(
    b =>
      b.department === props.department &&
      b.itemType === selectedItemType.value &&
      b.totalQuantity > 0
  )
)

const filteredItems = computed(() => {
  let items = availableItems.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    items = items.filter(item => getItemName(item.itemId).toLowerCase().includes(query))
  }

  return items.sort((a, b) => getItemName(a.itemId).localeCompare(getItemName(b.itemId)))
})

const quantityRules = computed(() => [
  (v: number) => !!v || 'Quantity is required',
  (v: number) => v > 0 || 'Quantity must be greater than 0',
  (v: number) =>
    v <= (selectedItem.value?.totalQuantity || 0) ||
    `Maximum available: ${selectedItem.value?.totalQuantity || 0}`
])

const isQuantityValid = computed(
  () => quantity.value > 0 && quantity.value <= (selectedItem.value?.totalQuantity || 0)
)

// Methods
function formatDepartment(dept: StorageDepartment): string {
  return dept === 'kitchen' ? 'Kitchen' : 'Bar'
}

function formatItemType(type: StorageItemType): string {
  return type === 'product' ? 'Product' : 'Preparation'
}

function getItemIcon(itemType: StorageItemType): string {
  return itemType === 'product' ? '🥩' : '🍲'
}

function getItemName(itemId: string): string {
  // Mock function - in real app, get from Product/Recipe store
  const mockNames: Record<string, string> = {
    'beef-steak': 'Beef Steak',
    potato: 'Potato',
    garlic: 'Garlic',
    vodka: 'Vodka',
    beer: 'Beer',
    'beef-rendang-prep': 'Beef Rendang (Prepared)'
  }
  return mockNames[itemId] || itemId
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount)
}

function selectItem(item: StorageBalance) {
  selectedItem.value = item
  quantity.value = 1
  showQuantityDialog.value = true
}

function confirmAddItem() {
  if (!selectedItem.value || !isQuantityValid.value) return

  const consumptionItem: ConsumptionItem = {
    itemId: selectedItem.value.itemId,
    itemType: selectedItem.value.itemType,
    quantity: quantity.value,
    notes: ''
  }

  emit('add-item', consumptionItem)
  handleClose()
}

function handleClose() {
  searchQuery.value = ''
  selectedItem.value = null
  quantity.value = 1
  showQuantityDialog.value = false
  emit('update:modelValue', false)
}
</script>

<style lang="scss" scoped>
.items-list {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid rgba(var(--v-theme-outline), 0.2);
  border-radius: 8px;

  .item-row {
    border-bottom: 1px solid rgba(var(--v-theme-outline), 0.1);
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: rgba(var(--v-theme-primary), 0.05);
    }

    &:last-child {
      border-bottom: none;
    }
  }
}

.item-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 8px;
}

.item-icon-large {
  font-size: 48px;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 16px;
  margin: 0 auto;
}
</style>
