// src/views/catalog/payment-methods/PaymentMethodList.vue
<template>
  <v-card class="payment-method-list">
    <v-card-title class="text-h6 px-4 py-3">Payment Methods</v-card-title>

    <v-list class="py-2">
      <v-list-item
        v-for="method in methods"
        :key="method.id"
        :class="{
          'method-item--inactive': !method.isActive
        }"
      >
        <template #prepend>
          <v-icon :icon="getMethodIcon(method.type)" size="24" />
        </template>

        <v-list-item-title>
          {{ method.name }}
          <v-chip
            v-if="method.isPosСashRegister"
            size="x-small"
            color="primary"
            variant="flat"
            class="ml-2"
          >
            <v-icon left size="x-small">mdi-cash-register</v-icon>
            POS Cash
          </v-chip>
        </v-list-item-title>

        <v-list-item-subtitle>Account: {{ getAccountName(method.accountId) }}</v-list-item-subtitle>

        <template #append>
          <div class="d-flex align-center">
            <v-chip
              v-if="!method.isActive"
              size="small"
              color="warning"
              variant="flat"
              class="mr-2"
            >
              Inactive
            </v-chip>

            <v-btn
              icon
              size="small"
              variant="text"
              color="primary"
              @click.stop="emit('edit', method)"
            >
              <v-icon icon="mdi-pencil" size="20" />
            </v-btn>
          </div>
        </template>
      </v-list-item>

      <v-list-item v-if="methods.length === 0">
        <v-list-item-title class="text-center text-medium-emphasis">
          No payment methods
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script setup lang="ts">
import type { PaymentMethod } from '@/types/payment'
import { useAccountStore } from '@/stores/account'

defineProps<{
  methods: PaymentMethod[]
}>()

const emit = defineEmits<{
  edit: [method: PaymentMethod]
}>()

const accountStore = useAccountStore()

function getMethodIcon(type: PaymentMethod['type']): string {
  const icons: Record<PaymentMethod['type'], string> = {
    cash: 'mdi-cash',
    bank: 'mdi-bank'
  }
  return icons[type] || 'mdi-wallet'
}

function getAccountName(accountId: string | null): string {
  if (!accountId) return 'Not assigned'
  const account = accountStore.accounts.find(a => a.id === accountId)
  return account?.name || 'Unknown'
}
</script>

<style lang="scss" scoped>
.payment-method-list {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.method-item {
  &--inactive {
    opacity: 0.7;
  }
}
</style>
