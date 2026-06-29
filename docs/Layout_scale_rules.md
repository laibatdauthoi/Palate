# Palate Layout Scale Rules

## Purpose

The approved Home layout is the reference composition. New UI work must preserve relative widget size, spacing, and position across viewport sizes and browser zoom by using the shared layout scale system.

## Current Scale Foundation

The current layout scale foundation is:

- `frontend/components/layout_scale_controller.tsx`
- root CSS variables:
  - `--viewport-width`
  - `--viewport-height`
  - `--layout-design-width`
  - `--layout-design-height`
  - `--ui-scale`
  - `--safe-gutter-x`
  - `--safe-gutter-y`
- calibrated reference viewport:
  - `1280 x 678`

At the approved reference viewport:

- `--ui-scale` must be `1`

Background and decorative layers may cover the full viewport, but structural widgets must preserve reference proportions through scale-aware tokens.

## Core Rule

Any new UI element, layout change, card change, page section, widget, or spacing change must be mapped to the layout scale system before implementation.

## Mandatory Process For Future UI Tasks

Before changing UI layout, Codex must:

1. Identify whether the change affects layout, spacing, sizing, positioning, grid, card, modal, sidebar, or button dimensions.
2. If yes, identify the existing scale token that should control it.
3. If no existing token fits, propose a new token.
4. The new token must map to the current approved value at `--ui-scale: 1`.
5. The token must use `--ui-scale` only if it affects structural layout.
6. The implementation must preserve the approved reference layout at scale 1.
7. Codex must report a scale mapping table.

### Required Scale Mapping Table Format

For every layout-sensitive change, report:

- UI element
- current approved value at scale 1
- token used
- scaled formula
- selectors/components affected
- confirmation scale 1 parity is preserved

Example:

- Sidebar width
  - scale 1 value: `260px`
  - token: `--sidebar-width-scaled`
  - formula: `calc(260px * var(--ui-scale))`
  - selector: `.app_shell`
  - scale 1 parity: unchanged

## Forbidden Layout Patterns

Codex must not introduce these in structural layout unless explicitly approved by the user:

- random hardcoded layout px values
- new fixed card widths without scale mapping
- new fixed card heights without scale mapping
- `justify-content: space-between` for primary card grids
- fake fixed item counts as the main layout solution
- stretching cards to fill leftover viewport width
- broad global selector changes that affect multiple card types unintentionally
- independent widget scaling outside `--ui-scale`
- `width: 100vw` inside the main app region
- left-only layout offsets unless they are mapped to a scale token
- new page-specific `max-width + margin auto` layout wrappers that bypass the scale system
- global `transform: scale()` for the app shell
- UI changes that alter scale 1 layout without explicitly reporting it

## Required Behavior For New Widgets

When adding a new widget:

1. It must declare which layout region it belongs to:
   - sidebar
   - main shell
   - Home/page frame
   - card grid
   - card internal layout
   - modal/viewer
   - action row/button group
2. It must use the region’s existing scale tokens where possible.
3. If it needs new spacing or size, add a named token instead of hardcoding.
4. The token must preserve the approved reference layout at `--ui-scale: 1`.
5. The widget must not push unrelated siblings out of position.
6. The widget must be tested at:
   - approved reference viewport
   - one larger viewport
   - one zoomed-in or smaller viewport

## Required Behavior For Modifying Existing UI

When modifying existing UI:

1. Do not change card/grid/sidebar/button dimensions unless the task explicitly asks.
2. If a visual change affects only color, border, glow, or surface, do not touch layout tokens.
3. If a change affects layout, map it to a scale token.
4. Preserve approved audio fixes:
   - Waiting Push audio background fix
   - Match audio badge size fix
   - Match audio text cleanup
5. Preserve approved button fixes:
   - Challenge full label and width
   - Settle size/color/effect
   - existing hover scale unless explicitly changed
6. Preserve Home public polling/revalidation and all business logic.

## Stage Discipline

Layout migration must be staged:

- Stage changes must be small and reviewable.
- One stage should touch only one layer:
  - shell/sidebar/main
  - page frame
  - grid distribution
  - card size
  - card internals
  - modals/viewers
- Do not combine card scaling, grid changes, sidebar changes, and button changes in one task.
- Every stage must be revertible with a small diff.
- Every stage must pass lint/build.
- Every stage must report whether scale 1 parity is preserved.

## Testing Requirements

For layout-sensitive UI tasks, Codex must report:

- `git diff --stat`
- whether card/grid selectors changed
- whether scale tokens changed
- whether scale 1 layout is preserved
- whether card width/height changed
- whether button dimensions changed
- whether business logic changed

Runtime verification should use:

- approved reference viewport: `1280 x 678`
- larger viewport: `1920 x 1080`
- optional ultrawide: `2560 x 1440` or `3440 x 1440`
- zoomed/narrow check if relevant
