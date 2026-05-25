[OPEN] manual-merge-swap

# Problem

- Symptom: A manually merged table cell becomes a normal cell after changing cell type, and the merged height/state are lost.
- Expected: Changing cell type on a manually merged anchor should preserve merge metadata, merged height, hidden placeholders, and unmerge capability.

# Reproduction

1. Create or select a table with a manually merged body cell.
2. Select the merged cell in the canvas.
3. Change the cell type in the selection panel, such as from `Text` to `Avatar`.
4. Observe whether the merged state, height, and unmerge affordance are preserved.

# Hypotheses

| ID | Hypothesis | Likelihood | Effort | Expected Signal |
|----|------------|------------|--------|-----------------|
| A | The actual swapped node is not the merge anchor but an inner child node | High | Low | Logs show selection node id differs from resolved cell root / merge anchor |
| B | Merge metadata is not fully written back after swap | High | Low | Pre-swap has `merge-role` or hidden siblings, post-swap lacks corresponding metadata |
| C | Replacement or selection refresh points UI at a normal node after swap | Medium | Low | Post-swap selection id differs from replacement root / merge-role only exists on sibling or ancestor |
| D | Avatar rendering introduces layout/instance replacement that wipes merge metadata after initial restoration | Medium | Medium | Logs show metadata exists immediately after swap but disappears after follow-up sync/layout step |

# Plan

1. Start debug server for session `manual-merge-swap`.
2. Add instrumentation only around swap flow, replacement, and selection refresh.
3. Ask user to reproduce once and collect `pre-fix` logs.
4. Decide which hypothesis is confirmed before any business logic fix.

# Observation

- First reproduction produced no entries in `.dbg/trae-debug-log-manual-merge-swap.ndjson`.
- Current interpretation: the Figma runtime likely still uses an older plugin bundle, so the new instrumentation has not executed yet.

# Fix Draft

- Implemented a targeted fix in `src/code.ts`: when a swapped node is a manually merged anchor table cell, the swap path now preserves the existing cell root and only syncs the newly rendered table-cell frame content into that root.
- Reasoning: hidden placeholders keep referencing the same anchor node id, so merge structure should remain intact instead of being rebuilt through whole-node replacement.
- Instrumentation is retained for follow-up verification if another iteration is needed.
