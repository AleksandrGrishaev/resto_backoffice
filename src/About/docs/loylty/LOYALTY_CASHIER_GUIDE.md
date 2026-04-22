# Loyalty Program — Cashier Guide / Panduan Kasir

## Programs Overview / Gambaran Program

| Program      | How it works                                                    | Who gets it                            |
| ------------ | --------------------------------------------------------------- | -------------------------------------- |
| **Stamps**   | Physical card, collect stamps per order. Rewards at milestones. | New customers (default)                |
| **Cashback** | % of order credited as loyalty balance. No card needed.         | Regular/VIP customers (set by cashier) |

---

## How We Work / Cara Kerja

The typical stamp-card customer lifecycle:

1. **First visit** — hand out a blank physical card with stamps marked. No system entry. _(Scenario 1, most common)_
2. **Customer wants to register** (now or on a return visit) — create customer + card in the system. The system generates the card number; cashier writes it on the physical card. _(Scenarios 2-3)_
3. **Customer registers online** via invite QR — they get a personal cabinet. _(Scenario 4, customer-driven)_
4. **On future visits** — find the customer either by their phone QR (preferred), name, phone, or card number. _(Scenarios 5-6)_

Siklus pelanggan kartu stamp pada umumnya:

1. **Kunjungan pertama** — berikan kartu fisik kosong dengan stamp ditandai. Tidak perlu input ke sistem. _(Skenario 1, paling umum)_
2. **Pelanggan ingin registrasi** (sekarang atau saat kunjungan berikutnya) — buat pelanggan + kartu di sistem. Sistem menghasilkan nomor kartu; kasir menulis di kartu fisik. _(Skenario 2-3)_
3. **Pelanggan registrasi online** lewat QR invite — mereka dapat kabinet personal. _(Skenario 4, dilakukan pelanggan)_
4. **Kunjungan berikutnya** — cari pelanggan via QR HP mereka (disarankan), nama, telepon, atau nomor kartu. _(Skenario 5-6)_

---

## Scenario 1: Hand Out Blank Stamp Card — First Visit (Most Common)

**When:** A new customer ordered. We give every new customer a physical stamp card right away. No registration needed.

### English

1. Take a **blank stamp card** from the stack
2. Mark the stamps for the current order on the card with the stamper
3. Hand the card to the customer: _"Bring this back next time and earn rewards!"_
4. **Do nothing in the POS.** No customer profile, no card number entered in the system.
5. The card stays anonymous until the customer asks to register (Scenario 2 or 3) or registers online themselves (Scenario 4)

### Bahasa Indonesia

1. Ambil **kartu stamp kosong** dari tumpukan
2. Tandai stamp untuk pesanan ini di kartu dengan stamper
3. Berikan kartu ke pelanggan: _"Bawa kembali lain kali dan dapatkan reward!"_
4. **Tidak perlu apa-apa di POS.** Tidak buat profil pelanggan, tidak masukkan nomor kartu di sistem.
5. Kartu tetap anonim sampai pelanggan minta registrasi (Skenario 2 atau 3) atau registrasi sendiri online (Skenario 4)

---

## Scenario 2: Customer Wants to Register at Checkout (with Stamps)

**When:** Customer just paid (or is paying) and asks to register / open a card. We create customer + card with the stamps for this order.

### English

1. Open **Loyalty** dialog (loyalty icon in order section)
2. Go to the **CARD** tab → tap **NEW**
3. The form opens with the **card number auto-filled** (read-only — system picks the next free number)
4. Fill in:
   - **Owner name** (required to create the customer profile — ask the customer)
   - **Phone number** (recommended)
   - **Initial stamps** — number of stamps to mark for this order
5. Tap **CREATE CARD**
   - System creates customer (program = **stamps**) + new card with the stamps
   - Card is auto-attached to the current order
6. **Write the card number on the physical card** and hand it to the customer
7. Switch to the **CUSTOMER** tab → search the customer by name → tap the result to attach
8. Tap the **QR icon** (or **Print Invite QR**) → invite receipt prints
9. Hand the receipt to the customer: _"Scan to access your stamps online"_

### Bahasa Indonesia

1. Buka dialog **Loyalty** (ikon loyalty di bagian pesanan)
2. Pilih tab **CARD** → tekan **NEW**
3. Form terbuka dengan **nomor kartu otomatis terisi** (read-only — sistem pilih nomor bebas berikutnya)
4. Isi:
   - **Nama pemilik** (wajib agar profil pelanggan dibuat — tanyakan ke pelanggan)
   - **Nomor telepon** (disarankan)
   - **Initial stamps** — jumlah stamp untuk pesanan ini
5. Tekan **CREATE CARD**
   - Sistem membuat pelanggan (program = **stamps**) + kartu baru dengan stamp
   - Kartu otomatis terpasang ke pesanan saat ini
6. **Tulis nomor kartu di kartu fisik** lalu berikan ke pelanggan
7. Pindah ke tab **CUSTOMER** → cari pelanggan berdasarkan nama → tekan hasilnya untuk pasang
8. Tekan **ikon QR** (atau **Print Invite QR**) → struk invite tercetak
9. Berikan struk ke pelanggan: _"Scan untuk akses stamp Anda online"_

---

## Scenario 3: Returning Customer with Unregistered Card

**When:** Customer comes back with the blank card from Scenario 1 (already has stamps marked) and now wants to register.

### English

Same flow as Scenario 2, with one detail:

- In step 4, set **Initial stamps** = **stamps already marked on the physical card**
  (When the order completes, this order's stamps will be added on top automatically)
- After CREATE, **write the new system-generated number on the physical card**
- Print invite QR as in Scenario 2 step 8

**Variant — card already has a printed number (rare):**
Use **CUSTOMER** tab → **NEW** instead. Fill name + phone, keep program as **Stamps**, enter the printed **Stamp card number**, tap **CREATE**. Existing card is linked to the new customer.

### Bahasa Indonesia

Alur sama dengan Skenario 2, dengan satu detail:

- Di langkah 4, set **Initial stamps** = **stamp yang sudah ditandai di kartu fisik**
  (Saat pesanan selesai, stamp untuk pesanan ini akan ditambahkan otomatis di atasnya)
- Setelah CREATE, **tulis nomor baru dari sistem di kartu fisik**
- Cetak QR invite seperti Skenario 2 langkah 8

**Varian — kartu sudah ada nomor cetak (jarang):**
Gunakan tab **CUSTOMER** → **NEW**. Isi nama + telepon, biarkan program **Stamps**, masukkan **Stamp card number** yang tercetak, tekan **CREATE**. Kartu yang sudah ada akan terhubung ke pelanggan baru.

---

## Scenario 4: Customer Self-Registered Online — Find Them at POS

**When:** Customer registered online (via invite QR or pre-bill QR) and is now visiting POS for the first time. We need to attach them to the order.

### English

**Method 1 — Scan customer's QR (preferred):**

1. Ask the customer: _"Open your loyalty cabinet and show me your QR code"_
2. Open **Loyalty** dialog → **SCAN** tab
3. Point the camera at the customer's phone QR
4. Customer info appears → tap **Attach**
5. Stamps / cashback accrue automatically when the order completes

**Method 2 — Search by name, phone, or telegram:**

1. Open **Loyalty** dialog → **CUSTOMER** tab
2. Type the customer's name, phone, or telegram (min 2 characters)
3. Tap the result to attach to the order

**Method 3 — Search by card number** (if customer has a physical card):

1. Open **Loyalty** dialog → **CARD** tab
2. Type the card number → **FIND** (or pick from suggestions as you type)

### Bahasa Indonesia

**Metode 1 — Scan QR pelanggan (disarankan):**

1. Minta pelanggan: _"Buka cabinet loyalty Anda dan tunjukkan QR code"_
2. Buka dialog **Loyalty** → tab **SCAN**
3. Arahkan kamera ke QR di HP pelanggan
4. Info pelanggan muncul → tekan **Attach**
5. Stamps / cashback otomatis bertambah saat pesanan selesai

**Metode 2 — Cari berdasarkan nama, telepon, atau telegram:**

1. Buka dialog **Loyalty** → tab **CUSTOMER**
2. Ketik nama, telepon, atau telegram pelanggan (min 2 karakter)
3. Tekan hasil untuk pasang ke pesanan

**Metode 3 — Cari berdasarkan nomor kartu** (jika pelanggan punya kartu fisik):

1. Buka dialog **Loyalty** → tab **CARD**
2. Ketik nomor kartu → **FIND** (atau pilih dari saran saat mengetik)

---

## Scenario 5: Returning Customer with Registered Card

**When:** Customer brings a card that's already registered in the system (number written on it).

### English

1. Open **Loyalty** dialog → **CARD** tab
2. Type the card number → tap **FIND**
3. Card info appears (stamps count, cycle, customer name if linked)
4. Card is attached → complete the order; stamps add automatically

### Bahasa Indonesia

1. Buka dialog **Loyalty** → tab **CARD**
2. Ketik nomor kartu → tekan **FIND**
3. Info kartu muncul (jumlah stamp, siklus, nama pelanggan jika ada)
4. Kartu terpasang → selesaikan pesanan; stamp otomatis bertambah

---

## Scenario 6: New Customer Self-Registers via Pre-Bill QR

**When:** Alternative to Scenario 1 — instead of (or in addition to) a physical card, the customer self-registers from the pre-bill QR.

### English

1. Create the order as usual
2. Tap **Print Pre-bill** — QR code prints at the bottom
3. Hand the pre-bill to the customer: _"Scan the QR to join our rewards program!"_
4. Customer scans → registers (Google / Telegram / Email)
5. POS shows notification: **"{Name} linked to Order #{number}"**
6. Customer is now in the **Stamps** program automatically

### Bahasa Indonesia

1. Buat pesanan seperti biasa
2. Tekan **Print Pre-bill** — QR code tercetak di bagian bawah
3. Berikan pre-bill ke pelanggan: _"Scan QR untuk gabung program rewards kami!"_
4. Pelanggan scan → daftar (Google / Telegram / Email)
5. POS menampilkan notifikasi: **"{Nama} terhubung ke Order #{nomor}"**
6. Pelanggan otomatis masuk program **Stamps**

---

## Scenario 7: Regular/VIP Customer → Cashback (Less Common)

**When:** Registering a known regular customer who should get cashback rewards (not stamps). Used for VIP / high-frequency guests at staff discretion.

### English

1. Open **Loyalty** dialog → **CUSTOMER** tab → tap **NEW**
2. Fill in:
   - **Customer name** (required)
   - **Phone number** (recommended)
   - **Telegram** (optional)
3. Switch loyalty program from **Stamps** to **Cashback**
4. Tap **CREATE**
5. Customer is created and attached to the order
6. Print invite QR (icon next to customer name) → customer scans → registers → accesses cashback online

### Bahasa Indonesia

1. Buka dialog **Loyalty** → tab **CUSTOMER** → tekan **NEW**
2. Isi:
   - **Nama pelanggan** (wajib)
   - **Nomor telepon** (disarankan)
   - **Telegram** (opsional)
3. Ubah program loyalitas dari **Stamps** ke **Cashback**
4. Tekan **CREATE**
5. Pelanggan dibuat dan terpasang ke pesanan
6. Cetak QR invite (ikon di sebelah nama pelanggan) → pelanggan scan → daftar → akses cashback online

---

## Quick Reference / Referensi Cepat

| Action                               | Where                                          | Steps   |
| ------------------------------------ | ---------------------------------------------- | ------- |
| Hand out blank card (no system)      | Physical card from stack — no POS action       | 0 steps |
| Register customer + card with stamps | CARD → NEW → name + initial stamps → CREATE    | 3 steps |
| Find registered card                 | CARD → type number → FIND                      | 1 step  |
| Find customer by their QR            | SCAN tab → point camera at customer's phone    | 1 step  |
| Find customer by name / phone        | CUSTOMER → search field → tap result           | 1 step  |
| Register VIP / cashback customer     | CUSTOMER → NEW → fill form → Cashback → CREATE | 3 steps |
| Print invite QR                      | Customer attached → tap QR icon (next to name) | 1 step  |
| Self-register via pre-bill QR        | Print Pre-bill → customer scans                | 0 steps |

## FAQ

**Q: Customer lost their stamp card, what to do?**
A: Search by name in CUSTOMER tab. If found, attach to order. If they're registered, stamps will accrue on any linked card.

**Q: Can a customer have both stamps and cashback?**
A: No. Each customer is on one program. When a stamp card cycle completes, the customer automatically transitions to cashback.

**Q: Customer scanned the QR but POS didn't update?**
A: Wait a few seconds for the realtime update. If it still doesn't show, use the fallback: **SCAN** tab → scan the customer's QR from their phone.

**Q: How do I switch a customer from stamps to cashback?**
A: Only admin can change an existing customer's program. Ask the manager.

**Q: I created a card via CARD → NEW with a name but I don't see the customer attached to the order — why?**
A: The CARD-NEW flow attaches the **card** to the order, not the customer. Switch to the CUSTOMER tab, search the just-created name, and tap the result to attach the customer too. Both can be attached simultaneously.

**Q: Customer self-registered online but doesn't appear in CUSTOMER search at POS — why?**
A: The customers list refreshes periodically. Use the **SCAN** tab and ask the customer to show the QR code from their personal cabinet — that always finds them via the live token.

**Q: Should I always enter stamps in CARD → NEW, or leave it at 0?**
A: Set it to the **stamps the customer already has** on their physical card (or 0 for a brand-new card). The current order's stamps will be added automatically when the order is completed.
