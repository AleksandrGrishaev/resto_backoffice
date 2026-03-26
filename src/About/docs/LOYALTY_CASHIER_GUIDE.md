# Loyalty Program — Cashier Guide / Panduan Kasir

## Programs Overview / Gambaran Program

| Program      | How it works                                                    | Who gets it                            |
| ------------ | --------------------------------------------------------------- | -------------------------------------- |
| **Stamps**   | Physical card, collect stamps per order. Rewards at milestones. | New customers (default)                |
| **Cashback** | % of order credited as loyalty balance. No card needed.         | Regular/VIP customers (set by cashier) |

---

## Scenario 1: Customer with Physical Stamp Card

**When:** Customer shows their stamp card at checkout.

### English

1. Open **Loyalty** dialog (tap loyalty icon in order section)
2. Go to **CARD** tab
3. Type the card number → tap **FIND**
4. Card info appears (stamps count, cycle)
5. Tap the card to **attach** it to the order
6. Complete the order — stamps are added automatically

### Bahasa Indonesia

1. Buka dialog **Loyalty** (tekan ikon loyalty di bagian pesanan)
2. Pilih tab **CARD**
3. Ketik nomor kartu → tekan **FIND**
4. Info kartu muncul (jumlah stamp, siklus)
5. Tekan kartu untuk **pasang** ke pesanan
6. Selesaikan pesanan — stamp otomatis ditambahkan

---

## Scenario 2: New Customer (Standard — via QR)

**When:** New customer, no card, no account. The most common flow.

### English

1. Create the order as usual
2. Tap **Print Pre-bill** — a QR code prints automatically at the bottom
3. Give the pre-bill to the customer: _"Scan the QR to join our rewards program!"_
4. Customer scans with their phone → registers (Google / Telegram / Email)
5. POS shows notification: **"{Name} linked to Order #{number}"**
6. Customer is now in the **Stamps** program
7. **If customer didn't scan:** use the existing flow — scan customer's QR from their phone

### Bahasa Indonesia

1. Buat pesanan seperti biasa
2. Tekan **Print Pre-bill** — QR code otomatis tercetak di bagian bawah
3. Berikan pre-bill ke pelanggan: _"Scan QR untuk gabung program rewards kami!"_
4. Pelanggan scan dengan HP → daftar (Google / Telegram / Email)
5. POS menampilkan notifikasi: **"{Nama} terhubung ke Order #{nomor}"**
6. Pelanggan sekarang masuk program **Stamps**
7. **Jika pelanggan tidak scan:** gunakan flow yang sudah ada — scan QR pelanggan dari HP mereka

---

## Scenario 3: Regular/VIP Customer → Cashback

**When:** Registering a known regular customer who should get cashback rewards (not stamps).

### English

1. Open **Loyalty** dialog
2. Go to **CUSTOMER** tab → tap **NEW**
3. Fill in:
   - **Customer name** (required)
   - **Phone number** (recommended)
   - **Telegram** (optional)
4. Switch loyalty program from **Stamps** to **Cashback**
5. Tap **CREATE**
6. Customer is created and attached to the order
7. Give them the invite QR: tap the **QR icon** next to customer name → prints invite receipt
8. Customer scans later → registers → gets access to their cashback balance online

### Bahasa Indonesia

1. Buka dialog **Loyalty**
2. Pilih tab **CUSTOMER** → tekan **NEW**
3. Isi:
   - **Nama pelanggan** (wajib)
   - **Nomor telepon** (disarankan)
   - **Telegram** (opsional)
4. Ubah program loyalitas dari **Stamps** ke **Cashback**
5. Tekan **CREATE**
6. Pelanggan dibuat dan dipasang ke pesanan
7. Berikan QR invite: tekan **ikon QR** di sebelah nama pelanggan → cetak receipt invite
8. Pelanggan scan nanti → daftar → akses saldo cashback mereka secara online

---

## Scenario 4: Card Holder Wants Digital Account

**When:** Customer with a physical stamp card wants to register for a digital account (to track rewards online).

### English

1. Open **Loyalty** dialog
2. Go to **CUSTOMER** tab → tap **NEW**
3. Fill in:
   - **Customer name** (required)
   - **Phone number** (recommended)
4. Keep loyalty program as **Stamps**
5. Enter the customer's **Stamp card number**
6. Tap **CREATE**
   - Customer is created, card is linked (stamps keep accruing!)
7. Print invite QR: tap the **QR icon** next to customer name
8. Give receipt to customer: _"Scan this to access your rewards online!"_
9. Customer scans → registers → their digital account is linked to the POS profile and stamp card

### Bahasa Indonesia

1. Buka dialog **Loyalty**
2. Pilih tab **CUSTOMER** → tekan **NEW**
3. Isi:
   - **Nama pelanggan** (wajib)
   - **Nomor telepon** (disarankan)
4. Biarkan program loyalitas tetap **Stamps**
5. Masukkan **nomor kartu stamp** pelanggan
6. Tekan **CREATE**
   - Pelanggan dibuat, kartu terhubung (stamp tetap bertambah!)
7. Cetak QR invite: tekan **ikon QR** di sebelah nama pelanggan
8. Berikan receipt ke pelanggan: _"Scan ini untuk akses rewards online!"_
9. Pelanggan scan → daftar → akun digital terhubung ke profil POS dan kartu stamp

---

## Quick Reference / Referensi Cepat

| Action                       | Where                                              | Steps   |
| ---------------------------- | -------------------------------------------------- | ------- |
| Find stamp card              | CARD tab → type number → FIND                      | 1 step  |
| New stamp card (no customer) | CARD tab → NEW → enter number → CREATE CARD        | 2 steps |
| Attach customer by search    | CUSTOMER tab → search name/phone → tap result      | 1 step  |
| Create customer (stamps)     | CUSTOMER tab → NEW → fill form → Stamps → CREATE   | 3 steps |
| Create customer (cashback)   | CUSTOMER tab → NEW → fill form → Cashback → CREATE | 3 steps |
| Print invite QR              | Customer attached → tap QR icon (next to name)     | 1 step  |
| Scan customer QR             | SCAN tab → point camera at customer's phone        | 1 step  |

## FAQ

**Q: Customer lost their stamp card, what to do?**
A: Search by name in CUSTOMER tab. If found, attach to order. Stamps will accrue on any linked card.

**Q: Can a customer have both stamps and cashback?**
A: No. Each customer is on one program. When a stamp card cycle completes, the customer automatically transitions to cashback.

**Q: Customer scanned the QR but POS didn't update?**
A: Wait a few seconds for the realtime update. If it still doesn't show, use the fallback: SCAN tab → scan the customer's QR from their phone.

**Q: How do I switch a customer from stamps to cashback?**
A: Only admin can change an existing customer's program. Ask the manager.
