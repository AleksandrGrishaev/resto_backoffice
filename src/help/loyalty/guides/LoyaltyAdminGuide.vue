<script setup lang="ts">
// Admin actions guide — no screenshots yet (to be added later)
</script>

<template>
  <div class="loyalty-admin-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="red-darken-2" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-shield-account</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Admin Loyalty — Actions & Common Requests</h1>
        <p class="text-body-2 text-medium-emphasis">
          Apa yang admin/manager bisa lakukan — dan permintaan kasir yang harus di-escalate
        </p>
      </div>
    </div>

    <!-- Role alert -->
    <v-alert type="warning" variant="tonal" class="mb-6" icon="mdi-shield-lock">
      <strong>Panduan ini untuk role admin / manager.</strong>
      Kasir tidak memiliki akses ke aksi-aksi ini. Kasir harus
      <strong>escalate</strong>
      kasus ke admin melalui catatan di struk atau shift log (lihat Skenario 8 di panduan kasir).
    </v-alert>

    <!-- Entry point -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="red-darken-2" class="mr-2">mdi-map-marker</v-icon>
          Di mana mengakses
        </v-card-title>
        <v-card-text>
          <p class="mb-3">
            Masuk ke
            <strong>Admin → Loyalty</strong>
            . Screen ini punya 4 tab utama:
          </p>

          <v-row>
            <v-col cols="12" md="3">
              <v-card variant="outlined" class="text-center pa-3 h-100">
                <v-icon size="32" color="blue" class="mb-2">mdi-cog</v-icon>
                <div class="text-subtitle-2 font-weight-medium">Settings</div>
                <div class="text-caption text-medium-emphasis mt-1">
                  Konfigurasi global: stamps per cycle, rewards, tier thresholds, cashback %
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card variant="outlined" class="text-center pa-3 h-100">
                <v-icon size="32" color="purple" class="mb-2">mdi-card-account-details</v-icon>
                <div class="text-subtitle-2 font-weight-medium">Cards</div>
                <div class="text-caption text-medium-emphasis mt-1">
                  List, issue, edit, deactivate kartu stamp
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card variant="outlined" class="text-center pa-3 h-100">
                <v-icon size="32" color="teal" class="mb-2">mdi-account-group</v-icon>
                <div class="text-subtitle-2 font-weight-medium">Customers</div>
                <div class="text-caption text-medium-emphasis mt-1">
                  List, edit, merge pelanggan; adjust stamps & saldo
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card variant="outlined" class="text-center pa-3 h-100">
                <v-icon size="32" color="amber" class="mb-2">mdi-history</v-icon>
                <div class="text-subtitle-2 font-weight-medium">History</div>
                <div class="text-caption text-medium-emphasis mt-1">
                  Log transaksi loyalty — audit trail
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </section>

    <!-- Common requests from cashier -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="red-darken-2" class="mr-2">mdi-account-voice</v-icon>
          Permintaan Kasir yang Umum → Aksi Admin
        </v-card-title>
        <v-card-text>
          <p class="mb-3">
            Kasir tidak menyelesaikan sendiri — mereka hanya mencatat dan escalate. Daftar
            permintaan yang biasa sampai ke admin:
          </p>

          <v-table density="comfortable">
            <thead>
              <tr>
                <th class="text-left">Kasir mengatakan…</th>
                <th class="text-left">Admin melakukan…</th>
                <th class="text-left">Tab</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>"Pelanggan punya N stamp di kartu fisik, sistem cuma X"</td>
                <td>
                  <strong>Aksi 1</strong>
                  — Tambahkan stamp yang hilang
                </td>
                <td>Customers</td>
              </tr>
              <tr>
                <td>"Ada dua record untuk orang yang sama"</td>
                <td>
                  <strong>Aksi 3</strong>
                  — Merge duplikat
                </td>
                <td>Customers</td>
              </tr>
              <tr>
                <td>"Pelanggan VIP harus di cashback, sekarang di stamps"</td>
                <td>
                  <strong>Aksi 5</strong>
                  — Switch program
                </td>
                <td>Customers</td>
              </tr>
              <tr>
                <td>"Kartu hilang, pelanggan minta pengganti"</td>
                <td>
                  <strong>Aksi 4</strong>
                  — Deactivate kartu lama + issue kartu baru
                </td>
                <td>Cards</td>
              </tr>
              <tr>
                <td>"Saldo cashback salah setelah refund"</td>
                <td>
                  <strong>Aksi 2</strong>
                  — Adjust saldo + isi alasan
                </td>
                <td>Customers</td>
              </tr>
              <tr>
                <td>"Reward terlalu kecil / stamp threshold terlalu tinggi"</td>
                <td>
                  <strong>Settings</strong>
                  — Ubah konfigurasi global
                </td>
                <td>Settings</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>
    </section>

    <!-- Action 1: Add Stamps -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-chip color="blue" size="small" class="mr-2">Aksi 1</v-chip>
          Tambahkan Stamp ke Pelanggan
        </v-card-title>
        <v-card-text>
          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            <strong>Kapan:</strong>
            Pelanggan punya stamp di kartu fisik yang tidak ada di sistem (Skenario 8a/8c).
          </v-alert>

          <ol class="pl-4 mb-0">
            <li class="mb-2">
              Admin → Loyalty → tab
              <strong>Customers</strong>
            </li>
            <li class="mb-2">Cari pelanggan (search nama / telepon / telegram)</li>
            <li class="mb-2">Klik baris → dialog detail pelanggan terbuka</li>
            <li class="mb-2">
              Tekan
              <strong>Edit</strong>
            </li>
            <li class="mb-2">
              Di section
              <strong>Loyalty</strong>
              , set
              <strong>Stamps</strong>
              = total yang benar (stamp sistem saat ini + yang hilang dari kartu fisik)
            </li>
            <li>
              Tekan
              <strong>Save</strong>
            </li>
          </ol>

          <v-alert type="warning" variant="tonal" class="mt-4" density="compact">
            Jika pelanggan
            <strong>belum punya kartu</strong>
            — issue dulu via tab
            <strong>Cards</strong>
            →
            <strong>New Card</strong>
            , lalu kembali ke Customers, link kartu baru via Edit.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Action 2: Adjust Balance -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-chip color="amber" size="small" class="mr-2">Aksi 2</v-chip>
          Adjust Saldo Cashback
        </v-card-title>
        <v-card-text>
          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            <strong>Kapan:</strong>
            Pelanggan cashback punya selisih saldo (refund, reward manual, koreksi).
          </v-alert>

          <ol class="pl-4 mb-0">
            <li class="mb-2">
              Admin → Loyalty → tab
              <strong>Customers</strong>
              → klik pelanggan →
              <strong>Edit</strong>
            </li>
            <li class="mb-2">
              Di section
              <strong>Loyalty</strong>
              , ubah
              <strong>Cashback Balance</strong>
              ke jumlah yang benar
            </li>
            <li class="mb-2">
              Isi
              <strong>Adjustment reason</strong>
              (wajib saat saldo berubah — disimpan di audit log)
            </li>
            <li>
              Tekan
              <strong>Save</strong>
            </li>
          </ol>

          <v-alert type="warning" variant="tonal" class="mt-4" density="compact">
            Field
            <strong>Adjustment reason</strong>
            ditandai wajib — tanpa alasan perubahan saldo tidak bisa disimpan. Ini untuk audit
            trail.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Action 3: Merge -->
    <section class="mb-8">
      <v-card border color="purple">
        <v-card-title class="d-flex align-center">
          <v-chip color="purple" size="small" class="mr-2">Aksi 3</v-chip>
          Merge Dua Record Pelanggan Duplikat
        </v-card-title>
        <v-card-text>
          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            <strong>Kapan:</strong>
            Orang yang sama punya dua record (Skenario 8b — mis. POS-created Customer A dengan kartu
            #NNN + kemudian self-register Customer B via Telegram/Google).
          </v-alert>

          <ol class="pl-4 mb-4">
            <li class="mb-2">
              Admin → Loyalty → tab
              <strong>Customers</strong>
              → cari record
              <strong>source</strong>
              (yang mau di-merge / dihapus — biasanya duplikat dengan data minim, mis. akun
              self-register yang kosong)
            </li>
            <li class="mb-2">
              Klik baris → di dialog detail, tekan
              <strong>Merge Into…</strong>
            </li>
            <li class="mb-2">
              <strong>Step 1: Select target</strong>
              — pilih record yang harus tetap ada (yang punya stamp / riwayat pesanan)
            </li>
            <li class="mb-2">Ringkasan konfirmasi muncul: saldo / visits / total spent target</li>
            <li class="mb-2">
              <strong>Step 2: Resolve conflicts</strong>
              — untuk setiap field yang beda (nama, telepon, email, telegram, tier, dll), tekan sisi
              mana yang mau disimpan
            </li>
            <li>
              Tekan
              <strong>Merge</strong>
              di bawah
            </li>
          </ol>

          <p class="mb-2 font-weight-medium">Hasil:</p>
          <ul class="pl-4 mb-4">
            <li class="mb-1">
              Semua pesanan, transaksi, poin loyalty, kartu stamp, identitas dari source ditransfer
              ke target
            </li>
            <li class="mb-1">
              Record source dihapus (status
              <code>merged</code>
              )
            </li>
            <li>
              Pelanggan sekarang punya satu record konsolidasi dengan semua stamp + akses kabinet
              online utuh
            </li>
          </ul>

          <v-alert type="error" variant="tonal">
            <strong>Merge bersifat destruktif — tidak bisa di-undo.</strong>
            Selalu periksa dua kali di screen Resolve conflicts sebelum menekan Merge. Jika
            ragu-ragu, batalkan dan konsultasi dulu.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Action 4: Cards -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-chip color="deep-purple" size="small" class="mr-2">Aksi 4</v-chip>
          Issue / Edit / Deactivate Kartu Stamp
        </v-card-title>
        <v-card-text>
          <ol class="pl-4 mb-0">
            <li class="mb-2">
              Admin → Loyalty → tab
              <strong>Cards</strong>
            </li>
            <li class="mb-2">
              <strong>Issue kartu baru:</strong>
              tombol
              <strong>New Card</strong>
              — nomor kartu otomatis di-generate. Opsional: link ke pelanggan
            </li>
            <li class="mb-2">
              <strong>Edit kartu:</strong>
              klik baris → adjust stamps count (mis. fix miscount) → Save
            </li>
            <li>
              <strong>Deactivate kartu:</strong>
              klik baris →
              <strong>Deactivate</strong>
              (pakai untuk kartu hilang sebelum issue pengganti)
            </li>
          </ol>

          <v-alert type="info" variant="tonal" class="mt-4" density="compact">
            <strong>Kartu hilang:</strong>
            Deactivate kartu lama dulu, baru issue kartu baru dan link ke pelanggan yang sama.
            Jangan langsung hapus — record lama tetap di database untuk referensi historis.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Action 5: Switch Program -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-chip color="teal" size="small" class="mr-2">Aksi 5</v-chip>
          Switch Program Loyalty Pelanggan
        </v-card-title>
        <v-card-text>
          <v-alert type="info" variant="tonal" density="compact" class="mb-4">
            <strong>Kapan:</strong>
            Kasir minta konversi pelanggan stamps ke cashback (atau sebaliknya) untuk VIP treatment.
          </v-alert>

          <ol class="pl-4 mb-0">
            <li class="mb-2">
              Admin → Loyalty → tab
              <strong>Customers</strong>
              → klik pelanggan →
              <strong>Edit</strong>
            </li>
            <li class="mb-2">
              Di section
              <strong>Loyalty</strong>
              , ubah
              <strong>Program</strong>
              (
              <code>stamps</code>
              ↔
              <code>cashback</code>
              )
            </li>
            <li>
              Tekan
              <strong>Save</strong>
            </li>
          </ol>

          <v-alert type="info" variant="tonal" class="mt-4" density="compact">
            Transisi stamps → cashback juga terjadi
            <strong>otomatis</strong>
            saat pelanggan selesaikan siklus stamp card. Admin hanya lakukan ini manual untuk kasus
            khusus (VIP upgrade, koreksi).
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Admin FAQ -->
    <v-card variant="tonal" color="red-darken-2" class="mb-4">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-help-circle</v-icon>
        Admin FAQ
      </v-card-title>
      <v-card-text>
        <p class="font-weight-medium mb-1">
          Pelanggan klaim punya stamp dari kartu fisik beberapa bulan lalu — harus percaya?
        </p>
        <p class="mb-3">
          Gunakan judgement. Cek apakah pelanggan ada di sistem, bagaimana riwayat kunjungannya, dan
          minta nomor kartu fisik (jika ada). Jika cerita masuk akal, tambahkan stamp. Field
          <strong>Adjustment reason</strong>
          menangkap justifikasi untuk audit.
        </p>

        <p class="font-weight-medium mb-1">
          Dua record punya nomor telepon berbeda — yang mana benar?
        </p>
        <p class="mb-3">
          Pakai step
          <strong>Resolve conflicts</strong>
          di dialog merge untuk pilih nilai yang benar field-by-field. Nomor telepon yang lain bisa
          dibuang atau disimpan di field Notes.
        </p>

        <p class="font-weight-medium mb-1">
          Setelah merge, ke mana stamp dan pesanan record yang di-merge-away?
        </p>
        <p class="mb-3">
          Semua ditransfer ke record target. Record source tetap ada di database dengan status
          <code>merged</code>
          (supaya referensi historis tetap valid) tapi disembunyikan dari daftar pelanggan aktif.
        </p>

        <p class="font-weight-medium mb-1">Bisa undo merge?</p>
        <p class="mb-0">
          <strong>Tidak</strong>
          — merge bersifat destruktif (source ditandai
          <code>merged</code>
          dan identitas-nya dipasang ke target). Selalu periksa dua kali di screen Resolve conflicts
          sebelum menekan Merge.
        </p>
      </v-card-text>
    </v-card>

    <!-- Settings note -->
    <v-alert type="info" variant="tonal" class="mb-4">
      <strong>Settings (konfigurasi global)</strong>
      — stamps per cycle, stamp threshold (Rp per stamp), reward milestones, cashback tier
      thresholds, cashback %. Perubahan di sini berlaku untuk
      <strong>semua pelanggan</strong>
      ke depan, jadi pertimbangkan dulu sebelum ubah. Nilai saat ini lihat di panduan
      <strong>Ikhtisar Loyalty</strong>
      .
    </v-alert>
  </div>
</template>

<style scoped lang="scss">
.loyalty-admin-guide {
  max-width: 1200px;
}
</style>
