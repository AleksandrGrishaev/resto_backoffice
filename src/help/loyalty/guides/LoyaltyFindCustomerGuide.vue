<script setup lang="ts">
import scanQrImg from '@/help/assets/screenshots/loyalty/04_scan_qr.jpg'
import customerCabinetImg from '@/help/assets/screenshots/loyalty/05_customer_cabinet_qr.png'
import cardFoundImg from '@/help/assets/screenshots/loyalty/03_card_found.jpg'
</script>

<template>
  <div class="loyalty-find-customer-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="teal" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-account-search</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Cari Pelanggan yang Sudah Terdaftar</h1>
        <p class="text-body-2 text-medium-emphasis">
          Tiga cara menemukan pelanggan: QR, nomor kartu, nama/telepon
        </p>
      </div>
    </div>

    <!-- Method 1: Scan QR -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-chip color="teal" variant="tonal" size="small" class="mr-2">Metode 1</v-chip>
          Scan QR Pelanggan
          <v-chip color="success" size="x-small" class="ml-2">Disarankan</v-chip>
        </v-card-title>
        <v-card-text>
          <v-alert type="success" variant="tonal" class="mb-4" density="compact">
            Paling cepat &amp; paling fresh — selalu akses database terbaru, bukan cache.
          </v-alert>

          <ol class="pl-4 mb-4">
            <li class="mb-2">
              Minta pelanggan:
              <em>"Buka cabinet loyalty Anda dan tunjukkan QR code"</em>
            </li>
            <li class="mb-2">
              Buka dialog
              <strong>Loyalty</strong>
              → tab
              <strong>SCAN</strong>
            </li>
            <li class="mb-2">Arahkan kamera ke QR di HP pelanggan</li>
            <li class="mb-2">
              Info pelanggan muncul → tekan
              <strong>Attach</strong>
            </li>
            <li>Stamps / cashback otomatis bertambah saat pesanan selesai</li>
          </ol>

          <v-row>
            <v-col cols="12" md="7">
              <v-img
                :src="scanQrImg"
                class="rounded-lg elevation-2"
                alt="Tab SCAN dengan kamera membaca QR dari HP pelanggan"
              />
              <p class="text-caption text-center text-medium-emphasis mt-2">
                Tab SCAN — arahkan kamera ke QR di HP pelanggan
              </p>
            </v-col>
            <v-col cols="12" md="5">
              <v-img
                :src="customerCabinetImg"
                class="rounded-lg elevation-2"
                alt="QR di cabinet pelanggan"
              />
              <p class="text-caption text-center text-medium-emphasis mt-2">
                Seperti inilah QR di cabinet pelanggan
              </p>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </section>

    <!-- Method 2: Search by name/phone -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-chip color="teal" variant="tonal" size="small" class="mr-2">Metode 2</v-chip>
          Cari Berdasarkan Nama, Telepon, atau Telegram
        </v-card-title>
        <v-card-text>
          <ol class="pl-4 mb-0">
            <li class="mb-2">
              Buka dialog
              <strong>Loyalty</strong>
              → tab
              <strong>CUSTOMER</strong>
            </li>
            <li class="mb-2">Ketik nama, telepon, atau telegram pelanggan (minimal 2 karakter)</li>
            <li>Tekan hasil untuk pasang ke pesanan</li>
          </ol>

          <v-alert type="warning" variant="tonal" class="mt-4" density="compact">
            <strong>Catatan:</strong>
            Daftar pelanggan di-load saat POS start dan
            <strong>tidak auto-refresh</strong>
            . Jika pelanggan baru registrasi online tapi tidak muncul di CUSTOMER search, pakai tab
            <strong>SCAN</strong>
            — itu selalu query database terbaru.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Method 3: Find by card number -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-chip color="teal" variant="tonal" size="small" class="mr-2">Metode 3</v-chip>
          Cari Berdasarkan Nomor Kartu
        </v-card-title>
        <v-card-text>
          <ol class="pl-4 mb-4">
            <li class="mb-2">
              Buka dialog
              <strong>Loyalty</strong>
              → tab
              <strong>CARD</strong>
            </li>
            <li class="mb-2">
              Ketik nomor kartu → tekan
              <strong>FIND</strong>
              (atau pilih dari saran saat mengetik)
            </li>
            <li>Info kartu muncul: jumlah stamp, siklus, nama pelanggan (jika terhubung)</li>
          </ol>

          <v-img
            :src="cardFoundImg"
            max-width="600"
            class="rounded-lg elevation-2"
            alt="Card #014 ditemukan dengan 3/15 stamps"
          />
          <p class="text-caption text-medium-emphasis mt-2">
            Hasil FIND — Card #014 aktif dengan 3/15 stamps
          </p>
        </v-card-text>
      </v-card>
    </section>

    <!-- FAQ -->
    <v-card variant="tonal" color="blue" class="mb-4">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-help-circle</v-icon>
        FAQ
      </v-card-title>
      <v-card-text>
        <p class="font-weight-medium mb-1">Pelanggan kehilangan kartu fisik, bagaimana?</p>
        <p class="mb-3">
          Cari via nama di tab CUSTOMER. Jika ketemu, pasang ke pesanan — stamp akan bertambah di
          akun mereka tanpa kartu fisik. Jika perlu kartu ganti, minta admin untuk issue kartu baru
          via Admin → Loyalty.
        </p>

        <p class="font-weight-medium mb-1">Saya pasang pelanggan yang salah, bagaimana batalkan?</p>
        <p class="mb-0">
          Di panel loyalty, tekan
          <strong>tanda X merah</strong>
          kecil di sebelah nama pelanggan / nomor kartu. Itu melepas tautan tanpa menghapus data
          apapun. Lalu pasang yang benar.
        </p>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped lang="scss">
.loyalty-find-customer-guide {
  max-width: 1200px;
}
</style>
