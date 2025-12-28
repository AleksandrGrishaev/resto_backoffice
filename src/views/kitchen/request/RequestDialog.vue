<!-- src/views/kitchen/request/RequestDialog.vue -->
<!-- Fullscreen dialog wrapper for Create Request - Tablet optimized -->
<template>
  <v-dialog v-model="internalShow" fullscreen transition="dialog-bottom-transition">
    <v-card class="request-dialog-fullscreen">
      <!-- Header - slightly larger for touch -->
      <v-toolbar color="primary" density="comfortable" class="px-3">
        <v-btn icon="mdi-close" variant="text" size="large" @click="handleClose" />
        <v-toolbar-title class="text-h6 font-weight-medium">Create Request</v-toolbar-title>
        <v-spacer />
        <v-chip
          v-if="pendingRequestCount > 0"
          color="warning"
          size="small"
          variant="flat"
          class="mr-2"
        >
          {{ pendingRequestCount }} pending
        </v-chip>
        <v-chip color="white" variant="tonal" size="small">
          {{ effectiveDepartment === 'kitchen' ? 'Kitchen' : 'Bar' }}
        </v-chip>
      </v-toolbar>

      <!-- Loading State -->
      <div v-if="isInitializing" class="loading-container">
        <v-progress-circular indeterminate color="primary" size="48" />
        <div class="text-body-2 mt-3">Loading...</div>
      </div>

      <!-- Error State -->
      <v-alert v-else-if="initError" type="error" variant="tonal" class="ma-4">
        {{ initError }}
        <template #append>
          <v-btn variant="outlined" size="small" @click="initialize">Retry</v-btn>
        </template>
      </v-alert>

      <!-- Main Content - takes remaining space -->
      <div v-else class="dialog-content">
        <KitchenOrderAssistant
          :department="effectiveDepartment"
          :requested-by="requestedByName"
          @success="handleSuccess"
          @error="handleError"
        />
      </div>
    </v-card>

    <!-- Snackbars -->
    <v-snackbar v-model="showSuccessSnackbar" :timeout="3000" color="success" location="top">
      {{ successMessage }}
    </v-snackbar>
    <v-snackbar v-model="showErrorSnackbar" :timeout="4000" color="error" location="top">
      {{ errorMessage }}
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
.request-dialog-fullscreen {
  display: flex;
  flex-direction: column;
  height: 100vh; // fallback
  height: 100dvh; // dynamic viewport height (accounts for Android/iOS UI)
  overflow: hidden;

  // Safe area padding for notched devices and Android nav bar
  padding-top: var(--safe-area-inset-top);
  padding-bottom: var(--safe-area-inset-bottom);
}

.loading-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.dialog-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

// Touch-friendly targets
:deep(.v-btn) {
  min-height: 44px;
}
</style>
