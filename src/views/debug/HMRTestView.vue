<template>
  <div class="hmr-test-view pa-4">
    <h1 class="text-h4 mb-4">HMR Test Page</h1>

    <v-alert type="info" class="mb-4">
      This page is for testing Hot Module Replacement (HMR) functionality. Edit this file to see HMR
      in action without reloading stores.
    </v-alert>

    <v-card class="mb-4" variant="outlined">
      <v-card-title>HMR State Control</v-card-title>
      <v-card-text>
        <p class="mb-2">
          HMR State:
          <v-chip :color="hmrStateExists ? 'success' : 'error'" size="small">
            {{ hmrStateExists ? 'Active' : 'Cleared' }}
          </v-chip>
        </p>
        <p class="text-caption mb-4">
          When HMR state is active, stores won't reload on hot updates.
        </p>
        <div class="d-flex gap-2">
          <v-btn color="warning" prepend-icon="mdi-delete" @click="clearHMRState">
            Clear HMR State
          </v-btn>
          <v-btn color="primary" prepend-icon="mdi-refresh" @click="reloadPage">
            Hard Reload (F5)
          </v-btn>
          <v-btn color="info" prepend-icon="mdi-information" @click="checkHMRState">
            Check State
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <HMRTestComponent />

    <v-divider class="my-4" />

    <div class="test-content">
      <h2 class="text-h5 mb-2">Test Content v2 - Modified!</h2>
      <p class="text-body-1">Last updated: {{ lastUpdate }}</p>
      <p class="text-caption text-medium-emphasis mb-2">Check the browser console for HMR logs</p>
      <v-btn color="primary" class="mt-2" prepend-icon="mdi-clock-outline" @click="updateTime">
        Update Time
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import HMRTestComponent from '@/components/HMRTestComponent.vue'
import { clearHMRState as clearState, getHMRState } from '@/core/hmrState'

const lastUpdate = ref(new Date().toLocaleTimeString())
const hmrStateExists = ref(false)

const updateTime = () => {
  lastUpdate.value = new Date().toLocaleTimeString()
  console.log('Time updated:', lastUpdate.value)
}

const checkHMRState = () => {
  const state = getHMRState()
  hmrStateExists.value = !!state

  if (state) {
    console.log('✅ HMR State exists:', state)
    alert(
      `HMR State Active\n\nStores Initialized: ${state.storesInitialized}\nUser Roles: ${state.userRoles.join(', ')}\nTimestamp: ${new Date(state.timestamp).toLocaleString()}`
    )
  } else {
    console.log('❌ HMR State is cleared')
    alert('HMR State is cleared.\n\nStores will reload on next page refresh.')
  }
}

const clearHMRState = () => {
  clearState()
  hmrStateExists.value = false
  console.log('🗑️ HMR State cleared')
  alert('HMR State cleared!\n\nStores will reload on next page refresh.\n\nPress OK to reload.')
  location.reload()
}

const reloadPage = () => {
  console.log('🔄 Hard reload...')
  location.reload()
}

onMounted(() => {
  checkHMRState()
})

console.log('🔥 HMRTestView mounted/reloaded at', new Date().toLocaleTimeString())
</script>

<style scoped>
.hmr-test-view {
  max-width: 800px;
  margin: 0 auto;
}

.test-content {
  padding: 1rem;
  background: rgba(var(--v-theme-surface), 0.5);
  border-radius: 8px;
}
</style>
