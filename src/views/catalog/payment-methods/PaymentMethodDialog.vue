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
import { computed } from 'vue'
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

const initialData = computed(() => ({
  name: '',
  type: 'cash' as PaymentType,
  accountId: '',
  requiresDetails: false,
  isActive: true,
  isPosСashRegister: false,
  ...props.method
}))

const { form, loading, formState, formData, isFormValid, handleSubmit, handleCancel } =
  useDialogForm({
    moduleName: MODULE_NAME,
    initialData: initialData.value,
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
</script>
