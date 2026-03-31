-- Migration: 274_claim_invite_copy_telegram_data
-- Description: Fix claim_invite to copy telegram_id and telegram_username from auth.users to customer
-- Date: 2026-03-31
--
-- CONTEXT: When a customer claims an invite via Telegram auth, the claim_invite RPC
-- was only copying email but not telegram_id/telegram_username. This left the customer
-- record without Telegram info even though the identity was linked.
-- Fixed in both ORDER and CUSTOMER invite flows.

-- See src/supabase/functions/claim_invite.sql for full source with comments.
