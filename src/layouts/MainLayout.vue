<!-- src/layouts/MainLayout.vue -->
<template>
  <v-app>
    <v-app-bar>
      <v-app-bar-title>BackOffice</v-app-bar-title>
      <v-spacer />
      <v-btn @click="handleLogout">Logout</v-btn>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <router-view />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth.store'
import { useRouter } from 'vue-router'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'MainLayout'
const router = useRouter()
const authStore = useAuthStore()

const handleLogout = async () => {
  try {
    await authStore.logout()
    router.push({ name: 'login' })
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Logout error', { error })
  }
}
</script>
