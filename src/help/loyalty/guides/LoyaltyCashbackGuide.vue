<script setup lang="ts">
import cashbackNewImg from '@/help/assets/screenshots/loyalty/06_customer_cashback_new.jpg'
import vipPrintQrImg from '@/help/assets/screenshots/loyalty/15_vip_cashback_print_qr.jpg'
</script>

<template>
  <div class="loyalty-cashback-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="amber" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-star-circle</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Pelanggan VIP / Cashback</h1>
        <p class="text-body-2 text-medium-emphasis">
          Mendaftarkan pelanggan reguler dengan program Cashback (jarang)
        </p>
      </div>
    </div>

    <!-- When -->
    <v-alert type="info" variant="tonal" class="mb-6">
      <strong>Kapan pakai Cashback:</strong>
      untuk pelanggan reguler / VIP yang sering datang, berdasarkan pertimbangan staf. Default untuk
      pelanggan baru tetap
      <strong>Stamps</strong>
      .
    </v-alert>

    <!-- Steps -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="amber" class="mr-2">mdi-account-plus</v-icon>
          Registrasi Pelanggan Cashback
        </v-card-title>
        <v-card-text>
          <ol class="pl-4 mb-4">
            <li class="mb-2">
              Buka dialog
              <strong>Loyalty</strong>
              → tab
              <strong>CUSTOMER</strong>
              → tekan
              <strong>NEW</strong>
            </li>
            <li class="mb-2">Isi form:</li>
          </ol>

          <ul class="pl-8 mb-4">
            <li class="mb-1">
              <strong>Nama pelanggan</strong>
              (wajib)
            </li>
            <li class="mb-1">
              <strong>Nomor telepon</strong>
              (disarankan)
            </li>
            <li>
              <strong>Telegram</strong>
              (opsional)
            </li>
          </ul>

          <ol start="3" class="pl-4 mb-4">
            <li class="mb-2">
              Ubah program loyalitas dari
              <strong>STAMPS</strong>
              ke
              <strong>CASHBACK</strong>
              (tombol kanan di bawah Loyalty program)
            </li>
          </ol>

          <v-img
            :src="cashbackNewImg"
            max-width="600"
            class="rounded-lg elevation-2 mb-4"
            alt="Form CUSTOMER → NEW dengan CASHBACK dipilih"
          />

          <ol start="4" class="pl-4 mb-0">
            <li>
              Tekan
              <strong>CREATE</strong>
              — pelanggan dibuat dan terpasang ke pesanan
            </li>
          </ol>
        </v-card-text>
      </v-card>
    </section>

    <!-- CRITICAL: Invite QR is mandatory for cashback -->
    <section class="mb-8">
      <v-card border color="error">
        <v-card-title class="d-flex align-center bg-error-lighten-4">
          <v-icon color="error" class="mr-2">mdi-alert-circle</v-icon>
          WAJIB: Cetak Invite QR Segera
        </v-card-title>
        <v-card-text>
          <v-alert type="error" variant="tonal" class="mb-4">
            <strong>
              Untuk pelanggan Cashback / VIP, cetak Invite QR sekarang — jangan tunda, jangan
              lewatkan.
            </strong>
            <div class="mt-2">
              Jika pelanggan nanti registrasi sendiri (lewat pre-bill QR atau link umum) tanpa
              Invite QR VIP,
              <strong>mereka otomatis masuk program STAMPS</strong>
              — bukan Cashback. Akun Cashback yang kasir buat akan jadi
              <strong>pelanggan duplikat yang tidak terhubung</strong>
              — perlu merge admin untuk memperbaiki.
            </div>
          </v-alert>

          <p class="mb-3">
            Setelah CREATE, panel pelanggan menampilkan chip
            <strong class="text-amber">MEMBER (5%)</strong>
            dan dua tombol:
          </p>

          <v-img
            :src="vipPrintQrImg"
            max-width="700"
            class="rounded-lg elevation-2 mb-4"
            alt="Pelanggan VIP Cashback dengan PRINT INVITE QR dan SHOW QR"
          />
          <p class="text-caption text-medium-emphasis mb-4">
            Pelanggan baru VIP Cashback ("MEMBER 5%") — tekan
            <strong>PRINT INVITE QR</strong>
            sekarang
          </p>

          <h3 class="text-subtitle-1 font-weight-bold mb-2">Langkah-langkah:</h3>
          <ol class="pl-4 mb-4">
            <li class="mb-2">
              Tekan
              <strong>PRINT INVITE QR</strong>
              (cetak struk) atau
              <strong>SHOW QR</strong>
              (tampilkan di layar)
            </li>
            <li class="mb-2">
              Berikan ke pelanggan dan kawal scan sekarang juga:
              <em>
                "Mas / Mbak, tolong scan QR ini sekarang supaya akun VIP Cashback Anda aktif."
              </em>
            </li>
            <li class="mb-2">
              Pelanggan scan → buka halaman registrasi → daftar (Google / Telegram / Email)
            </li>
            <li>
              Akun online
              <strong>otomatis terhubung</strong>
              ke record Cashback yang sudah dibuat — chip MEMBER (5%) dan saldo tetap
            </li>
          </ol>

          <v-alert type="warning" variant="tonal" density="compact">
            <strong>Kenapa ini wajib, bukan opsional?</strong>
            Default registrasi online (via pre-bill QR / link umum) =
            <strong>STAMPS</strong>
            . Invite QR VIP membawa parameter khusus yang menghubungkan registrasi online ke akun
            Cashback yang sudah ada. Tanpa itu — pelanggan dapat Stamps, bukan Cashback.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Key differences -->
    <v-card variant="tonal" color="amber" class="mb-4">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-information</v-icon>
        Perbedaan Cashback vs Stamps
      </v-card-title>
      <v-card-text>
        <ul class="pl-4 mb-0">
          <li class="mb-2">
            <strong>Tidak ada kartu fisik</strong>
            — saldo disimpan di akun pelanggan
          </li>
          <li class="mb-2">
            <strong>% dari setiap pesanan masuk ke saldo loyalty</strong>
            (diatur admin di Loyalty Settings)
          </li>
          <li class="mb-2">
            Saldo bisa dipakai untuk memotong bill di checkout (toggle
            <strong>Use Points</strong>
            )
          </li>
          <li>
            Pelanggan hanya bisa di
            <strong>satu program</strong>
            — stamps
            <em>atau</em>
            cashback, tidak keduanya
          </li>
        </ul>
      </v-card-text>
    </v-card>

    <v-alert type="warning" variant="tonal" class="mb-4">
      Untuk ubah pelanggan yang sudah ada dari Stamps ke Cashback (atau sebaliknya), minta
      <strong>admin</strong>
      — kasir tidak bisa ubah program pelanggan yang sudah terdaftar.
    </v-alert>
  </div>
</template>

<style scoped lang="scss">
.loyalty-cashback-guide {
  max-width: 1200px;
}
</style>
