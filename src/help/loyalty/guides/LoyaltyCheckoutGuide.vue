<script setup lang="ts">
import billMenuImg from '@/help/assets/screenshots/loyalty/09_bill_menu_card.jpg'
import checkoutImg from '@/help/assets/screenshots/loyalty/10_checkout_add_customer.jpg'
</script>

<template>
  <div class="loyalty-checkout-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="green" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-credit-card-check</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Loyalty di Checkout</h1>
        <p class="text-body-2 text-medium-emphasis">
          Cara pasang / lepas pelanggan, dan kontrol loyalty di Payment dialog
        </p>
      </div>
    </div>

    <!-- Bill Menu -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-dots-vertical</v-icon>
          Menu di Bill — Attach / Detach Card &amp; Customer
        </v-card-title>
        <v-card-text>
          <p class="mb-3">
            Tekan
            <strong>titik tiga</strong>
            di sebelah nomor Bill → menu aksi muncul:
          </p>

          <v-img
            :src="billMenuImg"
            max-width="600"
            class="rounded-lg elevation-2 mb-4"
            alt="Menu Bill dengan Change Card / Detach Card / Attach Customer / Rename"
          />

          <v-table density="comfortable">
            <thead>
              <tr>
                <th class="text-left">Aksi</th>
                <th class="text-left">Kapan Digunakan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Attach Card</strong>
                </td>
                <td>
                  Pasang kartu ke Bill (buka dialog Loyalty → tab CARD). Muncul jika belum ada kartu
                  terpasang
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Change Card</strong>
                </td>
                <td>Ganti kartu yang sudah terpasang. Muncul jika sudah ada kartu di Bill</td>
              </tr>
              <tr>
                <td>
                  <strong>Detach Card</strong>
                </td>
                <td>
                  Lepas kartu dari Bill (tanpa menghapus data kartu). Muncul jika ada kartu
                  terpasang
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Attach Customer</strong>
                </td>
                <td>Pasang pelanggan (buka dialog Loyalty → tab CUSTOMER atau SCAN)</td>
              </tr>
              <tr>
                <td>
                  <strong>Rename</strong>
                </td>
                <td>Ubah nama Bill (mis. "Bill 1" → "Meja VIP")</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>
    </section>

    <!-- Payment Dialog -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-cash-register</v-icon>
          Payment Checkout Dialog
        </v-card-title>
        <v-card-text>
          <p class="mb-3">
            Di dialog Payment Checkout, tekan
            <strong>ADD DISCOUNT</strong>
            untuk membuka menu kontrol loyalty:
          </p>

          <v-img
            :src="checkoutImg"
            max-width="700"
            class="rounded-lg elevation-2 mb-4"
            alt="Payment Checkout dengan Add Customer / Card + Manual Discount"
          />

          <h3 class="text-subtitle-1 font-weight-bold mb-2">Add Customer / Card</h3>
          <p class="mb-4">
            Jika pelanggan belum terpasang, tekan
            <strong>Add Customer / Card</strong>
            — buka dialog Loyalty langsung dari checkout tanpa harus kembali ke order.
          </p>

          <h3 class="text-subtitle-1 font-weight-bold mb-2">Manual Discount</h3>
          <p class="mb-4">
            Diskon manual (% atau nominal) — bisa dipakai walau tidak ada pelanggan terpasang.
          </p>

          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            Jika pelanggan terpasang, menu Discount akan menampilkan opsi tambahan sesuai program
            loyalty mereka — lihat di bawah.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Loyalty Controls -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-gift-outline</v-icon>
          Kontrol Loyalty di Checkout
        </v-card-title>
        <v-card-text>
          <h3 class="text-subtitle-1 font-weight-bold mb-2">Stamps earned indicator</h3>
          <p class="mb-4">
            Untuk pelanggan Stamps dengan kartu aktif, order summary menampilkan:
            <code>Stamps earned: +N (X + N = Y/15)</code>
            . Dicetak otomatis saat pesanan selesai. Hanya pesanan yang mencapai threshold (Admin →
            Loyalty → Settings) yang dapat stamp — pesanan kecil mungkin 0 stamp.
          </p>

          <h3 class="text-subtitle-1 font-weight-bold mb-2">Stamp Card Reward</h3>
          <p class="mb-4">
            Kalau kartu sudah capai milestone (mis. 5/15 → free coffee), di menu Discount muncul
            baris
            <strong>🎁 Stamp Card Reward</strong>
            . Tekan → dialog Bill Discount terbuka dengan reward sudah dipilih. Apply sebagai
            diskon.
            <strong>Jangan lupa apply</strong>
            — reward tetap di kartu sampai digunakan, tapi pelanggan mengharapkan kasir menerapkan
            di checkout.
          </p>

          <h3 class="text-subtitle-1 font-weight-bold mb-2">Use Points (Cashback redemption)</h3>
          <p class="mb-4">
            Untuk pelanggan Cashback dengan saldo positif, di order summary muncul
            <strong>Use Points</strong>
            toggle. On → field "Points to redeem (IDR)" muncul. Isi jumlah untuk dipotong (max =
            saldo, capped di total pesanan).
          </p>

          <h3 class="text-subtitle-1 font-weight-bold mb-2">Personal Discount auto-apply</h3>
          <p class="mb-2">
            Jika pelanggan punya
            <strong>personal discount</strong>
            (chip orange
            <code>DISCOUNT N%</code>
            — diset admin untuk teman/founder/dll), diskon
            <strong>diterapkan otomatis</strong>
            di level order. Menu Discount menampilkan:
          </p>
          <ul class="pl-4 mb-4">
            <li>
              Manual Discount —
              <em>Overridden by personal discount (N%)</em>
            </li>
            <li>
              Stamp Card Reward —
              <em>Overridden by personal discount</em>
            </li>
          </ul>
          <p class="mb-0">
            Personal discount menggantikan yang lain — kasir tidak perlu apply apapun. Jika
            pelanggan juga mau pakai Points/Reward, itu tidak bisa — minta admin hapus personal
            discount atau workaround manual.
          </p>
        </v-card-text>
      </v-card>
    </section>

    <!-- Pre-bill QR -->
    <v-card variant="tonal" color="green" class="mb-4">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-qrcode</v-icon>
        Alternatif: Pre-bill QR
      </v-card-title>
      <v-card-text>
        <p class="mb-2">Pelanggan bisa registrasi sendiri tanpa kasir harus input apapun:</p>
        <ol class="pl-4 mb-0">
          <li class="mb-1">Buat pesanan seperti biasa</li>
          <li class="mb-1">
            Tekan
            <strong>Print Pre-bill</strong>
            — QR code tercetak di bagian bawah
          </li>
          <li class="mb-1">
            Berikan pre-bill:
            <em>"Scan QR untuk gabung program rewards!"</em>
          </li>
          <li class="mb-1">Pelanggan scan → registrasi (Google / Telegram / Email)</li>
          <li>
            POS menampilkan notifikasi:
            <strong>"{Nama} linked to Order #{nomor}"</strong>
          </li>
        </ol>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped lang="scss">
.loyalty-checkout-guide {
  max-width: 1200px;
}
</style>
