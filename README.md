# a2agents Monorepo

Monorepo for the website and Cloudflare-based Slack Mailbot workers.

## Layout

```text
a2agents/
  apps/
    web/
    workers/
      email_ingest/
      slack_app/
      queue_consumer/
  packages/
    shared/
    email/
    email-sender/
  infra/
    cloudflare/
      schema.sql
      migrations/
```

## Install

```bash
pnpm install
```

## Website

```bash
pnpm --filter web dev
pnpm --filter web build
```

## Slack Mailbot v1

### Workers

- `email_ingest`: inbound email -> R2 + D1 + Slack thread anchor
- `slack_app`: Slack interactions/events -> queue jobs
- `queue_consumer`: draft/send jobs -> OpenAI + outbound email + Slack status

### Deploy

```bash
pnpm worker:deploy
pnpm worker:deploy:slack-app
pnpm worker:deploy:queue-consumer
```

### Set Secrets

```bash
pnpm worker:secret:slack-bot
pnpm worker:secret:slack-bot:slack-app
pnpm worker:secret:slack-bot:queue-consumer
pnpm worker:secret:slack-signing
pnpm worker:secret:openai
pnpm worker:secret:postmark
```

Set the same `SLACK_BOT_TOKEN` for all three workers, and set `OUTBOUND_EMAIL_FROM` as a Wrangler variable on `queue_consumer`.

## Cloudflare Setup Docs

- `infra/cloudflare/EMAIL_MVP.md`
- `infra/cloudflare/SLACK_APP_SETUP.md`
- `infra/cloudflare/OUTBOUND_EMAIL_SETUP.md`

## Database Schema

- `infra/cloudflare/schema.sql`
- `infra/cloudflare/migrations/0001_init.sql`

Apply migration with Wrangler D1 before deploying workers that use D1.
