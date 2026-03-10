<!-- src/views/admin/loyalty/LoyaltySettingsScreen.vue -->
<!-- Unified Loyalty admin with tabs: Settings, Stamp Cards, Customers -->
<template>
  <div class="loyalty-screen">
    <!-- Header with tabs -->
    <div class="loyalty-header px-4 pt-4">
      <div class="d-flex align-center justify-space-between mb-3">
        <h2 class="text-h5">Loyalty Program</h2>
        <div class="d-flex gap-2">
          <v-btn
            v-if="activeTab === 'settings'"
            color="primary"
            variant="flat"
            :loading="saving"
            :disabled="!hasChanges"
            @click="saveSettings"
          >
            Save Changes
          </v-btn>
        </div>
      </div>

      <v-tabs v-model="activeTab" density="compact">
        <v-tab value="settings">
          <v-icon start size="18">mdi-cog</v-icon>
          Settings
        </v-tab>
        <v-tab value="cards">
          <v-icon start size="18">mdi-stamper</v-icon>
          Stamp Cards
          <v-badge
            v-if="stampCards.length"
            :content="stampCards.length"
            color="amber"
            inline
            class="ml-1"
          />
        </v-tab>
        <v-tab value="customers">
          <v-icon start size="18">mdi-account-group</v-icon>
          Customers
          <v-badge
            v-if="customersStore.customers.length"
            :content="customersStore.customers.length"
            color="primary"
            inline
            class="ml-1"
          />
        </v-tab>
      </v-tabs>
    </div>

    <v-divider />

    <!-- Tab content -->
    <div class="loyalty-content pa-4">
      <div v-if="loading" class="text-center py-8">
        <v-progress-circular indeterminate />
      </div>

      <template v-else>
        <!-- ===================== SETTINGS TAB ===================== -->
        <div v-show="activeTab === 'settings'">
          <template v-if="form">
            <v-row>
              <!-- Block 1: Stamp Cards -->
              <v-col cols="12" md="6">
                <v-card variant="outlined">
                  <v-card-title class="bg-amber-lighten-5">
                    <v-icon class="mr-2" color="amber-darken-2">mdi-stamper</v-icon>
                    Stamp Cards
                  </v-card-title>
                  <v-card-text class="pt-4">
                    <v-text-field
                      v-model.number="form.stampsPerCycle"
                      label="Stamps per cycle"
                      type="number"
                      :min="1"
                      variant="outlined"
                      density="compact"
                      hint="How many stamps to complete one cycle"
                      persistent-hint
                      class="mb-3"
                    />
                    <v-text-field
                      v-model.number="form.stampThreshold"
                      label="Stamp threshold (IDR)"
                      type="number"
                      :min="1000"
                      variant="outlined"
                      density="compact"
                      hint="Minimum order amount for 1 stamp"
                      persistent-hint
                      prefix="Rp"
                      class="mb-3"
                    />
                    <v-text-field
                      v-model.number="form.stampLifetimeDays"
                      label="Stamp lifetime (days)"
                      type="number"
                      :min="1"
                      variant="outlined"
                      density="compact"
                      hint="Days before stamps expire"
                      persistent-hint
                      class="mb-3"
                    />

                    <!-- Stamp Rewards -->
                    <div class="text-subtitle-2 mb-2">Stamp Rewards</div>
                    <div
                      v-for="(reward, i) in form.stampRewards"
                      :key="i"
                      class="reward-row mb-3 pa-2 rounded"
                      style="border: 1px solid rgba(var(--v-theme-on-surface), 0.12)"
                    >
                      <div class="d-flex gap-2 mb-2 align-center">
                        <v-text-field
                          v-model.number="reward.stamps"
                          label="Stamps"
                          type="number"
                          variant="outlined"
                          density="compact"
                          hide-details
                          style="max-width: 80px"
                        />
                        <v-text-field
                          v-model="reward.category"
                          label="Label"
                          variant="outlined"
                          density="compact"
                          hide-details
                          class="flex-grow-1"
                          placeholder="e.g. drinks, breakfast, any"
                        />
                        <v-text-field
                          v-model.number="reward.maxDiscount"
                          label="Max discount"
                          type="number"
                          variant="outlined"
                          density="compact"
                          hide-details
                          prefix="Rp"
                          style="max-width: 140px"
                        />
                        <v-btn
                          icon
                          size="small"
                          variant="text"
                          color="error"
                          @click="form.stampRewards.splice(i, 1)"
                        >
                          <v-icon size="18">mdi-close</v-icon>
                        </v-btn>
                      </div>
                      <v-select
                        v-model="reward.categoryIds"
                        :items="menuCategoryItems"
                        label="Menu categories (empty = any item)"
                        variant="outlined"
                        density="compact"
                        hide-details
                        multiple
                        chips
                        closable-chips
                        clearable
                      />
                    </div>
                    <v-btn
                      size="small"
                      variant="tonal"
                      prepend-icon="mdi-plus"
                      @click="
                        form.stampRewards.push({
                          stamps: 0,
                          category: '',
                          categoryIds: [],
                          maxDiscount: 0,
                          redeemed: false
                        })
                      "
                    >
                      Add Reward
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Block 2: Digital Points & Tiers -->
              <v-col cols="12" md="6">
                <v-card variant="outlined" class="mb-4">
                  <v-card-title class="bg-deep-purple-lighten-5">
                    <v-icon class="mr-2" color="deep-purple">mdi-wallet</v-icon>
                    Digital Points
                  </v-card-title>
                  <v-card-text class="pt-4">
                    <v-text-field
                      v-model.number="form.pointsLifetimeDays"
                      label="Points lifetime (days)"
                      type="number"
                      :min="1"
                      variant="outlined"
                      density="compact"
                      hint="Days before points expire"
                      persistent-hint
                      class="mb-3"
                    />
                    <v-text-field
                      v-model.number="form.conversionBonusPct"
                      label="Conversion bonus (%)"
                      type="number"
                      :min="0"
                      :max="100"
                      variant="outlined"
                      density="compact"
                      hint="Extra % when converting stamps to points"
                      persistent-hint
                      suffix="%"
                      class="mb-3"
                    />
                    <v-text-field
                      v-model.number="form.tierWindowDays"
                      label="Tier window (days)"
                      type="number"
                      :min="1"
                      variant="outlined"
                      density="compact"
                      hint="Sliding window for tier calculation"
                      persistent-hint
                      class="mb-3"
                    />
                    <v-text-field
                      v-model.number="form.maxTierDegradation"
                      label="Max tier degradation"
                      type="number"
                      :min="0"
                      :max="3"
                      variant="outlined"
                      density="compact"
                      hint="Max levels a customer can drop per check"
                      persistent-hint
                    />
                  </v-card-text>
                </v-card>

                <!-- Tiers -->
                <v-card variant="outlined">
                  <v-card-title class="bg-blue-lighten-5">
                    <v-icon class="mr-2" color="blue">mdi-trophy</v-icon>
                    Tier Configuration
                  </v-card-title>
                  <v-card-text class="pt-4">
                    <div
                      v-for="(tier, i) in form.tiers"
                      :key="i"
                      class="d-flex gap-2 mb-2 align-center"
                    >
                      <v-text-field
                        v-model="tier.name"
                        label="Tier name"
                        variant="outlined"
                        density="compact"
                        hide-details
                        class="flex-grow-1"
                      />
                      <v-text-field
                        v-model.number="tier.cashbackPct"
                        label="Cashback %"
                        type="number"
                        variant="outlined"
                        density="compact"
                        hide-details
                        suffix="%"
                        style="max-width: 100px"
                      />
                      <v-text-field
                        v-model.number="tier.spendingThreshold"
                        label="Spend threshold"
                        type="number"
                        variant="outlined"
                        density="compact"
                        hide-details
                        prefix="Rp"
                        style="max-width: 160px"
                      />
                      <v-btn
                        icon
                        size="small"
                        variant="text"
                        color="error"
                        @click="form.tiers.splice(i, 1)"
                      >
                        <v-icon size="18">mdi-close</v-icon>
                      </v-btn>
                    </div>
                    <v-btn
                      size="small"
                      variant="tonal"
                      prepend-icon="mdi-plus"
                      @click="form.tiers.push({ name: '', cashbackPct: 5, spendingThreshold: 0 })"
                    >
                      Add Tier
                    </v-btn>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>

            <!-- Active toggle -->
            <v-card variant="outlined" class="mt-4">
              <v-card-text>
                <v-switch
                  v-model="form.isActive"
                  label="Loyalty program active"
                  color="success"
                  hide-details
                />
              </v-card-text>
            </v-card>
          </template>

          <v-alert v-else type="warning" variant="tonal" class="mt-4">
            No loyalty settings found. The settings row may not have been initialized in the
            database.
          </v-alert>
        </div>

        <!-- ===================== STAMP CARDS TAB ===================== -->
        <div v-show="activeTab === 'cards'">
          <!-- Stats -->
          <v-row class="mb-4" dense>
            <v-col cols="6" md="3">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h5 font-weight-bold">{{ stampCards.length }}</div>
                <div class="text-caption text-medium-emphasis">Total Cards</div>
              </v-card>
            </v-col>
            <v-col cols="6" md="3">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h5 font-weight-bold text-success">{{ activeCards }}</div>
                <div class="text-caption text-medium-emphasis">Active</div>
              </v-card>
            </v-col>
            <v-col cols="6" md="3">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h5 font-weight-bold text-deep-purple">{{ convertedCards }}</div>
                <div class="text-caption text-medium-emphasis">Converted</div>
              </v-card>
            </v-col>
            <v-col cols="6" md="3">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h5 font-weight-bold text-amber-darken-2">{{ linkedCards }}</div>
                <div class="text-caption text-medium-emphasis">Linked to Customer</div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Filter -->
          <div class="d-flex gap-2 mb-3">
            <v-text-field
              v-model="cardSearch"
              placeholder="Search card number..."
              density="compact"
              variant="outlined"
              hide-details
              prepend-inner-icon="mdi-magnify"
              clearable
              style="max-width: 240px"
            />
            <v-select
              v-model="cardStatusFilter"
              :items="cardStatusOptions"
              label="Status"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              style="max-width: 160px"
            />
          </div>

          <!-- Cards table -->
          <v-card variant="outlined">
            <v-data-table
              :headers="cardHeaders"
              :items="filteredCards"
              :loading="loadingCards"
              :items-per-page="20"
              density="compact"
              hover
            >
              <template #[`item.cardNumber`]="{ item }">
                <span class="font-weight-medium">#{{ item.cardNumber }}</span>
              </template>

              <template #[`item.stamps`]="{ item }">
                <div class="d-flex align-center gap-1">
                  <v-icon size="14" color="amber-darken-2">mdi-stamper</v-icon>
                  {{ item.stamps }}/{{ form?.stampsPerCycle || 15 }}
                </div>
              </template>

              <template #[`item.status`]="{ item }">
                <v-chip
                  size="x-small"
                  :color="
                    item.status === 'active'
                      ? 'success'
                      : item.status === 'converted'
                        ? 'deep-purple'
                        : 'grey'
                  "
                  variant="tonal"
                >
                  {{ item.status }}
                </v-chip>
              </template>

              <template #[`item.customerName`]="{ item }">
                <span v-if="item.customerName">{{ item.customerName }}</span>
                <span v-else class="text-medium-emphasis">-</span>
              </template>

              <template #[`item.lastStampAt`]="{ item }">
                {{ item.lastStampAt ? formatRelative(item.lastStampAt) : 'Never' }}
              </template>

              <template #[`item.createdAt`]="{ item }">
                {{ formatDate(item.createdAt) }}
              </template>
            </v-data-table>
          </v-card>
        </div>

        <!-- ===================== CUSTOMERS TAB ===================== -->
        <div v-show="activeTab === 'customers'">
          <!-- Stats -->
          <v-row class="mb-4" dense>
            <v-col v-for="stat in customerStats" :key="stat.label" cols="6" md="3">
              <v-card variant="outlined" class="pa-3 text-center">
                <div class="text-h5 font-weight-bold" :class="stat.color">{{ stat.value }}</div>
                <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Search & filter -->
          <div class="d-flex gap-2 mb-3">
            <v-text-field
              v-model="customerSearch"
              placeholder="Search name, phone or telegram..."
              density="compact"
              variant="outlined"
              hide-details
              prepend-inner-icon="mdi-magnify"
              clearable
              style="max-width: 280px"
            />
            <v-select
              v-model="customerTierFilter"
              :items="tierOptions"
              label="Tier"
              density="compact"
              variant="outlined"
              hide-details
              clearable
              style="max-width: 140px"
            />
          </div>

          <!-- Table -->
          <v-card variant="outlined">
            <v-data-table
              :headers="customerHeaders"
              :items="filteredCustomers"
              :loading="loadingCustomers"
              :items-per-page="20"
              density="compact"
              hover
              @click:row="(_: Event, row: any) => openCustomerDetail(row.item)"
            >
              <template #[`item.tier`]="{ item }">
                <v-chip
                  size="small"
                  :color="getTierColor(item.tier)"
                  variant="flat"
                  class="text-white"
                >
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
          <v-dialog v-model="showCustomerDetail" max-width="600">
            <v-card v-if="selectedCustomer">
              <v-card-title class="d-flex align-center justify-space-between bg-primary text-white">
                <span>{{ selectedCustomer.name }}</span>
                <v-chip
                  :color="getTierColor(selectedCustomer.tier)"
                  variant="flat"
                  class="text-white"
                >
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
                      {{
                        selectedCustomer.averageCheck
                          ? formatIDR(selectedCustomer.averageCheck)
                          : '-'
                      }}
                    </div>
                  </v-col>
                </v-row>

                <v-divider class="my-3" />

                <div v-if="selectedCustomer.phone" class="mb-2">
                  <div class="text-caption text-medium-emphasis mb-1">Phone</div>
                  <div class="text-body-1">{{ selectedCustomer.phone }}</div>
                </div>
                <div class="mb-2">
                  <div class="text-caption text-medium-emphasis mb-1">Telegram</div>
                  <div class="text-body-1">{{ selectedCustomer.telegramUsername || '-' }}</div>
                </div>
                <div>
                  <div class="text-caption text-medium-emphasis mb-1">Token</div>
                  <div class="text-body-2 font-weight-mono">
                    {{ maskToken(selectedCustomer.token) }}
                  </div>
                </div>

                <!-- Transactions -->
                <v-divider class="my-3" />
                <div class="text-subtitle-2 mb-2">Recent Transactions</div>
                <div v-if="loadingTx" class="text-center py-2">
                  <v-progress-circular indeterminate size="24" />
                </div>
                <v-list
                  v-else-if="customerTxs.length > 0"
                  density="compact"
                  class="transaction-list"
                >
                  <v-list-item v-for="tx in customerTxs" :key="tx.id" class="px-0">
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
                <v-btn variant="text" @click="showCustomerDetail = false">Close</v-btn>
              </v-card-actions>
            </v-card>
          </v-dialog>
        </div>
      </template>
    </div>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000" location="top">
      {{ snackbar.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useLoyaltyStore } from '@/stores/loyalty'
import { useCustomersStore } from '@/stores/customers'
import { useMenuStore } from '@/stores/menu'
import type {
  StampReward,
  TierConfig,
  StampCardListItem,
  LoyaltyTransaction
} from '@/stores/loyalty'
import type { Customer } from '@/stores/customers'
import { formatIDR, TimeUtils } from '@/utils'

const loyaltyStore = useLoyaltyStore()
const customersStore = useCustomersStore()
const menuStore = useMenuStore()

// Menu categories for reward category picker
const menuCategoryItems = computed(() =>
  menuStore.categories.map(c => ({ title: c.name, value: c.id }))
)

// =============================================
// SHARED STATE
// =============================================

const activeTab = ref<'settings' | 'cards' | 'customers'>('settings')
const loading = ref(true)
const saving = ref(false)
const snackbar = reactive({ show: false, message: '', color: 'success' })

// Reload fresh data when switching tabs
watch(activeTab, tab => {
  if (tab === 'customers') customersStore.reload()
  if (tab === 'cards') loadCards()
})

// =============================================
// SETTINGS TAB
// =============================================

interface FormData {
  stampsPerCycle: number
  stampThreshold: number
  stampLifetimeDays: number
  stampRewards: StampReward[]
  pointsLifetimeDays: number
  conversionBonusPct: number
  tierWindowDays: number
  maxTierDegradation: number
  tiers: TierConfig[]
  isActive: boolean
}

const form = ref<FormData | null>(null)
const original = ref<string>('')

const hasChanges = computed(() => {
  if (!form.value) return false
  return JSON.stringify(form.value) !== original.value
})

async function saveSettings() {
  if (!form.value) return
  saving.value = true

  try {
    await loyaltyStore.updateSettings(form.value)
    original.value = JSON.stringify(form.value)
    snackbar.message = 'Settings saved'
    snackbar.color = 'success'
    snackbar.show = true
  } catch {
    snackbar.message = 'Failed to save settings'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    saving.value = false
  }
}

// =============================================
// STAMP CARDS TAB
// =============================================

const stampCards = ref<StampCardListItem[]>([])
const loadingCards = ref(false)
const cardSearch = ref('')
const cardStatusFilter = ref<string | null>(null)
const cardStatusOptions = ['active', 'converted', 'expired']

const cardHeaders = [
  { title: 'Card #', key: 'cardNumber', sortable: true },
  { title: 'Stamps', key: 'stamps', sortable: true },
  { title: 'Cycle', key: 'cycle', sortable: true },
  { title: 'Status', key: 'status', sortable: true },
  { title: 'Customer', key: 'customerName', sortable: true },
  { title: 'Last Stamp', key: 'lastStampAt', sortable: true },
  { title: 'Created', key: 'createdAt', sortable: true }
]

const activeCards = computed(() => stampCards.value.filter(c => c.status === 'active').length)
const convertedCards = computed(() => stampCards.value.filter(c => c.status === 'converted').length)
const linkedCards = computed(() => stampCards.value.filter(c => c.customerId).length)

const filteredCards = computed(() => {
  let list = stampCards.value
  if (cardSearch.value) {
    const q = cardSearch.value.toLowerCase()
    list = list.filter(
      c => c.cardNumber.includes(q) || (c.customerName && c.customerName.toLowerCase().includes(q))
    )
  }
  if (cardStatusFilter.value) {
    list = list.filter(c => c.status === cardStatusFilter.value)
  }
  return list
})

async function loadCards() {
  loadingCards.value = true
  try {
    stampCards.value = await loyaltyStore.listCards()
  } catch (err) {
    console.error('Failed to load stamp cards:', err)
  } finally {
    loadingCards.value = false
  }
}

// =============================================
// CUSTOMERS TAB
// =============================================

const loadingCustomers = ref(false)
const customerSearch = ref('')
const customerTierFilter = ref<string | null>(null)
const showCustomerDetail = ref(false)
const selectedCustomer = ref<Customer | null>(null)
const customerTxs = ref<LoyaltyTransaction[]>([])
const loadingTx = ref(false)

const tierOptions = ['member', 'regular', 'vip']

const customerHeaders = [
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
  if (customerSearch.value) {
    const q = customerSearch.value.toLowerCase()
    list = list.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.telegramUsername && c.telegramUsername.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
    )
  }
  if (customerTierFilter.value) {
    list = list.filter(c => c.tier === customerTierFilter.value)
  }
  return list
})

const customerStats = computed(() => {
  const all = customersStore.customers
  const active = all.filter(c => c.status === 'active')
  return [
    { label: 'Total Customers', value: all.length, color: '' },
    { label: 'Active', value: active.length, color: 'text-success' },
    { label: 'VIP', value: all.filter(c => c.tier === 'vip').length, color: 'text-deep-purple' },
    {
      label: 'Total Balance',
      value: formatIDR(active.reduce((sum, c) => sum + c.loyaltyBalance, 0)),
      color: 'text-primary'
    }
  ]
})

async function openCustomerDetail(customer: Customer) {
  selectedCustomer.value = customer
  showCustomerDetail.value = true
  loadingTx.value = true

  try {
    customerTxs.value = await loyaltyStore.getTransactions(customer.id, 20)
  } catch {
    customerTxs.value = []
  } finally {
    loadingTx.value = false
  }
}

// =============================================
// SHARED HELPERS
// =============================================

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

function formatDate(date: string): string {
  return TimeUtils.formatDateForDisplay(date)
}

function maskToken(token?: string): string {
  if (!token) return '-'
  if (token.length <= 4) return token
  return '****' + token.slice(-4)
}

// =============================================
// INITIALIZATION
// =============================================

onMounted(async () => {
  try {
    if (!loyaltyStore.initialized) await loyaltyStore.initialize()
    await customersStore.reload()

    // Load settings form
    const s = loyaltyStore.settings
    if (s) {
      form.value = {
        stampsPerCycle: s.stampsPerCycle,
        stampThreshold: s.stampThreshold,
        stampLifetimeDays: s.stampLifetimeDays,
        stampRewards: [
          ...s.stampRewards.map(r => ({ ...r, categoryIds: [...(r.categoryIds || [])] }))
        ],
        pointsLifetimeDays: s.pointsLifetimeDays,
        conversionBonusPct: s.conversionBonusPct,
        tierWindowDays: s.tierWindowDays,
        maxTierDegradation: s.maxTierDegradation,
        tiers: [...s.tiers.map(t => ({ ...t }))],
        isActive: s.isActive
      }
      original.value = JSON.stringify(form.value)
    }

    // Load stamp cards
    await loadCards()
  } catch (err) {
    snackbar.message = 'Failed to load loyalty data'
    snackbar.color = 'error'
    snackbar.show = true
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.loyalty-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.loyalty-header {
  flex-shrink: 0;
}

.loyalty-content {
  flex: 1;
  overflow-y: auto;
}

.transaction-list {
  max-height: 250px;
  overflow-y: auto;
}
</style>
