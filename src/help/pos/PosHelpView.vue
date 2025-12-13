<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const guides = [
  {
    id: 'guide',
    title: 'Panduan POS',
    description:
      'Panduan lengkap untuk menggunakan sistem Point of Sale: pesanan, pembayaran, shift, dan pengeluaran',
    icon: 'mdi-book-open-variant',
    route: 'help-pos-guide',
    tags: ['Pesanan', 'Pembayaran', 'Shift', 'Expense']
  }
]

const features = [
  {
    icon: 'mdi-clipboard-list',
    title: 'Order Management',
    description: 'Create and manage customer orders'
  },
  {
    icon: 'mdi-credit-card',
    title: 'Payment Processing',
    description: 'Accept Cash, Card, and QR payments'
  },
  {
    icon: 'mdi-clock-outline',
    title: 'Shift Management',
    description: 'Track shift performance and cash balance'
  }
]

function goToGuide(routeName: string) {
  router.push({ name: routeName })
}
</script>

<template>
  <div class="pos-help">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="green" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-cash-register</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">POS Help</h1>
        <p class="text-body-2 text-medium-emphasis">
          Guides and instructions for cashiers and waiters
        </p>
      </div>
    </div>

    <!-- Overview Section -->
    <v-card variant="tonal" color="green" class="mb-6">
      <v-card-text>
        <h2 class="text-h6 font-weight-medium mb-3">
          <v-icon class="mr-2">mdi-information</v-icon>
          About POS Module
        </h2>
        <p class="text-body-2 mb-4">
          The POS (Point of Sale) module is designed for cashiers and waiters to efficiently process
          customer orders, handle payments, and manage shift operations. It provides a
          touch-friendly interface optimized for fast transactions.
        </p>

        <v-row>
          <v-col v-for="feature in features" :key="feature.title" cols="12" sm="4">
            <div class="d-flex align-start">
              <v-icon color="green-darken-2" class="mr-2 mt-1">{{ feature.icon }}</v-icon>
              <div>
                <div class="text-subtitle-2 font-weight-medium">{{ feature.title }}</div>
                <div class="text-caption text-medium-emphasis">{{ feature.description }}</div>
              </div>
            </div>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Quick Access -->
    <v-alert type="info" variant="tonal" class="mb-6">
      <div class="d-flex align-center justify-space-between flex-wrap gap-2">
        <div>
          <strong>Quick Access:</strong>
          Open POS directly
        </div>
        <v-btn
          color="primary"
          variant="flat"
          size="small"
          href="/pos"
          prepend-icon="mdi-open-in-new"
        >
          Open POS
        </v-btn>
      </div>
    </v-alert>

    <v-divider class="mb-6" />

    <!-- Guides List -->
    <h2 class="text-h6 font-weight-medium mb-4">
      <v-icon class="mr-2">mdi-book-open-variant</v-icon>
      Available Guides
    </h2>

    <v-row>
      <v-col v-for="guide in guides" :key="guide.id" cols="12" md="6">
        <v-card class="guide-card" hover @click="goToGuide(guide.route)">
          <v-card-text class="d-flex align-start pa-4">
            <v-avatar color="green-darken-1" size="48" class="mr-4">
              <v-icon color="white">{{ guide.icon }}</v-icon>
            </v-avatar>

            <div class="flex-grow-1">
              <h3 class="text-subtitle-1 font-weight-bold mb-1">
                {{ guide.title }}
              </h3>
              <p class="text-body-2 text-medium-emphasis mb-3">
                {{ guide.description }}
              </p>
              <div class="d-flex flex-wrap gap-1">
                <v-chip
                  v-for="tag in guide.tags"
                  :key="tag"
                  size="x-small"
                  variant="tonal"
                  color="green"
                >
                  {{ tag }}
                </v-chip>
              </div>
            </div>

            <v-icon color="grey">mdi-chevron-right</v-icon>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Empty State for future -->
    <v-alert v-if="guides.length === 0" type="info" variant="tonal" class="mt-4">
      No guides available yet. Check back later!
    </v-alert>
  </div>
</template>

<style scoped lang="scss">
.pos-help {
  max-width: 900px;
}

.guide-card {
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateX(4px);
  }
}
</style>
