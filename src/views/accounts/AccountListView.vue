// src/views/accounts/AccountListView.vue
<template>
  <div class="account-list-view">
    <account-list-toolbar @create-operation="showOperationDialog" />
    <account-list
      :accounts="store.accounts"
      :loading="store.isLoading"
      @edit="handleEdit"
      @view-details="navigateToAccount"
    />

    <!-- Диалоги операций -->
    <operation-dialog
      v-model="dialogs.operation"
      :type="operationType"
      :account="selectedAccount"
      @success="handleOperationSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountStore } from '@/stores/account.store'
import AccountList from '@/components/accounts/list/AccountList.vue'
import AccountListToolbar from '@/components/accounts/list/AccountListToolbar.vue'
import OperationDialog from '@/components/accounts/dialogs/OperationDialog.vue'
import type { Account } from '@/types/account'
import type { OperationType } from '@/types/transaction'

const router = useRouter()
const store = useAccountStore()

// Состояние
const dialogs = ref({
  operation: false
})
const selectedAccount = ref<Account | null>(null)
const operationType = ref<OperationType>('income')

// Методы
function showOperationDialog(type: OperationType, account?: Account) {
  operationType.value = type
  selectedAccount.value = account || null
  dialogs.value.operation = true
}

function handleEdit(_account: Account) {
  // Добавляем префикс underscore к неиспользуемому параметру
  // TODO: Реализовать редактирование счета
}

function navigateToAccount(accountId: string) {
  router.push(`/accounts/${accountId}`)
}

function handleOperationSuccess() {
  dialogs.value.operation = false
  store.fetchAccounts() // Обновляем список счетов
}

// Инициализация
onMounted(async () => {
  await store.fetchAccounts()
})
</script>

<style lang="scss" scoped>
.account-list-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}
</style>
