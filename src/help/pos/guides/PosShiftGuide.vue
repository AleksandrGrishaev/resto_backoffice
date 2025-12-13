<script setup lang="ts">
// Screenshots
import posShiftImg from '@/help/assets/screenshots/pos/pos_03_shift_management.png'
import posExpenseImg from '@/help/assets/screenshots/pos/pos_04_expense_dialog.png'
import posPaymentDetailsImg from '@/help/assets/screenshots/pos/pos_16_payment_details_refund.png'
import posRefundDialogImg from '@/help/assets/screenshots/pos/pos_17_create_refund_dialog.png'
</script>

<template>
  <div class="pos-shift-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="green" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-clock-outline</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Manajemen Shift & Pengeluaran</h1>
        <p class="text-body-2 text-medium-emphasis">
          Panduan mengelola shift kasir dan pengeluaran kas
        </p>
      </div>
    </div>

    <!-- Section: Shift Management -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-clock-outline</v-icon>
          Manajemen Shift
        </v-card-title>
        <v-card-text>
          <p class="mb-4">
            Halaman Shift Management menampilkan informasi shift kasir saat ini, saldo kas, dan
            riwayat pembayaran.
          </p>

          <v-img :src="posShiftImg" class="rounded-lg mb-4" max-height="500" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="20" class="mr-1">mdi-information</v-icon>
                  Current Shift
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>Shift Number</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>Cashier</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>Start Time & Duration</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="20" class="mr-1">mdi-cash</v-icon>
                  Cash Balance
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>Starting Cash - Kas awal</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>Cash Received - Uang masuk</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>Expected Cash - Kas yang diharapkan</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
          </v-row>

          <h4 class="text-subtitle-1 font-weight-medium mb-3">Payment Methods Summary</h4>
          <p class="mb-4">Tabel ini menampilkan ringkasan pembayaran berdasarkan metode:</p>

          <v-table density="compact" class="mb-4">
            <thead>
              <tr>
                <th>Method</th>
                <th>Count</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <v-icon size="16" class="mr-1">mdi-cash</v-icon>
                  Cash
                </td>
                <td>Jumlah transaksi tunai</td>
                <td>Total nominal tunai</td>
              </tr>
              <tr>
                <td>
                  <v-icon size="16" class="mr-1">mdi-credit-card</v-icon>
                  Card
                </td>
                <td>Jumlah transaksi kartu</td>
                <td>Total nominal kartu</td>
              </tr>
              <tr>
                <td>
                  <v-icon size="16" class="mr-1">mdi-qrcode</v-icon>
                  QR Code
                </td>
                <td>Jumlah transaksi QR</td>
                <td>Total nominal QR</td>
              </tr>
            </tbody>
          </v-table>

          <v-alert type="info" variant="tonal">
            <strong>Riwayat Pembayaran:</strong>
            Di bagian bawah halaman, Anda dapat melihat daftar semua pembayaran dalam shift ini
            termasuk nomor pembayaran, waktu, metode, nominal, dan status.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Section: Expense -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-cash-minus</v-icon>
          Pengeluaran Kas
        </v-card-title>
        <v-card-text>
          <p class="mb-4">
            Fitur pengeluaran kas memungkinkan pencatatan pengeluaran operasional yang diambil dari
            kas register selama shift.
          </p>

          <v-img :src="posExpenseImg" class="rounded-lg mb-4" max-height="500" />

          <h4 class="text-subtitle-1 font-weight-medium mb-3">Form Pengeluaran</h4>

          <v-list density="compact" class="mb-4">
            <v-list-subheader>Field yang Harus Diisi</v-list-subheader>
            <v-list-item prepend-icon="mdi-currency-usd">
              <v-list-item-title>Amount *</v-list-item-title>
              <v-list-item-subtitle>Nominal pengeluaran dalam Rupiah</v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-tag">
              <v-list-item-title>Expense Category *</v-list-item-title>
              <v-list-item-subtitle>
                Kategori pengeluaran (Transport, Supplies, dll)
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-text">
              <v-list-item-title>Description *</v-list-item-title>
              <v-list-item-subtitle>Deskripsi singkat pengeluaran</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-list density="compact" class="mb-4">
            <v-list-subheader>Field Opsional</v-list-subheader>
            <v-list-item prepend-icon="mdi-account">
              <v-list-item-title>Counteragent</v-list-item-title>
              <v-list-item-subtitle>Supplier atau penyedia layanan (jika ada)</v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-file-document">
              <v-list-item-title>Invoice Number</v-list-item-title>
              <v-list-item-subtitle>Nomor invoice atau kwitansi</v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-note-text">
              <v-list-item-title>Additional Notes</v-list-item-title>
              <v-list-item-subtitle>Catatan tambahan</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-alert type="warning" variant="tonal">
            <v-icon class="mr-1">mdi-alert</v-icon>
            <strong>Penting:</strong>
            Pengeluaran akan langsung mengurangi saldo kas register. Pastikan Anda memiliki bukti
            pengeluaran yang valid.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Section: Refund -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="red" class="mr-2">mdi-cash-refund</v-icon>
          Refund (Pengembalian Dana)
        </v-card-title>
        <v-card-text>
          <p class="mb-4">
            Fitur refund memungkinkan pengembalian dana kepada pelanggan untuk pembayaran yang sudah
            selesai. Refund hanya dapat dilakukan pada shift yang sama.
          </p>

          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-cursor-pointer</v-icon>
            Cara Membuat Refund
          </h4>

          <v-timeline density="compact" side="end" class="mb-4">
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>1. Buka Shift Management</strong>
                <br />
                Dari menu hamburger, pilih "Shift Management"
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>2. Pilih Pembayaran</strong>
                <br />
                Pada tabel Payments, klik pembayaran dengan status "completed" yang ingin di-refund
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>3. Klik Create Refund</strong>
                <br />
                Pada dialog Payment Details, klik tombol "Create Refund"
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>4. Isi Alasan Refund</strong>
                <br />
                Masukkan alasan refund (minimal 10 karakter) dan konfirmasi
              </div>
            </v-timeline-item>
          </v-timeline>

          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-information</v-icon>
            Payment Details Dialog
          </h4>

          <v-img :src="posPaymentDetailsImg" class="rounded-lg mb-4" max-height="500" />

          <v-list density="compact" class="mb-4">
            <v-list-subheader>Informasi yang Ditampilkan</v-list-subheader>
            <v-list-item prepend-icon="mdi-cash">
              <v-list-item-title>Amount & Method</v-list-item-title>
              <v-list-item-subtitle>
                Nominal pembayaran dan metode (Cash, Card, QR)
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-receipt">
              <v-list-item-title>Order Information</v-list-item-title>
              <v-list-item-subtitle>
                Nomor order, tipe (Dine In/Delivery), dan meja
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-food">
              <v-list-item-title>Paid Items</v-list-item-title>
              <v-list-item-subtitle>
                Daftar item yang dibayar dalam transaksi ini
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-divider class="my-4" />

          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-cash-refund</v-icon>
            Create Refund Dialog
          </h4>

          <v-img :src="posRefundDialogImg" class="rounded-lg mb-4" max-height="500" />

          <v-list density="compact" class="mb-4">
            <v-list-subheader>Field Refund</v-list-subheader>
            <v-list-item prepend-icon="mdi-currency-usd">
              <v-list-item-title>Refund Amount</v-list-item-title>
              <v-list-item-subtitle>
                Nominal yang akan dikembalikan (otomatis dari pembayaran)
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-text">
              <v-list-item-title>Refund Reason *</v-list-item-title>
              <v-list-item-subtitle>
                Alasan refund (wajib, minimal 10 karakter)
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-alert type="warning" variant="tonal" class="mb-4">
            <v-icon class="mr-1">mdi-alert</v-icon>
            <strong>Penting:</strong>
            Refund tidak dapat dibatalkan. Pastikan Anda sudah memverifikasi permintaan refund
            dengan benar sebelum mengkonfirmasi.
          </v-alert>

          <v-alert type="info" variant="tonal">
            <strong>Catatan:</strong>
            <ul class="mt-2 mb-0">
              <li>Refund akan mengurangi saldo kas shift (Cash Refunded)</li>
              <li>Status pembayaran akan berubah menjadi "refunded"</li>
              <li>Refund dicatat dalam riwayat pembayaran untuk audit</li>
            </ul>
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Section: End Shift -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="orange" class="mr-2">mdi-clock-end</v-icon>
          Mengakhiri Shift
        </v-card-title>
        <v-card-text>
          <p class="mb-4">Untuk mengakhiri shift, akses menu hamburger dan pilih "End Shift".</p>

          <v-timeline density="compact" side="end" class="mb-4">
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>1. Hitung Kas Fisik</strong>
                <br />
                Hitung uang tunai yang ada di laci kas
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>2. Input Actual Cash</strong>
                <br />
                Masukkan nominal kas fisik yang dihitung
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>3. Review Selisih</strong>
                <br />
                Sistem akan menampilkan selisih antara kas yang diharapkan dan aktual
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>4. Konfirmasi & Submit</strong>
                <br />
                Konfirmasi dan submit laporan akhir shift
              </div>
            </v-timeline-item>
          </v-timeline>

          <v-alert type="info" variant="tonal">
            <strong>Tips:</strong>
            Selalu periksa ringkasan shift sebelum mengakhiri. Pastikan semua transaksi tercatat
            dengan benar.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>
  </div>
</template>

<style scoped lang="scss">
.pos-shift-guide {
  max-width: 900px;
}
</style>
