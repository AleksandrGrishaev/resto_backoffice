// src/layouts/MonitorLayout.vue
<template>
  <base-layout>
    <template #header>
      <v-app-bar elevation="1">
        <v-tabs v-model="activeTab" class="ml-n4">
          <v-tab v-for="tab in tabs" :key="tab.path" :to="tab.path" :value="tab.path">
            {{ tab.label }}
          </v-tab>
        </v-tabs>
        <v-spacer />
        <v-btn
          prepend-icon="mdi-logout"
          variant="text"
          :loading="loading"
          class="text-white"
          @click="handleLogout"
        >
          Logout
        </v-btn>
      </v-app-bar>
    </template>

    <v-container fluid class="fill-height pa-4">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </v-container>
  </base-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import BaseLayout from './BaseLayout.vue'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'MonitorLayout'
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const loading = ref(false)

const tabs = [
  { path: '/monitor/kitchen', label: 'Kitchen' },
  { path: '/monitor/bar', label: 'Bar' }
]

const activeTab = ref(route.path)

const handleLogout = async () => {
  try {
    await authStore.logout()
    router.push('/auth/login')
    DebugUtils.info(MODULE_NAME, 'User logged out successfully')
  } catch (error) {
    DebugUtils.error(MODULE_NAME, 'Logout failed', { error })
  }
}
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
