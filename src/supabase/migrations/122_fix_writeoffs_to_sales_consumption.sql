-- Migration 122: Fix writeoffs to use sales_consumption (not production_consumption)
-- Write-offs = actual sales write-offs (for comparison with theoretical Sales)
-- Loss = expired, spoiled, other + negative corrections
-- Version: v4.7

-- NOTE: Full function definition applied via MCP
-- Key change: writeoffs now uses 'sales_consumption' instead of 'production_consumption'
