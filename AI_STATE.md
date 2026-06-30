# Current Sprint

- Stabilize the staged UI scale migration while preserving the approved Palate layout and existing gameplay flows.

# Current Objective

We are in the middle of a structured layout/UI scale migration. The immediate goal is to keep the desktop-fit composition, button behavior, and card interactions stable while scale-policy work lands incrementally. The current repo state also includes an uncommitted change in [`frontend/styles/globals.css`](./frontend/styles/globals.css), so future work should begin by understanding that diff before touching adjacent UI code.

# Active Files

- [`frontend/styles/globals.css`](./frontend/styles/globals.css)
- [`frontend/styles/tokens.css`](./frontend/styles/tokens.css)
- [`docs/Layout_scale_rules.md`](./docs/Layout_scale_rules.md)
- [`AI_CONTEXT.md`](./AI_CONTEXT.md)
- [`AI_STATE.md`](./AI_STATE.md)

# Current Branch

- **Branch:** `main`
- **Latest commit:** `fda7f45 scale base action buttons`

# Recent Changes

- Added root-level AI handoff documentation files:
  - [`AI_CONTEXT.md`](./AI_CONTEXT.md)
  - [`AI_STATE.md`](./AI_STATE.md)
- Increased desktop sidebar nav label text size for `Home`, `Buff`, `My Media`, `Push`, and `Profile` using a nav-specific scaled token.
- Reduced the desktop sidebar nav label baseline from `21px` to `18.9px` and normalized `.nav_link` line-height so the label no longer makes the tab/container feel larger.
- Decoupled desktop sidebar nav label typography from `.nav_link` layout by introducing a dedicated `.nav_link_label` element and moving nav-label font ownership onto it.
- Restored the desktop sidebar width and removed the sidebar-shrink shell compensation so desktop content alignment returns to the pre-shrink composition.
- Recalibrated shell/content spacing after the desktop sidebar width reduction so the main content no longer starts directly against the reduced sidebar column.
- Continued the staged UI scale migration in [`frontend/styles/globals.css`](./frontend/styles/globals.css) for shared UI selectors that are low-risk to scale generically.
- Rewrote [`docs/Layout_scale_rules.md`](./docs/Layout_scale_rules.md) to reflect the current axis-aware scale system and future-widget policy.
- Clarified the text scaling contract and shared overflow policy for future UI work.
- Diagnosed the current scale-visibility issue as a shell-consumption problem rather than a broken controller.
- Prior recent UI work visible from repo history and current tree:
  - Layout scale controller exists and is calibrated to a `1280 x 678` reference viewport.
  - Axis-aware scale variables and root `data-layout-mode` contract were added in [`frontend/components/layout_scale_controller.tsx`](./frontend/components/layout_scale_controller.tsx).
  - Global UI scale policy tokens exist in [`frontend/styles/globals.css`](./frontend/styles/globals.css).
  - Base button and card-main sizing work has been staged, with known care taken not to regress Challenge / Settle behavior.
  - Home/Buff/My Media/Profile pages already contain loading-state, wallet-scoped, and Buff-preflight refinements from earlier tasks.

# Current TODO

- [ ] Verify the current shared-selector scale migration visually at reference, large, and narrow desktop-fit viewports.
- [ ] Verify the text-scale and overflow safeguards visually at reference, large, and narrow desktop-fit viewports.
- [ ] Verify the desktop shell/sidebar response visually at 1280, 1440, 1728, and 1920 widths.
- [ ] Continue the remaining staged scale migration without regressing Home composition, tab/filter identity, Challenge width, or Settle behavior.
- [ ] Audit and migrate more safe shared selectors such as utility chips, shared action rows, and non-card-specific modal internals.
- [ ] Document or defer the riskier match/waiting-card internals instead of migrating them opportunistically.
- [ ] Reduce architectural fragility in [`frontend/providers/palate_provider.tsx`](./frontend/providers/palate_provider.tsx) when practical.
- [ ] Decide whether video support should remain disabled or be fully implemented later.
- [ ] Add stronger automated verification where possible; current frontend workflow is mostly lint/build/manual.

# Current Blockers

- The working tree is **not clean** because [`frontend/styles/globals.css`](./frontend/styles/globals.css) is already modified.
- Some recent UI scale work appears intentionally staged rather than fully finished, so visual validation is still important before further migration.
- Browser/runtime validation details for all edge viewport cases are not stored in one canonical place yet.
- Several card/layout selectors remain intentionally unmigrated because they are tightly coupled to the approved Home composition and past Challenge/Settle regressions.
- Text scaling is now documented more explicitly, but many page/card-specific text selectors still use legacy fixed tokens and need staged follow-up rather than a blanket rewrite.
- Even with the shell fix, many page/card internals are still only partially migrated, so full-app scale response will remain uneven until later stages land.
- Browser/runtime verification is still required to confirm the recalibrated shell gap feels correct at the approved desktop widths after the sidebar-width reduction.
- Browser visual verification was attempted again, but stable local dev-server plus automated screenshot capture still failed in this environment, so the latest nav-label change is validated only by lint/build.
- The latest sidebar-nav text correction is validated only by lint; no browser verification was run for that pass by request.
- The latest nav label ownership split is validated only by lint; no browser verification was run for that pass by request.

# Known Bugs

- Unclear whether every Stage 5 scale migration path has been manually verified at all target viewport sizes; narrow desktop-fit regressions remain a risk area.
- Video category support is present in the model/config surface but disabled via feature flag, so any path assuming live video support will be incomplete.
- The codebase still contains controlled mock-mode / disconnected-preview support; regressions are possible if connected-wallet and fallback paths are mixed incorrectly.
- [`frontend/providers/palate_provider.tsx`](./frontend/providers/palate_provider.tsx) is large enough that small UI or read-lifecycle changes can have broad side effects.
- Match-card, waiting-push-card, and some Home composition selectors are still partly fixed-size by design for now; they require targeted staged migration rather than blanket token replacement.
- Multi-line card-title and description treatment is still selector-specific; changing those globally remains a layout risk.

# Decisions Made During Development

- Preserve the approved Home composition as the visual reference; scale work should adapt around it rather than redesign it.
- Keep layout scale rollout staged and documented through [`docs/Layout_scale_rules.md`](./docs/Layout_scale_rules.md).
- Avoid touching Challenge / Settle sizing or behavior casually; those selectors have already had regression history.
- Keep filter/tab pill styling distinct from primary action button styling.
- Prefer migrating shared/generic selectors first: compact buttons, filter shells, modal shell spacing, utility notes, and claim toggles.
- Apply text scaling through clamped shared tokens and pair it with explicit overflow rules instead of letting text scale or wrap implicitly.
- Treat controller/runtime variables and visible selector consumption as separate checks; a healthy controller alone does not guarantee visible scaling.
- When sidebar width changes, recalibrate shell guttering first instead of compensating by inflating page internals, cards, or buttons.
- Do not migrate card-size selectors, Home composition offsets, or match/waiting card internals blindly; document them as skipped when they are risky.
- Buff Find Match should block obvious no-match wallet popups in the frontend, but still allow real contract-side errors to surface when the frontend cannot know better.
- Treat these AI handoff files as canonical context and update them when architecture or current work state materially changes.

# AI Collaboration Rules

- Keep diffs minimal and scoped.
- Do not rewrite unrelated code.
- Preserve the existing architecture unless the task explicitly requires a structural change.
- Follow repository docs before editing, especially:
  - [`docs/frontend_rules.md`](./docs/frontend_rules.md)
  - [`docs/Codex_rules.md`](./docs/Codex_rules.md)
  - [`docs/Layout_scale_rules.md`](./docs/Layout_scale_rules.md)
- Read the related page, provider, service, and type files before editing behavior.
- Avoid unnecessary dependencies.
- Prefer existing helpers/types over introducing new parallel patterns.
- Check `git status` before starting; this repo may already contain user or in-progress changes.

# Next Recommended Tasks

- Resolve and verify the current CSS scale work in [`frontend/styles/globals.css`](./frontend/styles/globals.css) with actual browser measurement.
- Add a short documented audit of which Stage 5 selectors are fully migrated versus intentionally still fixed-size.
- Consider breaking up [`frontend/providers/palate_provider.tsx`](./frontend/providers/palate_provider.tsx) into smaller domain modules once the current UI/layout work stabilizes.
- Add targeted automated tests or at least repeatable verification checklists for wallet-scoped loading and Buff classification flows.

# Session Notes

## 2026-06-30

- Created and standardized the canonical AI handoff files:
  - [`AI_CONTEXT.md`](./AI_CONTEXT.md)
  - [`AI_STATE.md`](./AI_STATE.md)
- Captured stable project facts from the repository:
  - frontend/provider/service/contract architecture
  - product decisions
  - commands and environment variables
  - major risks and important files
- Captured the current working state:
  - branch `main`
  - latest commit `fda7f45 scale base action buttons`
  - existing dirty file [`frontend/styles/globals.css`](./frontend/styles/globals.css)
- Remaining work:
  - verify/resolve current CSS scale migration state
  - continue staged UI scale work carefully without regressing approved Home layout or card action behavior

## 2026-06-30 - Shared Selector Scale Pass

- Continued the staged UI scale migration without touching gameplay, providers, services, or contracts.
- Updated [`frontend/styles/globals.css`](./frontend/styles/globals.css):
  - added shared scale tokens for compact buttons and generic surface spacing
  - migrated safe shared selectors including:
    - `.action_button_ghost`
    - `.app_action_compact`
    - `.modal_backdrop`
    - `.modal_shell_body`
    - `.challenge_modal_subtitle`
    - `.challenge_modal_summary`
    - `.media_viewer_audio_error`
    - `.media_viewer_disabled`
    - `.recovery_note`
    - `.invalid_media_note`
    - `.amount_field_stack`
    - `.amount_helper`
    - `.media_meta`
    - `.claim_history_toggle`
    - `.claim_detail_toggle`
    - `.claim_row_main`
    - `.claim_detail_item`
    - `.filter_bar`
    - `.filter_bar_surface`
    - `.filter_bar .tabs`
- Updated [`docs/Layout_scale_rules.md`](./docs/Layout_scale_rules.md):
  - documented axis-aware scale rules
  - documented text/button/icon/radius/surface policy tokens
  - added future-widget mapping rules and safe-vs-risky migration guidance
- Intentionally skipped in this pass:
  - Home composition offsets
  - Waiting Push card dimensions and media sizing
  - Match card dimensions and media sizing
  - Challenge / Settle special selectors
  - selectors with known filter/tab identity or card-regression risk
- Validation status:
  - `npm.cmd run lint` passed
  - `npm.cmd run build` passed
  - browser visual verification was **not** performed in this session

## 2026-06-30 - Shell Recalibration After Sidebar Reduction

- Fixed the main-content left shift introduced when [`frontend/styles/tokens.css`](./frontend/styles/tokens.css) reduced `--sidebar-width` from `260px` to `196px`.
- Root cause:
  - `.app_shell` still started the second grid track immediately after the narrower sidebar column.
  - `.main_content` correctly used that track, but there was no shell-level gutter left to preserve the approved composition offset.
- Updated [`frontend/styles/globals.css`](./frontend/styles/globals.css):
  - added `--shell-sidebar-main-gap-base`
  - added `--shell-sidebar-main-gap-scaled`
  - applied `column-gap: var(--shell-sidebar-main-gap-scaled, 0px)` to `.app_shell`
- Intentionally left unchanged:
  - card widths/heights
  - button sizes including Challenge / Settle
  - page-specific Home offsets
  - gameplay, provider, service, and contract logic
- Skipped risky areas:
  - `.page_home` composition offsets
  - waiting/match card sizing selectors
  - widget-level padding changes as a workaround
- Validation status:
  - `npm.cmd run lint` passed
  - `npm.cmd run build` passed
  - browser visual verification was **not** performed in this session

## 2026-06-30 - Text Scale Contract Pass

- Clarified the UI text-scale contract in [`docs/Layout_scale_rules.md`](./docs/Layout_scale_rules.md):
  - text must scale with the UI
  - text must use clamped policy tokens rather than raw axis math
  - primary/display/secondary text roles should scale differently
  - overflow rules are mandatory, not optional
- Updated shared text tokens in [`frontend/styles/globals.css`](./frontend/styles/globals.css):
  - added display and secondary text scale bands
  - added scaled display/heading/body/meta font tokens
  - added line-height policy tokens
  - added inline icon/text alignment token
- Added safe shared overflow protections in [`frontend/styles/globals.css`](./frontend/styles/globals.css):
  - scaled body font baseline
  - wrapping for shared copy/subtitle/help/error text
  - ellipsis for shared metadata selectors where single-line behavior is appropriate
- Intentionally skipped in this pass:
  - card-title line-clamp redesign
  - broad route-specific typography rewrites
  - Challenge / Settle selectors
  - Home composition-sensitive heading sizing
- Validation status:
  - `npm.cmd run lint` passed
  - `npm.cmd run build` passed
  - browser visual verification was **not** performed in this session

## 2026-06-30 - Sidebar / Scale Visibility Diagnosis

- Diagnosed the current “UI scaling not visibly responding” complaint as:
  - the root scale controller already writes changing scale variables
  - but the most visible desktop shell response was muted because many page/card internals are still fixed-size
  - and the sidebar/navigation cluster remained oversized due to a large base sidebar token plus roomy nav/wallet shell tokens
- Updated [`frontend/styles/tokens.css`](./frontend/styles/tokens.css):
  - reduced the base `--sidebar-width` token from `260px` to `196px`
- Updated [`frontend/styles/globals.css`](./frontend/styles/globals.css):
  - made sidebar and wallet padding shorthands carry both vertical and horizontal scaled values
  - reduced nav/brand/sidebar shell token values
  - reduced wallet connect cluster token sizes (button height, padding, font size, radius)
  - reduced wallet meta/status text sizing through dedicated wallet tokens
- Intentionally skipped in this pass:
  - controller rewrite
  - card outer dimensions
  - Challenge / Settle selectors
  - broad page/card migration
- Validation status:
  - `npm.cmd run lint` passed
  - `npm.cmd run build` passed
  - browser visual verification was **not** performed in this session

## 2026-06-30 - Sidebar Width Restoration

- Reverted the desktop sidebar width in [`frontend/styles/tokens.css`](./frontend/styles/tokens.css) from `196px` back to `260px`.
- Removed the shell compensation added for the narrower sidebar in [`frontend/styles/globals.css`](./frontend/styles/globals.css):
  - removed the shell sidebar-to-main gap tokens
  - removed `.app_shell` `column-gap`
- Restored the sidebar and wallet-cluster sizing values that had been tightened specifically to make the 196px sidebar fit:
  - sidebar padding, brand spacing, nav link padding/gap
  - wallet panel padding/gap
  - wallet compact text/button sizing
  - wallet/chain-status micro spacing values
- Intentionally preserved:
  - text scaling tokens
  - overflow safeguards
  - base/card-main button scale-token work
  - Challenge / Settle behavior
  - mobile layout behavior
  - unrelated staged scale work outside the sidebar/wallet rollback
- Validation status:
  - `npm.cmd run lint` passed
  - `npm.cmd run build` passed
  - browser visual verification was **not** performed in this session

## 2026-06-30 - Desktop Nav Label Increase

- Attempted real browser verification for the restored desktop composition at:
  - `1280 x 678`
  - `1440 x 810`
  - `1728 x 972`
  - `1920 x 1080`
- Verification status:
  - foreground local Next server worked
  - repeated detached/background server launches failed to stay reachable
  - Edge automation and Playwright screenshot capture were partially available but could not complete end-to-end against a stable local server in this session
  - result: **no successful browser screenshot set was captured**
- Updated [`frontend/styles/globals.css`](./frontend/styles/globals.css):
  - added `--nav-link-font-size-scaled`
  - set `.nav_link` to use the new nav-specific token
- Intent:
  - increase desktop sidebar nav label text by about `1.5x` from the prior `14px` body-scale baseline to a `21px` scale-1 nav label baseline
- Intentionally left unchanged:
  - sidebar width
  - main-content alignment
  - wallet panel sizing
  - card sizes
  - Challenge / Settle behavior
  - mobile bottom nav
- Validation status:
  - `npm.cmd run lint` passed
  - `npm.cmd run build` passed
  - browser visual verification was **attempted but not completed successfully**

## 2026-06-30 - Sidebar Nav Text Reduction

- Updated [`frontend/styles/globals.css`](./frontend/styles/globals.css):
  - reduced `--nav-link-font-size-scaled` from a `21px` scale-1 baseline to `18.9px`
  - added `line-height: 1` to `.nav_link` so sidebar label sizing no longer expands the perceived tab/container size
- Intentionally left unchanged:
  - sidebar width
  - `.app_shell`
  - main content alignment
  - wallet cluster sizing
  - card sizing/layout
  - mobile navigation
  - gameplay logic
- Validation status:
  - `npm.cmd run lint` passed
  - browser visual verification was **not** performed in this session by request

## 2026-06-30 - Sidebar Nav Label Ownership Split

- Updated [`frontend/components/navigation_bar.tsx`](./frontend/components/navigation_bar.tsx):
  - wrapped each desktop sidebar label in `<span className="nav_link_label">...</span>`
- Updated [`frontend/styles/globals.css`](./frontend/styles/globals.css):
  - removed nav-label typography ownership from `.nav_link`
  - added `.nav_link_label` with the current `18.9px * var(--text-scale)` baseline, `font-weight: 800`, `line-height: 1`, and single-line overflow protection
- Intentionally left unchanged:
  - sidebar width
  - app shell and main content alignment
  - wallet cluster
  - claim badge behavior
  - mobile nav behavior
  - cards and gameplay logic
- Validation status:
  - `npm.cmd run lint` passed
  - browser visual verification was **not** performed in this session by request
