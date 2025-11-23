<!-- src/views/auth/LoginView.vue - Updated for Phase 4: Triple Authentication -->
<template>
  <v-container fluid class="fill-height login-container">
    <v-row justify="center" align="center">
      <v-col cols="12" sm="10" md="8" lg="6" xl="5">
        <v-card class="pa-6 login-card">
          <!-- Header -->
          <v-card-title class="text-h4 text-center mb-2 login-title">
            <v-icon size="48" class="mr-3" color="primary">mdi-restaurant</v-icon>
            Kitchen App
          </v-card-title>

          <v-card-subtitle class="text-center mb-6 login-subtitle">
            Restaurant Management System
          </v-card-subtitle>

          <!-- Authentication Tabs -->
          <v-tabs v-model="activeTab" class="mb-6 auth-tabs" bg-color="transparent" grow>
            <v-tab value="email" class="auth-tab">
              <v-icon class="mr-2">mdi-email</v-icon>
              Email
            </v-tab>
            <v-tab value="pos" class="auth-tab">
              <v-icon class="mr-2">mdi-point-of-sale</v-icon>
              POS
            </v-tab>
            <v-tab value="kitchen" class="auth-tab">
              <v-icon class="mr-2">mdi-chef-hat</v-icon>
              Kitchen
            </v-tab>
          </v-tabs>

          <v-card-text>
            <v-window v-model="activeTab">
              <!-- Email Authentication (Admin/Manager) -->
              <v-window-item value="email">
                <div class="auth-form">
                  <p class="text-center text-body-2 mb-4 auth-description">
                    For administrators and managers
                  </p>

                  <v-form ref="emailFormRef" @submit.prevent="handleEmailLogin">
                    <v-text-field
                      v-model="email"
                      label="Email"
                      type="email"
                      prepend-inner-icon="mdi-email-outline"
                      variant="outlined"
                      density="comfortable"
                      :rules="emailRules"
                      :disabled="isLoading"
                      class="mb-3"
                      autocomplete="email"
                      @input="clearError"
                    />

                    <v-text-field
                      v-model="password"
                      label="Password"
                      :type="showPassword ? 'text' : 'password'"
                      prepend-inner-icon="mdi-lock-outline"
                      :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                      variant="outlined"
                      density="comfortable"
                      :rules="passwordRules"
                      :disabled="isLoading"
                      class="mb-4"
                      autocomplete="current-password"
                      @click:append-inner="showPassword = !showPassword"
                      @input="clearError"
                    />

                    <v-btn
                      type="submit"
                      color="primary"
                      size="large"
                      block
                      :loading="isLoading"
                      class="auth-button"
                    >
                      <v-icon class="mr-2">mdi-login</v-icon>
                      Login
                    </v-btn>
                  </v-form>

                  <!-- Test credentials (dev only) -->
                  <div v-if="showDevHelpers" class="mt-4">
                    <v-divider class="mb-3" />
                    <p class="text-caption text-center mb-2 text-medium-emphasis">
                      Test Credentials (Dev Only)
                    </p>
                    <div class="d-flex gap-2 justify-center flex-wrap">
                      <v-chip
                        size="small"
                        variant="outlined"
                        @click="fillEmailCredentials('admin@resto.local', 'Admin123!')"
                      >
                        Admin
                      </v-chip>
                      <v-chip
                        size="small"
                        variant="outlined"
                        @click="fillEmailCredentials('manager@resto.local', 'Manager123!')"
                      >
                        Manager
                      </v-chip>
                    </div>
                  </div>
                </div>
              </v-window-item>

              <!-- POS PIN Authentication (Cashier) -->
              <v-window-item value="pos">
                <div class="auth-form">
                  <p class="text-center text-body-2 mb-4 auth-description">
                    Quick login for cashiers
                  </p>

                  <PinInput
                    :loading="isLoading"
                    label="Enter your PIN"
                    button-text="LOGIN"
                    auto-submit
                    @submit="handlePinLogin"
                    @input="clearError"
                  />

                  <!-- Test PINs (dev only) -->
                  <div v-if="showDevHelpers" class="mt-4">
                    <v-divider class="mb-3" />
                    <p class="text-caption text-center mb-2 text-medium-emphasis">
                      Test PINs (Dev Only)
                    </p>
                    <div class="d-flex gap-2 justify-center flex-wrap">
                      <v-chip size="small" variant="outlined" @click="fillPin('1234')">
                        Cashier 1 (1234)
                      </v-chip>
                      <v-chip size="small" variant="outlined" @click="fillPin('5678')">
                        Cashier 2 (5678)
                      </v-chip>
                    </div>
                  </div>
                </div>
              </v-window-item>

              <!-- KITCHEN PIN Authentication (Kitchen/Bar) -->
              <v-window-item value="kitchen">
                <div class="auth-form">
                  <p class="text-center text-body-2 mb-4 auth-description">
                    Quick login for kitchen and bar staff
                  </p>

                  <PinInput
                    :loading="isLoading"
                    label="Enter your PIN"
                    button-text="LOGIN"
                    auto-submit
                    @submit="handleKitchenPinLogin"
                    @input="clearError"
                  />

                  <!-- Test PINs (dev only) -->
                  <div v-if="showDevHelpers" class="mt-4">
                    <v-divider class="mb-3" />
                    <p class="text-caption text-center mb-2 text-medium-emphasis">
                      Test PINs (Dev Only)
                    </p>
                    <div class="d-flex gap-2 justify-center flex-wrap">
                      <v-chip size="small" variant="outlined" @click="fillPin('1111')">
                        Kitchen (1111)
                      </v-chip>
                      <v-chip size="small" variant="outlined" @click="fillPin('2222')">
                        Bar (2222)
                      </v-chip>
                    </div>
                  </div>
                </div>
              </v-window-item>
            </v-window>

            <!-- Error Alert -->
            <v-alert
              v-if="error"
              type="error"
              variant="tonal"
              closable
              class="mt-4 error-alert"
              @click:close="clearError"
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
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth/authStore'
import { DebugUtils } from '@/utils'
import PinInput from '@/components/atoms/inputs/PinInput.vue'

// ===== CONSTANTS =====
const MODULE_NAME = 'LoginView'

// ===== COMPOSABLES =====
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// ===== STATE =====
const activeTab = ref<'email' | 'pos' | 'kitchen'>('pos') // Default to POS for quick access
const isLoading = ref(false)
const error = ref('')

// Email form state
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const emailFormRef = ref()

// ===== VALIDATION RULES =====
const emailRules = [
  (v: string) => !!v || 'Email is required',
  (v: string) => /.+@.+\..+/.test(v) || 'Email must be valid'
]

const passwordRules = [(v: string) => !!v || 'Password is required']

// ===== COMPUTED =====
const showDevHelpers = computed(() => {
  return import.meta.env.DEV
})

// ===== METHODS =====

/**
 * Handle email + password login (Admin/Manager)
 */
const handleEmailLogin = async () => {
  // Validate form
  const { valid } = await emailFormRef.value.validate()
  if (!valid) return

  try {
    isLoading.value = true
    error.value = ''

    DebugUtils.info(MODULE_NAME, 'Email login attempt', { email: email.value })

    const success = await authStore.loginWithEmail(email.value, password.value)

    if (success) {
      DebugUtils.info(MODULE_NAME, 'Email login successful')

      // Redirect to intended page or default
      const redirectPath = (route.query.redirect as string) || authStore.getDefaultRoute()
      await router.push(redirectPath)
    } else {
      throw new Error(authStore.state.error || 'Login failed')
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Login failed'
    error.value = errorMessage
    DebugUtils.error(MODULE_NAME, 'Email login failed', { error: errorMessage })
  } finally {
    isLoading.value = false
  }
}

/**
 * Handle PIN login (Cashier - POS)
 */
const handlePinLogin = async (pin: string) => {
  try {
    isLoading.value = true
    error.value = ''

    DebugUtils.info(MODULE_NAME, 'POS PIN login attempt')

    const success = await authStore.loginWithPin(pin)

    if (success) {
      DebugUtils.info(MODULE_NAME, 'POS PIN login successful')

      // Redirect to POS or intended page
      const redirectPath = (route.query.redirect as string) || '/pos'
      await router.push(redirectPath)
    } else {
      throw new Error(authStore.state.error || 'Invalid PIN')
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Login failed'
    error.value = errorMessage
    DebugUtils.error(MODULE_NAME, 'POS PIN login failed', { error: errorMessage })
  } finally {
    isLoading.value = false
  }
}

/**
 * Handle Kitchen PIN login (Kitchen/Bar)
 */
const handleKitchenPinLogin = async (pin: string) => {
  try {
    isLoading.value = true
    error.value = ''

    DebugUtils.info(MODULE_NAME, 'Kitchen PIN login attempt')

    const success = await authStore.loginWithPin(pin)

    if (success) {
      DebugUtils.info(MODULE_NAME, 'Kitchen PIN login successful')

      // Redirect to kitchen dashboard or intended page
      const redirectPath = (route.query.redirect as string) || '/kitchen'
      await router.push(redirectPath)
    } else {
      throw new Error(authStore.state.error || 'Invalid PIN')
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : 'Login failed'
    error.value = errorMessage
    DebugUtils.error(MODULE_NAME, 'Kitchen PIN login failed', { error: errorMessage })
  } finally {
    isLoading.value = false
  }
}

/**
 * Clear error message
 */
const clearError = () => {
  error.value = ''
}

/**
 * Fill email credentials (dev only)
 */
const fillEmailCredentials = (testEmail: string, testPassword: string) => {
  if (import.meta.env.DEV) {
    email.value = testEmail
    password.value = testPassword
    DebugUtils.info(MODULE_NAME, 'Test credentials filled', { email: testEmail })
  }
}

/**
 * Fill PIN (dev only)
 */
const fillPin = (pin: string) => {
  if (import.meta.env.DEV) {
    // Note: PinInput component doesn't expose programmatic fill
    // This is just a visual helper
    DebugUtils.info(MODULE_NAME, 'Test PIN helper', { pin })
  }
}
</script>

<style lang="scss" scoped>
// ===== LOGIN CONTAINER =====
.login-container {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  min-height: 100vh;
}

// ===== LOGIN CARD =====
.login-card {
  background: rgba(18, 18, 18, 0.95);
  border: 2px solid rgba(var(--v-theme-primary), 0.3);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  .login-title {
    color: white;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .login-subtitle {
    color: #b0b0b0;
    font-size: 1.1rem;
  }
}

// ===== AUTHENTICATION TABS =====
.auth-tabs {
  :deep(.v-tab) {
    color: rgba(255, 255, 255, 0.6);
    font-weight: 600;
    letter-spacing: 0.5px;
    transition: all 0.3s ease;

    &:hover {
      color: rgba(255, 255, 255, 0.9);
    }

    &.v-tab--selected {
      color: rgb(var(--v-theme-primary));
    }
  }

  :deep(.v-tabs-slider) {
    height: 3px;
    border-radius: 3px;
  }
}

// ===== AUTH FORM =====
.auth-form {
  .auth-description {
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 1.5rem;
  }

  :deep(.v-text-field) {
    .v-field {
      background-color: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
    }

    .v-field--focused {
      box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.3);
    }
  }
}

// ===== AUTH BUTTON =====
.auth-button {
  border-radius: 8px;
  font-weight: 600;
  height: 48px !important;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.3);
  }
}

// ===== ERROR ALERT =====
.error-alert {
  border-radius: 8px;
  animation: shake 0.5s ease;

  :deep(.v-alert__content) {
    font-weight: 500;
  }
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-5px);
  }
  20%,
  40%,
  60%,
  80% {
    transform: translateX(5px);
  }
}

// ===== RESPONSIVE =====
@media (max-width: 600px) {
  .login-card {
    margin: 16px;

    .login-title {
      font-size: 1.8rem !important;

      .v-icon {
        display: none;
      }
    }

    .login-subtitle {
      font-size: 1rem !important;
    }
  }

  .auth-tabs {
    :deep(.v-tab) {
      font-size: 0.875rem;

      .v-icon {
        display: none;
      }
    }
  }
}

@media (max-width: 400px) {
  .login-container {
    padding: 8px;
  }

  .login-card {
    padding: 16px !important;
  }
}

// ===== ANIMATIONS =====
.login-card {
  animation: slideIn 0.6s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-title {
  animation: fadeIn 0.8s ease-out 0.2s both;
}

.login-subtitle {
  animation: fadeIn 0.8s ease-out 0.4s both;
}

.auth-tabs {
  animation: fadeIn 0.8s ease-out 0.6s both;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ===== DARK THEME OVERRIDES =====
:deep(.v-btn) {
  border-radius: 8px;
  font-weight: 600;
}

:deep(.v-chip) {
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: scale(1.05);
    opacity: 0.8;
  }
}
</style>
