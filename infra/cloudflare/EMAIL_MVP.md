# Email -> Slack Mailbot v1

## Flow

1. Cloudflare Email Routing sends inbound `info@a2agents.com` mail to Worker `a2agents-email-ingest`.
2. `email_ingest` stores raw `.eml` in R2, metadata in D1, and posts a thread anchor in Slack.
3. Slack button clicks hit `a2agents-slack-app`, which enqueues jobs.
4. `a2agents-queue-consumer` generates drafts and sends approved replies.

## Required Cloudflare Resources

- D1 database: `a2agents-comms`
- R2 bucket: `a2agents-comms-archive`
- Queue: `comms-jobs`

## Apply D1 Schema

```bash
pnpm --filter email_ingest exec wrangler d1 execute a2agents-comms --file ../../../infra/cloudflare/schema.sql
```

## Email Routing

1. Cloudflare Dashboard -> `Email` -> `Email Routing`.
2. Create/verify route:
   - Custom address: `info`
   - Action: `Send to Worker`
   - Worker: `a2agents-email-ingest`

## Worker Secrets

Set these before deploy:

```bash
pnpm db:migrate
pnpm worker:secret:slack-bot
pnpm worker:secret:slack-bot:slack-app
pnpm worker:secret:slack-bot:queue-consumer
pnpm worker:secret:slack-signing
pnpm worker:secret:openai
pnpm worker:secret:postmark
```

Also set `SLACK_BOT_TOKEN` on `queue_consumer` (same token used by ingest/slack app).

## Deploy Workers

```bash
pnpm worker:deploy
pnpm worker:deploy:slack-app
pnpm worker:deploy:queue-consumer
```

## Validate

1. Send email to `info@a2agents.com`.
2. Confirm Slack message appears in `#project-mailbox` with buttons.
3. Click `Draft reply` and confirm draft appears in thread.
4. Click `Send` and confirm outbound message is sent once.
