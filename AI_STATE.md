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

- Added explicit Badge / MediaTag ownership comments and low-risk inline-shell safety rules in [`frontend/styles/globals.css`](./frontend/styles/globals.css) without changing shared badge identity or match-card decorative tag ownership.
- Added explicit Tabs / FilterBar ownership comments and low-risk row/shell safety rules in [`frontend/styles/globals.css`](./frontend/styles/globals.css), plus a dedicated `.tab_button_label` in [`frontend/components/filter_bar.tsx`](./frontend/components/filter_bar.tsx).
- Added explicit WalletPanel ownership comments and low-risk width/overflow guards in [`frontend/styles/globals.css`](./frontend/styles/globals.css) without changing wallet behavior or shell/layout modes.
- Added explicit Button / ActionButton ownership comments to [`frontend/styles/globals.css`](./frontend/styles/globals.css) and tightened the shared label safety path without changing intended visuals.
- Added [`docs/UI_ARCHITECTURE.md`](./docs/UI_ARCHITECTURE.md) as the canonical UI ownership spec for future Palate layout/component refactor work.
- Lowered the explicit `data-layout-mode` mobile threshold in [`frontend/components/layout_scale_controller.tsx`](./frontend/components/layout_scale_controller.tsx) from `768px` to `640px` so desktop-fit mode remains active longer.
- Extended the existing desktop-fit repair media queries in [`frontend/styles/globals.css`](./frontend/styles/globals.css) from `768–1199px` to `640–1199px`.
- Tightened the true-mobile Home layout in [`frontend/styles/globals.css`](./frontend/styles/globals.css) so the hero/action cluster, filter tabs, and one-column waiting/match grids fit more coherently below the new mobile threshold.
- Updated [`docs/Layout_scale_rules.md`](./docs/Layout_scale_rules.md) to reflect the new `desktop-fit` / `mobile` threshold contract.
- Added root-level AI handoff documentation files:
  - [`AI_CONTEXT.md`](./AI_CONTEXT.md)
  - [`AI_STATE.md`](./AI_STATE.md)
- Increased desktop sidebar nav label text size for `Home`, `Buff`, `My Media`, `Push`, and `Profile` using a nav-specific scaled token.
- Reduced the desktop sidebar nav label baseline from `21px` to `18.9px` and normalized `.nav_link` line-height so the label no longer makes the tab/container feel larger.
- Decoupled desktop sidebar nav label typography from `.nav_link` layout by introducing a dedicated `.nav_link_label` element and moving nav-label font ownership onto it.
- Tightened the shared text/button/icon/radius floors and migrated hero/header, badge/tag, audio-preview, and card-internal micro-layout selectors onto scale-policy tokens so very small viewports do not visually re-inflate those details.
- Migrated the remaining safe outer card dimensions, media-frame heights, and Challenge/Settle/countdown/action-slot sizing onto axis-aware or policy tokens without changing gameplay behavior.
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

- [ ] Visually verify the new `640px` mobile threshold and the true-mobile Home stack in a browser.
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
- The new mobile-threshold change and Home mobile cleanup are validated only by lint in this session; no browser verification was run.
- Some recent UI scale work appears intentionally staged rather than fully finished, so visual validation is still important before further migration.
- Browser/runtime validation details for all edge viewport cases are not stored in one canonical place yet.
- Several card/layout selectors remain intentionally unmigrated because they are tightly coupled to the approved Home composition and past Challenge/Settle regressions.
- Text scaling is now documented more explicitly, but many page/card-specific text selectors still use legacy fixed tokens and need staged follow-up rather than a blanket rewrite.
- Even with the shell fix, many page/card internals are still only partially migrated, so full-app scale response will remain uneven until later stages land.
- Browser/runtime verification is still required to confirm the recalibrated shell gap feels correct at the approved desktop widths after the sidebar-width reduction.
- Browser visual verification was attempted again, but stable local dev-server plus automated screenshot capture still failed in this environment, so the latest nav-label change is validated only by lint/build.
- The latest sidebar-nav text correction is validated only by lint; no browser verification was run for that pass by request.
- The latest nav label ownership split is validated only by lint; no browser verification was run for that pass by request.
- The latest small-viewport scale-consistency pass is validated only by lint; no browser verification was run for that pass by request.
- The latest outer-card and transaction-control scale pass is validated only by lint; no browser verification was run for that pass by request.

# Known Bugs

- Unclear whether every Stage 5 scale migration path has been manually verified at all target viewport sizes; narrow desktop-fit regressions remain a risk area.
- Video category support is present in the model/config surface but disabled via feature flag, so any path assuming live video support will be incomplete.
- The codebase still contains controlled mock-mode / disconnected-preview support; regressions are possible if connected-wallet and fallback paths are mixed incorrectly.
- [`frontend/providers/palate_provider.tsx`](./frontend/providers/palate_provider.tsx) is large enough that small UI or read-lifecycle changes can have broad side effects.
- Match-card, waiting-push-card, and some Home composition selectors are still partly fixed-size by design for now; they require targeted staged migration rather than blanket token replacement.
- Multi-line card-title and description treatment is still selector-specific; changing those globally remains a layout risk.
- Some responsive/mobile overrides still contain fixed values for challenge modal thumbnails and other non-home secondary layouts; those were intentionally left alone in the latest scale-consistency pass.
- Match-card footer layout still contains composition-sensitive wrapping behavior at narrow widths; size ownership is now tokenized, but visual verification is still needed before touching that structure further.

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

## 2026-06-30 - Small-Viewport Scale Consistency Pass

- Root cause identified:
  - the root axis scale controller remained monotonic, but several visible selectors still bypassed the shared scale contract with fixed `px` internals or `vw`-based headline sizing
  - shared text/button/icon/radius floors were also bottoming out too early, so at very small viewports those internals looked inflated against structures that were still shrinking
- Updated [`frontend/styles/globals.css`](./frontend/styles/globals.css):
  - lowered the minimum floors for `--text-scale`, `--text-scale-display`, `--text-scale-secondary`, `--button-scale`, `--icon-scale`, and `--radius-scale`
  - added shared hero/header and audio-preview tokens
  - migrated safe visible selectors including:
    - `.eyebrow`
    - `.hero_title`
    - `.badge`
    - `.page_header`
    - `.page_header_floating .page_header_content`
    - `.page_header .page_header_title`
    - `.page_header.page_header_density_compact .page_header_title`
    - `.page_header .page_header_copy`
    - `.page_header_actions`
    - `.home_cta_button`
    - `.audio_preview_visual`
    - `.audio_preview_glyph_shell`
    - `.audio_preview_glyph_icon`
    - `.card_footer`
    - `.waiting_push_meta`
    - `.waiting_push_card_compact .waiting_push_body`
    - `.waiting_push_compact_title_row`
    - `.waiting_push_compact_chip_row`
    - `.waiting_push_meta_compact`
    - `.waiting_push_required_meta`
    - `.waiting_push_stats`
    - `.waiting_push_stat`
    - `.waiting_push_stat dt`
    - `.waiting_push_stat dd`
    - `.waiting_push_detail_stack`
    - `.match_card_meta_row`
    - `.match_card_footer_meta`
    - `.match_card_category_tag`
    - `.match_card_match_id`
    - `.match_card_match_id_label`
    - `.match_card_match_id_value`
    - `.match_card_footer_actions`
    - `.match_card_countdown_slot`
- Intentionally skipped in this pass:
  - outer Waiting Push / Match / Media card dimensions
  - Challenge / Settle-specific button width-height rules and special overrides
  - sidebar width and main-content alignment
  - challenge modal thumbnail hardcoded mobile sizes
  - broader mobile breakpoint redesign
- Validation status:
  - `npm.cmd run lint` passed
  - browser visual verification was **not** performed in this session by request

## 2026-06-30 - Outer Card And Transaction-Control Scale Pass

- Coverage gap identified:
  - the root/layout tokens and many internals were already migrated, but several outer-card shell sizes and transaction-control footprints still used hardcoded `px` values
  - the remaining fixed values were concentrated in media-card shell width, media-preview heights, generic match-card min-height, waiting-push Challenge button widths, challenge-row buttons, and match-card Detail / Settle / countdown slots
- Updated [`frontend/styles/globals.css`](./frontend/styles/globals.css):
  - added new axis-aware or policy-backed tokens for:
    - media-card width
    - media preview card / compact / selector heights
    - generic match-card shell min-height
    - waiting-push action widths and paddings
    - challenge-row button height / padding / primary width
    - match countdown width / height / font size
    - match detail button size / font size
    - match settle height / padding / radius
    - mobile card-main and match-footer action footprints
  - migrated selectors including:
    - `.media_card, .waiting_push_card`
    - `.media_preview_variant_card`
    - `.media_preview_variant_compact`
    - `.media_preview_variant_selector`
    - `.media_renderer_variant_card`
    - `.media_renderer_variant_compact`
    - `.media_renderer_variant_selector`
    - `.challenge_row_button`
    - `.challenge_row_button_primary`
    - `.waiting_push_card_compact .waiting_push_actions .action_button:not(.action_button_cardMain)`
    - `.waiting_push_actions .action_button:not(.action_button_cardMain)`
    - `.match_card`
    - `.match_card .action_button`
    - `.match_card .action_button.action_button_cardMain`
    - `.match_card_footer_actions > .match_card_countdown_slot`
    - `.match_card_footer_actions > button.action_button.app_action_button.match_card_detail_button`
    - `.match_card_footer_actions > button.action_button.app_action_button.match_card_settle_button`
    - mobile overrides for those match footer controls and `.action_button_cardMain`
- Intentionally skipped in this pass:
  - Home shell/sidebar/main alignment
  - Waiting/Match card grid formulas
  - outer Home composition offsets
  - match footer wrap structure at narrow widths
  - challenge modal thumbnail sizes and other secondary mobile fixed layouts
  - any gameplay or transaction logic
- Validation status:
  - `npm.cmd run lint` passed
  - browser visual verification was **not** performed in this session by request

## 2026-06-30 - Mobile Threshold Recalibration

- Lowered the explicit layout-mode threshold in [`frontend/components/layout_scale_controller.tsx`](./frontend/components/layout_scale_controller.tsx):
  - old threshold: `768px`
  - new threshold: `640px`
- Updated [`frontend/styles/globals.css`](./frontend/styles/globals.css):
  - extended the desktop-fit repair blocks from `768–1199px` to `640–1199px`
  - moved the true-mobile block from `<=767px` to `<=639px`
  - cleaned up true-mobile Home composition by:
    - making the page-header action cluster a single-column grid
    - making the filter surface/tabs width-safe with horizontal overflow instead of squeezed tab buttons
    - forcing Home waiting/match grids to stretch cleanly in one column
    - removing Home-specific waiting/match card max-width caps in true mobile
- Updated [`docs/Layout_scale_rules.md`](./docs/Layout_scale_rules.md) to document the new threshold contract.
- Intentionally left unchanged:
  - desktop sidebar width
  - desktop Home composition
  - gameplay logic
  - wallet connect behavior
  - build/browser automation
- Validation status:
  - `npm.cmd run lint` passed
  - browser visual verification was **not** performed in this session by request

## 2026-06-30 - UI Architecture Ownership Spec

- Added [`docs/UI_ARCHITECTURE.md`](./docs/UI_ARCHITECTURE.md) as the canonical Palate UI ownership document.
- The spec defines:
  - purpose and layer model
  - current and target layout modes
  - component ownership rules
  - component contracts
  - page composition boundaries
  - legacy cleanup policy
  - staged migration order
  - Codex working rules for future UI architecture tasks
- Intentionally left unchanged:
  - CSS files
  - layout visuals
  - component behavior
  - gameplay logic
- Validation status:
  - `npm.cmd run lint` passed
  - browser visual verification was **not** performed in this session by request

## 2026-06-30 - Button Contract Ownership Pass

- Updated [`frontend/styles/globals.css`](./frontend/styles/globals.css) near the shared button block to make Button / ActionButton ownership explicit:
  - base button owns shell/layout/typography/radius/interaction
  - variants own color/material only
  - size classes own dimensions only
  - page/card/wallet selectors may position buttons but should not casually redefine the base contract
- Touched shared selectors:
  - `.action_button`
  - `.app_action_button`
  - `.action_button_label`
  - comments near `.action_button_cardMain`
  - comments near `.hero_primary_cta`
  - comments near `.wallet_compact_button.action_button`
- Low-risk normalization only:
  - added explicit `min-width: 0` to the shared button shell
  - made the shared label block/overflow contract explicit without introducing ellipsis
- Protected selectors intentionally skipped:
  - `.action_button_cardMain`
  - waiting-push Challenge button selectors
  - match-card Settle/detail/countdown selectors
  - Home composition selectors
  - filter/tab pill selectors
- Remaining risks:
  - later file sections still contain legacy page/card/wallet button exceptions
  - card-main and match-footer action paths remain high-risk until their own contract pass
- Validation status:
  - `npm.cmd run lint` passed
  - browser visual verification was **not** performed in this session by request

## 2026-06-30 - WalletPanel Contract Ownership Pass

- Updated [`frontend/styles/globals.css`](./frontend/styles/globals.css) to establish WalletPanel ownership explicitly:
  - WalletPanel owns its shell, header, identity, status, compact text, meta, details, message, actions, compact button fit, and wallet modal option-card layout
  - Navigation still owns sidebar placement and shell context
  - ActionButton still owns shared button material
- Touched WalletPanel selectors:
  - `.wallet_panel`
  - `.wallet_panel_header`
  - `.wallet_meta`
  - `.wallet_compact_body`
  - `.wallet_actions`
  - `.wallet_details_list`
  - `.wallet_details_list span`
  - `.wallet_choice, .wallet_option_card`
  - `.wallet_option_card > span`
  - `.wallet_modal_content`
  - `.wallet_modal_grid`
  - `.wallet_compact_button.action_button`
- Low-risk normalization only:
  - added `min-width: 0` where wallet text/actions sit inside flex/grid containers
  - added explicit ellipsis protection for details rows and wallet option labels
  - made the wallet compact button fill its local action row
- Protected selectors intentionally skipped:
  - `.navigation_bar`
  - `.nav_links`
  - `.nav_link`
  - `.action_button_cardMain`
  - desktop/mobile layout-mode selectors
- Remaining legacy dependencies:
  - `.wallet_panel` still depends on navigation context for placement (`margin-top: auto`)
  - later cleanup block still applies wallet-specific compact overrides in the same global file
- Risks:
  - wallet shell placement is still coupled to navigation ownership
  - wallet button sizing still depends on the shared ActionButton contract plus local compact override
- Validation status:
  - `npm.cmd run lint` passed
  - browser visual verification was **not** performed in this session by request

## 2026-06-30 - Tabs / FilterBar Contract Ownership Pass

- Updated [`frontend/components/filter_bar.tsx`](./frontend/components/filter_bar.tsx):
  - wrapped the tab label in a dedicated `.tab_button_label` span so label ownership is explicit
- Updated [`frontend/styles/globals.css`](./frontend/styles/globals.css) to establish Tabs / FilterBar ownership explicitly:
  - FilterBar owns shell, surface, and overflow context
  - Tabs owns the shared pill row
  - TabButton owns pill shape, label layout, badge layout, and interaction
  - pages may position FilterBar but must not restyle tab internals casually
- Touched selectors:
  - `.tabs`
  - `.tab_button`
  - `.tab_button_label`
  - `.tab_badge`
  - `.filter_bar`
  - `.filter_bar_surface`
  - `.filter_bar_inner`
  - `.filter_bar .tabs`
- Low-risk normalization only:
  - added `min-width: 0` / `max-width: 100%` safety on shared filter/tab containers
  - added explicit label ownership for tab text
  - kept badge alignment explicit with `flex: 0 0 auto`
- Protected selectors intentionally skipped:
  - `.page_home > .filter_bar`
  - Home-specific filter offsets/padding rules
  - `.action_button*`
  - Challenge/Settle selectors
  - card grid selectors
- Remaining risks:
  - Home still applies page-specific filter positioning and shell padding later in the file
  - a later cleanup block still touches `.tab_button.active`
  - mobile Home filter overflow behavior remains page-specific by design for now
- Validation status:
  - `npm.cmd run lint` passed
  - browser visual verification was **not** performed in this session by request

## 2026-06-30 - Badge / MediaTag Contract Ownership Pass

- Updated [`frontend/styles/globals.css`](./frontend/styles/globals.css) to establish Badge / MediaTag ownership explicitly:
  - `.badge` owns the shared inline shell, typography, radius, padding, and single-line behavior
  - `.status_badge`, `.category_badge`, and `.format_badge` own variant material only
  - cards/pages may position badges but should not redefine the shared badge shell
  - `.match_card_category_tag` remains card-owned until the Card contract phase
- Touched selectors:
  - `.badge`
  - `.status_badge`
  - `.category_badge`
  - `.format_badge`
- Low-risk normalization only:
  - added `min-width: 0` / `max-width: 100%` safety on the shared badge shell
  - made single-line overflow behavior explicit with hidden overflow and ellipsis
  - kept variant badges as `flex: 0 0 auto` so material badges do not stretch unexpectedly
- Protected selectors intentionally skipped:
  - `.match_card_category_tag`
  - match-card decorative tag placement
  - card outer dimensions
  - Challenge/Settle selectors
  - Home composition selectors
- Remaining risks:
  - specialized card-owned badge/tag behaviors still live outside the shared badge contract
  - later broad cleanup rules still touch `.badge` family border width globally
- Validation status:
  - `npm.cmd run lint` passed
  - browser visual verification was **not** performed in this session by request
