# Strategic Plan: GoBiz/GrabFood Multi-Channel Integration

## Overview

Implement multi-channel pricing system with delivery platform integration, starting with menu synchronization and dynamic pricing based on kitchen load and inventory levels.

**Business Requirements:**

- **Pricing Strategy:** Higher delivery prices (+15-25%) to cover platform commissions
- **Platforms:** GoFood (GoBiz API) and GrabFood
- **Initial Priority:** Menu sync only (manual order entry via platform tablets)
- **Dynamic Pricing:** Kitchen load-based + Inventory-based automation

---

## Phase 1: Database Schema - Multi-Channel Pricing Foundation (Week 1)

### 1.1 Create Sales Channels Table

**Migration:** `src/supabase/migrations/020_create_sales_channels.sql`

```sql
-- Sales channels table
CREATE TABLE sales_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,              -- 'pos_dinein', 'pos_takeaway', 'gobiz', 'grabfood'
  name TEXT NOT NULL,                     -- 'POS Dine-In', 'GoFood', 'GrabFood'
  type TEXT NOT NULL,                     -- 'pos' | 'delivery_platform'
  is_active BOOLEAN DEFAULT true,
  default_markup_percentage NUMERIC(5,2), -- Global markup (e.g., 20.00 for +20%)
  platform_commission_rate NUMERIC(5,2),  -- Platform fee % (e.g., 25.00 for 25%)
  config JSONB,                           -- Platform-specific settings
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default channels
INSERT INTO sales_channels (code, name, type, default_markup_percentage, platform_commission_rate) VALUES
  ('pos_dinein', 'POS Dine-In', 'pos', 0, 0),
  ('pos_takeaway', 'POS Takeaway', 'pos', 0, 0),
  ('gobiz', 'GoFood (GoBiz)', 'delivery_platform', 20.00, 25.00),
  ('grabfood', 'GrabFood', 'delivery_platform', 20.00, 25.00);

-- Price lists table
CREATE TABLE price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES sales_channels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,             -- Higher priority = applied first
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, name)
);

-- Create default price lists for each channel
INSERT INTO price_lists (channel_id, name, description)
SELECT id, name || ' Default Prices', 'Default price list for ' || name
FROM sales_channels;
```

### 1.2 Create Channel-Specific Pricing Table

**Migration:** `src/supabase/migrations/021_create_menu_item_channel_prices.sql`

```sql
-- Menu item channel prices
CREATE TABLE menu_item_channel_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  variant_id TEXT,                        -- Links to variants JSONB array in menu_items
  price_list_id UUID REFERENCES price_lists(id) ON DELETE CASCADE,

  -- Pricing strategy (one of these will be set)
  override_price NUMERIC(10,2),           -- Explicit price override
  markup_percentage NUMERIC(5,2),         -- Percentage adjustment from base price

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(menu_item_id, variant_id, price_list_id),

  -- Constraint: Either override_price OR markup_percentage must be set
  CHECK (
    (override_price IS NOT NULL AND markup_percentage IS NULL) OR
    (override_price IS NULL AND markup_percentage IS NOT NULL)
  )
);

-- Index for fast price lookups
CREATE INDEX idx_channel_prices_menu_item ON menu_item_channel_prices(menu_item_id);
CREATE INDEX idx_channel_prices_price_list ON menu_item_channel_prices(price_list_id);

-- Function to calculate effective price for a menu item variant on a channel
CREATE OR REPLACE FUNCTION get_effective_price(
  p_menu_item_id UUID,
  p_variant_id TEXT,
  p_channel_code TEXT
) RETURNS NUMERIC AS $$
DECLARE
  v_base_price NUMERIC;
  v_channel_price NUMERIC;
  v_markup NUMERIC;
  v_default_markup NUMERIC;
BEGIN
  -- Get base price from menu_items.variants JSONB
  SELECT (variant->>'price')::NUMERIC INTO v_base_price
  FROM menu_items, jsonb_array_elements(variants) AS variant
  WHERE menu_items.id = p_menu_item_id
    AND variant->>'id' = p_variant_id;

  -- Check for explicit override price
  SELECT override_price INTO v_channel_price
  FROM menu_item_channel_prices micp
  JOIN price_lists pl ON micp.price_list_id = pl.id
  JOIN sales_channels sc ON pl.channel_id = sc.id
  WHERE micp.menu_item_id = p_menu_item_id
    AND micp.variant_id = p_variant_id
    AND sc.code = p_channel_code
    AND micp.is_active = true
    AND pl.is_active = true
    AND micp.override_price IS NOT NULL
  ORDER BY pl.priority DESC
  LIMIT 1;

  IF v_channel_price IS NOT NULL THEN
    RETURN v_channel_price;
  END IF;

  -- Check for percentage markup
  SELECT markup_percentage INTO v_markup
  FROM menu_item_channel_prices micp
  JOIN price_lists pl ON micp.price_list_id = pl.id
  JOIN sales_channels sc ON pl.channel_id = sc.id
  WHERE micp.menu_item_id = p_menu_item_id
    AND micp.variant_id = p_variant_id
    AND sc.code = p_channel_code
    AND micp.is_active = true
    AND pl.is_active = true
    AND micp.markup_percentage IS NOT NULL
  ORDER BY pl.priority DESC
  LIMIT 1;

  IF v_markup IS NOT NULL THEN
    RETURN ROUND(v_base_price * (1 + v_markup / 100), 0);
  END IF;

  -- Use channel default markup
  SELECT default_markup_percentage INTO v_default_markup
  FROM sales_channels
  WHERE code = p_channel_code AND is_active = true;

  IF v_default_markup IS NOT NULL THEN
    RETURN ROUND(v_base_price * (1 + v_default_markup / 100), 0);
  END IF;

  -- Fallback to base price
  RETURN v_base_price;
END;
$$ LANGUAGE plpgsql;
```

### 1.3 Extend Orders Schema

**Migration:** `src/supabase/migrations/022_extend_orders_for_channels.sql`

```sql
-- Add channel tracking to orders
ALTER TABLE orders
  ADD COLUMN source_channel TEXT REFERENCES sales_channels(code),
  ADD COLUMN external_order_id TEXT,           -- GoFood/Grab order ID
  ADD COLUMN platform_fee NUMERIC(10,2),       -- Commission amount
  ADD COLUMN net_revenue NUMERIC(10,2),        -- Revenue after platform fee
  ADD COLUMN price_list_id UUID REFERENCES price_lists(id);

-- Index for filtering by channel
CREATE INDEX idx_orders_source_channel ON orders(source_channel);
CREATE INDEX idx_orders_external_id ON orders(external_order_id) WHERE external_order_id IS NOT NULL;

-- Update existing orders to use POS channels
UPDATE orders
SET source_channel = CASE
  WHEN type = 'dine_in' THEN 'pos_dinein'
  WHEN type = 'takeaway' THEN 'pos_takeaway'
  WHEN type = 'delivery' THEN 'pos_takeaway'
  ELSE 'pos_dinein'
END
WHERE source_channel IS NULL;

-- Function to calculate platform fees and net revenue
CREATE OR REPLACE FUNCTION calculate_order_financials()
RETURNS TRIGGER AS $$
DECLARE
  v_commission_rate NUMERIC;
BEGIN
  -- Get commission rate for the channel
  SELECT platform_commission_rate INTO v_commission_rate
  FROM sales_channels
  WHERE code = NEW.source_channel;

  -- Calculate platform fee if it's a delivery platform
  IF v_commission_rate IS NOT NULL AND v_commission_rate > 0 THEN
    NEW.platform_fee := ROUND((NEW.total_amount * v_commission_rate / 100), 0);
    NEW.net_revenue := NEW.total_amount - NEW.platform_fee;
  ELSE
    NEW.platform_fee := 0;
    NEW.net_revenue := NEW.total_amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate financials
CREATE TRIGGER trigger_calculate_order_financials
  BEFORE INSERT OR UPDATE OF total_amount, source_channel ON orders
  FOR EACH ROW
  EXECUTE FUNCTION calculate_order_financials();
```

---

## Phase 2: Channel Pricing Management UI (Week 2)

### 2.1 Channel Configuration Page

**New route:** `/settings/channels`
**New view:** `src/views/settings/ChannelsView.vue`

**Features:**

- List all sales channels with toggle active/inactive
- Configure global markup per channel (percentage or fixed)
- View channel statistics (orders, revenue, fees)
- Edit platform credentials (GoBiz OAuth, Grab API keys)

**Components:**

```
src/views/settings/channels/
├── ChannelsView.vue              # Main page
├── components/
│   ├── ChannelCard.vue           # Individual channel display
│   ├── ChannelConfigDialog.vue   # Edit channel settings
│   └── ChannelStatsCard.vue      # Revenue/order statistics
```

### 2.2 Multi-Channel Price Editor

**Enhance:** `src/views/menu/MenuItemEditor.vue`

**New features:**

- Add "Channel Prices" tab/section
- Display price comparison table:
  ```
  Variant          | Base Price | POS      | GoFood (+20%) | GrabFood (+20%)
  Small (330ml)    | Rp 25,000  | Rp 25,000| Rp 30,000     | Rp 30,000
  Large (500ml)    | Rp 35,000  | Rp 35,000| Rp 42,000     | Rp 42,000
  ```
- Quick actions:
  - "Apply +20% to all delivery channels"
  - "Copy POS prices to all channels"
  - "Reset to default markups"
- Individual price overrides per variant per channel

**New components:**

```
src/views/menu/components/pricing/
├── ChannelPriceEditor.vue        # Multi-channel price table
├── PriceOverrideDialog.vue       # Edit individual price
└── BulkPriceActions.vue          # Bulk price operations
```

### 2.3 Price List Management

**New component:** `src/views/menu/components/PriceListManager.vue`

**Features:**

- Create/edit price lists
- Assign items to price lists
- Preview price differences across channels
- Import/export price lists (CSV)

---

## Phase 3: Dynamic Pricing Engine (Week 3)

### 3.1 Database Schema for Pricing Rules

**Migration:** `src/supabase/migrations/023_create_pricing_rules.sql`

```sql
-- Dynamic pricing rules
CREATE TABLE pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL,                -- 'kitchen_load' | 'inventory_level' | 'time_based'
  is_active BOOLEAN DEFAULT true,

  -- Channels to apply this rule to
  target_channels TEXT[] DEFAULT ARRAY['gobiz', 'grabfood'],

  -- Trigger conditions (JSONB for flexibility)
  trigger_condition JSONB NOT NULL,
  -- Examples:
  -- Kitchen load: {"metric": "active_orders", "operator": ">", "threshold": 15}
  -- Inventory: {"metric": "stock_percentage", "operator": "<", "threshold": 20}
  -- Time: {"start_time": "14:00", "end_time": "17:00", "days": [1,2,3,4,5]}

  -- Action to take
  action_type TEXT NOT NULL,              -- 'adjust_price' | 'disable_item' | 'create_promo'
  action_config JSONB NOT NULL,
  -- Examples:
  -- Price adjustment: {"type": "percentage", "value": 10, "direction": "increase"}
  -- Disable: {"disabled": true}
  -- Promo: {"discount_percentage": 20, "promo_name": "Happy Hour"}

  -- Scope: which items does this apply to
  applies_to TEXT NOT NULL DEFAULT 'all', -- 'all' | 'category' | 'items'
  target_category_ids UUID[],
  target_item_ids UUID[],

  priority INTEGER DEFAULT 0,             -- Higher priority rules run first

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Price change audit log
CREATE TABLE price_change_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID REFERENCES menu_items(id),
  variant_id TEXT,
  channel_code TEXT REFERENCES sales_channels(code),

  old_price NUMERIC(10,2),
  new_price NUMERIC(10,2),

  change_reason TEXT NOT NULL,            -- 'manual' | 'dynamic_rule' | 'bulk_update'
  rule_id UUID REFERENCES pricing_rules(id),
  triggered_by_user_id UUID,              -- If manual change

  metadata JSONB,                         -- Additional context (e.g., kitchen load at time)

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_price_log_item ON price_change_log(menu_item_id);
CREATE INDEX idx_price_log_channel ON price_change_log(channel_code);
CREATE INDEX idx_price_log_created ON price_change_log(created_at DESC);
```

### 3.2 Pricing Rules Service

**New service:** `src/services/pricing/DynamicPricingService.ts`

```typescript
interface PricingRule {
  id: string
  name: string
  ruleType: 'kitchen_load' | 'inventory_level' | 'time_based'
  isActive: boolean
  targetChannels: string[]
  triggerCondition: TriggerCondition
  actionConfig: ActionConfig
  appliesTo: 'all' | 'category' | 'items'
  targetCategoryIds?: string[]
  targetItemIds?: string[]
  priority: number
}

interface TriggerCondition {
  // Kitchen load
  metric?: 'active_orders' | 'stock_percentage'
  operator?: '>' | '<' | '>=' | '<=' | '=='
  threshold?: number

  // Time-based
  startTime?: string // "14:00"
  endTime?: string // "17:00"
  days?: number[] // [1,2,3,4,5] (Monday-Friday)
}

interface ActionConfig {
  type: 'percentage' | 'fixed'
  value: number
  direction: 'increase' | 'decrease'
}

class DynamicPricingService {
  // Evaluate all active rules and return price adjustments
  async evaluateRules(): Promise<PriceAdjustment[]>

  // Check if a specific rule's conditions are met
  async checkRuleTrigger(rule: PricingRule): Promise<boolean>

  // Apply price adjustments to channels
  async applyPriceAdjustments(adjustments: PriceAdjustment[]): Promise<void>

  // Get current kitchen load
  async getKitchenLoad(): Promise<number>

  // Get inventory level for a product
  async getInventoryLevel(productId: string): Promise<number>

  // Log price change
  async logPriceChange(change: PriceChange): Promise<void>
}
```

**Implementation highlights:**

- Kitchen Load-Based Rules:

  - Monitor `ordersStore.activeOrders.length`
  - Thresholds: >15 orders = +10%, >25 orders = +20%
  - Apply only to delivery channels
  - Revert when load decreases

- Inventory-Based Rules:
  - Monitor `storageStore.products` stock levels
  - Low stock (< 20%): +15% price increase
  - Expiring soon (< 3 days): -20% discount
  - Auto-disable items when out of stock

### 3.3 Rule Configuration UI

**New page:** `/settings/dynamic-pricing`
**New view:** `src/views/settings/DynamicPricingView.vue`

**Features:**

- List all pricing rules (active/inactive toggle)
- Create/edit rules with wizard:
  1. Choose rule type (kitchen load / inventory / time-based)
  2. Set trigger conditions
  3. Define action (price adjustment %)
  4. Select target channels
  5. Select target items/categories
- Preview rule effects (simulated price changes)
- View rule execution history

**Components:**

```
src/views/settings/dynamic-pricing/
├── DynamicPricingView.vue
├── components/
│   ├── PricingRulesList.vue
│   ├── PricingRuleWizard.vue
│   ├── RuleTriggerEditor.vue
│   ├── RuleActionEditor.vue
│   └── RulePreview.vue
```

### 3.4 Background Job System

**New service:** `src/services/pricing/PricingScheduler.ts`

```typescript
class PricingScheduler {
  private intervalId?: number
  private isRunning = false

  // Start the scheduler (every 5 minutes)
  start(intervalMinutes = 5): void {
    this.intervalId = setInterval(
      () => {
        this.runPricingEvaluation()
      },
      intervalMinutes * 60 * 1000
    )
  }

  // Stop the scheduler
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
  }

  // Main evaluation loop
  private async runPricingEvaluation(): Promise<void> {
    if (this.isRunning) return

    this.isRunning = true
    try {
      const pricingService = new DynamicPricingService()

      // 1. Evaluate all active rules
      const adjustments = await pricingService.evaluateRules()

      // 2. Apply adjustments locally
      await pricingService.applyPriceAdjustments(adjustments)

      // 3. Sync to delivery platforms
      await this.syncToPlatforms(adjustments)

      // 4. Notify admins if significant changes
      await this.notifyPriceChanges(adjustments)
    } finally {
      this.isRunning = false
    }
  }

  private async syncToPlatforms(adjustments: PriceAdjustment[]): Promise<void> {
    // Push to GoBiz API
    // Push to GrabFood API
  }
}
```

**Integration point:** Start scheduler in `src/core/appInitializer.ts` after backoffice initialization

---

## Phase 4: GoBiz API Integration (Week 4)

### 4.1 GoBiz Client Service

**New service:** `src/services/integrations/gobiz/GoBizClient.ts`

```typescript
interface GoBizConfig {
  clientId: string
  clientSecret: string
  outletId: string
  apiBaseUrl: string // 'https://api.gofood.co.id' (production)
}

class GoBizClient {
  private config: GoBizConfig
  private authService: GoBizAuth

  constructor(config: GoBizConfig) {
    this.config = config
    this.authService = new GoBizAuth(config)
  }

  // Update entire catalog
  async updateCatalog(catalog: GoBizCatalog): Promise<void> {
    const token = await this.authService.getAccessToken()

    const response = await fetch(
      `${this.config.apiBaseUrl}/integrations/gofood/outlets/${this.config.outletId}/v1/catalog`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(catalog)
      }
    )

    if (!response.ok) {
      throw new Error(`GoBiz catalog update failed: ${response.statusText}`)
    }
  }

  // Update stock availability
  async updateStock(items: StockUpdate[]): Promise<void> {
    const token = await this.authService.getAccessToken()

    const response = await fetch(
      `${this.config.apiBaseUrl}/integrations/gofood/outlets/${this.config.outletId}/v2/menu_item_stocks`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items })
      }
    )

    if (!response.ok) {
      throw new Error(`GoBiz stock update failed: ${response.statusText}`)
    }
  }

  // Create promotional discount
  async createPromo(promo: GoBizPromo): Promise<string> {
    const token = await this.authService.getAccessToken()

    const response = await fetch(
      `${this.config.apiBaseUrl}/integrations/promo/outlets/${this.config.outletId}/v1/food-promos`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(promo)
      }
    )

    if (!response.ok) {
      throw new Error(`GoBiz promo creation failed: ${response.statusText}`)
    }

    const data = await response.json()
    return data.promotion_id
  }

  // Deactivate promo
  async deactivatePromo(promotionId: string): Promise<void> {
    const token = await this.authService.getAccessToken()

    await fetch(
      `${this.config.apiBaseUrl}/integrations/promo/outlets/${this.config.outletId}/v1/food-promos/${promotionId}/deactivate`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )
  }
}

interface GoBizCatalog {
  categories: GoBizCategory[]
  items: GoBizItem[]
}

interface GoBizItem {
  id: string // Internal menu item ID
  name: string
  description: string
  price: number // Channel-specific price
  category_id: string
  image_url?: string
  variants?: GoBizVariant[] // Size options
  modifiers?: GoBizModifier[] // Customizations
  is_available: boolean
}

interface GoBizVariant {
  id: string
  name: string // "Small 330ml"
  price: number
}

interface GoBizModifier {
  id: string
  name: string // "Extra Cheese"
  price: number // Additional cost
  is_default: boolean
}

interface GoBizPromo {
  name: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number // 1-90 for percentage
  item_ids: string[]
  start_time: string // ISO 8601
  end_time: string
  promo_type: 'time_based' | 'date_based'
  time_window?: {
    start: string // "14:00"
    end: string // "17:00"
    duration_hours: number // 1-6
  }
}
```

### 4.2 OAuth 2.0 Authentication

**New service:** `src/services/integrations/gobiz/GoBizAuth.ts`

```typescript
class GoBizAuth {
  private config: GoBizConfig
  private accessToken?: string
  private tokenExpiry?: Date

  async getAccessToken(): Promise<string> {
    // Check if token is still valid
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.accessToken
    }

    // Request new token
    const response = await fetch('https://api.gofood.co.id/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: 'gofood:catalog:write promo:food_promo:write'
      })
    })

    if (!response.ok) {
      throw new Error('GoBiz OAuth failed')
    }

    const data = await response.json()
    this.accessToken = data.access_token
    this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000)

    return this.accessToken
  }
}
```

**Environment variables (.env.production):**

```bash
VITE_GOBIZ_CLIENT_ID=your_client_id
VITE_GOBIZ_CLIENT_SECRET=your_client_secret
VITE_GOBIZ_OUTLET_ID=your_outlet_id
VITE_GOBIZ_API_URL=https://api.gofood.co.id
```

### 4.3 Menu Sync Service

**New service:** `src/services/integrations/gobiz/MenuSyncService.ts`

```typescript
class MenuSyncService {
  private gobizClient: GoBizClient

  async syncFullMenu(): Promise<void> {
    // 1. Get all active menu items from menuStore
    const menuStore = useMenuStore()
    const items = menuStore.items.filter(item => item.isActive)

    // 2. Get channel-specific prices for 'gobiz' channel
    const channelPrices = await this.getChannelPrices('gobiz')

    // 3. Transform to GoBiz format
    const catalog = this.transformToCatalog(items, channelPrices)

    // 4. Push to GoBiz API
    await this.gobizClient.updateCatalog(catalog)

    // 5. Log sync event
    await this.logSync('full_menu', items.length)
  }

  async syncPrices(itemIds: string[]): Promise<void> {
    // Update only prices for specific items
    const channelPrices = await this.getChannelPrices('gobiz', itemIds)
    const catalog = await this.buildPartialCatalog(itemIds, channelPrices)
    await this.gobizClient.updateCatalog(catalog)
  }

  async syncStock(updates: StockUpdate[]): Promise<void> {
    // Update availability status
    const gobizUpdates = updates.map(u => ({
      item_id: u.menuItemId,
      is_available: u.isAvailable
    }))
    await this.gobizClient.updateStock(gobizUpdates)
  }

  private transformToCatalog(items: MenuItem[], prices: Map<string, number>): GoBizCatalog {
    return {
      categories: this.transformCategories(),
      items: items.map(item => this.transformItem(item, prices))
    }
  }

  private transformItem(item: MenuItem, prices: Map<string, number>): GoBizItem {
    return {
      id: item.id,
      name: item.name,
      description: item.description || '',
      price: this.getChannelPrice(item.id, item.variants[0]?.id, prices),
      category_id: item.categoryId,
      image_url: item.imageUrl,
      variants: item.variants.map(v => ({
        id: v.id,
        name: v.name,
        price: this.getChannelPrice(item.id, v.id, prices)
      })),
      modifiers: this.transformModifiers(item.modifierGroups),
      is_available: item.isActive
    }
  }

  private async getChannelPrices(
    channelCode: string,
    itemIds?: string[]
  ): Promise<Map<string, number>> {
    // Query menu_item_channel_prices for this channel
    const { data } = await supabase
      .from('menu_item_channel_prices')
      .select(
        `
        menu_item_id,
        variant_id,
        override_price,
        markup_percentage,
        price_lists!inner(
          sales_channels!inner(code)
        )
      `
      )
      .eq('price_lists.sales_channels.code', channelCode)
      .eq('is_active', true)

    // Build map of item+variant -> effective price
    const priceMap = new Map<string, number>()
    for (const row of data || []) {
      const key = `${row.menu_item_id}:${row.variant_id}`
      priceMap.set(key, row.override_price || this.calculateMarkupPrice(row))
    }
    return priceMap
  }
}
```

### 4.4 Platform Sync Status Tracking

**Migration:** `src/supabase/migrations/024_create_platform_sync_log.sql`

```sql
CREATE TABLE platform_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL,               -- 'gobiz' | 'grabfood'
  sync_type TEXT NOT NULL,              -- 'full_menu' | 'prices' | 'stock' | 'promo'
  status TEXT NOT NULL,                 -- 'success' | 'failed' | 'partial'

  items_affected INTEGER,
  error_message TEXT,
  details JSONB,                        -- Additional context

  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER
);

CREATE INDEX idx_sync_log_platform ON platform_sync_log(platform);
CREATE INDEX idx_sync_log_status ON platform_sync_log(status);
CREATE INDEX idx_sync_log_started ON platform_sync_log(started_at DESC);
```

---

## Phase 5: GrabFood API Integration (Week 5)

### 5.1 Research GrabFood Merchant API

**Action items:**

- Register as GrabFood merchant
- Access Grab Developer Portal
- Review API documentation
- Obtain API credentials

### 5.2 GrabFood Client Service

**New service:** `src/services/integrations/grab/GrabClient.ts`

**Similar structure to GoBizClient:**

- Authentication (likely API key-based)
- Menu sync endpoint
- Price update endpoint
- Stock update endpoint

### 5.3 Unified Integration Interface

**New interface:** `src/services/integrations/IDeliveryPlatform.ts`

```typescript
interface IDeliveryPlatform {
  // Platform identification
  getPlatformCode(): string
  getPlatformName(): string

  // Menu operations
  syncFullMenu(): Promise<void>
  syncMenuItem(itemId: string): Promise<void>

  // Price operations
  updatePrices(updates: PriceUpdate[]): Promise<void>

  // Stock operations
  updateStock(updates: StockUpdate[]): Promise<void>

  // Promo operations (if supported)
  createPromo?(promo: PlatformPromo): Promise<string>
  deactivatePromo?(promoId: string): Promise<void>

  // Status check
  checkConnection(): Promise<boolean>
}

interface PriceUpdate {
  menuItemId: string
  variantId: string
  price: number
}

interface StockUpdate {
  menuItemId: string
  isAvailable: boolean
}

// Implementations
class GoBizPlatform implements IDeliveryPlatform {
  private client: GoBizClient
  private syncService: MenuSyncService

  getPlatformCode(): string {
    return 'gobiz'
  }
  getPlatformName(): string {
    return 'GoFood'
  }

  async syncFullMenu(): Promise<void> {
    await this.syncService.syncFullMenu()
  }

  // ... other methods
}

class GrabFoodPlatform implements IDeliveryPlatform {
  private client: GrabClient

  getPlatformCode(): string {
    return 'grabfood'
  }
  getPlatformName(): string {
    return 'GrabFood'
  }

  // ... implementation
}
```

### 5.4 Platform Manager

**New service:** `src/services/integrations/PlatformManager.ts`

```typescript
class PlatformManager {
  private platforms: Map<string, IDeliveryPlatform> = new Map()

  registerPlatform(platform: IDeliveryPlatform): void {
    this.platforms.set(platform.getPlatformCode(), platform)
  }

  getPlatform(code: string): IDeliveryPlatform | undefined {
    return this.platforms.get(code)
  }

  getActivePlatforms(): IDeliveryPlatform[] {
    return Array.from(this.platforms.values())
  }

  async syncAllPlatforms(): Promise<void> {
    const promises = this.getActivePlatforms().map(p => p.syncFullMenu())
    await Promise.all(promises)
  }

  async updatePricesOnAllPlatforms(updates: PriceUpdate[]): Promise<void> {
    const promises = this.getActivePlatforms().map(p => p.updatePrices(updates))
    await Promise.all(promises)
  }
}

// Global instance
export const platformManager = new PlatformManager()

// Initialize in appInitializer.ts
if (ENV.integrations.gobiz.enabled) {
  const gobiz = new GoBizPlatform(ENV.integrations.gobiz)
  platformManager.registerPlatform(gobiz)
}

if (ENV.integrations.grab.enabled) {
  const grab = new GrabFoodPlatform(ENV.integrations.grab)
  platformManager.registerPlatform(grab)
}
```

---

## Phase 6: Admin Dashboard & Monitoring (Week 6)

### 6.1 Channel Performance Dashboard

**New page:** `/analytics/channels`
**New view:** `src/views/analytics/ChannelsAnalytics.vue`

**Metrics to display:**

```typescript
interface ChannelMetrics {
  channelCode: string
  channelName: string

  // Order metrics
  totalOrders: number
  ordersTrend: number // % change from previous period
  averageOrderValue: number

  // Revenue metrics
  grossRevenue: number // Total revenue
  platformFees: number // Commission paid
  netRevenue: number // After fees
  revenueMargin: number // Net / Gross %

  // Item metrics
  topItems: Array<{
    itemName: string
    quantity: number
    revenue: number
  }>

  // Time series data
  dailyRevenue: Array<{
    date: string
    revenue: number
    orders: number
  }>
}
```

**SQL query example:**

```sql
SELECT
  source_channel,
  COUNT(*) as total_orders,
  SUM(total_amount) as gross_revenue,
  SUM(platform_fee) as platform_fees,
  SUM(net_revenue) as net_revenue,
  AVG(total_amount) as avg_order_value
FROM orders
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND status IN ('completed', 'served', 'collected', 'delivered')
GROUP BY source_channel
ORDER BY gross_revenue DESC;
```

**Components:**

```
src/views/analytics/channels/
├── ChannelsAnalytics.vue
├── components/
│   ├── ChannelMetricsCard.vue
│   ├── RevenueComparisonChart.vue
│   ├── TopItemsByChannel.vue
│   └── ChannelTrendsChart.vue
```

### 6.2 Dynamic Pricing Monitor

**New page:** `/analytics/pricing`
**New view:** `src/views/analytics/PricingMonitor.vue`

**Features:**

- Live view of current channel prices (real-time table)
- Price change history timeline
- Rule execution log:

  ```
  [14:05] Kitchen Load Rule triggered: 18 active orders > 15 threshold
          → Increased prices by 10% on GoFood and GrabFood
          → Affected 42 items

  [15:30] Kitchen Load Rule deactivated: 12 active orders < 15 threshold
          → Reverted prices to normal on GoFood and GrabFood
          → Affected 42 items
  ```

- Manual override controls
- Price effectiveness metrics (revenue impact of dynamic pricing)

**Components:**

```
src/views/analytics/pricing/
├── PricingMonitor.vue
├── components/
│   ├── CurrentPricesTable.vue
│   ├── PriceChangeTimeline.vue
│   ├── RuleExecutionLog.vue
│   └── PriceImpactAnalytics.vue
```

### 6.3 Sync Status Monitor

**New component:** `src/views/settings/components/SyncStatusMonitor.vue`

**Features:**

- Platform connection status (connected/disconnected)
- Last successful sync timestamp
- Sync error alerts
- Manual sync trigger buttons
- Sync logs viewer (last 100 syncs)

**Real-time updates:**

```typescript
// Subscribe to sync log changes
const { data } = await supabase
  .from('platform_sync_log')
  .select('*')
  .order('started_at', { ascending: false })
  .limit(10)

// Real-time subscription
supabase
  .channel('sync_log_changes')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'platform_sync_log'
    },
    payload => {
      // Update UI with new sync event
    }
  )
  .subscribe()
```

---

## Technical Architecture Summary

### New Directory Structure

```
src/
├── services/
│   ├── integrations/
│   │   ├── IDeliveryPlatform.ts        # Common interface
│   │   ├── PlatformManager.ts          # Platform registry
│   │   ├── gobiz/
│   │   │   ├── GoBizClient.ts          # API client
│   │   │   ├── GoBizAuth.ts            # OAuth handler
│   │   │   ├── MenuSyncService.ts      # Menu mapping
│   │   │   ├── PriceSyncService.ts     # Price updates
│   │   │   └── types.ts                # GoBiz types
│   │   └── grab/
│   │       ├── GrabClient.ts
│   │       └── types.ts
│   └── pricing/
│       ├── DynamicPricingService.ts    # Pricing rules engine
│       ├── PricingScheduler.ts         # Background jobs
│       └── types.ts
├── stores/
│   └── channels/
│       ├── channelsStore.ts            # Channel management
│       ├── pricingRulesStore.ts        # Dynamic rules
│       └── types.ts
└── views/
    ├── settings/
    │   ├── channels/
    │   │   └── ChannelsView.vue        # Channel config
    │   └── dynamic-pricing/
    │       └── DynamicPricingView.vue  # Rules config
    ├── analytics/
    │   ├── channels/
    │   │   └── ChannelsAnalytics.vue   # Performance
    │   └── pricing/
    │       └── PricingMonitor.vue      # Price tracking
    └── menu/
        └── components/
            └── pricing/
                └── ChannelPriceEditor.vue
```

### Database Tables Summary

```sql
sales_channels                -- Platform definitions (gobiz, grabfood)
price_lists                   -- Channel-specific pricing rules
menu_item_channel_prices      -- Price overrides per channel
pricing_rules                 -- Dynamic pricing rules
price_change_log              -- Audit trail of price changes
platform_sync_log             -- Integration sync history
```

### TypeScript Types Summary

```typescript
// Channel types
interface SalesChannel {
  code: string
  name: string
  type: 'pos' | 'delivery_platform'
  isActive: boolean
  defaultMarkupPercentage: number
  platformCommissionRate: number
}

// Pricing types
interface ChannelPrice {
  menuItemId: string
  variantId: string
  priceListId: string
  overridePrice?: number
  markupPercentage?: number
}

// Dynamic pricing
interface PricingRule {
  ruleType: 'kitchen_load' | 'inventory_level' | 'time_based'
  triggerCondition: TriggerCondition
  actionConfig: ActionConfig
  targetChannels: string[]
}

// Integration
interface IDeliveryPlatform {
  syncFullMenu(): Promise<void>
  updatePrices(updates: PriceUpdate[]): Promise<void>
  updateStock(updates: StockUpdate[]): Promise<void>
}
```

---

## Environment Configuration

### New Environment Variables

```bash
# GoBiz Integration
VITE_GOBIZ_ENABLED=true
VITE_GOBIZ_CLIENT_ID=your_client_id
VITE_GOBIZ_CLIENT_SECRET=your_client_secret
VITE_GOBIZ_OUTLET_ID=your_outlet_id
VITE_GOBIZ_API_URL=https://api.gofood.co.id

# GrabFood Integration
VITE_GRAB_ENABLED=true
VITE_GRAB_API_KEY=your_api_key
VITE_GRAB_MERCHANT_ID=your_merchant_id
VITE_GRAB_API_URL=https://api.grab.com

# Dynamic Pricing
VITE_DYNAMIC_PRICING_ENABLED=true
VITE_PRICING_SCHEDULER_INTERVAL=5  # minutes

# Feature Flags
VITE_MULTI_CHANNEL_PRICING=true
```

### Update `src/config/environment.ts`

```typescript
export const ENV = {
  // ... existing config

  integrations: {
    gobiz: {
      enabled: import.meta.env.VITE_GOBIZ_ENABLED === 'true',
      clientId: import.meta.env.VITE_GOBIZ_CLIENT_ID || '',
      clientSecret: import.meta.env.VITE_GOBIZ_CLIENT_SECRET || '',
      outletId: import.meta.env.VITE_GOBIZ_OUTLET_ID || '',
      apiUrl: import.meta.env.VITE_GOBIZ_API_URL || 'https://api.gofood.co.id'
    },
    grab: {
      enabled: import.meta.env.VITE_GRAB_ENABLED === 'true',
      apiKey: import.meta.env.VITE_GRAB_API_KEY || '',
      merchantId: import.meta.env.VITE_GRAB_MERCHANT_ID || '',
      apiUrl: import.meta.env.VITE_GRAB_API_URL || 'https://api.grab.com'
    }
  },

  pricing: {
    dynamicPricingEnabled: import.meta.env.VITE_DYNAMIC_PRICING_ENABLED === 'true',
    schedulerIntervalMinutes: parseInt(import.meta.env.VITE_PRICING_SCHEDULER_INTERVAL || '5'),
    multiChannelEnabled: import.meta.env.VITE_MULTI_CHANNEL_PRICING === 'true'
  }
}
```

---

## Implementation Timeline

### Week 1: Database Foundation

- ✅ Create sales channels table
- ✅ Create price lists table
- ✅ Create menu_item_channel_prices table
- ✅ Create pricing rules table
- ✅ Extend orders table for channel tracking
- ✅ Create helper functions (get_effective_price)
- ✅ Seed initial channels (pos_dinein, gobiz, grabfood)

### Week 2: Channel Pricing UI

- ✅ Create channelsStore (Pinia)
- ✅ Create ChannelsView.vue (/settings/channels)
- ✅ Build ChannelCard component
- ✅ Enhance MenuItemEditor with channel prices tab
- ✅ Build ChannelPriceEditor component
- ✅ Add bulk price actions

### Week 3: Dynamic Pricing Engine

- ✅ Create DynamicPricingService
- ✅ Create PricingScheduler
- ✅ Create pricingRulesStore
- ✅ Build DynamicPricingView.vue
- ✅ Build PricingRuleWizard
- ✅ Integrate scheduler into appInitializer
- ✅ Test with mock kitchen load data

### Week 4: GoBiz Integration

- ✅ Create GoBizClient
- ✅ Create GoBizAuth (OAuth 2.0)
- ✅ Create MenuSyncService
- ✅ Create PriceSyncService
- ✅ Test menu sync to sandbox
- ✅ Test price updates
- ✅ Add platform_sync_log tracking

### Week 5: GrabFood Integration

- ✅ Research GrabFood API
- ✅ Create GrabClient
- ✅ Create IDeliveryPlatform interface
- ✅ Refactor GoBiz to use interface
- ✅ Create PlatformManager
- ✅ Test multi-platform sync

### Week 6: Analytics & Monitoring

- ✅ Create ChannelsAnalytics view
- ✅ Build revenue comparison charts
- ✅ Create PricingMonitor view
- ✅ Build price change timeline
- ✅ Create SyncStatusMonitor component
- ✅ Add real-time sync updates
- ✅ Final integration testing

---

## Key Design Decisions

### 1. Price Storage Strategy

**Decision:** Store both base prices and channel-specific overrides

**Rationale:**

- Flexibility: Some items may need exact prices (Rp 30,000), not just percentages
- Performance: Pre-calculated prices faster than runtime markup calculation
- Audit: Easy to track price history per channel

**Trade-off:** More storage, but better query performance

### 2. Dynamic Pricing Approach

**Decision:** Background job (5-minute interval) instead of real-time

**Rationale:**

- Platform API limits: Avoid excessive API calls
- Predictability: Changes happen at defined intervals
- Performance: Don't block UI operations
- Cost: Reduce API usage fees

**Trade-off:** Slight delay (max 5 min) in price adjustments

### 3. Menu Sync Strategy

**Decision:** Full catalog push instead of incremental updates (Phase 1)

**Rationale:**

- Simplicity: Easier to implement and debug
- Reliability: No drift between local and platform state
- GoBiz API design: PUT /catalog designed for full sync

**Future:** Add incremental sync in Phase 2 for better performance

### 4. Platform Abstraction

**Decision:** Common interface (IDeliveryPlatform) for all platforms

**Rationale:**

- DRY: Reuse sync logic across platforms
- Scalability: Easy to add ShopeeFood, FoodPanda, etc.
- Testing: Mock implementations for unit tests

### 5. Order Source Tracking

**Decision:** Add source_channel to orders, keep existing order types

**Rationale:**

- Backward compatibility: Don't break existing POS logic
- Granularity: Differentiate GoFood delivery vs. POS delivery
- Analytics: Channel-specific revenue tracking

---

## Testing Strategy

### Unit Tests

- ✅ DynamicPricingService rule evaluation
- ✅ GoBizClient API calls (mocked)
- ✅ MenuSyncService data transformation
- ✅ Price calculation functions

### Integration Tests

- ✅ End-to-end menu sync flow
- ✅ Price update propagation (local → GoBiz → Grab)
- ✅ Dynamic pricing scheduler execution
- ✅ Multi-channel order creation

### Manual Testing Checklist

- [ ] Create menu item with channel prices
- [ ] Trigger kitchen load rule (create 20+ orders)
- [ ] Verify prices updated on GoBiz
- [ ] Create GoFood order manually (via platform tablet)
- [ ] Verify order appears in analytics with correct channel
- [ ] Test price change audit log
- [ ] Test sync error handling (invalid credentials)

---

## Risk Mitigation

### Risk 1: GoBiz API Rate Limits

**Mitigation:**

- Implement exponential backoff
- Queue price updates (batch every 5 minutes)
- Monitor sync logs for 429 errors
- Add circuit breaker pattern

### Risk 2: Price Sync Failures

**Mitigation:**

- Retry logic (3 attempts)
- Alert admins on persistent failures
- Manual sync trigger in UI
- Fallback to base prices on error

### Risk 3: Platform Commission Changes

**Mitigation:**

- Store commission rate in database (not hardcoded)
- Admin UI to update commission rates
- Historical commission tracking
- Price recalculation on commission change

### Risk 4: Inventory Sync Lag

**Mitigation:**

- Real-time stock updates (not batched)
- Webhook from storage system
- Conservative stock thresholds (disable at 5% instead of 0%)

---

## Success Metrics

### Phase 1-2 (Database + UI)

- ✅ All migrations applied successfully
- ✅ Can set channel-specific prices for 100% of menu items
- ✅ Channel prices display correctly in MenuItemEditor

### Phase 3 (Dynamic Pricing)

- ✅ Pricing scheduler runs every 5 minutes
- ✅ Kitchen load rule triggers correctly (>15 orders)
- ✅ Inventory rule triggers correctly (<20% stock)
- ✅ Price change log captures all adjustments

### Phase 4-5 (Platform Integration)

- ✅ Successful menu sync to GoBiz (0 errors)
- ✅ Successful menu sync to GrabFood (0 errors)
- ✅ Price updates propagate within 5 minutes
- ✅ Stock updates propagate in real-time

### Phase 6 (Analytics)

- ✅ Channel analytics show correct revenue breakdown
- ✅ Platform fees calculated accurately
- ✅ Pricing monitor shows real-time price changes
- ✅ Sync status updates in real-time

### Business KPIs (After Launch)

- 📊 Delivery channel revenue (target: +30% in 3 months)
- 📊 Platform commission ROI (net revenue > costs)
- 📊 Dynamic pricing effectiveness (revenue increase during low-demand periods)
- 📊 Order volume from delivery platforms (target: 40% of total orders)

---

## Future Enhancements (Post-Phase 6)

### Phase 7: Order Automation

- Webhook handlers for incoming GoFood/Grab orders
- Auto-create orders in POS system
- Kitchen display integration
- Order status sync (cooking → ready → delivered)

### Phase 8: Advanced Analytics

- Customer behavior analysis per channel
- Peak hours identification per platform
- Menu item performance by channel
- Price elasticity analysis

### Phase 9: AI-Powered Pricing

- Machine learning model for optimal pricing
- Demand forecasting
- Competitor price monitoring
- Seasonal price adjustments

### Phase 10: Additional Platforms

- ShopeeFood integration
- FoodPanda integration
- Direct ordering (web/mobile app)
- WhatsApp ordering bot

---

## Next Steps After Plan Approval

1. **Week 1 Kickoff:**

   - Review and approve database schema
   - Create migration files (020-024)
   - Run migrations on dev database
   - Seed initial channels data

2. **Setup GoBiz Developer Account:**

   - Register merchant on GoBiz Developer Portal
   - Obtain OAuth credentials (client_id, client_secret)
   - Get outlet_id from merchant dashboard
   - Test OAuth flow in Postman

3. **Setup GrabFood Account:**

   - Research Grab Merchant API access
   - Register as developer
   - Obtain API credentials

4. **Development Environment:**

   - Add environment variables to `.env.development`
   - Create `.env.integrations` for sensitive credentials
   - Update `.gitignore` to exclude credentials

5. **Team Alignment:**
   - Share this plan with team
   - Assign tasks per week
   - Setup weekly sync meetings
   - Create project board (GitHub/Trello)

---

## Questions for Clarification

1. **GoBiz Account Status:**

   - Do you already have a GoBiz merchant account?
   - Do you have access to GoBiz Developer Portal?
   - What is your current outlet_id?

2. **Pricing Strategy Confirmation:**

   - Confirm +20% markup for delivery platforms?
   - Should markup apply to all items or specific categories?
   - Different markups for GoFood vs GrabFood?

3. **Dynamic Pricing Thresholds:**

   - Kitchen load threshold: 15 active orders good?
   - Inventory threshold: <20% stock good?
   - Price adjustment magnitude: +10% for high load?

4. **Deployment Timeline:**
   - Can we commit 6 weeks for full implementation?
   - Prefer phased rollout (GoBiz first, then Grab)?
   - Beta test period before production launch?

---

**Total Estimated Effort:** 6 weeks (1 developer full-time)
**Priority:** High (revenue growth opportunity)
**Risk Level:** Medium (external API dependencies)
**ROI:** High (30%+ revenue increase projected)
