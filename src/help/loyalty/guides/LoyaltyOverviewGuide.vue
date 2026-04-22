<script setup lang="ts">
import physicalCardBlankImg from '@/help/assets/screenshots/loyalty/12_physical_card_blank.jpg'
import cardNewImg from '@/help/assets/screenshots/loyalty/01_card_new_form.jpg'
import inviteQrImg from '@/help/assets/screenshots/loyalty/11_invite_qr_buttons.jpg'
</script>

<template>
  <div class="loyalty-overview-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="blue" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-information</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Ikhtisar Loyalty</h1>
        <p class="text-body-2 text-medium-emphasis">
          Pengenalan program loyalitas dan alur kerja kasir
        </p>
      </div>
    </div>

    <!-- Section: Two Programs -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="blue" class="mr-2">mdi-compare</v-icon>
          Dua Program Loyalty
        </v-card-title>
        <v-card-text>
          <v-table density="comfortable">
            <thead>
              <tr>
                <th class="text-left">Program</th>
                <th class="text-left">Cara Kerja</th>
                <th class="text-left">Untuk Siapa</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <v-chip color="purple" variant="tonal" size="small">Stamps</v-chip>
                </td>
                <td>
                  Kartu fisik, kumpul stamp per pesanan. Reward di milestone (mis. 5/15 → free
                  coffee)
                </td>
                <td>Pelanggan baru (default)</td>
              </tr>
              <tr>
                <td>
                  <v-chip color="amber" variant="tonal" size="small">Cashback</v-chip>
                </td>
                <td>% dari pesanan masuk ke saldo loyalty. Tanpa kartu fisik</td>
                <td>Pelanggan reguler / VIP (ditentukan kasir)</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>
    </section>

    <!-- Section: Customer Lifecycle Timeline -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="blue" class="mr-2">mdi-map-marker-path</v-icon>
          Siklus Pelanggan Loyalty — Dari Stamps ke Cashback
        </v-card-title>
        <v-card-text>
          <p class="mb-4">
            Perjalanan pelanggan dari kunjungan pertama sampai menjadi VIP Cashback:
          </p>

          <v-timeline side="end" align="start" density="comfortable" truncate-line="both">
            <!-- Stage 1: Blank card -->
            <v-timeline-item dot-color="grey" icon="mdi-card-outline" size="small" fill-dot>
              <template #opposite>
                <v-chip color="grey" size="small" variant="tonal">Tahap 1</v-chip>
              </template>
              <div class="font-weight-bold mb-1">Kunjungan pertama — kartu kosong</div>
              <p class="text-body-2 mb-2">
                Setiap pelanggan baru mendapat kartu fisik kosong. Kasir hanya tandai stamp dengan
                stamper.
                <strong>Tidak ada input di POS.</strong>
                <em class="text-medium-emphasis">(Paling umum)</em>
              </p>
              <v-img :src="physicalCardBlankImg" max-width="320" class="rounded-lg elevation-1" />
            </v-timeline-item>

            <!-- Stage 2: Registration at POS (MANDATORY on return) -->
            <v-timeline-item dot-color="purple" icon="mdi-card-plus" size="small" fill-dot>
              <template #opposite>
                <v-chip color="purple" size="small" variant="tonal">Tahap 2</v-chip>
              </template>
              <div class="font-weight-bold mb-1">
                Pelanggan kembali dengan kartu → WAJIB registrasi
              </div>
              <p class="text-body-2 mb-2">
                Saat pelanggan kembali dan menunjukkan kartu,
                <strong>kasir wajib registrasikan kartu di sistem</strong>
                (bukan menunggu pelanggan minta). Buka Loyalty → CARD → NEW. Sistem otomatis
                generate nomor kartu; kasir menulis di kartu fisik.
              </p>

              <p class="text-body-2 mb-1 font-weight-medium">Dua varian registrasi:</p>
              <ul class="text-body-2 pl-4 mb-2">
                <li class="mb-1">
                  <strong>Kartu saja</strong>
                  (Owner name kosong) — kartu anonim, tanpa profil pelanggan
                </li>
                <li>
                  <strong>Kartu + pelanggan</strong>
                  (Owner name diisi) —
                  <strong class="text-success">disarankan!</strong>
                  Jika pelanggan memberi nama, buat sekaligus profil pelanggan + kartu. Program
                  default =
                  <strong>Stamps</strong>
                  .
                </li>
              </ul>

              <p class="text-body-2 mb-2">
                Setelah registrasi, berikan juga
                <strong>link / QR ke personal cabinet</strong>
                (lihat Tahap 3) — supaya pelanggan punya akses online ke stamp mereka.
              </p>
              <v-img :src="cardNewImg" max-width="320" class="rounded-lg elevation-1" />
            </v-timeline-item>

            <!-- Stage 3: Online registration -->
            <v-timeline-item dot-color="teal" icon="mdi-qrcode" size="small" fill-dot>
              <template #opposite>
                <v-chip color="teal" size="small" variant="tonal">Tahap 3</v-chip>
              </template>
              <div class="font-weight-bold mb-1">Cetak Invite QR — akses personal cabinet</div>
              <p class="text-body-2 mb-2">
                Setelah pelanggan terpasang ke pesanan, panel pelanggan menampilkan tombol
                <strong>PRINT INVITE QR</strong>
                (cetak struk) atau
                <strong>SHOW QR</strong>
                (tampilkan di layar). Pelanggan scan → daftar (Google / Telegram / Email). Akun
                online
                <strong>otomatis terhubung</strong>
                ke record POS — tidak buat duplikat. Pelanggan dapat kabinet personal dengan QR
                mereka sendiri.
              </p>
              <v-img :src="inviteQrImg" max-width="380" class="rounded-lg elevation-1" />
            </v-timeline-item>

            <!-- Stage 4: Collecting stamps -->
            <v-timeline-item dot-color="amber" icon="mdi-gift" size="small" fill-dot>
              <template #opposite>
                <v-chip color="amber" size="small" variant="tonal">Tahap 4</v-chip>
              </template>
              <div class="font-weight-bold mb-1">Kumpul stamp → Reward milestone</div>
              <p class="text-body-2 mb-0">
                <strong>1 stamp per Rp 80.000</strong>
                di bill. Kartu punya
                <strong>15 slot</strong>
                dengan reward di 5, 10, dan 15 (lihat tabel reward di bawah). Stamp bertambah
                otomatis saat pesanan selesai — tidak perlu aksi kasir.
              </p>
            </v-timeline-item>

            <!-- Stage 5: Auto-transition to Cashback -->
            <v-timeline-item dot-color="deep-purple" icon="mdi-autorenew" size="small" fill-dot>
              <template #opposite>
                <v-chip color="deep-purple" size="small" variant="tonal">Tahap 5</v-chip>
              </template>
              <div class="font-weight-bold mb-1">
                Siklus selesai → Sistem otomatis pindah ke Cashback
              </div>
              <p class="text-body-2 mb-2">
                Setelah stamp ke-15 dikumpulkan dan reward terakhir dipakai,
                <strong>sistem secara otomatis memindahkan pelanggan</strong>
                ke program
                <strong>Cashback</strong>
                . Tidak perlu aksi kasir. Kartu fisik ditutup.
              </p>
              <v-alert type="warning" variant="tonal" density="compact" class="mb-0">
                <strong>Hanya satu kartu stamp per pelanggan — seumur hidup.</strong>
                Setelah siklus selesai, pelanggan
                <strong>tidak bisa mendapat kartu stamp baru</strong>
                . Perjalanan loyalty mereka lanjut di Cashback. Jika pelanggan minta kartu baru —
                jelaskan bahwa sekarang mereka sudah di level yang lebih tinggi (Cashback).
              </v-alert>
            </v-timeline-item>

            <!-- Stage 6: Cashback tiers -->
            <v-timeline-item dot-color="green" icon="mdi-star-circle" size="small" fill-dot>
              <template #opposite>
                <v-chip color="green" size="small" variant="tonal">Tahap 6</v-chip>
              </template>
              <div class="font-weight-bold mb-1">Cashback dengan tier (30 hari terakhir)</div>
              <p class="text-body-2 mb-0">
                Semakin sering belanja → semakin tinggi tier → % cashback lebih besar. Tier dihitung
                otomatis berdasarkan total belanja 30 hari terakhir. Bisa naik atau turun. Lihat
                detail tier di bawah.
              </p>
            </v-timeline-item>
          </v-timeline>
        </v-card-text>
      </v-card>
    </section>

    <!-- Section: Stamp Rewards Table -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="amber" class="mr-2">mdi-gift</v-icon>
          Stamp Rewards — 15 Stamp Siklus
        </v-card-title>
        <v-card-text>
          <p class="mb-4">
            <strong>1 stamp per Rp 80.000</strong>
            di bill. 3 milestone reward per siklus:
          </p>

          <v-row>
            <v-col cols="12" md="4">
              <v-card variant="tonal" color="blue">
                <v-card-text class="text-center">
                  <div class="text-h3 font-weight-bold mb-1">5</div>
                  <v-chip color="blue" size="small" class="mb-2">stamps</v-chip>
                  <div class="text-subtitle-1 font-weight-medium">Free Drinks</div>
                  <div class="text-caption text-medium-emphasis">
                    Diskon hingga
                    <strong>Rp 40.000</strong>
                    untuk minuman apapun
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="tonal" color="orange">
                <v-card-text class="text-center">
                  <div class="text-h3 font-weight-bold mb-1">10</div>
                  <v-chip color="orange" size="small" class="mb-2">stamps</v-chip>
                  <div class="text-subtitle-1 font-weight-medium">Free Breakfast</div>
                  <div class="text-caption text-medium-emphasis">
                    Diskon hingga
                    <strong>Rp 75.000</strong>
                    untuk breakfast
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="tonal" color="deep-purple">
                <v-card-text class="text-center">
                  <div class="text-h3 font-weight-bold mb-1">15</div>
                  <v-chip color="deep-purple" size="small" class="mb-2">stamps</v-chip>
                  <div class="text-subtitle-1 font-weight-medium">Any Dish</div>
                  <div class="text-caption text-medium-emphasis">
                    Diskon hingga
                    <strong>Rp 100.000</strong>
                    untuk apapun
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-alert type="info" variant="tonal" class="mt-4" density="compact">
            Reward menempel di kartu sampai digunakan. Saat kartu sudah capai milestone, menu
            Discount di Payment Checkout menampilkan baris
            <strong>🎁 Stamp Card Reward</strong>
            — kasir wajib apply di checkout.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Section: Cashback Tiers -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="green" class="mr-2">mdi-star-circle</v-icon>
          Cashback Tier — Berdasarkan 30 Hari Terakhir
        </v-card-title>
        <v-card-text>
          <p class="mb-4">
            Persentase cashback tergantung
            <strong>total belanja pelanggan dalam 30 hari terakhir</strong>
            (rolling window). Sistem otomatis menaikkan / menurunkan tier — tidak perlu intervensi
            kasir.
          </p>

          <v-row>
            <v-col cols="12" md="4">
              <v-card variant="tonal" color="blue-grey">
                <v-card-text class="text-center">
                  <div class="text-h2 font-weight-bold mb-1">5%</div>
                  <v-chip color="blue-grey" class="mb-3">MEMBER</v-chip>
                  <v-divider class="mb-3" />
                  <div class="text-caption">Belanja 30 hari:</div>
                  <div class="text-body-2 font-weight-medium">&lt; Rp 1.500.000</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="tonal" color="amber">
                <v-card-text class="text-center">
                  <div class="text-h2 font-weight-bold mb-1">7%</div>
                  <v-chip color="amber" class="mb-3">REGULAR</v-chip>
                  <v-divider class="mb-3" />
                  <div class="text-caption">Belanja 30 hari:</div>
                  <div class="text-body-2 font-weight-medium">Rp 1.500.000 – 3.000.000</div>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="4">
              <v-card variant="tonal" color="deep-purple">
                <v-card-text class="text-center">
                  <div class="text-h2 font-weight-bold mb-1">10%</div>
                  <v-chip color="deep-purple" class="mb-3">FAMILY</v-chip>
                  <v-divider class="mb-3" />
                  <div class="text-caption">Belanja 30 hari:</div>
                  <div class="text-body-2 font-weight-medium">≥ Rp 3.000.000</div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <v-alert type="info" variant="tonal" class="mt-4" density="compact">
            <strong>Contoh:</strong>
            Pelanggan belanja Rp 2.000.000 dalam 30 hari terakhir → tier
            <strong>REGULAR (7%)</strong>
            . Pesanan berikutnya Rp 200.000 → dapat cashback
            <strong>Rp 14.000</strong>
            ke saldo loyalty. Saldo bisa dipakai untuk memotong bill berikutnya.
          </v-alert>

          <v-alert type="warning" variant="tonal" class="mt-3" density="compact">
            <strong>Tier bisa turun</strong>
            jika pelanggan kurang aktif (belanja 30 hari berikutnya di bawah threshold). Sistem juga
            punya proteksi "max degradation" — tidak bisa turun terlalu drastis dalam satu kali
            recalculate.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Section: Two Interfaces -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="blue" class="mr-2">mdi-toggle-switch</v-icon>
          Dua Antarmuka: CARD → NEW vs CUSTOMER → NEW
        </v-card-title>
        <v-card-text>
          <p class="mb-4">
            Untuk "daftarkan pelanggan + kartu" ada dua cara. Pilih berdasarkan situasi:
          </p>

          <v-table density="comfortable">
            <thead>
              <tr>
                <th class="text-left">Antarmuka</th>
                <th class="text-left">Kapan Digunakan</th>
                <th class="text-left">Apa yang Dibuat</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>CARD → NEW</strong>
                  <div class="text-caption text-medium-emphasis">(default)</div>
                </td>
                <td>
                  Pelanggan punya
                  <strong>kartu fisik tanpa data di sistem</strong>
                  — kasus biasa
                </td>
                <td>
                  Kartu baru + pelanggan baru (jika Owner name diisi) — keduanya langsung terpasang
                  ke pesanan
                </td>
              </tr>
              <tr>
                <td>
                  <strong>CUSTOMER → NEW + pick card</strong>
                  <div class="text-caption text-medium-emphasis">(jarang)</div>
                </td>
                <td>
                  Kartu
                  <strong>sudah ada di sistem tanpa pelanggan terhubung</strong>
                </td>
                <td>Pelanggan baru terhubung ke kartu yang sudah ada — tidak membuat kartu baru</td>
              </tr>
            </tbody>
          </v-table>

          <v-alert type="warning" variant="tonal" class="mt-4">
            <strong>Jangan gunakan kedua alur untuk registrasi yang sama.</strong>
            Jika buat pelanggan via CUSTOMER → NEW, jangan lagi buat kartu via CARD → NEW — Anda
            akan punya dua kartu untuk satu pelanggan.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Navigation -->
    <v-alert type="info" variant="tonal" class="mb-4">
      <strong>Selanjutnya:</strong>
      Lihat panduan
      <strong>Kartu Baru & Registrasi Pelanggan</strong>
      untuk detail langkah-langkah membuat kartu.
    </v-alert>
  </div>
</template>

<style scoped lang="scss">
.loyalty-overview-guide {
  max-width: 1200px;
}
</style>
