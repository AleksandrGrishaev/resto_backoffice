<!-- src/views/supplier/components/supplier/SupplierDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="800px"
    persistent
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div>
          <h3>{{ existingSupplier ? 'Edit' : 'Add' }} Supplier</h3>
          <div class="text-caption text-medium-emphasis">
            {{
              existingSupplier
                ? `Editing ${existingSupplier.name}`
                : 'Create a new supplier for procurement management'
            }}
          </div>
        </div>
        <v-btn icon="mdi-close" variant="text" @click="handleClose" />
      </v-card-title>

      <v-divider />

      <v-card-text class="pa-6" style="max-height: 600px">
        <v-form ref="form" v-model="isFormValid">
          <v-row>
            <!-- Basic Information Section -->
            <v-col cols="12">
              <div class="d-flex align-center mb-3">
                <v-icon icon="mdi-information" color="primary" class="mr-2" />
                <h4>Basic Information</h4>
              </div>
            </v-col>

            <v-col cols="12" md="8">
              <v-text-field
                v-model="formData.name"
                label="Supplier Name"
                :rules="nameRules"
                prepend-inner-icon="mdi-store"
                variant="outlined"
                required
                placeholder="e.g., Premium Meat Co"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-select
                v-model="formData.type"
                :items="supplierTypeOptions"
                label="Supplier Type"
                :rules="requiredRules"
                prepend-inner-icon="mdi-tag"
                variant="outlined"
                required
              />
            </v-col>

            <!-- Contact Information Section -->
            <v-col cols="12">
              <div class="d-flex align-center mb-3 mt-4">
                <v-icon icon="mdi-contacts" color="primary" class="mr-2" />
                <h4>Contact Information</h4>
              </div>
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.contactPerson"
                label="Contact Person"
                prepend-inner-icon="mdi-account"
                variant="outlined"
                placeholder="e.g., John Doe"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.phone"
                label="Phone Number"
                :rules="phoneRules"
                prepend-inner-icon="mdi-phone"
                variant="outlined"
                placeholder="+62-21-555-0000"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.email"
                label="Email Address"
                type="email"
                :rules="emailRules"
                prepend-inner-icon="mdi-email"
                variant="outlined"
                placeholder="orders@supplier.com"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="formData.paymentTerms"
                :items="paymentTermsOptions"
                label="Payment Terms"
                :rules="requiredRules"
                prepend-inner-icon="mdi-credit-card"
                variant="outlined"
                required
              />
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="formData.address"
                label="Address"
                prepend-inner-icon="mdi-map-marker"
                variant="outlined"
                rows="2"
                placeholder="Street address, city, postal code"
              />
            </v-col>

            <!-- Business Information Section -->
            <v-col cols="12">
              <div class="d-flex align-center mb-3 mt-4">
                <v-icon icon="mdi-briefcase" color="primary" class="mr-2" />
                <h4>Business Information</h4>
              </div>
            </v-col>

            <v-col cols="12" md="8">
              <v-select
                v-model="formData.categories"
                :items="productCategoryOptions"
                label="Product Categories"
                multiple
                chips
                :rules="categoriesRules"
                prepend-inner-icon="mdi-package-variant"
                variant="outlined"
                required
                closable-chips
              >
                <template #selection="{ item, index }">
                  <v-chip
                    v-if="index < 3"
                    :key="item.value"
                    size="small"
                    closable
                    @click:close="removeCategory(item.value)"
                  >
                    {{ item.title }}
                  </v-chip>
                  <span v-if="index === 3" class="text-grey text-caption align-self-center">
                    (+{{ formData.categories.length - 3 }} others)
                  </span>
                </template>
              </v-select>
            </v-col>

            <v-col cols="12" md="4">
              <v-select
                v-model="formData.reliability"
                :items="reliabilityOptions"
                label="Reliability Rating"
                :rules="requiredRules"
                prepend-inner-icon="mdi-star"
                variant="outlined"
                required
              >
                <template #item="{ props: itemProps, item }">
                  <v-list-item v-bind="itemProps">
                    <template #prepend>
                      <v-rating
                        :model-value="getReliabilityRating(item.value)"
                        readonly
                        size="x-small"
                        color="warning"
                        density="compact"
                        class="mr-2"
                      />
                    </template>
                  </v-list-item>
                </template>
              </v-select>
            </v-col>

            <!-- Additional Settings Section -->
            <v-col cols="12">
              <div class="d-flex align-center mb-3 mt-4">
                <v-icon icon="mdi-cog" color="primary" class="mr-2" />
                <h4>Additional Settings</h4>
              </div>
            </v-col>

            <v-col cols="12" md="8">
              <v-textarea
                v-model="formData.notes"
                label="Notes (optional)"
                prepend-inner-icon="mdi-note-text"
                variant="outlined"
                rows="3"
                placeholder="Additional notes about this supplier, special instructions, delivery preferences, etc."
              />
            </v-col>

            <v-col cols="12" md="4">
              <div class="d-flex flex-column gap-4">
                <v-switch
                  v-model="formData.isActive"
                  label="Active Supplier"
                  color="success"
                  hide-details
                />
                <div class="text-caption text-medium-emphasis">
                  Only active suppliers can receive new orders and appear in order assistant
                </div>

                <!-- Preview Card -->
                <v-card variant="outlined" class="mt-2">
                  <v-card-text class="pa-3">
                    <div class="text-subtitle-2 mb-2">Preview</div>
                    <div class="d-flex align-center">
                      <div class="supplier-icon mr-2">
                        {{ getSupplierIcon(formData.type) }}
                      </div>
                      <div>
                        <div class="font-weight-medium">
                          {{ formData.name || 'Supplier Name' }}
                        </div>
                        <div class="text-caption text-medium-emphasis">
                          {{ getSupplierTypeName(formData.type) }}
                        </div>
                      </div>
                    </div>
                    <div class="mt-2">
                      <v-chip
                        :color="getReliabilityColor(formData.reliability)"
                        size="x-small"
                        variant="flat"
                      >
                        {{ getReliabilityName(formData.reliability) }}
                      </v-chip>
                      <v-chip
                        :color="formData.isActive ? 'success' : 'error'"
                        size="x-small"
                        variant="flat"
                        class="ml-1"
                      >
                        {{ formData.isActive ? 'Active' : 'Inactive' }}
                      </v-chip>
                    </div>
                  </v-card-text>
                </v-card>
              </div>
            </v-col>
          </v-row>

          <!-- Summary Card -->
          <v-card v-if="hasFormData" variant="tonal" color="info" class="mt-4">
            <v-card-text>
              <div class="text-subtitle-1 font-weight-medium mb-2">
                <v-icon icon="mdi-information" class="mr-2" />
                Supplier Summary
              </div>
              <v-row>
                <v-col cols="12" md="3">
                  <div class="text-caption text-medium-emphasis">Categories</div>
                  <div>{{ formData.categories.length }} selected</div>
                </v-col>
                <v-col cols="12" md="3">
                  <div class="text-caption text-medium-emphasis">Payment Terms</div>
                  <div>{{ getPaymentTermsName(formData.paymentTerms) }}</div>
                </v-col>
                <v-col cols="12" md="3">
                  <div class="text-caption text-medium-emphasis">Reliability</div>
                  <div class="d-flex align-center">
                    {{ getReliabilityName(formData.reliability) }}
                    <v-rating
                      :model-value="getReliabilityRating(formData.reliability)"
                      readonly
                      size="x-small"
                      color="warning"
                      class="ml-1"
                      density="compact"
                    />
                  </div>
                </v-col>
                <v-col cols="12" md="3">
                  <div class="text-caption text-medium-emphasis">Status</div>
                  <div>{{ formData.isActive ? 'Active' : 'Inactive' }}</div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-form>
      </v-card-text>

      <v-divider />

      <v-card-actions class="pa-4">
        <v-spacer />
        <v-btn variant="outlined" @click="handleClose">Cancel</v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :loading="loading"
          :disabled="!isFormValid || !hasRequiredFields"
          @click="handleSave"
        >
          {{ existingSupplier ? 'Update' : 'Create' }} Supplier
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSupplierStore } from '@/stores/supplier'
import {
  getSupplierIcon,
  getSupplierTypeName,
  getPaymentTermsName,
  getReliabilityName,
  getReliabilityColor,
  validateSupplierData,
  SUPPLIER_TYPES,
  PAYMENT_TERMS,
  RELIABILITY_LEVELS,
  PRODUCT_CATEGORIES
} from '@/stores/supplier'
import type { Supplier, CreateSupplierData } from '@/stores/supplier'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'SupplierDialog'

// Props
interface Props {
  modelValue: boolean
  existingSupplier?: Supplier | null
}

const props = withDefaults(defineProps<Props>(), {
  existingSupplier: null
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [message: string]
  error: [message: string]
}>()

// Store
const supplierStore = useSupplierStore()

// State
const form = ref()
const isFormValid = ref(false)
const loading = ref(false)

const formData = ref<CreateSupplierData>({
  name: '',
  type: 'local',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  products: [],
  categories: [],
  paymentTerms: 'on_delivery',
  reliability: 'good',
  isActive: true,
  notes: ''
})

// Options
const supplierTypeOptions = Object.entries(SUPPLIER_TYPES).map(([value, title]) => ({
  title,
  value
}))

const paymentTermsOptions = Object.entries(PAYMENT_TERMS).map(([value, title]) => ({
  title,
  value
}))

const reliabilityOptions = Object.entries(RELIABILITY_LEVELS).map(([value, title]) => ({
  title,
  value
}))

const productCategoryOptions = Object.entries(PRODUCT_CATEGORIES).map(([value, title]) => ({
  title,
  value
}))

// Validation Rules
const nameRules = [
  (v: string) => !!v || 'Supplier name is required',
  (v: string) => v.length >= 2 || 'Name must be at least 2 characters',
  (v: string) => v.length <= 100 || 'Name must be less than 100 characters'
]

const requiredRules = [(v: any) => !!v || 'This field is required']

const emailRules = [(v: string) => !v || /.+@.+\..+/.test(v) || 'Email must be valid']

const phoneRules = [
  (v: string) => !v || v.length >= 10 || 'Phone number must be at least 10 characters'
]

const categoriesRules = [(v: string[]) => v.length > 0 || 'Select at least one product category']

// Computed
const hasFormData = computed(
  () => formData.value.name.length > 0 && formData.value.categories.length > 0
)

const hasRequiredFields = computed(
  () =>
    formData.value.name &&
    formData.value.type &&
    formData.value.paymentTerms &&
    formData.value.reliability &&
    formData.value.categories.length > 0
)

// Methods
function getReliabilityRating(reliability: string): number {
  const ratings = {
    excellent: 5,
    good: 4,
    average: 3,
    poor: 2
  }
  return ratings[reliability as keyof typeof ratings] || 0
}

function removeCategory(category: string) {
  const index = formData.value.categories.indexOf(category)
  if (index > -1) {
    formData.value.categories.splice(index, 1)
  }
}

function loadExistingSupplier() {
  if (props.existingSupplier) {
    DebugUtils.info(MODULE_NAME, 'Loading existing supplier', {
      supplierId: props.existingSupplier.id,
      name: props.existingSupplier.name
    })

    formData.value = {
      name: props.existingSupplier.name,
      type: props.existingSupplier.type,
      contactPerson: props.existingSupplier.contactPerson || '',
      phone: props.existingSupplier.phone || '',
      email: props.existingSupplier.email || '',
      address: props.existingSupplier.address || '',
      products: [...props.existingSupplier.products],
      categories: [...props.existingSupplier.categories],
      paymentTerms: props.existingSupplier.paymentTerms,
      reliability: props.existingSupplier.reliability,
      isActive: props.existingSupplier.isActive,
      notes: props.existingSupplier.notes || ''
    }
  }
}

function resetForm() {
  DebugUtils.info(MODULE_NAME, 'Resetting form')

  formData.value = {
    name: '',
    type: 'local',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    products: [],
    categories: [],
    paymentTerms: 'on_delivery',
    reliability: 'good',
    isActive: true,
    notes: ''
  }

  if (form.value) {
    form.value.resetValidation()
  }
}

async function handleSave() {
  if (!isFormValid.value || !hasRequiredFields.value) {
    DebugUtils.warn(MODULE_NAME, 'Form validation failed')
    return
  }

  // Additional validation
  const validationErrors = validateSupplierData(formData.value)
  if (validationErrors.length > 0) {
    DebugUtils.error(MODULE_NAME, 'Validation errors', { errors: validationErrors })
    emit('error', `Validation failed: ${validationErrors.join(', ')}`)
    return
  }

  try {
    loading.value = true

    DebugUtils.info(MODULE_NAME, 'Saving supplier', {
      isEdit: !!props.existingSupplier,
      data: formData.value
    })

    if (props.existingSupplier) {
      await supplierStore.updateSupplier(props.existingSupplier.id, formData.value)
      emit('success', `Supplier "${formData.value.name}" updated successfully`)

      DebugUtils.info(MODULE_NAME, 'Supplier updated successfully', {
        supplierId: props.existingSupplier.id,
        name: formData.value.name
      })
    } else {
      const supplier = await supplierStore.createSupplier(formData.value)
      emit('success', `Supplier "${formData.value.name}" created successfully`)

      DebugUtils.info(MODULE_NAME, 'Supplier created successfully', {
        supplierId: supplier.id,
        name: supplier.name
      })
    }

    handleClose()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save supplier'
    DebugUtils.error(MODULE_NAME, 'Failed to save supplier', { error })
    emit('error', message)
  } finally {
    loading.value = false
  }
}

function handleClose() {
  DebugUtils.info(MODULE_NAME, 'Closing dialog')
  resetForm()
  emit('update:modelValue', false)
}

// Watch for dialog open
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      DebugUtils.info(MODULE_NAME, 'Dialog opened', {
        isEdit: !!props.existingSupplier,
        supplierId: props.existingSupplier?.id
      })

      if (props.existingSupplier) {
        loadExistingSupplier()
      } else {
        resetForm()
      }
    }
  }
)

// Watch for existing supplier changes
watch(
  () => props.existingSupplier,
  newSupplier => {
    if (newSupplier && props.modelValue) {
      loadExistingSupplier()
    }
  }
)
</script>

<style lang="scss" scoped>
.supplier-icon {
  font-size: 20px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 6px;
}

:deep(.v-field__input) {
  --v-field-padding-start: 16px;
}

:deep(.v-selection-control) {
  justify-content: flex-start;
}
</style>
