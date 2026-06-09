# Shelby Notes

## Role In Palate

Shelby is used only for uploading, storing, retrieving, and displaying user uploaded media.

Shelby must not be used for match state, love state, reward state, payout state, leaderboard state, chart state, or user game history.

Palate stores actual media files on Shelby. Palate stores game state and media references on the current execution layer.

## Official Docs To Use

Main docs: https://docs.shelby.xyz

Browser upload guide: https://docs.shelby.xyz/sdks/typescript/browser/guides/upload

Browser download guide: https://docs.shelby.xyz/sdks/typescript/browser/guides/download

React SDK: https://docs.shelby.xyz/sdks/react

React upload hook: https://docs.shelby.xyz/sdks/react/mutations/use-upload-blobs

React account blobs query: https://docs.shelby.xyz/sdks/react/queries/use-account-blobs

React blob metadata query: https://docs.shelby.xyz/sdks/react/queries/use-blob-metadata

Examples repo: https://github.com/shelby/examples

## Important Architecture Rule

Do not invent a custom storage layer.

Do not replace Shelby with local filesystem storage, Firebase, Supabase, IPFS, ordinary S3, or a backend database.

The contract must not store raw media bytes.

The contract should store only the information needed to identify and verify the Shelby media, such as uploader address, blob name, Shelby blob reference if used, content hash, blob merkle root if needed, mime type, title, category, created time, and status.

## Browser Upload Flow

Shelby browser upload is not just a simple file POST.

According to the Shelby browser upload guide, uploading a file to Shelby involves three sequential steps.

Step 1 is file encoding. The frontend splits the file into chunks and generates commitment hashes. The guide uses `createDefaultErasureCodingProvider` and `generateCommitments` from `@shelby-protocol/sdk/browser`.

Step 2 is on chain blob registration. The frontend creates a Shelby blob registration payload with `ShelbyBlobClient.createRegisterBlobPayload`. The payload includes account address, blob name, blob merkle root, number of chunksets, expiration in microseconds, and blob size. The user submits this transaction with the Aptos wallet adapter.

Step 3 is RPC upload. After the on chain registration transaction is confirmed, the frontend uploads the actual file data to Shelby RPC with `shelbyClient.rpc.putBlob`. The RPC upload must happen after on chain registration because Shelby RPC validates the file against the registered commitment hashes before accepting the upload.

## Required Shelby Upload Dependencies

The browser upload flow may require these packages:

`@shelby-protocol/sdk`

`@aptos-labs/ts-sdk`

`@aptos-labs/wallet-adapter-react`

The React SDK flow may also require:

`@shelby-protocol/react`

`@tanstack/react-query`

Codex must check the latest Shelby docs before choosing the exact SDK method.

## Required Wallet And Tokens

For browser upload on Shelby testnet, the user needs an Aptos wallet configured for the Shelby network.

The user needs APT tokens for gas.

The user may need ShelbyUSD tokens for upload payment, depending on the current Shelby testnet setup.

If an API key is required, use an environment variable such as `NEXT_PUBLIC_SHELBY_API_KEY` only if the key is safe for browser exposure. If the key must be secret, do not expose it to the browser and document the required backend or proxy decision separately.

## Palate Upload Flow

The Palate frontend should first upload media to Shelby using the official Shelby flow.

After Shelby upload succeeds, the frontend calls Palate smart contract function `registerMedia`.

`registerMedia` should store the media reference needed by Palate, not the raw media bytes.

For Palate, the registered media record should include at least uploader address, blob name or Shelby blob reference, content hash, mime type, title, category, created time, and status.

## Browser Read And Display Flow

Shelby browser download docs state that files can be accessed directly through HTTP using this predictable URL pattern:

`https://api.testnet.shelby.xyz/shelby/v1/blobs/<uploader-address>/<file-name>.<file-extension>`

The docs also show SDK access through `shelbyClient.coordination.getAccountBlobs`, which returns blob metadata for an account, including file names, upload timestamps, file sizes, expiration dates, and blob merkle roots.

For Palate, the app should read `media_record` from the smart contract, extract the uploader address and blob name or Shelby reference, then build the Shelby display source using the documented Shelby retrieval method.

For image media, render the Shelby direct URL or retrieved blob in an image component.

For audio media, render the Shelby direct URL or retrieved blob in an audio player.

For video media, render the Shelby direct URL or retrieved blob in a video player.

The MVP supports image first.

## Direct URL Display Rule

If the media is public and the direct URL works, prefer direct URL display for MVP because it is simple and matches Shelby browser download docs.

The direct URL should be derived from the uploader address and blob name, not from a custom backend.

If direct URL access requires API key, authorization, or changes in Shelby docs, Codex must stop and document the requirement instead of inventing a workaround.

## SDK Read Rule

If direct URL display is not enough, use the official Shelby SDK or React SDK query methods.

Do not invent fake SDK methods.

If the exact method is unclear, inspect the Shelby docs or Shelby examples before coding.

## Content Hash Rule

Palate should keep a content hash in the smart contract record when possible.

The frontend can use this to verify that the rendered Shelby content matches the registered media if verification is implemented later.

Verification is not required for the first UI MVP, but the data model should not block it.

## Expiration Rule

Shelby upload includes an expiration time in microseconds.

Palate must treat Shelby media availability as dependent on Shelby retention and expiration policy.

The frontend should store or display expiration metadata if available.

If media expires or cannot be loaded, the UI should show a clear unavailable media state.

## Codex Rules For Shelby

Read this file before implementing Shelby upload, media read, media display, or media registry integration.

Use the official Shelby browser upload flow, React SDK, TypeScript SDK, or documented direct URL pattern.

Do not write placeholder fake Shelby APIs unless explicitly asked.

Do not silently replace Shelby with local filesystem storage, Firebase, Supabase, IPFS, ordinary S3, or a backend database.

Do not store raw media bytes in the Palate smart contract.

Do not store Palate match state in Shelby.
