# Read TypeScript file
with open('src/code.ts', 'r', encoding='utf-8') as f:
    ts_content = f.read()

# Simple conversion - just remove type annotations carefully
js_content = ts_content

# Remove function parameter types
import re

# Remove : type from function parameters
js_content = re.sub(r':\s*any(?=[,)\n])', '', js_content)
js_content = re.sub(r':\s*string(?=[,)\n])', '', js_content)
js_content = re.sub(r':\s*number(?=[,)\n])', '', js_content)
js_content = re.sub(r':\s*boolean(?=[,)\n])', '', js_content)

# Remove generic type brackets like <...>
# But be careful with regex patterns
js_content = re.sub(r'<[^>]*>', '', js_content)

# Write JavaScript file
with open('dist/code.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print('Successfully converted TypeScript to JavaScript!')
