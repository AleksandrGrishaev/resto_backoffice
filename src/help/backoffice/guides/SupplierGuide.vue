<script setup lang="ts">
// Screenshots - Step 1: Creating Requisition
import supplierMainImg from '@/help/assets/screenshots/backoffice/supplier/01_supplier_main.png'
import aiSuggestionsImg from '@/help/assets/screenshots/backoffice/supplier/02_ai_assistant_suggestions.png'
import itemAddedImg from '@/help/assets/screenshots/backoffice/supplier/03_item_added.png'
import manualAddTabImg from '@/help/assets/screenshots/backoffice/supplier/04_manual_add_tab.png'
import manualItemDialogImg from '@/help/assets/screenshots/backoffice/supplier/05_manual_item_dialog.png'
import requestSummaryImg from '@/help/assets/screenshots/backoffice/supplier/06_request_summary.png'
import requestActionsImg from '@/help/assets/screenshots/backoffice/supplier/07_request_actions.png'

// Screenshots - Step 2: Creating Order from Request
import ordersTabImg from '@/help/assets/screenshots/backoffice/supplier/08_orders_tab.png'
import orderDetailsImg from '@/help/assets/screenshots/backoffice/supplier/11_order_details.png'

// Screenshots - Step 3: Sending Order to Supplier
import draftOrderImg from '@/help/assets/screenshots/backoffice/supplier/14_draft_order.png'
import sendOrderDialogImg from '@/help/assets/screenshots/backoffice/supplier/15_send_order_dialog.png'
import sentOrdersImg from '@/help/assets/screenshots/backoffice/supplier/16_sent_orders.png'

// Screenshots - Step 4: Adding Invoice
import paymentManagementImg from '@/help/assets/screenshots/backoffice/supplier/17_order_payment_management.png'
import createBillDialogImg from '@/help/assets/screenshots/backoffice/supplier/18_create_bill_dialog.png'

// Screenshots - Step 5: Receiving Goods
import receiptsTabImg from '@/help/assets/screenshots/backoffice/supplier/19_receipts_tab.png'
import receiptDetailsDraftImg from '@/help/assets/screenshots/backoffice/supplier/20_receipt_details_draft.png'
import editReceiptDialogImg from '@/help/assets/screenshots/backoffice/supplier/21_edit_receipt_dialog.png'
</script>

<template>
  <div class="supplier-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="purple" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-truck-delivery</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Manajemen Pemasok</h1>
        <p class="text-body-2 text-medium-emphasis">
          Panduan lengkap untuk mengelola pembelian dari pemasok
        </p>
      </div>
    </div>

    <!-- Overview -->
    <v-alert type="info" variant="tonal" class="mb-6">
      <strong>Alur Kerja Pembelian:</strong>
      <ol class="mt-2 mb-0">
        <li>
          Buat
          <strong>Request</strong>
          (permintaan barang) - via AI Assistant atau manual
        </li>
        <li>
          Konversi request menjadi
          <strong>Order</strong>
          ke pemasok
        </li>
        <li>
          <strong>Kirim</strong>
          order ke pemasok (wajib)
        </li>
        <li>
          Tambahkan
          <strong>Invoice</strong>
          (faktur) dari pemasok
        </li>
        <li>
          Lakukan
          <strong>Penerimaan</strong>
          barang dan verifikasi
        </li>
      </ol>
    </v-alert>

    <!-- Table of Contents -->
    <v-card variant="outlined" class="mb-6">
      <v-card-title class="text-subtitle-1">
        <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
        Daftar Isi
      </v-card-title>
      <v-card-text>
        <v-list density="compact" nav>
          <v-list-item prepend-icon="mdi-numeric-1-circle" href="#create-request">
            <v-list-item-title>Membuat Request (Permintaan Barang)</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-numeric-2-circle" href="#create-order">
            <v-list-item-title>Membuat Order dari Request</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-numeric-3-circle" href="#send-order">
            <v-list-item-title>Mengirim Order ke Pemasok</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-numeric-4-circle" href="#add-invoice">
            <v-list-item-title>Menambahkan Invoice</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-numeric-5-circle" href="#receiving">
            <v-list-item-title>Penerimaan Barang</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- ==================== SECTION 1: CREATE REQUEST ==================== -->
    <section id="create-request" class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center bg-purple-darken-3">
          <v-icon color="white" class="mr-2">mdi-file-document-plus</v-icon>
          <span class="text-white">1. Membuat Request (Permintaan Barang)</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            Request adalah permintaan barang yang dibuat oleh tim (Kitchen/Bar) sebelum dikonversi
            menjadi order ke pemasok. Ada dua cara untuk membuat request:
          </p>

          <!-- Main Screen Overview -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-monitor</v-icon>
            Halaman Supplier Management
          </h4>

          <v-img :src="supplierMainImg" class="rounded-lg mb-4 border" max-height="450" />

          <v-row class="mb-4">
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="blue">mdi-tab</v-icon>
                  Tab Navigasi
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>REQUESTS</strong>
                      - Daftar permintaan
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>ORDERS</strong>
                      - Order ke pemasok
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>RECEIPTS</strong>
                      - Penerimaan barang
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="purple">mdi-robot</v-icon>
                  AI Order Assistant
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Tombol untuk membuka AI Assistant yang memberikan saran pembelian berdasarkan stok
                  dan konsumsi.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="orange">mdi-filter</v-icon>
                  Filter
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Filter request berdasarkan Status, Department, dan Priority untuk menemukan
                  request dengan cepat.
                </p>
              </v-card>
            </v-col>
          </v-row>

          <v-divider class="my-6" />

          <!-- Method A: AI Assistant -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1" color="green">mdi-robot</v-icon>
            Metode A: Menggunakan AI Order Assistant (Rekomendasi)
          </h4>

          <v-alert type="success" variant="tonal" density="compact" class="mb-4">
            <strong>Keuntungan AI Assistant:</strong>
            Secara otomatis menganalisis stok, konsumsi harian, dan memberikan saran jumlah
            pembelian yang optimal.
          </v-alert>

          <v-timeline density="compact" side="end" class="mb-4">
            <v-timeline-item dot-color="purple" size="small">
              <div class="text-body-2">
                <strong>1. Klik "AI ORDER ASSISTANT"</strong>
                <br />
                Tombol di pojok kanan atas halaman Supplier Management
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="purple" size="small">
              <div class="text-body-2">
                <strong>2. Pilih Department</strong>
                <br />
                Pilih KITCHEN atau BAR sesuai kebutuhan
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="purple" size="small">
              <div class="text-body-2">
                <strong>3. Lihat AI Suggestions</strong>
                <br />
                Sistem menampilkan item yang perlu diorder dengan prioritas (Critical, Low Stock)
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="purple" size="small">
              <div class="text-body-2">
                <strong>4. Klik "+ ADD" pada item</strong>
                <br />
                Tambahkan item dengan jumlah yang disarankan sistem
              </div>
            </v-timeline-item>
          </v-timeline>

          <v-img :src="aiSuggestionsImg" class="rounded-lg mb-4 border" max-height="450" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="tonal" color="red" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-alert-circle</v-icon>
                  Critical - Out of Stock
                </h5>
                <p class="text-caption">
                  Item dengan stok
                  <strong>0</strong>
                  yang sangat urgent untuk diorder. Ditandai dengan label
                  <v-chip size="x-small" color="red">high</v-chip>
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="tonal" color="orange" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-alert</v-icon>
                  Informasi Item
                </h5>
                <p class="text-caption">
                  Setiap item menampilkan: Current stock, Min stock, Suggested quantity,
                  Daily/Weekly consumption, dan Stock lasts.
                </p>
              </v-card>
            </v-col>
          </v-row>

          <!-- Item Added State -->
          <h5 class="text-subtitle-2 font-weight-medium mb-2">
            <v-icon size="18" class="mr-1" color="green">mdi-check-circle</v-icon>
            Item Berhasil Ditambahkan
          </h5>
          <p class="text-body-2 mb-3">
            Setelah klik "+ ADD", item akan ditandai dengan status "Added" dan Anda dapat mengubah
            jumlah serta unit sesuai kebutuhan.
          </p>

          <v-img :src="itemAddedImg" class="rounded-lg mb-4 border" max-height="200" />

          <v-divider class="my-6" />

          <!-- Method B: Manual Add -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1" color="blue">mdi-plus-circle</v-icon>
            Metode B: Menambahkan Item Manual
          </h4>

          <p class="text-body-2 mb-3">
            Jika item yang dibutuhkan tidak muncul di AI Suggestions, Anda dapat menambahkannya
            secara manual.
          </p>

          <v-timeline density="compact" side="end" class="mb-4">
            <v-timeline-item dot-color="blue" size="small">
              <div class="text-body-2">
                <strong>1. Klik tab "ADD MANUAL ITEM"</strong>
                <br />
                Di dalam dialog Order Assistant
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="blue" size="small">
              <div class="text-body-2">
                <strong>2. Cari produk</strong>
                <br />
                Gunakan search box atau filter by Category dan Stock Status
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="blue" size="small">
              <div class="text-body-2">
                <strong>3. Klik "+ ADD" pada produk</strong>
                <br />
                Dialog akan muncul untuk mengatur detail pembelian
              </div>
            </v-timeline-item>
          </v-timeline>

          <v-img :src="manualAddTabImg" class="rounded-lg mb-4 border" max-height="450" />

          <!-- Manual Item Dialog -->
          <h5 class="text-subtitle-2 font-weight-medium mb-2">
            <v-icon size="18" class="mr-1">mdi-form-select</v-icon>
            Dialog Tambah Item Manual
          </h5>

          <v-img :src="manualItemDialogImg" class="rounded-lg mb-4 border" max-height="400" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-list density="compact">
                <v-list-subheader>Informasi Item</v-list-subheader>
                <v-list-item prepend-icon="mdi-package-variant">
                  <v-list-item-title>Package</v-list-item-title>
                  <v-list-item-subtitle>
                    Pilih kemasan pembelian (kg, pcs, dll)
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item prepend-icon="mdi-counter">
                  <v-list-item-title>Quantity</v-list-item-title>
                  <v-list-item-subtitle>Jumlah package yang ingin dipesan</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>
            <v-col cols="12" md="6">
              <v-list density="compact">
                <v-list-subheader>Harga & Stok</v-list-subheader>
                <v-list-item prepend-icon="mdi-currency-usd">
                  <v-list-item-title>Price</v-list-item-title>
                  <v-list-item-subtitle>
                    Harga per package (PKG) atau per unit (G/ML)
                  </v-list-item-subtitle>
                </v-list-item>
                <v-list-item prepend-icon="mdi-alert-circle">
                  <v-list-item-title>Stock Info</v-list-item-title>
                  <v-list-item-subtitle>Stok saat ini dan minimum stock</v-list-item-subtitle>
                </v-list-item>
              </v-list>
            </v-col>
          </v-row>

          <v-divider class="my-6" />

          <!-- Request Summary -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1" color="orange">mdi-cart-check</v-icon>
            Request Summary (Ringkasan Permintaan)
          </h4>

          <p class="text-body-2 mb-3">
            Setelah menambahkan semua item, klik tab "REQUEST SUMMARY" untuk melihat ringkasan dan
            mengirim request.
          </p>

          <v-img :src="requestSummaryImg" class="rounded-lg mb-4 border" max-height="450" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-format-list-checks</v-icon>
                  Selected Items
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Daftar semua item yang akan diorder. Anda dapat mengubah package, quantity, atau
                  menghapus item dengan tombol X.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-information</v-icon>
                  Request Details
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Isi informasi request: Requested By (siapa yang minta) dan Priority
                  (Normal/High/Urgent).
                </p>
              </v-card>
            </v-col>
          </v-row>

          <!-- Actions -->
          <h5 class="text-subtitle-2 font-weight-medium mb-2">
            <v-icon size="18" class="mr-1">mdi-send</v-icon>
            Mengirim Request
          </h5>

          <v-img :src="requestActionsImg" class="rounded-lg mb-4 border" max-height="150" />

          <v-row>
            <v-col cols="12" md="6">
              <v-card variant="tonal" color="grey" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-1">
                  <v-icon size="18" class="mr-1">mdi-content-save</v-icon>
                  SAVE DRAFT
                </h5>
                <p class="text-caption">
                  Simpan request sebagai draft untuk dilanjutkan nanti. Request tidak akan terlihat
                  oleh purchasing.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="tonal" color="green" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-1">
                  <v-icon size="18" class="mr-1">mdi-send</v-icon>
                  SEND REQUEST
                </h5>
                <p class="text-caption">
                  Kirim request ke purchasing untuk diproses menjadi order. Request akan muncul di
                  tab REQUESTS dengan status "PENDING".
                </p>
              </v-card>
            </v-col>
          </v-row>

          <v-alert type="success" variant="tonal" class="mt-4">
            <strong>Selesai!</strong>
            Setelah request terkirim, request akan muncul di daftar REQUESTS dan siap untuk
            dikonversi menjadi order ke pemasok.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- ==================== SECTION 2: CREATE ORDER FROM REQUEST ==================== -->
    <section id="create-order" class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center bg-blue-darken-3">
          <v-icon color="white" class="mr-2">mdi-cart-plus</v-icon>
          <span class="text-white">2. Membuat Order dari Request</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            Setelah request dibuat dan dikirim, request perlu dikonversi menjadi Purchase Order (PO)
            untuk dikirim ke pemasok. Tab ORDERS menampilkan semua order yang sudah dibuat.
          </p>

          <!-- Orders Tab Overview -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-tab</v-icon>
            Tab ORDERS
          </h4>

          <v-img :src="ordersTabImg" class="rounded-lg mb-4 border" max-height="450" />

          <v-row class="mb-4">
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="blue">mdi-filter</v-icon>
                  Filter Orders
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Status</strong>
                      - Draft, Sent, Delivered
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Bill Status</strong>
                      - Not Billed, Billed, Fully Paid
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Supplier</strong>
                      - Filter berdasarkan pemasok
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="green">mdi-table</v-icon>
                  Kolom Tabel
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Tabel menampilkan Order #, Supplier, Status, Bill Status, jumlah Items, Original
                  amount, Delivered amount, dan Order Date.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="orange">mdi-gesture-tap</v-icon>
                  Actions
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Setiap order memiliki tombol aksi: View Details, Send Order (untuk Draft/Sent),
                  dan Menu actions lainnya.
                </p>
              </v-card>
            </v-col>
          </v-row>

          <v-divider class="my-6" />

          <!-- Order Statuses -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-list-status</v-icon>
            Status Order
          </h4>

          <v-row class="mb-4">
            <v-col cols="12" md="4">
              <v-card variant="tonal" color="grey" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-file-document-edit</v-icon>
                  Draft
                </h5>
                <p class="text-caption">
                  Order baru yang belum dikirim ke pemasok. Masih dapat diedit dan ditambahkan item
                  baru.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="tonal" color="blue" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-send</v-icon>
                  Sent
                </h5>
                <p class="text-caption">
                  Order sudah dikirim ke pemasok dan menunggu pengiriman barang. Tidak dapat diedit
                  lagi.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="tonal" color="green" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-check-circle</v-icon>
                  Delivered
                </h5>
                <p class="text-caption">
                  Barang sudah diterima dari pemasok. Perlu dilakukan verifikasi dan pembayaran
                  invoice.
                </p>
              </v-card>
            </v-col>
          </v-row>

          <v-divider class="my-6" />

          <!-- Creating Order from Request -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1" color="purple">mdi-swap-horizontal</v-icon>
            Mengkonversi Request menjadi Order
          </h4>

          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            <strong>Catatan:</strong>
            Order dibuat secara otomatis dari Request yang berstatus "SUBMITTED". Sistem akan
            mengelompokkan item berdasarkan supplier.
          </v-alert>

          <v-timeline density="compact" side="end" class="mb-4">
            <v-timeline-item dot-color="blue" size="small">
              <div class="text-body-2">
                <strong>1. Buka Tab REQUESTS</strong>
                <br />
                Temukan request dengan status "SUBMITTED" yang siap diorder
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="blue" size="small">
              <div class="text-body-2">
                <strong>2. Klik "Convert to Order"</strong>
                <br />
                Tombol aksi pada request yang ingin dikonversi
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="blue" size="small">
              <div class="text-body-2">
                <strong>3. Review Items</strong>
                <br />
                Periksa item dan harga sebelum membuat order
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="blue" size="small">
              <div class="text-body-2">
                <strong>4. Confirm Order</strong>
                <br />
                Order akan dibuat dengan status "Draft"
              </div>
            </v-timeline-item>
          </v-timeline>

          <v-divider class="my-6" />

          <!-- Order Details -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-file-document</v-icon>
            Detail Order
          </h4>

          <p class="text-body-2 mb-3">
            Klik tombol View pada order untuk melihat detail lengkap termasuk informasi pembayaran
            dan penerimaan barang.
          </p>

          <v-img :src="orderDetailsImg" class="rounded-lg mb-4 border" max-height="450" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-information</v-icon>
                  Informasi Order
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Supplier</strong>
                      - Nama pemasok
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Status</strong>
                      - Draft/Sent/Delivered
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Total Amount</strong>
                      - Estimasi total order
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Related Requests</strong>
                      - Request asal order
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-credit-card</v-icon>
                  Payment Management
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Associated Bills</strong>
                      - Daftar invoice terkait
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Attach Bill</strong>
                      - Hubungkan invoice yang ada
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Create New</strong>
                      - Buat invoice baru
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
          </v-row>

          <v-alert type="success" variant="tonal" class="mt-4">
            <strong>Langkah Selanjutnya:</strong>
            Setelah order dibuat, langkah selanjutnya adalah mengirim order ke pemasok (lihat
            Section 3).
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- ==================== SECTION 3: SEND ORDER TO SUPPLIER ==================== -->
    <section id="send-order" class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center bg-green-darken-3">
          <v-icon color="white" class="mr-2">mdi-send</v-icon>
          <span class="text-white">3. Mengirim Order ke Pemasok</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            Setelah order dibuat (status Draft), order harus dikirim ke pemasok agar mereka dapat
            memproses dan mengirimkan barang. Order yang belum dikirim tidak akan diproses.
          </p>

          <v-alert type="warning" variant="tonal" density="compact" class="mb-4">
            <strong>Penting:</strong>
            Order dengan status "Draft" masih dapat diedit. Setelah dikirim (status "Sent"), order
            tidak dapat diubah lagi.
          </v-alert>

          <!-- Draft Orders -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-file-document-edit</v-icon>
            Order dengan Status Draft
          </h4>

          <p class="text-body-2 mb-3">
            Filter orders berdasarkan status "Draft" untuk melihat order yang belum dikirim.
          </p>

          <v-img :src="draftOrderImg" class="rounded-lg mb-4 border" max-height="350" />

          <v-divider class="my-6" />

          <!-- Edit Order Dialog -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1" color="blue">mdi-pencil</v-icon>
            Dialog Edit Order
          </h4>

          <v-timeline density="compact" side="end" class="mb-4">
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>1. Klik tombol Edit (ikon pensil)</strong>
                <br />
                Pada kolom Actions dari order yang ingin dikirim
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>2. Review Order Items</strong>
                <br />
                Periksa item, quantity, dan harga sebelum mengirim
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>3. Isi Expected Delivery (opsional)</strong>
                <br />
                Tanggal perkiraan barang akan diterima
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="green" size="small">
              <div class="text-body-2">
                <strong>4. Klik "SEND TO SUPPLIER"</strong>
                <br />
                Order akan berubah status menjadi "Sent"
              </div>
            </v-timeline-item>
          </v-timeline>

          <v-img :src="sendOrderDialogImg" class="rounded-lg mb-4 border" max-height="500" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-information</v-icon>
                  Order Information
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Order Number</strong>
                      - ID unik order
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Status</strong>
                      - Draft/Sent/Delivered
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Supplier</strong>
                      - Pemasok tujuan
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-package-variant</v-icon>
                  Order Items
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Package</strong>
                      - Kemasan pembelian
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Packages</strong>
                      - Jumlah kemasan
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Price/Package</strong>
                      - Harga per kemasan
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
          </v-row>

          <v-divider class="my-6" />

          <!-- Sent Orders -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1" color="green">mdi-check-circle</v-icon>
            Order yang Sudah Dikirim
          </h4>

          <p class="text-body-2 mb-3">
            Setelah order dikirim, status akan berubah menjadi "Sent" dan menunggu pengiriman barang
            dari pemasok.
          </p>

          <v-img :src="sentOrdersImg" class="rounded-lg mb-4 border" max-height="400" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="tonal" color="blue" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-send</v-icon>
                  Status: Sent
                </h5>
                <p class="text-caption">
                  Order sudah dikirim ke pemasok. Menunggu konfirmasi pengiriman dan penerimaan
                  barang.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="tonal" color="orange" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-clock-outline</v-icon>
                  Langkah Selanjutnya
                </h5>
                <p class="text-caption">
                  Setelah barang diterima, lakukan penerimaan barang (Receiving) dan tambahkan
                  invoice untuk pembayaran.
                </p>
              </v-card>
            </v-col>
          </v-row>

          <v-alert type="success" variant="tonal" class="mt-4">
            <strong>Selesai!</strong>
            Order telah dikirim ke pemasok. Selanjutnya, tunggu barang diterima dan lakukan proses
            penerimaan serta pembayaran invoice.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- ==================== SECTION 4: ADDING INVOICE ==================== -->
    <section id="add-invoice" class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center bg-orange-darken-3">
          <v-icon color="white" class="mr-2">mdi-receipt-text</v-icon>
          <span class="text-white">4. Menambahkan Invoice</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            Setelah barang diterima, Anda perlu menambahkan invoice (faktur) dari pemasok untuk
            pencatatan pembayaran. Invoice dapat dibuat langsung dari order atau dihubungkan dengan
            invoice yang sudah ada.
          </p>

          <!-- Bill Status Overview -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-list-status</v-icon>
            Status Pembayaran (Bill Status)
          </h4>

          <v-row class="mb-4">
            <v-col cols="12" md="4">
              <v-card variant="tonal" color="grey" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-file-document-outline</v-icon>
                  Not Billed
                </h5>
                <p class="text-caption">
                  Belum ada invoice yang terhubung dengan order ini. Perlu ditambahkan invoice dari
                  pemasok.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="tonal" color="orange" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-file-document</v-icon>
                  Billed
                </h5>
                <p class="text-caption">
                  Invoice sudah ditambahkan tetapi belum lunas. Masih ada sisa pembayaran yang harus
                  dilakukan.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="tonal" color="green" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-check-circle</v-icon>
                  Fully Paid
                </h5>
                <p class="text-caption">
                  Invoice sudah lunas dibayar. Tidak ada sisa pembayaran yang perlu dilakukan.
                </p>
              </v-card>
            </v-col>
          </v-row>

          <v-divider class="my-6" />

          <!-- Payment Management Section -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1" color="blue">mdi-credit-card</v-icon>
            Payment Management
          </h4>

          <p class="text-body-2 mb-3">
            Buka detail order untuk mengakses Payment Management. Di sini Anda dapat melihat dan
            mengelola semua invoice yang terhubung dengan order.
          </p>

          <v-img :src="paymentManagementImg" class="rounded-lg mb-4 border" max-height="450" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-link</v-icon>
                  Attach Bill
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Hubungkan order dengan invoice yang sudah ada di sistem. Berguna jika satu invoice
                  mencakup beberapa order.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-plus</v-icon>
                  Create New
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Buat invoice baru khusus untuk order ini. Amount akan otomatis terisi sesuai total
                  order.
                </p>
              </v-card>
            </v-col>
          </v-row>

          <v-divider class="my-6" />

          <!-- Create New Bill -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1" color="green">mdi-plus-circle</v-icon>
            Membuat Invoice Baru
          </h4>

          <v-timeline density="compact" side="end" class="mb-4">
            <v-timeline-item dot-color="orange" size="small">
              <div class="text-body-2">
                <strong>1. Klik "CREATE NEW"</strong>
                <br />
                Di bagian Payment Management pada detail order
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="orange" size="small">
              <div class="text-body-2">
                <strong>2. Isi Amount</strong>
                <br />
                Jumlah invoice (biasanya sama dengan total order yang diterima)
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="orange" size="small">
              <div class="text-body-2">
                <strong>3. Pilih Priority</strong>
                <br />
                Low, Medium, atau High sesuai urgensi pembayaran
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="orange" size="small">
              <div class="text-body-2">
                <strong>4. Klik "CREATE BILL"</strong>
                <br />
                Invoice akan ditambahkan dan status berubah menjadi "Billed"
              </div>
            </v-timeline-item>
          </v-timeline>

          <v-img :src="createBillDialogImg" class="rounded-lg mb-4 border" max-height="450" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-currency-usd</v-icon>
                  Amount
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Jumlah yang harus dibayar. Otomatis terisi sesuai total barang yang diterima
                  (bukan yang dipesan).
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-flag</v-icon>
                  Priority
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Tingkat urgensi pembayaran: Low (bisa ditunda), Medium (normal), High (harus
                  segera dibayar).
                </p>
              </v-card>
            </v-col>
          </v-row>

          <v-alert type="info" variant="tonal" class="mt-4">
            <strong>Tips:</strong>
            Setelah invoice dibuat, Anda dapat mengelola pembayaran melalui menu Accounts > Supplier
            Bills untuk mencatat pembayaran yang sudah dilakukan.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- ==================== SECTION 5: RECEIVING GOODS ==================== -->
    <section id="receiving" class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center bg-teal-darken-3">
          <v-icon color="white" class="mr-2">mdi-package-check</v-icon>
          <span class="text-white">5. Penerimaan Barang</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            Setelah barang dikirim oleh pemasok, lakukan penerimaan barang (Receiving) untuk
            memverifikasi jumlah dan kondisi barang yang diterima. Tab RECEIPTS menampilkan semua
            penerimaan barang yang sudah dicatat.
          </p>

          <!-- Receipts Tab Overview -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-tab</v-icon>
            Tab RECEIPTS
          </h4>

          <v-img :src="receiptsTabImg" class="rounded-lg mb-4 border" max-height="450" />

          <v-row class="mb-4">
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="blue">mdi-filter</v-icon>
                  Filter Receipts
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Status</strong>
                      - Draft, Completed
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Discrepancies</strong>
                      - Yes/No (ada perbedaan)
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Search</strong>
                      - Cari berdasarkan nomor receipt
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="green">mdi-table</v-icon>
                  Kolom Tabel
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Tabel menampilkan Receipt #, Purchase Order, Status, Discrepancies, Items count,
                  Financial Impact, Delivery Date, dan Storage status.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="orange">mdi-currency-usd</v-icon>
                  Financial Impact
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Menunjukkan selisih antara nilai barang yang dipesan vs yang diterima. Positif
                  berarti lebih mahal, negatif berarti lebih murah.
                </p>
              </v-card>
            </v-col>
          </v-row>

          <v-divider class="my-6" />

          <!-- Receipt Statuses -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-list-status</v-icon>
            Status Receipt
          </h4>

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="tonal" color="grey" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-file-document-edit</v-icon>
                  Draft
                </h5>
                <p class="text-caption">
                  Receipt baru yang masih bisa diedit. Barang belum dicatat masuk ke storage. Dapat
                  dilakukan verifikasi ulang.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="tonal" color="green" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-check-circle</v-icon>
                  Completed
                </h5>
                <p class="text-caption">
                  Penerimaan barang selesai dan final. Barang sudah dicatat masuk ke storage. Tidak
                  dapat diedit lagi.
                </p>
              </v-card>
            </v-col>
          </v-row>

          <v-divider class="my-6" />

          <!-- Receipt Details -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-file-document</v-icon>
            Detail Receipt
          </h4>

          <p class="text-body-2 mb-3">
            Klik tombol View pada receipt untuk melihat detail lengkap penerimaan barang termasuk
            perbandingan item yang dipesan vs yang diterima.
          </p>

          <v-img :src="receiptDetailsDraftImg" class="rounded-lg mb-4 border" max-height="450" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-information</v-icon>
                  Informasi Receipt
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Purchase Order</strong>
                      - Order asal barang
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Delivery Date</strong>
                      - Tanggal barang diterima
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Received By</strong>
                      - Petugas yang menerima
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Financial Impact</strong>
                      - Selisih nilai
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-compare</v-icon>
                  Items Comparison
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Qty</strong>
                      - Received vs Ordered
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Price</strong>
                      - Harga aktual vs yang dipesan
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Line Total</strong>
                      - Total per item
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Status</strong>
                      - OK/Discrepancy
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
          </v-row>

          <v-divider class="my-6" />

          <!-- Edit Receipt -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1" color="blue">mdi-pencil</v-icon>
            Edit Receipt
          </h4>

          <p class="text-body-2 mb-3">
            Untuk receipt dengan status Draft, Anda dapat mengedit detail penerimaan sebelum
            menyelesaikan proses.
          </p>

          <v-timeline density="compact" side="end" class="mb-4">
            <v-timeline-item dot-color="teal" size="small">
              <div class="text-body-2">
                <strong>1. Klik "EDIT RECEIPT"</strong>
                <br />
                Pada detail receipt dengan status Draft
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="teal" size="small">
              <div class="text-body-2">
                <strong>2. Isi Received By</strong>
                <br />
                Nama petugas yang menerima barang
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="teal" size="small">
              <div class="text-body-2">
                <strong>3. Verifikasi setiap item</strong>
                <br />
                Cocokkan jumlah dan harga dengan barang yang diterima
              </div>
            </v-timeline-item>
            <v-timeline-item dot-color="teal" size="small">
              <div class="text-body-2">
                <strong>4. Klik "COMPLETE RECEIPT"</strong>
                <br />
                Finalisasi penerimaan dan catat ke storage
              </div>
            </v-timeline-item>
          </v-timeline>

          <v-img :src="editReceiptDialogImg" class="rounded-lg mb-4 border" max-height="500" />

          <v-row class="mb-4">
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-auto-fix</v-icon>
                  Auto Fill
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Tombol untuk mengisi semua item dengan jumlah yang sama seperti yang dipesan.
                  Berguna jika barang diterima lengkap tanpa perubahan.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-package-variant</v-icon>
                  Recv. Pkgs
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Jumlah package yang diterima. Otomatis menghitung Received Qty berdasarkan ukuran
                  package.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1">mdi-currency-usd</v-icon>
                  Price/Package
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Harga aktual per package. Jika berbeda dari yang dipesan, sistem akan menampilkan
                  perbedaan harga.
                </p>
              </v-card>
            </v-col>
          </v-row>

          <v-divider class="my-6" />

          <!-- Actions -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-check-all</v-icon>
            Aksi Receipt
          </h4>

          <v-row class="mb-4">
            <v-col cols="12" md="4">
              <v-card variant="tonal" color="grey" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-1">
                  <v-icon size="18" class="mr-1">mdi-close</v-icon>
                  CANCEL
                </h5>
                <p class="text-caption">
                  Batalkan perubahan dan tutup dialog. Data tidak akan disimpan.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="tonal" color="blue" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-1">
                  <v-icon size="18" class="mr-1">mdi-content-save</v-icon>
                  SAVE DRAFT
                </h5>
                <p class="text-caption">
                  Simpan sebagai draft untuk dilanjutkan nanti. Barang belum masuk ke storage.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="tonal" color="green" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-1">
                  <v-icon size="18" class="mr-1">mdi-check-circle</v-icon>
                  COMPLETE RECEIPT
                </h5>
                <p class="text-caption">
                  Finalisasi penerimaan. Barang akan dicatat masuk ke storage dan tidak dapat
                  diubah.
                </p>
              </v-card>
            </v-col>
          </v-row>

          <v-alert type="success" variant="tonal" class="mt-4">
            <strong>Selesai!</strong>
            Setelah receipt di-complete, barang akan otomatis masuk ke storage dan order akan
            berubah status menjadi "Delivered". Jangan lupa untuk menambahkan invoice (Section 4)
            untuk mencatat pembayaran ke pemasok.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>
  </div>
</template>

<style scoped lang="scss">
.supplier-guide {
  max-width: 900px;
}

.border-dashed {
  border-style: dashed !important;
}

.border {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
