# Palate UI Spec

## 1. UI Goal

Palate should feel like a premium GameFi product.

The UI must feel dynamic, powerful, elegant, competitive, cinematic, and slightly dramatic.

Palate must not look like a generic DeFi dashboard, a normal social media app, or a cute Web3 game.

The product should feel like a dark premium game lobby where media becomes the weapon and preference becomes the competition.

The visual direction is:

luxury
dark
bold
futuristic
competitive
cinematic
sharp
high-end
pink-accented
game-like but not childish

Pink is the main accent family, but it must feel mature, expensive, and controlled. Do not use candy pink, bubblegum pink, pastel pink, or overly flashy neon pink.

## 2. Main Navigation

The main navigation order is:

Home
Buff
My Media
Push
Profile

Buff must be placed directly after Home because Buff is the main user gameplay loop.

Buff must not be hidden inside Home, Push, Profile, or a secondary menu.

On desktop, the navigation should show Buff as the second main tab.

On mobile, the bottom navigation should show Buff as the second main tab.

The navigation should make Palate feel like an app/game lobby, not a landing page.

## 3. User-Facing Wording

Use Buff as the main user-facing term for supporting one side in a match.

The UI should say:

Buff
Buff A
Buff B
Buff Random Match
Find Match
Find Next Match
Skip Match
Buff Rewards
Pending Buffs

The contract should use Buff terminology for the MVP, including `placeBuff`, `claimBuff`, `buff_record`, `buff_pool_a`, `buff_pool_b`, `buff_count_a`, and `buff_count_b`.

For UI, Buff is the user-facing term for supporting one side.

Avoid using Judge, Vote, Rally, Boost, or Taste as main navigation terms.

Do not show legacy pre-Buff wording in primary UI unless required by contract debugging, migration notes, or developer-only labels.

## 4. Core App Structure

The MVP has five main pages:

Home
Buff
My Media
Push
Profile

There may be a secondary route for Upload and modals for Challenge or Claim Detail, but these should not become main navigation tabs in the MVP.

The app should focus on five actions:

Understand the game
Buff a random match
Manage uploaded media
Push media into competition
Track stats and claim rewards

## 5. Responsive Layout

The UI must be responsive from the beginning.

Desktop layout:

Use a left sidebar or strong app-style navigation.

The sidebar contains the Palate logo, main navigation, and wallet panel.

Main content should use a centered content area with a max width around 1200px to 1360px.

Desktop should use wide cinematic layouts, especially for Home, Buff, and Push.

Tablet layout:

Navigation may collapse into a compact rail or top bar.

Content should reduce from wide multi-column layouts to simpler two-column layouts.

Cards should remain large enough to show media clearly.

Mobile layout:

Use bottom navigation with the order:

Home
Buff
Media
Push
Profile

Do not hide Buff on mobile.

Content should become single-column.

Avoid tiny side-by-side media on mobile if readability is bad.

The Buff page on mobile should stack media A and media B vertically or use a strong full-width card layout.

Action buttons on Buff should be reachable near the bottom of the screen.

Use sticky action areas carefully for mobile decision screens.

## 6. Home Page

Home is the lobby.

Home should immediately tell the user what Palate is and what to do next.

Home should not be a long marketing landing page.

Home should include:

hero section
short explanation
primary action cards
featured match preview
quick protocol/game stats if available
wallet connection state

The hero should feel bold and premium.

Possible hero direction:

Buff is the signal.
Media is the weapon.
Buff the side you believe deserves to win.

The primary actions are:

Buff Random Match
Upload Media
Push Media

Buff Random Match should be the strongest CTA.

Home should include a visual match preview, but must not show live score, live buff pool, leading side, odds, or win probability.

Home should feel like entering a premium game lobby.

## 7. Buff Page

Buff is a dedicated main page from the MVP.

Buff is the main gameplay screen for users who want to support one side in a random match.

Buff has multiple states.

State 1: No assigned match.

Show a strong main panel with:

title
short explanation
Find Match button
available active matches if available
pending buffs if available
claimable buff rewards if available
skip penalty information if relevant

The page must not feel empty even when the only primary action is Find Match.

Suggested copy:

Buff a random match.
You will receive one active match. Pick the side you believe deserves to win.

State 2: Assigned match.

Show a dramatic decision layout.

Media A and media B should be the visual focus.

Desktop layout should use a strong A vs B split screen.

Mobile layout should stack or use full-width media cards.

The assigned match screen includes:

media A preview
media B preview
VS marker
category badge
time remaining
buff amount input
Buff A button
Buff B button
Skip Match button
skip penalty warning
wallet balance if available

Do not show:

live score
live buff pool
leading side
win probability
number of current supporters
anything that reveals which side is currently winning

State 3: Buff completed.

Show a success state with:

confirmation message
Find Next Match button
pending result message
optional link to Profile rewards

Do not show live match result if the match has not settled.

State 4: No valid match available.

Show a clean empty state:

No active match available right now.
Try again later or push your own media into a match.

Offer actions:

Go to Push
Go to My Media

State 5: Existing active assignment.

If the user already has an assigned match, entering Buff should show the existing assignment immediately.

The user must not be allowed to find a new match until they either Buff A, Buff B, or Skip Match.

## 8. My Media Page

My Media is the user's inventory.

This page shows all media registered by the connected wallet.

The top of the page should include:

page title
Upload Media button
summary count
filters

Filters:

All
Idle
Waiting
Active
Settled

Category filters:

All Categories
Meme
Image

Media card should show:

media preview
title
category
format label
status badge
created time
available action

Status actions:

Idle media shows Push.

Waiting media shows Waiting for Challenger.

Active media shows View Match.

Settled media shows View Result.

Disabled or banned media shows unavailable state.

My Media should feel like a premium inventory, not a file manager.

## 9. Upload Flow

Upload may be a secondary route or modal accessed from My Media and Home.

Upload must ask for category before file upload.

MVP user-facing categories:

Meme
Image

Accepted image formats:

PNG
JPG
JPEG
WEBP
GIF

GIF is an accepted image format, not a separate content category in the MVP.

Meme and Image both accept image file types.

The selected category is stored in the Palate smart contract during registerMedia.

Shelby stores the file.

Palate contract stores the category.

The required upload flow:

select category
select file
validate MIME type
upload to Shelby
register media on chain

The UI may also include preview, title entry, completed state, failed state, and return to My Media around the required flow.

The upload screen should show progress states:

Preparing file
Uploading to Shelby
Registering on chain
Completed
Failed

If Shelby upload succeeds but registerMedia fails, show a recovery state and allow retry registration if the required Shelby reference is still available.

## 10. Category And Format Rule

Category and file format are different.

Category means the content competition group.

Format means the technical file type.

For MVP:

category = meme or image
format = PNG, JPG, JPEG, WEBP, or GIF

A meme can only challenge another meme.

An image can only challenge another image.

Matches are separated by content category, not by file format.

A GIF meme can compete against a PNG meme.

A GIF visual artwork can compete against a WEBP image if both are registered under image.

Do not create GIF as a separate main category in the MVP.

## 11. Push Page

Push is the creator and challenger board.

Push should have two main tabs:

Waiting
Live Matches

Waiting tab:

Shows media waiting for challengers.

Each waiting push card should show:

media preview
category
format label
pusher address shortened
push amount
minimum challenge amount
created time
Challenge button

Challenge flow:

User clicks Challenge.
User selects one idle media from the same category.
User enters push amount.
UI shows required minimum amount.
User confirms transaction.

Challenge must not allow different categories to enter the same match.

Live Matches tab:

Shows active matches.

Each match card should show:

media A preview
media B preview
category
time remaining
status
View button if needed

Do not show:

live score
live buff pool
leading side
win probability
current supporter count

Push page should feel competitive and high-stakes.

## 12. Profile Page

Profile combines stats and claims for MVP.

The top section should show:

wallet address
claimable amount
push profit
buff profit
total pushed
total buffed

Profile should include two tabs:

Stats
Claims

Stats tab shows:

push count
push win count
push loss count
push win rate
push profit
buff count
buff win count
buff loss count
buff win rate
buff profit
total pushed
total buffed

Claims tab shows:

push claims
buff claims

Each claim card should show:

claim type
match reference
claimable amount
settled time if available
Claim button

Do not create a separate main Claims page for MVP.

## 13. Media Rendering

Media display should use the Shelby reference stored in the smart contract.

The app should read media metadata from the Palate contract and use Shelby to render the actual media file.

The app must not treat Shelby as the source of truth for category.

The category source of truth is Palate contract.

For image media, render image formats including PNG, JPG, JPEG, WEBP, and GIF.

If media cannot be loaded, show a premium unavailable media state instead of a broken image.

Do not use a backend database to store or classify media.

## 14. Motion And Dynamic UI

The UI must feel alive.

Use motion for:

page transitions
hover states
card focus
button feedback
match reveal
Buff A/B selection
loading states
success states
modal transitions

Motion should feel:

smooth
controlled
premium
cinematic
snappy

Do not use:

excessive bouncing
cheap spinning loaders
random flashing
playful cartoon animation
overloaded particle effects

The Buff match reveal should be one of the most polished motion moments in the app.

## 15. Visual Style

Use dark backgrounds with rich pink accents.

Use pink for:

primary CTA
selected state
subtle glow
important highlight
active nav item
focus ring
premium accent border

Do not fill the entire interface with pink.

The UI should rely on dark atmosphere, depth, contrast, media previews, and controlled glow.

The interface should feel expensive because of restraint.

## 16. Cards And Surfaces

Cards should feel deep, premium, and slightly dramatic.

Use:

dark layered surfaces
subtle borders
controlled glow
soft hover lift
clear hierarchy

Do not use:

flat white cards
cheap neon borders everywhere
overly rounded toy-like cards
rainbow gradients
cute sticker-like decoration

## 17. Buttons

Primary buttons should feel bold and premium.

Primary action examples:

Buff Random Match
Find Match
Buff A
Buff B
Upload Media
Push Media
Challenge
Claim

Primary buttons should use the main pink accent.

Secondary buttons should use dark surfaces with subtle border and pink hover feedback.

Danger or penalty actions such as Skip Match should be clearly less dominant than Buff A/B, but the penalty must be visually clear before the user signs.

## 18. Empty, Loading, And Error States

Empty states should be useful and direct.

Examples:

No media yet. Upload your first image to enter Palate.
No active match available. Try again later or push your own media.
No claimable rewards yet. Settled wins will appear here.

Loading states should show what is happening:

Uploading to Shelby
Registering on chain
Finding match
Submitting buff
Settling match
Claiming reward

Error states should explain what failed and what the user can do next.

Do not show raw technical errors as the main user-facing message unless in developer mode.

## 19. Security And Fairness UI Rules

The frontend must not show live active match score.

The frontend must not show live active buff pool.

The frontend must not show live leading side.

The frontend must not show active win probability.

The frontend must not allow a user to manually choose a match to Buff.

The frontend must not allow a user to Buff their own pushed match.

The frontend must not allow a user to Buff a match containing their own media.

The frontend must not allow a user to find a new match while an existing assigned match is unresolved.

The frontend must clearly show skip penalty before the user signs Skip Match.

## 20. MVP Page Summary

Home is the lobby.

Buff is the main gameplay screen.

My Media is the inventory.

Push is the challenge board.

Profile is the stats and rewards center.

The product should feel like a premium dark GameFi media arena with a mature pink signature.
