<script setup lang="ts">
import cardNewImg from '@/help/assets/screenshots/loyalty/01_card_new_form.jpg'
import cardNewOwnerImg from '@/help/assets/screenshots/loyalty/02_card_new_with_owner.jpg'
import customerLinkCardImg from '@/help/assets/screenshots/loyalty/07_customer_new_link_card.jpg'
import customerCardDropdownImg from '@/help/assets/screenshots/loyalty/08_customer_new_card_dropdown.jpg'
import inviteQrImg from '@/help/assets/screenshots/loyalty/11_invite_qr_buttons.jpg'
import physicalCardBlankImg from '@/help/assets/screenshots/loyalty/12_physical_card_blank.jpg'
import physicalCardWriteNumberImg from '@/help/assets/screenshots/loyalty/13_physical_card_write_number.jpg'
import cardSystemNumberImg from '@/help/assets/screenshots/loyalty/14_card_system_generated_number.jpg'
</script>

<template>
  <div class="loyalty-new-card-guide">
    <!-- Header -->
    <div class="d-flex align-center mb-6">
      <v-avatar color="purple" size="56" class="mr-4">
        <v-icon size="28" color="white">mdi-card-plus</v-icon>
      </v-avatar>
      <div>
        <h1 class="text-h4 font-weight-bold">Kartu Baru & Registrasi Pelanggan</h1>
        <p class="text-body-2 text-medium-emphasis">
          Memberikan kartu kosong, dan membuat kartu + pelanggan di sistem
        </p>
      </div>
    </div>

    <!-- Scenario 1: Blank card -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-chip color="grey" variant="tonal" size="small" class="mr-2">Skenario 1</v-chip>
          Berikan Kartu Kosong (Paling Umum)
        </v-card-title>
        <v-card-text>
          <v-alert type="success" variant="tonal" class="mb-4">
            <strong>Aturan utama:</strong>
            Setiap pelanggan baru mendapat kartu fisik kosong
            <strong>TANPA registrasi</strong>
            . Registrasi dilakukan nanti saat pelanggan kembali (Skenario 2 / 3).
          </v-alert>

          <p class="mb-3">Ini kartu fisik yang kita berikan:</p>

          <v-img
            :src="physicalCardBlankImg"
            max-width="600"
            class="rounded-lg elevation-2 mb-4"
            alt="Kartu loyalty fisik kosong — 15 stamp + reward DRINKS / BREAKFAST / DINNER"
          />
          <p class="text-caption text-medium-emphasis mb-4">
            Kartu kosong — 15 stamp, 3 reward milestone (5 / 10 / 15), 1 stamp per 80K di bill
          </p>

          <p class="mb-2 font-weight-medium">Langkah kasir:</p>
          <ol class="pl-4 mb-4">
            <li class="mb-2">
              Ambil
              <strong>kartu stamp kosong</strong>
              dari tumpukan
            </li>
            <li class="mb-2">Tandai stamp untuk pesanan ini di kartu dengan stamper</li>
            <li class="mb-2">
              Berikan kartu ke pelanggan:
              <em>"Bawa kembali lain kali dan dapatkan reward!"</em>
            </li>
            <li class="mb-2">
              <strong>Tidak perlu apa-apa di POS.</strong>
              Tidak buat profil pelanggan, tidak masukkan nomor kartu di sistem
            </li>
            <li>Kartu tetap anonim sampai pelanggan minta registrasi atau scan QR online</li>
          </ol>

          <v-alert type="info" variant="tonal" density="compact">
            <strong>Kenapa tidak langsung registrasi?</strong>
            — Lebih cepat untuk kasir, dan banyak pelanggan tidak akan kembali. Registrasi hanya
            untuk yang sudah menunjukkan minat (kembali atau minta sendiri).
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Scenario 2: Register at checkout -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-chip color="purple" variant="tonal" size="small" class="mr-2">Skenario 2</v-chip>
          Registrasi Pelanggan + Kartu Baru (di Checkout)
        </v-card-title>
        <v-card-text>
          <v-alert type="info" variant="tonal" class="mb-4" density="compact">
            <strong>Kapan:</strong>
            Pelanggan minta registrasi saat bayar. Kita buat pelanggan + kartu baru.
          </v-alert>

          <ol class="pl-4 mb-4">
            <li class="mb-2">
              Buka dialog
              <strong>Loyalty</strong>
              (menu tiga titik di Bill → Attach Card)
            </li>
            <li class="mb-2">
              Pilih tab
              <strong>CARD</strong>
              → tekan
              <strong>NEW</strong>
            </li>
            <li class="mb-2">
              Form terbuka dengan
              <strong>nomor kartu otomatis terisi oleh sistem</strong>
              (read-only —
              <strong>kasir TIDAK memilih nomor</strong>
              , sistem yang generate nomor bebas berikutnya)
            </li>
          </ol>

          <v-alert type="warning" variant="tonal" class="mb-4" icon="mdi-robot">
            <strong>Nomor dihasilkan oleh SISTEM, bukan kasir.</strong>
            Field "Card number" read-only — sistem otomatis pilih nomor bebas berikutnya (001, 002,
            …, 014, 015, …). Kasir tidak boleh / tidak bisa ubah nomor ini.
          </v-alert>

          <v-img
            :src="cardNewImg"
            max-width="500"
            class="mb-4 rounded-lg elevation-2"
            alt="CARD → NEW form dengan nomor kartu 014 (auto-generated)"
          />
          <p class="text-caption text-medium-emphasis mb-4">
            Field
            <code>Card number</code>
            = sistem otomatis pilih
            <strong>014</strong>
            (read-only). Di bawahnya tertulis:
            <em>"Auto-generated. Write this number on the physical card."</em>
          </p>

          <p class="mb-2"><strong>Isi form:</strong></p>
          <ul class="pl-4 mb-4">
            <li class="mb-2">
              <strong>Owner name</strong>
              (wajib — jika diisi, profil pelanggan dibuat di program
              <strong>Stamps</strong>
              dan terhubung ke kartu; jika kosong, hanya kartu anonim yang dibuat)
            </li>
            <li class="mb-2">
              <strong>Nomor telepon</strong>
              (disarankan)
            </li>
            <li class="mb-2">
              <strong>Initial stamps</strong>
              — biarkan
              <strong>0</strong>
              untuk kartu baru. Stamp pesanan ini akan ditambahkan otomatis saat pesanan selesai
            </li>
          </ul>

          <v-img
            :src="cardNewOwnerImg"
            max-width="500"
            class="mb-4 rounded-lg elevation-2"
            alt="CARD → NEW dengan Owner name diisi"
          />

          <ol start="4" class="pl-4 mb-4">
            <li class="mb-2">
              Tekan
              <strong>CREATE CARD</strong>
              — sistem buat pelanggan + kartu, keduanya langsung terpasang ke pesanan
            </li>
            <li class="mb-2">
              <strong>Tulis nomor kartu di kartu fisik</strong>
              (di area kosong bawah kartu — lihat panah di gambar) lalu berikan ke pelanggan
            </li>
          </ol>

          <v-img
            :src="physicalCardWriteNumberImg"
            max-width="600"
            class="rounded-lg elevation-2 mb-2"
            alt="Kartu fisik dengan panah menunjuk ke tempat menulis nomor"
          />
          <p class="text-caption text-medium-emphasis mb-4">
            Tulis nomor kartu (mis.
            <code>014</code>
            ) di area bawah kartu, di sisi kiri
          </p>

          <ol start="6" class="pl-4 mb-4">
            <li>
              Cetak / tampilkan
              <strong>Invite QR</strong>
              — lihat bagian "Undang Pelanggan Registrasi Online" di bawah
            </li>
          </ol>

          <v-divider class="my-4" />

          <h3 class="text-subtitle-1 font-weight-bold mb-2">
            <v-icon class="mr-1">mdi-identifier</v-icon>
            Nomor yang dihasilkan sistem = identitas permanen kartu
          </h3>
          <p class="mb-3">
            Nomor dari sistem (mis.
            <code>014</code>
            ,
            <code>035</code>
            ) menjadi
            <strong>identitas tetap kartu</strong>
            di database. Di kunjungan berikutnya, kasir pakai nomor ini untuk menemukan kartu via
            <strong>CARD → FIND</strong>
            :
          </p>
          <v-img
            :src="cardSystemNumberImg"
            max-width="600"
            class="rounded-lg elevation-2 mb-2"
            alt="Kartu #035 ditemukan via FIND — nomor dari sistem tetap"
          />
          <p class="text-caption text-medium-emphasis mb-0">
            Card
            <strong>#035</strong>
            ditemukan via FIND — nomor yang sistem buat saat registrasi tetap sama (3/15 stamps,
            aktivitas terakhir 2 jam lalu)
          </p>
        </v-card-text>
      </v-card>
    </section>

    <!-- Scenario 3: Returning with unregistered card -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-chip color="deep-purple" variant="tonal" size="small" class="mr-2">Skenario 3</v-chip>
          Pelanggan Kembali dengan Kartu Belum Terdaftar
        </v-card-title>
        <v-card-text>
          <v-alert type="info" variant="tonal" class="mb-4" density="compact">
            <strong>Kapan:</strong>
            Pelanggan datang dengan kartu kosong dari Skenario 1 (sudah ada stamp) dan ingin
            registrasi.
          </v-alert>

          <p class="mb-3">Alur sama dengan Skenario 2, dengan satu detail:</p>

          <ul class="pl-4 mb-4">
            <li class="mb-2">
              Set
              <strong>Initial stamps</strong>
              =
              <strong>stamp yang sudah ditandai di kartu fisik</strong>
              <div class="text-caption text-medium-emphasis">
                (Saat pesanan selesai, stamp untuk pesanan ini akan ditambahkan otomatis di atasnya)
              </div>
            </li>
            <li class="mb-2">
              Setelah CREATE,
              <strong>tulis nomor baru dari sistem di kartu fisik</strong>
              (nomor lama tidak ada di sistem — tulis nomor yang baru)
            </li>
            <li>Cetak QR invite seperti Skenario 2 langkah 6</li>
          </ul>

          <v-divider class="my-4" />

          <p class="mb-3">
            <strong>Varian jarang — kartu sudah ada di sistem tanpa pelanggan:</strong>
          </p>

          <p class="mb-3">
            Gunakan tab
            <strong>CUSTOMER</strong>
            →
            <strong>NEW</strong>
            . Isi nama + telepon, biarkan program
            <strong>Stamps</strong>
            , lalu di
            <strong>Link existing unassigned card</strong>
            pilih kartu dari dropdown.
          </p>

          <v-row>
            <v-col cols="12" md="6">
              <v-img
                :src="customerLinkCardImg"
                class="rounded-lg elevation-2"
                alt="CUSTOMER → NEW dengan Link existing card"
              />
              <p class="text-caption text-center text-medium-emphasis mt-2">
                Form CUSTOMER → NEW (Stamps dipilih)
              </p>
            </v-col>
            <v-col cols="12" md="6">
              <v-img
                :src="customerCardDropdownImg"
                class="rounded-lg elevation-2"
                alt="Dropdown menampilkan kartu tanpa pemilik"
              />
              <p class="text-caption text-center text-medium-emphasis mt-2">
                Dropdown menampilkan hanya kartu tanpa pelanggan
              </p>
            </v-col>
          </v-row>

          <v-alert type="success" variant="tonal" class="mt-4" density="compact">
            Dropdown hanya menampilkan kartu sistem tanpa pelanggan — jadi tidak bisa salah ambil
            kartu orang lain. Jika dropdown kosong, semua kartu sudah punya pelanggan — pakai CARD →
            NEW.
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Invite POS customer to register online -->
    <section class="mb-8">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-chip color="orange" variant="tonal" size="small" class="mr-2">Penting</v-chip>
          Undang Pelanggan untuk Registrasi Online
        </v-card-title>
        <v-card-text>
          <v-alert type="info" variant="tonal" class="mb-4" density="compact">
            <strong>Kapan:</strong>
            Pelanggan baru saja dibuat di POS (via CARD → NEW atau CUSTOMER → NEW) dan
            <strong>belum punya akun online</strong>
            . Langkah ini menghubungkan akun online mereka ke record POS yang sudah ada — supaya
            tidak muncul
            <strong>duplikat</strong>
            kalau mereka registrasi sendiri nanti.
          </v-alert>

          <p class="mb-3">
            Setelah pelanggan terpasang ke pesanan, panel pelanggan menampilkan dua tombol:
          </p>

          <v-img
            :src="inviteQrImg"
            max-width="600"
            class="rounded-lg elevation-2 mb-4"
            alt="Panel pelanggan dengan tombol PRINT INVITE QR dan SHOW QR"
          />

          <v-table density="comfortable" class="mb-4">
            <thead>
              <tr>
                <th class="text-left">Tombol</th>
                <th class="text-left">Apa yang Terjadi</th>
                <th class="text-left">Kapan Pakai</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>PRINT INVITE QR</strong>
                </td>
                <td>Struk dengan QR tercetak di printer</td>
                <td>Pelanggan mau bawa pulang / scan nanti di rumah</td>
              </tr>
              <tr>
                <td>
                  <strong>SHOW QR</strong>
                </td>
                <td>QR tampil langsung di layar POS</td>
                <td>Pelanggan mau scan sekarang di tempat</td>
              </tr>
            </tbody>
          </v-table>

          <p class="mb-3 font-weight-medium">Skrip untuk pelanggan:</p>
          <v-alert type="success" variant="tonal" density="compact" class="mb-4">
            <em>
              "Scan QR ini untuk akses stamp / cashback Anda online. Akun online akan otomatis
              terhubung dengan kartu Anda — jadi stamp yang sudah ada tetap ada."
            </em>
          </v-alert>

          <h3 class="text-subtitle-1 font-weight-bold mb-2">Yang Terjadi Setelah Pelanggan Scan</h3>
          <ol class="pl-4 mb-4">
            <li class="mb-2">Pelanggan buka QR di HP → halaman registrasi web-winter terbuka</li>
            <li class="mb-2">Pelanggan daftar (Google / Telegram / Email)</li>
            <li class="mb-2">
              Akun online
              <strong>otomatis terhubung</strong>
              ke record POS yang ada (nama, kartu, stamp, saldo) — tidak buat pelanggan duplikat
            </li>
            <li>Pelanggan bisa cek stamp / cashback di kabinet personal</li>
          </ol>

          <v-alert type="warning" variant="tonal" density="compact">
            <strong>Jangan lewatkan langkah ini untuk pelanggan POS-only.</strong>
            Kalau pelanggan nanti registrasi sendiri tanpa scan invite QR, sistem akan buat
            <strong>pelanggan kedua</strong>
            dan menjadi duplikat yang harus di-merge admin (Skenario 8).
          </v-alert>
        </v-card-text>
      </v-card>
    </section>

    <!-- Tips -->
    <v-alert type="warning" variant="tonal" class="mb-4">
      <strong>Jangan pakai kedua alur untuk registrasi yang sama.</strong>
      Pilih CARD → NEW
      <em>atau</em>
      CUSTOMER → NEW + pick card — jangan keduanya.
    </v-alert>
  </div>
</template>

<style scoped lang="scss">
.loyalty-new-card-guide {
  max-width: 1200px;
}
</style>
