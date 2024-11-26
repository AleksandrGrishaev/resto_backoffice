<template>
  <div class="test-connection">
    <v-card>
      <v-card-title class="d-flex align-center gap-2">
        <v-icon icon="mdi-firebase" />
        Firebase Connection Test
      </v-card-title>

      <v-card-text>
        <v-alert
          :type="isConnected ? 'success' : 'error'"
          :title="isConnected ? 'Connected' : 'Not Connected'"
          class="mb-4"
        >
          {{ connectionStatus }}
        </v-alert>

        <div class="d-flex flex-column gap-4">
          <v-btn color="primary" :loading="isLoading" :disabled="isLoading" @click="testConnection">
            Test Connection
          </v-btn>

          <v-divider />

          <div v-if="isConnected">
            <v-text-field
              v-model="testMessage"
              label="Test Message"
              placeholder="Enter a test message"
              :disabled="isLoading"
            />
            <v-btn
              color="secondary"
              :loading="isLoading"
              :disabled="isLoading || !testMessage"
              @click="addItem"
            >
              Add Test Item
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useTestStore } from '@/stores/test.store'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'TestConnectionView'
const testStore = useTestStore()

const testMessage = ref('')

const isConnected = computed(() => testStore.isConnected)
const isLoading = computed(() => testStore.isLoading)
const error = computed(() => testStore.error)

const connectionStatus = computed(() => {
  if (isConnected.value) {
    return 'Successfully connected to Firebase'
  }
  return error.value || 'Not connected to Firebase'
})

const testConnection = async () => {
  try {
    await testStore.testConnection()
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Connection test failed', { error })
  }
}

const addItem = async () => {
  if (!testMessage.value) return

  try {
    await testStore.addTestItem(testMessage.value)
    testMessage.value = ''
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Add test item failed', { error })
  }
}
</script>
