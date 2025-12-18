<template>
  <v-dialog v-model="isOpen" max-width="700px" persistent>
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-package-variant</v-icon>
        <span>Change Package</span>
      </v-card-title>

      <v-divider />

      <v-card-text class="pt-4">
        <div v-if="productName" class="mb-4">
          <div class="text-subtitle-2 text-medium-emphasis mb-1">Product</div>
          <div class="text-body-1 font-weight-medium">{{ productName }}</div>
        </div>

        <div v-if="currentPackageInfo" class="mb-4 pa-3 bg-surface-variant rounded">
          <div class="text-subtitle-2 text-medium-emphasis mb-2">Current Package</div>
          <div class="d-flex align-center gap-2">
            <v-chip color="primary" size="small" variant="tonal">
              {{ currentPackageInfo.name }}
            </v-chip>
            <span class="text-caption">
              {{ currentPackageInfo.size }} {{ currentPackageInfo.baseUnit }} per package
            </span>
          </div>
          <div v-if="currentPackageQuantity" class="text-caption mt-1">
            Current quantity: {{ currentPackageQuantity }} packages
          </div>
        </div>

        <v-divider class="my-4" />

        <div class="text-subtitle-2 text-medium-emphasis mb-3">Select New Package</div>

        <PackageSelector
          v-if="productId"
          :product-id="productId"
          :required-base-quantity="requiredQuantity"
          :selected-package-id="selectedPackageId"
          mode="change"
          layout="vertical"
          :allow-quantity-edit="true"
          @package-selected="handlePackageSelected"
        />
      </v-card-text>

      <v-divider />

      <v-card-actions class="px-4 py-3">
        <v-spacer />
        <v-btn variant="text" @click="handleClose">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :disabled="!selectedPackageData"
          @click="handleConfirm"
        >
          Confirm Change
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import PackageSelector from '@/views/supplier_2/components/shared/package/PackageSelector.vue'
import { useProductsStore } from '@/stores/productsStore'

interface Props {
  modelValue: boolean
  productId?: string
  productName?: string
  currentPackageId?: string
  currentPackageQuantity?: number
  requiredQuantity?: number
}

interface PackageSelectedData {
  packageId: string
  packageQuantity: number
  resultingBaseQuantity: number
  totalCost: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  requiredQuantity: 0
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'package-changed': [data: PackageSelectedData]
}>()

const productsStore = useProductsStore()

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

const selectedPackageId = ref<string | undefined>(props.currentPackageId)
const selectedPackageData = ref<PackageSelectedData | null>(null)

// Get current package information
const currentPackageInfo = computed(() => {
  if (!props.currentPackageId || !props.productId) return null

  const product = productsStore.products.find(p => p.id === props.productId)
  if (!product?.packages) return null

  const pkg = product.packages.find(p => p.id === props.currentPackageId)
  if (!pkg) return null

  return {
    name: pkg.packageName,
    size: pkg.packageSize,
    baseUnit: product.unit
  }
})

// Watch for prop changes to reset selection
watch(
  () => props.currentPackageId,
  newVal => {
    selectedPackageId.value = newVal
  }
)

watch(
  () => props.modelValue,
  newVal => {
    if (newVal) {
      // Reset selection when dialog opens
      selectedPackageId.value = props.currentPackageId
      selectedPackageData.value = null
    }
  }
)

function handlePackageSelected(data: PackageSelectedData) {
  selectedPackageData.value = data
  selectedPackageId.value = data.packageId
}

function handleConfirm() {
  if (!selectedPackageData.value) return

  emit('package-changed', selectedPackageData.value)
  isOpen.value = false
}

function handleClose() {
  isOpen.value = false
}
</script>

<style scoped lang="scss">
.gap-2 {
  gap: 0.5rem;
}
</style>
