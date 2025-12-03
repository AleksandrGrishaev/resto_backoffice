#!/usr/bin/env python3
"""
Add ON CONFLICT DO NOTHING to preparation_ingredients and recipe_components
"""

import re

# Read the file
file_path = '/Users/peaker/dev/kitchen-app/backoffice/src/data-migration/sql/test_3_recipes_full_chain.sql'
with open(file_path, 'r') as f:
    content = f.read()

# Add ON CONFLICT to preparation_ingredients
# Pattern: INSERT INTO preparation_ingredients (...) VALUES (...);
# Replace with: INSERT INTO preparation_ingredients (...) VALUES (...) ON CONFLICT DO NOTHING;

content = re.sub(
    r"(INSERT INTO preparation_ingredients \([^)]+\)\nVALUES\n[^;]+);",
    r"\1\nON CONFLICT DO NOTHING;",
    content,
    flags=re.MULTILINE
)

# Add ON CONFLICT to recipe_components
content = re.sub(
    r"(INSERT INTO recipe_components \([^)]+\)\nVALUES \([^;]+\));",
    r"\1\nON CONFLICT DO NOTHING;",
    content,
    flags=re.MULTILINE
)

# Write back
with open(file_path, 'w') as f:
    f.write(content)

print(f"✅ Added ON CONFLICT DO NOTHING to preparation_ingredients and recipe_components")
