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
        <!-- Left column: Payment Methods + Taxes (stacked) -->
        <v-col cols="12" md="4">
          <div class="d-flex flex-column gap-4">
            <payment-method-list :methods="store.paymentMethods" @edit="editPaymentMethod" />
            <tax-list :taxes="store.taxes" @edit="editTax" />
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
import { ref, onMounted } from 'vue'
import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'
import { useAccountStore } from '@/stores/account'
import type { PaymentMethod } from '@/types/payment'
import type { Tax } from '@/types/tax'
import type { TransactionCategory } from '@/stores/account/types'
import { DebugUtils } from '@/utils'
import PaymentMethodList from '@/views/catalog/payment-methods/PaymentMethodList.vue'
import TaxList from '@/components/payment-settings/TaxList.vue'
import PaymentMethodDialog from '@/views/catalog/payment-methods/PaymentMethodDialog.vue'
import TaxDialog from '@/components/payment-settings/TaxDialog.vue'
import TransactionCategoryList from '@/views/catalog/categories/TransactionCategoryList.vue'
import TransactionCategoryDialog from '@/views/catalog/categories/TransactionCategoryDialog.vue'

const MODULE_NAME = 'PaymentSettingsView'
const store = usePaymentSettingsStore()
const accountStore = useAccountStore()

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
    await store.initialize()
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
