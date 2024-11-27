// src/components/accounts/dialogs/CorrectionDialog.vue
<template>
  <base-dialog
    v-model="dialogModel"
    title="Корректировка баланса"
    :loading="loading"
    :disabled="!isFormValid"
    @confirm="handleSubmit"
  >
    <v-form ref="form" v-model="formState.isValid" @submit.prevent>
      <v-text-field disabled :model-value="currentBalance" label="Текущий баланс" />

      <v-text-field
        v-model.number="formData.newBalance"
        label="Новый баланс"
        type="number"
        :rules="[v => v !== undefined || 'Обязательное поле']"
        required
      />

      <div class="correction-amount">
        <span class="text-subtitle-1">Сумма корректировки:</span>
        <span :class="correctionAmountClass">
          {{ formatAmount(correctionAmount) }}
        </span>
      </div>

      <v-textarea
        v-model="formData.description"
        label="Причина корректировки"
        rows="3"
        :rules="[v => !!v || 'Обязательное поле']"
        required
      />
    </v-form>
  </base-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import { useAccountStore } from '@/stores/account.store'
import { useUserStore } from '@/stores/user.store'
import { useDialogForm } from '@/composables/useDialogForm'
import type { Account } from '@/types/account'

const props = defineProps<{
  modelValue: boolean
  account: Account
}>()

const emit = defineEmits<{
  'update:model-value': [value: boolean]
  success: []
}>()

// Stores
const accountStore = useAccountStore()
const userStore = useUserStore()

// Computed
const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:model-value', value)
})

const currentBalance = props.account.balance

const correctionAmount = computed(() => {
  return formData.value.newBalance - currentBalance
})

const correctionAmountClass = computed(() => {
  return {
    'text-success': correctionAmount.value > 0,
    'text-error': correctionAmount.value < 0
  }
})

// Form
const { form, loading, formState, formData, isFormValid, handleSubmit } = useDialogForm({
  moduleName: 'CorrectionDialog',
  initialData: {
    accountId: props.account.id,
    newBalance: props.account.balance,
    description: ''
  },
  onSubmit: async data => {
    try {
      await accountStore.correctBalance({
        accountId: data.accountId,
        amount: correctionAmount.value,
        description: data.description,
        performedBy: {
          type: 'user',
          id: userStore.userId,
          name: userStore.userName
        }
      })
      emit('success')
    } catch (error) {
      console.error('Failed to correct balance:', error)
      throw error
    }
  }
})

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'IDR',
    signDisplay: 'always'
  }).format(amount)
}
</script>

<style lang="scss" scoped>
.correction-amount {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.text-success {
  color: rgb(var(--v-theme-success));
}

.text-error {
  color: rgb(var(--v-theme-error));
}
</style>
