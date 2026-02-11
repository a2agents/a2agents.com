# MVP Next Steps

1. Store raw inbound message in R2 as source-of-truth.
2. Write searchable metadata index in D1.
3. Push ingest events into Cloudflare Queue.
4. Implement `apps/workers/queue_consumer` for LLM draft generation.
5. Add `apps/workers/slack_actions` endpoint for `Draft reply` action handling.
