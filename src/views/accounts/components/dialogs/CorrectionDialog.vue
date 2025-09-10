<template>
  <base-dialog
    v-model="dialogModel"
    title="Корректировка баланса"
    :loading="loading"
    :disabled="!isFormValid"
    cancel-text="Отмена"
    confirm-text="Применить"
    @cancel="handleCancel"
    @confirm="handleSubmit"
  >
    <template #default>
      <v-form ref="form" v-model="formState.isValid" @submit.prevent="handleSubmit">
        <!-- Account info -->
        <v-card variant="outlined" class="mb-4">
          <v-card-text>
            <div class="account-info">
              <h4>{{ account.name }}</h4>
              <div class="current-balance">
                Текущий баланс:
                <strong>{{ formatIDR(currentBalance) }}</strong>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- New balance input -->
        <v-text-field
          v-model.number="formData.newBalance"
          label="Новый баланс"
          type="number"
          :rules="[v => (v !== null && v !== undefined && !isNaN(v)) || 'Обязательное поле']"
          required
          class="mb-4"
          hide-details="auto"
        />

        <!-- Correction amount display -->
        <v-card variant="outlined" class="correction-amount mb-4">
          <v-card-text>
            <div class="correction-info">
              <span>Сумма корректировки:</span>
              <span :class="correctionAmountClass">
                {{ formatIDR(correctionAmount) }}
              </span>
            </div>
          </v-card-text>
        </v-card>

        <!-- Description -->
        <v-textarea
          v-model="formData.description"
          label="Причина корректировки"
          :rules="[v => !!v || 'Обязательное поле']"
          required
          rows="3"
          class="mb-4"
          hide-details="auto"
        />
      </v-form>
    </template>
  </base-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseDialog from '@/components/base/BaseDialog.vue'
import { useAccountStore } from '@/stores/account'
import { useAuthStore } from '@/stores/auth'
import { useDialogForm } from '@/composables/useDialogForm'
import type { Account } from '@/stores/account'

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
const authStore = useAuthStore()

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
    'text-error': correctionAmount.value < 0,
    'text-medium-emphasis': correctionAmount.value === 0
  }
})

// Form
const { form, loading, formState, formData, isFormValid, handleSubmit, handleCancel } =
  useDialogForm({
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
          amount: data.newBalance, // передаем новый баланс
          description: data.description,
          performedBy: {
            type: 'user',
            id: authStore.userId,
            name: authStore.userName
          }
        })
        emit('success')
      } catch (error) {
        console.error('Failed to correct balance:', error)
        throw error
      }
    }
  })

function formatIDR(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'IDR',
    signDisplay: 'always'
  }).format(amount)
}
</script>

<style lang="scss" scoped>
.account-info {
  h4 {
    margin: 0 0 8px 0;
  }

  .current-balance {
    color: rgb(var(--v-theme-on-surface-variant));
  }
}

.correction-amount {
  .correction-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 500;
  }
}

.text-success {
  color: rgb(var(--v-theme-success));
}

.text-error {
  color: rgb(var(--v-theme-error));
}

.text-medium-emphasis {
  color: rgb(var(--v-theme-on-surface-variant));
}
</style>
