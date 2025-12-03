#!/usr/bin/env python3
"""
Add ON CONFLICT (code) DO NOTHING to products, preparations, and recipes
"""

import re

# Read the file
file_path = '/Users/peaker/dev/kitchen-app/backoffice/src/data-migration/sql/test_3_recipes_full_chain.sql'
with open(file_path, 'r') as f:
    content = f.read()

# Add ON CONFLICT to products INSERT statements
# Pattern: VALUES (...);  followed by newline
# Replace with: VALUES (...);\nON CONFLICT (code) DO NOTHING;

# For products
content = re.sub(
    r"(INSERT INTO products \(code,.*?VALUES \([^;]+\));(\n)",
    r"\1\nON CONFLICT (code) DO NOTHING;\2",
    content,
    flags=re.DOTALL
)

# For preparations
content = re.sub(
    r"(INSERT INTO preparations \(code,.*?VALUES \([^;]+\));(\n)",
    r"\1\nON CONFLICT (code) DO NOTHING;\2",
    content,
    flags=re.DOTALL
)

# For recipes
content = re.sub(
    r"(INSERT INTO recipes \(code,.*?VALUES \([^;]+\));(\n)",
    r"\1\nON CONFLICT (code) DO NOTHING;\2",
    content,
    flags=re.DOTALL
)

# Write back
with open(file_path, 'w') as f:
    f.write(content)

print(f"✅ Added ON CONFLICT (code) DO NOTHING to {file_path}")
