<template>
  <base-dialog
    :model-value="modelValue"
    :title="method ? 'Edit Payment Method' : 'New Payment Method'"
    :loading="loading"
    :disabled="!isFormValid"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="handleSubmit"
    @cancel="handleCancel"
  >
    <v-form ref="form" v-model="formState.isValid" @submit.prevent>
      <v-text-field
        v-model="formData.name"
        label="Name"
        :rules="[v => !!v || 'Required field']"
        required
        class="mb-4"
      />

      <v-text-field
        v-model="formData.code"
        label="Code"
        :rules="[
          v => !!v || 'Required field',
          v => /^[a-z0-9_]+$/.test(v) || 'Only lowercase letters, numbers, and underscores allowed'
        ]"
        hint="Unique identifier (e.g., 'cash', 'card', 'grab')"
        persistent-hint
        required
        class="mb-4"
      />

      <v-select
        v-model="formData.type"
        label="Type"
        :items="paymentTypes"
        :rules="[v => !!v || 'Required field']"
        hint="Cash = physical cash, Bank = electronic (card/QR/e-wallet)"
        persistent-hint
        required
        class="mb-4"
      />

      <v-select
        v-model="formData.accountId"
        label="Account"
        :items="accountOptions"
        item-title="name"
        item-value="id"
        :rules="[v => !!v || 'Required field']"
        hint="Select the account where payments will be deposited"
        persistent-hint
        required
        class="mb-4"
      >
        <template #selection="{ item }">
          <div class="d-flex align-center">
            <v-icon :color="getAccountColor(item.raw.type)" size="small" class="mr-2">
              {{ getAccountIcon(item.raw.type) }}
            </v-icon>
            <span>{{ item.title }}</span>
          </div>
        </template>
        <template #item="{ item, props: itemProps }">
          <v-list-item v-bind="itemProps">
            <template #prepend>
              <v-icon :color="getAccountColor(item.raw.type)">
                {{ getAccountIcon(item.raw.type) }}
              </v-icon>
            </template>
            <template #subtitle>
              {{ item.raw.type.toUpperCase() }} • {{ formatIDR(item.raw.balance) }}
            </template>
          </v-list-item>
        </template>
      </v-select>

      <v-text-field
        v-model="formData.icon"
        label="Icon (optional)"
        placeholder="mdi-cash, mdi-credit-card, mdi-qrcode, mdi-bank"
        hint="Material Design Icon name (e.g., mdi-bank)"
        persistent-hint
        class="mb-4"
      >
        <template #prepend-inner>
          <v-icon v-if="formData.icon" :color="formData.iconColor || 'primary'">
            {{ formData.icon }}
          </v-icon>
          <v-icon v-else color="grey-lighten-1">mdi-image-outline</v-icon>
        </template>
      </v-text-field>

      <v-select
        v-model="formData.iconColor"
        label="Icon Color (optional)"
        :items="colorOptions"
        clearable
        hint="Color for the icon in POS payment dialog"
        persistent-hint
        class="mb-4"
      >
        <template #selection="{ item }">
          <div class="d-flex align-center">
            <v-icon :color="item.value" size="small" class="mr-2">mdi-circle</v-icon>
            <span>{{ item.title }}</span>
          </div>
        </template>
        <template #item="{ item, props: itemProps }">
          <v-list-item v-bind="itemProps">
            <template #prepend>
              <v-icon :color="item.value">mdi-circle</v-icon>
            </template>
          </v-list-item>
        </template>
      </v-select>

      <v-text-field
        v-model.number="formData.displayOrder"
        label="Display Order"
        type="number"
        min="0"
        hint="Lower numbers appear first in payment dialog (0 = first)"
        persistent-hint
        class="mb-4"
      />

      <v-checkbox
        v-model="formData.isPosСashRegister"
        label="Use as main POS cash register"
        color="primary"
        hint="Only one payment method can be the main cash register"
        persistent-hint
        class="mb-4"
      />

      <v-switch
        v-model="formData.requiresDetails"
        label="Requires details"
        color="primary"
        hide-details
        class="mb-2"
      />

      <v-switch v-model="formData.isActive" label="Active" color="primary" hide-details />
    </v-form>
  </base-dialog>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'
import { useAccountStore } from '@/stores/account'
import type { PaymentMethod, PaymentType } from '@/types/payment'
import { useDialogForm } from '@/composables/useDialogForm'
import { formatIDR } from '@/utils'

const MODULE_NAME = 'PaymentMethodDialog'

const paymentTypes = [
  { title: 'Cash (Physical)', value: 'cash' },
  { title: 'Bank (Electronic)', value: 'bank' }
] as const

const colorOptions = [
  { title: 'Primary (Blue)', value: 'primary' },
  { title: 'Success (Green)', value: 'success' },
  { title: 'Warning (Orange)', value: 'warning' },
  { title: 'Error (Red)', value: 'error' },
  { title: 'Info (Light Blue)', value: 'info' },
  { title: 'Purple', value: 'purple' },
  { title: 'Pink', value: 'pink' },
  { title: 'Teal', value: 'teal' },
  { title: 'Cyan', value: 'cyan' },
  { title: 'Orange', value: 'orange' },
  { title: 'Deep Orange', value: 'deep-orange' },
  { title: 'Brown', value: 'brown' },
  { title: 'Blue Grey', value: 'blue-grey' },
  { title: 'Grey', value: 'grey' }
]

const props = defineProps<{
  modelValue: boolean
  method?: PaymentMethod | null
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  saved: [PaymentMethod]
}>()

const accountStore = useAccountStore()

const accountOptions = computed(() => {
  return accountStore.accounts
    .filter(acc => acc.isActive)
    .map(acc => ({
      name: acc.name,
      id: acc.id,
      type: acc.type,
      balance: acc.balance
    }))
})

function getAccountIcon(type: string): string {
  const icons: Record<string, string> = {
    cash: 'mdi-cash',
    bank: 'mdi-bank',
    card: 'mdi-credit-card',
    gojeck: 'mdi-motorbike',
    grab: 'mdi-car'
  }
  return icons[type] || 'mdi-wallet'
}

function getAccountColor(type: string): string {
  const colors: Record<string, string> = {
    cash: 'success',
    bank: 'primary',
    card: 'info',
    gojeck: 'success',
    grab: 'warning'
  }
  return colors[type] || 'grey'
}

function getDefaultData() {
  return {
    name: '',
    code: '',
    type: 'cash' as PaymentType,
    accountId: '',
    icon: '',
    iconColor: '',
    displayOrder: 0,
    requiresDetails: false,
    isActive: true,
    isPosСashRegister: false
  }
}

const { form, loading, formState, formData, isFormValid, handleSubmit, handleCancel } =
  useDialogForm({
    moduleName: MODULE_NAME,
    initialData: getDefaultData(),
    onSubmit: async data => {
      try {
        const store = usePaymentSettingsStore()
        if (props.method) {
          await store.updatePaymentMethod(props.method.id, data)
        } else {
          await store.createPaymentMethod(data)
        }
        emit('saved', data as PaymentMethod)
        emit('update:modelValue', false)
      } catch (error) {
        console.error(MODULE_NAME, 'Failed to save payment method', error)
      }
    }
  })

// Auto-generate code from name (only for new methods)
watch(
  () => formData.value.name,
  newName => {
    if (!props.method && newName) {
      // Generate code from name: lowercase, replace spaces with underscores, remove special chars
      formData.value.code = newName
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
    }
  }
)

// Watch for dialog open with method data - populate form
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      if (props.method) {
        // Editing existing method - populate form with method data
        formData.value = {
          ...getDefaultData(),
          name: props.method.name,
          code: props.method.code,
          type: props.method.type,
          accountId: props.method.accountId || '',
          icon: props.method.icon || '',
          iconColor: props.method.iconColor || '',
          displayOrder: props.method.displayOrder || 0,
          requiresDetails: props.method.requiresDetails,
          isActive: props.method.isActive,
          isPosСashRegister: props.method.isPosСashRegister
        }
      } else {
        // Creating new - reset to defaults
        formData.value = getDefaultData()
      }
    }
  },
  { immediate: true }
)
</script>
