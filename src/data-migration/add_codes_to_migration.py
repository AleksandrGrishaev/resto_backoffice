#!/usr/bin/env python3
"""
Add code fields to test migration based on comments
"""

import re

# Read the file
file_path = '/Users/peaker/dev/kitchen-app/backoffice/src/data-migration/sql/test_3_recipes_full_chain.sql'
with open(file_path, 'r') as f:
    lines = f.readlines()

# Process line by line
output_lines = []
current_code = None

for i, line in enumerate(lines):
    # Check if this is a comment with code (e.g., "-- A-1: Water")
    comment_match = re.match(r'^-- ([A-Z]+-\d+|[PR]-\d+):', line)
    if comment_match:
        current_code = comment_match.group(1)
        output_lines.append(line)
        continue

    # Check if this is a products INSERT
    if 'INSERT INTO products (code, name,' in line:
        # Already has code field
        output_lines.append(line)
        continue
    elif 'INSERT INTO products (name,' in line and current_code:
        # Add code field
        new_line = line.replace('INSERT INTO products (name,', 'INSERT INTO products (code, name,')
        output_lines.append(new_line)
        continue

    # Check if this is a preparations INSERT
    if 'INSERT INTO preparations (name,' in line and current_code:
        # Add code field
        new_line = line.replace('INSERT INTO preparations (name,', 'INSERT INTO preparations (code, name,')
        output_lines.append(new_line)
        continue

    # Check if this is a recipes INSERT
    if 'INSERT INTO recipes (name,' in line and current_code:
        # Add code field
        new_line = line.replace('INSERT INTO recipes (name,', 'INSERT INTO recipes (code, name,')
        output_lines.append(new_line)
        continue

    # Check if this is a VALUES line with product/prep/recipe name
    if 'VALUES (' in line and current_code:
        # Check if it already has the code
        if re.match(r"VALUES \('[A-Z]+-\d+',", line.strip()) or re.match(r"VALUES \('[PR]-\d+',", line.strip()):
            # Already has code
            output_lines.append(line)
            continue

        # Add code to VALUES
        # VALUES ('Water', 'Water', 0.00,
        # becomes
        # VALUES ('A-1', 'Water', 'Water', 0.00,
        new_line = line.replace("VALUES ('", f"VALUES ('{current_code}', '")
        output_lines.append(new_line)

        # Reset code after using it
        current_code = None
        continue

    # Default: keep line as is
    output_lines.append(line)

# Write back
with open(file_path, 'w') as f:
    f.writelines(output_lines)

print(f"✅ Added code fields to {file_path}")
print("✅ Updated products, preparations, and recipes with codes from comments")
