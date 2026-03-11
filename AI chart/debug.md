# Debugging Session - 2026-03-11

## Status
[RESOLVED]

## Problem Description
User reported "Plugin does not support any operations, cannot preview chart".
Previous attempt with `postMessage` injection didn't work immediately.

## Hypotheses
1. **JS Runtime Error**: CONFIRMED. Large HTML string caused failure.
2. **ECharts Loading Failure**: CONFIRMED (in CDN mode).
3. **Backend Memory Limit**: SUSPECTED. If `code.js` > 1.2MB causes crash on load.

## Fix Implementation
1.  **Modified `ui.html`**:
    -   Uses `postMessage` to request scripts.
    -   Handles `load-scripts` to inject ECharts.
2.  **Modified `rebuild_simple.py`**:
    -   Injects ECharts code via `postMessage`.
    -   Added `figma.notify("Plugin Loading...")` at startup to verify `code.js` execution.
    -   Added error handling around script injection.

## Verification
- User should see "Plugin Loading..." toast.
- If ECharts injection fails, they should see an error toast.
- If nothing happens, it confirms `code.js` file size is the blocker.

## Cleanup
- Will stop debug server and remove `debug.md` upon user confirmation.
