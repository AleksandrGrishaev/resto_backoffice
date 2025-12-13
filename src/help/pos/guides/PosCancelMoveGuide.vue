<script setup lang="ts">
// Screenshots
import posCancelDraftImg from '@/help/assets/screenshots/pos/pos_11_cancel_draft_item.png'
import posCancelReasonImg from '@/help/assets/screenshots/pos/pos_12_cancel_item_with_reason.png'
import posMoveItemsImg from '@/help/assets/screenshots/pos/pos_13_move_items_selected.png'
</script>

<template>
  <div class="pos-cancel-move-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="green" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-swap-horizontal</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Pembatalan & Pindah Item</h1>
        <p class="text-body-2 text-medium-emphasis">
          Cara membatalkan item dan memindahkan item antar bill
        </p>
      </div>
    </div>

    <!-- Section: Cancel Items -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="red" class="mr-2">mdi-cancel</v-icon>
          Pembatalan Item
        </v-card-title>
        <v-card-text>
          <p class="mb-4">
            Pembatalan item dapat dilakukan melalui menu item dengan klik
            <v-chip size="x-small" color="red">Cancel Item</v-chip>
            . Proses pembatalan berbeda tergantung status item.
          </p>

          <!-- Draft Item -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-file-document-outline</v-icon>
            Pembatalan Item Draft
          </h4>
          <p class="mb-4">
            Item dengan status
            <v-chip size="x-small" color="orange">Draft</v-chip>
            belum dikirim ke dapur, sehingga dapat langsung dihapus tanpa alasan.
          </p>

          <v-img :src="posCancelDraftImg" class="rounded-lg mb-4" max-height="400" />

          <v-alert type="info" variant="tonal" class="mb-4">
            Item draft dapat langsung dihapus karena belum masuk proses produksi di dapur.
          </v-alert>

          <v-divider class="my-4" />

          <!-- Sent Item -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-chef-hat</v-icon>
            Pembatalan Item yang Sudah Dikirim
          </h4>
          <p class="mb-4">
            Item dengan status
            <v-chip size="x-small" color="blue">Waiting</v-chip>
            ,
            <v-chip size="x-small" color="purple">Cooking</v-chip>
            , atau
            <v-chip size="x-small" color="green">Ready</v-chip>
            sudah dikirim ke dapur. Pembatalan memerlukan pemilihan alasan.
          </p>

          <v-img :src="posCancelReasonImg" class="rounded-lg mb-4" max-height="500" />

          <v-table density="compact" class="mb-4">
            <thead>
              <tr>
                <th>Alasan Pembatalan</th>
                <th>Deskripsi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><v-chip size="x-small" color="red">Kitchen Mistake</v-chip></td>
                <td>Kesalahan dari dapur (salah masak, dll)</td>
              </tr>
              <tr>
                <td><v-chip size="x-small" color="orange">Customer Refused</v-chip></td>
                <td>Pelanggan menolak atau berubah pikiran</td>
              </tr>
              <tr>
                <td><v-chip size="x-small" color="blue">Wrong Order</v-chip></td>
                <td>Salah memasukkan pesanan</td>
              </tr>
              <tr>
                <td><v-chip size="x-small" color="grey">Out of Stock</v-chip></td>
                <td>Bahan tidak tersedia</td>
              </tr>
              <tr>
                <td><v-chip size="x-small">Other</v-chip></td>
                <td>Alasan lainnya</td>
              </tr>
            </tbody>
          </v-table>

          <v-alert type="warning" variant="tonal">
            <v-icon class="mr-1">mdi-alert</v-icon>
            <strong>Perhatian:</strong>
            Pembatalan item yang sudah dikirim ke dapur akan dicatat dalam laporan untuk analisis
            food waste dan performa.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Section: Move Items -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-arrow-right</v-icon>
          Pindah Item
        </v-card-title>
        <v-card-text>
          <p class="mb-4">
            Fitur pindah item memungkinkan Anda memindahkan item antar bill dalam satu pesanan.
            Berguna untuk split bill atau mengelompokkan item.
          </p>

          <v-img :src="posMoveItemsImg" class="rounded-lg mb-4" max-height="500" />

          <h4 class="text-subtitle-1 font-weight-medium mb-3">Cara Memindahkan Item</h4>

          <v-timeline density="compact" side="end" class="mb-4">
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>1. Pilih Item</strong>
                <br />
                Centang checkbox pada item yang ingin dipindahkan. Anda dapat memilih beberapa item
                sekaligus.
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>2. Klik Tombol Pindah</strong>
                <br />
                Setelah item dipilih, klik tombol panah
                <v-icon size="16">mdi-arrow-right</v-icon>
                di pojok kanan bawah.
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>3. Pilih Tujuan</strong>
                <br />
                Pilih bill tujuan atau buat bill baru untuk memindahkan item.
              </div>
            </v-timeline-item>
          </v-timeline>

          <v-alert type="info" variant="tonal" class="mb-4">
            <strong>Info:</strong>
            Saat item dipilih, sistem menampilkan jumlah item dan total harga item yang dipilih di
            bagian bawah: "Selected Items (n) - Rp xxx".
          </v-alert>

          <v-alert type="success" variant="tonal">
            <strong>Tips:</strong>
            Gunakan fitur ini untuk:
            <ul class="mt-2 mb-0">
              <li>Split bill untuk pembayaran terpisah</li>
              <li>Menggabungkan item dari beberapa bill</li>
              <li>Memindahkan item yang salah dimasukkan</li>
            </ul>
          </v-alert>
        </v-card-text>
      </v-card>
    </section>
  </div>
</template>

<style scoped lang="scss">
.pos-cancel-move-guide {
  max-width: 900px;
}
</style>
