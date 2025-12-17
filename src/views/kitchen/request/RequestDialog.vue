<!-- src/views/kitchen/request/RequestDialog.vue -->
<!-- Dialog wrapper for Create Request -->
<template>
  <v-dialog v-model="internalShow" max-width="1200px" persistent scrollable>
    <v-card class="request-dialog-card">
      <!-- Dialog Header -->
      <v-toolbar color="primary" height="72" class="px-4">
        <v-toolbar-title class="text-h5">
          <v-icon icon="mdi-cart-plus" size="32" class="mr-3" />
          Create Request
        </v-toolbar-title>
        <v-spacer />
        <v-chip
          v-if="pendingRequestCount > 0"
          color="warning"
          size="default"
          prepend-icon="mdi-clock-outline"
          class="mr-2"
        >
          {{ pendingRequestCount }} pending
        </v-chip>
        <v-chip color="white" variant="tonal" size="default" class="mr-3">
          {{ effectiveDepartment === 'kitchen' ? 'Kitchen' : 'Bar' }}
        </v-chip>
        <v-btn icon="mdi-close" variant="text" size="large" @click="handleClose" />
      </v-toolbar>

      <!-- Loading State -->
      <div
        v-if="isInitializing"
        class="d-flex align-center justify-center pa-8"
        style="min-height: 400px"
      >
        <div class="text-center">
          <v-progress-circular indeterminate color="primary" size="48" class="mb-4" />
          <div class="text-body-1">Loading request assistant...</div>
        </div>
      </div>

      <!-- Error State -->
      <v-alert v-else-if="initError" type="error" variant="tonal" class="ma-4">
        <v-alert-title>Failed to initialize</v-alert-title>
        {{ initError }}
        <template #append>
          <v-btn variant="outlined" size="small" @click="initialize">Retry</v-btn>
        </template>
      </v-alert>

      <!-- Main Content -->
      <v-card-text v-else class="pa-4" style="max-height: 70vh">
        <KitchenOrderAssistant
          :department="effectiveDepartment"
          :requested-by="requestedByName"
          @success="handleSuccess"
          @error="handleError"
        />
      </v-card-text>
    </v-card>

    <!-- Success Snackbar -->
    <v-snackbar v-model="showSuccessSnackbar" :timeout="4000" color="success" location="top">
      <div class="d-flex align-center">
        <v-icon icon="mdi-check-circle" class="mr-2" />
        {{ successMessage }}
      </div>
    </v-snackbar>

    <!-- Error Snackbar -->
    <v-snackbar v-model="showErrorSnackbar" :timeout="5000" color="error" location="top">
      <div class="d-flex align-center">
        <v-icon icon="mdi-alert-circle" class="mr-2" />
        {{ errorMessage }}
      </div>
    </v-snackbar>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useKitchenRequest } from './composables/useKitchenRequest'
import KitchenOrderAssistant from './components/KitchenOrderAssistant.vue'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  show: boolean
  selectedDepartment?: 'all' | 'kitchen' | 'bar'
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'request-created', requestId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedDepartment: 'kitchen'
})

const emit = defineEmits<Emits>()

// =============================================
// COMPOSABLE
// =============================================

const selectedDepartmentRef = computed(() => props.selectedDepartment)
const kitchenRequest = useKitchenRequest(selectedDepartmentRef)

// =============================================
// LOCAL STATE
// =============================================

const internalShow = computed({
  get: () => props.show,
  set: (value: boolean) => emit('update:show', value)
})

const isInitializing = ref(false)
const initError = ref<string | null>(null)
const showSuccessSnackbar = ref(false)
const showErrorSnackbar = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// =============================================
// COMPUTED
// =============================================

const effectiveDepartment = computed(() => kitchenRequest.effectiveDepartment.value)
const pendingRequestCount = computed(() => kitchenRequest.pendingRequestCount.value)
const requestedByName = computed(() => kitchenRequest.requestedByName.value)

// =============================================
// METHODS
// =============================================

async function initialize() {
  isInitializing.value = true
  initError.value = null

  try {
    // Stores should already be initialized by AppInitializer
    // Just verify we have what we need
    await kitchenRequest.generateSuggestions()
  } catch (err) {
    console.error('Failed to initialize request dialog:', err)
    initError.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    isInitializing.value = false
  }
}

function handleSuccess(message: string) {
  successMessage.value = message
  showSuccessSnackbar.value = true

  // Extract request ID from message if present
  const match = message.match(/Request\s+(\S+)/)
  if (match) {
    emit('request-created', match[1])
  }

  // Close dialog after successful creation
  setTimeout(() => {
    handleClose()
  }, 1500)
}

function handleError(message: string) {
  errorMessage.value = message
  showErrorSnackbar.value = true
}

function handleClose() {
  // Clear any pending state
  kitchenRequest.clearSelectedItems()
  emit('update:show', false)
}

// =============================================
// WATCHERS
// =============================================

// Initialize when dialog opens
watch(
  () => props.show,
  newVal => {
    if (newVal) {
      initialize()
    }
  }
)
</script>

<style scoped lang="scss">
.request-dialog-card {
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

// Kitchen-appropriate touch targets
:deep(.v-btn) {
  min-height: 44px;
}

:deep(.v-tab) {
  min-height: 52px;
}
</style>
