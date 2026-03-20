import os

def build_ui():
    # Paths
    ui_path = 'src/ui.html'
    lib_path = 'src/lib/echarts.min.js'
    dist_path = 'dist/ui.html'
    
    # Read HTML
    with open(ui_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
        
    # Read ECharts Library
    try:
        with open(lib_path, 'r', encoding='utf-8') as f:
            echarts_content = f.read()
    except FileNotFoundError:
        print(f"Error: {lib_path} not found.")
        return

    # Replace the CDN script tag with inline script
    # The tag to look for:
    target_tag = '<script src="https://cdnjs.cloudflare.com/ajax/libs/echarts/5.5.0/echarts.min.js"></script>'
    
    if target_tag in html_content:
        # Inline the script
        new_content = html_content.replace(target_tag, f'<script>\n{echarts_content}\n</script>')
        print("Inlined ECharts library.")
    else:
        print("Warning: Target script tag not found in UI.html. Checking for local path...")
        # Fallback check for the old local path if I reverted it or user changed it
        local_tag = '<script src="lib/echarts.min.js"></script>'
        if local_tag in html_content:
             new_content = html_content.replace(local_tag, f'<script>\n{echarts_content}\n</script>')
             print("Inlined ECharts library (from local tag).")
        else:
             print("Error: Could not find script tag to replace.")
             new_content = html_content

    # Ensure dist directory exists
    os.makedirs(os.path.dirname(dist_path), exist_ok=True)

    # Write to dist
    with open(dist_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print(f"Successfully built {dist_path}")

if __name__ == "__main__":
    build_ui()
