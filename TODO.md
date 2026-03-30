# Slack Mailbot v1 TODO

- [x] Monorepo structure (`apps/web`, worker apps, shared packages)
- [x] Cloudflare inbound worker baseline
- [x] D1 schema and migration SQL (`infra/cloudflare/schema.sql`)
- [x] `email_ingest` now stores `.eml` in R2 and metadata in D1
- [x] `email_ingest` posts Slack thread anchor with action buttons
- [x] New `slack_app` worker with Slack signature verification
- [x] `slack_app` handles button actions and enqueues jobs
- [x] New `queue_consumer` worker for `draft_reply` and `send_reply`
- [x] OpenAI draft generation path in queue consumer
- [x] Outbound email provider interface package (`packages/email-sender`)
- [x] Queue consumer send flow + idempotent sent guard
- [x] Docs: Slack app setup + outbound provider setup
- [ ] Configure production Cloudflare bindings IDs/names in all `wrangler.toml`
- [ ] Set all secrets in deployed workers
- [ ] End-to-end verification in production (`info@a2agents.com`)
