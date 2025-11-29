<!-- src/views/catalog/PaymentSettingsView.vue -->
<template>
  <div class="payment-settings-view">
    <div class="settings-toolbar">
      <!-- Payment Methods Section -->
      <div class="settings-toolbar__section">
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showPaymentMethodDialog">
          Добавить метод оплаты
        </v-btn>
      </div>

      <!-- Tax Section -->
      <div class="settings-toolbar__section">
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showTaxDialog">Добавить налог</v-btn>
      </div>
    </div>

    <div class="settings-content">
      <v-row>
        <v-col cols="12" md="6">
          <payment-method-list :methods="store.paymentMethods" @edit="editPaymentMethod" />
        </v-col>

        <v-col cols="12" md="6">
          <tax-list :taxes="store.taxes" @edit="editTax" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePaymentSettingsStore } from '@/stores/catalog/payment-settings.store'
import type { PaymentMethod } from '@/types/payment'
import type { Tax } from '@/types/tax'
import { DebugUtils } from '@/utils'
import PaymentMethodList from '@/views/catalog/payment-methods/PaymentMethodList.vue'
import TaxList from '@/components/payment-settings/TaxList.vue'
import PaymentMethodDialog from '@/views/catalog/payment-methods/PaymentMethodDialog.vue'
import TaxDialog from '@/components/payment-settings/TaxDialog.vue'

const MODULE_NAME = 'PaymentSettingsView'
const store = usePaymentSettingsStore()

// State
const dialogs = ref({
  paymentMethod: false,
  tax: false
})

const editingMethod = ref<PaymentMethod | null>(null)
const editingTax = ref<Tax | null>(null)

// Methods
function showPaymentMethodDialog() {
  editingMethod.value = null
  dialogs.value.paymentMethod = true
}

function showTaxDialog() {
  editingTax.value = null
  dialogs.value.tax = true
}

function editPaymentMethod(method: PaymentMethod) {
  editingMethod.value = method
  dialogs.value.paymentMethod = true
}

function editTax(tax: Tax) {
  editingTax.value = tax
  dialogs.value.tax = true
}

function handlePaymentMethodSaved() {
  dialogs.value.paymentMethod = false
  editingMethod.value = null
}

function handleTaxSaved() {
  dialogs.value.tax = false
  editingTax.value = null
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
