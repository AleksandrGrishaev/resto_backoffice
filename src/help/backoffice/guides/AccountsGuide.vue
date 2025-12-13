<script setup lang="ts">
// Screenshots - Accounts Main Page
import accountsMainImg from '@/help/assets/screenshots/backoffice/accounts/01_accounts_main.png'
import accountTransactionsImg from '@/help/assets/screenshots/backoffice/accounts/02_account_transactions.png'

// Screenshots - Income/Expense/Transfer Dialogs
import incomeDialogImg from '@/help/assets/screenshots/backoffice/accounts/03_income_dialog.png'
import expenseDialogImg from '@/help/assets/screenshots/backoffice/accounts/04_expense_dialog.png'
import expenseTypesImg from '@/help/assets/screenshots/backoffice/accounts/05_expense_types.png'
import transferDialogImg from '@/help/assets/screenshots/backoffice/accounts/06_transfer_dialog.png'
import transferAccountsListImg from '@/help/assets/screenshots/backoffice/accounts/07_transfer_accounts_list.png'

// Screenshots - Payment Confirmation
import paymentConfirmationImg from '@/help/assets/screenshots/backoffice/accounts/08_payment_confirmation.png'
import cashRegisterTransactionsImg from '@/help/assets/screenshots/backoffice/accounts/09_cash_register_transactions.png'
</script>

<template>
  <div class="accounts-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="teal" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-wallet</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Manajemen Akun</h1>
        <p class="text-body-2 text-medium-emphasis">
          Panduan lengkap untuk mengelola akun keuangan, pembayaran, dan transaksi
        </p>
      </div>
    </div>

    <!-- Overview -->
    <v-alert type="info" variant="tonal" class="mb-6">
      <strong>Fitur Utama Akun:</strong>
      <ol class="mt-2 mb-0">
        <li>
          <strong>Pending Payments</strong>
          - Daftar tagihan yang menunggu pembayaran
        </li>
        <li>
          <strong>Income</strong>
          - Catat pemasukan ke akun
        </li>
        <li>
          <strong>Expense</strong>
          - Catat pengeluaran dari akun
        </li>
        <li>
          <strong>Transfer</strong>
          - Transfer antar akun
        </li>
        <li>
          <strong>Correction</strong>
          - Koreksi saldo akun
        </li>
      </ol>
    </v-alert>

    <!-- Important Note about Product Expenses -->
    <v-alert type="warning" variant="tonal" class="mb-6">
      <v-icon class="mr-2">mdi-alert</v-icon>
      <strong>Penting:</strong>
      Pengeluaran untuk pembelian produk (
      <em>Products</em>
      ) hanya dapat dibuat melalui modul
      <strong>Supplier</strong>
      . Di menu Expense manual, Anda hanya dapat memilih
      <strong>Daily Expenses</strong>
      atau
      <strong>Investments</strong>
      .
    </v-alert>

    <!-- Table of Contents -->
    <v-card variant="outlined" class="mb-6">
      <v-card-title class="text-subtitle-1">
        <v-icon class="mr-2">mdi-format-list-bulleted</v-icon>
        Daftar Isi
      </v-card-title>
      <v-card-text>
        <v-list density="compact" nav>
          <v-list-item prepend-icon="mdi-numeric-1-circle" href="#pending-payments">
            <v-list-item-title>Pending Payments (Tagihan Menunggu)</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-numeric-2-circle" href="#cashier-confirmation">
            <v-list-item-title>Konfirmasi Kasir (Cashier Account)</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-numeric-3-circle" href="#income">
            <v-list-item-title>Income (Pemasukan)</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-numeric-4-circle" href="#expense">
            <v-list-item-title>Expense (Pengeluaran)</v-list-item-title>
          </v-list-item>
          <v-list-item prepend-icon="mdi-numeric-5-circle" href="#transfer">
            <v-list-item-title>Transfer Antar Akun</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <!-- ==================== SECTION 1: PENDING PAYMENTS ==================== -->
    <section id="pending-payments" class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center bg-teal-darken-3">
          <v-icon color="white" class="mr-2">mdi-clock-outline</v-icon>
          <span class="text-white">1. Pending Payments (Tagihan Menunggu)</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            Pending Payments adalah daftar tagihan dari pemasok yang belum dibayar. Tagihan ini
            dibuat secara otomatis saat Anda membuat invoice di modul Supplier.
          </p>

          <!-- Main Screen Overview -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-monitor</v-icon>
            Halaman Utama Akun
          </h4>

          <v-img :src="accountsMainImg" class="rounded-lg mb-4 border" max-height="450" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="orange">mdi-clock-outline</v-icon>
                  Pending Payments Panel
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Total Amount</strong>
                      - Total semua tagihan yang belum dibayar
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Total Payments</strong>
                      - Jumlah tagihan yang menunggu
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Klik baris</strong>
                      - Buka dialog konfirmasi pembayaran
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="blue">mdi-bank</v-icon>
                  Daftar Akun
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Bank Account</strong>
                      - Untuk pembayaran QR dan transfer
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Card Terminal</strong>
                      - Pembayaran kartu debit/kredit
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <v-list-item-subtitle>
                      <strong>Cash Register</strong>
                      - Kas utama (tipe cashier)
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
          </v-row>

          <!-- Payment Confirmation Dialog -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-check-circle</v-icon>
            Dialog Konfirmasi Pembayaran
          </h4>

          <v-img :src="paymentConfirmationImg" class="rounded-lg mb-4 border" max-height="500" />

          <v-alert type="info" variant="tonal" class="mb-4">
            <strong>Cara Membayar Tagihan:</strong>
            <ol class="mt-2 mb-0">
              <li>Klik baris tagihan di panel Pending Payments</li>
              <li>Dialog Payment Confirmation akan terbuka</li>
              <li>Review detail tagihan (Supplier, Amount, Invoice, Related Orders)</li>
              <li>Pilih akun untuk pembayaran dari dropdown "Payment Account"</li>
              <li>Klik "Confirm Payment" untuk menyelesaikan pembayaran</li>
            </ol>
          </v-alert>

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="purple">mdi-truck</v-icon>
                  Supplier Payment Context
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Informasi lengkap tentang tagihan: nama pemasok, jumlah, nomor invoice, status,
                  dan daftar order yang terkait.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="green">mdi-wallet</v-icon>
                  Select Account for Payment
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Pilih akun yang akan digunakan untuk membayar. Saldo akun akan berkurang sesuai
                  jumlah pembayaran.
                </p>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </section>

    <!-- ==================== SECTION 2: CASHIER CONFIRMATION ==================== -->
    <section id="cashier-confirmation" class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center bg-orange-darken-3">
          <v-icon color="white" class="mr-2">mdi-cash-register</v-icon>
          <span class="text-white">2. Konfirmasi Kasir (Cashier Account)</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            Akun dengan tipe
            <strong>Cashier</strong>
            (seperti Main Cash Register) memiliki fitur khusus: pembayaran ke pemasok harus
            dikonfirmasi oleh kasir yang sedang shift aktif.
          </p>

          <!-- Cash Register Transactions -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-format-list-checks</v-icon>
            Transaksi Cash Register
          </h4>

          <v-img
            :src="cashRegisterTransactionsImg"
            class="rounded-lg mb-4 border"
            max-height="450"
          />

          <v-alert type="warning" variant="tonal" class="mb-4">
            <strong>Konfirmasi Kasir:</strong>
            <p class="mt-2 mb-0">
              Ketika pembayaran supplier dilakukan dari akun Cashier, sistem akan mencatat nama
              kasir yang mengkonfirmasi dan shift yang aktif. Ini terlihat di kolom Description:
              <br />
              <code>
                "Podтверждено кассиром: [Nama User] | Shift: [ID Shift] | Orders: [PO Number]"
              </code>
            </p>
          </v-alert>

          <v-row class="mb-4">
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="green">mdi-plus</v-icon>
                  Income
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Pemasukan dari POS (shift income), deposit, atau sumber lain. Warna hijau
                  menunjukkan penambahan saldo.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="red">mdi-minus</v-icon>
                  Expense
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Pengeluaran untuk pembayaran supplier, operasional harian, atau investasi. Warna
                  merah menunjukkan pengurangan saldo.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="blue">mdi-pencil</v-icon>
                  Correction
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Koreksi saldo untuk penyesuaian (starting balance, perbedaan fisik, dll). Dapat
                  positif atau negatif.
                </p>
              </v-card>
            </v-col>
          </v-row>

          <v-alert type="info" variant="tonal" class="mb-4">
            <strong>Tipe Akun:</strong>
            <v-list density="compact" class="pa-0 mt-2">
              <v-list-item class="px-0">
                <template #prepend>
                  <v-icon size="18" color="blue" class="mr-2">mdi-bank</v-icon>
                </template>
                <v-list-item-subtitle>
                  <strong>Bank</strong>
                  - Rekening bank untuk transfer dan pembayaran QR
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item class="px-0">
                <template #prepend>
                  <v-icon size="18" color="purple" class="mr-2">mdi-credit-card</v-icon>
                </template>
                <v-list-item-subtitle>
                  <strong>Card Terminal</strong>
                  - Mesin EDC untuk pembayaran kartu
                </v-list-item-subtitle>
              </v-list-item>
              <v-list-item class="px-0">
                <template #prepend>
                  <v-icon size="18" color="orange" class="mr-2">mdi-cash-register</v-icon>
                </template>
                <v-list-item-subtitle>
                  <strong>Cashier</strong>
                  - Kas utama, pembayaran supplier memerlukan konfirmasi kasir
                </v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- ==================== SECTION 3: INCOME ==================== -->
    <section id="income" class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center bg-green-darken-3">
          <v-icon color="white" class="mr-2">mdi-plus-circle</v-icon>
          <span class="text-white">3. Income (Pemasukan)</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            Fitur Income digunakan untuk mencatat pemasukan ke akun. Pemasukan bisa berasal dari
            berbagai sumber seperti deposit, penjualan tunai, atau transfer masuk.
          </p>

          <!-- Account Transactions View -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-view-list</v-icon>
            Halaman Transaksi Akun
          </h4>

          <v-img :src="accountTransactionsImg" class="rounded-lg mb-4 border" max-height="450" />

          <v-alert type="info" variant="tonal" class="mb-4">
            <strong>Tombol Aksi:</strong>
            <v-row class="mt-2">
              <v-col cols="6" md="3">
                <v-chip color="green" variant="flat" size="small">
                  <v-icon start size="16">mdi-plus</v-icon>
                  INCOME
                </v-chip>
                <p class="text-caption mt-1">Tambah pemasukan</p>
              </v-col>
              <v-col cols="6" md="3">
                <v-chip color="red" variant="flat" size="small">
                  <v-icon start size="16">mdi-minus</v-icon>
                  EXPENSE
                </v-chip>
                <p class="text-caption mt-1">Tambah pengeluaran</p>
              </v-col>
              <v-col cols="6" md="3">
                <v-chip color="blue" variant="flat" size="small">
                  <v-icon start size="16">mdi-swap-horizontal</v-icon>
                  TRANSFER
                </v-chip>
                <p class="text-caption mt-1">Transfer antar akun</p>
              </v-col>
              <v-col cols="6" md="3">
                <v-chip color="orange" variant="flat" size="small">
                  <v-icon start size="16">mdi-pencil</v-icon>
                  CORRECTION
                </v-chip>
                <p class="text-caption mt-1">Koreksi saldo</p>
              </v-col>
            </v-row>
          </v-alert>

          <!-- Income Dialog -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-form-textbox</v-icon>
            Dialog Income
          </h4>

          <v-img :src="incomeDialogImg" class="rounded-lg mb-4 border" max-height="400" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="green">mdi-currency-usd</v-icon>
                  Amount
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Masukkan jumlah pemasukan dalam Rupiah. Saldo akun akan bertambah sesuai jumlah
                  yang dimasukkan.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="blue">mdi-text</v-icon>
                  Description
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Keterangan tentang sumber pemasukan. Contoh: "Deposit kas", "Penjualan tunai",
                  "Transfer dari owner".
                </p>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </section>

    <!-- ==================== SECTION 4: EXPENSE ==================== -->
    <section id="expense" class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center bg-red-darken-3">
          <v-icon color="white" class="mr-2">mdi-minus-circle</v-icon>
          <span class="text-white">4. Expense (Pengeluaran)</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            Fitur Expense digunakan untuk mencatat pengeluaran dari akun. Ada dua tipe pengeluaran
            yang dapat dibuat secara manual.
          </p>

          <v-alert type="error" variant="tonal" class="mb-4">
            <v-icon class="mr-2">mdi-alert-circle</v-icon>
            <strong>Penting!</strong>
            Pengeluaran untuk
            <strong>pembelian produk (Products)</strong>
            tidak dapat dibuat dari menu ini. Gunakan modul
            <strong>Supplier</strong>
            untuk membuat order dan invoice pembelian produk.
          </v-alert>

          <!-- Expense Dialog -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-form-textbox</v-icon>
            Dialog Expense
          </h4>

          <v-img :src="expenseDialogImg" class="rounded-lg mb-4 border" max-height="400" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="red">mdi-currency-usd</v-icon>
                  Amount
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Jumlah pengeluaran dalam Rupiah. Saldo akun akan berkurang sesuai jumlah yang
                  dimasukkan.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="purple">mdi-tag</v-icon>
                  Expense Type
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Pilih tipe pengeluaran: Daily Expenses (operasional harian) atau Investments
                  (pembelian aset/peralatan).
                </p>
              </v-card>
            </v-col>
          </v-row>

          <!-- Expense Types -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-format-list-bulleted-type</v-icon>
            Tipe Pengeluaran
          </h4>

          <v-img :src="expenseTypesImg" class="rounded-lg mb-4 border" max-height="350" />

          <v-row class="mb-4">
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 h-100 border-warning">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="orange">mdi-calendar-today</v-icon>
                  Daily Expenses
                </h5>
                <p class="text-caption text-medium-emphasis mb-2">
                  Pengeluaran operasional harian seperti:
                </p>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0 py-0">
                    <v-list-item-subtitle class="text-caption">
                      - Listrik & air
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0 py-0">
                    <v-list-item-subtitle class="text-caption">- Transport</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0 py-0">
                    <v-list-item-subtitle class="text-caption">
                      - Supplies kantor
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0 py-0">
                    <v-list-item-subtitle class="text-caption">
                      - Perbaikan kecil
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 h-100 border-info">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="blue">mdi-chart-line</v-icon>
                  Investments
                </h5>
                <p class="text-caption text-medium-emphasis mb-2">
                  Pembelian aset atau peralatan seperti:
                </p>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0 py-0">
                    <v-list-item-subtitle class="text-caption">
                      - Peralatan dapur
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0 py-0">
                    <v-list-item-subtitle class="text-caption">- Furniture</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0 py-0">
                    <v-list-item-subtitle class="text-caption">- Komputer/POS</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0 py-0">
                    <v-list-item-subtitle class="text-caption">- Renovasi</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="outlined" class="pa-3 h-100 border-error">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="red">mdi-cart</v-icon>
                  Products (via Supplier)
                </h5>
                <p class="text-caption text-medium-emphasis mb-2">Pembelian bahan baku/produk:</p>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0 py-0">
                    <v-list-item-subtitle class="text-caption">
                      - Bahan makanan
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0 py-0">
                    <v-list-item-subtitle class="text-caption">- Minuman</v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0 py-0">
                    <v-list-item-subtitle class="text-caption">- Packaging</v-list-item-subtitle>
                  </v-list-item>
                </v-list>
                <v-chip color="error" size="x-small" class="mt-2">Hanya via Supplier</v-chip>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </section>

    <!-- ==================== SECTION 5: TRANSFER ==================== -->
    <section id="transfer" class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center bg-blue-darken-3">
          <v-icon color="white" class="mr-2">mdi-swap-horizontal</v-icon>
          <span class="text-white">5. Transfer Antar Akun</span>
        </v-card-title>
        <v-card-text class="pt-4">
          <p class="mb-4">
            Fitur Transfer memungkinkan Anda memindahkan dana dari satu akun ke akun lain. Ini
            berguna untuk menyeimbangkan kas atau memindahkan dana ke rekening bank.
          </p>

          <!-- Transfer Dialog -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-form-textbox</v-icon>
            Dialog Transfer
          </h4>

          <v-img :src="transferDialogImg" class="rounded-lg mb-4 border" max-height="400" />

          <v-row class="mb-4">
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="red">mdi-bank-minus</v-icon>
                  Source Account
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Akun asal (sumber dana). Saldo akun ini akan berkurang sesuai jumlah transfer.
                </p>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card variant="outlined" class="pa-3 h-100">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="green">mdi-bank-plus</v-icon>
                  Destination Account
                </h5>
                <p class="text-caption text-medium-emphasis">
                  Akun tujuan transfer. Saldo akun ini akan bertambah sesuai jumlah transfer.
                </p>
              </v-card>
            </v-col>
          </v-row>

          <!-- Account Selection -->
          <h4 class="text-subtitle-1 font-weight-medium mb-3">
            <v-icon size="20" class="mr-1">mdi-format-list-checks</v-icon>
            Pilihan Akun
          </h4>

          <v-img :src="transferAccountsListImg" class="rounded-lg mb-4 border" max-height="400" />

          <v-alert type="info" variant="tonal" class="mb-4">
            <strong>Cara Transfer:</strong>
            <ol class="mt-2 mb-0">
              <li>Buka halaman akun sumber</li>
              <li>
                Klik tombol
                <strong>TRANSFER</strong>
              </li>
              <li>Pilih akun tujuan dari dropdown "Destination Account"</li>
              <li>Masukkan jumlah transfer</li>
              <li>Tambahkan deskripsi (opsional)</li>
              <li>Klik "Create Transfer" untuk menyelesaikan</li>
            </ol>
          </v-alert>

          <v-row class="mb-4">
            <v-col cols="12">
              <v-card variant="outlined" class="pa-3">
                <h5 class="text-subtitle-2 font-weight-medium mb-2">
                  <v-icon size="18" class="mr-1" color="blue">mdi-information</v-icon>
                  Catatan Penting
                </h5>
                <v-list density="compact" class="pa-0">
                  <v-list-item class="px-0">
                    <template #prepend>
                      <v-icon size="16" color="success" class="mr-2">mdi-check</v-icon>
                    </template>
                    <v-list-item-subtitle>
                      Transfer tidak mengubah total saldo keseluruhan, hanya memindahkan antar akun
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <template #prepend>
                      <v-icon size="16" color="success" class="mr-2">mdi-check</v-icon>
                    </template>
                    <v-list-item-subtitle>
                      Transaksi tercatat di kedua akun (keluar di sumber, masuk di tujuan)
                    </v-list-item-subtitle>
                  </v-list-item>
                  <v-list-item class="px-0">
                    <template #prepend>
                      <v-icon size="16" color="warning" class="mr-2">mdi-alert</v-icon>
                    </template>
                    <v-list-item-subtitle>
                      Pastikan saldo akun sumber mencukupi sebelum transfer
                    </v-list-item-subtitle>
                  </v-list-item>
                </v-list>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </section>

    <!-- Summary -->
    <v-card variant="outlined" class="mb-6">
      <v-card-title class="text-subtitle-1">
        <v-icon class="mr-2">mdi-check-circle</v-icon>
        Ringkasan
      </v-card-title>
      <v-card-text>
        <v-list density="compact">
          <v-list-item>
            <template #prepend>
              <v-icon color="orange" class="mr-2">mdi-clock-outline</v-icon>
            </template>
            <v-list-item-title>Pending Payments</v-list-item-title>
            <v-list-item-subtitle>
              Bayar tagihan supplier dengan memilih akun pembayaran
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item>
            <template #prepend>
              <v-icon color="purple" class="mr-2">mdi-cash-register</v-icon>
            </template>
            <v-list-item-title>Cashier Confirmation</v-list-item-title>
            <v-list-item-subtitle>
              Pembayaran dari kas memerlukan konfirmasi kasir aktif
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item>
            <template #prepend>
              <v-icon color="green" class="mr-2">mdi-plus-circle</v-icon>
            </template>
            <v-list-item-title>Income</v-list-item-title>
            <v-list-item-subtitle>Catat pemasukan dengan jumlah dan deskripsi</v-list-item-subtitle>
          </v-list-item>
          <v-list-item>
            <template #prepend>
              <v-icon color="red" class="mr-2">mdi-minus-circle</v-icon>
            </template>
            <v-list-item-title>Expense</v-list-item-title>
            <v-list-item-subtitle>
              Daily Expenses atau Investments (Products hanya via Supplier)
            </v-list-item-subtitle>
          </v-list-item>
          <v-list-item>
            <template #prepend>
              <v-icon color="blue" class="mr-2">mdi-swap-horizontal</v-icon>
            </template>
            <v-list-item-title>Transfer</v-list-item-title>
            <v-list-item-subtitle>Pindahkan dana antar akun dengan mudah</v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped lang="scss">
.accounts-guide {
  max-width: 1000px;
  margin: 0 auto;
}

.border {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.border-warning {
  border-color: rgb(var(--v-theme-warning)) !important;
}

.border-info {
  border-color: rgb(var(--v-theme-info)) !important;
}

.border-error {
  border-color: rgb(var(--v-theme-error)) !important;
}
</style>
