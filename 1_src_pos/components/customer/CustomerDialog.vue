<template>
  <base-dialog
    :model-value="modelValue"
    :title="customer ? 'Edit Customer' : 'New Customer'"
    :loading="loading"
    :disabled="!formState.isValid"
    @update:model-value="$emit('update:modelValue', $event)"
    @confirm="handleSubmit"
    @cancel="handleCancel"
  >
    <v-form ref="form" v-model="formState.isValid" @submit.prevent="handleSubmit">
      <v-row>
        <!-- First Name -->
        <v-col cols="12" md="6">
          <v-text-field
            v-model="formData.firstName"
            label="First Name"
            :rules="[rules.required]"
            variant="outlined"
            hide-details="auto"
          />
        </v-col>

        <!-- Last Name -->
        <v-col cols="12" md="6">
          <v-text-field
            v-model="formData.lastName"
            label="Last Name"
            :rules="[rules.required]"
            variant="outlined"
            hide-details="auto"
          />
        </v-col>

        <!-- Phone -->
        <v-col cols="12" md="6">
          <v-text-field
            v-model="formData.phone"
            label="Phone"
            :rules="[rules.phone]"
            variant="outlined"
            hide-details="auto"
          />
        </v-col>

        <!-- Email -->
        <v-col cols="12" md="6">
          <v-text-field
            v-model="formData.email"
            label="Email"
            :rules="[rules.email]"
            variant="outlined"
            hide-details="auto"
          />
        </v-col>

        <!-- Discount Program -->
        <v-col cols="12">
          <v-select
            v-model="formData.status"
            label="Status"
            :items="['active', 'inactive', 'blacklisted']"
            variant="outlined"
            :rules="[rules.required]"
            hide-details="auto"
          />
        </v-col>

        <!-- Notes -->
        <v-col cols="12">
          <v-textarea
            v-model="formData.notes"
            label="Notes"
            variant="outlined"
            rows="3"
            hide-details="auto"
          />
        </v-col>
      </v-row>
    </v-form>
  </base-dialog>
</template>

<script setup lang="ts">
import { useDialogForm } from '@/composables/useDialogForm'
import type { Customer, CustomerBageStatus } from '@/types/customer'
import { DebugUtils } from '@/utils'
import BaseDialog from '@/components/base/BaseDialog.vue'

const MODULE_NAME = 'CustomerDialog'

// Props

const props = defineProps<{
  modelValue: boolean
  customer?: Customer
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  created: [customer: Customer]
  updated: [customer: Customer]
}>()

// Validation rules
const rules = {
  required: (v: string) => !!v || 'Field is required',
  email: (v: string) => {
    if (!v) return true
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return pattern.test(v) || 'Invalid email format'
  },
  phone: (v: string) => {
    if (!v) return true
    const pattern = /^\+?[\d-]{10,}$/
    return pattern.test(v) || 'Invalid phone format'
  }
}

// Form
interface CustomerFormData {
  firstName: string
  lastName: string
  phone: string
  email: string
  notes: string
  status: CustomerBageStatus
}

const initialData: CustomerFormData = {
  firstName: props.customer?.firstName || '',
  lastName: props.customer?.lastName || '',
  phone: props.customer?.phone || '',
  email: props.customer?.email || '',
  notes: props.customer?.notes || '',
  status: props.customer?.status || 'active'
}

const { form, loading, formData, formState, handleSubmit } = useDialogForm<CustomerFormData>({
  moduleName: MODULE_NAME,
  initialData,
  validateForm: data => {
    if (!data.firstName || !data.lastName) {
      return 'Name is required'
    }
    return true
  },
  onSubmit: async data => {
    DebugUtils.debug(MODULE_NAME, 'Submitting customer data', data)

    try {
      const customerData: Customer = {
        id: props.customer?.id || `cust_${Date.now()}`,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        email: data.email || undefined,
        notes: data.notes || undefined,
        status: data.status,
        registrationDate: props.customer?.registrationDate || new Date().toISOString(),
        lastVisitDate: props.customer?.lastVisitDate || new Date().toISOString(),
        createdAt: props.customer?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      if (props.customer) {
        // Update existing customer
        emit('updated', customerData)
      } else {
        // Create new customer
        emit('created', customerData)
      }

      emit('update:modelValue', false)
    } catch (error) {
      DebugUtils.error(MODULE_NAME, 'Failed to save customer', error)
      throw error
    }
  }
})

// Определяем handleCancel отдельно от useDialogForm
function handleCancel() {
  form.value?.reset()
  formData.value = { ...initialData }
  formState.value = {
    isValid: false,
    isDirty: false,
    error: ''
  }
  emit('update:modelValue', false)
}
</script>
