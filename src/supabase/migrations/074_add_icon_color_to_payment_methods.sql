-- Migration: 074_add_icon_color_to_payment_methods
-- Description: Add icon_color column for customizing payment method icon colors in POS UI
-- Date: 2025-12-23

-- Add icon_color column (nullable, stores Vuetify color name like 'primary', 'success', '#FF5733')
ALTER TABLE payment_methods
ADD COLUMN IF NOT EXISTS icon_color TEXT DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN payment_methods.icon_color IS 'Icon color for POS UI. Can be Vuetify color name (primary, success, warning) or hex color (#FF5733)';
