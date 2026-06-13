# Frontend Rules

## 1. Required Reading

Before implementing frontend code, read:

docs/Palate_spec.md
docs/Palate_ui_spec.md
docs/design_tokens.md
docs/Shelby_notes.md
docs/naming_rules.md
docs/Codex_rules.md

Do not implement frontend code before reading these files.

## 2. Framework

Use Next.js with TypeScript.

Use App Router.

Do not add a backend database.

Do not add Firebase, Supabase, ordinary S3, IPFS, or local filesystem storage as replacements for Shelby.

Frontend game data should come from the current execution layer.

Media files should come from Shelby.

## 3. Main Routes

The main user-facing routes are:

/ = Home
/buff = Buff
/my-media = My Media
/push = Push
/profile = Profile

Secondary routes may include:

/my-media/upload
/push/[match_id]
/profile/claims

Secondary routes must not become main navigation tabs unless the product spec changes.

## 4. Navigation Rule

The main navigation order is:

Home
Buff
My Media
Push
Profile

Desktop navigation must place Buff directly after Home.

Mobile bottom navigation must place Buff directly after Home.

Do not hide Buff inside a menu.

Do not rename Buff to Judge, Vote, Rally, Taste, or Boost.

## 5. User-Facing Product Language

Use Palate as the product name.

Use Buff as the main UI term for supporting one side in a random match.

Use Buff A and Buff B for the two decision buttons.

Use Find Match for assigning a random active match.

Use Skip Match for skipping the assigned match.

Contract-level Love wording may exist internally if already defined in the smart contract spec.

The UI should hide internal Love terminology from normal users where possible.

## 6. Styling System

Use a design-token-driven styling approach.

Use tokens from docs/design_tokens.md.

Do not hardcode random colors throughout the app.

Do not use bright candy pink.

Do not create a generic DeFi dashboard style.

Do not make the UI cute, childish, meme-like, or overly playful.

Prefer premium dark GameFi elegance.

## 7. Responsive Rule

The frontend must be responsive from the beginning.

Desktop:

Use sidebar or app-style navigation.

Use cinematic multi-column layouts where appropriate.

Tablet:

Use compact navigation.

Reduce dense grids.

Mobile:

Use bottom navigation.

Use single-column layouts.

Make Buff decision actions easy to reach.

Do not squeeze two media cards into an unreadable horizontal layout on small screens.

## 8. Component Naming

Component file names should use lower_underscore where possible.

Examples:

navigation_bar.tsx
media_card.tsx
match_card.tsx
buff_panel.tsx
status_badge.tsx
action_button.tsx

React component function names may use PascalCase as an explicit frontend exception because JSX treats lowercase tags as native HTML elements.

Examples:

MediaCard
MatchCard
BuffPanel
StatusBadge
ActionButton

Custom hooks should use React hook naming.

Examples:

useWalletMedia
useActiveMatches
useAssignedMatch
useShelbyMediaSource

If this conflicts with docs/naming_rules.md, document the frontend exception instead of silently changing the rule.

## 9. Suggested Component Structure

Reusable components:

navigation_bar
mobile_bottom_nav
wallet_panel
page_header
section_panel
stat_card
media_card
match_card
waiting_push_card
buff_panel
buff_decision_card
action_button
status_badge
category_badge
format_badge
amount_input
claim_card
empty_state
loading_state
error_state
modal_shell
countdown_timer

Page-level components:

home_lobby
buff_page
my_media_page
upload_flow
push_board
profile_page

## 10. Data Source Rule

Do not create mock data as permanent app logic.

Mock data may be used only for early visual scaffolding and must be clearly marked as temporary.

Contract data is the source of truth for:

registered media
media owner
media category
media status
waiting pushes
active matches
assigned match
settlement result
claimable rewards
user summary

Shelby is the source for actual media files.

Shelby is not the source of truth for category, match state, reward state, or user history.

## 11. Shelby Integration Rule

Before implementing upload or media display, read docs/Shelby_notes.md.

Use official Shelby docs, SDK, React SDK, or documented direct URL pattern.

Do not invent fake Shelby APIs.

Do not replace Shelby with local storage, Firebase, Supabase, ordinary S3, IPFS, or backend database storage.

The upload flow must upload to Shelby first, then register the media on chain.

The display flow must read media metadata from the contract, then use Shelby to display the file.

## 12. Upload Rule

Upload must ask for category before upload.

MVP categories:

Meme
Image

Accepted formats:

PNG
JPG
JPEG
WEBP
GIF

GIF is a format, not a category.

Category is stored in the Palate contract.

MIME type and format are stored as metadata.

The frontend must validate that uploaded files match accepted image MIME types for MVP.

## 13. Match Fairness UI Rule

Never show live active match score.

Never show live active love pool.

Never show live leading side.

Never show live win probability.

Never show active supporter count if it reveals current direction.

Never let the user manually choose which match to Buff.

Never let the user Buff their own pushed match.

Never let the user Buff a match containing their own media.

Never let the user find a new match while an assigned match is unresolved.

Always show skip penalty before signing Skip Match.

## 14. Buff Page Implementation Rule

Buff is a main page.

Buff must support these states:

no assigned match
assigned match
buff completed
no valid match available
existing unresolved assignment
transaction loading
transaction failed

The assigned match state should be the most polished decision screen in the MVP.

The Buff page must work well on desktop and mobile.

## 15. My Media Implementation Rule

My Media must show wallet-owned registered media.

It must show:

preview
title
category
format
status
available action

It must support filters by status and category.

Idle media can be pushed.

Waiting media should show waiting state.

Active media should link to match view.

Settled media should show result if available.

## 16. Push Implementation Rule

Push page contains:

Waiting tab
Live Matches tab

Waiting tab shows waiting pushes and supports Challenge.

Live Matches tab shows active matches but hides live score and pools.

Challenge must require same-category media.

Challenge modal should show the minimum required amount based on the original push and protocol config.

## 17. Profile Implementation Rule

Profile combines stats and claims.

Profile should show:

wallet address
claimable amount
push profit
buff profit
total pushed
total buffed
push win rate
buff win rate

Claims should be separated into:

push claims
buff claims

Do not create a separate main Claims navigation tab in MVP.

## 18. Error Handling

User-facing errors should be clear and actionable.

Do not show only raw stack traces or raw RPC errors.

Examples:

Wallet not connected.
No valid match available.
Upload to Shelby failed.
On-chain registration failed.
Transaction rejected.
Insufficient balance.
Media unavailable.
Claim already completed.

Developer details may be logged to console during development.

## 19. Loading States

Use meaningful loading labels:

Connecting wallet
Loading media
Uploading to Shelby
Registering on chain
Finding match
Submitting buff
Skipping match
Creating push
Challenging push
Claiming reward

Avoid blank screens.

Avoid generic loading states without context.

## 20. Accessibility And Usability

Buttons must have clear labels.

Inputs must have labels.

Do not rely on color alone to communicate status.

Use readable contrast.

Interactive elements must have focus states.

Media cards should include alt text based on title when possible.

Animations should not block user actions.

## 21. Performance

Avoid loading all historical events on initial page load.

Load only what is needed for the current page.

Use pagination or incremental loading for history and large media lists.

Use optimized media rendering.

Avoid unnecessary re-renders on media-heavy pages.

## 22. Implementation Priorities

Build in this order:

layout shell and navigation
design tokens and global styles
wallet panel placeholder
Home lobby
Buff page states
My Media page
Upload flow
Push page
Profile page
Shelby media display integration
contract integration
loading and error states
responsive polish
motion polish

Do not start with leaderboard, social feed, seasons, notifications, comments, or ranking pages.

## 23. Things Not To Build In MVP

Do not build a social feed.

Do not build comments.

Do not build public likes.

Do not build leaderboard first.

Do not build seasons first.

Do not build direct match selection for Buff.

Do not build live odds.

Do not build live score display.

Do not add a backend database.

Do not add unnecessary tokenomics.

## 24. Final Frontend Goal

The frontend should make Palate feel like a premium dark GameFi media game.

The main user path is:

Home
Buff random match
Upload media
Push media
Track stats and claim rewards

The UI should feel dynamic, elegant, grand, and cool, with a mature pink visual signature.
