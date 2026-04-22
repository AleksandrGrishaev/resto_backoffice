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

### Two interfaces for "register customer + card" — when to use which / Dua antarmuka untuk "registrasi pelanggan + kartu"

| Interface                                        | Use when                                                                                                                                       | What it creates                                                                   |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **CARD → NEW** _(default)_                       | Customer has a **physical card with no system entry** (the usual case — Scenarios 2, 3)                                                        | A new card AND a new customer (if Owner name filled) — both attached to the order |
| **CUSTOMER → NEW + pick existing card** _(rare)_ | The card **already exists in our system as unassigned** (no customer linked) — e.g. it was issued earlier via CARD → NEW with empty Owner name | A new customer linked to the chosen unassigned card (no new card created)         |

The CUSTOMER → NEW form's "Link existing unassigned card" picker shows **only cards without a customer** — you can't accidentally re-assign someone else's card. If the picker is empty, every system card is already linked — use CARD → NEW instead.

**Never use both flows for the same registration** (don't create a customer via CUSTOMER → NEW and then issue another card for them via CARD → NEW — you'd end up with two cards on one customer).

Bahasa: Tabel di atas menjelaskan kapan pakai **CARD → NEW** (default — kartu fisik baru) vs **CUSTOMER → NEW** dengan picker kartu (jarang — hanya jika kartu sudah ada di sistem tanpa pelanggan terhubung).

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

## Scenario 2: Customer Wants to Register at Checkout (Fresh Card)

**When:** Customer just paid (or is paying) and asks to register / open a card. We create customer + a brand-new card.

### English

1. Open **Loyalty** dialog (loyalty icon in order section)
2. Go to the **CARD** tab → tap **NEW**
3. The form opens with the **card number auto-filled** (read-only — system picks the next free number)
4. Fill in:
   - **Owner name** (required — when filled, a customer profile is created on the **Stamps** program and linked to this card; if left empty, only an anonymous card is created)
   - **Phone number** (recommended)
   - **Initial stamps** — leave at **0** for a brand-new card. The current order's stamps are added automatically when the order is completed.
5. Tap **CREATE CARD**
   - System creates customer (program = **Stamps**) + new card
   - Both card and customer are **auto-attached to the current order** — no need to switch tabs
6. **Write the card number on the physical card** and hand it to the customer
7. With the customer attached, tap the **QR icon** next to the customer name → invite receipt prints
8. Hand the receipt to the customer: _"Scan to access your stamps online"_

### Bahasa Indonesia

1. Buka dialog **Loyalty** (ikon loyalty di bagian pesanan)
2. Pilih tab **CARD** → tekan **NEW**
3. Form terbuka dengan **nomor kartu otomatis terisi** (read-only — sistem pilih nomor bebas berikutnya)
4. Isi:
   - **Nama pemilik** (wajib — jika diisi, profil pelanggan dibuat di program **Stamps** dan terhubung ke kartu ini; jika dikosongkan, hanya kartu anonim yang dibuat)
   - **Nomor telepon** (disarankan)
   - **Initial stamps** — biarkan **0** untuk kartu baru. Stamp pesanan ini akan ditambahkan otomatis saat pesanan selesai.
5. Tekan **CREATE CARD**
   - Sistem membuat pelanggan (program = **Stamps**) + kartu baru
   - Kartu dan pelanggan **otomatis terpasang ke pesanan** — tidak perlu pindah tab
6. **Tulis nomor kartu di kartu fisik** lalu berikan ke pelanggan
7. Dengan pelanggan terpasang, tekan **ikon QR** di sebelah nama pelanggan → struk invite tercetak
8. Berikan struk ke pelanggan: _"Scan untuk akses stamp Anda online"_

---

## Scenario 3: Returning Customer with Unregistered Card

**When:** Customer comes back with the blank card from Scenario 1 (already has stamps marked) and now wants to register.

### English

Same flow as Scenario 2, with one detail:

- In step 4, set **Initial stamps** = **stamps already marked on the physical card**
  (When the order completes, this order's stamps will be added on top automatically)
- After CREATE, **write the new system-generated number on the physical card**
- Print invite QR as in Scenario 2 step 8

**Variant — card already exists in our system as unassigned (rare):**
Use **CUSTOMER** tab → **NEW** instead. Fill name + phone, keep program as **Stamps**, then in **Link existing unassigned card** pick the card from the dropdown (the dropdown only lists system cards with no customer linked). Tap **CREATE** — the existing card is linked to the new customer; **no new card is created**. See the "Two interfaces" table at the top of this guide for when this applies.

### Bahasa Indonesia

Alur sama dengan Skenario 2, dengan satu detail:

- Di langkah 4, set **Initial stamps** = **stamp yang sudah ditandai di kartu fisik**
  (Saat pesanan selesai, stamp untuk pesanan ini akan ditambahkan otomatis di atasnya)
- Setelah CREATE, **tulis nomor baru dari sistem di kartu fisik**
- Cetak QR invite seperti Skenario 2 langkah 8

**Varian — kartu sudah ada di sistem tanpa pelanggan terhubung (jarang):**
Gunakan tab **CUSTOMER** → **NEW**. Isi nama + telepon, biarkan program **Stamps**, lalu di **Link existing unassigned card** pilih kartu dari dropdown (dropdown hanya menampilkan kartu sistem tanpa pelanggan). Tekan **CREATE** — kartu yang sudah ada akan terhubung ke pelanggan baru; **kartu baru tidak dibuat**. Lihat tabel "Two interfaces" di bagian atas guide.

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

## Scenario 8: Discrepancy — Customer's Stamps Don't Match the System

**When:** Customer has a physical card with stamps but the system shows fewer stamps (or no card at all). Common causes:

- (a) Customer received a blank card (Scenario 1) and self-registered online — the online account has no card linked, the physical card isn't in the system
- (b) Customer was registered in POS earlier (Customer A with card #NNN) AND later self-registered online (Customer B, Telegram/Google) — there are now **two duplicate customer records** for the same person
- (c) Customer claims X stamps but the system shows Y (rare — physical card miscount, or stamps lost during a sync issue)

### What the cashier does

1. **Find the customer** at POS — try the SCAN tab first (always shows the freshest record), then CUSTOMER search by name/phone
2. **Attach whichever record gives the customer the better outcome for this order** (e.g. the one that does have stamps, or the registered one if they want online cabinet access)
3. **Note the discrepancy on the receipt or in the shift log:** physical card # / number of stamps owed / any duplicate names found
4. **Tell the admin** — give them the customer name, phone, card number(s), and what needs fixing
5. **Complete the current order normally** so the customer isn't kept waiting. Admin reconciles afterward.

> **Don't try to "fix" by creating duplicate records yourself.** Creating a second customer or a second card just makes the problem bigger. If in doubt, attach the existing customer and escalate to admin.

### Bahasa Indonesia

**Kapan:** Pelanggan punya kartu fisik dengan stamp, tapi sistem menunjukkan stamp lebih sedikit (atau tidak ada kartu sama sekali). Penyebab umum:

- (a) Pelanggan menerima kartu kosong (Skenario 1) dan registrasi sendiri online — akun online tidak punya kartu, kartu fisik tidak ada di sistem
- (b) Pelanggan sudah terdaftar di POS (Customer A dengan kartu #NNN) DAN kemudian registrasi sendiri online (Customer B, Telegram/Google) — sekarang ada **dua data pelanggan duplikat** untuk orang yang sama
- (c) Pelanggan klaim X stamp tapi sistem menunjukkan Y (jarang)

**Apa yang dilakukan kasir:**

1. **Cari pelanggan** di POS — coba tab SCAN dulu, lalu CUSTOMER search
2. **Pasang record mana saja yang lebih menguntungkan pelanggan** untuk pesanan ini
3. **Catat selisih di struk atau log shift:** nomor kartu fisik / jumlah stamp yang harus ditambahkan / nama duplikat
4. **Beritahu admin** — beri nama pelanggan, telepon, nomor kartu, dan apa yang harus diperbaiki
5. **Selesaikan pesanan saat ini** dengan normal. Admin yang merekonsiliasi setelahnya.

> **Jangan coba "perbaiki" sendiri dengan membuat record duplikat.** Membuat pelanggan kedua atau kartu kedua hanya memperbesar masalah.

➡ See the **Admin Section** below for what the admin does to resolve this (add stamps, merge duplicates).

---

## Quick Reference / Referensi Cepat

| Action                              | Where                                                    | Steps   |
| ----------------------------------- | -------------------------------------------------------- | ------- |
| Hand out blank card (no system)     | Physical card from stack — no POS action                 | 0 steps |
| Register customer + card            | CARD → NEW → name + 0 stamps → CREATE                    | 2 steps |
| Find registered card                | CARD → type number → FIND                                | 1 step  |
| Find customer by their QR           | SCAN tab → point camera at customer's phone              | 1 step  |
| Find customer by name / phone       | CUSTOMER → search field → tap result                     | 1 step  |
| Register VIP / cashback customer    | CUSTOMER → NEW → fill form → Cashback → CREATE           | 3 steps |
| Print invite QR                     | Customer attached → tap QR icon (next to name)           | 1 step  |
| Self-register via pre-bill QR       | Print Pre-bill → customer scans                          | 0 steps |
| Discrepancy / duplicate / lost card | Note details, attach existing record, **escalate admin** | —       |

## FAQ

**Q: Customer lost their stamp card, what to do?**
A: Search by name in CUSTOMER tab. If found, attach to order — stamps will accrue on their account regardless of physical card. If they want a replacement card, ask admin to issue and link a new card via Admin → Loyalty.

**Q: Can a customer have both stamps and cashback?**
A: No. Each customer is on one program. When a stamp card cycle completes, the customer automatically transitions to cashback.

**Q: Customer scanned the QR but POS didn't update?**
A: Wait a few seconds for the realtime update. If it still doesn't show, use the fallback: **SCAN** tab → scan the customer's QR from their phone.

**Q: How do I switch a customer from stamps to cashback?**
A: Only admin can change an existing customer's program. Ask the manager.

**Q: Customer self-registered online but doesn't appear in CUSTOMER search at POS — why?**
A: The customers list refreshes periodically. Use the **SCAN** tab and ask the customer to show the QR code from their personal cabinet — that always finds them via the live token.

**Q: Should I always enter stamps in CARD → NEW, or leave it at 0?**
A: Set it to the **stamps already on the physical card** (or **0** for a brand-new card). The current order's stamps are added automatically when the order is completed.

**Q: When should I use CUSTOMER → NEW with the "Link existing card" picker?**
A: Only when the dropdown actually shows cards (= some system cards have no customer linked). If the dropdown is empty, every card already belongs to someone — go to **CARD → NEW** instead. The picker shows only unassigned cards by design, so you can't accidentally take someone else's card.

**Q: Customer claims they have stamps that the system doesn't show — what do I do?**
A: See **Scenario 8** above. The cashier flags it; admin resolves via Admin → Loyalty (add stamps, merge duplicates, etc.).

---

# Admin Section / Bagian Admin

> The actions below are **admin-only** (manager / owner role). Cashiers escalate Scenario 8 cases to the admin, who resolves them here.

**Where:** **Admin → Loyalty** screen → tabs:

- **Settings** — global loyalty configuration (stamps per cycle, rewards, tier thresholds, cashback rates)
- **Cards** — list/issue/edit/deactivate stamp cards
- **Customers** — list/edit/merge customers, adjust stamps and balance
- **History** — loyalty transaction log

## Admin Action 1: Add Stamps to an Existing Customer

**When:** Customer has stamps on a physical card that the system doesn't show (Scenario 8a / 8c).

1. Admin → Loyalty → **Customers** tab
2. Find the customer (search by name / phone / telegram)
3. Click the row to open the customer detail dialog
4. Tap **Edit**
5. In the **Loyalty** section, set **Stamps** to the correct total (existing system stamps + missing stamps from physical card)
6. Tap **Save**

> The customer's active stamp card gets the new stamp count. If they don't have a card yet, admin should issue one first via **Cards** tab → **+ New** (then re-open Customers, link the new card via Edit and set stamps).

## Admin Action 2: Adjust Cashback Balance

**When:** Cashback customer has a balance discrepancy (refund, manual reward, correction).

1. Admin → Loyalty → **Customers** tab → click customer → **Edit**
2. In the **Loyalty** section, change **Cashback Balance** to the correct amount
3. Fill in **Adjustment reason** (required when balance changes — kept in audit log)
4. Tap **Save**

## Admin Action 3: Merge Two Duplicate Customer Records

**When:** Same person ended up with two records (Scenario 8b — e.g. POS-created Customer A with card #NNN + later self-registered Customer B online via Telegram/Google).

1. Admin → Loyalty → **Customers** tab → find the **source** record (the one to be merged away — usually the duplicate with less data, e.g. the empty self-registered account)
2. Click the row → in the detail dialog, tap **Merge Into…**
3. **Step 1: Select target** — pick the record that should remain (the one with stamps / order history)
4. Confirmation summary appears: target's balance / visits / total spent
5. **Step 2: Resolve conflicts** — for each field where source and target differ (name, phone, email, telegram, tier, etc.), tap the side you want to keep
6. Tap **Merge** at the bottom
7. Result:
   - All orders, transactions, loyalty points, stamp cards, and identities from the source are transferred to the target
   - The source record is removed (status `merged`)
   - The customer now has a single, consolidated record with all stamps + online cabinet access intact

## Admin Action 4: Issue / Edit / Deactivate a Stamp Card

1. Admin → Loyalty → **Cards** tab
2. **Issue new card:** **+ New** button → optionally enter a card number (auto-generated otherwise) and link to a customer
3. **Edit card:** click the row → adjust stamps count (e.g. fix a miscount) → Save
4. **Deactivate card:** click the row → **Deactivate** (use for lost cards before issuing a replacement)

## Admin Action 5: Switch a Customer's Loyalty Program

**When:** Cashier asks to convert a stamps customer to cashback (or vice-versa) for VIP treatment.

1. Admin → Loyalty → **Customers** tab → click customer → **Edit**
2. **Loyalty** section → change **Program** (`stamps` ↔ `cashback`)
3. Tap **Save**

> Stamps → cashback transition also happens **automatically** when a customer completes a stamp card cycle. Admin only does this manually for special cases.

---

## Admin FAQ

**Q: Customer says they had stamps on a physical card from months ago — do I trust them?**
A: Use judgement. Check if the customer is in the system at all, what their visit history looks like, and ask them for the physical card number (if any). If the story is plausible, add the stamps. The Adjustment reason field captures your justification for audit.

**Q: Two customer records have different phone numbers — which is right?**
A: Use the **Resolve conflicts** step in the merge dialog to pick the correct value field-by-field. The other phone number can be discarded or saved into the Notes field.

**Q: After merge, where do the merged-away record's stamps and orders go?**
A: All of it transfers to the target record. The source record stays in the database with status `merged` (so historical references stay valid) but is hidden from active customer lists.

**Q: Can I undo a merge?**
A: No — merge is destructive (the source is marked `merged` and its identity is reattached to the target). Always double-check the conflict resolution screen before tapping Merge.
