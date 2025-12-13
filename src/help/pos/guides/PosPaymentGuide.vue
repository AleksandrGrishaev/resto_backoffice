<script setup lang="ts">
// Screenshots
import posPaymentImg from '@/help/assets/screenshots/pos/pos_06_payment_dialog.png'
</script>

<template>
  <div class="pos-payment-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="green" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-credit-card</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Pembayaran</h1>
        <p class="text-body-2 text-medium-emphasis">Panduan memproses pembayaran di POS</p>
      </div>
    </div>

    <!-- Section: Payment Dialog -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-credit-card</v-icon>
          Dialog Pembayaran
        </v-card-title>
        <v-card-text>
          <p class="mb-4">
            Proses pembayaran dimulai dengan mengklik tombol
            <v-chip size="small" color="green">Checkout</v-chip>
            pada detail pesanan.
          </p>

          <v-img :src="posPaymentImg" class="rounded-lg mb-4" max-height="500" />

          <v-list density="compact" class="mb-4">
            <v-list-subheader>Komponen Dialog</v-list-subheader>
            <v-list-item prepend-icon="mdi-receipt-text">
              <v-list-item-title>Order Summary</v-list-item-title>
              <v-list-item-subtitle>
                Subtotal, pajak layanan (5%), pajak pemerintah (10%), dan total
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-format-list-bulleted">
              <v-list-item-title>Items to Pay</v-list-item-title>
              <v-list-item-subtitle>
                Daftar item yang akan dibayar dalam transaksi ini
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-credit-card-multiple">
              <v-list-item-title>Payment Method</v-list-item-title>
              <v-list-item-subtitle>Pilih metode: Cash, Card, atau QR Code</v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-cash">
              <v-list-item-title>Cash Received</v-list-item-title>
              <v-list-item-subtitle>
                Input jumlah uang yang diterima (untuk pembayaran tunai)
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </section>

    <!-- Section: Payment Methods -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-credit-card-multiple</v-icon>
          Metode Pembayaran
        </v-card-title>
        <v-card-text>
          <v-row class="mb-4">
            <v-col cols="12" md="4">
              <v-card variant="tonal" color="green" class="pa-4 text-center">
                <v-icon size="48" class="mb-2">mdi-cash</v-icon>
                <div class="text-h6 font-weight-medium">Cash</div>
                <div class="text-caption mt-2">Pembayaran tunai</div>
                <v-divider class="my-3" />
                <div class="text-body-2 text-left">
                  <ul class="pl-4">
                    <li>Masukkan nominal uang diterima</li>
                    <li>Sistem hitung kembalian otomatis</li>
                    <li>Klik EXACT untuk bayar pas</li>
                  </ul>
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="tonal" color="blue" class="pa-4 text-center">
                <v-icon size="48" class="mb-2">mdi-credit-card</v-icon>
                <div class="text-h6 font-weight-medium">Card</div>
                <div class="text-caption mt-2">Debit / Kredit</div>
                <v-divider class="my-3" />
                <div class="text-body-2 text-left">
                  <ul class="pl-4">
                    <li>Pilih tipe kartu (Debit/Kredit)</li>
                    <li>Proses di mesin EDC</li>
                    <li>Konfirmasi setelah berhasil</li>
                  </ul>
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="tonal" color="purple" class="pa-4 text-center">
                <v-icon size="48" class="mb-2">mdi-qrcode</v-icon>
                <div class="text-h6 font-weight-medium">QR Code</div>
                <div class="text-caption mt-2">QRIS / E-wallet</div>
                <v-divider class="my-3" />
                <div class="text-body-2 text-left">
                  <ul class="pl-4">
                    <li>Scan QR QRIS</li>
                    <li>Terima notifikasi pembayaran</li>
                    <li>Konfirmasi setelah berhasil</li>
                  </ul>
                </div>
              </v-card>
            </v-col>
          </v-row>

          <v-alert type="success" variant="tonal">
            <strong>Tips:</strong>
            Klik tombol
            <v-chip size="x-small">EXACT</v-chip>
            untuk mengisi otomatis jumlah uang yang diterima sesuai total pembayaran.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Section: Split Payment -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-call-split</v-icon>
          Pembayaran Terpisah (Split Payment)
        </v-card-title>
        <v-card-text>
          <p class="mb-4">
            Jika pelanggan ingin membayar dengan metode berbeda atau membagi tagihan, gunakan fitur
            split payment.
          </p>

          <v-timeline density="compact" side="end" class="mb-4">
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>1. Pisahkan Item ke Bill Berbeda</strong>
                <br />
                Gunakan fitur "Pindah Item" untuk membagi item ke bill terpisah
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>2. Checkout Per Bill</strong>
                <br />
                Proses checkout untuk setiap bill dengan metode pembayaran masing-masing
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>3. Konfirmasi</strong>
                <br />
                Pastikan semua bill dalam pesanan sudah dibayar
              </div>
            </v-timeline-item>
          </v-timeline>

          <v-alert type="info" variant="tonal">
            <strong>Info:</strong>
            Pesanan akan ditandai selesai setelah semua bill dalam pesanan tersebut dibayar lunas.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>
  </div>
</template>

<style scoped lang="scss">
.pos-payment-guide {
  max-width: 900px;
}
</style>
