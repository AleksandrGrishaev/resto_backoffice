<template>
  <base-dialog
    v-model="dialogModel"
    :title="isEdit ? 'Редактировать счет' : 'Создать счет'"
    :loading="loading"
    :disabled="!isFormValid"
    cancel-text="Отмена"
    confirm-text="Сохранить"
    @cancel="handleCancel"
    @confirm="handleSubmit"
  >
    <template #default>
      <v-form ref="form" v-model="formState.isValid" @submit.prevent="handleSubmit">
        <v-text-field
          v-model="formData.name"
          label="Название счета"
          :rules="[v => !!v || 'Обязательное поле']"
          required
          class="mb-4"
          hide-details="auto"
        />

        <v-select
          v-model="formData.type"
          :items="accountTypes"
          label="Тип счета"
          :rules="[v => !!v || 'Обязательное поле']"
          required
          class="mb-4"
          hide-details="auto"
        />

        <v-textarea
          v-model="formData.description"
          label="Описание"
          rows="3"
          class="mb-4"
          hide-details="auto"
        />

        <v-text-field
          v-model.number="formData.balance"
          label="Начальный баланс"
          type="number"
          :rules="balanceRules"
          class="mb-4"
          hide-details="auto"
        />

        <div v-if="isEdit" class="mb-4">
          <v-btn-toggle
            v-model="formData.isActive"
            mandatory
            rounded="lg"
            color="primary"
            class="w-100"
          >
            <v-btn :value="true" class="flex-grow-1">Активен</v-btn>
            <v-btn :value="false" class="flex-grow-1">Неактивен</v-btn>
          </v-btn-toggle>
        </div>
      </v-form>
    </template>
  </base-dialog>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useAccountStore } from '@/stores/account'
import type { Account, AccountType } from '@/stores/account'
import { useDialogForm } from '@/composables/useDialogForm'
import BaseDialog from '@/components/base/BaseDialog.vue'

const MODULE_NAME = 'AccountDialog'

// Props & Emits
interface Props {
  modelValue: boolean
  account?: Account | null
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  account: null
})

const emit = defineEmits<{
  'update:modelValue': [boolean]
  success: []
}>()

// Store
const accountStore = useAccountStore()
const isEdit = computed(() => !!props.account)

// Dialog model
const dialogModel = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value)
})

// Account types
const accountTypes = [
  { title: 'Наличные', value: 'cash' },
  { title: 'Банковский счет', value: 'bank' },
  { title: 'Карта', value: 'card' },
  { title: 'Gojek', value: 'gojeck' },
  { title: 'Grab', value: 'grab' }
] as Array<{ title: string; value: AccountType }>

// Validation rules
const balanceRules = [(v: number) => v >= 0 || 'Баланс не может быть отрицательным']

// Form handling
const { form, loading, formState, formData, isFormValid, handleSubmit, handleCancel, resetForm } =
  useDialogForm({
    moduleName: MODULE_NAME,
    initialData: {
      name: props.account?.name || '',
      type: props.account?.type || ('cash' as AccountType),
      description: props.account?.description || '',
      balance: props.account?.balance || 0,
      isActive: props.account?.isActive ?? true
    },
    onSubmit: async data => {
      try {
        if (isEdit.value && props.account) {
          // Обновление существующего счета
          await accountStore.updateAccount(props.account.id, {
            name: data.name,
            type: data.type,
            description: data.description,
            isActive: data.isActive
          })
        } else {
          // Создание нового счета
          await accountStore.createAccount({
            name: data.name,
            type: data.type,
            description: data.description,
            balance: data.balance,
            isActive: true
          })
        }
        emit('success')
      } catch (error) {
        console.error('Failed to save account:', error)
        throw error
      }
    }
  })

// Watch for account changes
watch(
  () => props.account,
  newAccount => {
    if (newAccount) {
      formData.value = {
        name: newAccount.name,
        type: newAccount.type,
        description: newAccount.description || '',
        balance: newAccount.balance,
        isActive: newAccount.isActive
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

// Watch dialog state to reset form when closed
watch(
  () => props.modelValue,
  isOpen => {
    if (!isOpen) {
      setTimeout(resetForm, 300) // Reset after dialog close animation
    }
  }
)
</script>

<style lang="scss" scoped>
.w-100 {
  width: 100%;
}

.flex-grow-1 {
  flex-grow: 1;
}
</style>
