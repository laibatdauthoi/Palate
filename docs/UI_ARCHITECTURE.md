# Palate UI Architecture

## 1. Purpose

Palate is moving away from selector-by-selector scale fixes because that approach does not create stable ownership. It solves immediate UI regressions, but it also causes:

- duplicated breakpoint logic
- component styles overridden by page-specific selectors
- emergency cleanup blocks that affect unrelated UI families
- difficult refactors because layout, component, and page concerns live in the same file

This document defines the canonical ownership model for Palate UI work so future changes can be made without broad CSS sweeps or accidental regressions.

The goals are:

- preserve the approved Palate composition at scale 1
- keep viewport-proportional scaling consistent
- separate layout, component, and page concerns
- make legacy cleanup staged and reversible

## 2. Layer Model

Palate UI is organized into five strict layers.

### Foundation tokens

Purpose:

- define stable design primitives
- define shared scale policy tokens
- define global typography, radius, spacing, shadow, and motion vocabulary

Examples:

- color tokens in [`frontend/styles/tokens.css`](../frontend/styles/tokens.css)
- root scale and policy tokens in [`frontend/styles/globals.css`](../frontend/styles/globals.css)

Allowed:

- design primitives
- scale policy tokens
- global overflow/text defaults

Not allowed:

- page-specific composition
- route-specific offsets
- component-specific one-off tuning unless promoted to a shared token family

### Layout modes / shell

Purpose:

- define app shell behavior
- define sidebar/main/mobile layout mode behavior
- define frame width, shell padding, and grid mode switching

Allowed:

- `.app_shell`
- `.main_content`
- desktop/mobile navigation visibility
- layout mode breakpoints and mode-scoped shell behavior

Not allowed:

- restyling component internals
- card/button visual redesign
- page-specific content tweaks unrelated to shell behavior

### Component contracts

Purpose:

- define reusable UI building blocks
- define component-owned spacing, typography, overflow, and interaction behavior

Allowed:

- reusable component shell
- component variants and size contracts
- component-local responsive behavior

Not allowed:

- route-specific restyling
- page composition offsets
- broad descendant overrides into unrelated components

### Page composition

Purpose:

- arrange components for a page
- define page-specific layout relationships
- preserve approved composition without redefining shared component internals

Allowed:

- page grid/stack alignment
- page-specific placement
- composition-level spacing between components

Not allowed:

- redefining base button material
- redefining tab shape
- redefining badge shell
- changing card/button internals unless the task explicitly targets that component contract

### Legacy overrides

Purpose:

- temporarily preserve approved UI while ownership is migrated

Allowed:

- scoped compatibility overrides
- temporary emergency cleanup while ownership remains mixed

Not allowed:

- permanent home for new UI work
- broad styling sweeps as the default solution

## 2.5 Variable Family Policy

Palate uses CSS custom properties for two different jobs:

- durable component contracts
- temporary bridge hooks

These must be treated differently.

### Durable contract variable families

These families are part of the intended long-term component API. They may be
reused by future components when the ownership model truly matches.

- `--action-button-*`
- `--card-footer-*`
- `--card-actions-*`
- `--filter-bar-*`
- `--tab-button-flex`

Rules:

- these variables belong to the owning component contract
- future work may reuse them when the component role is the same
- additions to these families should stay generic and component-owned
- these families should remain small and stable

### Temporary bridge variable families

These families exist to preserve computed behavior while ownership is being
untangled. They are not a free-form extension surface.

- `--waiting-push-*`
- `--match-card-*`
- `--claim-row-*`
- `--activity-row-*`
- `--activity-header-actions-*`

Rules:

- do not expand these families casually
- before adding new bridge variables, define or update the relevant
  component-family contract
- bridge variables should eventually be consolidated, renamed into a formal
  family contract, or removed once selector ownership is cleaned up
- bridge variables are allowed to carry layout parity temporarily, but they
  should not become permanent substitutes for proper component ownership

### Warning

Do not replace selector complexity with variable complexity.

Moving behavior behind variables is only a win when:

- the variable belongs to a real component owner
- the hook is reusable
- the hook reduces unsafe descendant overrides

If a variable only exists to preserve one local exception, treat it as a bridge
and document it as such instead of normalizing it prematurely.

## 3. Layout Modes

### Current runtime mode contract

The current runtime layout mode source is [`frontend/components/layout_scale_controller.tsx`](../frontend/components/layout_scale_controller.tsx).

Current mobile threshold:

- `desktop-fit` when viewport width is `>= 640px`
- `mobile` when viewport width is `< 640px`

Reference viewport:

- `1280 x 678`

### Current and target modes

#### desktop-wide

Intended use:

- large desktop composition
- full approved Home presentation

Typical range:

- `min-width: 1200px`

Responsibilities:

- full shell width
- approved Home vertical composition
- large waiting/match grid composition

#### desktop-fit

Intended use:

- narrow desktop, small laptop, and tablet-fit widths that can still support desktop shell composition

Current active range:

- `640px` to `1199px`

Responsibilities:

- keep sidebar/content shell active
- preserve scaled desktop composition
- simplify shell behavior without collapsing to mobile prematurely

#### mobile

Intended use:

- widths where sidebar/content shell composition is no longer practical

Current active range:

- `< 640px`

Responsibilities:

- no desktop sidebar
- single-column content
- bottom navigation
- width-safe header/actions/tabs/cards

### Zoom rule

Ctrl+/Ctrl- and browser zoom must be handled indirectly through the available CSS viewport and container size.

Palate must not:

- detect browser zoom directly
- branch UI behavior on zoom-specific APIs
- use CSS `zoom`
- use global `transform: scale()` for app layout

Instead, layout should respond to:

- actual viewport width
- actual viewport height
- container constraints
- root scale tokens

## 4. Ownership Rules

Each UI family has a single owner. Pages may consume components, but they must not casually restyle their internals.

### Application Layout Contract

Owner:

- App Shell / layout-mode contract

Allowed to style:

- viewport shell
- sidebar/content relationship
- layout-mode switching
- desktop/mobile shell visibility
- shell-level scroll behavior

Must not style:

- page-specific card composition
- page-specific header offsets
- button/card/modal internals
- route-specific content tuning beyond shell constraints

Dependencies:

- depends on root layout mode from [`frontend/components/layout_scale_controller.tsx`](../frontend/components/layout_scale_controller.tsx)
- depends on shell tokens in [`frontend/styles/globals.css`](../frontend/styles/globals.css), including:
  - `--sidebar-width-scaled`
  - `--main-frame-width-scaled`
  - `--main-padding-*`

Overflow/responsive obligations:

- shell must define whether the app uses grid sidebar/content mode or mobile stacked mode
- shell must own top-level page scrolling and bottom-nav clearance
- shell must not rely on page selectors to repair sidebar/content relationships

#### App Shell

Owner:

- `.app_shell`

Owns:

- root sidebar/content grid relationship
- shell mode switching between desktop-fit and mobile
- top-level viewport occupancy

Must not own:

- page-internal composition
- page-specific offsets such as Home lifted header placement

#### Sidebar

Owner:

- `.navigation_bar`
- `.brand_lockup`
- `.nav_links`
- `.nav_link`
- `.wallet_panel` placement inside the sidebar

Owns:

- navigation placement
- brand placement
- wallet placement within the sidebar rail

Must not own:

- page content width
- page header placement
- route-specific content offsets

#### Content Frame

Owner:

- `.main_content`

Owns:

- available page width
- page scrolling region
- shell padding around page content

Must not own:

- route-specific card grid formulas
- page-specific floating/lifted offsets
- component internals

#### Page Frame / Page Stack

Owner:

- `.page_stack`
- route-level page-frame selectors such as `.page_home.page_stack`

Owns:

- stacking of sections inside the content frame
- route-level section spacing

Must not own:

- shared component internals
- sidebar/content shell geometry

#### Floating Header Region

Owner:

- shared header contract for `.page_header*`
- page composition only for route-specific placement such as Home lifted/floating offsets

Owns:

- shared header structure at the component layer
- route-specific placement only at the page-composition layer

Must not own:

- shell geometry
- button internals inside header actions

#### Scroll Containers

Owner:

- shell-level scroll containers:
  - `body`
  - `.main_content`
- component-level scroll containers:
  - component contracts such as modal shell body or media/player surfaces

Owns:

- which layer scrolls
- bottom-nav avoidance in mobile mode
- containment of route content within the content frame

Must not own:

- ad hoc page-specific overflow patches used to compensate for shell ownership gaps

### Current Ownership Violations (Document Only)

These are known violations in the current CSS and should be migrated later, not changed in this phase.

- Home page selectors currently participate in shell-like positioning:
  - `.page_home .page_header_actions`
  - `.page_home > .filter_bar`
  - `.page_home > .home_activity_content`
- Home route selectors currently restyle shared component internals:
  - `.page_home .filter_bar .tabs`
  - `.page_stack.page_home .filter_bar .tab_button`
- Desktop-fit repair blocks currently mix shell ownership with page/card internals:
  - `@media (min-width: 640px) and (max-width: 1199px)` rules for `.waiting_grid`, `.matches_grid`, `.match_card_meta_row`
- Mobile shell blocks currently mix app-shell switching with route/component internals:
  - `@media (max-width: 639px)` rules touching `.page_stack.page_home`, waiting-card internals, challenge modal internals, and activity/claim rows

Recommended staged follow-up:

1. keep `.app_shell`, `.navigation_bar`, `.main_content`, and layout-mode switching as the only shell owners
2. reduce Home page selectors back to composition-only ownership
3. move grid/card/control internals out of shell/media-query repair blocks and into component/page contracts

### Button / ActionButton

Owner:

- `ActionButton` contract

Allowed to style:

- button shell
- size
- label layout
- variant material
- hover/focus/active/disabled states

Must not style:

- page placement
- card grid alignment
- route-specific composition offsets

Dependencies:

- depends on shared button, text, icon, and radius tokens

Overflow/responsive obligations:

- labels stay single-line unless explicitly designed otherwise
- button text must not be ellipsized for primary transaction labels
- sizes must scale through button policy tokens

### Tabs / FilterBar

Owner:

- Tabs / FilterBar contract

Allowed to style:

- tab shell
- tab active/inactive states
- tab badge
- filter shell and internal alignment

Must not style:

- page header offsets
- unrelated button materials
- Home-only placement logic

Dependencies:

- depends on text/button/radius tokens

Overflow/responsive obligations:

- tabs must remain width-safe
- narrow/mobile behavior may scroll safely or wrap only where contract explicitly allows it
- tab identity must remain distinct from primary action buttons

### WalletPanel

Owner:

- WalletPanel contract

Allowed to style:

- wallet shell
- wallet compact text/meta/status
- wallet actions
- wallet modal option cards

Must not style:

- sidebar shell width
- main content frame
- unrelated modal internals

Dependencies:

- depends on ActionButton and modal shell contracts
- depends on navigation placement but does not own navigation layout

Overflow/responsive obligations:

- wallet address/meta must truncate or wrap intentionally
- panel actions must remain readable and clickable in sidebar and mobile contexts

### Badge / MediaTag

Owner:

- badge contract

Allowed to style:

- badge shell
- category/format/status variants
- shared pill typography and padding

Must not style:

- page layout
- card shell
- unrelated button shapes

Dependencies:

- depends on chip/text/radius tokens

Overflow/responsive obligations:

- short metadata may use single-line ellipsis where needed
- tags must not expand card width unexpectedly

### Card

Owner:

- shared card contract plus card-family contract

Allowed to style:

- card shell
- preview frame
- body structure
- title row
- chip row
- footer/action row

Must not style:

- page-level grid placement
- shell-wide layout mode switching

Dependencies:

- depends on badge, media renderer, and action button contracts

Overflow/responsive obligations:

- titles/meta/actions must use explicit overflow rules
- shared card primitives must remain reusable across Media, Waiting Push, and Match cards

#### WaitingPushCard family contract

Owner:

- WaitingPushCard family contract layered on top of Card Foundation

Owns:

- shell variants:
  - `.waiting_push_card`
  - `.waiting_push_card_compact`
- compact-body structure:
  - `.waiting_push_body`
  - compact variant body row structure/padding
- title/meta/chip/stat internals:
  - `.waiting_push_meta`
  - `.waiting_push_meta_compact`
  - `.waiting_push_compact_title_row`
  - `.waiting_push_compact_chip_row`
  - `.waiting_push_required_meta`
  - `.waiting_push_stats`
  - `.waiting_push_stat`
- non-transactional action placement:
  - `.waiting_push_actions`
  - `.waiting_push_action_stack_compact`
- media placement around MediaRenderer

Must not own:

- MediaRenderer internals
- ActionButton material
- page/grid placement
- Challenge transaction behavior

Bridge variable policy:

- `--waiting-push-*` variables are family-owned bridge hooks
- they preserve computed behavior while WaitingPushCard ownership is being
  formalized
- they are not reusable Card Foundation variables
- do not add new `--waiting-push-*` hooks casually; update the WaitingPushCard
  family contract first

Protected paths:

- `.waiting_push_actions`
- Challenge-related selectors
- `.action_button_cardMain`
- Home grid placement involving waiting cards

Reason:

- these paths are still coupled to Challenge/card regression history and should
  not be normalized opportunistically

#### MatchCard family contract

Owner:

- MatchCard family contract layered on top of Card Foundation

Owns:

- shell variant:
  - `.match_card`
- match metadata rows:
  - `.match_card_meta_row`
  - `.match_card_footer_meta`
- match ID display:
  - `.match_card_match_id`
  - `.match_card_match_id_label`
  - `.match_card_match_id_value`
- category tag placement:
  - `.match_card_category_tag`
- media placement around MediaRenderer

Must not own:

- MediaRenderer internals
- generic Card Foundation ownership
- ActionButton material
- page/grid placement
- footer transaction-control behavior

Bridge variable policy:

- `--match-card-*` variables are family-owned temporary bridge hooks
- they preserve computed behavior while MatchCard ownership is being formalized
- they are not reusable Card Foundation variables
- do not add new `--match-card-*` hooks casually; update the MatchCard family
  contract first

Protected transaction-control ownership:

- footer transaction controls remain isolated and protected:
  - `.match_card_footer_actions`
  - `.match_card_countdown_slot`
  - `.match_card_detail_button`
  - `.match_card_settle_button`
  - `.action_button_cardMain`
  - related Challenge/Settle selectors

Reason:

- Detail / Settle / countdown sizing and wrapping are not part of generic Card
  Foundation behavior and remain coupled to approved Home composition plus
  transaction-control regression history

#### Claim / Activity family contract

Owner:

- Claim family contract and Activity family contract, consumed inside Profile
  page composition

Profile page owns:

- section placement
- page flow
- how claim/activity sections are arranged within the Profile page

Claim family owns:

- claim card and summary structure:
  - `.claim_card`
  - `.claim_rows`
  - `.claim_row_main`
  - `.claim_row_actions`
  - `.claim_detail_item`
- claim toggle controls:
  - `.claim_history_toggle`
  - `.claim_detail_toggle`
- family-owned temporary bridge hooks:
  - `--claim-row-*`

Activity family owns:

- activity section shell:
  - `.activity_stack`
  - `.activity_header_bar`
  - `.activity_header_actions`
  - `.activity_filters_scroller`
  - `.activity_filters_bar`
  - `.activity_rows`
- activity row layout/content:
  - `.activity_row*`
  - `.activity_status`
  - `.activity_link`
  - `.activity_filter_button`
- family-owned temporary bridge hooks:
  - `--activity-row-*`
  - `--activity-header-actions-*`

Must not own:

- page-level section placement
- shared ActionButton material
- reusable badge/status shell material where a shared badge contract applies

Bridge variable policy:

- `--claim-row-*`, `--activity-row-*`, and `--activity-header-actions-*` are
  family-owned temporary bridge hooks
- they preserve current computed behavior while Claim/Activity ownership is
  being formalized
- they are not reusable Card Foundation or ActionRow variables
- do not add new hooks in these families casually; update the relevant family
  contract first

### PageHeader / Hero

Owner:

- PageHeader contract

Allowed to style:

- eyebrow/title/copy roles
- internal header spacing
- action slot rhythm

Must not style:

- page-specific offsets
- shell/frame placement

Dependencies:

- depends on text scale policy and ActionButton contract

Overflow/responsive obligations:

- title/copy must remain readable at scale minima
- action slot must wrap or stack intentionally in narrow/mobile conditions

### ActionRow

Owner:

- shared action-row contract

Allowed to style:

- row layout pattern
- gap
- stacking/stretch behavior

Must not style:

- button material
- page-specific offsets

Dependencies:

- depends on button contract only through placement

Overflow/responsive obligations:

- rows must define whether they wrap, stack, or scroll
- they must not rely on accidental flex overflow behavior

### Modal

Owner:

- modal shell contract

Allowed to style:

- backdrop
- modal container
- modal header/body
- shell spacing and close affordances

Must not style:

- feature-specific content internals outside documented shared modal shell rules

Dependencies:

- feature modals may depend on modal shell

Overflow/responsive obligations:

- modal content must remain width-safe
- long content must wrap or scroll intentionally

### Navigation

Owner:

- navigation contract

Allowed to style:

- sidebar navigation shell
- brand lockup
- nav links
- active/attention states
- desktop/mobile nav visibility behavior

Must not style:

- wallet panel internals
- page composition offsets
- card or button internals

Dependencies:

- depends on layout shell for placement
- depends on WalletPanel as a child component, but does not own wallet styling

Overflow/responsive obligations:

- desktop and mobile nav states must be explicit
- nav labels must truncate or collapse intentionally, never by accident

### MediaRenderer

Owner:

- MediaRenderer contract

Allowed to style:

- image/audio/video renderer shells
- renderer variants
- audio/video preview affordances

Must not style:

- outer card shell
- page grid placement

Dependencies:

- card families may wrap MediaRenderer but should not redefine its core behavior casually

Overflow/responsive obligations:

- filenames and meta text must use explicit wrapping/ellipsis rules
- audio/video controls must remain width-safe

### Page composition

Owner:

- page-specific composition layer

Allowed to style:

- page-level stack/grid placement
- component spacing relationships
- page-only offsets that are truly compositional

Must not style:

- shared component internals unless the task explicitly targets that component contract

Dependencies:

- depends on all shared component contracts remaining stable

Overflow/responsive obligations:

- page layouts must remain width-safe in each layout mode
- no page may force a component to overflow to solve composition issues

## 5. Component Contracts

Each component group must define a predictable class boundary.

### Button / ActionButton

Required class ownership:

- `.action_button`
- `.app_action_button`
- `.action_button_label`
- size classes such as `.action_button_cardMain`
- variant classes such as `.action_button_primary`

Token family expectation:

- `--button-*`
- `--text-*`
- `--icon-*`
- `--radius-*`

Responsive behavior:

- size scales through policy tokens
- layout mode may affect placement, not material

Overflow behavior:

- `white-space: nowrap` by default
- labels must not be clipped or ellipsized for transaction actions

Forbidden overrides:

- route-specific component material overrides
- page selectors redefining base button shell colors/radius/padding

### Tabs / FilterBar

Required class ownership:

- `.filter_bar`
- `.filter_bar_surface`
- `.filter_bar_inner`
- `.tabs`
- `.tab_button`
- `.tab_badge`

Token family expectation:

- `--tab-*`
- shared text/radius/surface tokens

Responsive behavior:

- tabs may scroll or wrap only according to contract
- page composition may place the tabs, not redefine tab shell identity

Overflow behavior:

- tab labels and badges must not blow out their container
- narrow layouts must remain usable without changing tabs into button-like banners

Forbidden overrides:

- broad button-style reuse that makes tabs resemble primary actions

### WalletPanel

Required class ownership:

- `.wallet_panel*`
- `.wallet_option_*`
- `.wallet_compact_button`

Token family expectation:

- `--wallet-*`
- shared button/text/radius tokens where applicable

Responsive behavior:

- compact sidebar behavior belongs here
- page composition must not shrink wallet internals ad hoc

Overflow behavior:

- long wallet values must truncate or wrap intentionally

Forbidden overrides:

- nav shell selectors changing wallet internals except placement/visibility

### Badge / MediaTag

Required class ownership:

- `.badge`
- `.category_badge`
- `.format_badge`
- `.status_badge`

Token family expectation:

- `--chip-*`
- shared text/radius tokens

Responsive behavior:

- badges scale through chip/text/radius policy tokens

Overflow behavior:

- metadata pills must remain compact and width-safe

Forbidden overrides:

- route-specific tag shell redesigns unless the task explicitly targets a specialized badge variant

### Card

Required class ownership:

- shared:
  - `.card_shell`
  - `.card_preview`
  - `.card_body`
  - `.card_title_row`
  - `.card_chip_row`
  - `.card_footer`
  - `.card_actions`
- family-specific:
  - `.media_card`
  - `.waiting_push_card`
  - `.match_card`

Token family expectation:

- `--card-*`
- family-specific tokens only where reusable card tokens are insufficient

Responsive behavior:

- card outer dimensions and card internals must be treated separately

Overflow behavior:

- titles/meta/actions need explicit overflow rules

Forbidden overrides:

- page selectors redefining card internals casually
- broad card-width changes as a substitute for shell/layout fixes

### PageHeader / Hero

Required class ownership:

- `.eyebrow`
- `.hero_title`
- `.hero_copy`
- `.page_header*`

Token family expectation:

- shared text scale tokens
- header-specific tokens if needed

Responsive behavior:

- header internals scale through policy tokens
- page composition owns page-specific placement/offsets

Overflow behavior:

- title/copy width caps and wrapping must be explicit

Forbidden overrides:

- page-specific selectors redefining shared header typography roles when only placement is needed

### ActionRow

Required class ownership:

- shared action-row classes or documented existing patterns such as:
  - `.page_header_actions`
  - `.card_actions`

Token family expectation:

- shared gap and surface spacing tokens

Responsive behavior:

- rows must explicitly define wrap/stack/stretch behavior

Overflow behavior:

- rows must remain width-safe without accidental flex overflow

Forbidden overrides:

- component-specific material rules inside generic row selectors

### Modal

Required class ownership:

- `.modal_backdrop`
- `.modal_shell*`

Token family expectation:

- shared surface/radius/text tokens

Responsive behavior:

- modal shell must remain reusable across wallet/challenge/media flows

Overflow behavior:

- shell controls width/scroll behavior
- content internals must wrap or scroll intentionally

Forbidden overrides:

- feature-specific selectors mutating shared modal shell behavior unless the task explicitly targets the modal contract

### Navigation

Required class ownership:

- `.navigation_bar`
- `.brand_lockup`
- `.nav_links`
- `.nav_link`
- `.nav_link_label`
- `.nav_claim_badge`

Token family expectation:

- `--nav-*`
- shared text/radius tokens

Responsive behavior:

- desktop/mobile nav mode behavior belongs here with layout-mode cooperation

Overflow behavior:

- nav labels must truncate/collapse intentionally

Forbidden overrides:

- page-specific selectors redefining nav-link sizing/material

### MediaRenderer

Required class ownership:

- `.media_renderer*`
- `.media_preview*`
- `.audio_preview_*`

Token family expectation:

- `--media-*`
- shared icon/text/surface tokens

Responsive behavior:

- renderer variants own media-kind behavior
- card/page layers should not casually redefine renderer internals

Overflow behavior:

- media meta, filenames, and controls must use explicit wrapping/ellipsis rules

Forbidden overrides:

- broad card descendant overrides into renderer internals unless migration planning explicitly allows it

## 6. Page Composition Rules

Pages may arrange components but must not redefine component internals unless the task explicitly targets that contract.

### Home

Allowed:

- page stack
- header/filter/grid composition
- Home-only composition offsets while still required

Not allowed:

- changing base button material
- changing tab shape
- changing card internals casually

### Buff

Allowed:

- Buff decision layout
- Buff page grid/stack placement

Not allowed:

- redefining shared card/button/tab internals as a shortcut

### My Media

Allowed:

- inventory grid placement
- page-specific section arrangement

Not allowed:

- redefining shared media card internals without targeting card/media contracts

### Push

Allowed:

- waiting/live section arrangement
- challenge-flow page composition

Not allowed:

- changing Waiting Push card or modal shell internals opportunistically

### Profile

Allowed:

- claims/activity/stats layout

Not allowed:

- restyling shared card/button/modal internals without contract ownership

## 7. Legacy Cleanup Policy

Legacy and emergency cleanup blocks are temporary.

Rules:

- do not delete them blindly
- do not replace them with broader sweeps
- migrate ownership first
- once ownership is transferred, remove only the matching legacy rules
- cleanup progress must be recorded in [`AI_STATE.md`](../AI_STATE.md)

Legacy cleanup checklist:

1. identify which component or layout layer truly owns a legacy selector
2. move or restate the owned rule in the correct layer
3. confirm the legacy rule is fully covered
4. delete only the covered legacy rule
5. document the cleanup step in `AI_STATE.md`

## 8. Migration Order

Use this order for UI architecture work:

1. Button contract
2. WalletPanel contract
3. Tabs / FilterBar contract
4. Badge / MediaTag contract
5. Card contract
6. PageHeader / ActionRow contract
7. Layout-mode cleanup
8. CSS file split

Rationale:

- buttons, wallet, tabs, and badges are lower-risk shared contracts than Home composition or card-family shell sizing
- card and page-header work should happen before layout-mode cleanup only if their ownership is clear
- CSS file splitting is the last step, not the first, so ownership exists before files are moved

## 8.5 CSS Modularization Plan

This is the target stylesheet structure after ownership cleanup is complete. It
is a migration plan only. Do not move selectors into these files until the
relevant ownership boundary is already stable.

### `frontend/styles/foundation.css`

Ownership:

- foundation tokens
- root global defaults
- scale-policy primitives that are not component-specific

Allowed dependencies:

- `tokens.css`

Forbidden dependencies:

- page-specific composition
- component-family bridge hooks
- route-specific overrides

### `frontend/styles/layout.css`

Ownership:

- app shell
- layout modes
- sidebar/content frame relationship
- top-level scroll containers

Allowed dependencies:

- `foundation.css`

Forbidden dependencies:

- card internals
- button internals
- page-specific composition

### `frontend/styles/navigation.css`

Ownership:

- navigation shell
- brand lockup
- nav links
- mobile bottom navigation visibility/states

Allowed dependencies:

- `foundation.css`
- `layout.css`

Forbidden dependencies:

- page content layout
- wallet internals
- card/page overrides

### `frontend/styles/wallet.css`

Ownership:

- WalletPanel shell and internals
- wallet modal option cards

Allowed dependencies:

- `foundation.css`
- `buttons.css`

Forbidden dependencies:

- sidebar shell geometry
- page composition
- unrelated modal internals

### `frontend/styles/buttons.css`

Ownership:

- ActionButton contract
- durable `--action-button-*` family
- variants, sizes, shared interaction behavior

Allowed dependencies:

- `foundation.css`

Forbidden dependencies:

- page placement
- card-family composition
- route-specific CTA placement

### `frontend/styles/filter-bar.css`

Ownership:

- FilterBar shell
- Tabs shell
- tab badges and row-fitting contract
- durable `--filter-bar-*` and `--tab-button-flex`

Allowed dependencies:

- `foundation.css`
- `buttons.css` for token consistency only

Forbidden dependencies:

- Home placement offsets
- page-specific tab visual restyling

### `frontend/styles/badges.css`

Ownership:

- shared badge/media-tag shell
- category/format/status badge variants

Allowed dependencies:

- `foundation.css`

Forbidden dependencies:

- decorative match-card tag placement
- page/card grid layout

### `frontend/styles/cards.css`

Ownership:

- Card Foundation only:
  - `.card_shell`
  - `.card_preview`
  - `.card_body`
  - `.card_title_row`
  - `.card_chip_row`
  - `.card_footer`
  - `.card_actions`
- durable `--card-footer-*` and `--card-actions-*`

Allowed dependencies:

- `foundation.css`
- `buttons.css`
- `badges.css`

Forbidden dependencies:

- WaitingPushCard internals
- MatchCard internals
- page-specific composition

### `frontend/styles/waiting-push.css`

Ownership:

- WaitingPushCard family contract
- `.waiting_push_card*`
- `.waiting_push_body`
- waiting-push meta/chip/stat/action placement
- family-owned `--waiting-push-*` bridge hooks until consolidated

Allowed dependencies:

- `cards.css`
- `buttons.css`
- `badges.css`
- `media-renderer.css`

Forbidden dependencies:

- Home grid placement
- Challenge transaction logic/material
- MediaRenderer internals

### `frontend/styles/match-card.css`

Ownership:

- MatchCard family contract
- `.match_card*`
- match metadata rows, match ID display, category-tag placement
- family-owned `--match-card-*` bridge hooks until consolidated

Allowed dependencies:

- `cards.css`
- `buttons.css`
- `badges.css`
- `media-renderer.css`

Forbidden dependencies:

- Home grid placement
- footer transaction-control redesign
- MediaRenderer internals

### `frontend/styles/modal.css`

Ownership:

- modal shell contract
- backdrop/container/header/body

Allowed dependencies:

- `foundation.css`
- `buttons.css`

Forbidden dependencies:

- wallet/challenge/media-viewer content internals
- page composition

### `frontend/styles/media-renderer.css`

Ownership:

- MediaRenderer shell
- renderer variants
- shared audio/video/image viewer primitives

Allowed dependencies:

- `foundation.css`
- `modal.css` where viewer shell interaction is shared

Forbidden dependencies:

- card-family placement
- route-specific overrides

### `frontend/styles/pages/home.css`

Ownership:

- Home composition only
- lifted/floating header placement
- waiting/match section arrangement
- route-scoped variables passed into component contracts

Allowed dependencies:

- all shared component styles as consumers only

Forbidden dependencies:

- card/button/tab internals
- shell ownership

### `frontend/styles/pages/buff.css`

Ownership:

- Buff page composition only

Allowed dependencies:

- shared component styles as consumers only

Forbidden dependencies:

- shared component internals without explicit contract ownership

### `frontend/styles/pages/push.css`

Ownership:

- Push page composition only

Allowed dependencies:

- shared component styles as consumers only

Forbidden dependencies:

- shared component internals without explicit contract ownership

### `frontend/styles/pages/profile.css`

Ownership:

- Profile page composition only

Allowed dependencies:

- shared component styles as consumers only

Forbidden dependencies:

- shared component internals without explicit contract ownership

### `frontend/styles/pages/media.css`

Ownership:

- My Media page composition only

Allowed dependencies:

- shared component styles as consumers only

Forbidden dependencies:

- media-card or MediaRenderer internals without explicit contract ownership

### Recommended extraction order

Use this sequence when the actual split begins:

1. `foundation.css`
2. `layout.css`
3. `buttons.css`
4. `filter-bar.css`
5. `badges.css`
6. `wallet.css`
7. `cards.css`
8. `modal.css`
9. `media-renderer.css`
10. `waiting-push.css`
11. `match-card.css`
12. page files under `pages/`

Rationale:

- foundation/layout/buttons/filter-bar/badges are the clearest durable owners
- wallet/modal/media-renderer have documented contracts but still need caution
- card-family files come after shared Card Foundation is stable
- page files move last because they should end up as composition-only consumers

### Selectors that cannot be moved yet

These must stay put until more ownership cleanup happens:

- shell/media-query blocks that still mix layout and component behavior:
  - `@media (min-width: 640px) and (max-width: 1199px)`
  - `@media (max-width: 639px)`
- Home placement selectors that still bridge page composition and component
  behavior:
  - `.page_home > .filter_bar`
  - `.page_home > .home_activity_content`
  - `.page_home .page_header_actions`
- protected transaction-control selectors:
  - `.match_card_footer_actions`
  - `.match_card_countdown_slot`
  - `.match_card_detail_button`
  - `.match_card_settle_button`
  - `.action_button_cardMain`
- Challenge/Settle-sensitive paths inside waiting/match cards
- any selector currently relying on temporary bridge families:
  - `--waiting-push-*`
  - `--match-card-*`
  - `--claim-row-*`
  - `--activity-row-*`
  - `--activity-header-actions-*`

Reason:

- moving these before their ownership is fully reduced would only rename the
  fragility instead of removing it

## 9. Codex Working Rules

For future UI architecture tasks:

- do not fix UI by broad selector sweeps
- do not add route-specific component styling unless page composition truly requires it
- keep diffs scoped
- preserve Challenge / Settle unless the task explicitly targets them
- update [`AI_STATE.md`](../AI_STATE.md) after each UI architecture task
- do not run browser verification unless explicitly requested
- do not run build unless explicitly requested
- do not delete high-risk selectors until ownership has been migrated and documented
- preserve the approved Home composition unless the task explicitly changes that design
