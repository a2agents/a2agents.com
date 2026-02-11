# Email to Slack MVP (Cloudflare Email Routing + Worker)

## Goal
Route `info@a2agents.com` inbound mail through Cloudflare Email Routing into Worker `a2agents-email-ingest`, then post a short notification into Slack channel `#project-mailbox`.

## Prerequisites
- Cloudflare zone for `a2agents.com` is active.
- Email Routing is enabled for the zone.
- Slack Incoming Webhook URL created for `#project-mailbox`.

## Configure Email Routing
1. Open Cloudflare Dashboard for `a2agents.com`.
2. Go to `Email` -> `Email Routing`.
3. Add/verify destination address if prompted.
4. Create route:
   - Custom address: `info`
   - Action: `Send to Worker`
   - Worker: `a2agents-email-ingest`

## Set Worker secret
Run from repo root:

```bash
pnpm --filter email_ingest exec wrangler secret put SLACK_WEBHOOK_URL
```

Paste the Slack Incoming Webhook URL when prompted.

## Deploy
```bash
pnpm --filter email_ingest deploy
```

Or via root helper:

```bash
pnpm worker:deploy
```

## Test
1. Send an email to `info@a2agents.com`.
2. Confirm Slack receives one short message in `#project-mailbox` containing `From`, `To`, `Subject`, and a short snippet.

## Notes
- Current Worker is fast-path only (no queueing, no LLM, no drafting).
- Message dedupe is not persisted yet. Add KV/R2-based dedupe in a later phase.
