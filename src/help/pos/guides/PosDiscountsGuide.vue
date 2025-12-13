<script setup lang="ts">
// Screenshots
import posItemMenuImg from '@/help/assets/screenshots/pos/pos_07_item_menu.png'
import posItemDiscountImg from '@/help/assets/screenshots/pos/pos_09_item_discount_dialog.png'
import posBillDiscountImg from '@/help/assets/screenshots/pos/pos_10_bill_discount_dialog.png'
</script>

<template>
  <div class="pos-discounts-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="green" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-percent</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Diskon</h1>
        <p class="text-body-2 text-medium-emphasis">Cara memberikan diskon item dan bill di POS</p>
      </div>
    </div>

    <!-- Introduction -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-information</v-icon>
          Jenis Diskon
        </v-card-title>
        <v-card-text>
          <p class="mb-4">
            POS menyediakan dua jenis diskon: diskon per item dan diskon pada bill (total).
          </p>

          <v-row>
            <v-col cols="12" md="6">
              <v-card variant="tonal" color="blue" class="pa-3">
                <div class="d-flex align-center mb-2">
                  <v-icon size="24" class="mr-2">mdi-food</v-icon>
                  <span class="text-subtitle-2 font-weight-medium">Diskon Item</span>
                </div>
                <div class="text-caption">
                  Diskon diberikan pada item tertentu. Berguna untuk promosi produk spesifik.
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="tonal" color="purple" class="pa-3">
                <div class="d-flex align-center mb-2">
                  <v-icon size="24" class="mr-2">mdi-receipt</v-icon>
                  <span class="text-subtitle-2 font-weight-medium">Diskon Bill</span>
                </div>
                <div class="text-caption">
                  Diskon diberikan pada total bill. Berguna untuk promosi member atau voucher.
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </section>

    <!-- Item Discount -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-food</v-icon>
          Diskon Item
        </v-card-title>
        <v-card-text>
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-cursor-pointer</v-icon>
            Cara Membuka Menu Diskon Item
          </h4>

          <v-timeline density="compact" side="end" class="mb-4">
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>1. Pilih Item</strong>
                <br />
                Pada daftar item di bill, cari item yang ingin diberi diskon
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>2. Klik Menu Item</strong>
                <br />
                Klik ikon titik tiga
                <v-icon size="16">mdi-dots-vertical</v-icon>
                di sebelah kanan item
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>3. Pilih Apply Discount</strong>
                <br />
                Dari menu popup, pilih opsi "Apply Discount"
              </div>
            </v-timeline-item>
          </v-timeline>

          <v-img :src="posItemMenuImg" class="rounded-lg mb-4" max-height="400" />

          <v-alert type="info" variant="tonal" class="mb-4">
            <strong>Menu Item Options:</strong>
            <ul class="mt-2 mb-0">
              <li>
                <strong>Add Note</strong>
                - Tambah catatan untuk item (permintaan khusus)
              </li>
              <li>
                <strong>Apply Discount</strong>
                - Berikan diskon pada item ini
              </li>
              <li>
                <strong>Cancel Item</strong>
                - Batalkan item dari pesanan
              </li>
            </ul>
          </v-alert>

          <v-divider class="my-4" />

          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-percent</v-icon>
            Dialog Diskon Item
          </h4>

          <v-img :src="posItemDiscountImg" class="rounded-lg mb-4" max-height="500" />

          <v-list density="compact" class="mb-4">
            <v-list-subheader>Field Diskon Item</v-list-subheader>
            <v-list-item prepend-icon="mdi-percent">
              <v-list-item-title>Discount Type</v-list-item-title>
              <v-list-item-subtitle>
                Pilih Percentage (%) atau Fixed Amount (Rp)
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-calculator">
              <v-list-item-title>Discount Value</v-list-item-title>
              <v-list-item-subtitle>
                Masukkan nilai diskon (persentase atau nominal)
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-eye">
              <v-list-item-title>Preview</v-list-item-title>
              <v-list-item-subtitle>
                Lihat harga asli, potongan, dan harga akhir
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-comment-question">
              <v-list-item-title>Reason *</v-list-item-title>
              <v-list-item-subtitle>Pilih alasan diskon (wajib diisi)</v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-alert type="info" variant="tonal">
            <strong>Tips:</strong>
            Preview akan menampilkan kalkulasi real-time saat Anda memasukkan nilai diskon.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Bill Discount -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-receipt</v-icon>
          Diskon Bill (Total)
        </v-card-title>
        <v-card-text>
          <p class="mb-4">
            Untuk memberikan diskon pada total bill, buka dialog pembayaran (Checkout), lalu klik
            tombol
            <v-chip size="x-small">Add Discount</v-chip>
            .
          </p>

          <v-img :src="posBillDiscountImg" class="rounded-lg mb-4" max-height="500" />

          <v-list density="compact" class="mb-4">
            <v-list-subheader>Field Diskon Bill</v-list-subheader>
            <v-list-item prepend-icon="mdi-receipt-text">
              <v-list-item-title>Bill Info</v-list-item-title>
              <v-list-item-subtitle>
                Menampilkan nama bill, jumlah item, dan subtotal
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-percent">
              <v-list-item-title>Discount Type</v-list-item-title>
              <v-list-item-subtitle>
                Pilih Percentage (%) atau Fixed Amount (Rp)
              </v-list-item-subtitle>
            </v-list-item>
            <v-list-item prepend-icon="mdi-format-list-bulleted">
              <v-list-item-title>Per-item Allocation</v-list-item-title>
              <v-list-item-subtitle>
                Lihat distribusi diskon ke setiap item dalam bill
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>

          <v-alert type="info" variant="tonal">
            <strong>Tips:</strong>
            Diskon bill akan didistribusikan secara proporsional ke semua item dalam bill. Preview
            akan menampilkan harga setelah diskon.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Discount Reasons -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-comment-question</v-icon>
          Alasan Diskon
        </v-card-title>
        <v-card-text>
          <p class="mb-4">
            Setiap diskon wajib disertai alasan untuk keperluan pelaporan dan audit.
          </p>

          <v-table density="compact">
            <thead>
              <tr>
                <th>Alasan</th>
                <th>Penggunaan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><v-chip size="x-small" color="blue">Member Discount</v-chip></td>
                <td>Diskon untuk member/pelanggan tetap</td>
              </tr>
              <tr>
                <td><v-chip size="x-small" color="green">Promotion</v-chip></td>
                <td>Diskon promosi atau campaign</td>
              </tr>
              <tr>
                <td><v-chip size="x-small" color="orange">Voucher</v-chip></td>
                <td>Penukaran voucher atau kupon</td>
              </tr>
              <tr>
                <td><v-chip size="x-small" color="purple">Complimentary</v-chip></td>
                <td>Item gratis atau service recovery</td>
              </tr>
              <tr>
                <td><v-chip size="x-small">Other</v-chip></td>
                <td>Alasan lainnya (dengan catatan)</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>
    </section>
  </div>
</template>

<style scoped lang="scss">
.pos-discounts-guide {
  max-width: 900px;
}
</style>
