# Figma UI Agent Plugin

This is a Figma plugin built with React, TypeScript, and Vite.

## Getting Started

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Build the plugin:**
    ```bash
    npm run build
    ```
    To watch for changes during development:
    ```bash
    npm run watch
    ```

3.  **Load in Figma:**
    - Open Figma and go to **Plugins** > **Development** > **Import plugin from manifest...**
    - Select the `manifest.json` file in this directory.

## Project Structure

- `src/code.ts`: The main plugin logic (runs in the plugin sandbox).
- `src/ui.tsx`: The React UI entry point.
- `src/App.tsx`: The main React component.
- `src/ui.html`: The HTML template for the UI.
- `vite.config.ts`: Vite configuration for bundling the UI.
- `manifest.json`: Figma plugin manifest.

## Development

- Run `npm run watch` to automatically rebuild when you make changes.
- In Figma, use **Plugins** > **Development** > **Run Last Plugin** to reload quickly.

## Documentation

- Chinese docs index (single entry): [docs/README_CN.md](/Users/bytedance/Desktop/figmaUIagent/docs/README_CN.md)
- AI runtime single-file spec: [docs/ai/AI_RUNTIME_SPEC_CODING_CN.md](/Users/bytedance/Desktop/figmaUIagent/docs/ai/AI_RUNTIME_SPEC_CODING_CN.md)
