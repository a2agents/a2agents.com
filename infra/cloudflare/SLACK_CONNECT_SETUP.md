# Slack Connect Multi-Workspace Setup Guide

This guide explains how to set up the A2Agents Slack bot to work across multiple workspaces using Slack Connect. This enables the bot to be installed in multiple Slack workspaces, including external workspaces connected via Slack Connect.

## Overview

The multi-workspace setup uses OAuth 2.0 to allow the bot to be installed in multiple workspaces. Each workspace gets its own bot token, which is stored in the database and looked up dynamically when handling events.

## Prerequisites

1. A Cloudflare account with Workers and D1 database access
2. A Slack app configured at https://api.slack.com/apps
3. The database migrations applied (including `0005_workspace_installations.sql`)

## Slack App Configuration

### 1. Enable OAuth & Permissions

1. Go to your Slack app at https://api.slack.com/apps
2. Navigate to **OAuth & Permissions**
3. Add your **Redirect URLs**:
   ```
   https://your-worker-domain.workers.dev/slack/oauth/callback
   ```
4. Add the following **Bot Token Scopes**:
   - `chat:write`
   - `app_mentions:read`
   - `channels:read`
   - `channels:history`
   - `groups:read` (for private channels)
   - `groups:history` (for private channels)
   - `reactions:write`
   - `channels:manage`

### 2. Configure OAuth Settings

1. Under **OAuth & Permissions**, note your:
   - **Client ID**
   - **Client Secret**
2. These will be set as environment variables on your worker

### 3. Enable Event Subscriptions

1. Navigate to **Event Subscriptions**
2. Enable Events and set Request URL to:
   ```
   https://your-worker-domain.workers.dev/slack/events
   ```
3. Subscribe to **bot events**:
   - `app_mention`

### 4. Configure Interactivity

1. Navigate to **Interactivity & Shortcuts**
2. Enable Interactivity and set Request URL to:
   ```
   https://your-worker-domain.workers.dev/slack/actions
   ```

### 5. Enable Distribution (Optional)

For distributing to multiple workspaces:

1. Navigate to **Manage Distribution**
2. Click **Activate Public Distribution** (if you want anyone to install)
3. OR configure **Restricted Distribution** with specific workspace IDs
4. Complete the Slack App Directory checklist if going public

## Worker Configuration

### Environment Variables

Set these environment variables on your `slack_app` worker:

```bash
# Required for multi-workspace support
wrangler secret put SLACK_CLIENT_ID
wrangler secret put SLACK_CLIENT_SECRET
wrangler secret put SLACK_REDIRECT_URI
wrangler secret put SLACK_SIGNING_SECRET

# Enable multi-workspace mode
wrangler secret put MULTI_WORKSPACE_ENABLED
# When prompted, enter: true

# Fallback token for single-workspace mode (optional)
wrangler secret put SLACK_BOT_TOKEN
```

**Note**: `SLACK_BOT_TOKEN` is still supported as a fallback for single-workspace deployments. When `MULTI_WORKSPACE_ENABLED` is not set or false, the bot will use this token.

### Setting Secrets via CLI

```bash
# From the monorepo root
cd apps/workers/slack_app

# Set OAuth credentials
echo "your-client-id" | wrangler secret put SLACK_CLIENT_ID
echo "your-client-secret" | wrangler secret put SLACK_CLIENT_SECRET
echo "https://your-worker.workers.dev/slack/oauth/callback" | wrangler secret put SLACK_REDIRECT_URI
echo "your-signing-secret" | wrangler secret put SLACK_SIGNING_SECRET
echo "true" | wrangler secret put MULTI_WORKSPACE_ENABLED
```

## Database Setup

Apply the workspace installations migration:

```bash
# From the monorepo root
pnpm --filter email_ingest exec wrangler d1 execute a2agents-comms --remote --file ../../infra/cloudflare/migrations/0005_workspace_installations.sql
```

This creates two tables:
- `workspace_installations`: Stores bot tokens per workspace
- `installation_events`: Audit log of installations/uninstalls

## Installation Flow

### For Users Installing the Bot

1. Navigate to: `https://your-worker-domain.workers.dev/slack/install`
2. Click "Add to Slack"
3. Select the workspace to install into
4. Grant the requested permissions
5. You'll be redirected back with a success message

### What Happens Behind the Scenes

1. User clicks install link → redirected to Slack's OAuth authorize page
2. User authorizes → Slack redirects to `/slack/oauth/callback` with a code
3. Worker exchanges code for access token via `oauth.v2.access`
4. Worker stores the installation in the `workspace_installations` table
5. Future events from that workspace use the stored token

## Testing Multi-Workspace Setup

### Test in First Workspace

1. Install the bot using the install flow above
2. Mention the bot in a channel: `@YourBot hello`
3. Verify it responds

### Test in Second Workspace (e.g., PAR-10-SKY)

1. Share the install URL: `https://your-worker-domain.workers.dev/slack/install`
2. Have someone in the second workspace install it
3. Mention the bot in a channel in that workspace
4. Verify it responds with workspace-specific data

### Test Slack Connect Shared Channel

1. Create a Slack Connect channel between two workspaces
2. Install the bot in ONE of the workspaces
3. Mention the bot from either workspace in the shared channel
4. Verify it responds (the bot will use the token from the workspace where it's installed)

## Troubleshooting

### Bot not responding in second workspace

1. Check that installation completed successfully
2. Query the database to verify the token is stored:
   ```sql
   SELECT team_id, team_name, installed_at FROM workspace_installations;
   ```
3. Check worker logs for token lookup failures

### OAuth flow fails

1. Verify redirect URI matches exactly in Slack app settings
2. Check that client ID and secret are set correctly
3. Ensure the worker is deployed and accessible

### "No bot token found" error

1. Verify `MULTI_WORKSPACE_ENABLED=true` is set
2. Check that the workspace's team_id is in the database
3. Verify the bot was properly installed (not just added to a channel)

## Architecture Notes

### Token Lookup Flow

```
Slack Event → Extract team_id → Look up token in DB → Use token for API calls
```

### Fallback Behavior

- If `MULTI_WORKSPACE_ENABLED` is not set, uses `SLACK_BOT_TOKEN` (single-workspace mode)
- If team_id is not found in database, falls back to `SLACK_BOT_TOKEN`
- This allows gradual migration from single to multi-workspace

### Shared Channels

In Slack Connect shared channels:
- The bot only works if installed in at least one of the connected workspaces
- The bot uses the token from the workspace where it's installed
- Users from all connected workspaces can interact with the bot

## Security Considerations

1. **Token Storage**: Bot tokens are stored in plaintext in D1. Consider encryption at rest for production.
2. **OAuth State**: The current implementation doesn't validate OAuth state parameter. Add CSRF protection for production.
3. **Token Rotation**: Slack's token rotation is not yet implemented. Monitor the OAuth settings.

## Migration from Single-Workspace

If you have an existing single-workspace deployment:

1. Apply the new database migration
2. Set the new environment variables (CLIENT_ID, CLIENT_SECRET, etc.)
3. Set `MULTI_WORKSPACE_ENABLED=true`
4. Keep your existing `SLACK_BOT_TOKEN` as a fallback
5. Existing workspace will continue to work with the fallback token
6. New workspaces can install via OAuth flow

## Monitoring

Track installations and events:

```sql
-- View all installations
SELECT team_id, team_name, installed_at, installer_user_id 
FROM workspace_installations 
ORDER BY installed_at DESC;

-- View installation events
SELECT e.event_type, e.event_ts, w.team_name
FROM installation_events e
JOIN workspace_installations w ON e.team_id = w.team_id
ORDER BY e.event_ts DESC;
```

## Additional Resources

- [Slack OAuth Documentation](https://api.slack.com/authentication/oauth-v2)
- [Slack Connect Developer Guide](https://api.slack.com/apis/slack-connect)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
