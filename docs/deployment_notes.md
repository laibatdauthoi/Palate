# Palate Deployment Notes

## Aptos Testnet Deployment

- Network: Aptos testnet
- Module address: `0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f`
- Module name: `palate`
- Publish command: `aptos move publish --package-dir contracts --profile default --assume-yes`
- Published at: `2026-06-14 12:22:53 +07:00`
- Transaction hash: `0xc495a82b65d029853f782c65f59519b2b20201d5af7e40d6cc5d8ee7c3287ea8`
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

- Profile: `default`
- Module: `0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate`
- Existing admin entry functions:
  - `updatePushConfig(account, min_push_amount, min_push_increment_bps)`
  - `updateBuffConfig(account, min_buff_amount, buff_commitment_amount, skip_penalty_amount)`
  - `updateMatchConfig(account, match_duration_seconds, random_retry_count)`
- Target testnet values:
  - `min_push_amount = 10000000`
  - `min_buff_amount = 1000000`
  - `skip_penalty_amount = 1000000`
  - `match_duration_seconds = 600`

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

Update config with raw CLI commands:

```powershell
aptos move run --function-id 0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate::updatePushConfig --args u64:10000000 u64:500 --profile default --assume-yes
aptos move run --function-id 0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate::updateBuffConfig --args u64:1000000 u64:50000000 u64:1000000 --profile default --assume-yes
aptos move run --function-id 0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate::updateMatchConfig --args u64:600 u64:10 --profile default --assume-yes
```

Read config after update:

```powershell
aptos move view --function-id 0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate::getMinPushAmount --profile default
aptos move view --function-id 0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate::getMinBuffAmount --profile default
aptos move view --function-id 0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate::getSkipPenaltyAmount --profile default
aptos move view --function-id 0xe5e752771b9e1b5ac445d3d28f1bf636e6e6c3207e61917c036c1517c2b4373f::palate::getMatchDurationSeconds --profile default
```

Scripted option:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\update_testnet_protocol_config.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\update_testnet_protocol_config.ps1 -Apply
```

Notes:

- The script preserves current `min_push_increment_bps`, `buff_commitment_amount`, and `random_retry_count` by reading them from chain first.
- Frontend should continue reading protocol config from chain. No frontend min values were changed.
- Existing active matches may keep their old end time. New matches created after the config update should use the updated 10-minute duration.
