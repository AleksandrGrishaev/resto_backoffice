<!-- LoginView.vue -->
<template>
  <v-container fluid class="fill-height login-container">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="8" md="6" lg="4">
        <v-card class="pa-4 login-card">
          <v-card-title class="text-h5 text-center mb-4">BackOffice Login</v-card-title>

          <v-card-text>
            <pin-input :loading="loading" @submit="handleLogin" />

            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              closable
              class="mt-4 error-alert"
              @click:close="error = ''"
            >
              {{ error }}
            </v-alert>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
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

    await authStore.login(pin, 'backoffice')

    const redirectPath = route.query.redirect?.toString() || '/'
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

<style lang="scss" scoped>
.login-container {
  background-color: var(--black-primary);
}

.login-card {
  background-color: var(--black-surface);
  border: 1px solid var(--color-primary);

  .error-alert {
    background-color: var(--color-error);
    color: var(--black-primary);
  }
}
</style>
