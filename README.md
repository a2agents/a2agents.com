# a2agents Monorepo

This repository now contains the website plus Cloudflare Worker services for inbound email processing.

## Monorepo Layout

```text
a2agents/
  apps/
    web/
    workers/
      email_ingest/
      slack_actions/
      queue_consumer/
  packages/
    shared/
    email/
  infra/
    cloudflare/
```

## Prerequisites

- Node.js 20+
- pnpm 10+
- Cloudflare account with `a2agents.com` zone

## Install

```bash
pnpm install
```

## Run Website

```bash
pnpm --filter web dev
```

Build website:

```bash
pnpm --filter web build
```

## Worker: Email Ingest MVP

The MVP Worker receives routed email events and posts short messages to Slack.

Set Slack secret:

```bash
pnpm --filter email_ingest exec wrangler secret put SLACK_WEBHOOK_URL
```

Deploy Worker:

```bash
pnpm --filter email_ingest deploy
```

Equivalent root shortcut:

```bash
pnpm worker:deploy
```

Full Cloudflare setup instructions are in `infra/cloudflare/EMAIL_MVP.md`.

## Root Scripts

- `pnpm dev` -> `turbo dev`
- `pnpm build` -> `turbo build`
- `pnpm lint` -> `turbo lint`
- `pnpm test` -> `turbo test`
- `pnpm typecheck` -> `turbo typecheck`
- `pnpm worker:deploy` -> deploy `apps/workers/email_ingest`
- `pnpm worker:dev` -> run worker locally

## Next MVP Phase

Planned follow-up work is tracked in `MVP_NEXT.md`.
