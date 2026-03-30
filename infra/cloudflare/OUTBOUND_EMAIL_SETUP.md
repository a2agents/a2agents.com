# Outbound Email Setup (Postmark MVP)

## Provider Interface

Outbound send is implemented in `packages/email-sender` using Postmark HTTP API.

## Required Secret

Set on `queue_consumer`:

```bash
pnpm worker:secret:postmark
```

Value: Postmark Server API token.

## Required Wrangler Variable

Set in `apps/workers/queue_consumer/wrangler.toml`:

```toml
[vars]
OUTBOUND_EMAIL_FROM = "info@a2agents.com"
```

Use a verified sender identity/domain in Postmark.

## Reply Headers

Worker sets:

- `In-Reply-To` = inbound `Message-ID`
- `References` = inbound `Message-ID`

This keeps replies threaded for most mail clients.

## Test

1. Generate draft from Slack thread.
2. Click `Send`.
3. Confirm recipient receives outbound message.
4. Confirm Slack thread shows `✅ Sent`.
