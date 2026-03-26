<!-- src/views/pos/loyalty/LoyaltyPanel.vue -->
<template>
  <div class="loyalty-panel">
    <!-- Collapsed state: single row with loyalty info or attach button (hidden in dialog mode) -->
    <div
      v-if="!expanded && !dialogMode"
      class="loyalty-collapsed d-flex align-center gap-2 px-3 py-2"
    >
      <!-- Customer attached -->
      <template v-if="attachedCustomer">
        <v-chip
          size="small"
          :color="attachedCustomer.personalDiscount > 0 ? 'orange' : tierColor"
          variant="flat"
          class="text-white"
        >
          {{
            attachedCustomer.personalDiscount > 0 ? 'DISCOUNT' : attachedCustomer.tier.toUpperCase()
          }}
        </v-chip>
        <span class="text-body-2 text-truncate flex-grow-1">
          {{ attachedCustomer.name }}
        </span>
        <v-chip
          v-if="attachedCustomer.personalDiscount > 0"
          size="x-small"
          color="orange"
          variant="tonal"
        >
          {{ attachedCustomer.personalDiscount }}%
        </v-chip>
        <span class="text-body-2 font-weight-medium">
          {{ formatIDR(attachedCustomer.loyaltyBalance) }}
        </span>
        <v-btn
          v-if="isPrinterConnected"
          icon
          size="x-small"
          variant="text"
          color="amber-darken-2"
          :loading="printingInvite"
          @click="handlePrintInviteQR"
        >
          <v-icon size="16">mdi-qrcode</v-icon>
          <v-tooltip activator="parent" location="top">Print Invite QR</v-tooltip>
        </v-btn>
        <v-alert
          v-if="inviteError"
          type="error"
          variant="tonal"
          density="compact"
          closable
          class="mt-1"
          @click:close="inviteError = null"
        >
          {{ inviteError }}
        </v-alert>
        <v-btn icon size="x-small" variant="text" @click="expanded = true">
          <v-icon size="16">mdi-pencil</v-icon>
        </v-btn>
        <v-btn icon size="x-small" variant="text" color="error" @click="detachCustomer">
          <v-icon size="16">mdi-close</v-icon>
        </v-btn>
      </template>

      <!-- Stamp card attached (no customer) -->
      <template v-else-if="attachedCard">
        <v-icon size="18" color="amber">mdi-stamper</v-icon>
        <span class="text-body-2 flex-grow-1">
          Card #{{ attachedCard.cardNumber }} &mdash; {{ attachedCard.stamps }}/{{
            attachedCard.stampsPerCycle
          }}
          stamps
        </span>
        <v-btn icon size="x-small" variant="text" @click="expanded = true">
          <v-icon size="16">mdi-pencil</v-icon>
        </v-btn>
        <v-btn icon size="x-small" variant="text" color="error" @click="detachCard">
          <v-icon size="16">mdi-close</v-icon>
        </v-btn>
      </template>

      <!-- Nothing attached -->
      <template v-else>
        <v-btn
          size="small"
          variant="tonal"
          color="amber-darken-2"
          prepend-icon="mdi-stamper"
          @click="openTab('card')"
        >
          Stamp Card
        </v-btn>
        <v-btn
          size="small"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-account-star"
          @click="openTab('customer')"
        >
          Customer
        </v-btn>
      </template>
    </div>

    <!-- Expanded state: search/input -->
    <div v-else class="loyalty-expanded px-3 py-2">
      <div class="d-flex align-center justify-space-between mb-2">
        <v-btn-toggle v-model="activeTab" mandatory density="compact" variant="outlined">
          <v-btn value="scan" size="small">
            <v-icon start size="16">mdi-qrcode-scan</v-icon>
            Scan
          </v-btn>
          <v-btn value="card" size="small">
            <v-icon start size="16">mdi-stamper</v-icon>
            Card
          </v-btn>
          <v-btn value="customer" size="small">
            <v-icon start size="16">mdi-account-star</v-icon>
            Customer
          </v-btn>
        </v-btn-toggle>
        <v-btn v-if="!dialogMode" icon size="x-small" variant="text" @click="expanded = false">
          <v-icon size="16">mdi-chevron-up</v-icon>
        </v-btn>
      </div>

      <!-- QR Scan Tab -->
      <div v-if="activeTab === 'scan'">
        <!-- Found customer result -->
        <div v-if="scannedCustomer" class="scanned-result pa-3 rounded loyalty-surface mb-2">
          <div class="d-flex align-center justify-space-between mb-2">
            <div class="d-flex align-center gap-2">
              <v-icon size="20" color="success">mdi-check-circle</v-icon>
              <span class="text-body-1 font-weight-medium">{{ scannedCustomer.name }}</span>
            </div>
            <v-chip
              size="x-small"
              :color="
                scannedCustomer.personalDiscount > 0 ? 'orange' : getTierColor(scannedCustomer.tier)
              "
              variant="flat"
              class="text-white"
            >
              {{
                scannedCustomer.personalDiscount > 0
                  ? `DISCOUNT ${scannedCustomer.personalDiscount}%`
                  : scannedCustomer.tier.toUpperCase()
              }}
            </v-chip>
          </div>
          <div class="d-flex align-center gap-4 text-body-2 mb-3">
            <span>
              <v-icon size="14" class="mr-1">mdi-wallet</v-icon>
              {{ formatIDR(scannedCustomer.loyaltyBalance) }}
            </span>
            <span class="text-medium-emphasis">{{ scannedCustomer.totalVisits }} visits</span>
            <span v-if="scannedCustomer.phone" class="text-medium-emphasis">
              {{ scannedCustomer.phone }}
            </span>
          </div>
          <div class="d-flex gap-2">
            <v-btn color="primary" variant="flat" size="small" @click="confirmScannedCustomer">
              Attach
            </v-btn>
            <v-btn variant="outlined" size="small" @click="resetScan">Scan Again</v-btn>
          </div>
        </div>

        <!-- Scanner -->
        <QrScanner
          v-if="!scannedCustomer && !scanLoading"
          ref="qrScannerRef"
          @scanned="onQrScanned"
          @error="onQrError"
        />

        <!-- Scan status -->
        <v-alert
          v-if="scanError"
          type="error"
          variant="tonal"
          density="compact"
          closable
          class="mt-2"
          @click:close="scanError = ''"
        >
          {{ scanError }}
          <template #append>
            <v-btn size="small" variant="text" @click="resetScan">Retry</v-btn>
          </template>
        </v-alert>

        <div v-if="scanLoading" class="d-flex align-center justify-center pa-4 gap-2">
          <v-progress-circular size="20" width="2" indeterminate />
          <span class="text-body-2 text-medium-emphasis">Looking up customer...</span>
        </div>
      </div>

      <!-- Stamp Card Tab -->
      <div v-if="activeTab === 'card'">
        <div class="d-flex gap-2 mb-2">
          <v-text-field
            v-model="cardNumber"
            placeholder="Card number (e.g. 001)"
            density="compact"
            variant="outlined"
            hide-details
            inputmode="numeric"
            class="flex-grow-1"
            @keyup.enter="findCard"
            @input="debouncedCardSearch"
          />
          <v-btn
            color="primary"
            variant="flat"
            density="compact"
            :loading="loading"
            @click="findCard"
          >
            Find
          </v-btn>
          <v-btn
            variant="outlined"
            density="compact"
            :loading="issuingCard"
            @click="openNewCardForm"
          >
            New
          </v-btn>
        </div>

        <!-- Card search results -->
        <v-list
          v-if="cardSearchResults.length > 0 && !attachedCard"
          density="compact"
          class="search-results mb-2"
        >
          <v-list-item v-for="c in cardSearchResults" :key="c.id" @click="selectCardFromSearch(c)">
            <template #prepend>
              <v-icon size="18" color="amber" class="mr-2">mdi-stamper</v-icon>
            </template>
            <v-list-item-title class="text-body-2">
              #{{ c.cardNumber }}
              <span v-if="c.customerName" class="text-medium-emphasis ml-2">
                {{ c.customerName }}
              </span>
            </v-list-item-title>
            <template #append>
              <v-chip size="x-small" :color="c.status === 'active' ? 'success' : 'grey'">
                {{ c.status }}
              </v-chip>
            </template>
          </v-list-item>
        </v-list>

        <!-- Card not found error -->
        <v-alert
          v-if="cardError"
          type="error"
          variant="tonal"
          density="compact"
          closable
          class="mb-2"
          @click:close="cardError = ''"
        >
          {{ cardError }}
        </v-alert>

        <!-- New card form -->
        <div v-if="showNewCard" class="new-customer pa-2 rounded loyalty-surface mb-2">
          <div class="text-body-2 font-weight-medium mb-2">New Stamp Card</div>
          <v-text-field
            :model-value="newCardNumber"
            label="Card number"
            density="compact"
            variant="outlined"
            hide-details
            readonly
            class="mb-2"
          />
          <NumericInputField
            v-model="newCardStamps"
            label="Initial stamps (for existing cards)"
            density="compact"
            variant="outlined"
            hide-details
            :min="0"
            :max="100"
            class="mb-2"
          />
          <v-text-field
            v-model="newCardOwnerName"
            placeholder="Owner name (optional)"
            density="compact"
            variant="outlined"
            hide-details
            class="mb-2"
          />
          <div class="d-flex gap-2 mb-2">
            <v-select
              :model-value="newCardPhone.selectedCountry.value.code"
              :items="newCardPhone.countries"
              item-value="code"
              density="compact"
              variant="outlined"
              hide-details
              style="max-width: 120px; flex-shrink: 0"
              @update:model-value="newCardPhone.setCountry($event)"
            >
              <template #selection="{ item }">{{ item.raw.flag }} {{ item.raw.dial }}</template>
              <template #item="{ item, props: itemProps }">
                <v-list-item
                  v-bind="itemProps"
                  :title="`${item.raw.flag} ${item.raw.name}`"
                  :subtitle="item.raw.dial"
                />
              </template>
            </v-select>
            <v-text-field
              v-model="newCardPhone.localNumber.value"
              :placeholder="newCardPhone.selectedCountry.value.format || 'Phone number'"
              density="compact"
              variant="outlined"
              hide-details
              inputmode="tel"
              class="flex-grow-1"
            />
          </div>
          <v-alert v-if="newCardError" type="error" variant="tonal" density="compact" class="mb-2">
            {{ newCardError }}
          </v-alert>
          <div class="d-flex gap-2">
            <v-btn
              size="small"
              variant="flat"
              color="primary"
              :loading="issuingCard"
              @click="createNewCard"
            >
              Create Card
            </v-btn>
            <v-btn size="small" variant="text" @click="showNewCard = false">Cancel</v-btn>
          </div>
        </div>

        <!-- Card info -->
        <div v-if="attachedCard" class="card-info pa-2 rounded loyalty-surface">
          <div class="d-flex align-center justify-space-between">
            <span class="text-body-2 font-weight-medium">Card #{{ attachedCard.cardNumber }}</span>
            <div class="d-flex align-center gap-1">
              <v-chip size="x-small" :color="attachedCard.status === 'active' ? 'success' : 'grey'">
                {{ attachedCard.status }}
              </v-chip>
              <v-btn icon size="x-small" variant="text" color="error" @click="detachCard">
                <v-icon size="14">mdi-close</v-icon>
              </v-btn>
            </div>
          </div>
          <div class="d-flex align-center gap-4 mt-1">
            <span class="text-body-2">
              <v-icon size="14" class="mr-1">mdi-stamper</v-icon>
              {{ attachedCard.stamps }}/{{ attachedCard.stampsPerCycle }}
            </span>
            <span v-if="attachedCard.activeReward" class="text-body-2 text-success">
              <v-icon size="14" class="mr-1">mdi-gift</v-icon>
              {{ attachedCard.activeReward.category }} (up to
              {{ formatIDR(attachedCard.activeReward.maxDiscount) }})
            </span>
            <span v-if="attachedCard.lastVisit" class="text-body-2 text-medium-emphasis">
              Last: {{ formatRelative(attachedCard.lastVisit) }}
            </span>
          </div>
          <!-- Convert button if customer exists -->
          <v-btn
            v-if="attachedCustomer && attachedCard.status === 'active'"
            size="small"
            variant="tonal"
            color="deep-purple"
            class="mt-2"
            prepend-icon="mdi-swap-horizontal"
            @click="$emit('convert-card')"
          >
            Convert to Points
          </v-btn>
        </div>
      </div>

      <!-- Customer Tab -->
      <div v-if="activeTab === 'customer'">
        <div class="d-flex gap-2 mb-2">
          <v-text-field
            v-model="customerQuery"
            placeholder="Search name, phone or telegram..."
            density="compact"
            variant="outlined"
            hide-details
            inputmode="text"
            class="flex-grow-1"
            @input="debouncedSearch"
          />
          <v-btn variant="outlined" density="compact" @click="showNewCustomer = true">New</v-btn>
        </div>

        <!-- Search results -->
        <v-list v-if="searchResults.length > 0" density="compact" class="search-results">
          <v-list-item
            v-for="c in searchResults"
            :key="c.id"
            :title="c.name"
            :subtitle="`${c.personalDiscount > 0 ? 'DISCOUNT ' + c.personalDiscount + '%' : c.tier.toUpperCase()} | ${formatIDR(c.loyaltyBalance)}${c.phone ? ' | ' + c.phone : ''}${c.telegramUsername ? ' | @' + c.telegramUsername : ''}`"
            @click="selectCustomer(c)"
          >
            <template #prepend>
              <v-chip
                size="x-small"
                :color="c.personalDiscount > 0 ? 'orange' : getTierColor(c.tier)"
                variant="flat"
                class="text-white mr-2"
              >
                {{ c.personalDiscount > 0 ? 'D' : c.tier[0].toUpperCase() }}
              </v-chip>
            </template>
          </v-list-item>
        </v-list>

        <!-- Attached customer details -->
        <div
          v-if="attachedCustomer && searchResults.length === 0"
          class="customer-info pa-2 rounded loyalty-surface"
        >
          <div class="d-flex align-center justify-space-between">
            <span class="text-body-2 font-weight-medium">{{ attachedCustomer.name }}</span>
            <div class="d-flex align-center gap-1">
              <v-chip
                size="x-small"
                :color="attachedCustomer.personalDiscount > 0 ? 'orange' : tierColor"
                variant="flat"
                class="text-white"
              >
                {{
                  attachedCustomer.personalDiscount > 0
                    ? `DISCOUNT ${attachedCustomer.personalDiscount}%`
                    : `${attachedCustomer.tier.toUpperCase()} (${cashbackPct}%)`
                }}
              </v-chip>
              <v-btn icon size="x-small" variant="text" color="error" @click="detachCustomer">
                <v-icon size="14">mdi-close</v-icon>
              </v-btn>
            </div>
          </div>
          <div class="d-flex align-center gap-4 mt-1 flex-wrap">
            <span class="text-body-2">
              <v-icon size="14" class="mr-1">mdi-wallet</v-icon>
              {{ formatIDR(attachedCustomer.loyaltyBalance) }}
            </span>
            <span class="text-body-2 text-medium-emphasis">
              {{ attachedCustomer.totalVisits }} visits
            </span>
            <v-chip
              v-if="attachedCustomer.personalDiscount > 0"
              size="x-small"
              color="orange"
              variant="tonal"
            >
              <v-icon start size="12">mdi-percent</v-icon>
              {{ attachedCustomer.personalDiscount }}%
              {{ attachedCustomer.discountNote || 'Personal' }}
            </v-chip>
            <v-chip
              v-if="attachedCustomer.disableLoyaltyAccrual"
              size="x-small"
              color="grey"
              variant="tonal"
            >
              No accrual
            </v-chip>
          </div>
        </div>

        <!-- Conversion result toast -->
        <v-alert
          v-if="conversionResult"
          type="success"
          variant="tonal"
          density="compact"
          closable
          class="mb-2"
          @click:close="conversionResult = null"
        >
          <div class="text-body-2">
            Converted {{ conversionResult.stamps }} stamp(s) →
            <strong>{{ formatIDR(conversionResult.totalPoints) }}</strong>
            points
            <template v-if="conversionResult.bonus > 0">
              (incl. {{ formatIDR(conversionResult.bonus) }} bonus)
            </template>
          </div>
        </v-alert>

        <!-- New customer mini-form -->
        <div v-if="showNewCustomer" class="new-customer pa-2 rounded loyalty-surface mt-2">
          <v-text-field
            v-model="newCustomerName"
            placeholder="Customer name *"
            density="compact"
            variant="outlined"
            hide-details
            class="mb-2"
          />
          <div class="d-flex gap-2 mb-2">
            <v-select
              :model-value="newCustomerPhone.selectedCountry.value.code"
              :items="newCustomerPhone.countries"
              item-value="code"
              density="compact"
              variant="outlined"
              hide-details
              style="max-width: 120px; flex-shrink: 0"
              @update:model-value="newCustomerPhone.setCountry($event)"
            >
              <template #selection="{ item }">{{ item.raw.flag }} {{ item.raw.dial }}</template>
              <template #item="{ item, props: itemProps }">
                <v-list-item
                  v-bind="itemProps"
                  :title="`${item.raw.flag} ${item.raw.name}`"
                  :subtitle="item.raw.dial"
                />
              </template>
            </v-select>
            <v-text-field
              v-model="newCustomerPhone.localNumber.value"
              :placeholder="newCustomerPhone.selectedCountry.value.format || 'Phone number'"
              density="compact"
              variant="outlined"
              hide-details
              inputmode="tel"
              class="flex-grow-1"
            />
          </div>
          <v-text-field
            v-model="newCustomerTelegram"
            placeholder="Telegram username (optional)"
            density="compact"
            variant="outlined"
            hide-details
            class="mb-2"
          />
          <div class="mb-2">
            <div class="text-caption text-medium-emphasis mb-1">Loyalty program</div>
            <v-btn-toggle
              v-model="newCustomerLoyaltyProgram"
              mandatory
              density="compact"
              color="primary"
              class="w-100"
            >
              <v-btn value="stamps" size="small" class="flex-grow-1">Stamps</v-btn>
              <v-btn value="cashback" size="small" class="flex-grow-1">Cashback</v-btn>
            </v-btn-toggle>
          </div>
          <v-text-field
            v-if="newCustomerLoyaltyProgram === 'stamps'"
            v-model="newCustomerCardNumber"
            placeholder="Stamp card number (optional)"
            density="compact"
            variant="outlined"
            hide-details
            inputmode="numeric"
            class="mb-2"
          />
          <v-alert
            v-if="createCustomerError"
            type="error"
            variant="tonal"
            density="compact"
            class="mb-2"
          >
            {{ createCustomerError }}
          </v-alert>
          <div class="d-flex gap-2">
            <v-btn
              size="small"
              variant="flat"
              color="primary"
              :loading="creatingCustomer"
              :disabled="!newCustomerName.trim()"
              @click="createNewCustomer"
            >
              Create
            </v-btn>
            <v-btn size="small" variant="text" @click="showNewCustomer = false">Cancel</v-btn>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Customer } from '@/stores/customers'
import type { StampCardInfo, StampCardListItem, ConvertResult } from '@/stores/loyalty'
import { useCustomersStore } from '@/stores/customers'
import { useLoyaltyStore } from '@/stores/loyalty'
import { formatIDR, DebugUtils } from '@/utils'
import { TimeUtils } from '@/utils'
import { usePhoneInput } from '@/composables/usePhoneInput'
import { NumericInputField } from '@/components/input'
import { supabase } from '@/supabase/client'
import { usePrinter } from '@/core/printing'
import QrScanner from './QrScanner.vue'

const props = defineProps<{
  orderId?: string
  customerId?: string | null
  stampCardId?: string | null
  dialogMode?: boolean
  initialTab?: 'scan' | 'card' | 'customer'
}>()

const emit = defineEmits<{
  'update:customer': [customer: Customer | null]
  'update:card': [card: StampCardInfo | null]
  'convert-card': []
}>()

const customersStore = useCustomersStore()
const loyaltyStore = useLoyaltyStore()
const { isConnected: isPrinterConnected, printInviteQR } = usePrinter()

// Invite QR state
const printingInvite = ref(false)
const inviteError = ref<string | null>(null)

async function handlePrintInviteQR() {
  if (!attachedCustomer.value || printingInvite.value) return

  printingInvite.value = true
  try {
    const { data } = await supabase.rpc('create_customer_invite', {
      p_customer_id: attachedCustomer.value.id
    })

    if (data?.success && data?.url) {
      await printInviteQR(data.url, data.customerName || attachedCustomer.value.name)
    } else {
      DebugUtils.error('LoyaltyPanel', 'Failed to create invite', { data })
      inviteError.value = data?.error || 'Failed to create invite'
    }
  } catch (e) {
    DebugUtils.error('LoyaltyPanel', 'Error creating invite QR', { error: e })
    inviteError.value = 'Failed to print invite QR'
  } finally {
    printingInvite.value = false
  }
}

// State
const expanded = ref(props.dialogMode || false)
const activeTab = ref<'scan' | 'card' | 'customer'>(props.initialTab || 'card')
const loading = ref(false)

function openTab(tab: 'card' | 'customer') {
  expanded.value = true
  activeTab.value = tab
}

// QR scan state
const qrScannerRef = ref<InstanceType<typeof QrScanner>>()
const scannedCustomer = ref<Customer | null>(null)
const scanLoading = ref(false)
const scanError = ref('')

async function onQrScanned(token: string) {
  scanLoading.value = true
  scanError.value = ''
  DebugUtils.info('LoyaltyPanel', 'QR token scanned, looking up customer', {
    token: token.slice(0, 8) + '...'
  })

  try {
    const customer = await customersStore.findByToken(token)
    if (customer) {
      DebugUtils.info('LoyaltyPanel', 'Customer found via QR', {
        name: customer.name,
        tier: customer.tier
      })
      scannedCustomer.value = customer
    } else {
      DebugUtils.info('LoyaltyPanel', 'Customer not found for token')
      scanError.value = 'Customer not found. QR code may be invalid or account is inactive.'
    }
  } catch (err) {
    DebugUtils.error('LoyaltyPanel', 'QR customer lookup failed', { error: String(err) })
    scanError.value = 'Failed to look up customer. Please try again.'
  } finally {
    scanLoading.value = false
  }
}

function onQrError(message: string) {
  scanError.value = message
}

function confirmScannedCustomer() {
  if (!scannedCustomer.value) return
  selectCustomer(scannedCustomer.value)
  scannedCustomer.value = null
}

function resetScan() {
  scannedCustomer.value = null
  scanError.value = ''
  scanLoading.value = false
  // QrScanner is re-created via v-if, auto-starts on mount
}
const issuingCard = ref(false)
const creatingCustomer = ref(false)

// Card state
const cardNumber = ref('')
const cardError = ref('')
const attachedCard = ref<StampCardInfo | null>(null)
const cardSearchResults = ref<StampCardListItem[]>([])

// New card form state
const showNewCard = ref(false)
const newCardNumber = ref('')
const newCardStamps = ref(0)
const newCardOwnerName = ref('')
const newCardError = ref('')
const newCardPhone = usePhoneInput()

// Customer state
const customerQuery = ref('')
const searchResults = ref<Customer[]>([])
const attachedCustomer = ref<Customer | null>(null)
const showNewCustomer = ref(false)
const newCustomerName = ref('')
const newCustomerPhone = usePhoneInput()
const newCustomerTelegram = ref('')
const newCustomerCardNumber = ref('')
const newCustomerLoyaltyProgram = ref<'stamps' | 'cashback'>('stamps')
const createCustomerError = ref('')
const conversionResult = ref<ConvertResult | null>(null)

// Computed
const tierColor = computed(() => getTierColor(attachedCustomer.value?.tier || 'member'))

const cashbackPct = computed(() => {
  if (!attachedCustomer.value) return 5
  return loyaltyStore.cashbackRateForTier(attachedCustomer.value.tier)
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

// Sync initialTab from dialog parent
watch(
  () => props.initialTab,
  tab => {
    if (tab) activeTab.value = tab
  }
)

// Stop camera when leaving scan tab or panel collapses
watch(activeTab, (newTab, oldTab) => {
  if (oldTab === 'scan' && newTab !== 'scan') {
    cleanupScan()
  }
})

watch(expanded, val => {
  if (!val && activeTab.value === 'scan') {
    cleanupScan()
  }
})

function cleanupScan() {
  qrScannerRef.value?.stop()
  scannedCustomer.value = null
  scanError.value = ''
  scanLoading.value = false
}

// In dialog mode, always stay expanded
watch(
  () => props.dialogMode,
  val => {
    if (val) expanded.value = true
  }
)

// Restore from props
watch(
  () => props.customerId,
  async id => {
    if (id && !attachedCustomer.value) {
      // Try cache first, then fetch from DB
      let c = customersStore.getById(id)
      if (!c) {
        try {
          await customersStore.refreshCustomer(id)
          c = customersStore.getById(id)
        } catch {
          /* not critical */
        }
      }
      if (c) {
        attachedCustomer.value = c
        // Auto-switch to customer tab if in dialog mode
        if (props.dialogMode) activeTab.value = 'customer'
      }
    }
    if (!id) attachedCustomer.value = null
  },
  { immediate: true }
)

// M1 FIX: Restore stamp card from prop
watch(
  () => props.stampCardId,
  async id => {
    if (id && !attachedCard.value) {
      try {
        const card = await loyaltyStore.getCardById(id)
        if (card) {
          attachedCard.value = card
          cardNumber.value = card.cardNumber
          if (props.dialogMode) activeTab.value = 'card'
        }
      } catch {
        // Card lookup failed, not critical
      }
    }
    if (!id) {
      attachedCard.value = null
      cardNumber.value = ''
    }
  },
  { immediate: true }
)

// Card actions
async function findCard() {
  if (!cardNumber.value.trim()) return
  loading.value = true
  cardError.value = ''
  cardSearchResults.value = []

  try {
    const info = await loyaltyStore.getCardInfo(cardNumber.value.trim())
    attachedCard.value = info
    emit('update:card', info)
    // Don't collapse — let the user see the card info and decide
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Show user-friendly error
    if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('no rows')) {
      cardError.value = `Card #${cardNumber.value.trim()} not found. Check the number or create a new card.`
    } else {
      cardError.value = msg
    }
    attachedCard.value = null
    emit('update:card', null)
  } finally {
    loading.value = false
  }
}

// Card search (debounced)
let cardSearchTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedCardSearch() {
  if (cardSearchTimeout) clearTimeout(cardSearchTimeout)
  cardSearchTimeout = setTimeout(async () => {
    const q = cardNumber.value.trim()
    if (q.length < 1) {
      cardSearchResults.value = []
      return
    }
    cardSearchResults.value = await loyaltyStore.searchCards(q)
  }, 300)
}

async function selectCardFromSearch(card: StampCardListItem) {
  cardNumber.value = card.cardNumber
  cardSearchResults.value = []
  await findCard()
}

async function openNewCardForm() {
  showNewCard.value = true
  newCardStamps.value = 0
  newCardOwnerName.value = ''
  newCardPhone.localNumber.value = ''
  newCardError.value = ''
  try {
    newCardNumber.value = await loyaltyStore.getNextCardNumber()
  } catch {
    newCardNumber.value = '???'
  }
}

async function createNewCard() {
  issuingCard.value = true
  newCardError.value = ''
  try {
    const stamps = newCardStamps.value > 0 ? newCardStamps.value : undefined
    const createdNumber = await loyaltyStore.issueNewCard({
      cardNumber: newCardNumber.value,
      stamps: stamps && !isNaN(stamps) ? stamps : undefined,
      customerName: newCardOwnerName.value || undefined,
      customerPhone: newCardPhone.fullPhone.value || undefined
    })
    cardNumber.value = createdNumber
    showNewCard.value = false
    await findCard()
  } catch (err) {
    newCardError.value = err instanceof Error ? err.message : 'Failed to create card'
  } finally {
    issuingCard.value = false
  }
}

function detachCard() {
  attachedCard.value = null
  cardNumber.value = ''
  emit('update:card', null)
}

// Customer actions
let searchTimeout: ReturnType<typeof setTimeout> | null = null
function debouncedSearch() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    if (customerQuery.value.trim().length < 2) {
      searchResults.value = []
      return
    }
    searchResults.value = await customersStore.searchCustomers(customerQuery.value.trim())
  }, 300)
}

function selectCustomer(customer: Customer) {
  attachedCustomer.value = customer
  searchResults.value = []
  customerQuery.value = ''
  emit('update:customer', customer)
  // Don't collapse — let operator continue (e.g. attach card too)
}

function detachCustomer() {
  attachedCustomer.value = null
  emit('update:customer', null)
}

async function createNewCustomer() {
  if (!newCustomerName.value.trim()) return
  creatingCustomer.value = true
  createCustomerError.value = ''

  try {
    let customer = await customersStore.createCustomer({
      name: newCustomerName.value.trim(),
      phone: newCustomerPhone.fullPhone.value || undefined,
      telegramUsername: newCustomerTelegram.value.trim() || undefined,
      loyaltyProgram: newCustomerLoyaltyProgram.value
    } as any)

    // If stamp card number provided, link it and auto-convert stamps to points
    const cardNum = newCustomerCardNumber.value.trim()
    if (cardNum) {
      try {
        await loyaltyStore.linkCardToCustomer(cardNum, customer.id)
        // Auto-convert: stamps → loyalty points + 10% bonus
        const result = await loyaltyStore.convertCard(cardNum, customer.id)
        if (result.success && result.stamps > 0) {
          conversionResult.value = result
          // Refresh customer to get updated loyalty_balance from DB
          await customersStore.refreshCustomer(customer.id)
          const updated = customersStore.getById(customer.id)
          if (updated) customer = updated
        }
      } catch {
        // Card linking/conversion is optional — don't block customer creation
      }
    }

    selectCustomer(customer)
    showNewCustomer.value = false
    newCustomerName.value = ''
    newCustomerPhone.localNumber.value = ''
    newCustomerTelegram.value = ''
    newCustomerCardNumber.value = ''
    newCustomerLoyaltyProgram.value = 'stamps'
  } catch (err) {
    createCustomerError.value = err instanceof Error ? err.message : 'Failed to create customer'
  } finally {
    creatingCustomer.value = false
  }
}
</script>

<style scoped lang="scss">
.loyalty-panel {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  background: rgb(var(--v-theme-surface));
}

.loyalty-collapsed {
  min-height: 36px;
}

.search-results {
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
}

.card-info,
.customer-info,
.new-customer,
.scanned-result {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.loyalty-surface {
  background: rgba(var(--v-theme-on-surface), 0.05);
}
</style>
