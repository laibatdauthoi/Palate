# Design Tokens

## 1. Brand Direction

Palate uses a premium dark interface with pink as the dominant accent family.

Pink must feel mature, rich, and controlled.

The UI should feel expensive, sharp, cinematic, and game-like.

Do not use cheap candy pink, childish pastel palettes, rainbow gradients, or noisy crypto-dashboard visuals.

## 2. Color System

Use these tokens as the default design direction.

background_primary = #09070B
background_secondary = #100C14
background_tertiary = #17111D

surface_primary = #15111A
surface_secondary = #1D1625
surface_tertiary = #261D30
surface_elevated = #2D2338

surface_glass = rgba(255,255,255,0.045)
surface_glass_strong = rgba(255,255,255,0.075)

border_subtle = rgba(255,255,255,0.08)
border_medium = rgba(255,255,255,0.14)
border_focus = rgba(232,76,154,0.52)
border_danger = rgba(255,92,122,0.45)

text_primary = #F8F3FA
text_secondary = #C9BED4
text_muted = #91869D
text_disabled = #5F5668

accent_primary = #E84C9A
accent_primary_hover = #F062A7
accent_primary_active = #C93E84

accent_secondary = #B64DFF
accent_secondary_hover = #C46BFF
accent_secondary_active = #9638DD

accent_deep = #8F2F66
accent_soft = #FF8EC5

success_color = #45D483
warning_color = #F2B84B
danger_color = #FF5C7A
info_color = #7A8CFF

glow_pink = rgba(232,76,154,0.28)
glow_pink_soft = rgba(232,76,154,0.16)
glow_purple = rgba(182,77,255,0.22)
shadow_dark = rgba(0,0,0,0.42)

## 3. Color Usage

Use background_primary for the main app background.

Use background_secondary and background_tertiary for large page sections.

Use surface_primary and surface_secondary for cards.

Use surface_elevated for important panels and modals.

Use accent_primary for primary actions, selected states, focus highlights, and main navigation active state.

Use accent_secondary only as a supporting accent. Do not let purple overpower pink.

Use danger_color for destructive or penalty actions such as Skip Match.

Do not use bright white backgrounds.

Do not use full-screen pink backgrounds.

Do not use excessive neon outlines.

## 4. Gradients

Use restrained premium gradients.

gradient_primary = linear-gradient(135deg, #E84C9A 0%, #B64DFF 100%)

gradient_surface = linear-gradient(180deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.015) 100%)

gradient_hero = radial-gradient(circle at top, rgba(232,76,154,0.20), transparent 42%)

gradient_hero_secondary = radial-gradient(circle at 80% 20%, rgba(182,77,255,0.16), transparent 38%)

gradient_card_hover = linear-gradient(180deg, rgba(232,76,154,0.10) 0%, rgba(255,255,255,0.02) 100%)

Do not use rainbow gradients.

Do not use bright multi-color neon gradients.

## 5. Typography

Use a modern sans serif typeface.

Recommended fonts:

Inter
Manrope
Sora

If using Google Fonts or local fonts, choose one primary font and use it consistently.

Text hierarchy:

display_large = 56px
display_medium = 44px
heading_1 = 36px
heading_2 = 28px
heading_3 = 22px
body_large = 18px
body = 16px
body_small = 14px
caption = 12px

Font weights:

regular = 400
medium = 500
semibold = 600
bold = 700

Headlines should feel bold and premium.

Body text should stay readable and calm.

Avoid overly futuristic fonts that hurt readability.

## 6. Radius

Use moderate radius.

radius_xs = 6px
radius_small = 10px
radius_medium = 16px
radius_large = 22px
radius_xl = 28px
radius_pill = 999px

Do not make the whole app overly rounded or toy-like.

Use larger radius for hero panels and major feature cards.

Use smaller radius for input fields, badges, and compact controls.

## 7. Spacing

spacing_2xs = 2px
spacing_xs = 4px
spacing_sm = 8px
spacing_md = 12px
spacing_lg = 16px
spacing_xl = 24px
spacing_2xl = 32px
spacing_3xl = 48px
spacing_4xl = 64px
spacing_5xl = 96px

Use generous spacing for premium screens.

Do not cram too many elements into one panel.

Media cards should have enough breathing room.

## 8. Shadows And Glow

shadow_card = 0 12px 30px rgba(0,0,0,0.28)

shadow_card_hover = 0 18px 45px rgba(0,0,0,0.36)

shadow_modal = 0 30px 90px rgba(0,0,0,0.56)

shadow_glow = 0 0 32px rgba(232,76,154,0.16)

shadow_glow_strong = 0 0 48px rgba(232,76,154,0.26)

Use glow sparingly.

Glow should highlight important actions or selected states.

Do not apply heavy glow to every card.

## 9. Borders

Use subtle borders on dark surfaces.

Cards:

border: 1px solid border_subtle

Focused card:

border: 1px solid border_focus

Danger card:

border: 1px solid border_danger

Avoid thick neon borders.

Borders should add depth, not noise.

## 10. Motion

transition_fast = 160ms
transition_medium = 240ms
transition_slow = 360ms

easing_primary = cubic-bezier(0.22, 1, 0.36, 1)

easing_exit = cubic-bezier(0.55, 0, 1, 0.45)

Use motion for:

hover lift
button press
page transition
panel reveal
Buff match reveal
success confirmation
loading progress
modal open and close

Do not use:

excessive bounce
random shake
cheap spinner-only loading
constant flashing
cartoon motion

Motion should feel cinematic and controlled.

## 11. Layout Width

app_max_width = 1360px
content_max_width = 1200px
narrow_content_max_width = 860px

Desktop sidebar width:

sidebar_width = 260px
sidebar_compact_width = 76px

Mobile bottom nav height:

bottom_nav_height = 72px

Use these as guidance, not hard limitations.

## 12. Breakpoints

mobile_max = 767px
tablet_min = 768px
tablet_max = 1023px
desktop_min = 1024px
wide_desktop_min = 1440px

Desktop:

Use sidebar or app rail navigation.

Tablet:

Use compact rail or top navigation.

Mobile:

Use bottom navigation.

## 13. Buttons

Primary button:

background = gradient_primary or accent_primary
text = text_primary
border = transparent
shadow = shadow_glow
hover = accent_primary_hover
active = accent_primary_active

Secondary button:

background = surface_secondary
text = text_primary
border = border_subtle
hover border = border_focus

Ghost button:

background = transparent
text = text_secondary
hover text = text_primary
hover background = surface_glass

Danger button:

background = rgba(255,92,122,0.12)
text = #FFD7DF
border = border_danger
hover background = rgba(255,92,122,0.18)

Primary buttons should feel strong and expensive.

Danger buttons must be clear but not more dominant than the main Buff decision buttons.

## 14. Cards

Card base:

background = surface_primary
border = border_subtle
radius = radius_large
shadow = shadow_card

Card hover:

transform = translateY(-2px)
shadow = shadow_card_hover
border = border_medium

Important card:

background = surface_elevated
border = border_focus
shadow = shadow_glow

Media cards should focus on media preview first.

Text and actions should not overpower the media.

## 15. Badges

Badge base:

radius = radius_pill
padding = 6px 10px
font_size = caption
font_weight = medium

Status badge colors:

idle = text_secondary on surface_secondary
waiting = warning_color on dark warning surface
active = accent_primary on dark pink surface
settled = success_color on dark success surface
disabled = text_muted on surface_secondary

Category badge:

meme = accent_primary
image = accent_secondary

Format badge:

Use neutral surface and text_muted.

## 16. Inputs

Input background = surface_secondary
Input border = border_subtle
Input focus border = border_focus
Input text = text_primary
Input placeholder = text_muted
Input radius = radius_medium

Inputs should be readable on dark backgrounds.

Amount input on Buff should feel important and clean.

## 17. Navigation

Active nav item:

text = text_primary
background = rgba(232,76,154,0.12)
border = rgba(232,76,154,0.28)
glow = glow_pink_soft

Inactive nav item:

text = text_secondary
hover text = text_primary
hover background = surface_glass

Buff nav item should be visually easy to find because it is the main gameplay loop.

## 18. Media Display

Media containers should use dark surfaces and subtle borders.

Use object-fit carefully.

Do not crop important media aggressively unless the card is only a preview.

For detailed views, show the full media as much as possible.

GIF should be treated as an image format and displayed like image media.

Unavailable media should show a styled placeholder, not a broken browser image icon.

## 19. Loading Style

Use premium skeleton states and short status text.

Examples:

Finding match
Uploading to Shelby
Registering on chain
Submitting buff
Claiming reward

Avoid cheap generic spinners as the only loading state.

## 20. Overall Constraint

The UI should look premium, dark, game-like, and mature.

Pink is the signature accent.

Dark atmosphere is the foundation.

The final result should feel powerful, stylish, and high-end, not loud or childish.
