# Palate Design Tokens

Palate uses a bright, restrained editorial interface. Content hierarchy comes
from spacing, typography, composition, and contrast. Surfaces use a neutral
digital paper range rather than a stack of identical whites.

## Semantic Colors

| Family | Token | Use |
| --- | --- | --- |
| Structure | `--ui-surface-0` | document and viewport background |
| Structure | `--ui-surface-1` | navigation, inputs, media bases |
| Structure | `--ui-surface-2` | cards, wallet, modal surfaces |
| Structure | `--ui-surface-3` | controls, hover surfaces, dropdowns |
| Information | `--ui-text-primary` | titles, labels, important values |
| Information | `--ui-text-secondary` | supporting copy and inactive controls |
| Information | `--ui-text-muted` | metadata and placeholders |
| Information | `--ui-text-disabled` | unavailable controls |
| Accent | `--ui-accent` | primary actions, active state, brand |
| Accent | `--ui-accent-hover` | hover clarification |
| Accent | `--ui-accent-active` | pressed state |
| State | `--ui-success`, `--ui-warning`, `--ui-danger` | semantic feedback only |

Surfaces are solid colors. Surface 0 is neutral light gray, Surface 1 is a
soft canvas gray, Surface 2 is near-white card paper, and Surface 3 is a deeper
neutral gray for controls. Pink is intentionally rare and must not be used as
general decoration or a competing surface family.

## Borders And Focus

- Use `--ui-border-subtle` for ordinary separation.
- Use `--ui-border-strong` for hover or selected structure.
- Use `--ui-border-focus` for keyboard focus.
- There are no elevation tokens or shadow utility tokens. The architectural
  language uses placement, whitespace, borders, and contrast instead.
- Focus-visible states use outlines, never decorative box shadows.

## Geometry And Spacing

- There is no radius token. Controls, cards, panels, navigation, tabs, badges,
  inputs, menus, modals, tables, and media surfaces rely on the browser's
  square default.
- No compatibility radius scale or capsule/pill alias remains.
- Spacing uses the canonical `--spacing-*` scale plus component-owned scaled
  sizing hooks where responsive layout contracts require them.

## Typography

The existing Fredoka font family remains the Palate identity. Hierarchy uses
size, weight, line height, and whitespace. Do not replace the font or compensate
for weak hierarchy with decorative surfaces.

## Component Rules

- Buttons are flat, precise, and readable.
- Navigation is quiet; active navigation uses the accent text/icon state.
- Wallet is structurally important through placement and typography, not special
  material.
- Cards prioritize media, whitespace, and metadata.
- Inputs and dropdowns are flat structural controls with clear focus.
- Badges communicate status and category without decorative effects.
- Motion communicates state and respects reduced-motion preferences.

No component may introduce a gradient, bevel, reflection, glow, or component-only
shadow family. Visual rules live in the named owner stylesheet for that
component.
