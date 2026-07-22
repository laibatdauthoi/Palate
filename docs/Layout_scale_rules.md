# Palate Layout Rules

## Purpose

Palate now uses a bounded-fluid desktop layout model.

The goal is to keep the desktop shell intentional and predictable:

- desktop-wide: `>=1200px`
- desktop-fit: `640px-1199px`
- mobile: `<640px`

Desktop behavior should be driven by:

- a bounded-fluid shell
- stable component internals
- container fit
- explicit shell transitions when they are eventually implemented

Viewport width, not physical monitor size, is the thing that drives layout.
Desktop changes should mostly be absorbed by shell width, content width, grid,
and reflow rather than proportional component scaling.

## Desktop Shell Policy

### Stable desktop shell

Desktop shell owns:

- sidebar width
- sidebar padding
- sidebar corner geometry
- sidebar visibility mode
- sidebar/content relationship
- content-frame scrolling behavior

Rules:

- desktop sidebar uses a compact bounded-fluid width:
  - `clamp(176px, 15vw, 220px)`
- sidebar internals stay stable
- main content uses the remaining viewport space
- floating sidebar presentation may remain part of the design, but it must stay
  shell-owned

### Narrow viewport behavior

When the viewport becomes too narrow for the full desktop shell:

- do not keep squeezing sidebar and components proportionally
- do not rely on uncontrolled desktop component drift
- explicit sidebar collapse or drawer work comes later

Allowed shell states:

- full sidebar
- compact rail
- overlay sidebar / drawer
- mobile bottom navigation

The future transition must be an explicit shell state, not accidental component
shrinkage. Until that work lands, desktop shell/layout should remain
bounded-fluid and components should fit their containers cleanly.

## Main Content Policy

Main content is fluid inside the space the shell gives it.

Allowed adaptation:

- grid column changes
- section reflow
- content-width changes
- intentional wrapping
- intentional stacking where a component contract allows it

Not allowed:

- depending on component internals to collapse unpredictably
- using drifting typography/icon/corner-geometry scale as a substitute for layout
- preserving desktop shell by forcing arbitrary component squeeze

## Component Resilience Policy

Components must stay resilient when available width becomes tighter.

Required contract tools:

- explicit `min-width` / `max-width` where needed
- `min-width: 0` on shrinkable text or metadata containers
- overflow ownership:
  - ellipsis
  - wrapping
  - clipping
  - line clamp
- fixed or narrowly clamped typography, icons, and corner geometry
- controlled wrapping or stacking only inside component-owned rules

Core rule:

- no uncontrolled shrink
- no uncontrolled wrap
- no uncontrolled stretch

This is the policy. Individual symptoms should be fixed through the owning
component contract rather than documented as standalone exceptions.

## Breakpoint Policy

Breakpoints are valid when they express structural layout intent:

- full sidebar vs collapsed/hidden sidebar
- overlay shell states
- mobile navigation
- grid column changes
- content-frame width changes

Breakpoints are not for:

- ad hoc patching of random component sizes
- page selectors reaching into component internals
- papering over missing component resilience contracts

## Desktop Component Sizing Policy

Inside desktop breakpoints:

- typography should be stable
- icon size should be stable
- button sizing should be stable
- corner geometry should rely on the square browser default
- sidebar, nav, and wallet geometry should be stable

Desktop-wide and desktop-fit are viewport ranges, not separate component-sizing
systems.

Typography, icons, buttons, radii, sidebar internals, nav internals, and wallet
internals should not continuously scale with viewport width.

Layout should absorb viewport changes through:

- grid
- content width
- wrapping
- spacing

not through a continuous desktop scale engine.

## Mobile Policy

Mobile `<640px` remains its own contract.

Mobile may use different layout and navigation patterns, but it should not force
desktop shell/component behavior to remain proportionally scaled.

## Ownership Guidance

When a layout issue appears:

- shell issues belong to layout/navigation shell owners
- component fit issues belong to the component or family contract
- page-specific arrangement belongs to page composition

Do not solve shell problems inside page composition, and do not solve component
contract problems with page-level descendant overrides.

## Forbidden Patterns

Do not introduce:

- desktop-wide continuous scale engine
- desktop-fit used as an ad hoc component resize system
- physical-screen assumptions
- random selector-specific responsive repairs
- page selectors restyling component internals
- component proportions changing without an owner contract
- accidental shell transitions caused only by overflow pressure

## Testing Expectations

For future layout tasks, report:

- files changed
- shell states affected
- whether desktop-wide changed
- whether desktop-fit changed
- whether mobile changed
- ownership touched
- protected/untouched selectors
- whether browser verification actually happened
