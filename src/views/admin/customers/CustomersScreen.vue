<!-- src/views/admin/customers/CustomersScreen.vue -->
<template>
  <div class="customers-screen pa-4">
    <div class="d-flex align-center justify-space-between mb-4">
      <h2 class="text-h5">Customers</h2>
      <div class="d-flex gap-2">
        <v-text-field
          v-model="search"
          placeholder="Search name or telegram..."
          density="compact"
          variant="outlined"
          hide-details
          prepend-inner-icon="mdi-magnify"
          clearable
          style="max-width: 280px"
        />
        <v-select
          v-model="tierFilter"
          :items="tierOptions"
          label="Tier"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          style="max-width: 140px"
        />
      </div>
    </div>

    <!-- Stats row -->
    <v-row class="mb-4" dense>
      <v-col v-for="stat in stats" :key="stat.label" cols="6" md="3">
        <v-card variant="outlined" class="pa-3 text-center">
          <div class="text-h5 font-weight-bold" :class="stat.color">{{ stat.value }}</div>
          <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- M5: Error state -->
    <v-alert v-if="loadError" type="error" variant="tonal" class="mb-4">{{ loadError }}</v-alert>

    <!-- Table -->
    <v-card variant="outlined">
      <v-data-table
        :headers="headers"
        :items="filteredCustomers"
        :loading="loading"
        :items-per-page="20"
        density="compact"
        hover
        @click:row="(_: Event, row: any) => openDetail(row.item)"
      >
        <template #[`item.tier`]="{ item }">
          <v-chip size="small" :color="getTierColor(item.tier)" variant="flat" class="text-white">
            {{ item.tier.toUpperCase() }}
          </v-chip>
        </template>

        <template #[`item.loyaltyBalance`]="{ item }">
          {{ formatIDR(item.loyaltyBalance) }}
        </template>

        <template #[`item.totalSpent`]="{ item }">
          {{ formatIDR(item.totalSpent) }}
        </template>

        <template #[`item.averageCheck`]="{ item }">
          {{ item.averageCheck ? formatIDR(item.averageCheck) : '-' }}
        </template>

        <template #[`item.lastVisitAt`]="{ item }">
          {{ item.lastVisitAt ? formatRelative(item.lastVisitAt) : 'Never' }}
        </template>

        <template #[`item.status`]="{ item }">
          <v-chip
            size="x-small"
            :color="item.status === 'active' ? 'success' : 'error'"
            variant="tonal"
          >
            {{ item.status }}
          </v-chip>
        </template>
      </v-data-table>
    </v-card>

    <!-- Customer Detail Dialog -->
    <v-dialog v-model="showDetail" max-width="600">
      <v-card v-if="selectedCustomer">
        <v-card-title class="d-flex align-center justify-space-between bg-primary text-white">
          <span>{{ selectedCustomer.name }}</span>
          <v-chip :color="getTierColor(selectedCustomer.tier)" variant="flat" class="text-white">
            {{ selectedCustomer.tier.toUpperCase() }}
          </v-chip>
        </v-card-title>

        <v-card-text class="pt-4">
          <v-row dense>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Balance</div>
              <div class="text-h6">{{ formatIDR(selectedCustomer.loyaltyBalance) }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Total Spent</div>
              <div class="text-h6">{{ formatIDR(selectedCustomer.totalSpent) }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Visits</div>
              <div class="text-h6">{{ selectedCustomer.totalVisits }}</div>
            </v-col>
            <v-col cols="6">
              <div class="text-caption text-medium-emphasis">Avg Check</div>
              <div class="text-h6">
                {{ selectedCustomer.averageCheck ? formatIDR(selectedCustomer.averageCheck) : '-' }}
              </div>
            </v-col>
          </v-row>

          <v-divider class="my-3" />

          <div class="text-caption text-medium-emphasis mb-1">Telegram</div>
          <div class="text-body-1 mb-2">{{ selectedCustomer.telegramUsername || '-' }}</div>

          <div class="text-caption text-medium-emphasis mb-1">Token</div>
          <div class="text-body-2 font-weight-mono">{{ maskToken(selectedCustomer.token) }}</div>

          <!-- Transactions -->
          <v-divider class="my-3" />
          <div class="text-subtitle-2 mb-2">Recent Transactions</div>
          <div v-if="loadingTx" class="text-center py-2">
            <v-progress-circular indeterminate size="24" />
          </div>
          <v-list v-else-if="transactions.length > 0" density="compact" class="transaction-list">
            <v-list-item v-for="tx in transactions" :key="tx.id" class="px-0">
              <template #prepend>
                <v-icon size="18" :color="tx.amount >= 0 ? 'success' : 'error'" class="mr-2">
                  {{ tx.amount >= 0 ? 'mdi-arrow-down' : 'mdi-arrow-up' }}
                </v-icon>
              </template>
              <v-list-item-title class="text-body-2">
                {{ tx.type }} — {{ formatIDR(Math.abs(tx.amount)) }}
              </v-list-item-title>
              <v-list-item-subtitle class="text-caption">
                {{ tx.description || '' }} | Balance: {{ formatIDR(tx.balanceAfter) }}
              </v-list-item-subtitle>
              <template #append>
                <span class="text-caption text-medium-emphasis">
                  {{ formatRelative(tx.createdAt) }}
                </span>
              </template>
            </v-list-item>
          </v-list>
          <div v-else class="text-body-2 text-medium-emphasis">No transactions yet</div>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDetail = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useCustomersStore } from '@/stores/customers'
import { useLoyaltyStore } from '@/stores/loyalty'
import type { Customer } from '@/stores/customers'
import type { LoyaltyTransaction } from '@/stores/loyalty'
import { formatIDR, TimeUtils } from '@/utils'

const customersStore = useCustomersStore()
const loyaltyStore = useLoyaltyStore()

const loading = ref(true)
const loadError = ref('')
const search = ref('')
const tierFilter = ref<string | null>(null)
const showDetail = ref(false)
const selectedCustomer = ref<Customer | null>(null)
const transactions = ref<LoyaltyTransaction[]>([])
const loadingTx = ref(false)

const tierOptions = ['member', 'regular', 'vip']

const headers = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Tier', key: 'tier', sortable: true },
  { title: 'Balance', key: 'loyaltyBalance', sortable: true },
  { title: 'Total Spent', key: 'totalSpent', sortable: true },
  { title: 'Visits', key: 'totalVisits', sortable: true },
  { title: 'Avg Check', key: 'averageCheck', sortable: true },
  { title: 'Last Visit', key: 'lastVisitAt', sortable: true },
  { title: 'Status', key: 'status', sortable: true }
]

const filteredCustomers = computed(() => {
  let list = customersStore.customers
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.telegramUsername && c.telegramUsername.toLowerCase().includes(q))
    )
  }
  if (tierFilter.value) {
    list = list.filter(c => c.tier === tierFilter.value)
  }
  return list
})

const stats = computed(() => {
  const all = customersStore.customers
  const active = all.filter(c => c.status === 'active')
  return [
    { label: 'Total Customers', value: all.length, color: '' },
    { label: 'Active', value: active.length, color: 'text-success' },
    {
      label: 'VIP',
      value: all.filter(c => c.tier === 'vip').length,
      color: 'text-deep-purple'
    },
    {
      label: 'Total Balance',
      value: formatIDR(active.reduce((sum, c) => sum + c.loyaltyBalance, 0)),
      color: 'text-primary'
    }
  ]
})

function getTierColor(tier: string): string {
  switch (tier) {
    case 'vip':
      return 'deep-purple'
    case 'regular':
      return 'blue'
    default:
      return 'grey'
  }
}

function formatRelative(date: string): string {
  return TimeUtils.getRelativeTime(date)
}

function maskToken(token?: string): string {
  if (!token) return '-'
  if (token.length <= 4) return token
  return '****' + token.slice(-4)
}

async function openDetail(customer: Customer) {
  selectedCustomer.value = customer
  showDetail.value = true
  loadingTx.value = true

  try {
    // Refresh customer data and load transactions in parallel
    const [, txs] = await Promise.all([
      customersStore.refreshCustomer(customer.id).then(() => {
        selectedCustomer.value = customersStore.getById(customer.id) || customer
      }),
      loyaltyStore.getTransactions(customer.id, 20)
    ])
    transactions.value = txs
  } catch {
    transactions.value = []
  } finally {
    loadingTx.value = false
  }
}

onMounted(async () => {
  try {
    // Always reload fresh data — customers stats change via RPCs outside the store
    await Promise.all([
      customersStore.reload(),
      loyaltyStore.initialized ? Promise.resolve() : loyaltyStore.initialize()
    ])
  } catch (err) {
    console.error('Failed to load customers:', err)
    loadError.value = err instanceof Error ? err.message : 'Failed to load data'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.transaction-list {
  max-height: 250px;
  overflow-y: auto;
}
</style>
