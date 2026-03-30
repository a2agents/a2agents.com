export interface Env {
  COMMS_DB: D1Database;
  COMMS_ARCHIVE: R2Bucket;
  SLACK_BOT_TOKEN: string;
  SLACK_CHANNEL_PROJECT_MAILBOX: string;
}

type SlackPostMessageResponse = {
  ok: boolean;
  error?: string;
  ts?: string;
  channel?: string;
};

function decodeQuotedPrintable(input: string): string {
  const softBreaksRemoved = input.replace(/=\r?\n/g, "");
  return softBreaksRemoved.replace(/=([0-9A-F]{2})/gi, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

function decodeBase64(input: string): string {
  const normalized = input.replace(/\s+/g, "");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function decodeByTransferEncoding(body: string, headers: string): string {
  const transferEncodingMatch = headers.match(/content-transfer-encoding:\s*([^\r\n]+)/i);
  const transferEncoding = transferEncodingMatch?.[1]?.trim().toLowerCase() ?? "";

  if (transferEncoding.includes("quoted-printable")) {
    return decodeQuotedPrintable(body);
  }

  if (transferEncoding.includes("base64")) {
    try {
      return decodeBase64(body);
    } catch {
      return body;
    }
  }

  return body;
}

function splitHeadersAndBody(rawPart: string): { headers: string; body: string } {
  const headerEnd = rawPart.search(/\r?\n\r?\n/);
  if (headerEnd === -1) {
    return { headers: "", body: rawPart };
  }
  const headers = rawPart.slice(0, headerEnd);
  const body = rawPart.slice(headerEnd).replace(/^\r?\n\r?\n/, "");
  return { headers, body };
}

function findTextPlainBody(rawEmail: string): string | null {
  const { headers: topHeaders, body: fullBody } = splitHeadersAndBody(rawEmail);
  const boundaryMatch = topHeaders.match(/boundary="?([^";\r\n]+)"?/i);

  if (!boundaryMatch) {
    return null;
  }

  const boundary = boundaryMatch[1];
  const marker = `--${boundary}`;
  const parts = fullBody.split(marker);

  for (const part of parts) {
    if (!/content-type:\s*text\/plain/i.test(part)) {
      continue;
    }
    const { headers, body } = splitHeadersAndBody(part);
    return decodeByTransferEncoding(body, headers);
  }

  return null;
}

function cleanBodyForSnippet(input: string): string {
  const lines = input
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim());

  const cleaned: string[] = [];
  for (const line of lines) {
    if (!line) {
      if (cleaned.length > 0 && cleaned[cleaned.length - 1] !== "") {
        cleaned.push("");
      }
      continue;
    }

    if (
      /^on .+ wrote:$/i.test(line) ||
      /^-+ forwarded message -+$/i.test(line) ||
      /^from:\s/i.test(line) ||
      /^to:\s/i.test(line) ||
      /^subject:\s/i.test(line) ||
      /^date:\s/i.test(line) ||
      /^received:\s/i.test(line) ||
      /^arc-/i.test(line) ||
      /^dkim-/i.test(line) ||
      /^spf=/i.test(line)
    ) {
      break;
    }

    if (line.startsWith(">")) {
      continue;
    }

    cleaned.push(line);
  }

  return cleaned.join(" ").replace(/\s+/g, " ").trim();
}

function safeHeader(message: ForwardableEmailMessage, key: string): string {
  return message.headers.get(key)?.trim() ?? "(unknown)";
}

function deriveThreadKey(subject: string, inReplyTo: string, references: string): string {
  if (references && references !== "(unknown)") {
    return references;
  }
  if (inReplyTo && inReplyTo !== "(unknown)") {
    return inReplyTo;
  }
  return subject.toLowerCase().replace(/^re:\s*/i, "").trim();
}

async function extractSnippet(rawEmail: string): Promise<string> {
  const textPlain = findTextPlainBody(rawEmail);
  const candidate = textPlain ?? splitHeadersAndBody(rawEmail).body;
  const compact = cleanBodyForSnippet(candidate);
  return compact.slice(0, 320) || "(no body content)";
}

async function slackApiCall(
  token: string,
  method: string,
  body: Record<string, unknown>
): Promise<SlackPostMessageResponse> {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      "content-type": "application/json; charset=utf-8",
      "authorization": `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  const json = (await response.json()) as SlackPostMessageResponse;
  if (!response.ok || !json.ok) {
    throw new Error(`Slack API ${method} failed: ${json.error ?? response.status}`);
  }
  return json;
}

function inboundMessageBlocks(input: {
  from: string;
  to: string;
  subject: string;
  snippet: string;
  messageId: string;
  messageRecordId: string;
}): Array<Record<string, unknown>> {
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Incoming email"
      }
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*From*\n${input.from}` },
        { type: "mrkdwn", text: `*To*\n${input.to}` },
        { type: "mrkdwn", text: `*Subject*\n${input.subject}` },
        { type: "mrkdwn", text: `*Message-ID*\n${input.messageId}` }
      ]
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Snippet*\n${input.snippet}`
      }
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          action_id: "draft_reply",
          text: { type: "plain_text", text: "Draft reply" },
          value: JSON.stringify({ message_id: input.messageRecordId, action: "draft_reply" })
        },
        {
          type: "button",
          action_id: "summarize",
          text: { type: "plain_text", text: "Summarize" },
          value: JSON.stringify({ message_id: input.messageRecordId, action: "summarize" })
        },
        {
          type: "button",
          action_id: "find_related",
          text: { type: "plain_text", text: "Find related" },
          value: JSON.stringify({ message_id: input.messageRecordId, action: "find_related" })
        }
      ]
    }
  ];
}

async function insertEvent(
  env: Env,
  type: string,
  messageId: string,
  note: string,
  draftId?: string
): Promise<void> {
  await env.COMMS_DB.prepare(
    `INSERT INTO events (id, ts, type, message_id, draft_id, payload_r2_key, note)
     VALUES (?, ?, ?, ?, ?, NULL, ?)`
  )
    .bind(crypto.randomUUID(), Date.now(), type, messageId, draftId ?? null, note)
    .run();
}

export default {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    if (!env.SLACK_BOT_TOKEN) {
      throw new Error("Missing SLACK_BOT_TOKEN secret");
    }
    if (!env.SLACK_CHANNEL_PROJECT_MAILBOX) {
      throw new Error("Missing SLACK_CHANNEL_PROJECT_MAILBOX secret");
    }

    const from = safeHeader(message, "from");
    const to = safeHeader(message, "to");
    const subject = safeHeader(message, "subject");
    const messageIdHeader = safeHeader(message, "message-id");
    const references = safeHeader(message, "references");
    const inReplyTo = safeHeader(message, "in-reply-to");
    const threadKey = deriveThreadKey(subject, inReplyTo, references);

    const rawEmail = await new Response(message.raw).text();
    const snippet = await extractSnippet(rawEmail);

    const messageRecordId = crypto.randomUUID();
    const r2Key = `emails/${new Date().toISOString().slice(0, 10)}/${messageRecordId}.eml`;

    await env.COMMS_ARCHIVE.put(r2Key, rawEmail, {
      httpMetadata: {
        contentType: "message/rfc822"
      },
      customMetadata: {
        messageIdHeader,
        from,
        to,
        subject
      }
    });

    await env.COMMS_DB.prepare(
      `INSERT INTO messages (
        id, r2_key, from_addr, to_addr, subject, received_ts,
        message_id_header, thread_key, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        messageRecordId,
        r2Key,
        from,
        to,
        subject,
        Date.now(),
        messageIdHeader,
        threadKey,
        "new"
      )
      .run();

    const slackResult = await slackApiCall(env.SLACK_BOT_TOKEN, "chat.postMessage", {
      channel: env.SLACK_CHANNEL_PROJECT_MAILBOX,
      text: `Incoming email: ${subject}`,
      blocks: inboundMessageBlocks({
        from,
        to,
        subject,
        snippet,
        messageId: messageIdHeader,
        messageRecordId
      })
    });

    await env.COMMS_DB.prepare(
      `UPDATE messages
       SET slack_channel_id = ?, slack_thread_ts = ?
       WHERE id = ?`
    )
      .bind(slackResult.channel ?? env.SLACK_CHANNEL_PROJECT_MAILBOX, slackResult.ts ?? "", messageRecordId)
      .run();

    await insertEvent(env, "email_ingested", messageRecordId, "Inbound email posted to Slack thread");
  }
};
