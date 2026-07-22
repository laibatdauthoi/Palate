# Codex Rules

Project name is Palate. Always write the product name as Palate in documentation, UI copy, README, prompts, and user-facing text.

Use lowercase palate only for technical identifiers where lowercase is standard.

Shelby is only for uploading, storing, retrieving, and displaying user media. Do not store match state, buff state, reward state, payout state, leaderboard state, chart state, or user game history in Shelby.

The current MVP uses Aptos smart contracts to handle media registry, ownership, push, challenge, random match assignment, Buff, settlement, claim, protocol config, and user summary.

The current MVP uses Palate Balance for gameplay funds. Users deposit APT with `depositBalance`, gameplay actions spend or lock available Palate Balance, claims credit rewards to available Palate Balance, and users withdraw available Palate Balance with `withdrawBalance`.

Do not reintroduce direct wallet withdrawal for every Push, Challenge, Find Match, Skip Match, placeBuff, claimPush, or claimBuff action. Wallet transfer should happen at Palate Balance deposit and withdrawal boundaries.

Do not rename Palate.

Do not add minimum buff count.

Do not add minimum total score.

Do not cancel active matches because of low Buff.

Do not extend ties.

When active match reaches end_time, settleMatch must produce a winner.

If score_a > score_b, media A wins.

If score_b > score_a, media B wins.

If score_a == score_b, media A wins.

Media A is always the original waiting push media. Media B is always the challenger media.

User cannot manually choose match to Buff. User must call findMatch.

User must Buff the assigned match before finding another match, unless user calls skipMatch and pays skip penalty.

Winner score and payout amount are separate. Score uses calculateBuffScore. Payout uses raw buff amount.

All economic parameters must be read from protocol_config, not hardcoded.

Follow docs/naming_rules.md for file names, struct names, instance names, and function names.

Read docs/Shelby_notes.md before implementing Shelby upload, media read, media display, or media registry integration.

Before implementing anything, read:

docs/Palate_spec.md
docs/Palate_ui_spec.md
docs/design_tokens.md
docs/Layout_scale_rules.md
docs/frontend_rules.md
docs/Shelby_notes.md
docs/naming_rules.md
docs/Codex_rules.md

Do not write code until an implementation plan is approved.

The main navigation order is Home, My Media, Profile.

Buff and Push are Home-owned workflow surfaces, not standalone navigation destinations.

Use Buff as the main user-facing term for supporting one side in a random match.

Use Buff terminology in the main contract spec: `placeBuff`, `claimBuff`, `buff_record`, `buff_pool_a`, `buff_pool_b`, `buff_count_a`, `buff_count_b`, `min_buff_amount`, `buff_commitment_amount`, `calculateBuffScore`, `buff_win_count`, `buff_loss_count`, `buff_profit`, and `total_buffed`.

The UI must feel calm, editorial, bright, and intentional. Use the semantic
surface system and reserve pink for brand, primary actions, active states,
rewards, and focus. Do not add gradients, bevels, gloss, glow, or decorative
material effects.

## Layout scale contract

For any UI layout, spacing, sizing, grid, card, sidebar, modal, or button dimension change, follow `docs/Layout_scale_rules.md`.

Do not introduce layout values that bypass the scale system.

If a UI change cannot be mapped to the scale system, stop and ask before implementing.

MVP media categories are meme, image, audio, and video.

GIF is an accepted image format, not a separate category.

Category is stored in the Palate smart contract. Shelby stores the file only.
