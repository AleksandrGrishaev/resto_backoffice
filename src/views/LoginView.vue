// src/views/LoginView.vue
<template>
  <v-card class="pa-4">
    <v-card-title class="text-center text-h5 mb-4">BackOffice Login</v-card-title>

    <v-card-text>
      <pin-input :loading="loading" @submit="handleLogin" />

      <v-alert
        v-if="error"
        type="error"
        class="mt-4"
        variant="tonal"
        closable
        @click:close="error = ''"
      >
        {{ error }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth.store'
import { DebugUtils } from '@/utils'
import PinInput from '@/components/auth/PinInput.vue'

const MODULE_NAME = 'LoginView'
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const loading = ref(false)
const error = ref('')

const handleLogin = async (pin: string) => {
  try {
    loading.value = true
    error.value = ''

    await authStore.login(pin)

    const redirectPath = route.query.redirect?.toString() || '/test-connection'
    router.push(redirectPath)

    DebugUtils.info(MODULE_NAME, 'Login successful')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Login failed'
    DebugUtils.error(MODULE_NAME, 'Login error', { error: error.value })
  } finally {
    loading.value = false
  }
}
</script>
