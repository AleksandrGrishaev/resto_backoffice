<template>
  <v-dialog
    :model-value="modelValue"
    max-width="720px"
    @update:model-value="$emit('update:model-value', $event)"
  >
    <v-card>
      <v-card-title class="text-h6 pa-4 pb-2">
        {{ isEditing ? 'Edit Package' : 'Add Package' }}
      </v-card-title>

      <v-card-text class="pa-4 pt-2">
        <v-form ref="formRef" v-model="formValid">
          <!-- Row 1: Name + Brand -->
          <div class="d-flex gap-3 mb-3">
            <v-text-field
              v-model="formData.packageName"
              label="Package Name *"
              placeholder="Kilogram, Pack 500g, Box 24pcs"
              :rules="[rules.required]"
              variant="outlined"
              density="comfortable"
              autofocus
              style="flex: 2"
            />
            <v-text-field
              v-model="formData.brandName"
              label="Brand (optional)"
              placeholder="Anchor, Local"
              variant="outlined"
              density="comfortable"
              style="flex: 1"
            />
          </div>

          <!-- Row 2: Size + Unit -->
          <div class="d-flex gap-3 mb-3">
            <NumericInputField
              v-model="formData.packageSize"
              label="Package Size *"
              :suffix="baseUnit"
              :rules="[rules.required, rules.positive]"
              :allow-decimal="true"
              variant="outlined"
              density="comfortable"
              style="flex: 1"
            />
            <v-select
              v-model="formData.packageUnit"
              label="Package Unit *"
              :items="packageUnitOptions"
              item-value="value"
              item-title="text"
              :rules="[rules.required]"
              variant="outlined"
              density="comfortable"
              style="flex: 1"
            />
          </div>

          <!-- Row 3: Prices side by side -->
          <v-alert type="info" variant="tonal" density="compact" class="mb-3">
            <div class="text-caption">
              Prices are optional and can be updated after the first delivery
            </div>
          </v-alert>

          <div class="d-flex gap-3 mb-3">
            <NumericInputField
              v-model="formData.packagePrice"
              label="Price per Package"
              suffix="IDR"
              variant="outlined"
              density="comfortable"
              hint="Auto-calculated if empty"
              persistent-hint
              style="flex: 1"
            />
            <NumericInputField
              v-model="formData.baseCostPerUnit"
              :label="`Price per ${baseUnit}`"
              suffix="IDR"
              :allow-decimal="true"
              variant="outlined"
              density="comfortable"
              hint="Updated from deliveries"
              persistent-hint
              style="flex: 1"
            />
          </div>

          <!-- Row 4: Notes + Active -->
          <div class="d-flex gap-3 align-start">
            <v-textarea
              v-model="formData.notes"
              label="Notes (optional)"
              placeholder="Wholesale price, Bulk orders only"
              variant="outlined"
              density="comfortable"
              rows="2"
              style="flex: 1"
            />
            <div
              v-if="isEditing"
              class="d-flex flex-column align-center pt-2"
              style="min-width: 80px"
            >
              <v-switch v-model="formData.isActive" label="Active" color="primary" hide-details />
            </div>
          </div>

          <!-- Calculation Information -->
          <v-card v-if="hasCalculations" variant="tonal" color="info" class="mt-3">
            <v-card-text class="py-2">
              <div class="d-flex gap-4 text-body-2">
                <span v-if="calculatedPackagePrice">
                  Package price:
                  <strong>{{ formatPrice(calculatedPackagePrice) }}</strong>
                </span>
                <span v-if="calculatedBaseCost">
                  Per {{ baseUnit }}:
                  <strong>{{ formatPrice(calculatedBaseCost) }}</strong>
                </span>
              </div>
            </v-card-text>
          </v-card>
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-4 pt-2 d-flex justify-end">
        <v-btn variant="text" @click="$emit('update:model-value', false)">Cancel</v-btn>
        <v-btn
          color="primary"
          :variant="formValid ? 'flat' : 'outlined'"
          :loading="loading"
          @click="handleSave"
        >
          {{ isEditing ? 'Save' : 'Add' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { NumericInputField } from '@/components/input'
import type {
  PackageOption,
  CreatePackageOptionDto,
  UpdatePackageOptionDto
} from '@/stores/productsStore/types'
import type { MeasurementUnit } from '@/types/measurementUnits'

interface Props {
  modelValue: boolean
  productId: string
  baseUnit: string
  package?: PackageOption
  loading?: boolean
  productBaseCost?: number
}

interface Emits {
  (e: 'update:model-value', value: boolean): void
  (e: 'save', data: CreatePackageOptionDto | UpdatePackageOptionDto): void
}

const props = withDefaults(defineProps<Props>(), {
  productBaseCost: 0
})
const emit = defineEmits<Emits>()

const formRef = ref()
const formValid = ref(false)

const isEditing = computed(() => !!props.package)

// Form data
const formData = ref({
  packageName: '',
  packageSize: 1,
  packageUnit: 'kg' as MeasurementUnit,
  brandName: '',
  packagePrice: null as number | null,
  baseCostPerUnit: null as number | null,
  notes: '',
  isActive: true
})

// Package unit options
const packageUnitOptions = computed(() => {
  const baseUnitType = props.baseUnit
  if (baseUnitType === 'gram') {
    return [
      { value: 'kg', text: 'Kilogram' },
      { value: 'pack', text: 'Pack' }
    ]
  } else if (baseUnitType === 'ml') {
    return [
      { value: 'liter', text: 'Liter' },
      { value: 'pack', text: 'Pack' }
    ]
  } else {
    return [
      { value: 'piece', text: 'Piece' },
      { value: 'pack', text: 'Pack' }
    ]
  }
})

// Validation rules
const rules = {
  required: (value: any) => !!value || 'Field is required',
  positive: (value: number) => (value && value > 0) || 'Value must be greater than 0'
}

// Calculated values
const calculatedPackagePrice = computed(() => {
  if (
    formData.value.baseCostPerUnit &&
    formData.value.packageSize &&
    !formData.value.packagePrice
  ) {
    return formData.value.baseCostPerUnit * formData.value.packageSize
  }
  return null
})

const calculatedBaseCost = computed(() => {
  if (
    formData.value.packagePrice &&
    formData.value.packageSize &&
    !formData.value.baseCostPerUnit
  ) {
    return formData.value.packagePrice / formData.value.packageSize
  }
  return null
})

const hasCalculations = computed(() => {
  return calculatedPackagePrice.value !== null || calculatedBaseCost.value !== null
})

// Load data when dialog opens
watch(
  () => props.modelValue,
  newValue => {
    if (newValue) {
      if (props.package) {
        // Editing
        formData.value = {
          packageName: props.package.packageName,
          packageSize: props.package.packageSize,
          packageUnit: props.package.packageUnit,
          brandName: props.package.brandName || '',
          packagePrice: props.package.packagePrice || null,
          baseCostPerUnit: props.package.baseCostPerUnit || null,
          notes: props.package.notes || '',
          isActive: props.package.isActive
        }
      } else {
        // Creating new
        resetForm()
      }

      nextTick(() => {
        formRef.value?.resetValidation()
      })
    }
  }
)

function resetForm() {
  formData.value = {
    packageName: '',
    packageSize: props.baseUnit === 'piece' ? 1 : 1000,
    packageUnit: getDefaultPackageUnit(),
    brandName: '',
    packagePrice: null,
    baseCostPerUnit: null,
    notes: '',
    isActive: true
  }
}

function getDefaultPackageUnit(): MeasurementUnit {
  switch (props.baseUnit) {
    case 'gram':
      return 'kg'
    case 'ml':
      return 'liter'
    case 'piece':
      return 'piece'
    default:
      return 'piece'
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price)
}

async function handleSave() {
  const valid = await formRef.value?.validate()
  if (!valid?.valid) return

  const finalPackagePrice = formData.value.packagePrice || calculatedPackagePrice.value || undefined
  const finalBaseCostPerUnit =
    formData.value.baseCostPerUnit || calculatedBaseCost.value || props.productBaseCost

  const saveData = {
    productId: props.productId,
    packageName: formData.value.packageName,
    packageSize: formData.value.packageSize,
    packageUnit: formData.value.packageUnit,
    brandName: formData.value.brandName || undefined,
    packagePrice: finalPackagePrice,
    baseCostPerUnit: finalBaseCostPerUnit,
    notes: formData.value.notes || undefined,
    ...(isEditing.value && {
      id: props.package!.id,
      isActive: formData.value.isActive
    })
  }

  emit('save', saveData)
}
</script>
