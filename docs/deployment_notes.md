# Palate Deployment Notes

## Aptos Testnet Deployment

- Network: Aptos testnet
- Module address: `0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f`
- Module name: `palate`
- Publish command: `aptos move publish --package-dir contracts --profile default --assume-yes`
- Published at: `2026-06-14 12:22:53 +07:00`
- Transaction hash: `0x27d73bc81f0e7b68eb9732ed7f58004283339a618639088c20b7a93859502f09`
- Explorer: `https://explorer.aptoslabs.com/txn/0xff869020893ab91d0b810b2aa53f0ecc0edaf45dd153b815159089cd99dde3db?network=testnet`

## Aptos Testnet Protocol Initialization

- Network: Aptos testnet
- Module address: `0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f`
- Function called: `0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate::initialize`
- Treasury address: `0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f`
- Command used: `aptos move run --function-id 0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate::initialize --args address:0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f --profile default --assume-yes`
- Initialized at: `2026-06-14 14:11:43 +07:00`
- Transaction hash: `0x5591319f47c7074811877ae12f20c2a2082b9f4a1f366fafde2d368e597c3d4d`
- Explorer: `https://explorer.aptoslabs.com/txn/0x5591319f47c7074811877ae12f20c2a2082b9f4a1f366fafde2d368e597c3d4d?network=testnet`

## Aptos Testnet Protocol Config Update

- Network: Aptos testnet
- Profile: `default`
- Module: `0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate`
- Purpose: cheaper and faster gameplay testing
- Applied at: `2026-06-17 16:56:36 +07:00`

Existing admin entry functions:

- `updatePushConfig(account, min_push_amount, min_push_increment_bps)`
- `updateBuffConfig(account, min_buff_amount, buff_commitment_amount, skip_penalty_amount)`
- `updateMatchConfig(account, match_duration_seconds, random_retry_count)`

Applied testnet values:

- `min_push_amount = 10000000` octas, 0.1 APT
- `min_buff_amount = 1000000` octas, 0.01 APT
- `skip_penalty_amount = 1000000` octas, 0.01 APT
- `match_duration_seconds = 600`, 10 minutes

Preserved values:

- `min_push_increment_bps = 500`
- `buff_commitment_amount = 50000000`
- `random_retry_count = 10`

Update commands used:

```powershell
aptos move run --function-id 0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate::updatePushConfig --args u64:10000000 u64:500 --profile default --assume-yes

aptos move run --function-id 0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate::updateBuffConfig --args u64:1000000 u64:50000000 u64:1000000 --profile default --assume-yes

aptos move run --function-id 0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate::updateMatchConfig --args u64:600 u64:10 --profile default --assume-yes
```

Transactions:

- `updatePushConfig` tx: `0x5675cccf9d5146e5143d8856620c08ae0fad7013298d5366cac89818a8f9162f`

- Explorer: `https://explorer.aptoslabs.com/txn/0x5675cccf9d5146e5143d8856620c08ae0fad7013298d5366cac89818a8f9162f?network=testnet`

- Status: `Executed successfully`

- Gas used: `63`

- Sequence number: `11`

- Version: `9322526260`

- `updateBuffConfig` tx: `0x7fb3e9f57859e22429376069ae6d7c6113fdeb85e5743d3f1678423b8e4cf515`

- Explorer: `https://explorer.aptoslabs.com/txn/0x7fb3e9f57859e22429376069ae6d7c6113fdeb85e5743d3f1678423b8e4cf515?network=testnet`

- Status: `Executed successfully`

- Gas used: `63`

- Sequence number: `12`

- Version: `9322526586`

- `updateMatchConfig` tx: `0xe76df14e1bbe2da507b3798bb1e5426030466320c7bcaedd15d5a36478e055c7`

- Explorer: `https://explorer.aptoslabs.com/txn/0xe76df14e1bbe2da507b3798bb1e5426030466320c7bcaedd15d5a36478e055c7?network=testnet`

- Status: `Executed successfully`

- Gas used: `63`

- Sequence number: `13`

- Version: `9322526926`

Read current config:

```powershell
aptos move view --function-id 0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate::getMinPushAmount --profile default
aptos move view --function-id 0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate::getMinPushIncrementBps --profile default
aptos move view --function-id 0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate::getMinBuffAmount --profile default
aptos move view --function-id 0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate::getBuffCommitmentAmount --profile default
aptos move view --function-id 0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate::getSkipPenaltyAmount --profile default
aptos move view --function-id 0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate::getMatchDurationSeconds --profile default
aptos move view --function-id 0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate::getRandomRetryCount --profile default
```

Expected current config after update:

- `getMinPushAmount`: `10000000`
- `getMinPushIncrementBps`: `500`
- `getMinBuffAmount`: `1000000`
- `getBuffCommitmentAmount`: `50000000`
- `getSkipPenaltyAmount`: `1000000`
- `getMatchDurationSeconds`: `600`
- `getRandomRetryCount`: `10`

Optional helper script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\update_testnet_protocol_config.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\update_testnet_protocol_config.ps1 -Apply
```

Notes:

- The raw CLI commands above were the commands actually used for this update.
- Frontend should continue reading protocol config from chain. No frontend min values were changed.
- Existing active matches may keep their old end time.
- New matches created after this config update should use the updated 10-minute duration.
- The helper script may require Aptos CLI compatibility fixes if the local CLI does not support `--output` for `aptos move view`.

## Aptos Testnet Contract Upgrade

- Network: Aptos testnet
- Module address: `0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f`
- Module name: `palate`
- Purpose: F12B claim discovery views
- Upgrade command: `aptos move publish --profile default --assume-yes`
- Upgraded at: `<PASTE_TIME>`
- Transaction hash: `<PASTE_PUBLISH_UPGRADE_TX_HASH>`
- Explorer: `https://explorer.aptoslabs.com/txn/<PASTE_PUBLISH_UPGRADE_TX_HASH>?network=testnet`

Changes:

- Added claim discovery views:
  - `getClaimDiscoveryRecords(user)`
  - indexed claim discovery helper views

- Frontend Profile Claims now reads claimable rewards from on-chain discovery views.
