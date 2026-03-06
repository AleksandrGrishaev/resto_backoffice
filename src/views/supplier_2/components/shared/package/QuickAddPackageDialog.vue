<!-- src/views/supplier_2/components/shared/package/QuickAddPackageDialog.vue -->
<template>
  <v-dialog v-model="isOpen" max-width="720px" persistent>
    <v-card>
      <v-card-title class="text-h6 pa-4 pb-2">
        <div class="d-flex align-center justify-space-between">
          <span>Add New Package</span>
          <v-btn icon="mdi-close" variant="text" size="small" @click="closeDialog" />
        </div>
      </v-card-title>

      <v-card-text class="pa-4 pt-2">
        <v-form ref="formRef" v-model="formValid" @submit.prevent="savePackage">
          <!-- Row 1: Name + Brand -->
          <div class="d-flex gap-3 mb-3">
            <v-text-field
              v-model="form.packageName"
              label="Package Name *"
              placeholder="Box 24pcs, Bag 5kg"
              variant="outlined"
              density="compact"
              :rules="[v => !!v || 'Required']"
              autofocus
              style="flex: 2"
            />
            <v-text-field
              v-model="form.brandName"
              label="Brand (optional)"
              placeholder="Anchor, Local"
              variant="outlined"
              density="compact"
              style="flex: 1"
            />
          </div>

          <!-- Row 2: Size + Unit + Price -->
          <div class="d-flex gap-3 mb-3">
            <NumericInputField
              v-model="form.packageSize"
              label="Package Size *"
              :min="0.001"
              :max="99999"
              :allow-decimal="true"
              :decimal-places="3"
              variant="outlined"
              density="compact"
              :error-messages="!form.packageSize || form.packageSize <= 0 ? 'Must be > 0' : ''"
              style="flex: 1"
            />
            <v-select
              v-model="form.packageUnit"
              :items="packageUnitOptions"
              label="Package Unit *"
              variant="outlined"
              density="compact"
              :rules="[v => !!v || 'Required']"
              style="flex: 1"
            />
            <NumericInputField
              v-model="form.packagePrice"
              label="Price (optional)"
              variant="outlined"
              density="compact"
              prefix="Rp"
              :min="0"
              :max="999999999"
              :format-as-currency="true"
              hint="Auto-calculated if empty"
              persistent-hint
              style="flex: 1"
            />
          </div>

          <!-- Row 3: Notes -->
          <v-textarea
            v-model="form.notes"
            label="Notes (optional)"
            placeholder="Wholesale price, Bulk orders only"
            variant="outlined"
            density="compact"
            rows="2"
          />
        </v-form>

        <!-- Preview -->
        <v-card variant="outlined" class="mt-3 pa-3">
          <div class="d-flex align-center justify-space-between">
            <div>
              <div class="text-body-1 font-weight-bold">
                {{ form.packageName || 'Package Name' }}
              </div>
              <div class="text-caption">
                {{ form.packageSize || '0' }} {{ baseUnit }} per {{ form.packageUnit || 'unit' }}
                <span v-if="form.brandName" class="text-medium-emphasis ml-2">
                  &middot; {{ form.brandName }}
                </span>
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

      <v-card-actions class="pa-4 pt-2 d-flex justify-end">
        <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
        <v-btn
          color="primary"
          :variant="formValid ? 'flat' : 'outlined'"
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
import { formatIDR } from '@/utils/currency'
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
:deep(.v-field__prefix) {
  padding-right: 4px;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
