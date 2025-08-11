<!-- src/components/storage/widgets/QuickWriteOffButton.vue -->
<template>
  <div>
    <!-- Main Quick Write-off Button -->
    <v-btn
      color="error"
      variant="flat"
      prepend-icon="mdi-delete-sweep"
      @click="showQuickMenu = true"
    >
      Quick Write-off
      <v-menu
        v-model="showQuickMenu"
        activator="parent"
        location="bottom"
        :close-on-content-click="false"
      >
        <v-card min-width="300">
          <!-- Header -->
          <v-card-title class="d-flex align-center gap-2">
            <v-icon icon="mdi-flash" color="error" />
            Quick Write-off
            <v-spacer />
            <v-btn icon="mdi-close" variant="text" size="small" @click="showQuickMenu = false" />
          </v-card-title>

          <v-divider />

          <!-- Department Selection -->
          <v-card-text class="pa-4">
            <v-select
              v-model="selectedDepartment"
              :items="departmentOptions"
              label="Department"
              variant="outlined"
              density="compact"
              hide-details
              @update:model-value="refreshData"
            />
          </v-card-text>

          <!-- Quick Actions -->
          <v-list density="compact" class="pa-0">
            <!-- Expired Products -->
            <v-list-item
              prepend-icon="mdi-clock-alert"
              :title="`Write-off Expired Products (${expiredCount})`"
              :subtitle="
                expiredCount ? `${formatIDR(expiredValue)} total value` : 'No expired products'
              "
              :disabled="!expiredCount"
              @click="handleExpiredWriteOff"
            >
              <template #append>
                <v-chip
                  v-if="expiredCount"
                  :text="String(expiredCount)"
                  color="error"
                  size="small"
                />
              </template>
            </v-list-item>

            <v-divider />

            <!-- Near Expiry Products -->
            <v-list-item
              prepend-icon="mdi-clock-outline"
              :title="`Check Near Expiry (${nearExpiryCount})`"
              :subtitle="nearExpiryCount ? 'Products expiring soon' : 'No products expiring soon'"
              :disabled="!nearExpiryCount"
              @click="handleNearExpiryCheck"
            >
              <template #append>
                <v-chip
                  v-if="nearExpiryCount"
                  :text="String(nearExpiryCount)"
                  color="warning"
                  size="small"
                />
              </template>
            </v-list-item>

            <v-divider />

            <!-- Custom Write-off -->
            <v-list-item
              prepend-icon="mdi-pencil"
              title="Custom Write-off"
              subtitle="Select specific products"
              @click="handleCustomWriteOff"
            />

            <v-divider />

            <!-- Quick Presets -->
            <v-list-subheader>Quick Presets</v-list-subheader>

            <v-list-item
              prepend-icon="mdi-delete-variant"
              title="Spoiled Products"
              subtitle="For damaged/spoiled items"
              @click="handlePresetWriteOff('spoiled')"
            />

            <v-list-item
              prepend-icon="mdi-school"
              title="Training Session"
              subtitle="For staff education"
              @click="handlePresetWriteOff('education')"
            />

            <v-list-item
              prepend-icon="mdi-test-tube"
              title="Recipe Testing"
              subtitle="For R&D activities"
              @click="handlePresetWriteOff('test')"
            />
          </v-list>

          <!-- Footer Info -->
          <v-card-text class="pa-4 pt-2">
            <v-alert
              v-if="alertsCount > 0"
              type="warning"
              variant="tonal"
              density="compact"
              class="text-caption"
            >
              {{ alertsCount }} product{{ alertsCount !== 1 ? 's' : '' }} need{{
                alertsCount === 1 ? 's' : ''
              }}
              attention
            </v-alert>
            <div v-else class="text-caption text-success text-center">
              ✓ All products in good condition
            </div>
          </v-card-text>
        </v-card>
      </v-menu>
    </v-btn>

    <!-- Write-off Dialog -->
    <WriteOffDialog
      v-model="showWriteOffDialog"
      :department="selectedDepartment"
      :preselected-products="preselectedProducts"
      @success="handleWriteOffSuccess"
    />

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSuccessMessage" color="success" timeout="3000">
      <v-icon icon="mdi-check-circle" class="mr-2" />
      Write-off completed successfully!
    </v-snackbar>

    <!-- Near Expiry Dialog -->
    <v-dialog v-model="showNearExpiryDialog" max-width="600">
      <v-card>
        <v-card-title class="d-flex align-center gap-2">
          <v-icon icon="mdi-clock-outline" color="warning" />
          Products Expiring Soon
        </v-card-title>
        <v-divider />
        <v-card-text class="pa-4">
          <div v-if="nearExpiryProducts.length === 0" class="text-center py-4">
            <v-icon icon="mdi-check-circle" size="48" color="success" class="mb-2" />
            <h4>All Good!</h4>
            <p class="text-medium-emphasis">No products expiring in the next 3 days.</p>
          </div>
          <div v-else>
            <p class="mb-4">
              The following products will expire soon. Consider using or writing them off:
            </p>
            <v-list density="compact">
              <v-list-item
                v-for="product in nearExpiryProducts"
                :key="product.itemId"
                :title="product.itemName"
                :subtitle="`${product.totalQuantity} ${product.unit} - Expires: ${formatExpiryDate(product)}`"
              >
                <template #prepend>
                  <v-icon icon="mdi-package-variant" />
                </template>
                <template #append>
                  <v-btn
                    size="small"
                    variant="outlined"
                    color="error"
                    @click="quickWriteOffProduct(product)"
                  >
                    Write-off
                  </v-btn>
                </template>
              </v-list-item>
            </v-list>
          </div>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showNearExpiryDialog = false">Close</v-btn>
          <v-btn
            v-if="nearExpiryProducts.length > 0"
            color="warning"
            variant="flat"
            @click="writeOffAllNearExpiry"
          >
            Write-off All
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useWriteOff } from '@/stores/storage'
import { useStorageStore } from '@/stores/storage'
import { formatIDR } from '@/utils'
import WriteOffDialog from '../dialogs/WriteOffDialog.vue'
import type {
  StorageDepartment,
  WriteOffReason,
  StorageBalance,
  QuickWriteOffItem
} from '@/stores/storage/types'

interface Props {
  department?: StorageDepartment
}

const props = withDefaults(defineProps<Props>(), {
  department: 'kitchen'
})

// Composables
const writeOff = useWriteOff()
const storageStore = useStorageStore()

// State
const showQuickMenu = ref(false)
const showWriteOffDialog = ref(false)
const showNearExpiryDialog = ref(false)
const showSuccessMessage = ref(false)
const selectedDepartment = ref<StorageDepartment>(props.department)
const preselectedProducts = ref<QuickWriteOffItem[]>([])

// Options
const departmentOptions = [
  { title: 'Kitchen', value: 'kitchen' },
  { title: 'Bar', value: 'bar' }
]

// Computed
const departmentBalances = computed(() => {
  return storageStore.departmentBalances(selectedDepartment.value)
})

const expiredProducts = computed(() => {
  return departmentBalances.value.filter(b => b.hasExpired)
})

const nearExpiryProducts = computed(() => {
  return departmentBalances.value.filter(b => b.hasNearExpiry && !b.hasExpired)
})

const expiredCount = computed(() => expiredProducts.value.length)
const nearExpiryCount = computed(() => nearExpiryProducts.value.length)

const expiredValue = computed(() => {
  return expiredProducts.value.reduce((sum, product) => sum + product.totalValue, 0)
})

const alertsCount = computed(() => {
  return storageStore.alertCounts.expired + storageStore.alertCounts.expiring
})

// Methods
function refreshData() {
  // Trigger refresh of storage data if needed
  storageStore.fetchBalances(selectedDepartment.value)
}

async function handleExpiredWriteOff() {
  try {
    showQuickMenu.value = false

    if (expiredProducts.value.length === 0) return

    const operation = await writeOff.writeOffExpiredProducts(
      selectedDepartment.value,
      'System Auto Write-off',
      'Automatic write-off of expired products'
    )

    if (operation) {
      showSuccessMessage.value = true
    }
  } catch (error) {
    console.error('Failed to write-off expired products:', error)
  }
}

function handleNearExpiryCheck() {
  showQuickMenu.value = false
  showNearExpiryDialog.value = true
}

function handleCustomWriteOff() {
  showQuickMenu.value = false
  preselectedProducts.value = []
  showWriteOffDialog.value = true
}

function handlePresetWriteOff(reason: WriteOffReason) {
  showQuickMenu.value = false

  // Create preset with empty products for user to fill
  preselectedProducts.value = []

  // Open dialog with preset reason
  showWriteOffDialog.value = true

  // Note: The reason will be set in the dialog, but we could pass it as a prop
}

function quickWriteOffProduct(product: StorageBalance) {
  showNearExpiryDialog.value = false

  // Preset this specific product for write-off
  preselectedProducts.value = [
    {
      itemId: product.itemId,
      itemName: product.itemName,
      currentQuantity: product.totalQuantity,
      unit: product.unit,
      writeOffQuantity: product.totalQuantity, // Default to full quantity
      reason: 'expired',
      notes: `Expiring soon - ${formatExpiryDate(product)}`
    }
  ]

  showWriteOffDialog.value = true
}

function writeOffAllNearExpiry() {
  showNearExpiryDialog.value = false

  // Preset all near-expiry products
  preselectedProducts.value = nearExpiryProducts.value.map(product => ({
    itemId: product.itemId,
    itemName: product.itemName,
    currentQuantity: product.totalQuantity,
    unit: product.unit,
    writeOffQuantity: product.totalQuantity,
    reason: 'expired' as WriteOffReason,
    notes: `Expiring soon - ${formatExpiryDate(product)}`
  }))

  showWriteOffDialog.value = true
}

function formatExpiryDate(product: StorageBalance): string {
  // Find the earliest expiry date from batches
  const earliestExpiry = product.batches
    .filter(b => b.expiryDate)
    .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime())[0]

  if (!earliestExpiry?.expiryDate) return 'No expiry date'

  const date = new Date(earliestExpiry.expiryDate)
  return date.toLocaleDateString()
}

function handleWriteOffSuccess(operation: any) {
  showSuccessMessage.value = true
  refreshData()
}

// Watch department prop changes
watch(
  () => props.department,
  newDepartment => {
    selectedDepartment.value = newDepartment
  }
)
</script>

<style scoped>
.v-list-item {
  border-radius: 4px;
  margin: 2px 8px;
}

.v-list-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.08);
}
</style>
