<!-- src/views/pos/shifts/components/ShiftTransfersList.vue -->
<template>
  <div class="transfers-section">
    <!-- Header -->
    <div class="section-header bg-info">
      <v-icon icon="mdi-bank-transfer-in" color="white" class="me-3" />
      <span class="text-white text-h6">Incoming Transfers</span>
      <v-spacer />
      <v-chip color="white" variant="flat" size="small">{{ transfers.length }} transfers</v-chip>
    </div>

    <!-- Empty state -->
    <div v-if="transfers.length === 0" class="empty-state">
      <v-icon icon="mdi-bank-transfer" size="48" color="grey-darken-1" />
      <div class="text-body-1 mt-3 text-grey">No transfers yet</div>
      <div class="text-caption text-grey-darken-1">Incoming transfers will appear here</div>
    </div>

    <!-- Transfers list -->
    <div v-else class="transfers-list">
      <div
        v-for="transfer in sortedTransfers"
        :key="transfer.id"
        class="transfer-item"
        :class="{ 'transfer-processed': getTransferStatus(transfer.id) !== 'pending' }"
      >
        <!-- Icon -->
        <div class="transfer-icon">
          <v-icon
            :icon="getStatusIcon(transfer.id)"
            :color="getStatusColor(transfer.id)"
            size="32"
          />
        </div>

        <!-- Content -->
        <div class="transfer-content">
          <div class="transfer-header">
            <span class="transfer-title">
              Transfer from {{ getAccountName(transfer.transferDetails?.fromAccountId) }}
            </span>
            <v-chip size="x-small" :color="getStatusColor(transfer.id)" variant="flat" class="ml-2">
              {{ getTransferStatus(transfer.id) }}
            </v-chip>
          </div>
          <div class="transfer-description text-grey">{{ transfer.description }}</div>
        </div>

        <!-- Amount and date -->
        <div class="transfer-meta">
          <div class="transfer-amount text-success">+Rp {{ formatCurrency(transfer.amount) }}</div>
          <div class="transfer-date text-grey">
            <div>{{ formatDate(transfer.createdAt) }}</div>
            <div>{{ formatTime(transfer.createdAt) }}</div>
          </div>
        </div>

        <!-- Action button -->
        <div
          v-if="getTransferStatus(transfer.id) === 'pending' && !readOnly"
          class="transfer-action"
        >
          <v-btn
            color="success"
            variant="elevated"
            size="small"
            @click.stop="$emit('confirm-transfer', transfer)"
          >
            <v-icon icon="mdi-check" start />
            Confirm
          </v-btn>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAccountStore } from '@/stores/account'
import { useShiftsStore } from '@/stores/pos/shifts'
import type { Transaction } from '@/stores/account/types'

const props = defineProps<{
  transfers: Transaction[]
  cashAccountId: string
  readOnly?: boolean
}>()

defineEmits<{
  'confirm-transfer': [transfer: Transaction]
}>()

const accountStore = useAccountStore()
const shiftsStore = useShiftsStore()

const sortedTransfers = computed(() => {
  return [...props.transfers].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
})

/**
 * Get the status of a transfer based on shift's transferOperations
 */
function getTransferStatus(transactionId: string): 'pending' | 'confirmed' | 'rejected' {
  const currentShift = shiftsStore.currentShift
  if (!currentShift?.transferOperations) return 'pending'

  const operation = currentShift.transferOperations.find(op => op.transactionId === transactionId)

  return operation?.status || 'pending'
}

function getStatusIcon(transactionId: string): string {
  const status = getTransferStatus(transactionId)
  switch (status) {
    case 'confirmed':
      return 'mdi-check-circle'
    case 'rejected':
      return 'mdi-close-circle'
    default:
      return 'mdi-bank-transfer-in'
  }
}

function getStatusColor(transactionId: string): string {
  const status = getTransferStatus(transactionId)
  switch (status) {
    case 'confirmed':
      return 'success'
    case 'rejected':
      return 'error'
    default:
      return 'warning'
  }
}

function getAccountName(accountId: string | undefined): string {
  if (!accountId) return 'Unknown'
  const account = accountStore.getAccountById(accountId)
  return account?.name || 'Unknown Account'
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped lang="scss">
.transfers-section {
  border-radius: 8px;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 8px 8px 0 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32px 16px;
  text-align: center;
}

.transfers-list {
  display: flex;
  flex-direction: column;
}

.transfer-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  &:last-child {
    border-bottom: none;
  }

  &.transfer-processed {
    opacity: 0.7;
  }
}

.transfer-icon {
  flex-shrink: 0;
}

.transfer-content {
  flex: 1;
  min-width: 0;
}

.transfer-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.transfer-title {
  font-weight: 500;
  font-size: 0.95rem;
}

.transfer-description {
  font-size: 0.85rem;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.transfer-meta {
  flex-shrink: 0;
  text-align: right;
}

.transfer-amount {
  font-size: 1.1rem;
  font-weight: 600;
}

.transfer-date {
  font-size: 0.75rem;
  margin-top: 2px;
}

.transfer-action {
  flex-shrink: 0;
  margin-left: 8px;
}
</style>
