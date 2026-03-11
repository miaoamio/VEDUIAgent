import json

def build_code_js():
    # Paths
    ui_dist_path = 'dist/ui.html'
    code_src_path = 'dist/code.js' # I wrote the logic here in previous turn
    code_dist_path = 'dist/code.js'
    
    # Read UI HTML
    try:
        with open(ui_dist_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
    except FileNotFoundError:
        print(f"Error: {ui_dist_path} not found. Run build_ui.py first.")
        return

    # Read JS Logic
    # Since I wrote the logic to dist/code.js in the previous turn, I will read it.
    # But wait, if I overwrite it, I lose it? 
    # Yes. I should have written it to src/code_logic.js or similar.
    # But currently dist/code.js HAS the logic.
    # So I read it, PREPEND the html variable, and write it back.
    
    try:
        with open(code_src_path, 'r', encoding='utf-8') as f:
            js_logic = f.read()
    except FileNotFoundError:
        print(f"Error: {code_src_path} not found.")
        return
        
    # Check if __html__ is already defined to avoid double injection
    if "const __html__ =" in js_logic:
        print("Warning: __html__ seems already defined. Skipping injection.")
        return

    # Escape HTML for JS string
    # We use json.dumps to get a valid string representation, including quotes
    html_string = json.dumps(html_content)
    
    # Prepend variable definition
    # Note: json.dumps includes surrounding double quotes "..."
    # We want: const __html__ = "...";
    
    new_js_content = f"const __html__ = {html_string};\n\n{js_logic}"
    
    # Write back
    with open(code_dist_path, 'w', encoding='utf-8') as f:
        f.write(new_js_content)
        
    print(f"Successfully injected HTML into {code_dist_path}")

if __name__ == "__main__":
    build_code_js()
