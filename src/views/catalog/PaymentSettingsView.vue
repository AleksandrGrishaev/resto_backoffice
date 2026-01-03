<!-- src/views/catalog/PaymentSettingsView.vue -->
<template>
  <div class="payment-settings-view">
    <div class="settings-toolbar">
      <!-- Payment Methods Section -->
      <div class="settings-toolbar__section">
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showPaymentMethodDialog">
          Add Payment Method
        </v-btn>
      </div>

      <!-- Tax Section -->
      <div class="settings-toolbar__section">
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showTaxDialog">Add Tax</v-btn>
      </div>

      <!-- Categories Section -->
      <div class="settings-toolbar__section">
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showCategoryDialog">
          Add Category
        </v-btn>
      </div>
    </div>

    <div class="settings-content">
      <v-row>
        <!-- Left column: Payment Methods + Taxes + Expense Settings (stacked) -->
        <v-col cols="12" md="4">
          <div class="d-flex flex-column gap-4">
            <payment-method-list :methods="store.paymentMethods" @edit="editPaymentMethod" />
            <tax-list :taxes="store.taxes" @edit="editTax" />

            <!-- Expense Settings Card -->
            <v-card>
              <v-card-title class="text-subtitle-1">
                <v-icon start size="small">mdi-cash-register</v-icon>
                POS Expense Settings
              </v-card-title>
              <v-card-text>
                <v-switch
                  v-model="expenseSettings.allowCashierDirectExpense"
                  color="primary"
                  hide-details
                  density="compact"
                  :loading="savingExpenseSettings"
                  @update:model-value="saveExpenseSettings"
                >
                  <template #label>
                    <div>
                      <div class="text-body-2">Allow POS Payments</div>
                      <div class="text-caption text-medium-emphasis">
                        Cashiers can make supplier payments from POS
                      </div>
                    </div>
                  </template>
                </v-switch>
              </v-card-text>
            </v-card>

            <!-- Payment Tolerance Settings Card -->
            <v-card>
              <v-card-title class="text-subtitle-1">
                <v-icon start size="small">mdi-tune-vertical</v-icon>
                Payment Tolerance
              </v-card-title>
              <v-card-text>
                <v-text-field
                  v-model.number="toleranceSettings.paymentTolerance"
                  label="Tolerance Amount (IDR)"
                  type="number"
                  variant="outlined"
                  density="compact"
                  :min="0"
                  :step="100"
                  :hint="toleranceHint"
                  persistent-hint
                  :loading="savingTolerance"
                  @update:model-value="debouncedSaveTolerance"
                >
                  <template #prepend-inner>
                    <span class="text-body-2 text-medium-emphasis">Rp</span>
                  </template>
                </v-text-field>

                <v-switch
                  v-model="toleranceSettings.roundToWholeUnits"
                  color="primary"
                  density="compact"
                  hide-details
                  class="mt-4"
                  :loading="savingTolerance"
                  @update:model-value="saveToleranceSettings"
                >
                  <template #label>
                    <div>
                      <div class="text-body-2">Round to Whole IDR</div>
                      <div class="text-caption text-medium-emphasis">
                        Remove decimals from all calculations
                      </div>
                    </div>
                  </template>
                </v-switch>

                <v-alert
                  v-if="toleranceSettings.paymentTolerance === 0"
                  type="info"
                  variant="tonal"
                  density="compact"
                  class="mt-4"
                >
                  <v-icon size="small" start>mdi-information</v-icon>
                  Exact matching required - no tolerance allowed
                </v-alert>
              </v-card-text>
            </v-card>
          </div>
        </v-col>

        <!-- Right column: Categories (more space for 17 items) -->
        <v-col cols="12" md="8">
          <transaction-category-list
            :categories="accountStore.transactionCategories"
            @edit="editCategory"
          />
        </v-col>
      </v-row>
    </div>

    <!-- Dialogs -->
    <payment-method-dialog
      v-model="dialogs.paymentMethod"
      :method="editingMethod"
      @saved="handlePaymentMethodSaved"
    />

    <tax-dialog v-model="dialogs.tax" :tax="editingTax" @saved="handleTaxSaved" />

    <transaction-category-dialog
      v-model="dialogs.category"
      :category="editingCategory"
      @saved="handleCategorySaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import {
  usePaymentSettingsStore,
  type PaymentToleranceSettings
} from '@/stores/catalog/payment-settings.store'
import { useAccountStore } from '@/stores/account'
import { supabase } from '@/supabase'
import type { PaymentMethod } from '@/types/payment'
import type { Tax } from '@/types/tax'
import type { TransactionCategory } from '@/stores/account/types'
import { DebugUtils, formatIDR, DEFAULT_PAYMENT_TOLERANCE } from '@/utils'
import PaymentMethodList from '@/views/catalog/payment-methods/PaymentMethodList.vue'
import TaxList from '@/components/payment-settings/TaxList.vue'
import PaymentMethodDialog from '@/views/catalog/payment-methods/PaymentMethodDialog.vue'
import TaxDialog from '@/components/payment-settings/TaxDialog.vue'
import TransactionCategoryList from '@/views/catalog/categories/TransactionCategoryList.vue'
import TransactionCategoryDialog from '@/views/catalog/categories/TransactionCategoryDialog.vue'

const MODULE_NAME = 'PaymentSettingsView'
const store = usePaymentSettingsStore()
const accountStore = useAccountStore()

// Expense Settings State
interface ExpenseSettings {
  defaultExpenseMode: string
  allowCashierDirectExpense: boolean
  autoSuggestThreshold: number
}

const expenseSettings = reactive<ExpenseSettings>({
  defaultExpenseMode: 'backoffice_first',
  allowCashierDirectExpense: true,
  autoSuggestThreshold: 0.05
})
const savingExpenseSettings = ref(false)

// Tolerance Settings State
const toleranceSettings = reactive<PaymentToleranceSettings>({
  paymentTolerance: DEFAULT_PAYMENT_TOLERANCE,
  roundToWholeUnits: true
})
const savingTolerance = ref(false)

const toleranceHint = computed(() => {
  if (toleranceSettings.paymentTolerance === 0) {
    return 'Exact matching required'
  }
  return `Differences up to ${formatIDR(toleranceSettings.paymentTolerance)} will be considered fully paid`
})

// Load expense settings from DB
async function loadExpenseSettings() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'expense_settings')
      .single()

    if (error) throw error
    if (data?.value) {
      Object.assign(expenseSettings, data.value)
    }
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Failed to load expense settings', { err })
  }
}

// Save expense settings to DB
async function saveExpenseSettings() {
  savingExpenseSettings.value = true
  try {
    const { error } = await supabase.from('app_settings').upsert({
      key: 'expense_settings',
      value: {
        defaultExpenseMode: expenseSettings.defaultExpenseMode,
        allowCashierDirectExpense: expenseSettings.allowCashierDirectExpense,
        autoSuggestThreshold: expenseSettings.autoSuggestThreshold
      },
      updated_at: new Date().toISOString()
    })

    if (error) throw error
    DebugUtils.info(MODULE_NAME, 'Expense settings saved', { expenseSettings })
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Failed to save expense settings', { err })
  } finally {
    savingExpenseSettings.value = false
  }
}

// Load tolerance settings from store
function loadToleranceSettings() {
  Object.assign(toleranceSettings, store.toleranceSettings)
}

// Save tolerance settings
async function saveToleranceSettings() {
  savingTolerance.value = true
  try {
    await store.updateToleranceSettings(toleranceSettings)
    DebugUtils.info(MODULE_NAME, 'Tolerance settings saved', { toleranceSettings })
  } catch (err) {
    DebugUtils.error(MODULE_NAME, 'Failed to save tolerance settings', { err })
  } finally {
    savingTolerance.value = false
  }
}

// Debounced save for text field
let toleranceDebounceTimer: ReturnType<typeof setTimeout> | null = null
function debouncedSaveTolerance() {
  if (toleranceDebounceTimer) clearTimeout(toleranceDebounceTimer)
  toleranceDebounceTimer = setTimeout(saveToleranceSettings, 500)
}

// State
const dialogs = ref({
  paymentMethod: false,
  tax: false,
  category: false
})

const editingMethod = ref<PaymentMethod | null>(null)
const editingTax = ref<Tax | null>(null)
const editingCategory = ref<TransactionCategory | null>(null)

// Methods
function showPaymentMethodDialog() {
  editingMethod.value = null
  dialogs.value.paymentMethod = true
}

function showTaxDialog() {
  editingTax.value = null
  dialogs.value.tax = true
}

function showCategoryDialog() {
  editingCategory.value = null
  dialogs.value.category = true
}

function editPaymentMethod(method: PaymentMethod) {
  editingMethod.value = method
  dialogs.value.paymentMethod = true
}

function editTax(tax: Tax) {
  editingTax.value = tax
  dialogs.value.tax = true
}

function editCategory(category: TransactionCategory) {
  editingCategory.value = category
  dialogs.value.category = true
}

function handlePaymentMethodSaved() {
  dialogs.value.paymentMethod = false
  editingMethod.value = null
}

function handleTaxSaved() {
  dialogs.value.tax = false
  editingTax.value = null
}

function handleCategorySaved() {
  dialogs.value.category = false
  editingCategory.value = null
}

// Initial load
onMounted(async () => {
  try {
    DebugUtils.debug(MODULE_NAME, 'Component mounted')
    await Promise.all([store.initialize(), loadExpenseSettings()])
    // Load tolerance settings after store is initialized
    loadToleranceSettings()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to initialize', { error })
  }
})
</script>

<style lang="scss" scoped>
.payment-settings-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  background: var(--color-surface);
  padding: 16px;
  border-radius: 8px;
}

.settings-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
}
</style>
