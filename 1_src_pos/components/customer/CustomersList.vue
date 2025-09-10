<template>
  <v-list class="customer-list">
    <template v-if="customers.length">
      <v-list-item
        v-for="customer in customers"
        :key="customer.id"
        class="mb-2"
        @click="$emit('select', customer)"
      >
        <template #prepend>
          <v-avatar color="grey-lighten-1" size="40">
            <span class="text-subtitle-2">{{ getInitials(customer) }}</span>
          </v-avatar>
        </template>

        <div class="d-flex flex-column flex-grow-1">
          <!-- Customer Name and Status -->
          <div class="d-flex align-center justify-space-between">
            <div class="d-flex align-center">
              <span class="text-subtitle-1">{{ customer.firstName }} {{ customer.lastName }}</span>
              <v-chip :color="getStatusColor(customer.status)" size="x-small" class="ml-2">
                {{ customer.status }}
              </v-chip>
            </div>
            <v-btn
              icon="mdi-eye"
              variant="text"
              size="small"
              @click.stop="$emit('select', customer)"
            >
              <v-tooltip activator="parent" location="top">View details</v-tooltip>
            </v-btn>
          </div>

          <!-- Contact Info -->
          <div class="d-flex gap-4">
            <span v-if="customer.phone" class="text-caption text-medium-emphasis">
              <v-icon size="small" start>mdi-phone</v-icon>
              {{ customer.phone }}
            </span>
            <span v-if="customer.email" class="text-caption text-medium-emphasis">
              <v-icon size="small" start>mdi-email</v-icon>
              {{ customer.email }}
            </span>
          </div>

          <!-- Visit Info -->
          <div class="text-caption text-medium-emphasis mt-1">
            <v-icon size="small" start>mdi-clock-outline</v-icon>
            Last visit: {{ formatDate(customer.lastVisitDate) }}
          </div>
        </div>
      </v-list-item>
    </template>

    <v-list-item v-else>
      <div class="text-center py-4 text-medium-emphasis">No customers found</div>
    </v-list-item>
  </v-list>
</template>

<script setup lang="ts">
import type { Customer, CustomerBageStatus } from '@/types/customer'
import { TimeUtils } from '@/utils/time'

defineProps<{
  customers: Customer[]
}>()

defineEmits<{
  select: [customer: Customer]
}>()

// Helpers
function getInitials(customer: Customer): string {
  return `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`
}

const formatDate = (date: string) => TimeUtils.formatDateToDisplay(date)

function getStatusColor(status: CustomerBageStatus): string {
  const colors = {
    active: 'success',
    inactive: 'warning',
    blacklisted: 'error'
  } as const
  return colors[status] || 'grey'
}
</script>

<style scoped>
.customer-list {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 4px;
}

.gap-4 {
  gap: 16px;
}

:deep(.v-list-item) {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 8px;
  margin: 4px 8px;
  cursor: pointer;
}

:deep(.v-list-item:hover) {
  background-color: rgba(var(--v-theme-on-surface), 0.04);
}
</style>
