# Palate UI Architecture

## 1. Purpose

Palate uses an ownership-first UI architecture.

The goals are:

- preserve the approved Palate composition
- keep the desktop shell bounded-fluid and shell-owned
- separate layout, component, and page concerns
- keep visual ownership explicit and durable

Palate is explicitly moving away from desktop continuous viewport scaling. On
desktop, shell geometry should be bounded-fluid, component internals should stay
stable, and layout should absorb viewport changes through container fit and
reflow.

The geometry contract is rectilinear: normal components rely on the browser's
square default. No radius token, local radius alias, or rounded utility value
is permitted.

## 2. Layer Model

Palate UI is organized into five layers.

### Foundation tokens

Owns:

- design primitives
- global typography, spacing, color, focus, and motion vocabulary
- shared breakpoint-owned token vocabulary

Must not own:

- page-specific composition
- route-specific offsets
- component-specific one-off tuning unless promoted into a shared token family

### Layout modes / shell

Owns:

- app shell behavior
- sidebar/content relationship
- layout-mode switching
- shell-level scroll ownership
- shell-collapse states

Must not own:

- component internals
- page composition details
- emergency visual fixes inside component families

### Component contracts

Owns:

- reusable UI building blocks
- component-owned spacing, overflow, typography, and interaction behavior
- component-local responsive behavior

Must not own:

- route-specific restyling
- page composition offsets
- broad descendant overrides into unrelated components

### Page composition

Owns:

- page stack/grid arrangement
- page-specific placement
- composition-level spacing between components

Must not own:

- shared component material
- shared component shell internals
- shell geometry

## 3. Layout Modes

### Runtime mode source

Current runtime layout mode source:

- [`frontend/components/layout_scale_controller.tsx`](../frontend/components/layout_scale_controller.tsx)

Current threshold:

- desktop shell active when viewport width is `>= 640px`
- mobile when viewport width is `< 640px`

### Target desktop/mobile model

#### desktop-wide

Typical range:

- `>= 1200px`

Rules:

- bounded-fluid desktop shell
- sidebar width uses `clamp(176px, 15vw, 220px)`
- full desktop composition

#### desktop-fit

Typical range:

- `640px` to `1199px`

Rules:

- same bounded-fluid desktop shell
- same stable sidebar/nav/wallet internals
- no proportional drift inside the range

#### mobile

Typical range:

- `< 640px`

Rules:

- no full desktop sidebar
- mobile navigation
- mobile-specific composition contract

### Shell-collapse policy

When the viewport becomes too narrow for the full desktop shell:

- do not keep squeezing sidebar and components proportionally
- defer shell collapse to an explicit future shell state
- keep main content visually stable and let the shell state change explicitly

Allowed shell states:

- full sidebar
- compact rail
- overlay sidebar / drawer
- mobile bottom navigation

This transition must be explicit and shell-owned.
Page composition and component internals must not invent their own fallback
shell behavior.

## 4. Shell Policy

### Desktop shell

Desktop shell owns:

- sidebar width
- sidebar padding
- sidebar geometry, which relies on the browser's square default
- sidebar visibility mode
- main content frame relationship

Rules:

- sidebar width uses a bounded-fluid shell formula
- sidebar internals do not continuously scale with viewport
- main content uses remaining viewport space

### Main content

Main content is fluid inside the space the shell gives it.

Allowed adaptation:

- grid column changes
- content width changes
- section reflow
- intentional wrapping
- intentional stacking where the owner contract allows it

Not allowed:

- relying on component internals collapsing unpredictably
- using text/icon/corner-geometry drift as a substitute for layout decisions
- treating desktop-fit as a separate shell-resize system

## 5. Component Resilience Rule

Every component contract must remain resilient when available space becomes
tighter.

Required resilience tools:

- `min-width: 0` on shrinkable text containers
- explicit `min-width` / `max-width` where needed
- deliberate overflow handling:
  - ellipsis
  - wrapping
  - clipping
  - line clamp
- fixed or narrowly clamped typography/icons/corner geometry inside the owner contract
- controlled wrapping or stacking only inside component-owned rules

Core rule:

- no uncontrolled shrink
- no uncontrolled wrap
- no uncontrolled stretch

## 6. Ownership Rules

### Application Layout contract

Owner:

- app shell / layout-mode contract

Owns:

- viewport shell
- sidebar/content relationship
- shell visibility states
- shell-level scrolling
- sidebar collapse/hide mode changes

Must not own:

- page-specific offsets
- component internals
- route-specific content tuning beyond shell constraints

### Navigation contract

Owner:

- `.navigation_bar`
- `.brand_lockup`
- `.nav_links`
- `.nav_link`
- mobile navigation shell

Owns:

- navigation placement
- brand placement
- nav states
- nav-specific responsive behavior

Must not own:

- wallet internals
- page composition
- shared button/card internals

### WalletPanel contract

Owner:

- WalletPanel

Owns:

- wallet shell
- wallet compact header/body/meta/actions
- wallet modal option cards

Must not own:

- sidebar shell geometry
- page composition
- unrelated modal internals

Rules:

- wallet must fit through wallet-owned resilience behavior
- wallet must not depend on uncontrolled shell squeeze to fit

### Button / ActionButton contract

Owns:

- button shell
- variants
- label/icon layout
- interaction states

Must not own:

- page placement
- route composition

Desktop rule:

- shared button shells should remain stable inside each desktop breakpoint state

### Tabs / FilterBar contract

Owns:

- filter shell
- tabs shell
- tab interaction
- tab badge layout

Must not own:

- page placement offsets
- unrelated button/card internals

### Badge / MediaTag contract

Owns:

- shared badge shell
- category/format/status variants

Must not own:

- page/card-family positioning

### Card Foundation contract

Owns:

- `.card_shell`
- `.card_preview`
- `.card_body`
- `.card_title_row`
- `.card_chip_row`
- `.card_footer`
- `.card_actions`

Must not own:

- page grid placement
- unrelated shell behavior

### WaitingPushCard family contract

Owns:

- WaitingPushCard shell variants
- waiting-push meta/chip/stat/action internals
- family bridge hooks `--waiting-push-*` while cleanup is in progress

Must not own:

- Home grid placement
- MediaRenderer internals
- Challenge transaction behavior

### MatchCard family contract

Owns:

- MatchCard shell variant
- match metadata rows
- match ID display
- category tag placement
- family bridge hooks `--match-card-*` while cleanup is in progress

Must not own:

- Home grid placement
- MediaRenderer internals
- protected transaction-control behavior

Protected transaction controls remain outside the generic family contract:

- `.match_card_footer_actions`
- `.match_card_countdown_slot`
- `.match_card_detail_button`
- `.match_card_settle_button`
- `.action_button_cardMain`

### Modal contract

Owns:

- shared modal shell
- backdrop
- modal header/body structure

Must not own:

- feature-specific modal internals

### MediaRenderer contract

Owns:

- renderer shell
- shared renderer variants
- shared audio/video/image primitives

Must not own:

- card-family placement
- page composition

### Page composition contract

Owns:

- page-level stack/grid placement
- page-only offsets and section relationships

Must not own:

- shared component internals
- shell transitions

## 7. Variable Family Policy

### Durable contract families

These are long-term component APIs:

- `--action-button-*`
- `--card-footer-*`
- `--card-actions-*`
- `--filter-bar-*`
- `--tab-button-flex`

Rules:

- keep them generic
- keep them small
- reuse them only when ownership truly matches

### Temporary bridge families

These preserve behavior while ownership is being untangled:

- `--waiting-push-*`
- `--match-card-*`
- `--claim-row-*`
- `--activity-row-*`
- `--activity-header-actions-*`

Rules:

- do not expand them casually
- replace them with formal family contracts when safe

Warning:

- do not replace selector complexity with variable complexity

## 8. Breakpoint Policy

Breakpoints are allowed for structural shell changes:

- full sidebar
- collapsed/hidden sidebar
- mobile navigation
- grid column changes
- content-frame width changes

Breakpoints are not for:

- ad hoc patching of random component sizes
- page selectors reaching into component internals
- uncontrolled proportional drift

## 9. Forbidden Patterns

Do not introduce:

- desktop-wide continuous scale engine
- physical-screen assumptions
- random selector-specific responsive repairs
- page selectors restyling component internals
- component proportions changing without an owner contract
- accidental shell transitions caused only by overflow pressure

## 10. Current CSS Ownership Index

### Current import order

`frontend/app/layout.tsx` imports global styles in this order:

1. `tokens.css`
2. `globals.css`
3. `primitives.css`
4. `layout.css`
5. `buttons.css`
6. `filter-bar.css`
7. `badges.css`
8. `cards.css`
9. `modal.css`
10. `media-renderer.css`
11. `waiting-push.css`
12. `match-card.css`
13. `wallet.css`
14. `navigation.css`
15. `pages/home.css`
16. `pages/content.css`

### File index

### CSS ownership hierarchy

The CSS stack has a strict ownership order:

1. `tokens.css`
2. `globals.css`
3. `primitives.css`
4. `layout.css`
5. component CSS
6. page CSS

Ownership meaning:

- `globals.css` owns:
  - reset
  - document defaults
  - true global utilities
- `layout.css` owns:
  - app shell
  - main content frame
  - shell placement
- page CSS owns:
  - page composition
  - section order
  - page-owned spacing
- component CSS owns:
  - component internals
  - component contracts
- primitive CSS owns:
  - shared controls and shells such as buttons, badges, filter bar, and modal
    shell

### Direction of ownership

Ownership must flow in one direction:

- layout may place pages and components
- pages may arrange components
- components own their internals
- primitives own their own material and interaction

Rules:

- lower layers must not restyle higher layers
- pages must not restyle component internals directly
- component internals must not be patched from route-specific selectors when the
  real problem belongs to the component contract

### One selector, one owner

Each selector family should have one canonical stylesheet.

Rules:

- duplicated selectors across files are forbidden unless they are an explicit
  bridge
- if a bridge is unavoidable, it must:
  - be commented
  - explain why ownership is still mixed
  - name the intended future owner
  - imply a removal path

Uncommented duplicate selector ownership is architecture debt, not an accepted
pattern.

### Component viewport rule

Components should not directly size themselves from viewport width.

Preferred model:

- containers and grids decide available space
- components fit that space with:
  - `width: 100%`
  - explicit min/max constraints
  - overflow handling
  - ellipsis / clamp / controlled wrap

Allowed exception:

- component-owned media queries may adjust internal structure

Not allowed:

- component media queries that perform page placement
- component sizing that depends directly on viewport width when container fit
  would solve it more cleanly

### Page / component boundary

Page styles may:

- place components
- set component contract variables
- control page-level spacing and section relationships

Page styles may not:

- target deep internals like `.match_card button`
- target wallet internals such as `.wallet_*`
- target tab internals such as `.tab_button_label`
- redefine primitive material/interaction from the page layer

If a page needs new behavior, add or extend a component-owned hook or contract
first.

### Refactor guardrails

Before moving CSS:

- identify the owner first
- verify the destination file matches that owner

Do not:

- move mixed responsive repair blocks until ownership is separated
- fix visual bugs by adding route-specific descendant selectors
- add new CSS files unless the owner is large enough and stable enough to
  justify a durable boundary

#### `frontend/styles/tokens.css`

Owns:

- design primitives
- color and spacing vocabulary

Must not own:

- component selectors
- page composition

Status:

- stable foundation only; component visuals do not belong here

#### `frontend/styles/globals.css`

Owns:

- import order
- root defaults
- root token reservoir
- flat document background
- global utilities

Must not own:

- new component-family work that already has a dedicated stylesheet

Status:

- stable foundation only

#### `frontend/styles/primitives.css`

Owns:

- shared structural surfaces
- inputs and select controls
- generic semantic feedback text

Must not own:

- component-family variants
- page composition

Status:

- stable primitive owner

#### `frontend/styles/layout.css`

Owns:

- app shell
- main content frame
- shell scroll behavior
- layout mode switching
- bounded-fluid sidebar/content relationship

Must not own:

- nav visuals
- wallet internals
- page composition

Status:

- partially stable

#### `frontend/styles/navigation.css`

Owns:

- sidebar/navigation shell
- brand lockup
- desktop nav links
- mobile bottom nav

Must not own:

- wallet internals
- page composition

Status:

- partially stable

#### `frontend/styles/wallet.css`

Owns:

- WalletPanel shell and internals
- wallet modal option cards

Must not own:

- sidebar shell geometry
- page composition

Status:

- partially stable

#### `frontend/styles/buttons.css`

Owns:

- ActionButton contract

Must not own:

- route-specific placement

Status:

- stable

#### `frontend/styles/filter-bar.css`

Owns:

- FilterBar/Tabs contract

Must not own:

- page placement offsets

Status:

- stable

#### `frontend/styles/badges.css`

Owns:

- shared badge shell and variants

Must not own:

- decorative family/page placement

Status:

- stable

#### `frontend/styles/cards.css`

Owns:

- Card Foundation

Must not own:

- family internals
- protected transaction controls

Status:

- stable foundation

#### `frontend/styles/modal.css`

Owns:

- shared modal shell

Must not own:

- feature-specific modal internals

Status:

- stable

#### `frontend/styles/media-renderer.css`

Owns:

- MediaRenderer shared shell and primitives

Must not own:

- card-family placement
- page composition

Status:

- partially stable

#### `frontend/styles/waiting-push.css`

Owns:

- WaitingPushCard family

Must not own:

- Home grid placement
- Challenge transaction behavior

Status:

- partially stable

#### `frontend/styles/match-card.css`

Owns:

- MatchCard family

Must not own:

- protected footer transaction controls
- Home grid placement

Status:

- partially stable

#### `frontend/styles/pages/home.css`

Owns:

- Home composition

Must not own:

- shared component internals

#### `frontend/styles/pages/content.css`

Owns:

- My Media, Upload, and Profile composition frames
- unequal hero/content placement for those routes

Must not own:

- shared component internals
- shell ownership

Status:

- partially stable

### Stable files

- `tokens.css`
- `primitives.css`
- `layout.css`
- `buttons.css`
- `filter-bar.css`
- `badges.css`
- `cards.css`
- `modal.css`
- `navigation.css`
- `wallet.css`
- `media-renderer.css`
- `waiting-push.css`
- `match-card.css`
- `pages/home.css`
- `pages/content.css`

Current intentional debt:

- shell-collapse/drawer behavior is not formalized yet for too-narrow desktop
- `globals.css` still owns several route-family composition rules that predate
  the final owner split

### When to create a new CSS file

Create a new file only when:

- the selectors belong to one clear owner
- the owner is large enough to justify a boundary
- the boundary will survive future refactors
- import order is obvious

### When not to create a new CSS file

Do not create a new file when:

- selectors are still mixed across shell/component/page ownership
- rules are mixed across shell/component/page ownership and the split would not
  reduce ownership ambiguity
- the file would only contain a tiny exception
- the split would rename existing debt without reducing it

## 11. Documentation Discipline

When architecture changes:

- update [`AI_STATE.md`](../AI_STATE.md)
- keep shell policy, ownership policy, and CSS file index aligned
- keep documentation aligned with token and stylesheet ownership changes

## 12. Working Rules

For future UI architecture tasks:

- do not fix UI by broad selector sweeps
- do not add route-specific component styling unless page composition truly
  requires it
- keep diffs scoped
- preserve Challenge / Settle unless the task explicitly targets them
- do not run browser verification unless explicitly requested
- do not run build unless explicitly requested
