<script setup lang="ts">
// Screenshots
import posMainImg from '@/help/assets/screenshots/pos/pos_01_main.png'
import posMenuImg from '@/help/assets/screenshots/pos/pos_02_menu.png'
</script>

<template>
  <div class="pos-overview-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="green" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-information</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Ikhtisar POS</h1>
        <p class="text-body-2 text-medium-emphasis">
          Pengenalan sistem Point of Sale dan layar utama
        </p>
      </div>
    </div>

    <!-- Section: Overview -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-information</v-icon>
          Apa itu POS?
        </v-card-title>
        <v-card-text>
          <p class="mb-4">
            Sistem
            <strong>Point of Sale (POS)</strong>
            adalah antarmuka kasir untuk memproses pesanan pelanggan. POS dirancang untuk penggunaan
            yang cepat dan efisien dengan kontrol sentuh yang besar.
          </p>

          <v-alert type="info" variant="tonal" class="mb-4">
            <strong>Fitur Utama POS:</strong>
            <ul class="mt-2 mb-0">
              <li>Membuat dan mengelola pesanan</li>
              <li>Memproses pembayaran (Tunai, Kartu, QR Code)</li>
              <li>Manajemen shift kasir</li>
              <li>Pencatatan pengeluaran kas</li>
              <li>Diskon item dan bill</li>
            </ul>
          </v-alert>

          <v-row>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 text-center">
                <v-icon size="32" color="green" class="mb-2">mdi-clipboard-list</v-icon>
                <div class="text-subtitle-2 font-weight-medium">Pesanan</div>
                <div class="text-caption text-medium-emphasis">Buat dan kelola pesanan</div>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 text-center">
                <v-icon size="32" color="blue" class="mb-2">mdi-credit-card</v-icon>
                <div class="text-subtitle-2 font-weight-medium">Pembayaran</div>
                <div class="text-caption text-medium-emphasis">Proses berbagai metode bayar</div>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 text-center">
                <v-icon size="32" color="orange" class="mb-2">mdi-clock-outline</v-icon>
                <div class="text-subtitle-2 font-weight-medium">Shift</div>
                <div class="text-caption text-medium-emphasis">Kelola shift kasir</div>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </section>

    <!-- Section: Main Screen -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-monitor</v-icon>
          Layar Utama POS
        </v-card-title>
        <v-card-text>
          <p class="mb-4">
            Layar utama POS terdiri dari tiga bagian: sidebar kiri untuk pesanan/meja, bagian tengah
            untuk menu, dan bagian kanan untuk detail pesanan.
          </p>

          <v-img :src="posMainImg" class="rounded-lg mb-4" max-height="500" />

          <v-list density="compact" class="mb-4">
            <v-list-subheader>Komponen Layar Utama</v-list-subheader>
            <v-list-item prepend-icon="mdi-menu">
              <v-list-item-title>Sidebar Kiri</v-list-item-title>
              <v-list-item-subtitle>
                Daftar pesanan aktif dan meja yang tersedia
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-food">
              <v-list-item-title>Menu (Tengah)</v-list-item-title>
              <v-list-item-subtitle>
                Kategori dan item menu untuk ditambahkan ke pesanan
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-receipt">
              <v-list-item-title>Detail Pesanan (Kanan)</v-list-item-title>
              <v-list-item-subtitle>Item yang dipesan, total, dan tombol aksi</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-divider class="my-4" />

          <h4 class="text-subtitle-1 font-weight-medium mb-3">Menu Hamburger</h4>
          <p class="mb-4">Klik ikon menu (☰) di pojok kiri bawah untuk mengakses opsi tambahan:</p>

          <v-img :src="posMenuImg" class="rounded-lg mb-4" max-height="500" />

          <v-alert type="info" variant="tonal">
            <strong>Opsi Menu:</strong>
            <ul class="mt-2 mb-0">
              <li>
                <strong>Shift Management</strong>
                - Kelola shift kasir
              </li>
              <li>
                <strong>End Shift</strong>
                - Akhiri shift saat ini
              </li>
              <li>
                <strong>Kitchen Monitor</strong>
                - Buka monitor dapur
              </li>
              <li>
                <strong>Logout</strong>
                - Keluar dari sistem
              </li>
            </ul>
          </v-alert>
        </v-card-text>
      </v-card>
    </section>
  </div>
</template>

<style scoped lang="scss">
.pos-overview-guide {
  max-width: 900px;
}
</style>
