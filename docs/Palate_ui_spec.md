# Palate UI Specification

## Product Identity

Palate is a media game where users upload media, push it into matches, and Buff
the side they believe should win. Keep the Fredoka font family, mascot, logo,
routes, functionality, responsiveness, and accessibility behavior.

## Design Language

Palate is calm, editorial, intentional, and premium through restraint. Its
light surfaces are neutral digital grays, not beige or aged paper.

The interface should disappear behind the content. Hierarchy comes from:

- typography
- spacing
- layout
- proportion
- contrast

Do not use gradients, bevels, glossy or metallic materials, reflections,
decorative rims, colorful shadows, textures, or competing elevation systems.

## Surface System

All surfaces use the same neutral editorial family:

- Surface 0: neutral light gray page background
- Surface 1: soft canvas gray navigation, inputs, and media bases
- Surface 2: near-white cards, wallet, and modal surfaces
- Surface 3: deeper neutral gray controls, hover surfaces, and dropdowns

Surfaces are solid. Borders provide ownership where whitespace and typography
cannot do the work. The frontend does not define elevation tokens or decorative
shadow utilities; no component uses drop-shadows, glow, or fake depth.

## Accent

Pink is reserved for:

- brand
- primary actions
- active and selected states
- rewards and important highlights
- focus

Do not use pink as ambient decoration or as a general surface material. Status
colors remain semantic and must not compete with the brand accent.

## Navigation And Wallet

Desktop navigation contains Home, My Media, and Profile. The navigation is
quiet and active state uses pink text/icon treatment with a restrained surface or
outline change.

The navigation column is architectural rather than a rounded panel. The Wallet
remains the structural anchor of the left shell. Its hierarchy
comes from placement, typography, and spacing; it does not use a special material.

Mobile uses the existing bottom navigation contract.

## Buttons And Controls

Buttons are flat, precise, and quiet.

- Primary actions use the accent surface.
- Secondary actions use Surface 3.
- Ghost actions are transparent until interaction.
- Hover increases clarity through border or surface change.
- Active communicates press without theatrical movement.
- Focus-visible uses the shared focus token.
- Disabled controls reduce contrast without changing geometry.

Tabs, inputs, dropdowns, file controls, and media controls use the same control
surface and border vocabulary.

## Cards And Media

Cards use Surface 2, a barely visible border, zero-radius geometry,
and no elevation. Media previews remain the visual focus. Card composition, spacing,
metadata, and typography provide hierarchy.

Badges are semantic labels. Their shape and color communicate category or state;
they do not use gradients or glossy treatment.

## Pages And Behavior

Home remains the lobby. My Media remains the inventory. Upload remains a
secondary route. Profile remains the stats and claims center. Buff and Push
remain workflow surfaces launched from Home.

Do not expose live match scores, pools, leading sides, odds, or win probability.
Keep existing wallet, Shelby, Aptos, loading, error, and fairness behavior.

## Motion

Motion communicates state only. Keep transitions short and controlled, remove
decorative background motion, and respect reduced-motion preferences.
