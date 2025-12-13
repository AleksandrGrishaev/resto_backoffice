<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const guides = [
  {
    id: 'overview',
    title: 'Ikhtisar POS',
    description: 'Pengenalan sistem Point of Sale dan layar utama',
    icon: 'mdi-information',
    color: 'blue',
    route: '/help/pos/overview'
  },
  {
    id: 'orders',
    title: 'Kelola Pesanan',
    description: 'Membuat pesanan, menambah item (sederhana & komposit), dan aksi item',
    icon: 'mdi-clipboard-list',
    color: 'green',
    route: '/help/pos/orders'
  },
  {
    id: 'discounts',
    title: 'Diskon',
    description: 'Memberikan diskon pada item atau total bill',
    icon: 'mdi-percent',
    color: 'purple',
    route: '/help/pos/discounts'
  },
  {
    id: 'cancel-move',
    title: 'Pembatalan & Pindah Item',
    description: 'Membatalkan item dan memindahkan item antar bill',
    icon: 'mdi-swap-horizontal',
    color: 'orange',
    route: '/help/pos/cancel-move'
  },
  {
    id: 'payment',
    title: 'Pembayaran',
    description: 'Memproses pembayaran dengan berbagai metode',
    icon: 'mdi-credit-card',
    color: 'teal',
    route: '/help/pos/payment'
  },
  {
    id: 'shift',
    title: 'Shift & Pengeluaran',
    description: 'Mengelola shift kasir dan mencatat pengeluaran kas',
    icon: 'mdi-clock-outline',
    color: 'amber',
    route: '/help/pos/shift'
  }
]

function navigateToGuide(route: string) {
  router.push(route)
}
</script>

<template>
  <div class="pos-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="green" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-cash-register</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Panduan POS</h1>
        <p class="text-body-2 text-medium-emphasis">
          Panduan lengkap untuk menggunakan sistem Point of Sale
        </p>
      </div>
    </div>

    <!-- Quick Overview -->
    <v-alert type="info" variant="tonal" class="mb-6">
      <strong>Fitur Utama POS:</strong>
      <ul class="mt-2 mb-0">
        <li>Membuat dan mengelola pesanan (dine-in, delivery, takeaway)</li>
        <li>Memproses pembayaran (Tunai, Kartu, QR Code)</li>
        <li>Manajemen shift kasir</li>
        <li>Pencatatan pengeluaran kas</li>
        <li>Diskon item dan bill</li>
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
            <v-card-subtitle>{{ guide.description }}</v-card-subtitle>
          </v-card-item>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" :color="guide.color" append-icon="mdi-arrow-right">
              Buka Panduan
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Quick Tips -->
    <v-card variant="tonal" color="green" class="mt-6">
      <v-card-title>
        <v-icon class="mr-2">mdi-lightbulb</v-icon>
        Tips Cepat
      </v-card-title>
      <v-card-text>
        <v-row>
          <v-col cols="12" md="6">
            <v-list density="compact" bg-color="transparent">
              <v-list-item prepend-icon="mdi-check-circle">
                <v-list-item-subtitle>
                  Gunakan tombol
                  <strong>EXACT</strong>
                  untuk pembayaran pas
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item prepend-icon="mdi-check-circle">
                <v-list-item-subtitle>
                  Selalu periksa ringkasan shift sebelum mengakhiri
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-col>
          <v-col cols="12" md="6">
            <v-list density="compact" bg-color="transparent">
              <v-list-item prepend-icon="mdi-check-circle">
                <v-list-item-subtitle>
                  Catat pengeluaran segera dengan bukti yang jelas
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item prepend-icon="mdi-check-circle">
                <v-list-item-subtitle>
                  Gunakan modifier untuk permintaan khusus pelanggan
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped lang="scss">
.pos-guide {
  max-width: 900px;
}

.guide-card {
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
}
</style>
