-- Migration 005: Update products table to match Product interface
-- Date: 2025-11-17
-- Purpose: Align Supabase products schema with src/stores/productsStore/types.ts Product interface
--
-- IMPORTANT: Always check the TypeScript interface FIRST before creating/updating tables!
-- Interface location: src/stores/productsStore/types.ts

-- ============================================================================
-- STEP 1: Add missing columns to products table
-- ============================================================================

-- Add baseUnit (required field in Product interface)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS base_unit TEXT CHECK (base_unit IN ('gram', 'ml', 'piece'));

-- Add baseCostPerUnit (required field in Product interface)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS base_cost_per_unit DECIMAL(10, 2);

-- Add yieldPercentage (required field in Product interface)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS yield_percentage INTEGER DEFAULT 100;

-- Add canBeSold (required field in Product interface)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS can_be_sold BOOLEAN DEFAULT false;

-- Add usedInDepartments (required field in Product interface)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS used_in_departments TEXT[] DEFAULT ARRAY['kitchen'];

-- Add optional fields from Product interface
ALTER TABLE products
ADD COLUMN IF NOT EXISTS storage_conditions TEXT,
ADD COLUMN IF NOT EXISTS shelf_life INTEGER,
ADD COLUMN IF NOT EXISTS max_stock DECIMAL(10, 3),
ADD COLUMN IF NOT EXISTS name_en TEXT,
ADD COLUMN IF NOT EXISTS lead_time_days INTEGER,
ADD COLUMN IF NOT EXISTS primary_supplier_id TEXT;

-- Add packageOptions reference (will be separate table, but add reference column)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS recommended_package_id TEXT;

-- ============================================================================
-- STEP 2: Update existing data to populate new required fields
-- ============================================================================

-- Set base_unit from existing unit field (map common units)
UPDATE products
SET base_unit = CASE
  WHEN unit IN ('kg', 'gram') THEN 'gram'
  WHEN unit IN ('liter', 'ml') THEN 'ml'
  WHEN unit IN ('piece', 'pcs', 'pack') THEN 'piece'
  ELSE 'piece' -- default
END
WHERE base_unit IS NULL;

-- Set base_cost_per_unit from cost field
UPDATE products
SET base_cost_per_unit = cost
WHERE base_cost_per_unit IS NULL;

-- Set name_en from name if not set
UPDATE products
SET name_en = name
WHERE name_en IS NULL;

-- ============================================================================
-- STEP 3: Create package_options table (Product.packageOptions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS package_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Package description
  package_name TEXT NOT NULL,  -- "Pack 100g", "Bottle 1L", "Box 24pcs"
  package_size DECIMAL(10, 3) NOT NULL,  -- Quantity in base units
  package_unit TEXT NOT NULL,  -- 'pack', 'bottle', 'box', etc.
  brand_name TEXT,  -- "Anchor", "Local Brand"

  -- Pricing
  package_price DECIMAL(10, 2),  -- Price per package (IDR)
  base_cost_per_unit DECIMAL(10, 2) NOT NULL,  -- Reference price per base unit (IDR)

  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for package_options
CREATE INDEX idx_package_options_product_id ON package_options(product_id);
CREATE INDEX idx_package_options_is_active ON package_options(is_active);

-- Enable RLS on package_options
ALTER TABLE package_options ENABLE ROW LEVEL SECURITY;

-- RLS Policy for package_options (same as products - all authenticated users)
CREATE POLICY "Enable read access for all authenticated users" ON package_options
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON package_options
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON package_options
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users" ON package_options
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================================
-- STEP 4: Make base_unit and base_cost_per_unit NOT NULL after populating
-- ============================================================================

-- Now that we've populated the data, make them required
ALTER TABLE products
ALTER COLUMN base_unit SET NOT NULL;

ALTER TABLE products
ALTER COLUMN base_cost_per_unit SET NOT NULL;

-- ============================================================================
-- STEP 5: Add indexes for new columns
-- ============================================================================

CREATE INDEX idx_products_base_unit ON products(base_unit);
CREATE INDEX idx_products_can_be_sold ON products(can_be_sold);
CREATE INDEX idx_products_used_in_departments ON products USING GIN(used_in_departments);

-- ============================================================================
-- STEP 6: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE products IS 'Product catalog matching Product interface from src/stores/productsStore/types.ts';
COMMENT ON COLUMN products.base_unit IS 'Base unit for calculations: gram, ml, or piece';
COMMENT ON COLUMN products.base_cost_per_unit IS 'Cost per base unit (IDR per gram/ml/piece)';
COMMENT ON COLUMN products.yield_percentage IS 'Yield percentage after processing (0-100)';
COMMENT ON COLUMN products.can_be_sold IS 'Whether product can be sold directly (not just used in recipes)';
COMMENT ON COLUMN products.used_in_departments IS 'Departments using this product: kitchen, bar, or both';

COMMENT ON TABLE package_options IS 'Package options for products (Product.packageOptions array)';
COMMENT ON COLUMN package_options.package_size IS 'Quantity of base units in this package';
COMMENT ON COLUMN package_options.base_cost_per_unit IS 'Reference cost per base unit for this package';

-- ============================================================================
-- Migration complete!
-- ============================================================================
