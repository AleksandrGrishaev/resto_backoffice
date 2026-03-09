-- Migration: 159_grant_ai_readonly_channel_profitability
-- Description: Grant ai_readonly SELECT on new view and updated table
-- Date: 2026-02-25

-- Grant SELECT on the channel profitability view
GRANT SELECT ON v_channel_profitability TO ai_readonly;
GRANT SELECT ON v_channel_profitability TO anon;
GRANT SELECT ON v_channel_profitability TO authenticated;

-- Grant SELECT on transaction_categories (includes new parent_id, channel_code columns)
GRANT SELECT ON transaction_categories TO ai_readonly;
