# Slack App Setup for Channel Operator

## Create Slack App

1. Go to Slack API -> Your Apps -> Create App.
2. Add bot token scopes:
   - `chat:write`
   - `app_mentions:read`
   - `channels:read`
   - `channels:history`
   - `groups:read` (if private channels)
   - `groups:history` (if private channels)
   - `reactions:write` (for low-impact nudges)
   - `channels:manage` (optional, needed for topic/purpose writes)
3. Install app to workspace and copy bot token (`xoxb-...`).

## Configure Interactivity

Enable Interactivity and set Request URL to:

```text
https://<YOUR_SLACK_APP_WORKER_URL>/slack/actions
```

## Configure Events

Enable Event Subscriptions and set Request URL to:

```text
https://<YOUR_SLACK_APP_WORKER_URL>/slack/events
```

Subscribe to bot event:

- `app_mention`

## Secrets and Vars

Set on workers:

- `SLACK_BOT_TOKEN` -> `email_ingest`, `slack_app`, `queue_consumer`
- `SLACK_SIGNING_SECRET` -> `slack_app`
- `SLACK_CHANNEL_PROJECT_MAILBOX` -> `email_ingest` (channel ID like `C0123456789`)

Optional runtime toggles on `slack_app`:

- `STRICT_NO_CONTENT_STORAGE=true` (default, recommended)
- `WRITE_ACTIONS_ENABLED=true` (set `false` as kill switch)

## Notes

- Use Slack channel ID, not channel name, for `SLACK_CHANNEL_PROJECT_MAILBOX`.
- Slack message content is used ephemerally at runtime and is not persisted by the channel operator runtime.
- High-impact writes (topic/purpose) use confirmation gating unless user intent is explicit.
