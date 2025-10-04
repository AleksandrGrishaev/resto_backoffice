<!-- src/views/supplier_2/components/shared/package/QuickAddPackageDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="500px" persistent>
    <v-card>
      <v-card-title class="pa-4 bg-primary text-white">
        <div class="d-flex align-center justify-space-between">
          <span>Add New Package</span>
          <v-btn icon="mdi-close" variant="text" color="white" size="small" @click="closeDialog" />
        </div>
      </v-card-title>

      <v-card-text class="pa-4">
        <v-alert type="info" variant="tonal" class="mb-4">
          <div class="text-body-2">Quickly add a new package option for this product.</div>
        </v-alert>

        <v-form ref="formRef" v-model="formValid" @submit.prevent="savePackage">
          <!-- Package Name -->
          <v-text-field
            v-model="form.packageName"
            label="Package Name *"
            placeholder="e.g., Box 24pcs, Bag 5kg"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-package-variant"
            :rules="[v => !!v || 'Required']"
            class="mb-3"
          />

          <!-- Package Size & Unit -->
          <v-row dense class="mb-3">
            <v-col cols="6">
              <v-text-field
                v-model.number="form.packageSize"
                label="Package Size *"
                type="number"
                min="0.001"
                step="0.001"
                variant="outlined"
                density="compact"
                prepend-inner-icon="mdi-scale"
                :rules="[v => (!!v && v > 0) || 'Must be > 0']"
              />
            </v-col>
            <v-col cols="6">
              <v-select
                v-model="form.packageUnit"
                :items="packageUnitOptions"
                label="Package Unit *"
                variant="outlined"
                density="compact"
                :rules="[v => !!v || 'Required']"
              />
            </v-col>
          </v-row>

          <!-- Package Price (optional) with IDR formatting -->
          <v-text-field
            v-model="formattedPrice"
            label="Package Price (optional)"
            type="text"
            variant="outlined"
            density="compact"
            prefix="Rp"
            placeholder="0"
            prepend-inner-icon="mdi-currency-usd"
            hint="Leave empty to calculate from base cost"
            persistent-hint
            class="mb-3"
            @blur="validatePrice"
          />

          <!-- Brand Name (optional) -->
          <v-text-field
            v-model="form.brandName"
            label="Brand Name (optional)"
            placeholder="e.g., Anchor, Local Brand"
            variant="outlined"
            density="compact"
            prepend-inner-icon="mdi-tag"
            class="mb-3"
          />

          <!-- Notes -->
          <v-textarea
            v-model="form.notes"
            label="Notes (optional)"
            placeholder="Any additional notes..."
            variant="outlined"
            density="compact"
            rows="2"
          />
        </v-form>

        <!-- Preview -->
        <v-card variant="outlined" class="mt-4 pa-3">
          <div class="text-caption text-medium-emphasis mb-2">Preview:</div>
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-body-1 font-weight-bold">
                {{ form.packageName || 'Package Name' }}
              </div>
              <div class="text-caption">
                {{ form.packageSize || '0' }} {{ baseUnit }} per {{ form.packageUnit || 'unit' }}
              </div>
              <div v-if="form.brandName" class="text-caption text-medium-emphasis">
                Brand: {{ form.brandName }}
              </div>
            </div>
            <div class="text-right">
              <div v-if="calculatedPrice > 0" class="text-h6 text-primary">
                {{ formatCurrency(calculatedPrice) }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ formatCurrency(pricePerBaseUnit) }} / {{ baseUnit }}
              </div>
            </div>
          </div>
        </v-card>
      </v-card-text>

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="closeDialog">Cancel</v-btn>
        <v-btn
          color="primary"
          :disabled="!formValid || saving"
          :loading="saving"
          @click="savePackage"
        >
          Add Package
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useProductsStore } from '@/stores/productsStore'
import { DebugUtils } from '@/utils'
import { formatIDR, parseIDR } from '@/utils/currency'
import type { PackageOption } from '@/stores/productsStore/types'

const MODULE_NAME = 'QuickAddPackageDialog'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  modelValue: boolean
  productId?: string
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'package-created', packageId: string): void
}

const props = defineProps<Props>()
const emits = defineEmits<Emits>()

// =============================================
// STORES
// =============================================

const productsStore = useProductsStore()

// =============================================
// LOCAL STATE
// =============================================

const isOpen = computed({
  get: () => props.modelValue,
  set: value => emits('update:modelValue', value)
})

const formRef = ref()
const formValid = ref(false)
const saving = ref(false)

const form = ref({
  packageName: '',
  packageSize: null as number | null,
  packageUnit: 'pack' as string,
  packagePrice: null as number | null,
  brandName: '',
  notes: ''
})

const formattedPrice = ref('')

// =============================================
// COMPUTED
// =============================================

const product = computed(() => {
  if (!props.productId) return null
  return productsStore.products.find(p => p.id === props.productId)
})

const baseUnit = computed(() => {
  return product.value?.baseUnit || 'unit'
})

const packageUnitOptions = computed(() => {
  const base = baseUnit.value

  if (base === 'gram') {
    return [
      { title: 'Kilogram', value: 'kg' },
      { title: 'Pack', value: 'pack' },
      { title: 'Box', value: 'box' },
      { title: 'Bag', value: 'bag' }
    ]
  } else if (base === 'ml') {
    return [
      { title: 'Liter', value: 'liter' },
      { title: 'Bottle', value: 'bottle' },
      { title: 'Can', value: 'can' },
      { title: 'Pack', value: 'pack' }
    ]
  } else {
    return [
      { title: 'Piece', value: 'piece' },
      { title: 'Box', value: 'box' },
      { title: 'Pack', value: 'pack' },
      { title: 'Dozen', value: 'dozen' }
    ]
  }
})

const calculatedPrice = computed(() => {
  if (form.value.packagePrice) return form.value.packagePrice

  if (!product.value || !form.value.packageSize) return 0

  return product.value.baseCostPerUnit * form.value.packageSize
})

const pricePerBaseUnit = computed(() => {
  if (!form.value.packageSize || form.value.packageSize === 0) return 0

  return calculatedPrice.value / form.value.packageSize
})

// =============================================
// METHODS
// =============================================

function validatePrice() {
  if (formattedPrice.value) {
    const parsed = parseIDR(`Rp ${formattedPrice.value}`)
    form.value.packagePrice = parsed
    formattedPrice.value = formatPriceForInput(parsed)
  }
}

function formatPriceForInput(price: number): string {
  if (!price || price === 0) return ''
  return new Intl.NumberFormat('id-ID').format(price)
}

function formatCurrency(amount: number): string {
  return formatIDR(amount)
}

async function savePackage() {
  if (!formValid.value || !product.value) return

  saving.value = true
  try {
    const packageData: Omit<PackageOption, 'id' | 'createdAt' | 'updatedAt'> = {
      productId: product.value.id,
      packageName: form.value.packageName.trim(),
      packageSize: form.value.packageSize!,
      packageUnit: form.value.packageUnit as any,
      brandName: form.value.brandName?.trim() || undefined,
      packagePrice: form.value.packagePrice || undefined,
      baseCostPerUnit: pricePerBaseUnit.value,
      isActive: true,
      notes: form.value.notes?.trim() || undefined
    }

    const newPackage = await productsStore.addPackageOption(packageData)

    DebugUtils.info(MODULE_NAME, 'Package created successfully', {
      packageId: newPackage.id,
      packageName: newPackage.packageName
    })

    emits('package-created', newPackage.id)
    closeDialog()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to create package', { error })
  } finally {
    saving.value = false
  }
}

function resetForm() {
  form.value = {
    packageName: '',
    packageSize: null,
    packageUnit: 'pack',
    packagePrice: null,
    brandName: '',
    notes: ''
  }
  formattedPrice.value = ''
  formValid.value = false
}

function closeDialog() {
  resetForm()
  isOpen.value = false
}

// =============================================
// WATCHERS
// =============================================

watch(
  () => props.modelValue,
  newValue => {
    if (newValue) {
      resetForm()
    }
  }
)
</script>

<style scoped>
.bg-primary {
  background-color: rgb(var(--v-theme-primary));
}

/* Price input styling */
:deep(.v-field__prefix) {
  padding-right: 4px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
