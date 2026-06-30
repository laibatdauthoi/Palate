# Palate Layout Scale Rules

## Purpose

The approved Home layout is the reference composition. UI must scale proportionally with the viewport without redesigning the app at the approved reference size.

This contract exists so:

- horizontal layout values scale from horizontal viewport pressure
- vertical layout values scale from vertical viewport pressure
- text, icons, buttons, radii, and small widget internals scale through shared policy tokens
- future widgets follow the same rules instead of introducing new fixed-size islands

## Current Scale Foundation

The runtime scale source is:

- [`frontend/components/layout_scale_controller.tsx`](../frontend/components/layout_scale_controller.tsx)

The controller writes these root variables:

- `--viewport-width`
- `--viewport-height`
- `--layout-design-width`
- `--layout-design-height`
- `--ui-scale-x`
- `--ui-scale-y`
- `--ui-scale-uniform`
- `--ui-scale`
- `--safe-gutter-x`
- `--safe-gutter-y`

It also sets:

- `data-layout-mode="desktop-fit"` when `viewport width >= 768`
- `data-layout-mode="mobile"` when `viewport width < 768`

Reference viewport:

- `1280 x 678`

At the approved reference viewport:

- `--ui-scale-x = 1`
- `--ui-scale-y = 1`
- `--ui-scale-uniform = 1`
- compatibility `--ui-scale = 1`

## Scale Policy

### 1. Structural layout values

Use axis-aware layout scale.

- inline / horizontal values:
  - width
  - min-width / max-width
  - left/right padding
  - left/right margin
  - column gap
  - x offset
  - horizontal grid track size
  - **must scale from `--ui-scale-x`**
- block / vertical values:
  - height
  - min-height / max-height
  - top/bottom padding
  - top/bottom margin
  - row gap
  - y offset
  - vertical media height
  - **must scale from `--ui-scale-y`**
- mixed / isotropic values:
  - round icon shells
  - balanced chips
  - generic compact controls that should not distort per-axis
  - **may scale from `--ui-scale-uniform` through policy tokens**

### 2. Text / icon / button / radius policy

Do not map typography or small controls directly to raw axis values unless there is a strong reason.

Use policy tokens in [`frontend/styles/globals.css`](../frontend/styles/globals.css):

- text:
  - `--text-scale`
  - `--text-scale-display`
  - `--text-scale-secondary`
  - `--font-size-display-large-scaled`
  - `--font-size-display-medium-scaled`
  - `--font-size-heading-1-scaled`
  - `--font-size-heading-2-scaled`
  - `--font-size-heading-3-scaled`
  - `--font-size-body-large-scaled`
  - `--font-size-caption-scaled`
  - `--font-size-body-small-scaled`
  - `--font-size-body-scaled`
  - `--font-size-label-scaled`
  - `--font-size-title-small-scaled`
  - `--font-size-title-scaled`
  - `--font-size-meta-scaled`
  - `--font-size-micro-scaled`
  - line-height policy:
    - `--line-height-solid`
    - `--line-height-tight`
    - `--line-height-snug`
    - `--line-height-body`
    - `--line-height-relaxed`
    - `--line-height-loose`
- buttons:
  - `--button-scale`
  - `--button-pad-x-scaled`
  - `--button-pad-y-scaled`
  - `--button-font-size-scaled`
  - `--button-radius-scaled`
  - `--button-icon-size-scaled`
  - compact/button-family variants such as:
    - `--button-compact-*`
    - `--button-card-main-*`
    - `--wallet-button-*`
- icons:
  - `--icon-scale`
  - `--icon-size-sm-scaled`
  - `--icon-size-md-scaled`
  - `--icon-size-lg-scaled`
  - `--icon-shell-sm-scaled`
  - `--icon-shell-md-scaled`
  - `--icon-shell-lg-scaled`
  - inline icon/text alignment:
    - `--inline-icon-gap-scaled`
    - `--inline-icon-offset-y`
- radius:
  - `--radius-scale`
  - `--radius-sm-scaled`
  - `--radius-md-scaled`
  - `--radius-lg-scaled`
  - `--radius-xl-scaled`
  - `--radius-pill-scaled`

### 3. Surface spacing policy

For small widget internals, prefer shared surface tokens instead of one-off hardcoded values:

- `--surface-pad-2xs-y-scaled`
- `--surface-pad-2xs-x-scaled`
- `--surface-pad-sm-y-scaled`
- `--surface-pad-sm-x-scaled`
- `--surface-gap-2xs-y-scaled`
- `--surface-gap-xs-x-scaled`
- `--surface-gap-xs-y-scaled`

Add new surface tokens only when an existing one does not match the approved scale-1 value.

### 4. Text scaling rules

Text must scale with the UI. It must not remain fixed while the rest of the interface scales.

At the same time, text must not scale blindly with raw viewport math.

Required policy:

- use clamped text scale tokens, not direct `calc(fontSize * var(--ui-scale-x))`
- important text may scale up and down, but must keep a readability floor
- secondary/meta text may scale down more aggressively than primary text
- display/headline text may use a dedicated scale band, separate from body/meta text
- line-height should be explicit for repeated text roles instead of ad hoc values everywhere

Practical rule:

- structural size changes use axis-aware scale
- typography uses clamped policy tokens built from `--ui-scale-uniform`

This prevents:

- unreadably tiny text on narrow desktop-fit layouts
- oversized text that breaks cards or modals on large viewports
- different pages inventing incompatible text scaling rules

### 5. Overflow rules

Text scaling must be paired with explicit overflow rules.

Required defaults:

- any flex/grid child that contains text should usually set `min-width: 0`
- long free text should use `overflow-wrap: anywhere` when horizontal overflow is possible
- single-line metadata should use:
  - `overflow: hidden`
  - `text-overflow: ellipsis`
  - `white-space: nowrap`
- multi-line descriptions may use line clamp where the component has a stable height budget
- text must not force card/widget width expansion
- button labels must stay on one line unless a component is explicitly designed for wrapping

Preferred usage by text type:

- free text/help/error/subtitle:
  - wrap safely
  - use `overflow-wrap: anywhere`
- metadata/chips/labels:
  - single-line ellipsis
- card titles:
  - single-line ellipsis or controlled line clamp
  - never uncontrolled wrap that changes card height unexpectedly
- modal text:
  - wrap safely
  - do not overflow the modal width

## Core Rule

Any new UI element, widget, modal, card internal, button group, nav element, or spacing change must be mapped to the scale system before implementation.

If a change cannot be mapped safely, do not guess. Stop and document the risk.

## Mandatory Process For Future UI Tasks

Before changing UI, Codex must:

1. Identify whether the change affects:
   - shell
   - sidebar
   - page frame
   - grid
   - card size
   - card internals
   - button dimensions
   - modal/viewer
   - nav/tabs/filter shell
   - typography/icon sizing
2. Choose the correct scale family:
   - `--ui-scale-x` for horizontal structure
   - `--ui-scale-y` for vertical structure
   - policy tokens for text/buttons/icons/radius
3. Reuse an existing token if possible.
4. If no token fits, add a named token whose scale-1 value matches the approved current UI exactly.
5. Preserve scale-1 parity.
6. Report migrated selectors and skipped selectors.

## Required Scale Mapping Table Format

For every layout-sensitive change, report:

- UI element
- approved value at scale 1
- token used
- scaled formula
- selectors/components affected
- whether scale 1 parity is preserved

Example:

- Filter shell padding
  - scale 1 value: `4px 6px`
  - token: `--surface-pad-2xs-y-scaled`, `--surface-pad-2xs-x-scaled`
  - formula: `calc(4px * var(--ui-scale-y))`, `calc(6px * var(--ui-scale-x))`
  - selector: `.filter_bar_surface`
  - scale 1 parity: unchanged

## Future Widget Rules

When adding a new widget:

1. Declare its region:
   - sidebar
   - main shell
   - page header/action area
   - filter/tabs
   - card grid
   - card internal
   - modal/viewer
   - utility panel / feedback note
2. Map the widget in layers:
   - structure with axis-aware scale
   - small internals with policy tokens
   - text through clamped text tokens and explicit overflow behavior
3. Do not hardcode new `px` values if a shared token can express the same scale-1 value.
4. If the widget has both x and y spacing, split them rather than using one isotropic padding value by default.
5. Keep scale-1 layout identical to the approved composition unless the task explicitly changes the design.

### Example: future widget

If a future inline status widget needs:

- width `220px`
- height `52px`
- padding `10px 12px`
- label `13px`
- radius `14px`

Preferred mapping:

- width: `calc(220px * var(--ui-scale-x))`
- height: `calc(52px * var(--ui-scale-y))` or a button policy token if it is a control
- padding-y: `calc(10px * var(--ui-scale-y))`
- padding-x: `calc(12px * var(--ui-scale-x))`
- font: `var(--font-size-body-small-scaled, 13px)`
- radius: `var(--radius-md-scaled, 14px)`

If the same widget also has text:

- title: use a scaled heading/body token
- helper/meta text: use a scaled secondary/meta token
- set `min-width: 0` on the text container
- choose either safe wrapping or ellipsis deliberately

## Safe vs Risky Migration Guidance

### Usually safe to migrate

- shared button shells
- shared ghost/compact utility controls
- shared tab/filter shell padding and gaps
- shared modal shell padding/gaps
- shared utility notes/chips/badges
- shared wallet panel internals
- shared text helpers and meta labels
- shared overflow safeguards on generic text containers

### Risky: do not migrate blindly

- approved Home composition offsets
- Waiting Push card width/height/media sizing
- Match card width/height/media sizing
- Challenge / Settle selectors and special overrides
- tab pill identity if the change makes tabs resemble primary action buttons
- route-specific card internals with proven visual tuning
- card titles/descriptions where changing wrap strategy can alter approved card height
- selectors already known to have regression history

If a risky selector must change, call it out explicitly in the report.

## Forbidden Layout Patterns

Do not introduce these without explicit approval:

- hardcoded structural `px` values that bypass the scale system
- new fixed card sizes without scale mapping
- `justify-content: space-between` for primary card grids
- fake fixed item counts as the main layout solution
- stretching cards to absorb leftover width
- broad global selector changes that accidentally restyle multiple card families
- independent widget scaling that ignores root scale variables
- `width: 100vw` inside the app main region
- global `transform: scale()` for the app shell
- CSS `zoom`
- layout changes that alter the approved scale-1 composition without reporting it

## Stage Discipline

Migration must stay staged:

- keep stages small and reviewable
- prefer one layer per task:
  - shell/sidebar/main
  - page frame
  - grid distribution
  - card size
  - card internals
  - modal/viewer
  - shared buttons/utilities
- do not mix layout redesign with scale migration
- every stage must be easy to revert
- every stage must pass lint/build
- every stage must state whether browser verification actually happened

## Testing Requirements

For layout-sensitive tasks, report:

- `git diff --stat`
- changed files
- migrated selectors
- skipped/risky selectors
- whether scale tokens changed
- whether scale-1 layout should remain unchanged
- whether card width/height changed
- whether button dimensions changed
- whether browser verification was actually performed
- whether business logic changed

Preferred runtime checks when available:

- reference viewport: `1280 x 678`
- larger viewport: `1920 x 1080`
- narrow desktop-fit viewport
- mobile viewport when relevant
