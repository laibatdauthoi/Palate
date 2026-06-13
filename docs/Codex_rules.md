# Codex Rules

Project name is Palate. Always write the product name as Palate in documentation, UI copy, README, prompts, and user-facing text.

Use lowercase palate only for technical identifiers where lowercase is standard.

Shelby is only for uploading, storing, and reading user media. Do not store match state, love state, reward state, charts, or history in Shelby.

The current MVP uses Aptos smart contracts to handle media registry, ownership, push, challenge, random match assignment, love, settlement, claim, protocol config, and user summary.

Do not rename Palate.

Do not add minimum love count.

Do not add minimum total score.

Do not cancel active matches because of low Love.

Do not extend ties.

When active match reaches end_time, settleMatch must produce a winner.

If score_a > score_b, media A wins.

If score_b > score_a, media B wins.

If score_a == score_b, media A wins.

Media A is always the original waiting push media. Media B is always the challenger media.

User cannot manually choose match to love. User must call findMatch.

User must love assigned match before finding another match, unless user calls skipMatch and pays skip penalty.

Winner score and payout amount are separate. Score uses calculateLoveScore. Payout uses raw love amount.

All economic parameters must be read from protocol_config, not hardcoded.

Follow docs/naming_rules.md for file names, struct names, instance names, and function names.

Read docs/Shelby_notes.md before implementing Shelby upload, media read, media display, or media registry integration.

Read docs/Palate_ui_spec.md, docs/design_tokens.md, and docs/frontend_rules.md before implementing any frontend code.

The main navigation order is Home, Buff, My Media, Push, Profile.

Buff is a dedicated main page from the MVP and must be placed directly after Home.

The UI must feel premium, dark, dynamic, and GameFi-like, with mature pink accents. Do not make it cute, candy-like, generic, or overly flashy.
