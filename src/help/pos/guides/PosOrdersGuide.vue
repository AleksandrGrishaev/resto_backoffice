<script setup lang="ts">
// Screenshots
import posOrderImg from '@/help/assets/screenshots/pos/pos_05_order_with_bill.png'
import posItemMenuImg from '@/help/assets/screenshots/pos/pos_07_item_menu.png'
import posOrderTypeImg from '@/help/assets/screenshots/pos/pos_08_order_type_dialog.png'
import posSimpleItemImg from '@/help/assets/screenshots/pos/pos_14_simple_item_toast.png'
import posCompositeItemImg from '@/help/assets/screenshots/pos/pos_15_composite_item_dialog.png'
</script>

<template>
  <div class="pos-orders-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="green" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-clipboard-list</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Kelola Pesanan</h1>
        <p class="text-body-2 text-medium-emphasis">Panduan membuat dan mengelola pesanan di POS</p>
      </div>
    </div>

    <!-- Section: Creating Orders -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-plus-circle</v-icon>
          Membuat Pesanan Baru
        </v-card-title>
        <v-card-text>
          <v-timeline density="compact" side="end" class="mb-4">
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>1. Pilih Tipe Pesanan</strong>
                <br />
                Klik tombol
                <v-chip size="x-small" color="green">+ Create New Order</v-chip>
                atau pilih meja untuk pesanan dine-in
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>2. Tambahkan Item</strong>
                <br />
                Pilih kategori menu, lalu klik item yang diinginkan
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>3. Sesuaikan Item (Opsional)</strong>
                <br />
                Tambahkan modifier, catatan, atau diskon pada item
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>4. Simpan atau Checkout</strong>
                <br />
                Simpan pesanan atau langsung proses pembayaran
              </div>
            </v-timeline-item>
          </v-timeline>

          <v-img :src="posOrderImg" class="rounded-lg mb-4" max-height="500" />
        </v-card-text>
      </v-card>
    </section>

    <!-- Section: Online Orders -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-bike</v-icon>
          Pesanan Online (Delivery/Takeaway)
        </v-card-title>
        <v-card-text>
          <p class="mb-4">
            Untuk membuat pesanan online (Delivery atau Takeaway), klik tombol
            <v-chip size="small" color="primary">+</v-chip>
            di pojok kiri atas sidebar.
          </p>

          <v-img :src="posOrderTypeImg" class="rounded-lg mb-4" max-height="500" />

          <h4 class="text-subtitle-1 font-weight-medium mb-3">Tipe Pesanan Online</h4>

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="tonal" color="blue" class="pa-3">
                <div class="d-flex align-center mb-2">
                  <v-icon size="24" class="mr-2">mdi-bike</v-icon>
                  <span class="text-subtitle-2 font-weight-medium">Delivery</span>
                </div>
                <div class="text-caption">
                  Pesanan diantar ke alamat pelanggan. Cocok untuk layanan pesan antar.
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="tonal" color="orange" class="pa-3">
                <div class="d-flex align-center mb-2">
                  <v-icon size="24" class="mr-2">mdi-shopping</v-icon>
                  <span class="text-subtitle-2 font-weight-medium">Takeaway</span>
                </div>
                <div class="text-caption">
                  Pesanan diambil sendiri oleh pelanggan. Cocok untuk take-out.
                </div>
              </v-card>
            </v-col>
          </v-row>

          <v-alert type="info" variant="tonal">
            <strong>Catatan:</strong>
            Pesanan online tidak memerlukan meja. Sistem akan menghasilkan nomor pesanan otomatis
            untuk identifikasi.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Section: Menu Item Types -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-food-variant</v-icon>
          Jenis Menu Item
        </v-card-title>
        <v-card-text>
          <p class="mb-4">Terdapat dua jenis menu item di POS: item sederhana dan item komposit.</p>

          <!-- Simple Item -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-food</v-icon>
            Item Sederhana (Simple)
          </h4>
          <p class="mb-4">
            Item sederhana adalah menu yang dapat langsung ditambahkan ke pesanan dengan satu klik
            tanpa memerlukan kustomisasi. Contoh: Toast, Nasi Goreng, dll.
          </p>

          <v-img :src="posSimpleItemImg" class="rounded-lg mb-4" max-height="500" />

          <v-alert type="success" variant="tonal" class="mb-4">
            <strong>Cara Menambahkan:</strong>
            Cukup klik tombol
            <v-chip size="x-small" color="primary">+ ADD</v-chip>
            pada item, dan item akan langsung ditambahkan ke bill.
          </v-alert>

          <v-divider class="my-4" />

          <!-- Composite Item -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-tune-variant</v-icon>
            Item Komposit (Composite)
          </h4>
          <p class="mb-4">
            Item komposit adalah menu yang memerlukan pemilihan komponen atau modifier. Contoh:
            Custom Breakfast, Build Your Own Bowl, dll.
          </p>

          <v-img :src="posCompositeItemImg" class="rounded-lg mb-4" max-height="500" />

          <v-list density="compact" class="mb-4">
            <v-list-subheader>Komponen Dialog Item Komposit</v-list-subheader>
            <v-list-item prepend-icon="mdi-package-variant">
              <v-list-item-title>Base Composition</v-list-item-title>
              <v-list-item-subtitle>
                Menampilkan komposisi dasar item (ingredient utama)
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-swap-horizontal">
              <v-list-item-title>Select Components</v-list-item-title>
              <v-list-item-subtitle>
                Pilihan wajib untuk mengganti komponen (telur, roti, dll)
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-plus-circle">
              <v-list-item-title>Extras</v-list-item-title>
              <v-list-item-subtitle>Tambahan opsional dengan biaya tambahan</v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-calculator">
              <v-list-item-title>Price Preview</v-list-item-title>
              <v-list-item-subtitle>Harga dasar + modifiers = total harga</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-alert type="info" variant="tonal">
            <strong>Tips:</strong>
            Komponen dengan label
            <v-chip size="x-small" color="warning">Required</v-chip>
            wajib dipilih sebelum dapat menambahkan item ke bill.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Section: Item Actions -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-dots-vertical</v-icon>
          Menu Aksi Item
        </v-card-title>
        <v-card-text>
          <p class="mb-4">Klik ikon menu (⋮) pada item untuk melihat opsi aksi:</p>

          <v-img :src="posItemMenuImg" class="rounded-lg mb-4" max-height="400" />

          <v-table density="compact" class="mb-4">
            <thead>
              <tr>
                <th>Aksi</th>
                <th>Deskripsi</th>
                <th>Kondisi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><v-chip size="x-small">Add Note</v-chip></td>
                <td>Tambahkan catatan pada item</td>
                <td>Item sudah dikirim ke dapur</td>
              </tr>
              <tr>
                <td><v-chip size="x-small">Apply Discount</v-chip></td>
                <td>Berikan diskon pada item</td>
                <td>Item sudah dibayar</td>
              </tr>
              <tr>
                <td><v-chip size="x-small" color="red">Cancel Item</v-chip></td>
                <td>Batalkan item dan refund</td>
                <td>Item sudah dibayar</td>
              </tr>
            </tbody>
          </v-table>

          <v-alert type="warning" variant="tonal">
            <v-icon class="mr-1">mdi-alert</v-icon>
            <strong>Perhatian:</strong>
            Pembatalan item yang sudah dibayar akan memproses refund secara otomatis sesuai metode
            pembayaran asli.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>
  </div>
</template>

<style scoped lang="scss">
.pos-orders-guide {
  max-width: 900px;
}
</style>
