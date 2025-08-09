<!-- src/views/counteragents/CounteragentsView.vue -->
<template>
  <div class="counteragents-view">
    <!-- Заголовок и кнопка добавления -->
    <div class="counteragents-toolbar">
      <v-row align="center" class="mb-4">
        <v-col>
          <div class="d-flex align-center ga-3">
            <v-icon size="40" color="primary">mdi-store</v-icon>
            <div>
              <h1 class="text-h4">Counteragents</h1>
              <p class="text-subtitle-1 text-medium-emphasis mt-1">
                Manage suppliers and service providers for your restaurant
              </p>
            </div>
          </div>
        </v-col>
        <v-col cols="auto">
          <v-btn color="primary" prepend-icon="mdi-plus" size="large" @click="openCreateDialog">
            Add Counteragent
          </v-btn>
        </v-col>
      </v-row>
    </div>

    <!-- Фильтры и поиск -->
    <CounteragentFilters />

    <!-- Список контрагентов -->
    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <v-icon start>mdi-format-list-bulleted</v-icon>
        Counteragents List
        <v-spacer />
        <div class="d-flex align-center ga-2">
          <v-chip
            :color="store.filteredCounterAgents.length > 0 ? 'primary' : 'default'"
            variant="outlined"
            size="small"
          >
            {{ store.filteredCounterAgents.length }} of {{ store.counteragents.length }}
          </v-chip>

          <!-- Индикатор загрузки -->
          <v-progress-circular
            v-if="store.loading.counteragents"
            size="20"
            width="2"
            color="primary"
            indeterminate
          />
        </div>
      </v-card-title>

      <v-divider />

      <!-- Прогресс-бар загрузки -->
      <v-progress-linear v-if="store.loading.counteragents" indeterminate color="primary" />

      <!-- Алерт с ошибкой -->
      <v-alert
        v-if="store.error"
        type="error"
        variant="tonal"
        class="ma-4"
        closable
        @click:close="store.clearError"
      >
        <template #title>Error loading data</template>
        {{ store.error }}
      </v-alert>

      <!-- Список контрагентов -->
      <CounteragentsTable
        @edit="openEditDialog"
        @view="openViewDialog"
        @delete="confirmDelete"
        @contact="contactCounteragent"
      />
    </v-card>

    <!-- Create/Edit Dialog -->
    <CounteragentDialog
      v-model="dialogs.form"
      :counteragent="selectedCounteragent"
      :mode="dialogMode"
      @saved="handleCounteragentSaved"
    />

    <!-- View Details Dialog -->
    <CounteragentCard
      v-model="dialogs.view"
      :counteragent="selectedCounteragent"
      @edit="openEditFromView"
      @delete="confirmDeleteFromView"
    />

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="dialogs.delete" max-width="500">
      <v-card>
        <v-card-title class="text-h5">
          <v-icon icon="mdi-delete-alert" color="error" class="me-2" />
          Confirm Deletion
        </v-card-title>

        <v-card-text>
          <p>Are you sure you want to delete this counteragent?</p>
          <p class="text-subtitle-2 text-medium-emphasis">
            <strong>{{ selectedCounteragent?.name }}</strong>
          </p>
          <p class="text-caption text-error">This action cannot be undone.</p>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialogs.delete = false">Cancel</v-btn>
          <v-btn
            color="error"
            variant="flat"
            :loading="store.loading.counteragents"
            @click="handleDelete"
          >
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Bulk Actions Bar -->
    <v-slide-y-transition>
      <div v-if="store.hasSelectedCounterAgents" class="bulk-actions-bar">
        <v-card class="bulk-actions-card" elevation="8">
          <v-card-text class="d-flex align-center">
            <v-icon icon="mdi-checkbox-marked" class="me-2" />
            <span class="text-subtitle-1">{{ store.selectedIds.length }} item(s) selected</span>

            <v-spacer />

            <v-btn variant="outlined" prepend-icon="mdi-check" class="me-2" @click="bulkActivate">
              Activate
            </v-btn>

            <v-btn variant="outlined" prepend-icon="mdi-close" class="me-2" @click="bulkDeactivate">
              Deactivate
            </v-btn>

            <v-btn color="error" variant="outlined" prepend-icon="mdi-delete" @click="bulkDelete">
              Delete
            </v-btn>

            <v-btn variant="text" icon="mdi-close" class="ms-2" @click="store.clearSelection" />
          </v-card-text>
        </v-card>
      </div>
    </v-slide-y-transition>

    <!-- Уведомления -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="snackbar.timeout"
      location="top right"
    >
      {{ snackbar.text }}
      <template #actions>
        <v-btn variant="text" icon="mdi-close" @click="snackbar.show = false" />
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useCounteragentsStore } from '@/stores/counteragents'
import type { Counteragent } from '@/stores/counteragents'

// Import components
import CounteragentFilters from './components/counteragents/CounteragentFilters.vue'
import CounteragentsTable from './components/counteragents/CounteragentsTable.vue'
import CounteragentDialog from './components/counteragents/CounteragentDialog.vue'
import CounteragentCard from './components/counteragents/CounteragentCard.vue'

// Store
const store = useCounteragentsStore()

// Reactive state
const selectedCounteragent = ref<Counteragent | undefined>()
const dialogMode = ref<'create' | 'edit'>('create')

const dialogs = reactive({
  form: false,
  view: false,
  delete: false
})

const snackbar = reactive({
  show: false,
  text: '',
  color: 'success',
  timeout: 4000
})

// Methods
const showSnackbar = (text: string, color: 'success' | 'error' | 'warning' = 'success') => {
  snackbar.text = text
  snackbar.color = color
  snackbar.show = true
}

const openCreateDialog = () => {
  selectedCounteragent.value = undefined
  dialogMode.value = 'create'
  dialogs.form = true
}

const openEditDialog = (counteragent: Counteragent) => {
  selectedCounteragent.value = counteragent
  dialogMode.value = 'edit'
  dialogs.form = true
}

const openViewDialog = (counteragent: Counteragent) => {
  selectedCounteragent.value = counteragent
  dialogs.view = true
}

const openEditFromView = () => {
  dialogs.view = false
  if (selectedCounteragent.value) {
    openEditDialog(selectedCounteragent.value)
  }
}

const confirmDelete = (counteragent: Counteragent) => {
  selectedCounteragent.value = counteragent
  dialogs.delete = true
}

const confirmDeleteFromView = () => {
  dialogs.view = false
  if (selectedCounteragent.value) {
    confirmDelete(selectedCounteragent.value)
  }
}

const handleDelete = async () => {
  if (!selectedCounteragent.value) return

  const success = await store.deleteCounteragent(selectedCounteragent.value.id)

  if (success) {
    showSnackbar('Counteragent deleted successfully')
    dialogs.delete = false
    selectedCounteragent.value = undefined
  } else {
    showSnackbar('Failed to delete counteragent', 'error')
  }
}

const handleCounteragentSaved = (counteragent: Counteragent) => {
  const action = dialogMode.value === 'create' ? 'created' : 'updated'
  showSnackbar(`Counteragent ${action} successfully`)
  dialogs.form = false
  selectedCounteragent.value = undefined
}

const contactCounteragent = (counteragent: Counteragent) => {
  // TODO: Implement contact functionality (phone call, email, etc.)
  if (counteragent.phone) {
    window.open(`tel:${counteragent.phone}`)
  } else if (counteragent.email) {
    window.open(`mailto:${counteragent.email}`)
  } else {
    showSnackbar('No contact information available', 'warning')
  }
}

// Bulk operations
const bulkActivate = async () => {
  const success = await store.bulkUpdateStatus(store.selectedIds, true)
  if (success) {
    showSnackbar(`${store.selectedIds.length} counteragents activated`)
    store.clearSelection()
  } else {
    showSnackbar('Failed to activate counteragents', 'error')
  }
}

const bulkDeactivate = async () => {
  const success = await store.bulkUpdateStatus(store.selectedIds, false)
  if (success) {
    showSnackbar(`${store.selectedIds.length} counteragents deactivated`)
    store.clearSelection()
  } else {
    showSnackbar('Failed to deactivate counteragents', 'error')
  }
}

const bulkDelete = async () => {
  if (confirm(`Are you sure you want to delete ${store.selectedIds.length} counteragents?`)) {
    const success = await store.bulkDelete([...store.selectedIds])
    if (success) {
      showSnackbar(`${store.selectedIds.length} counteragents deleted`)
    } else {
      showSnackbar('Failed to delete counteragents', 'error')
    }
  }
}

// Import/Export functionality (removed for now)

// Lifecycle
onMounted(async () => {
  await store.fetchCounterAgents()
})
</script>

<style scoped>
.counteragents-view {
  padding: 0;
}

.counteragents-toolbar {
  margin-bottom: 1rem;
}

.bulk-actions-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  width: auto;
  min-width: 400px;
  max-width: 90vw;
}

.bulk-actions-card {
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-outline-variant));
}

@media (max-width: 768px) {
  .bulk-actions-bar {
    min-width: auto;
    left: 16px;
    right: 16px;
    transform: none;
  }
}
</style>
