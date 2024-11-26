// src/views/NotFoundView.vue
<template>
  <v-container fluid class="fill-height">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6" lg="4" class="text-center">
        <v-card class="pa-4">
          <v-card-title class="text-h3 mb-4">404</v-card-title>
          <v-card-subtitle class="text-h6 mb-6">Page Not Found</v-card-subtitle>
          <v-card-actions class="justify-center">
            <v-btn color="primary" :to="redirectPath">
              {{ isAuthenticated ? 'Return to Dashboard' : 'Return to Login' }}
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { DebugUtils } from '@/utils'

const MODULE_NAME = 'NotFoundView'
const authStore = useAuthStore()

const isAuthenticated = computed(() => authStore.state.isAuthenticated)
const redirectPath = computed(() => (isAuthenticated.value ? '/test-connection' : '/auth/login'))

DebugUtils.debug(MODULE_NAME, 'Component mounted')
</script>
