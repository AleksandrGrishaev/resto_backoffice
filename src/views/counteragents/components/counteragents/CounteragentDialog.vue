<!-- src/views/counteragents/components/counteragents/CounteragentDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    max-width="800"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card class="dialog-card">
      <!-- Dialog Header -->
      <v-card-title class="dialog-header">
        <div class="header-content">
          <div class="title-section">
            <v-icon :icon="mode === 'create' ? 'mdi-plus' : 'mdi-pencil'" class="me-2" />
            {{ mode === 'create' ? 'New Counteragent' : 'Edit Counteragent' }}
          </div>
          <v-btn icon="mdi-close" variant="text" color="white" @click="closeDialog" />
        </div>
      </v-card-title>

      <v-form ref="formRef" v-model="formValid" @submit.prevent="saveCounteragent">
        <v-card-text class="dialog-content">
          <v-row>
            <!-- Basic Information -->
            <v-col cols="12">
              <h3 class="section-title">Basic Information</h3>
            </v-col>

            <v-col cols="12" md="8">
              <v-text-field
                v-model="formData.name"
                label="Company Name *"
                :rules="[rules.required]"
                variant="outlined"
                prepend-inner-icon="mdi-store"
                density="compact"
              />
            </v-col>

            <v-col cols="12" md="4">
              <v-text-field
                v-model="formData.displayName"
                label="Short Name"
                variant="outlined"
                prepend-inner-icon="mdi-tag"
                density="compact"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="formData.type"
                :items="typeOptions"
                label="Type *"
                :rules="[rules.required]"
                variant="outlined"
                prepend-inner-icon="mdi-shape"
                density="compact"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-autocomplete
                v-model="formData.productCategories"
                :items="categoryOptions"
                label="Product Categories"
                variant="outlined"
                multiple
                chips
                closable-chips
                prepend-inner-icon="mdi-package-variant"
                :disabled="formData.type === 'service'"
                density="compact"
              >
                <template #chip="{ props, item }">
                  <v-chip
                    v-bind="props"
                    :prepend-icon="getCategoryIcon(item.raw.value)"
                    size="small"
                  >
                    {{ item.title }}
                  </v-chip>
                </template>
              </v-autocomplete>
            </v-col>

            <!-- Contact Information -->
            <v-col cols="12">
              <v-divider class="my-4" />
              <h3 class="section-title">Contact Information</h3>
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.contactPerson"
                label="Contact Person"
                variant="outlined"
                prepend-inner-icon="mdi-account"
                density="compact"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.phone"
                label="Phone Number"
                :rules="[rules.phone]"
                variant="outlined"
                prepend-inner-icon="mdi-phone"
                type="tel"
                density="compact"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.email"
                label="Email"
                :rules="[rules.email]"
                variant="outlined"
                prepend-inner-icon="mdi-email"
                type="email"
                density="compact"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.website"
                label="Website"
                :rules="[rules.url]"
                variant="outlined"
                prepend-inner-icon="mdi-web"
                type="url"
                density="compact"
              />
            </v-col>

            <v-col cols="12">
              <v-textarea
                v-model="formData.address"
                label="Address"
                variant="outlined"
                prepend-inner-icon="mdi-map-marker"
                rows="2"
                density="compact"
              />
            </v-col>

            <!-- Business Terms -->
            <v-col cols="12">
              <v-divider class="my-4" />
              <h3 class="section-title">Business Terms</h3>
            </v-col>

            <v-col cols="12" md="6">
              <v-select
                v-model="formData.paymentTerms"
                :items="paymentOptions"
                label="Payment Terms *"
                :rules="[rules.required]"
                variant="outlined"
                prepend-inner-icon="mdi-credit-card"
                density="compact"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-text-field
                v-model.number="formData.creditLimit"
                label="Credit Limit (IDR)"
                variant="outlined"
                prepend-inner-icon="mdi-cash"
                type="number"
                min="0"
                density="compact"
              />
            </v-col>

            <!-- Description -->
            <v-col cols="12">
              <v-textarea
                v-model="formData.description"
                label="Description"
                variant="outlined"
                prepend-inner-icon="mdi-text"
                rows="3"
                counter="500"
                :rules="[rules.maxLength(500)]"
                density="compact"
              />
            </v-col>

            <!-- Status & Preferences -->
            <v-col cols="12">
              <v-divider class="my-4" />
              <h3 class="section-title">Status & Preferences</h3>
            </v-col>

            <v-col cols="12" md="6">
              <v-switch
                v-model="formData.isActive"
                label="Active"
                color="success"
                hide-details
                density="compact"
              />
            </v-col>

            <v-col cols="12" md="6">
              <v-switch
                v-model="formData.isPreferred"
                label="Preferred Supplier"
                color="warning"
                hide-details
                density="compact"
              />
            </v-col>

            <!-- Tags -->
            <v-col cols="12">
              <v-combobox
                v-model="formData.tags"
                label="Tags"
                variant="outlined"
                multiple
                chips
                closable-chips
                prepend-inner-icon="mdi-tag-multiple"
                hint="Press Enter to add tags"
                density="compact"
              />
            </v-col>

            <!-- Notes -->
            <v-col cols="12">
              <v-textarea
                v-model="formData.notes"
                label="Notes"
                variant="outlined"
                prepend-inner-icon="mdi-note-text"
                rows="3"
                counter="1000"
                :rules="[rules.maxLength(1000)]"
                density="compact"
              />
            </v-col>
          </v-row>
        </v-card-text>

        <!-- Dialog Actions -->
        <v-card-actions class="dialog-actions">
          <v-spacer />
          <v-btn variant="text" @click="closeDialog">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            type="submit"
            :loading="loading"
            :disabled="!formValid"
          >
            {{ mode === 'create' ? 'Create' : 'Update' }}
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { useCounteragentsStore } from '@/stores/counteragents'
import {
  PRODUCT_CATEGORY_LABELS,
  PAYMENT_TERMS_LABELS,
  COUNTERAGENT_TYPE_LABELS,
  DEFAULT_COUNTERAGENT_DATA,
  validateEmail,
  validatePhone
} from '@/stores/counteragents'
import type { Counteragent, CreateCounteragentData } from '@/stores/counteragents'

// Props & Emits
interface Props {
  modelValue: boolean
  counteragent?: Counteragent
  mode: 'create' | 'edit'
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'create'
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  saved: [counteragent: Counteragent]
}>()

const store = useCounteragentsStore()

// Form state
const formRef = ref()
const formValid = ref(false)
const loading = ref(false)

// Form data
const formData = reactive<CreateCounteragentData>({
  name: '',
  displayName: '',
  type: 'supplier',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  website: '',
  productCategories: [],
  description: '',
  paymentTerms: 'on_delivery',
  isActive: true,
  isPreferred: false,
  tags: [],
  notes: '',
  creditLimit: 0
})

// Form options
const typeOptions = Object.entries(COUNTERAGENT_TYPE_LABELS).map(([value, title]) => ({
  title,
  value
}))

const categoryOptions = Object.entries(PRODUCT_CATEGORY_LABELS).map(([value, title]) => ({
  title,
  value
}))

const paymentOptions = Object.entries(PAYMENT_TERMS_LABELS).map(([value, title]) => ({
  title,
  value
}))

// Validation rules
const rules = {
  required: (value: any) => !!value || 'This field is required',
  email: (value: string) => !value || validateEmail(value) || 'Enter a valid email',
  phone: (value: string) => !value || validatePhone(value) || 'Enter a valid phone number',
  url: (value: string) => {
    if (!value) return true
    try {
      new URL(value.startsWith('http') ? value : `https://${value}`)
      return true
    } catch {
      return 'Enter a valid URL'
    }
  },
  maxLength: (max: number) => (value: string) =>
    !value || value.length <= max || `Maximum ${max} characters allowed`
}

// Methods
const resetForm = () => {
  Object.assign(formData, {
    ...DEFAULT_COUNTERAGENT_DATA,
    name: '',
    displayName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    website: '',
    description: '',
    tags: [],
    notes: '',
    creditLimit: 0
  })
}

const loadCounteragent = (counteragent: Counteragent) => {
  Object.assign(formData, {
    name: counteragent.name,
    displayName: counteragent.displayName || '',
    type: counteragent.type,
    contactPerson: counteragent.contactPerson || '',
    phone: counteragent.phone || '',
    email: counteragent.email || '',
    address: counteragent.address || '',
    website: counteragent.website || '',
    productCategories: [...counteragent.productCategories],
    description: counteragent.description || '',
    paymentTerms: counteragent.paymentTerms,
    isActive: counteragent.isActive,
    isPreferred: counteragent.isPreferred,
    tags: [...(counteragent.tags || [])],
    notes: counteragent.notes || '',
    creditLimit: counteragent.creditLimit || 0
  })
}

const saveCounteragent = async () => {
  if (!formValid.value) return

  loading.value = true
  try {
    let result: Counteragent | null = null

    if (props.mode === 'create') {
      result = await store.createCounteragent(formData)
    } else if (props.counteragent) {
      const success = await store.updateCounteragent(props.counteragent.id, formData)
      if (success) {
        result = store.getCounteragentById(props.counteragent.id)
      }
    }

    if (result) {
      emit('saved', result)
      closeDialog()
    }
  } catch (error) {
    console.error('Failed to save counteragent:', error)
  } finally {
    loading.value = false
  }
}

const closeDialog = () => {
  emit('update:modelValue', false)
  setTimeout(() => {
    resetForm()
    formRef.value?.resetValidation()
  }, 300)
}

const getCategoryIcon = (category: string): string => {
  const icons: Record<string, string> = {
    meat: 'mdi-food-steak',
    vegetables: 'mdi-carrot',
    dairy: 'mdi-cow',
    beverages: 'mdi-bottle-soda',
    spices: 'mdi-shaker',
    equipment: 'mdi-tools',
    cleaning: 'mdi-spray-bottle',
    other: 'mdi-package-variant'
  }
  return icons[category] || 'mdi-circle'
}

// Watch props
watch(
  () => props.modelValue,
  newValue => {
    if (newValue) {
      if (props.mode === 'edit' && props.counteragent) {
        loadCounteragent(props.counteragent)
      } else {
        resetForm()
      }
    }
  }
)

// Watch type changes to clear categories for services
watch(
  () => formData.type,
  newType => {
    if (newType === 'service') {
      formData.productCategories = []
    }
  }
)
</script>

<style scoped>
.dialog-card {
  border: 1px solid #333;
  background-color: rgb(var(--v-theme-surface));
}

.dialog-header {
  background: #000;
  color: white;
  padding: 16px 20px;
  border-bottom: 1px solid #333;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.title-section {
  display: flex;
  align-items: center;
  font-weight: 600;
  font-size: 1.1rem;
  color: white;
}

.dialog-content {
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;
}

.section-title {
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

.dialog-actions {
  padding: 16px 20px;
  background-color: #111;
  border-top: 1px solid #333;
}

:deep(.v-field--variant-outlined) {
  --v-field-border-width: 1px;
  --v-field-border-opacity: 1;
}

:deep(.v-field--variant-outlined .v-field__outline) {
  color: #333;
}

:deep(.v-field--focused .v-field__outline) {
  color: #1976d2 !important;
}

:deep(.v-input--density-compact .v-field--variant-outlined .v-field__input) {
  min-height: 40px;
  padding-top: 8px;
  padding-bottom: 8px;
}

:deep(.v-textarea .v-field__input) {
  min-height: auto;
}

:deep(.v-switch .v-selection-control__wrapper) {
  height: 32px;
}
</style>
