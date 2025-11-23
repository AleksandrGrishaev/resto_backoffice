#!/bin/bash
# Apply users table migration to Supabase
# Usage: ./scripts/apply-migration.sh

set -e

echo "🚀 Applying users table migration to Supabase..."
echo ""

# Check if migration file exists
MIGRATION_FILE="src/supabase/migrations/007_create_users_table.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Migration file: $MIGRATION_FILE"
echo "📊 Lines: $(wc -l < $MIGRATION_FILE)"
echo ""

# Method 1: Using Supabase CLI (requires supabase link)
if command -v supabase &> /dev/null; then
    echo "🔧 Method 1: Using Supabase CLI..."
    npx supabase db push --file $MIGRATION_FILE
    echo "✅ Migration applied via Supabase CLI"
    exit 0
fi

# Method 2: Manual instructions
echo "⚠️  Supabase CLI not available"
echo ""
echo "📋 Please apply migration manually:"
echo ""
echo "1. Go to Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/<your-project-id>/sql"
echo ""
echo "2. Open SQL Editor"
echo ""
echo "3. Copy and paste the contents of:"
echo "   $MIGRATION_FILE"
echo ""
echo "4. Click 'Run' button"
echo ""
echo "Or use this command if you have database credentials:"
echo "  psql <YOUR_DATABASE_URL> < $MIGRATION_FILE"
echo ""

# Show migration preview
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Migration Preview (first 20 lines):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
head -20 $MIGRATION_FILE
echo "..."
echo ""
echo "Full migration: $MIGRATION_FILE"
