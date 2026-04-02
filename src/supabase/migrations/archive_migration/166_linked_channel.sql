-- Migration: 166_linked_channel
-- Description: Add linked_channel_id to sales_channels for mirroring availability/pricing
-- Date: 2026-03-06

ALTER TABLE sales_channels
  ADD COLUMN linked_channel_id UUID REFERENCES sales_channels(id) ON DELETE SET NULL;

COMMENT ON COLUMN sales_channels.linked_channel_id IS 'When set, availability and pricing changes propagate to the linked channel (bidirectional)';
