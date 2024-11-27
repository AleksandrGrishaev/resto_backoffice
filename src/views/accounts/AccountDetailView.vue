// src/views/accounts/AccountDetailView.vue
<template>
  <div class="account-detail-view">
    <div class="account-header">
      <v-btn icon="mdi-arrow-left" variant="text" @click="router.back()" />

      <div class="account-info">
        <div class="d-flex align-center gap-4">
          <h2 class="text-h5">{{ account?.name }}</h2>
          <v-chip :color="account?.isActive ? 'success' : 'warning'" size="small">
            {{ account?.isActive ? 'Активен' : 'Неактивен' }}
          </v-chip>
        </div>
        <div class="account-balance">
          <span class="text-h4">{{ formatAmount(account?.balance || 0) }}</span>
          <v-btn
            v-if="canCorrect"
            color="primary"
            variant="outlined"
            size="small"
            prepend-icon="mdi-cash-sync"
            @click="showCorrectionDialog"
          >
            Корректировать
          </v-btn>
        </div>
      </div>

      <div class="account-actions">
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showOperationDialog('income')">
          Приход
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-minus" @click="showOperationDialog('expense')">
          Расход
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-bank-transfer" @click="showTransferDialog">
          Перевод
        </v-btn>
      </div>
    </div>

    <div class="operations-section">
      <v-card>
        <v-card-title class="d-flex align-center py-3 px-4">
          <span class="text-h6">История операций</span>
          <v-spacer />
          <account-operations-filter v-model="filters" @update:model-value="handleFiltersChange" />
        </v-card-title>

        <v-card-text class="pa-0">
          <account-operations
            :operations="filteredOperations"
            :loading="loading"
            @edit="handleEditOperation"
          />
        </v-card-text>
      </v-card>
    </div>

    <!-- Диалоги -->
    <operation-dialog
      v-model="dialogs.operation"
      :type="operationType"
      :account="account"
      @success="handleOperationSuccess"
    />

    <transfer-dialog
      v-model="dialogs.transfer"
      :account="account"
      @success="handleOperationSuccess"
    />

    <correction-dialog
      v-model="dialogs.correction"
      :account="account"
      @success="handleOperationSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAccountStore } from '@/stores/account.store'
import { useUserStore } from '@/stores/user.store'
import AccountOperations from '@/components/accounts/detail/AccountOperations.vue'
import AccountOperationsFilter from '@/components/accounts/detail/AccountOperationsFilter.vue'
import OperationDialog from '@/components/accounts/dialogs/OperationDialog.vue'
import TransferDialog from '@/components/accounts/dialogs/TransferDialog.vue'
import CorrectionDialog from '@/components/accounts/dialogs/CorrectionDialog.vue'
import type { OperationType } from '@/types/transaction'

const route = useRoute()
const router = useRouter()
const accountStore = useAccountStore()
const userStore = useUserStore()

// State
const loading = ref(false)
const operationType = ref<OperationType>('income')
const dialogs = ref({
  operation: false,
  transfer: false,
  correction: false
})
const filters = ref({
  dateFrom: null,
  dateTo: null,
  type: null
})

// Computed
const accountId = computed(() => route.params.id as string)
const account = computed(() => accountStore.getAccountById(accountId.value))
const canCorrect = computed(() => userStore.isAdmin)

const filteredOperations = computed(() => {
  // Реализовать фильтрацию операций
  return accountStore.getAccountOperations(accountId.value)
})

// Methods
function showOperationDialog(type: OperationType) {
  operationType.value = type
  dialogs.value.operation = true
}

function showTransferDialog() {
  dialogs.value.transfer = true
}

function showCorrectionDialog() {
  dialogs.value.correction = true
}

function handleOperationSuccess() {
  Object.keys(dialogs.value).forEach(key => {
    dialogs.value[key as keyof typeof dialogs.value] = false
  })
  fetchData()
}

function handleEditOperation(_operationId: string) {
  // Реализовать редактирование операции
  // TODO: Реализовать редактирование операции
}

function handleFiltersChange() {
  fetchData()
}

async function fetchData() {
  loading.value = true
  try {
    await accountStore.fetchAccountWithOperations(accountId.value)
  } catch (error) {
    console.error('Failed to fetch account data:', error)
  } finally {
    loading.value = false
  }
}

// Initialize
onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.account-detail-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px;
}

.account-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--color-surface);
  padding: 16px;
  border-radius: 8px;
}

.account-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.account-balance {
  display: flex;
  align-items: center;
  gap: 16px;
}

.account-actions {
  display: flex;
  gap: 8px;
}

.operations-section {
  flex: 1;
  min-height: 0;
}

.gap-4 {
  gap: 16px;
}
</style>
