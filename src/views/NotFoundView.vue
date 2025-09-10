<!-- src/views/NotFoundView.vue -->
<template>
  <v-app>
    <v-main class="not-found-page">
      <v-container fluid class="fill-height">
        <v-row justify="center" align="center">
          <v-col cols="12" sm="8" md="6" class="text-center">
            <div class="error-content">
              <!-- 404 Icon -->
              <v-icon
                icon="mdi-map-marker-question-outline"
                size="120"
                color="primary"
                class="mb-6"
              />

              <!-- Error Title -->
              <h1 class="text-h2 font-weight-bold mb-4 error-title">404</h1>

              <!-- Error Message -->
              <h2 class="text-h5 mb-4 text-medium-emphasis">Page Not Found</h2>

              <p class="text-body-1 mb-6 text-medium-emphasis">
                The page you're looking for doesn't exist or has been moved.
              </p>

              <!-- Action Buttons -->
              <div class="action-buttons">
                <v-btn
                  color="primary"
                  size="large"
                  prepend-icon="mdi-home"
                  class="mr-4"
                  @click="goHome"
                >
                  Go Home
                </v-btn>

                <v-btn
                  variant="outlined"
                  size="large"
                  prepend-icon="mdi-arrow-left"
                  @click="goBack"
                >
                  Go Back
                </v-btn>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

function goHome() {
  if (authStore.isAuthenticated) {
    // Redirect to default route based on user role
    const defaultRoute = authStore.getDefaultRoute()
    router.push(defaultRoute)
  } else {
    // Redirect to login
    router.push('/auth/login')
  }
}

function goBack() {
  router.go(-1)
}
</script>

<style lang="scss" scoped>
.not-found-page {
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  min-height: 100vh;
}

.error-content {
  animation: fadeInUp 0.6s ease-out;
}

.error-title {
  background: linear-gradient(45deg, #a395e9, #bfb5f2);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-size: 200% 200%;
  animation: gradientShift 3s ease-in-out infinite;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

// Animations
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes gradientShift {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

// Responsive
@media (max-width: 600px) {
  .action-buttons {
    flex-direction: column;
    align-items: center;

    .v-btn {
      width: 100%;
      max-width: 200px;
    }
  }

  .error-title {
    font-size: 3rem !important;
  }
}
</style>
