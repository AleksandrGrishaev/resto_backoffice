<template>
  <v-dialog
    :model-value="modelValue"
    max-width="500px"
    @update:model-value="$emit('update:model-value', $event)"
  >
    <v-card>
      <v-card-title>
        {{ isEditing ? 'Edit Package' : 'Add Package' }}
      </v-card-title>

      <v-card-text>
        <v-form ref="formRef" v-model="formValid">
          <v-text-field
            v-model="formData.packageName"
            label="Package Name *"
            placeholder="Kilogram, Pack 500g, Box 24pcs"
            :rules="[rules.required]"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <div class="d-flex gap-3 mb-3">
            <v-text-field
              v-model.number="formData.packageSize"
              label="Package Size *"
              :suffix="baseUnit"
              :rules="[rules.required, rules.positive]"
              type="number"
              variant="outlined"
              density="comfortable"
              class="flex-grow-1"
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
              class="flex-grow-1"
            />
          </div>

          <v-text-field
            v-model="formData.brandName"
            label="Brand (optional)"
            placeholder="Anchor, Local Brand"
            variant="outlined"
            density="comfortable"
            class="mb-3"
          />

          <v-alert type="info" variant="tonal" density="compact" class="mb-3">
            <div class="text-caption">
              Prices are optional and can be updated after the first delivery
            </div>
          </v-alert>

          <v-text-field
            v-model.number="formData.packagePrice"
            label="Price per Package (optional)"
            suffix="IDR"
            type="number"
            variant="outlined"
            density="comfortable"
            class="mb-3"
            hint="Leave empty if unknown, will be calculated automatically"
            persistent-hint
          />

          <v-text-field
            v-model.number="formData.baseCostPerUnit"
            :label="`Price per ${baseUnit} (optional)`"
            suffix="IDR"
            type="number"
            variant="outlined"
            density="comfortable"
            class="mb-3"
            hint="Leave empty if unknown, will be updated from actual deliveries"
            persistent-hint
          />

          <v-textarea
            v-model="formData.notes"
            label="Notes (optional)"
            placeholder="Wholesale price, Bulk orders only"
            variant="outlined"
            density="comfortable"
            rows="2"
            class="mb-3"
          />

          <v-switch v-model="formData.isActive" label="Active" color="primary" class="mb-3" />

          <!-- Calculation Information -->
          <v-card v-if="hasCalculations" variant="tonal" color="info" class="mb-3">
            <v-card-text class="py-2">
              <div class="text-body-2">
                <strong>Calculations:</strong>
                <br />
                <span v-if="calculatedPackagePrice">
                  Calculated package price: {{ formatPrice(calculatedPackagePrice) }}
                  <br />
                </span>
                <span v-if="calculatedBaseCost">
                  Calculated price per {{ baseUnit }}: {{ formatPrice(calculatedBaseCost) }}
                  <br />
                </span>
              </div>
            </v-card-text>
          </v-card>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:model-value', false)">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :disabled="!formValid"
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
