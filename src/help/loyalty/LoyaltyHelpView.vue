<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const guides = [
  {
    id: 'overview',
    title: 'Ikhtisar Loyalty',
    description: 'Program Stamps vs Cashback, alur kerja, dan dua antarmuka registrasi',
    icon: 'mdi-information',
    color: 'blue',
    route: 'help-loyalty-overview'
  },
  {
    id: 'new-card',
    title: 'Kartu Baru & Registrasi Pelanggan',
    description: 'Memberikan kartu kosong, membuat kartu + pelanggan saat checkout',
    icon: 'mdi-card-plus',
    color: 'purple',
    route: 'help-loyalty-new-card'
  },
  {
    id: 'find-customer',
    title: 'Cari Pelanggan yang Sudah Terdaftar',
    description: 'SCAN QR, cari berdasarkan nomor kartu, nama, atau telepon',
    icon: 'mdi-account-search',
    color: 'teal',
    route: 'help-loyalty-find-customer'
  },
  {
    id: 'cashback',
    title: 'Pelanggan VIP / Cashback',
    description: 'Mendaftarkan pelanggan reguler dengan program Cashback',
    icon: 'mdi-star-circle',
    color: 'amber',
    route: 'help-loyalty-cashback'
  },
  {
    id: 'checkout',
    title: 'Loyalty di Checkout',
    description: 'Bill menu (Attach/Detach Card), stamps earned, reward, dan Use Points',
    icon: 'mdi-credit-card-check',
    color: 'green',
    route: 'help-loyalty-checkout'
  },
  {
    id: 'admin',
    title: 'Admin Loyalty',
    description:
      'Untuk admin/manager: add stamps, adjust saldo, merge duplikat, issue kartu, switch program',
    icon: 'mdi-shield-account',
    color: 'red-darken-2',
    route: 'help-loyalty-admin'
  }
]

function navigateToGuide(routeName: string) {
  router.push({ name: routeName })
}
</script>

<template>
  <div class="loyalty-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="purple" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-card-account-details</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Panduan Loyalty</h1>
        <p class="text-body-2 text-medium-emphasis">
          Panduan kasir untuk program loyalitas (Stamps & Cashback)
        </p>
      </div>
    </div>

    <!-- Quick Overview -->
    <v-alert type="info" variant="tonal" class="mb-6">
      <strong>Dua Program Loyalty:</strong>
      <ul class="mt-2 mb-0">
        <li>
          <strong>Stamps</strong>
          — kartu fisik, kumpul stamp per pesanan, reward di milestone. Default untuk pelanggan baru
        </li>
        <li>
          <strong>Cashback</strong>
          — % dari pesanan masuk ke saldo. Untuk pelanggan reguler / VIP
        </li>
      </ul>
    </v-alert>

    <!-- Guide Cards -->
    <v-row>
      <v-col v-for="guide in guides" :key="guide.id" cols="12" md="6">
        <v-card
          class="guide-card h-100"
          :color="guide.color"
          variant="tonal"
          @click="navigateToGuide(guide.route)"
        >
          <v-card-item>
            <template #prepend>
              <v-avatar :color="guide.color" size="48">
                <v-icon size="24" color="white">{{ guide.icon }}</v-icon>
              </v-avatar>
            </template>
            <v-card-title>{{ guide.title }}</v-card-title>
          </v-card-item>

          <v-card-text>
            <p class="text-body-2">{{ guide.description }}</p>
          </v-card-text>

          <v-card-actions>
            <v-spacer />
            <v-btn :color="guide.color" variant="text" append-icon="mdi-arrow-right">
              Buka Panduan
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </div>
</template>

<style scoped lang="scss">
.loyalty-guide {
  max-width: 1200px;
}

.guide-card {
  cursor: pointer;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-4px);
  }
}
</style>
