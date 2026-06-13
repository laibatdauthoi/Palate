# Palate Spec

## 1. Product Overview

Palate is a media game where users upload media, push their media into matches, and use APT to love the side they think should win.

Palate is not a normal social media app, not a streaming platform, and not a pure prediction market. It is an economic game around taste. Users compete with media, and viewers put money behind the media they prefer.

The current MVP uses Shelby for user uploaded media storage and uses Aptos smart contracts for media registry, ownership, push, challenge, random match assignment, love, settlement, rewards, protocol config, and user history. Rialo may be integrated later for automation or future execution logic.

## 2. Shelby Role

Shelby is only used to upload, store, and read user media. The app must not store user media in its own database.

Shelby stores the actual media files, such as image, meme, AI image, audio, and video. The MVP should only support image first.

Shelby must not store match state, love state, reward state, chart data, leaderboard data, payout data, or user game history. Those belong to the smart contract and on chain events.

## 3. Aptos Role In The Current MVP

Aptos smart contracts handle media registry, media ownership, push state, match state, love state, settlement result, claim state, protocol config, and user summary.

Aptos is the current execution and settlement layer for the MVP. This should be written in a way that does not lock the long term product narrative to Aptos only, because Rialo may be used later.

## 4. Core Data Rule

Uploading media and pushing media are two different actions.

First, the user uploads a media file to Shelby. Shelby returns a blob reference and content hash. Then the user calls `registerMedia` on Aptos to register that media in Palate.

The smart contract only stores metadata: media id, owner address, category, Shelby blob reference, content hash, mime type, title, created time, and status. The contract must not store raw media bytes.

When a user connects a wallet, the app reads registered media from Aptos and renders the actual file through the Shelby reference.

## 5. MVP Category

The MVP supports two user-facing content categories:

meme
image

Users must select a category before uploading media to Shelby.

Category and file format are different.

Category means the content competition group.

File format means the technical file type.

For the MVP:

category = meme or image

accepted image formats = PNG, JPG, JPEG, WEBP, GIF

Meme is not a file type. Meme is a user-selected content category.

GIF is not a separate category in the MVP. GIF is an accepted image format.

A user may upload a GIF into the meme category if the content is meme or reaction-style content.

A user may upload a GIF into the image category if the content is visual art, animation, poster-style content, edited image, AI image, or non-meme image content.

The smart contract cannot prove whether an image is truly a meme. The contract only stores and enforces the category selected by the user during registration.

Shelby stores the media file.

Palate smart contract stores the media category.

The upload flow is:

1. User selects category.
2. User selects file.
3. Frontend validates the file MIME type against the selected category.
4. Frontend uploads the file to Shelby.
5. User calls registerMedia on the smart contract.
6. registerMedia stores category, uploader address, blob name or Shelby reference, content hash, MIME type, title, created time, and status.

Matches must be category-matched.

A meme can only challenge another meme.

An image can only challenge another image.

The challenge flow must not allow media from different categories to enter the same match.

Matches are separated by content category, not by file format.

A GIF meme can compete against a PNG meme.

A GIF image can compete against a WEBP image if both are registered under the image category.

If a user intentionally selects the wrong category, the MVP handles it through reporting, admin disable, or future moderation. The contract should not attempt to classify meme content automatically.

## 6. User Profile

Each user has a profile showing uploaded media and game stats.

Media statuses should include `idle`, `waiting`, `active`, `settled`, `disabled`, and `banned`.

The profile should show push count, push win count, push loss count, push profit, love count, love win count, love loss count, love profit, total pushed, total loved, claimable amount, push win rate, and love win rate.

The contract should store a `user_summary` for fast reads. Detailed history should be rebuilt from on chain events, not from an unbounded array stored in user resources.

## 7. Media Registration

The upload flow is: user selects file on the frontend, frontend uploads the file to Shelby, Shelby returns `shelby_blob_ref` and `content_hash`, then the user signs a transaction calling `registerMedia`.

After `registerMedia` succeeds, the media appears in the wallet profile and can be selected for push.

## 8. Create Push

A user selects one registered idle media and calls `createPush` with a chosen APT amount.

The amount must be greater than or equal to `protocol_config.min_push_amount`.

The contract locks the push amount and creates a `waiting_push`.

If there is no challenger yet, the UI shows the media as waiting for challenger.

## 9. Challenge Push

Another user can view waiting pushes, inspect the waiting media, select one of their own idle media, and call `challengePush`.

The challenger must push more than the original pusher because the challenger has already seen the original media and can choose a counter media. The minimum required amount is based on `protocol_config.min_push_increment_bps`.

Example: if media A is waiting with 10 APT and the minimum increment is 5 percent, then media B must push at least 10.5 APT to challenge.

When `challengePush` succeeds, the waiting push becomes an active match. Media A is always the original waiting push media. Media B is always the challenger media.

## 10. Active Match

An active match contains media A, media B, pusher A, pusher B, push amount A, push amount B, start time, end time, love pool A, love pool B, score A, score B, love count A, love count B, and status.

The frontend may show active matches, but it must not show live score, love pool, current leading side, or win probability before settlement.

## 11. Random Match Assignment

Users are not allowed to manually choose which active match to love.

A user must call `findMatch`. The contract assigns a random active match that is valid for that user.

A valid assigned match must be active, not expired, not already loved by the user, not pushed by the user, and not contain media owned by the user.

If the user already has an active assignment, the user cannot call `findMatch` again until they either love the assigned match or call `skipMatch`.

## 12. Judge Commitment And Skip Penalty

When a user calls `findMatch`, the user must place `protocol_config.buff_commitment_amount`.

If the user completes `placeLove` for the assigned match, the judge commitment is returned or applied according to the implementation config.

If the user calls `skipMatch`, the user loses `protocol_config.skip_penalty_amount`.

The purpose of judge commitment and skip penalty is to make match skipping expensive and reduce the ability to spam random assignment until a target match appears.

## 13. Random Selection

The contract should maintain active match ids.

When `findMatch` is called, the contract selects an index from active match ids and checks whether that match is valid for the user. If not valid, the contract retries up to `protocol_config.random_retry_count`.

The MVP may use simple pseudo randomness from timestamp, user address, and nonce. A stronger randomness method should be reviewed before serious mainnet value is used.

## 14. Place Love

After a user receives an assigned match, the UI displays media A and media B. The user chooses Love A or Love B and enters a love amount.

`placeLove` only works for the current assigned match. The love amount must be greater than or equal to `protocol_config.min_love_amount`.

Each user can love a match only once. After a successful love, the assignment is cleared, and the user will never receive the same match again.

## 15. Winner Score And Payout Amount Are Separate

Palate separates winner score and payout amount.

Winner score decides which media wins the match. It must not be raw total APT, because that would let whales buy the result too directly.

Payout amount decides how rewards are distributed to users who loved the winning side. Payout amount uses the raw APT love amount.

This means a whale can risk more money to earn more payout if correct, but cannot easily buy the winner result with a linear money advantage.

## 16. Love Score Formula

All love score calculation must go through `calculateLoveScore`.

The MVP score formula is log score: `score = log2(1 + love_amount / min_love_amount)`.

Example: if min love is 0.1 APT, then 0.1 APT gives score 1, 1 APT gives score about 3.46, 10 APT gives score about 6.66, and 100 APT gives score about 9.97.

Move should use integer fixed point instead of float. For example, if the scale is 1,000,000, then score 3.46 is stored as 3,460,000.

The exact algorithm and its parameters should be controlled through `protocol_config`, so the scoring logic can be adjusted later without rewriting all business logic.

## 17. Protocol Config

Do not hardcode economic parameters inside business functions.

All adjustable parameters must be stored in `protocol_config`.

`protocol_config` should include `protocol_fee_bps`, `min_push_amount`, `min_buff_amount`, `min_push_increment_bps`, `match_duration_seconds`, `buff_commitment_amount`, `skip_penalty_amount`, `random_retry_count`, `score_algorithm_type`, `score_scale`, `score_log_base`, `treasury_address`, and `admin_address`.

Functions such as `createPush`, `challengePush`, `findMatch`, `skipMatch`, `placeLove`, `settleMatch`, `claimPush`, and `claimLove` must read from `protocol_config`.

## 18. Config Updates

The contract should expose grouped config update functions instead of one huge unsafe update function.

`updateFeeConfig` updates protocol fee and treasury address.

`updatePushConfig` updates min push amount and min push increment.

`updateLoveConfig` updates min love amount, buff commitment, and skip penalty.

`updateMatchConfig` updates match duration and random retry count.

`updateScoreConfig` updates score algorithm type, score scale, and score log base.

Only admin or governance should be able to call config update functions. The MVP can use an admin multisig. Later this can be moved to governance or timelock.

## 19. Settlement Rule

When an active match reaches end time, anyone can call `settleMatch`.

The match must produce a winner after end time. Do not add minimum love count. Do not add minimum total score. Do not cancel active matches because of low Love. Do not extend ties.

If `score_a > score_b`, media A wins.

If `score_b > score_a`, media B wins.

If `score_a == score_b`, media A wins.

Media A is the original waiting push media. Media B is the challenger media. If the score is tied, media A wins because the challenger already had the advantage of seeing media A before deciding to join and choosing a counter media.

## 20. Push Payout

The winning pusher receives their own push amount plus the losing pusher amount after protocol fee.

Protocol fee is charged only on the loser push amount, not on the winner original amount.

Example: A pushes 10 APT, B pushes 10.5 APT, and A wins. If protocol fee is 5 percent, A receives 10 APT plus 9.975 APT, and treasury receives 0.525 APT.

## 21. Love Payout

Users who loved the winning side receive their original love amount plus a pro rata share of the losing love pool after protocol fee.

Winner score decides the winning side. Raw love amount decides payout share.

Example: A wins. Love pool A is 100 APT. Love pool B is 60 APT. Protocol fee is 5 percent. Treasury receives 3 APT from pool B. The remaining 57 APT is shared by side A according to raw love amount.

If a user loved A with 10 APT and side A total is 100 APT, that user receives their 10 APT back plus 10 percent of 57 APT.

## 22. Claim

After settlement, the winning pusher can call `claimPush`.

Users who loved the winning side can call `claimLove`.

Losers cannot claim rewards.

Double claim must be impossible.

## 23. Waiting Push Cancel And Expire

A waiting push may be cancelled by its creator if there is no challenger and the cooldown or expiry rule allows it.

Waiting pushes should not exist forever. Expiry time can be added to `protocol_config` if needed.

Cancel and expiry only apply to waiting pushes. They must not be used to cancel active matches because of low Love.

## 24. History

The contract should emit events for key actions: media registered, push created, push cancelled, push challenged, match assigned, match skipped, love placed, match settled, push claimed, love claimed, and config updated.

The frontend can use Aptos indexer or event reads to display detailed user history.

The contract should store summary counters and claimable information, but should not store unlimited user history arrays.

## 25. Sybil And Whale Risk

Palate does not claim perfect sybil resistance. Without identity, KYC, or strong reputation, sybil attacks cannot be fully prevented on a public blockchain.

Palate reduces manipulation by using random assignment, forced progression, skip penalty, one love per wallet per match, pusher exclusion, owner exclusion, hidden active score in UI, log score instead of linear APT score, and configurable parameters.

Whales can still risk large amounts, but log score reduces their direct control over the winner.

## 26. Rialo Future Role

Rialo is not required for the MVP.

Later, Rialo may be used for automated settlement, automated waiting push expiry, scheduled events, match distribution, special rounds, and future execution logic.

The MVP should be written so that Aptos is the current implementation, not the permanent product identity.

## 27. Naming

Follow `docs/naming_rules.md`.

The project name is Palate in user facing text.

Use `Palate` in documentation and UI.

Use lowercase `palate` only where technical tooling requires lowercase naming.

Struct or class names use lowercase words separated by underscores, such as `media_record`, `active_match`, and `protocol_config`.

Function names use verbs with lowercase first letter and camelCase, such as `registerMedia`, `createPush`, `challengePush`, `findMatch`, `placeLove`, `settleMatch`, `claimPush`, and `claimLove`.

## 28. Main Structs

The main structs are `media_record`, `waiting_push`, `active_match`, `love_record`, `user_assignment`, `user_summary`, and `protocol_config`.

`media_record` stores registered media data.

`waiting_push` stores media waiting for challenger.

`active_match` stores a live match.

`love_record` stores a user love in a match.

`user_assignment` stores the match currently assigned to a user.

`user_summary` stores user profile statistics.

`protocol_config` stores adjustable economic and algorithm parameters.

## 29. Main Functions

The main functions are `registerMedia`, `getUserMedia`, `createPush`, `cancelPush`, `challengePush`, `findMatch`, `skipMatch`, `placeLove`, `calculateLoveScore`, `settleMatch`, `claimPush`, `claimLove`, `getUserSummary`, `getMatch`, `getWaitingPushes`, `getActiveMatches`, `updateFeeConfig`, `updatePushConfig`, `updateLoveConfig`, `updateMatchConfig`, and `updateScoreConfig`.

## 30. Initial MVP Parameters

The initial category is image.

Initial min push amount is 1 APT.

Initial min push increment is 5 percent.

Initial match duration is 24 hours.

Initial min love amount is 0.1 APT.

Initial buff commitment amount is 0.5 APT.

Initial skip penalty amount is 0.5 APT or higher if abuse appears.

Initial protocol fee is 5 percent.

Initial random retry count is 10.

Initial score algorithm is log score.

Initial score formula is `log2(1 + love_amount / min_love_amount)`.

## 31. Final MVP Summary

The MVP of Palate lets users upload image media to Shelby, register that media on Aptos, create waiting pushes, challenge waiting pushes, receive random matches, love one side with APT, settle matches after end time, and claim rewards.

Active matches always settle to a winner after end time. There is no cancellation because of low Love. If scores are tied, media A wins because media A is the original waiting push side.

Shelby stores media. Aptos handles registry, push, love, match state, settlement, reward, config, and user summary. Rialo is a future automation layer.
