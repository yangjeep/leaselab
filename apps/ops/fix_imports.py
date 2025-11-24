#!/usr/bin/env python3
import os
import re

def fix_imports(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    original = content
    
    # Replace all instances of @remix-run/cloudflare with @remix-run/node
    content = content.replace("'@remix-run/cloudflare'", "'@remix-run/node'")
    content = content.replace('"@remix-run/cloudflare"', '"@remix-run/node"')
    
    # If the file has changed, write it back
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        return True
    return False

# Process all route files
routes_dir = '/Users/yangjeep/ws/yangjeep/leaselab2/apps/ops/app/routes'
fixed_count = 0

for filename in os.listdir(routes_dir):
    if filename.endswith('.tsx'):
        filepath = os.path.join(routes_dir, filename)
        if fix_imports(filepath):
            fixed_count += 1

# Also fix root.tsx and components
other_files = [
    '/Users/yangjeep/ws/yangjeep/leaselab2/apps/ops/app/root.tsx',
]

for filepath in other_files:
    if os.path.exists(filepath):
        if fix_imports(filepath):
            fixed_count += 1

print(f"Fixed {fixed_count} files")
