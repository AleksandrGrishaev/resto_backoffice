# Sprint: Loyalty Program — Status & Next Steps

> Spec: `src/About/Frontend/LOYALTY_SPEC.md`
> All on DEV (`mcp__supabase_dev__*`), PROD — later

---

## DONE (Phases 1-5)

### DB Migrations (174-192, 202) — all applied to DEV

- [x] customers, stamp_cards, stamp_entries, loyalty_points, loyalty_transactions, loyalty_settings
- [x] orders extensions (customer_id, stamp_card_id)
- [x] RPC: add_stamps, apply_cashback, redeem_points, convert_stamp_card, expire_points, recalculate_tiers, get_customer_cabinet, get_stamp_card_info, list_stamp_cards
- [x] Migration 202: `loyalty_points` + `stamp_card_reward` added to discount_events reason CHECK

### Stores

- [x] `src/stores/customers/` — full CRUD, search, refreshCustomer, reload
- [x] `src/stores/loyalty/` — settings, addStamps, applyCashback, redeemPoints, convertCard, getCardInfo
- [x] Registration: StoreName, dependencies, categories, initialization strategies

### POS Integration

- [x] `LoyaltyPanel.vue` — card search, customer search, create new customer, auto-convert on create
- [x] `LoyaltyDialog.vue` — wraps LoyaltyPanel in v-dialog
- [x] `ConvertCardDialog.vue` — conversion with preview calculation
- [x] Per-bill loyalty: `bill.customerId`, `bill.customerName`, `bill.stampCardId` in BillMetadata JSONB
- [x] Bill tabs: "Stamp Card" / "Customer" menu items, detach support
- [x] PaymentDialog: compact loyalty banner (chips with balance, detach X buttons)
- [x] PaymentDialog: "Add Customer / Card" in Discount menu → opens LoyaltyDialog
- [x] Points redemption: "Use Points" toggle + amount input in PaymentDialog
- [x] Points as discount: saved as `loyalty_points` reason in bill discount → flows through profit_calculation
- [x] Post-payment: auto cashback (from actual payment amount, NOT including redeemed points)
- [x] Post-payment: auto add_stamps
- [x] Multi-bill checkout: validation (same customer/card required), all-bills update on attach/detach
- [x] Customer cache: `refreshCustomer()` on attach for fresh balance in PaymentDialog
- [x] Bill loyalty persistence: BillMetadata JSONB includes customerId/customerName/stampCardId

### Admin Screens

- [x] `LoyaltySettingsScreen.vue` — settings + stamp cards list + customers list (with tabs)
- [x] `CustomersScreen.vue` — customer list with reload on nav
- [x] Admin sidebar navigation

---

## TODO: Stamp Card Reward Redemption (Phase 6)

**Current state:** Reward categories ("drinks", "breakfast", "any") are plain text in `loyalty_settings.stamp_rewards` JSONB. No validation, no consumption, no category matching.

### Problem Summary

| #   | Issue                                                   | Impact                                     |
| --- | ------------------------------------------------------- | ------------------------------------------ |
| 1   | Category is plain text, not linked to `menu_categories` | Cannot validate items in bill match reward |
| 2   | No reward consumption after use                         | Same reward can be used infinitely         |
| 3   | No `stamp_card_id` on `discount_events`                 | No audit trail linking discount to card    |
| 4   | No item-level filtering by category                     | "Free drinks" discount applies to any item |

### Implementation Plan

#### 6.1 DB: Link reward categories to menu_categories

**Option A — UUID array in stamp_rewards:**
Change `stamp_rewards` JSONB from:

```json
{ "stamps": 5, "category": "drinks", "max_discount": 40000 }
```

To:

```json
{ "stamps": 5, "category": "drinks", "category_ids": ["uuid1", "uuid2"], "max_discount": 40000 }
```

- `category` stays as display label
- `category_ids` = array of `menu_categories.id` UUIDs for validation
- `"any"` category → empty `category_ids` array (no filtering)

**Migration 203:** ALTER loyalty_settings, update stamp_rewards JSONB structure

**Admin UI change:** `LoyaltySettingsScreen.vue` — reward category field becomes a multi-select dropdown of `menu_categories` instead of free text. Label auto-generated from selected categories.

#### 6.2 DB: Track reward redemptions

**New table: `stamp_reward_redemptions`**

```sql
CREATE TABLE stamp_reward_redemptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id       UUID NOT NULL REFERENCES stamp_cards(id),
  order_id      UUID REFERENCES orders(id),
  payment_id    UUID REFERENCES payments(id),
  discount_event_id UUID REFERENCES discount_events(id),
  reward_tier   INTEGER NOT NULL,  -- stamps threshold (5, 10, 15)
  category      TEXT NOT NULL,     -- "drinks", "breakfast", "any"
  max_discount  NUMERIC(12,2) NOT NULL,
  actual_discount NUMERIC(12,2) NOT NULL,
  stamps_at_redemption INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Migration 204:** Create table + indexes + grants

After redemption:

- Insert row into `stamp_reward_redemptions`
- The card's stamps are NOT consumed (they accumulate to next tier)
- But each tier can only be redeemed ONCE per cycle
- RPC `get_stamp_card_info` must check `stamp_reward_redemptions` to know if current tier's reward was already used

#### 6.3 DB: Add stamp_card_id to discount_events

**Migration 205:**

```sql
ALTER TABLE discount_events ADD COLUMN stamp_card_id UUID REFERENCES stamp_cards(id);
```

#### 6.4 RPC: Update `get_stamp_card_info`

Current `activeReward` returns highest reached tier. Must now:

1. Check `stamp_reward_redemptions` for this card + cycle
2. Exclude already-redeemed tiers
3. Return next available unredeemed reward (or null if all used)
4. Include `category_ids` in the response for item validation

#### 6.5 Frontend: Category-aware reward application

**PaymentDialog / BillDiscountDialog changes:**

When "Stamp Card Reward" is selected:

1. Get `activeReward.category_ids` from `stampCardInfo`
2. Filter bill items: only items whose `menuItem.categoryId` matches one of `category_ids`
3. If `category_ids` is empty (= "any"), all items qualify
4. Calculate max discount = MIN(reward.maxDiscount, sum of qualifying items)
5. Show which items qualify in the dialog
6. Apply discount ONLY to qualifying items (not whole bill)

**This means reward discount should be ITEM-level, not BILL-level:**

- For each qualifying item: apply proportional discount up to maxDiscount
- reason: `stamp_card_reward`
- Each gets a `discount_events` row with `stamp_card_id`

**OR simpler approach:** Keep as bill-level discount but cap at sum of qualifying items. Easier to implement, good enough for MVP.

#### 6.6 Frontend: Post-payment reward consumption

After payment confirm, if stamp card reward was used:

1. Create `stamp_reward_redemptions` row (via new RPC or direct insert)
2. Update `stampCardInfo` to reflect reward used
3. Next `get_stamp_card_info` call returns next available reward

#### 6.7 StampCardInfo type update

```typescript
export interface StampReward {
  stamps: number
  category: string // display label
  categoryIds: string[] // menu_categories UUIDs (empty = "any")
  maxDiscount: number
  redeemed: boolean // NEW: whether this tier was already used in current cycle
}
```

### Execution Order

1. [x] **Migration 203**: Update stamp_rewards JSONB structure (add category_ids) — applied to DEV
2. [x] **Migration 204**: Create stamp_reward_redemptions table — applied to DEV
3. [x] **Migration 205**: Add stamp_card_id to discount_events — applied to DEV
4. [x] **Migration 206**: RPC get_stamp_card_info v2 (check redemptions, return category_ids, redeemed flag) — applied to DEV
5. [x] **Admin UI**: LoyaltySettingsScreen — category multi-select from menu_categories
6. [x] **POS UI**: BillDiscountDialog — filter items by category, show qualifying items, cap at qualifying subtotal
7. [x] **POS**: Post-payment consumption — create redemption record in stamp_reward_redemptions
8. [x] **TypeScript types**: StampReward + categoryIds/redeemed, RewardRedemption type, DiscountEvent.stampCardId
9. [x] **Testing (DB)**: Full cycle verified on DEV — add stamps → reach tier → active_reward correct → redeem → redeemed=true → fallback to next tier → unique constraint blocks double-redeem
10. [ ] **Testing (UI)**: Manual test in browser — POS discount dialog with stamp card reward
11. [ ] **Apply to PROD**: Migrations 174-192, 202-206

### Dependencies

- `menu_categories` table must be populated (already exists)
- `menuStore` must be initialized for category lookup in POS context

---

## TODO: Apply to PROD

Migrations 174-192, 202 (and future 203-205) need to be applied to PROD via `mcp__supabase_prod__apply_migration`. Do this AFTER full testing on DEV.

---

## TODO: Other Pending Items

- [ ] Dark theme: verify all loyalty dialogs use `.loyalty-surface` instead of light backgrounds
- [ ] Receipt printing: include loyalty info (customer name, points used, cashback earned)
- [ ] Cron jobs: expire_points + recalculate_tiers (Edge Functions, daily)
- [ ] Customer cabinet web page (web-winter project, reads our data)
