<!-- src/views/kitchen/request/RequestScreen.vue -->
<!-- Main Request screen for Kitchen Monitor -->
<template>
  <div class="request-screen">
    <!-- Header -->
    <v-toolbar density="compact" color="surface" class="px-4">
      <v-btn icon="mdi-arrow-left" variant="text" @click="$emit('back')" />
      <v-toolbar-title class="text-h6">
        <v-icon icon="mdi-cart-plus" class="mr-2" />
        Create Request
      </v-toolbar-title>
      <v-spacer />
      <v-chip
        v-if="pendingRequestCount > 0"
        color="warning"
        size="small"
        prepend-icon="mdi-clock-outline"
      >
        {{ pendingRequestCount }} pending
      </v-chip>
    </v-toolbar>

    <v-divider />

    <!-- Loading State -->
    <div
      v-if="isInitializing"
      class="d-flex align-center justify-center pa-8"
      style="height: 400px"
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
    <div v-else class="request-content">
      <KitchenOrderAssistant
        :department="effectiveDepartment"
        :requested-by="requestedByName"
        @success="handleSuccess"
        @error="handleError"
      />
    </div>

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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useKitchenRequest } from './composables/useKitchenRequest'
import KitchenOrderAssistant from './components/KitchenOrderAssistant.vue'

// =============================================
// PROPS & EMITS
// =============================================

interface Props {
  selectedDepartment?: 'all' | 'kitchen' | 'bar'
}

interface Emits {
  (e: 'back'): void
  (e: 'request-created', requestId: string): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedDepartment: 'kitchen'
})

const emits = defineEmits<Emits>()

// =============================================
// COMPOSABLE
// =============================================

const selectedDepartmentRef = computed(() => props.selectedDepartment)
const kitchenRequest = useKitchenRequest(selectedDepartmentRef)

// =============================================
// LOCAL STATE
// =============================================

const isInitializing = ref(true)
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
    console.error('Failed to initialize request screen:', err)
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
    emits('request-created', match[1])
  }
}

function handleError(message: string) {
  errorMessage.value = message
  showErrorSnackbar.value = true
}

// =============================================
// LIFECYCLE
// =============================================

onMounted(() => {
  initialize()
})
</script>

<style scoped lang="scss">
.request-screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: rgb(var(--v-theme-background));
}

.request-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

// Kitchen-appropriate touch targets
:deep(.v-btn) {
  min-height: 44px;
}

:deep(.v-tab) {
  min-height: 52px;
}
</style>
