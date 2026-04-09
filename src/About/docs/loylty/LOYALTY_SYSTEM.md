# Loyalty System — Technical Documentation

## Architecture Overview

The loyalty system supports two programs: **Stamps** (default for new customers) and **Cashback** (after stamp card cycle completion or manual assignment).

```
Customer (loyalty_program: stamps|cashback)
    │
    ├── Stamps Program
    │   └── stamp_cards (card_number, customer_id, status, cycle)
    │       └── stamp_entries (stamps, order_id, order_amount, cycle)
    │
    └── Cashback Program
        └── customer.cashback_balance (accrued via loyalty_transactions)
```

## Database Tables

### `stamp_cards`

| Column      | Type        | Description                                           |
| ----------- | ----------- | ----------------------------------------------------- |
| id          | UUID        | Primary key                                           |
| card_number | TEXT        | Unique, zero-padded (e.g. "001", "042")               |
| customer_id | UUID        | FK to customers (nullable for anonymous cards)        |
| status      | TEXT        | 'active' or 'completed'                               |
| cycle       | INT         | Current cycle (starts at 1, increments on completion) |
| created_at  | TIMESTAMPTZ | Auto-set                                              |

### `stamp_entries`

| Column       | Type        | Description                              |
| ------------ | ----------- | ---------------------------------------- |
| id           | UUID        | Primary key                              |
| card_id      | UUID        | FK to stamp_cards                        |
| stamps       | INT         | Number of stamps added                   |
| order_id     | TEXT        | Related order                            |
| order_amount | NUMERIC     | Payment amount (determines stamps count) |
| cycle        | INT         | Which cycle this entry belongs to        |
| expires_at   | TIMESTAMPTZ | Stamp expiry (nullable)                  |

### `stamp_reward_redemptions`

Tracks when a customer redeems a stamp reward (e.g. free item at 15 stamps).

### `loyalty_transactions`

Tracks cashback accrual and redemption events.

## Programs

### Stamps Program

- Default for all new customers
- Stamps accrued per payment based on `loyalty_settings.stamp_threshold` (e.g. every Rp 50,000 = 1 stamp)
- Cycle size defined by `loyalty_settings.stamps_per_cycle` (default: 15)
- Rewards at configurable milestones (e.g. 5, 10, 15 stamps)
- On cycle completion: customer can be auto-converted to cashback program

### Cashback Program

- Percentage-based cashback on every payment
- Rate depends on customer tier: member (3%), regular (5%), vip (7%) — configurable
- Balance stored on customer record
- Can be redeemed at checkout (partial or full)

## Stamp Card Auto-Creation

**Stamp cards are automatically created** when a customer on the stamps program is registered. This happens in 4 places:

### 1. POS/Admin — `customersStore.createCustomer()`

```typescript
// src/stores/customers/customersStore.ts
async function createCustomer(data) {
  const customer = await customersService.create(data)
  if (customer.loyaltyProgram === 'stamps') {
    await loyaltyStore.issueCardForCustomer(customer.id)
  }
  return customer
}
```

### 2. Auth Trigger — `handle_new_auth_user()`

When a user signs up via Telegram/Google/email, the trigger creates a customer and a stamp card. Wrapped in `BEGIN..EXCEPTION` so card creation failure never blocks registration.

### 3. Invite Claim — `claim_invite()` RPC

Both order invites (QR on pre-bill) and customer invites (staff-generated QR) auto-create stamp cards.

### 4. POS Fallback — `OrderSection.vue`

When attaching a stamps-program customer to a bill or processing payment, if no active card is found, one is created on the fly. This covers legacy customers created before auto-creation was added.

### Card Number Generation

- Format: zero-padded numeric string ("001", "042", "100")
- Algorithm: `SELECT max(numeric_part) + 1` from existing cards
- Collision protection: retry loop (3 attempts) on `unique_violation`
- SQL and JS paths use the same approach

## Key RPC Functions

### `add_stamps(p_card_number, p_order_id, p_order_amount)`

Adds stamps based on payment amount. Returns stamps added, total, and cycle info.

### `get_stamp_card_info(p_card_number)`

Returns full card info: stamps, cycle, customer, reward tiers.

### `list_stamp_cards(p_status, p_limit, p_offset)`

Paginated card listing for admin UI.

### `convert_stamp_card(p_card_id)`

Completes current cycle, optionally converts customer to cashback program.

### `apply_cashback(p_customer_id, p_order_id, p_amount)`

Applies cashback based on customer tier. Returns cashback amount and new balance.

### `redeem_points(p_customer_id, p_order_id, p_amount)`

Deducts from customer's cashback balance. Returns new balance.

## POS Integration Flow

### QR Scan → Customer Attach → Payment → Stamps

```
1. Cashier opens Loyalty dialog → SCAN tab
2. Scans customer's QR code (from their phone/website profile)
3. Token lookup: customersService.fetchByToken(token)
4. Customer found → attached to bill
5. getActiveCardByCustomerId() → finds/creates stamp card
6. Card attached to bill (bill.stampCardId)
7. Payment processed
8. processLoyaltyAfterPayment():
   a. Update customer stats (visits, total_spent, tier)
   b. If stamps program: addStamps() → stamps accrued
   c. If cashback program: applyCashback() → balance updated
```

### Physical Card → Attach → Payment

```
1. Cashier opens Loyalty dialog → CARD tab
2. Types card number → FIND
3. Card info displayed → tap to attach
4. Payment processed → stamps added automatically
```

## Store Architecture

```
src/stores/loyalty/
├── loyaltyStore.ts     — Pinia store (state + actions)
├── loyaltyService.ts   — Supabase queries and business logic
├── types.ts            — TypeScript interfaces
└── index.ts            — Re-exports

src/views/pos/loyalty/
├── LoyaltyDialog.vue   — Dialog wrapper (v-dialog)
├── LoyaltyPanel.vue    — Main panel (SCAN / CARD / CUSTOMER tabs)
└── QrScanner.vue       — QR code scanner (html5-qrcode)

src/views/admin/loyalty/
└── LoyaltySettingsScreen.vue — Admin: settings, cards, customers, history
```

## Settings (`loyalty_settings` table)

| Setting                  | Description                    | Default                                                  |
| ------------------------ | ------------------------------ | -------------------------------------------------------- |
| stamps_enabled           | Enable stamps program          | true                                                     |
| cashback_enabled         | Enable cashback program        | true                                                     |
| stamp_threshold          | Amount per stamp (Rp)          | 50000                                                    |
| stamps_per_cycle         | Stamps per cycle               | 15                                                       |
| stamp_rewards            | JSONB array of reward tiers    | [{stamps: 5, ...}, {stamps: 10, ...}, {stamps: 15, ...}] |
| cashback_rates           | JSONB: tier → percentage       | {member: 3, regular: 5, vip: 7}                          |
| auto_convert_to_cashback | Convert after cycle completion | false                                                    |

## Security

- All tables have RLS enabled with `staff_all` policy (authenticated + `is_staff()`)
- Customer-facing operations use `SECURITY DEFINER` RPCs
- Anonymous auth users can only access their own data via RPCs
- `service_role` bypasses RLS (Edge Functions, seeds)

## Error Handling

- `.maybeSingle()` used for card lookups (prevents 406 on zero results)
- Card creation wrapped in `BEGIN..EXCEPTION` in SQL triggers (never blocks auth)
- Retry loop (3 attempts) for card_number unique_violation collisions
- All POS loyalty operations are non-blocking (try/catch, failures logged)

## Migration History

| Migration | Description                                       |
| --------- | ------------------------------------------------- |
| 175       | Create stamp_cards table                          |
| 176       | Create stamp_entries table                        |
| 181       | RPC add_stamps                                    |
| 184       | RPC convert_stamp_card                            |
| 188-189   | RPC get_stamp_card_info (v1, v2)                  |
| 192       | RPC list_stamp_cards                              |
| 204       | Create stamp_reward_redemptions                   |
| 221       | Loyalty program RPC updates                       |
| 286       | Auto-create stamp card on registration + backfill |
| 287       | Fix race condition in card creation (retry loop)  |
