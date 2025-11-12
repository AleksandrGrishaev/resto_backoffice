<!-- src/views/pos/shifts/components/ShiftTransfersList.vue -->
<template>
  <v-card>
    <v-card-title class="d-flex align-center bg-info">
      <v-icon icon="mdi-bank-transfer-in" color="white" class="me-3" />
      <span class="text-white">Incoming Transfers</span>
      <v-spacer />
      <v-chip color="white" variant="flat">{{ transfers.length }} transfers</v-chip>
    </v-card-title>

    <v-divider />

    <v-card-text v-if="transfers.length === 0" class="text-center py-8">
      <v-icon icon="mdi-bank-transfer" size="64" color="grey-lighten-2" />
      <div class="text-h6 mt-4 text-grey">No transfers yet</div>
      <div class="text-caption text-grey">Incoming transfers will appear here</div>
    </v-card-text>

    <v-list v-else>
      <v-list-item
        v-for="transfer in sortedTransfers"
        :key="transfer.id"
        prepend-icon="mdi-bank-transfer-in"
        :subtitle="transfer.description"
      >
        <template #title>
          <div class="d-flex align-center justify-space-between">
            <div>
              <span class="font-weight-medium">
                Transfer from {{ getAccountName(transfer.transferDetails?.fromAccountId) }}
              </span>
              <v-chip size="x-small" color="success" class="ml-2">incoming</v-chip>
            </div>
            <span class="text-h6 text-success">+Rp {{ formatCurrency(transfer.amount) }}</span>
          </div>
        </template>

        <template #append>
          <div class="text-caption text-grey text-right">
            <div>{{ formatDate(transfer.createdAt) }}</div>
            <div>{{ formatTime(transfer.createdAt) }}</div>
          </div>
        </template>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAccountStore } from '@/stores/account'
import type { Transaction } from '@/stores/account/types'

const props = defineProps<{
  transfers: Transaction[]
  cashAccountId: string
}>()

const accountStore = useAccountStore()

const sortedTransfers = computed(() => {
  return [...props.transfers].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
})

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
