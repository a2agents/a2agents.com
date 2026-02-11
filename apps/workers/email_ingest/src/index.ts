export interface Env {
  SLACK_WEBHOOK_URL: string;
}

function safeHeader(message: ForwardableEmailMessage, key: string): string {
  return message.headers.get(key)?.trim() ?? "(unknown)";
}

async function extractSnippet(message: ForwardableEmailMessage): Promise<string> {
  try {
    const raw = await new Response(message.raw).text();
    const compact = raw.replace(/\s+/g, " ").trim();
    return compact.slice(0, 240) || "(no body content)";
  } catch {
    return "(unable to parse email body)";
  }
}

function buildSlackText(input: {
  from: string;
  to: string;
  subject: string;
  snippet: string;
  messageId: string;
}): string {
  return [
    "New inbound email to info@a2agents.com",
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    `Message-ID: ${input.messageId}`,
    `Snippet: ${input.snippet}`
  ].join("\n");
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    if (!env.SLACK_WEBHOOK_URL) {
      throw new Error("Missing SLACK_WEBHOOK_URL secret");
    }

    const from = safeHeader(message, "from");
    const to = safeHeader(message, "to");
    const subject = safeHeader(message, "subject");
    const messageId = safeHeader(message, "message-id");
    const snippet = await extractSnippet(message);

    const payload = {
      text: buildSlackText({ from, to, subject, snippet, messageId })
    };

    const resp = await fetch(env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`Slack webhook failed: ${resp.status} ${body}`);
    }
  }
};
