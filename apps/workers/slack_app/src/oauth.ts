/**
 * OAuth 2.0 flow for multi-workspace Slack app installation
 * Handles install redirects and callback token exchange
 */

import type { Env } from "./index.ts";

type OAuthAccessResponse = {
  ok: boolean;
  access_token?: string;
  token_type?: string;
  scope?: string;
  bot_user_id?: string;
  app_id?: string;
  team?: {
    id: string;
    name: string;
  };
  enterprise?: {
    id: string;
    name: string;
  } | null;
  authed_user?: {
    id: string;
    scope?: string;
    access_token?: string;
    token_type?: string;
  };
  is_enterprise_install?: boolean;
  incoming_webhook?: {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
  };
  error?: string;
};

type WorkspaceInstallation = {
  team_id: string;
  team_name: string | null;
  bot_token: string;
  bot_user_id: string;
  bot_scopes: string;
  user_token: string | null;
  user_id: string | null;
  user_scopes: string | null;
  enterprise_id: string | null;
  enterprise_name: string | null;
  is_enterprise_install: number;
  installed_at: number;
  last_updated_at: number;
  installer_user_id: string | null;
  app_id: string | null;
};

function nowMs(): number {
  return Date.now();
}

/**
 * Generate the OAuth install URL that users click to authorize the app
 */
export function generateInstallUrl(env: Env): string {
  const clientId = env.SLACK_CLIENT_ID;
  const redirectUri = env.SLACK_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    throw new Error("Missing SLACK_CLIENT_ID or SLACK_REDIRECT_URI");
  }

  // Required scopes for the bot
  const botScopes = [
    "chat:write",
    "app_mentions:read",
    "channels:read",
    "channels:history",
    "groups:read",
    "groups:history",
    "reactions:write",
    "channels:manage"
  ];

  const params = new URLSearchParams({
    client_id: clientId,
    scope: botScopes.join(","),
    redirect_uri: redirectUri,
    // Generate a random state for CSRF protection
    state: crypto.randomUUID()
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
}

/**
 * Exchange OAuth code for access tokens
 */
async function exchangeCodeForToken(
  code: string,
  env: Env
): Promise<OAuthAccessResponse> {
  const clientId = env.SLACK_CLIENT_ID;
  const clientSecret = env.SLACK_CLIENT_SECRET;
  const redirectUri = env.SLACK_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing OAuth credentials");
  }

  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    throw new Error(`OAuth exchange failed: ${response.status}`);
  }

  return (await response.json()) as OAuthAccessResponse;
}

/**
 * Store or update workspace installation in database
 */
async function saveInstallation(
  env: Env,
  oauthData: OAuthAccessResponse
): Promise<void> {
  if (!oauthData.ok || !oauthData.team || !oauthData.access_token) {
    throw new Error("Invalid OAuth response");
  }

  const installation: WorkspaceInstallation = {
    team_id: oauthData.team.id,
    team_name: oauthData.team.name,
    bot_token: oauthData.access_token,
    bot_user_id: oauthData.bot_user_id ?? "",
    bot_scopes: oauthData.scope ?? "",
    user_token: oauthData.authed_user?.access_token ?? null,
    user_id: oauthData.authed_user?.id ?? null,
    user_scopes: oauthData.authed_user?.scope ?? null,
    enterprise_id: oauthData.enterprise?.id ?? null,
    enterprise_name: oauthData.enterprise?.name ?? null,
    is_enterprise_install: oauthData.is_enterprise_install ? 1 : 0,
    installed_at: nowMs(),
    last_updated_at: nowMs(),
    installer_user_id: oauthData.authed_user?.id ?? null,
    app_id: oauthData.app_id ?? null
  };

  await env.COMMS_DB.prepare(
    `INSERT INTO workspace_installations (
      team_id, team_name, bot_token, bot_user_id, bot_scopes,
      user_token, user_id, user_scopes,
      enterprise_id, enterprise_name, is_enterprise_install,
      installed_at, last_updated_at, installer_user_id, app_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(team_id) DO UPDATE SET
      team_name = excluded.team_name,
      bot_token = excluded.bot_token,
      bot_user_id = excluded.bot_user_id,
      bot_scopes = excluded.bot_scopes,
      user_token = excluded.user_token,
      user_id = excluded.user_id,
      user_scopes = excluded.user_scopes,
      last_updated_at = excluded.last_updated_at,
      installer_user_id = excluded.installer_user_id`
  )
    .bind(
      installation.team_id,
      installation.team_name,
      installation.bot_token,
      installation.bot_user_id,
      installation.bot_scopes,
      installation.user_token,
      installation.user_id,
      installation.user_scopes,
      installation.enterprise_id,
      installation.enterprise_name,
      installation.is_enterprise_install,
      installation.installed_at,
      installation.last_updated_at,
      installation.installer_user_id,
      installation.app_id
    )
    .run();

  // Log the installation event
  await env.COMMS_DB.prepare(
    `INSERT INTO installation_events (id, team_id, event_type, event_ts, user_id, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(
      crypto.randomUUID(),
      installation.team_id,
      "install",
      nowMs(),
      installation.installer_user_id,
      JSON.stringify({
        app_id: installation.app_id,
        is_enterprise: installation.is_enterprise_install === 1
      })
    )
    .run();
}

/**
 * Retrieve workspace installation by team_id
 */
export async function getInstallation(
  env: Env,
  teamId: string
): Promise<WorkspaceInstallation | null> {
  const row = await env.COMMS_DB.prepare(
    `SELECT team_id, team_name, bot_token, bot_user_id, bot_scopes,
            user_token, user_id, user_scopes,
            enterprise_id, enterprise_name, is_enterprise_install,
            installed_at, last_updated_at, installer_user_id, app_id
     FROM workspace_installations
     WHERE team_id = ?
     LIMIT 1`
  )
    .bind(teamId)
    .first<WorkspaceInstallation>();

  return row ?? null;
}

/**
 * Handle OAuth install redirect
 */
export function handleInstallRedirect(env: Env): Response {
  try {
    const installUrl = generateInstallUrl(env);
    return Response.redirect(installUrl, 302);
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "OAuth setup error"
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" }
      }
    );
  }
}

/**
 * Handle OAuth callback after user authorizes
 */
export async function handleOAuthCallback(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(
      `<html><body><h1>Installation Failed</h1><p>Error: ${error}</p></body></html>`,
      {
        status: 400,
        headers: { "content-type": "text/html" }
      }
    );
  }

  if (!code) {
    return new Response(
      "<html><body><h1>Installation Failed</h1><p>Missing authorization code</p></body></html>",
      {
        status: 400,
        headers: { "content-type": "text/html" }
      }
    );
  }

  try {
    const oauthData = await exchangeCodeForToken(code, env);

    if (!oauthData.ok) {
      throw new Error(oauthData.error ?? "OAuth exchange failed");
    }

    await saveInstallation(env, oauthData);

    return new Response(
      `<html><body>
        <h1>Installation Successful!</h1>
        <p>The A2Agents Slack bot has been installed to <strong>${oauthData.team?.name}</strong>.</p>
        <p>You can now use the bot in your workspace by mentioning it with <code>@${oauthData.bot_user_id}</code></p>
        <p><a href="slack://open">Open Slack</a></p>
      </body></html>`,
      {
        status: 200,
        headers: { "content-type": "text/html" }
      }
    );
  } catch (error) {
    return new Response(
      `<html><body>
        <h1>Installation Failed</h1>
        <p>Error: ${error instanceof Error ? error.message : "Unknown error"}</p>
        <p><a href="/slack/install">Try again</a></p>
      </body></html>`,
      {
        status: 500,
        headers: { "content-type": "text/html" }
      }
    );
  }
}

/**
 * Get bot token for a specific workspace, with fallback to env var
 */
export async function getBotToken(
  env: Env,
  teamId?: string
): Promise<string> {
  // If multi-workspace is enabled and we have a team_id, look up the token
  if (env.MULTI_WORKSPACE_ENABLED === "true" && teamId) {
    const installation = await getInstallation(env, teamId);
    if (installation?.bot_token) {
      return installation.bot_token;
    }
  }

  // Fallback to single-workspace mode with env var
  if (env.SLACK_BOT_TOKEN) {
    return env.SLACK_BOT_TOKEN;
  }

  throw new Error(`No bot token found for team ${teamId ?? "unknown"}`);
}
