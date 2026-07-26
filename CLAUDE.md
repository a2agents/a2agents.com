# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A pnpm + Turborepo monorepo containing two mostly-independent products:

1. **The A2Agents website** (`apps/web`) — a static, hand-authored HTML + Tailwind site deployed to Cloudflare Pages.
2. **The Slack Mailbot** — a set of Cloudflare Workers that turn inbound email into Slack threads, generate LLM draft replies, and send outbound email. Workers share state through a single Cloudflare D1 database, R2 bucket, and Queue.

A third, unrelated Python project (`new_new_news/`) is a You.com-hackathon multi-agent research CLI. It has its own README/SETUP and does not share tooling with the JS monorepo.

## Commands

Run from the repo root unless noted. Turbo fans tasks out across all workspaces.

```bash
pnpm install               # install all workspaces
pnpm dev                   # turbo dev across workspaces
pnpm build                 # builds ONLY apps/web, then copies dist/ to repo-root dist/ (this is what Cloudflare Pages runs)
pnpm lint                  # turbo lint  (most workspaces are stubs that echo)
pnpm test                  # turbo test  (only slack_app has real tests)
pnpm typecheck             # turbo typecheck (tsc --noEmit per workspace)
```

Target a single workspace with `pnpm --filter <name>`, e.g. `pnpm --filter web dev`, `pnpm --filter slack_app test`.

### Website (`apps/web`)

```bash
pnpm --filter web dev      # compiles Tailwind once, then watches CSS + serves src/ on :3000, proxying /api -> :8787
pnpm --filter web build    # minifies Tailwind into dist/ and copies HTML/assets/sub-pages
```

The website has **no lint/test/typecheck** — those scripts intentionally echo "no ... configured". Editing is done directly on the HTML in `apps/web/src/`. See `EDITING.md` for the section-by-section, natural-language editing guide (content is marked with `[CONTENT: ...]` placeholders; colors use semantic Tailwind names `primary`/`secondary`/`warm`/`gray`).

Visual iteration: `apps/web/screenshots/run.sh` builds CSS, serves `src/` on :3099, and drives Chromium via Playwright (`take-screenshots.js`) to capture full-page + per-viewport PNGs into `apps/web/screenshots/`.

### Workers (Slack Mailbot)

Each worker (`email_ingest`, `slack_app`, `queue_consumer`) is a Wrangler project. Run/deploy via root scripts or per-filter:

```bash
pnpm worker:dev            # wrangler dev for email_ingest (also :slack-app, :queue-consumer variants)
pnpm worker:deploy         # wrangler deploy (also :slack-app, :queue-consumer variants)
```

Secrets are set with the `worker:secret:*` root scripts (each wraps `wrangler secret put`). The **same `SLACK_BOT_TOKEN` must be set on all three workers**. `OUTBOUND_EMAIL_FROM` is a Wrangler var on `queue_consumer`. Full setup lives in `infra/cloudflare/{EMAIL_MVP,SLACK_APP_SETUP,OUTBOUND_EMAIL_SETUP}.md`.

### slack_app tests (the only real test suite)

```bash
pnpm --filter slack_app test
```

This runs two things: a **source-guard test** (`test/no-content-persistence.test.mjs`, a plain Node script) and the node test runner over `test/*.test.ts` with `--experimental-strip-types`. Run a single file directly, e.g. `node --test --experimental-strip-types apps/workers/slack_app/test/state-router.test.ts`.

The source-guard test greps `slack_app/src/index.ts` and **fails the build if any `INSERT` into a guarded table (`action_log`, `telemetry_aggregates`, `idempotency_keys`, …) contains message-content columns** (`text`, `blocks`, `files`, …). This enforces the no-content-storage invariant below — keep raw message content out of those SQL statements or the test will fail.

### Database

```bash
pnpm db:migrate            # applies infra/cloudflare/schema.sql to the a2agents-comms D1 database
```

Migrations are numbered SQL files in `infra/cloudflare/migrations/` (`0001_init` … `0004_intake_sessions`). Apply them with Wrangler D1 before deploying workers that depend on new tables.

## Architecture

### Mailbot data flow

```
inbound email → email_ingest → R2 (raw source-of-truth) + D1 (metadata) + Slack thread anchor
Slack action/event → slack_app → enqueue QueueJob on COMMS_JOBS
QueueJob → queue_consumer → OpenAI draft / outbound send → email + Slack status update
```

- **`email_ingest`** — receives email, stores the raw message in R2 as the source of truth, writes searchable metadata to the D1 `messages` table, and creates the anchoring Slack thread.
- **`slack_app`** — the largest worker. Handles Slack Events API + interactive actions (signature-verified via `SLACK_SIGNING_SECRET`), and also hosts the public **intake chat API** (`chat_api.ts`) used by the website's builder/mentor/investor intake pages. It only enqueues work — the actual LLM/email work happens in the consumer. `QueueJob` is the message contract (defined in `slack_app/src/index.ts`).
- **`queue_consumer`** — drains `COMMS_JOBS`, calls OpenAI to draft replies or sends outbound email (via `@a2agents/email-sender`), and posts status back to Slack.

Shared bindings across workers: D1 `COMMS_DB` (database name `a2agents-comms`), the `COMMS_JOBS` queue, R2, and `SLACK_BOT_TOKEN`. D1 tables: `messages`, `drafts`, `events`, `channel_configs`, `channel_briefs`, plus the guarded operator/telemetry tables (see `schema.sql`).

### Intake chat (`slack_app/src/chat_api.ts`)

A LangChain (`@langchain/core`) pipeline serving the website's intake forms. It classifies a visitor into one of three **cohorts** (`builders` | `mentors` | `investors`), captures fields (name, email, city, goal, links), and drives a conversational flow backed by the D1 `intake_sessions` table. Behavior is gated by env flags like `INTAKE_TWO_STAGE_ENABLED` and `INTAKE_CALENDLY_URL`.

### Key invariants

- **No message-content storage in operator/telemetry tables.** Governed by `STRICT_NO_CONTENT_STORAGE` at runtime and enforced at build time by the source-guard test. When editing `slack_app`, never add content columns to guarded `INSERT`s.
- **Feature flags are env-driven.** Write actions (`WRITE_ACTIONS_ENABLED`), strict storage, and intake stages are all read from `Env` — check the flag before assuming a code path is live.
- **R2 is source-of-truth; D1 is an index.** Raw content lives in R2; D1 holds metadata and status.

## Conventions

- **Package manager is pnpm** (`packageManager: pnpm@10.14.0`); do not use npm/yarn. Workspaces: `apps/*`, `apps/workers/*`, `packages/*`.
- Workers and packages are ESM TypeScript (`"type": "module"`), extend `tsconfig.base.json` (strict, `moduleResolution: Bundler`, `noEmit`), and import local `.ts` files **with the `.ts` extension** (see `import ... from "./chat_api.ts"`).
- `packages/*` (`@a2agents/shared`, `@a2agents/email`, `@a2agents/email-sender`) are consumed as source (`main`/`types` point at `src/index.ts`); only `email-sender` and `shared` have meaningful content, the others are stubs.
- Wrangler configs (`wrangler.toml`/`.jsonc`) are **not** checked into the worker directories — they must be provisioned in the deploy environment. If a worker won't run locally, a missing Wrangler config is the likely cause.

## Root-level status/scratch files

Many root markdown files (`TODO.md`, `MVP_NEXT.md`, `WORKFLOWS_TO_ADD.md`) and `new_new_news/*_REPORT.md` are progress notes, not specs — treat them as context, not requirements. `WORKFLOWS_TO_ADD.md` in particular documents workflow files that must be added manually because the GitHub App lacks `workflows` permission.
