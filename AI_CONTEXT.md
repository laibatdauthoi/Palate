# Project Overview

- **Purpose:** Palate is an Aptos-based media game where users upload media, create or challenge pushes, get assigned random Buff opportunities, and later settle or claim outcomes. The on-chain game logic lives in Move; the frontend orchestrates wallet flows, reads, and Shelby-backed media uploads.
- **Target users:** Aptos testnet users who want to upload media, stake on matchups, Buff random matches, and claim rewards through a game-like UI.
- **Core user flows:**
  - Connect Aptos wallet and fund / view balances.
  - Upload IMAGE / MEME / AUDIO media to Shelby, then register it on-chain.
  - Create a push from idle media, or challenge an existing waiting push from Home.
  - Browse Home public state: waiting pushes and active / ended matches.
  - Launch Buff from Home to request a random eligible match, then Buff a side or skip.
  - Settle ended matches, claim rewards, manage profile activity, and delete or clean up media when allowed.
- **Current project maturity:** Functional prototype / active MVP iteration. Core contract, wallet, Shelby upload, read models, and main user pages are implemented. There is still visible iteration around UI scale/layout, some mock/development paths remain, and parts of the service boundary are marked as future-facing.

# Tech Stack

- **Frameworks:** Next.js App Router (`frontend/app`), React 19.
- **Languages:** TypeScript, CSS, Move.
- **Libraries:** `@aptos-labs/ts-sdk`, `@aptos-labs/wallet-adapter-react`, `@fontsource-variable/fredoka`, `@shelby-protocol/sdk`.
- **Blockchain / database / storage:**
  - Aptos smart contracts for game state, balances, claims, pushes, matches, Buffs, and protocol config.
  - No traditional backend database detected.
  - Shelby Protocol for media upload / storage / retrieval.
- **External services:** Aptos fullnode RPC, Shelby API. Rialo is referenced in docs as a future integration, not a current runtime dependency.
- **Deployment target:** Unclear. The frontend is a standard Next.js app and appears deployable on a typical Node/Next hosting target.

# Repository Structure

- [`frontend/`](./frontend) — Next.js application.
  - [`frontend/app/`](./frontend/app) — App Router pages and layout.
  - [`frontend/components/`](./frontend/components) — reusable UI building blocks, cards, modals, buttons, media renderers.
  - [`frontend/providers/`](./frontend/providers) — wallet, Palate domain state, media player, media viewer.
  - [`frontend/services/`](./frontend/services) — Aptos read/write helpers, Shelby upload helpers, caches, performance helpers.
  - [`frontend/styles/`](./frontend/styles) — global CSS, tokens, layout scale policy.
  - [`frontend/types/`](./frontend/types) — frontend domain models and UI/read lifecycle types.
  - [`frontend/config/`](./frontend/config) — app/network/module configuration.
  - [`frontend/data/`](./frontend/data) — mock/demo data used in controlled fallback scenarios.
- [`contracts/`](./contracts) — Move package for the Palate protocol.
  - [`contracts/sources/palate.move`](./contracts/sources/palate.move) — main on-chain module.
  - [`contracts/Move.toml`](./contracts/Move.toml) — Move package metadata and named addresses.
- [`docs/`](./docs) — product, naming, frontend, and layout-scale rules.
- [`packages/`](./packages) — present, but no critical runtime role was needed for current repo understanding.
- [`scripts/`](./scripts) — auxiliary scripts; not central to the current architecture summary.
- [`read_me.md`](./read_me.md) — project-level functional overview.

# Architecture

- **Frontend architecture:**
  - Global app shell is defined in [`frontend/app/layout.tsx`](./frontend/app/layout.tsx).
  - The layout mounts `NavigationBar`, `MobileBottomNav`, `RouteBackground`, `RoutePerfTracker`, and wraps pages with providers.
  - Main pages are Home, My Media, and Profile, with Buff and Push exposed as reusable workflow surfaces launched from Home.
- **Backend architecture:** No standalone backend service detected. The frontend talks directly to Aptos and Shelby.
- **Blockchain architecture:**
  - Move contract in [`contracts/sources/palate.move`](./contracts/sources/palate.move) owns protocol state.
  - Frontend reads summarized public/user state through Aptos views and related SDK reads.
  - Transactions are initiated from the frontend through wallet signing.
- **Data flow:**
  - UI components call hooks from `PalateProvider` and `WalletProvider`.
  - `PalateProvider` coordinates Aptos reads, Shelby upload state, transaction state, feedback, lifecycle tracking, and wallet-scoped caches.
  - `aptos_service.ts` maps on-chain summaries into frontend types and applies grouped cache/inflight logic.
- **Authentication flow:**
  - Authentication is wallet-based via Aptos wallet adapter.
  - `WalletProvider` exposes wallet address, network, connect/disconnect, transaction submission, and wallet balance.
  - Wrong-network handling is explicit; Aptos Testnet is the supported network.
- **Provider/state flow:**
  - Provider order in [`frontend/app/layout.tsx`](./frontend/app/layout.tsx):
    `WalletProvider -> PalateProvider -> MediaPlayerProvider -> MediaViewerProvider`
  - `PalateProvider` is the main domain orchestrator and exposes user/public records, read status, lifecycle state, and all major actions.
- **Service layer:**
  - [`frontend/services/aptos_service.ts`](./frontend/services/aptos_service.ts) handles Aptos config, canonical address normalization, grouped reads, cache/inflight dedupe, and type mapping.
  - [`frontend/services/shelby_service.ts`](./frontend/services/shelby_service.ts) handles upload preparation, Shelby blob registration, upload completion, read URLs, and delete payload helpers.
- **Transaction flow:**
  - UI calls provider actions such as create push, challenge, find match, Buff, skip, settle, claim, deposit, withdraw, delete, retry, etc.
  - Provider actions build payloads via the service layer, then submit through wallet signing.
  - Some service comments explicitly mark transaction boundaries as future-facing, so provider actions are the real current orchestration layer.
- **Upload flow:**
  - User selects file -> Shelby upload preparation -> blob upload -> on-chain registration -> media inventory refresh.
  - Upload step labels come from [`frontend/config/app_config.ts`](./frontend/config/app_config.ts).
- **Caching strategy:**
  - Aptos reads use grouped read caches and inflight dedupe in the service layer.
  - Provider state tracks wallet-scoped ownership / lifecycle to avoid stale reads after wallet switching.
  - Home uses periodic refreshes for live-ish public state and Home-owned challenge entry.

# Coding Conventions

- **Naming:**
  - Product name is `Palate` in user-facing text, `palate` in technical identifiers.
  - File naming generally follows lower underscore for many TSX files, with React component exports in PascalCase.
  - See [`docs/naming_rules.md`](./docs/naming_rules.md).
- **Component organization:**
  - Cards, modals, renderers, and buttons are split into focused component files under [`frontend/components/`](./frontend/components).
  - Route pages compose shared primitives instead of duplicating shell logic.
- **Styling:**
  - Global CSS and tokens live in [`frontend/styles/globals.css`](./frontend/styles/globals.css) and [`frontend/styles/tokens.css`](./frontend/styles/tokens.css).
  - Layout scaling follows [`docs/Layout_scale_rules.md`](./docs/Layout_scale_rules.md).
  - Styling is CSS-based rather than Tailwind or CSS-in-JS.
- **TypeScript:**
  - Shared domain/UI/read lifecycle types are centralized in [`frontend/types/palate.ts`](./frontend/types/palate.ts).
  - Address normalization uses explicit helpers (`canonicalizeAptosAddress`) rather than ad hoc comparisons.
- **Error handling:**
  - UI distinguishes loading / error / empty states with dedicated components.
  - Provider actions set scoped feedback messages and track read lifecycle state.
  - Contract-side errors are allowed to surface when frontend preflight cannot safely rule them out.
- **State management:**
  - Context providers are the primary state management pattern.
  - `PalateProvider` is the dominant domain state container.
- **Imports:**
  - Path aliases are used in the frontend (for example `@/components/...`, `@/providers/...`).
- **Folder organization:**
  - App Router pages under `frontend/app`.
  - Providers for cross-route state.
  - Services for Aptos/Shelby and read caches.
  - Types and config centralized.

# Product Decisions

- Users do **not** choose Buff targets directly; random assignment / Find Match is the intended flow.
- Frontend preflights should avoid opening wallet flows when no eligible Buff match exists.
- Live score / hidden Buff direction is intentionally not exposed on Home before settlement.
- Palate Balance is a first-class in-app balance concept, not just direct per-action wallet transfers.
- Shelby is the media storage system; media is not stored directly in a traditional backend.
- Video support exists in type/config shape but is intentionally disabled at runtime (`VIDEO_ENABLED = false`).
- Home uses public polling / revalidation to keep public state fresh.
- Layout work follows an explicit scale contract documented in [`docs/Layout_scale_rules.md`](./docs/Layout_scale_rules.md).

# Completed Features

- Wallet connection, wrong-network detection, and wallet balance reads.
- Home public lobby with waiting pushes, matches, tabs, and challenge flow.
- My Media inventory with category/status filtering and media lifecycle actions.
- Reusable Push workflow with Home-owned `mediaId` / `challengeId` / `pushId` query entry.
- Reusable Buff workflow launched from Home, with Buff-result follow-up moved into Profile Claims.
- Profile page with stats, claims, balances, and activity log.
- Shelby media upload and Shelby-backed media access.
- Aptos read mapping for public state, user summary, claim history, Buff history, balances, and activity summaries.
- Move contract for protocol config, media, pushes, matches, Buffs, settlement, claims, and user/account summaries.

# Important Files

- [`frontend/app/layout.tsx`](./frontend/app/layout.tsx) — root shell and provider composition.
- [`frontend/app/page.tsx`](./frontend/app/page.tsx) — Home page orchestration.
- [`frontend/app/my-media/page.tsx`](./frontend/app/my-media/page.tsx) — wallet media inventory and lifecycle actions.
- [`frontend/app/profile/page.tsx`](./frontend/app/profile/page.tsx) — profile stats, balances, claims, activity.
- [`frontend/components/buff_workflow.tsx`](./frontend/components/buff_workflow.tsx) — reusable Buff workflow used by Home.
- [`frontend/components/push_create_workflow.tsx`](./frontend/components/push_create_workflow.tsx) — reusable Push creation workflow used by Home and My Media query entry.
- [`frontend/providers/palate_provider.tsx`](./frontend/providers/palate_provider.tsx) — main app state/orchestration layer.
- [`frontend/providers/wallet_provider.tsx`](./frontend/providers/wallet_provider.tsx) — wallet adapter integration and wallet session state.
- [`frontend/services/aptos_service.ts`](./frontend/services/aptos_service.ts) — Aptos reads, caches, mapping, payload helpers.
- [`frontend/services/shelby_service.ts`](./frontend/services/shelby_service.ts) — Shelby upload and media storage integration.
- [`frontend/types/palate.ts`](./frontend/types/palate.ts) — shared domain/read/UI types.
- [`frontend/config/app_config.ts`](./frontend/config/app_config.ts) — network/module/env feature flags and app constants.
- [`contracts/sources/palate.move`](./contracts/sources/palate.move) — Palate protocol contract.
- [`docs/frontend_rules.md`](./docs/frontend_rules.md), [`docs/Codex_rules.md`](./docs/Codex_rules.md), [`docs/Layout_scale_rules.md`](./docs/Layout_scale_rules.md) — implementation constraints and product rules.

# Known Risks

- [`frontend/providers/palate_provider.tsx`](./frontend/providers/palate_provider.tsx) is very large and central; it has high regression risk.
- The frontend still contains controlled mock/development paths, so wallet-scoped fallback behavior must be handled carefully.
- Some Aptos service boundaries are marked as future/not fully generalized, which makes provider/service responsibility lines somewhat fragile.
- UI scale/layout work is staged and CSS-heavy; breakpoint/scale regressions are likely if unrelated selectors are touched casually.
- Video support is typed but disabled, so future enablement will require checking assumptions across upload/render flows.
- No automated frontend test suite was detected in `frontend/package.json`, so behavior verification is currently lint/build/manual heavy.

# Development Commands

- **Install frontend deps:** `cd frontend && npm install`
- **Run frontend dev server:** `cd frontend && npm run dev`
- **Build frontend:** `cd frontend && npm run build`
- **Lint frontend:** `cd frontend && npm run lint`
- **Frontend tests:** Unclear. No `test` script was detected in [`frontend/package.json`](./frontend/package.json).
- **Compile Move contract:** `cd contracts && aptos move compile`
- **Test Move contract:** `cd contracts && aptos move test`
- **Publish Move contract:** `cd contracts && aptos move publish`
- **Optional Aptos environment setup:** `aptos init`

# Environment Variables

Detected from [`frontend/config/app_config.ts`](./frontend/config/app_config.ts):

- `NEXT_PUBLIC_APTOS_FULLNODE_URL`
- `NEXT_PUBLIC_TESTNET_API_KEY`
- `NEXT_PUBLIC_SHELBY_API_KEY`
- `NEXT_PUBLIC_DEBUG_APTOS_READS`
- `NEXT_PUBLIC_DEBUG_UI_PERF`

Other required secrets or deployment variables are **Unclear** from the current repository state.

# Last Updated

- 2026-07-02
