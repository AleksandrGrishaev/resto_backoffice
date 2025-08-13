<!-- src/components/navigation/DebugStoresBadge.vue -->
<template>
  <v-badge v-if="showBadge" :content="badgeContent" :color="badgeColor" inline>
    <v-icon size="small" :color="badgeColor">mdi-database</v-icon>
  </v-badge>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useDebugStore } from '@/stores/debug'

// =============================================
// SETUP
// =============================================

const debugStore = useDebugStore()

// =============================================
// COMPUTED PROPERTIES
// =============================================

const storeStats = computed(() => {
  const stores = debugStore.state.availableStores
  const loaded = stores.filter(s => s.isLoaded)
  const total = stores.length

  return {
    total,
    loaded: loaded.length,
    hasStores: total > 0
  }
})

const showBadge = computed(() => {
  // Показываем badge только если есть загруженные stores
  return storeStats.value.hasStores && storeStats.value.loaded > 0
})

const badgeContent = computed(() => {
  const { loaded, total } = storeStats.value
  return `${loaded}/${total}`
})

const badgeColor = computed(() => {
  const { loaded, total } = storeStats.value

  if (loaded === 0) return 'error'
  if (loaded < total) return 'warning'
  return 'success'
})

// =============================================
// LIFECYCLE
// =============================================

onMounted(async () => {
  // Автоматически инициализируем debug store если он не инициализирован
  if (debugStore.state.availableStores.length === 0) {
    try {
      await debugStore.discoverStores()
    } catch (error) {
      // Ошибки discovery не критичны для badge
      console.debug('Debug stores discovery failed:', error)
    }
  }
})
</script>
