<template>
  <div class="account-list-view">
    <account-list-toolbar
      @create-account="showAccountDialog"
      @create-operation="showOperationDialog"
    />
    <account-list
      :accounts="store.accounts"
      :loading="loading"
      @edit="handleEdit"
      @view-details="navigateToAccount"
    />

    <!-- Диалоги -->
    <account-dialog
      v-if="dialogs.account"
      v-model="dialogs.account"
      :account="selectedAccount"
      @success="handleAccountSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountStore } from '@/stores/account.store'
import { useAuthStore } from '@/stores/auth.store'
import AccountList from '@/components/accounts/list/AccountList.vue'
import AccountListToolbar from '@/components/accounts/list/AccountListToolbar.vue'
import AccountDialog from '@/components/accounts/dialogs/AccountDialog.vue'
import type { Account } from '@/types/account'
import type { OperationType } from '@/types/transaction'

const router = useRouter()
const store = useAccountStore()
const authStore = useAuthStore()

// State
const loading = ref(true)
const dialogs = ref({
  account: false,
  operation: false
})
const selectedAccount = ref<Account | null>(null)
const operationType = ref<OperationType>('income')

const isAdmin = computed(() => authStore.isAdmin)

// Methods
function showAccountDialog() {
  if (!isAdmin.value) return
  selectedAccount.value = null
  dialogs.value.account = true
}

function showOperationDialog(type: OperationType, account?: Account) {
  operationType.value = type
  selectedAccount.value = account || null
  dialogs.value.operation = true
}

function handleEdit(account: Account) {
  if (!isAdmin.value) return
  selectedAccount.value = account
  dialogs.value.account = true
}

function navigateToAccount(accountId: string) {
  router.push(`/accounts/${accountId}`)
}

function handleAccountSuccess() {
  dialogs.value.account = false
  fetchAccounts()
}

// Data fetching
async function fetchAccounts() {
  loading.value = true
  try {
    await store.fetchAccounts()
  } catch (error) {
    console.error('Failed to fetch accounts:', error)
  } finally {
    loading.value = false
  }
}

// Initialize
onMounted(() => {
  fetchAccounts()
})
</script>
