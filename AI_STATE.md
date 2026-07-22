# Palate UI State

## Current Design System

Palate uses a bright, restrained editorial interface. Content hierarchy comes
from typography, spacing, layout, and contrast rather than decorative rendering.

- The existing Fredoka font, mascot, logo, routes, responsive behavior,
  accessibility behavior, and interaction contracts are retained.
- Surface colors use a neutral digital-paper range from Surface 0 through
  Surface 3 rather than a white stack.
- The viewport uses clean light gray, navigation/media bases use a soft canvas
  gray, cards use near-white gray, and controls use a deeper neutral gray.
- Text, border, accent, and spacing tokens are defined in
  `frontend/styles/tokens.css`.
- Geometry is architectural and rectilinear: buttons, cards, panels,
  navigation, tabs, badges, inputs, menus, modals, tables, and media surfaces
  rely on the browser's square default with no radius token or compatibility
  scale.
- Pink is reserved for brand identity, primary actions, active states, rewards,
  and focus treatment.
- No elevation tokens, shadow utilities, or `box-shadow` declarations remain in
  the frontend stylesheet source. Controls, cards, wallet, navigation, media,
  tabs, dropdowns, popovers, and modals are shadowless; focus-visible uses an
  outline.
- Controls, cards, wallet, navigation, media, modal, and input surfaces use the
  same calm visual language.
- The desktop primary navigation is an alternating trapezoid carousel: it
  renders exactly three visible route links from a circular visual belt,
  wheel/drag/ArrowUp/ArrowDown rotate only the carousel viewport, and the
  active state is owned solely by the current pathname until a link is clicked.
  Wallet remains an informational block rather than a secondary surface panel.
- Home uses a constrained editorial frame with a left hero and right activity
  column on desktop, unequal collection widths, and the existing single-column
  mobile flow with bottom navigation.
- Decorative page effects and non-semantic material treatments are not part of
  the current system.
- The complete frontend geometry audit removed 151 redundant radius
  declarations, the previous radius scale, and local aliases. The resulting
  computed geometry is square for all audited normal components.

## Ownership

- `frontend/styles/globals.css` owns resets, document defaults, root scaling,
  global utilities, and application foundations.
- `frontend/styles/primitives.css` owns shared surface, input, select, focus,
  placeholder, and feedback primitives.
- `frontend/styles/layout.css` owns the application shell and responsive frame.
- `frontend/styles/buttons.css` owns action and utility controls.
- `frontend/styles/filter-bar.css` owns filter and tab controls.
- `frontend/styles/badges.css` owns semantic badges.
- `frontend/styles/cards.css` owns shared card surfaces and card primitives.
- `frontend/styles/modal.css` owns modal surfaces and backdrop treatment.
- `frontend/styles/media-renderer.css` owns media and viewer controls.
- `frontend/styles/waiting-push.css` owns waiting-push controls and composition.
- `frontend/styles/match-card.css` owns match-card-specific composition.
- `frontend/styles/wallet.css` owns Wallet surfaces and controls.
- `frontend/styles/navigation.css` owns desktop and mobile navigation.
- `frontend/styles/pages/home.css` owns Home route composition.
- `frontend/styles/pages/content.css` owns My Media, Upload, and Profile route
  composition without restyling component internals.

`frontend/app/layout.tsx` imports the foundation first and named owners after it,
so each component's final visual rules remain in its owner stylesheet. The
latest audit removed route atmosphere code, staged compatibility aliases,
background-image resets, shadow resets, and unused root scale writes without
adding `!important` escalation.

## Repository Audit

The audit inspected the app layout, route pages, shared components,
providers, style modules, tokens, configuration, brand assets, and UI-related
documentation. The active visual owners were migrated without changing React
component contracts, provider behavior, routing, service code, or assets.

Documentation updated to describe the current system:

- `docs/Layout_scale_rules.md`
- `docs/design_tokens.md`
- `docs/Palate_ui_spec.md`
- `docs/frontend_rules.md`
- `docs/Codex_rules.md`
- `docs/UI_ARCHITECTURE.md`
- `AI_CONTEXT.md`

The audit also covered route pages, shared components, providers, theme and
token definitions, configuration, brand assets, prompt/rule files, and the
existing style ownership boundaries. React contracts, routing, functionality,
accessibility, and the Fredoka/mascot identity remain unchanged.

## Validation

- `cd frontend; npm.cmd run lint` passes.
- `git diff --check` passes.
- Production CSS compilation completes successfully during `npm.cmd run build`.
- The full production build remains blocked by an unrelated existing TypeScript
  error in `frontend/components/buff_workflow.tsx:31`: `BuffWorkflowProps`
  does not expose the `open` property.

The stylesheet source contains no gradient functions, `background-image`,
`box-shadow`, backdrop blur, blur or drop-shadow filters, or glow/bevel/material
aliases. Ordinary surfaces use borders, whitespace, placement, and contrast for
separation.
