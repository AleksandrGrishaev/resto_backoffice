#!/usr/bin/env python3
"""
Script to replace WHERE code = 'X' with WHERE name = 'Y' in test migration
"""

import re

# Read the file
file_path = '/Users/peaker/dev/kitchen-app/backoffice/src/data-migration/sql/test_3_recipes_full_chain.sql'
with open(file_path, 'r') as f:
    content = f.read()

# Extract mappings from INSERT statements
# Products: ('Water', 'Water', 0.00, 'ml', 'ml', ...)
# First value after opening paren is the name

product_names = []
prep_names = []
recipe_names = []

# Extract product names (first value in VALUES clause after INSERT INTO products)
product_pattern = r"INSERT INTO products[^(]+VALUES\s*\n\s*\('([^']+)',"
for match in re.finditer(product_pattern, content):
    product_names.append(match.group(1))

# Extract preparation names
prep_pattern = r"INSERT INTO preparations[^(]+VALUES\s*\n\s*\('([^']+)',"
for match in re.finditer(prep_pattern, content):
    prep_names.append(match.group(1))

# Extract recipe names
recipe_pattern = r"INSERT INTO recipes[^(]+VALUES\s*\n\s*\('([^']+)',"
for match in re.finditer(recipe_pattern, content):
    recipe_names.append(match.group(1))

print(f"Found {len(product_names)} products")
print(f"Found {len(prep_names)} preparations")
print(f"Found {len(recipe_names)} recipes")
print()

# Now replace WHERE code = 'X' with WHERE name = 'Y'
# We need to determine which table based on context

def replace_code_with_name(match):
    """Replace WHERE code = 'X' with appropriate WHERE name = 'Y'"""
    code = match.group(1)
    table = match.group(2) if len(match.groups()) > 1 else None

    # Determine the name based on code prefix
    if code.startswith('R-'):
        # Recipe code
        recipe_num = int(code.split('-')[1])
        if recipe_num == 1:
            return f"WHERE name = 'Tuna steak'"
        elif recipe_num == 7:
            return f"WHERE name = 'TomYum'"
        elif recipe_num == 30:
            return f"WHERE name = 'Aus beef chiabatta'"
    elif code.startswith('P-'):
        # Preparation code - need to extract from the preparation list
        prep_map = {
            'P-1': 'MushPotato',
            'P-2': 'Holondaise basil',
            'P-3': 'Concase',
            'P-16': 'Tuna portion 150g',
            'P-20': 'Shrimp thawed 4pc',
            'P-21': 'Squid rings thawed 70g',
            'P-23': 'Beef slices 88g',
            'P-28': 'Mushroom sliced',
            'P-33': 'Eggplant slices grilled'
        }
        if code in prep_map:
            return f"WHERE name = '{prep_map[code]}'"
    else:
        # Product code
        product_map = {
            'A-1': 'Water',
            'B-3': 'SourDough bread',
            'C-4': 'Santal kara (Coconut milk)',
            'C-9': 'Apple vinegar',
            'C-13': 'Honey',
            'C-19': 'Soy souce',
            'C-20': 'Oyster souce',
            'D-1': 'Fresh milk',
            'D-3': 'Cream cheese',
            'D-6': 'Ricotta cheese',
            'D-9': 'Unsalted butter',
            'H-2': 'Oregano',
            'H-5': 'Black pepper crash',
            'H-7': 'Thyme',
            'M-1': 'Beef sliced',
            'M-2': 'Tuna lion',
            'M-9': 'Udang',
            'M-10': 'Cumi',
            'O-5': 'Musted',
            'O-10': 'Tomato paste',
            'O-11': 'Tom yam paste',
            'S-20': 'Rice',
            'V-1': 'Telur',
            'V-2': 'Jamur',
            'V-3': 'Kentang (potato)',
            'V-7': 'Broccoly',
            'V-12': 'Basil leaf',
            'V-13': 'Coriander leaf',
            'V-25': 'Kacang bujang (beans)',
            'V-26': 'Tomato local',
            'V-27': 'Garlic',
            'V-28': 'Terong (Egg plane)',
            'V-29': 'Onion',
            'V-30': 'Ginger',
            'V-31': 'Sereh (Lemon grass)',
            'V-32': 'Kefir leaf',
            'V-35': 'Lemon',
            'V-44': 'Rosmarin'
        }
        if code in product_map:
            return f"WHERE name = '{product_map[code]}'"

    # Fallback - keep as is
    return match.group(0)

# Replace all WHERE code = 'X' patterns
content = re.sub(r"WHERE code = '([^']+)'", replace_code_with_name, content)

# Write back
with open(file_path, 'w') as f:
    f.write(content)

print("✅ Replaced all WHERE code = 'X' with WHERE name = 'Y'")
print(f"✅ Updated {file_path}")
