<template>
  <div class="account-list-view">
    <account-list-toolbar
      @create-account="showAccountDialog"
      @create-operation="showOperationDialog"
    />
    <account-list
      :accounts="store.state.accounts"
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

    <!-- Operation Dialog -->
    <operation-dialog
      v-if="dialogs.operation"
      v-model="dialogs.operation"
      :type="operationType"
      :account="selectedAccount"
      @success="handleOperationSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountStore } from '@/stores/account'
import { useAuthStore } from '@/stores/auth.store'
import type { Account, OperationType } from '@/stores/account'

// ✅ ИСПРАВЛЕНО: Импорты реальных компонентов
import AccountList from './components/list/AccountList.vue'
import AccountListToolbar from './components/list/AccountListToolbar.vue'
import AccountDialog from './components/dialogs/AccountDialog.vue'
import OperationDialog from './components/dialogs/OperationDialog.vue'
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

function handleOperationSuccess() {
  dialogs.value.operation = false
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

<style lang="scss" scoped>
.account-list-view {
  .account-toolbar {
    border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
  }

  .account-list {
    padding: 16px;

    .loading,
    .no-accounts {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      text-align: center;
    }

    .account-card {
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
    }
  }
}

.text-success {
  color: rgb(var(--v-theme-success));
}

.text-error {
  color: rgb(var(--v-theme-error));
}
</style>
