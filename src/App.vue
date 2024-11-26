// src/App.vue
<template>
  <v-app>
    <router-view />
  </v-app>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { DebugUtils } from '@/utils'
import { useAuthStore } from '@/stores/auth.store'

const MODULE_NAME = 'App'
const authStore = useAuthStore()

onMounted(() => {
  DebugUtils.info(MODULE_NAME, 'Application mounted')
  // Проверяем сессию при загрузке
  authStore.checkSession()
})
</script>
