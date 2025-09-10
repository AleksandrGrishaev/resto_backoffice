<template>
  <div class="customers-view">
    <!-- Header -->
    <v-app-bar flat border="b">
      <v-container class="d-flex align-center px-4">
        <v-btn icon @click="router.back()">
          <v-icon icon="mdi-arrow-left" />
        </v-btn>
        <v-app-bar-title>Customers</v-app-bar-title>
        <v-spacer />
        <v-btn color="primary" prepend-icon="mdi-plus" @click="showCreateDialog = true">
          Add Customer
        </v-btn>
      </v-container>
    </v-app-bar>

    <!-- Content -->
    <v-main class="customers-content">
      <v-container class="py-4">
        <!-- Search -->
        <v-text-field
          v-model="searchQuery"
          density="compact"
          variant="outlined"
          placeholder="Search by name, phone or email"
          prepend-inner-icon="mdi-magnify"
          single-line
          hide-details
          class="mb-4"
          :loading="loading"
          @update:model-value="handleSearch"
        />

        <!-- List -->
        <customers-list
          :customers="displayedCustomers"
          :loading="customerStore.loading"
          @select="handleCustomerSelect"
        />
      </v-container>
    </v-main>

    <!-- Dialogs -->
    <customer-dialog v-model="showCreateDialog" @created="handleCustomerCreated" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/customer.store'
import CustomersList from '@/components/customer/CustomersList.vue'
import CustomerDialog from '@/components/customer/CustomerDialog.vue'
import type { Customer } from '@/types/customer'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'CustomersView'

const router = useRouter()
const customerStore = useCustomerStore()

const searchQuery = ref('')
const showCreateDialog = ref(false)
const loading = ref(false)

// Computed
const displayedCustomers = computed(() => {
  // Если есть поисковый запрос - показываем результаты поиска
  // Если нет - показываем всех клиентов
  return searchQuery.value ? customerStore.searchResults : customerStore.customers
})

// Инициализация
onMounted(async () => {
  try {
    loading.value = true
    await customerStore.initialize()
    DebugUtils.debug(MODULE_NAME, 'Customers loaded', { count: customerStore.customers.length })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Failed to initialize customers', error)
  } finally {
    loading.value = false
  }
})

// Handlers
function handleSearch(query: string) {
  if (!query) {
    // Если запрос пустой - очищаем результаты поиска
    customerStore.searchResults = []
    return
  }
  customerStore.searchCustomers({ searchText: query })
}

function handleCustomerSelect(customer: Customer) {
  router.push({
    name: 'customer-details',
    params: { id: customer.id }
  })
}

function handleCustomerCreated(customer: Customer) {
  showCreateDialog.value = false
  // Обновляем список клиентов
  customerStore.initialize()
  // Переходим на страницу деталей нового клиента
  router.push({
    name: 'customer-details',
    params: { id: customer.id }
  })
}
</script>

<style scoped>
.customers-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.customers-content {
  flex: 1;
  overflow: auto;
}
</style>
