#!/usr/bin/env python3
import sys

file_path = '/workspaces/invosafi/telegram-bot/src/handlers.ts'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace U+2019 (curly/smart quote) with U+0027 (straight apostrophe)
new_content = content.replace('\u2019', "'")

# Count replacements
count = content.count('\u2019')
print(f"Replaced {count} smart quotes with straight apostrophes")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("File updated successfully")
