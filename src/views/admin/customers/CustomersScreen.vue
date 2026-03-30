<!-- src/views/admin/customers/CustomersScreen.vue -->
<template>
  <div class="customers-screen pa-4">
    <div class="d-flex align-center justify-space-between mb-4">
      <h2 class="text-h5">Customers</h2>
      <div class="d-flex gap-2">
        <v-text-field
          v-model="search"
          placeholder="Search name, phone, telegram..."
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
        <v-select
          v-model="statusFilter"
          :items="statusOptions"
          label="Status"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          style="max-width: 140px"
        />
        <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="openCreateDialog">
          New Customer
        </v-btn>
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

    <!-- Error state -->
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
        <template #[`item.loyaltyProgram`]="{ item }">
          <v-chip
            size="x-small"
            :color="item.loyaltyProgram === 'cashback' ? 'teal' : 'amber-darken-1'"
            variant="tonal"
          >
            {{ item.loyaltyProgram === 'cashback' ? 'cashback' : 'stamps' }}
          </v-chip>
        </template>

        <template #[`item.tier`]="{ item }">
          <v-chip
            v-if="item.personalDiscount > 0"
            size="small"
            color="orange"
            variant="flat"
            class="text-white"
          >
            DISCOUNT
          </v-chip>
          <v-chip
            v-else
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

        <template #[`item.personalDiscount`]="{ item }">
          <v-chip v-if="item.personalDiscount > 0" size="x-small" color="orange" variant="tonal">
            {{ item.personalDiscount }}%
          </v-chip>
          <span v-else class="text-medium-emphasis">-</span>
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

    <!-- ========== Customer Detail / Edit Dialog ========== -->
    <v-dialog v-model="showDetail" max-width="650" scrollable>
      <v-card v-if="selectedCustomer">
        <v-card-title class="d-flex align-center justify-space-between bg-primary text-white">
          <div class="d-flex align-center gap-2">
            <span>{{ isEditing ? 'Edit Customer' : selectedCustomer.name }}</span>
          </div>
          <div class="d-flex align-center gap-1">
            <v-chip
              v-if="selectedCustomer.personalDiscount > 0"
              color="orange"
              variant="flat"
              class="text-white"
            >
              DISCOUNT
            </v-chip>
            <v-chip
              v-else
              :color="getTierColor(selectedCustomer.tier)"
              variant="flat"
              class="text-white"
            >
              {{ selectedCustomer.tier.toUpperCase() }}
            </v-chip>
            <v-chip
              :color="selectedCustomer.loyaltyProgram === 'cashback' ? 'teal' : 'amber-darken-1'"
              variant="flat"
              size="small"
              class="text-white"
            >
              {{ selectedCustomer.loyaltyProgram === 'cashback' ? 'Cashback' : 'Stamps' }}
            </v-chip>
            <v-chip
              :color="selectedCustomer.status === 'active' ? 'success' : 'error'"
              variant="flat"
              size="small"
            >
              {{ selectedCustomer.status }}
            </v-chip>
          </div>
        </v-card-title>

        <v-card-text class="pt-4" style="max-height: 70vh">
          <!-- View Mode: Stats -->
          <template v-if="!isEditing">
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
                    selectedCustomer.averageCheck ? formatIDR(selectedCustomer.averageCheck) : '-'
                  }}
                </div>
              </v-col>
            </v-row>

            <v-divider class="my-3" />

            <!-- Contact info -->
            <v-row dense>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Phone</div>
                <div class="text-body-1">{{ selectedCustomer.phone || '-' }}</div>
              </v-col>
              <v-col cols="6">
                <div class="text-caption text-medium-emphasis">Telegram</div>
                <div class="text-body-1">
                  {{
                    selectedCustomer.telegramUsername
                      ? '@' + selectedCustomer.telegramUsername
                      : '-'
                  }}
                </div>
              </v-col>
            </v-row>

            <!-- Personal Discount display -->
            <v-divider class="my-3" />
            <div class="text-subtitle-2 mb-1">Personal Discount</div>
            <div
              v-if="selectedCustomer.personalDiscount > 0"
              class="d-flex align-center gap-2 mb-1"
            >
              <v-chip color="orange" variant="tonal" size="small">
                {{ selectedCustomer.personalDiscount }}%
              </v-chip>
              <span v-if="selectedCustomer.discountNote" class="text-body-2">
                {{ selectedCustomer.discountNote }}
              </span>
              <v-chip
                v-if="selectedCustomer.disableLoyaltyAccrual"
                size="x-small"
                color="grey"
                variant="tonal"
              >
                No accrual
              </v-chip>
            </div>
            <div v-else class="text-body-2 text-medium-emphasis">No personal discount</div>

            <v-divider class="my-3" />

            <div class="text-caption text-medium-emphasis mb-1">Token</div>
            <div class="text-body-2 font-weight-mono mb-3">
              {{ maskToken(selectedCustomer.token) }}
            </div>

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
          </template>

          <!-- Edit Mode: Form -->
          <template v-else>
            <v-text-field
              v-model="editForm.name"
              label="Name *"
              density="compact"
              variant="outlined"
              class="mb-3"
              :rules="nameRules"
            />

            <v-row dense class="mb-3">
              <v-col cols="4">
                <v-select
                  v-model="editForm.phoneCode"
                  :items="phoneCodes"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
              <v-col cols="8">
                <v-text-field
                  v-model="editForm.phoneNumber"
                  label="Phone"
                  density="compact"
                  variant="outlined"
                  hide-details
                  inputmode="tel"
                />
              </v-col>
            </v-row>

            <v-text-field
              v-model="editForm.telegramUsername"
              label="Telegram username"
              density="compact"
              variant="outlined"
              hide-details
              class="mb-3"
            />

            <v-text-field
              v-model="editForm.notes"
              label="Notes"
              density="compact"
              variant="outlined"
              hide-details
              class="mb-3"
            />

            <v-select
              v-model="editForm.tier"
              :items="tierOptions"
              label="Tier"
              density="compact"
              variant="outlined"
              hide-details
              class="mb-3"
            />

            <v-divider class="my-3" />

            <!-- Personal Discount -->
            <div class="text-subtitle-2 mb-2">Personal Discount</div>
            <v-row dense class="mb-2">
              <v-col cols="4">
                <v-text-field
                  v-model.number="editForm.personalDiscount"
                  type="number"
                  label="Discount %"
                  density="compact"
                  variant="outlined"
                  hide-details
                  :min="0"
                  :max="100"
                  suffix="%"
                />
              </v-col>
              <v-col cols="5">
                <v-text-field
                  v-model="editForm.discountNote"
                  label="Note (e.g. Founder)"
                  density="compact"
                  variant="outlined"
                  hide-details
                />
              </v-col>
              <v-col cols="3" class="d-flex align-center">
                <v-checkbox
                  v-model="editForm.disableLoyaltyAccrual"
                  label="No accrual"
                  density="compact"
                  hide-details
                />
              </v-col>
            </v-row>

            <v-alert v-if="saveError" type="error" variant="tonal" density="compact" class="mt-2">
              {{ saveError }}
            </v-alert>
          </template>
        </v-card-text>

        <v-card-actions class="px-4 pb-3">
          <!-- View mode actions -->
          <template v-if="!isEditing">
            <v-btn
              variant="tonal"
              :color="selectedCustomer.status === 'active' ? 'error' : 'success'"
              size="small"
              :loading="togglingStatus"
              @click="toggleStatus"
            >
              {{ selectedCustomer.status === 'active' ? 'Deactivate' : 'Activate' }}
            </v-btn>
            <v-btn
              v-if="selectedCustomer.loyaltyProgram !== 'cashback'"
              variant="tonal"
              color="teal"
              size="small"
              :loading="switchingProgram"
              prepend-icon="mdi-arrow-up-bold"
              class="ml-2"
              @click="switchToCashback"
            >
              Switch to Cashback
            </v-btn>
            <v-btn
              variant="tonal"
              color="warning"
              size="small"
              prepend-icon="mdi-merge"
              class="ml-2"
              @click="openMergeDialog"
            >
              Merge Into...
            </v-btn>
            <v-spacer />
            <v-btn variant="outlined" prepend-icon="mdi-pencil" @click="startEditing">Edit</v-btn>
            <v-btn variant="text" @click="showDetail = false">Close</v-btn>
          </template>

          <!-- Edit mode actions -->
          <template v-else>
            <v-spacer />
            <v-btn variant="text" @click="cancelEditing">Cancel</v-btn>
            <v-btn
              color="primary"
              variant="flat"
              :loading="saving"
              :disabled="
                !editForm.name?.trim() ||
                !/^[a-zA-Z0-9\s\u00C0-\u024F\-'.]+$/.test(editForm.name.trim())
              "
              @click="saveCustomer"
            >
              Save
            </v-btn>
          </template>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ========== Create Customer Dialog ========== -->
    <v-dialog v-model="showCreateDialog" max-width="500">
      <v-card>
        <v-card-title class="bg-primary text-white">New Customer</v-card-title>
        <v-card-text class="pt-4">
          <v-text-field
            v-model="createForm.name"
            label="Name *"
            density="compact"
            variant="outlined"
            class="mb-3"
            :rules="nameRules"
          />

          <v-row dense class="mb-3">
            <v-col cols="4">
              <v-select
                v-model="createForm.phoneCode"
                :items="phoneCodes"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="8">
              <v-text-field
                v-model="createForm.phoneNumber"
                label="Phone"
                density="compact"
                variant="outlined"
                hide-details
                inputmode="tel"
              />
            </v-col>
          </v-row>

          <v-text-field
            v-model="createForm.telegramUsername"
            label="Telegram username"
            density="compact"
            variant="outlined"
            hide-details
            class="mb-3"
          />

          <v-text-field
            v-model="createForm.notes"
            label="Notes"
            density="compact"
            variant="outlined"
            hide-details
            class="mb-3"
          />

          <v-divider class="my-3" />

          <!-- Personal Discount (optional for new customer) -->
          <div class="text-subtitle-2 mb-2">Personal Discount (optional)</div>
          <v-row dense class="mb-2">
            <v-col cols="4">
              <v-text-field
                v-model.number="createForm.personalDiscount"
                type="number"
                label="Discount %"
                density="compact"
                variant="outlined"
                hide-details
                :min="0"
                :max="100"
                suffix="%"
              />
            </v-col>
            <v-col cols="5">
              <v-text-field
                v-model="createForm.discountNote"
                label="Note (e.g. Founder)"
                density="compact"
                variant="outlined"
                hide-details
              />
            </v-col>
            <v-col cols="3" class="d-flex align-center">
              <v-checkbox
                v-model="createForm.disableLoyaltyAccrual"
                label="No accrual"
                density="compact"
                hide-details
              />
            </v-col>
          </v-row>

          <v-alert v-if="createError" type="error" variant="tonal" density="compact" class="mt-2">
            {{ createError }}
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showCreateDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            :loading="creating"
            :disabled="
              !createForm.name?.trim() ||
              !/^[a-zA-Z0-9\s\u00C0-\u024F\-'.]+$/.test(createForm.name.trim())
            "
            @click="createCustomer"
          >
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- ========== Merge Customer Dialog ========== -->
    <v-dialog v-model="showMergeDialog" max-width="500">
      <v-card>
        <v-card-title class="bg-warning text-white">Merge Customer</v-card-title>
        <v-card-text class="pt-4">
          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            Merge
            <strong>{{ mergeSource?.name }}</strong>
            into another customer. All orders, transactions, loyalty points, and identities will be
            transferred to the target. This action cannot be undone.
          </v-alert>

          <v-autocomplete
            v-model="mergeTargetId"
            :items="mergeTargetOptions"
            item-title="label"
            item-value="id"
            label="Merge into customer *"
            density="compact"
            variant="outlined"
            placeholder="Search by name, phone, telegram..."
            no-data-text="No matching customers"
            :loading="false"
          />

          <div v-if="mergeTargetId" class="mt-3 pa-3 bg-grey-darken-3 rounded">
            <div class="text-subtitle-2 mb-1">Target: {{ mergeTargetCustomer?.name }}</div>
            <div class="text-caption">
              Balance: {{ formatIDR(mergeTargetCustomer?.loyaltyBalance || 0) }} | Visits:
              {{ mergeTargetCustomer?.totalVisits || 0 }} | Spent:
              {{ formatIDR(mergeTargetCustomer?.totalSpent || 0) }}
            </div>
          </div>

          <v-alert v-if="mergeError" type="error" variant="tonal" density="compact" class="mt-3">
            {{ mergeError }}
          </v-alert>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showMergeDialog = false">Cancel</v-btn>
          <v-btn
            color="warning"
            variant="flat"
            :loading="merging"
            :disabled="!mergeTargetId"
            prepend-icon="mdi-merge"
            @click="executeMerge"
          >
            Merge
          </v-btn>
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
import { usePhoneCodes, buildFullPhone } from '@/composables/usePhoneCodes'

const customersStore = useCustomersStore()
const loyaltyStore = useLoyaltyStore()
const { phoneCodes, defaultPhoneCode } = usePhoneCodes()

const loading = ref(true)
const loadError = ref('')
const search = ref('')
const tierFilter = ref<string | null>(null)
const statusFilter = ref<string | null>(null)

// Detail dialog
const showDetail = ref(false)
const selectedCustomer = ref<Customer | null>(null)
const transactions = ref<LoyaltyTransaction[]>([])
const loadingTx = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const saveError = ref('')
const togglingStatus = ref(false)
const switchingProgram = ref(false)

// Create dialog
const showCreateDialog = ref(false)
const creating = ref(false)
const createError = ref('')

// Merge dialog
const showMergeDialog = ref(false)
const mergeSource = ref<Customer | null>(null)
const mergeTargetId = ref<string | null>(null)
const merging = ref(false)
const mergeError = ref('')

// Edit form
const editForm = ref({
  name: '',
  phoneCode: defaultPhoneCode,
  phoneNumber: '',
  telegramUsername: '',
  notes: '',
  tier: 'member' as string,
  personalDiscount: 0,
  discountNote: '',
  disableLoyaltyAccrual: false
})

// Create form
const createForm = ref({
  name: '',
  phoneCode: defaultPhoneCode,
  phoneNumber: '',
  telegramUsername: '',
  notes: '',
  personalDiscount: 0,
  discountNote: '',
  disableLoyaltyAccrual: false
})

const tierOptions = ['member', 'regular', 'vip']
const statusOptions = ['active', 'blocked']

// Latin-only name validation (no Cyrillic or other scripts)
const nameRules = [
  (v: string) => !!v?.trim() || 'Name is required',
  (v: string) =>
    /^[a-zA-Z0-9\s\u00C0-\u024F\-'.]+$/.test(v?.trim() || '') || 'Only Latin characters allowed'
]

const headers = [
  { title: 'Name', key: 'name', sortable: true },
  { title: 'Program', key: 'loyaltyProgram', sortable: true },
  { title: 'Tier', key: 'tier', sortable: true },
  { title: 'Balance', key: 'loyaltyBalance', sortable: true },
  { title: 'Total Spent', key: 'totalSpent', sortable: true },
  { title: 'Visits', key: 'totalVisits', sortable: true },
  { title: 'Avg Check', key: 'averageCheck', sortable: true },
  { title: 'Discount', key: 'personalDiscount', sortable: true },
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
        (c.telegramUsername && c.telegramUsername.toLowerCase().includes(q)) ||
        (c.phone && c.phone.includes(q))
    )
  }
  if (tierFilter.value) {
    list = list.filter(c => c.tier === tierFilter.value)
  }
  if (statusFilter.value) {
    list = list.filter(c => c.status === statusFilter.value)
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

// Parse phone into code + number for editing
function parsePhone(phone: string | null): { code: string; number: string } {
  if (!phone) return { code: defaultPhoneCode, number: '' }
  // Try to match known codes (sort by length desc to match longest first)
  const sorted = [...phoneCodes].sort((a, b) => b.value.length - a.value.length)
  for (const pc of sorted) {
    if (phone.startsWith(pc.value)) {
      return { code: pc.value, number: phone.slice(pc.value.length) }
    }
  }
  return { code: defaultPhoneCode, number: phone }
}

// ========== Detail / Edit ==========

async function openDetail(customer: Customer) {
  selectedCustomer.value = customer
  isEditing.value = false
  saveError.value = ''
  showDetail.value = true
  loadingTx.value = true

  try {
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

function startEditing() {
  if (!selectedCustomer.value) return
  const c = selectedCustomer.value
  const parsed = parsePhone(c.phone)
  editForm.value = {
    name: c.name,
    phoneCode: parsed.code,
    phoneNumber: parsed.number,
    telegramUsername: c.telegramUsername || '',
    notes: c.notes || '',
    tier: c.tier,
    personalDiscount: c.personalDiscount || 0,
    discountNote: c.discountNote || '',
    disableLoyaltyAccrual: c.disableLoyaltyAccrual || false
  }
  saveError.value = ''
  isEditing.value = true
}

function cancelEditing() {
  isEditing.value = false
  saveError.value = ''
}

async function saveCustomer() {
  if (!selectedCustomer.value || !editForm.value.name.trim()) return
  saving.value = true
  saveError.value = ''

  try {
    const fullPhone = buildFullPhone(editForm.value.phoneCode, editForm.value.phoneNumber)
    const updated = await customersStore.updateCustomer(selectedCustomer.value.id, {
      name: editForm.value.name.trim(),
      phone: fullPhone || null,
      telegramUsername: editForm.value.telegramUsername.trim() || null,
      notes: editForm.value.notes.trim() || null,
      tier: editForm.value.tier,
      personalDiscount: Math.max(0, Math.min(100, editForm.value.personalDiscount || 0)),
      discountNote: editForm.value.discountNote.trim() || null,
      disableLoyaltyAccrual: editForm.value.disableLoyaltyAccrual
    } as Partial<Customer>)
    selectedCustomer.value = updated
    isEditing.value = false
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : 'Failed to save'
  } finally {
    saving.value = false
  }
}

async function toggleStatus() {
  if (!selectedCustomer.value) return
  togglingStatus.value = true
  try {
    const newStatus = selectedCustomer.value.status === 'active' ? 'blocked' : 'active'
    const updated = await customersStore.updateCustomer(selectedCustomer.value.id, {
      status: newStatus
    } as Partial<Customer>)
    selectedCustomer.value = updated
  } catch (err) {
    console.error('Failed to toggle status:', err)
  } finally {
    togglingStatus.value = false
  }
}

async function switchToCashback() {
  if (!selectedCustomer.value) return
  switchingProgram.value = true
  try {
    const updated = await customersStore.updateCustomer(selectedCustomer.value.id, {
      loyaltyProgram: 'cashback'
    } as Partial<Customer>)
    selectedCustomer.value = updated
  } catch (err) {
    console.error('Failed to switch loyalty program:', err)
  } finally {
    switchingProgram.value = false
  }
}

// ========== Create ==========

function openCreateDialog() {
  createForm.value = {
    name: '',
    phoneCode: defaultPhoneCode,
    phoneNumber: '',
    telegramUsername: '',
    notes: '',
    personalDiscount: 0,
    discountNote: '',
    disableLoyaltyAccrual: false
  }
  createError.value = ''
  showCreateDialog.value = true
}

async function createCustomer() {
  if (!createForm.value.name.trim()) return
  creating.value = true
  createError.value = ''

  try {
    const fullPhone = buildFullPhone(createForm.value.phoneCode, createForm.value.phoneNumber)
    await customersStore.createCustomer({
      name: createForm.value.name.trim(),
      phone: fullPhone || null,
      telegramUsername: createForm.value.telegramUsername.trim() || null,
      notes: createForm.value.notes.trim() || null,
      personalDiscount: Math.max(0, Math.min(100, createForm.value.personalDiscount || 0)),
      discountNote: createForm.value.discountNote.trim() || null,
      disableLoyaltyAccrual: createForm.value.disableLoyaltyAccrual
    } as Partial<Customer>)
    showCreateDialog.value = false
  } catch (err) {
    createError.value = err instanceof Error ? err.message : 'Failed to create customer'
  } finally {
    creating.value = false
  }
}

// ========== Merge ==========

const mergeTargetOptions = computed(() => {
  if (!mergeSource.value) return []
  return customersStore.customers
    .filter(c => c.id !== mergeSource.value!.id && c.status === 'active')
    .map(c => ({
      id: c.id,
      label: `${c.name}${c.phone ? ' | ' + c.phone : ''}${c.telegramUsername ? ' | @' + c.telegramUsername : ''} — ${formatIDR(c.totalSpent)}`
    }))
})

const mergeTargetCustomer = computed(() => {
  if (!mergeTargetId.value) return null
  return customersStore.getById(mergeTargetId.value)
})

function openMergeDialog() {
  if (!selectedCustomer.value) return
  mergeSource.value = selectedCustomer.value
  mergeTargetId.value = null
  mergeError.value = ''
  showMergeDialog.value = true
}

async function executeMerge() {
  if (!mergeSource.value || !mergeTargetId.value) return
  merging.value = true
  mergeError.value = ''

  try {
    const result = await customersStore.mergeCustomers(mergeSource.value.id, mergeTargetId.value)
    if (!result.success) {
      mergeError.value = result.error || 'Merge failed'
      return
    }
    showMergeDialog.value = false
    showDetail.value = false
  } catch (err) {
    mergeError.value = err instanceof Error ? err.message : 'Merge failed'
  } finally {
    merging.value = false
  }
}

// ========== Init ==========

onMounted(async () => {
  try {
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
