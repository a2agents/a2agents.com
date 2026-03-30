import { sendEmail } from "@a2agents/email-sender";

export type QueueJob = {
  type: "draft_reply" | "send_reply";
  message_id: string;
  slack_channel_id: string;
  slack_thread_ts: string;
  slack_user_id?: string;
  draft_id?: string;
  prompt_style?: "default" | "summarize" | "options_3" | "friendly" | "firm" | "next_action";
};

type MessageRow = {
  id: string;
  r2_key: string;
  from_addr: string;
  to_addr: string;
  subject: string;
  message_id_header: string;
  slack_channel_id: string;
  slack_thread_ts: string;
  status: string;
};

type DraftRow = {
  id: string;
  message_id: string;
  draft_text: string;
  send_status: string;
  idempotency_key: string | null;
};

type DraftResult = {
  summary: string;
  draft: string;
  confidence: "low" | "med" | "high";
  questions: string[];
};

export interface Env {
  COMMS_DB: D1Database;
  COMMS_ARCHIVE: R2Bucket;
  SLACK_BOT_TOKEN: string;
  OPENAI_API_KEY?: string;
  OPENAI_API_KEY_SECRET?: { get(): Promise<string> };
  OPENAI_MODEL?: string;
  OUTBOUND_EMAIL_FROM: string;
  POSTMARK_SERVER_TOKEN: string;
}

async function getOpenAIKey(env: Env): Promise<string> {
  if (env.OPENAI_API_KEY_SECRET) {
    const value = await env.OPENAI_API_KEY_SECRET.get();
    if (value) {
      return value;
    }
  }
  if (env.OPENAI_API_KEY) {
    return env.OPENAI_API_KEY;
  }
  throw new Error("Missing OpenAI key. Configure OPENAI_API_KEY or OPENAI_API_KEY_SECRET.");
}

function extractEmailAddress(input: string): string {
  const angle = input.match(/<([^>]+)>/);
  if (angle?.[1]) {
    return angle[1].trim();
  }
  const plain = input.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (plain?.[0]) {
    return plain[0];
  }
  return input;
}

function normalizeReplySubject(subject: string): string {
  return /^re:/i.test(subject) ? subject : `Re: ${subject}`;
}

function formatDraftPrompt(params: {
  from: string;
  to: string;
  subject: string;
  snippet: string;
  threadContext: string;
  promptStyle: QueueJob["prompt_style"];
}): string {
  const style = params.promptStyle ?? "default";

  let styleInstructions = "Provide a professional, concise reply draft.";
  if (style === "summarize") {
    styleInstructions = "Focus on a concise summary and include a short suggested reply draft.";
  } else if (style === "options_3") {
    styleInstructions = "Provide 3 reply options labeled short, friendly, and firm.";
  } else if (style === "friendly") {
    styleInstructions = "Use a warm, friendly tone while staying concise.";
  } else if (style === "firm") {
    styleInstructions = "Use a direct, firm, professional tone.";
  } else if (style === "next_action") {
    styleInstructions = "Propose next action first, then provide one draft reply.";
  }

  return [
    "You are an email drafting assistant for A2Agents.",
    "You must not promise you sent anything; only produce a draft.",
    styleInstructions,
    "Return strict JSON with keys: summary, draft, confidence, questions.",
    "confidence must be one of: low, med, high.",
    "questions must be an array of up to 2 short clarifying questions.",
    "",
    `From: ${params.from}`,
    `To: ${params.to}`,
    `Subject: ${params.subject}`,
    `Snippet: ${params.snippet}`,
    "",
    "Slack thread context (latest human comments):",
    params.threadContext
  ].join("\n");
}

function snippetFromRaw(rawEmail: string): string {
  const compact = rawEmail
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 30)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return compact.slice(0, 400) || "(no body content)";
}

async function logEvent(env: Env, type: string, messageId: string, note: string, draftId?: string): Promise<void> {
  await env.COMMS_DB.prepare(
    `INSERT INTO events (id, ts, type, message_id, draft_id, payload_r2_key, note)
     VALUES (?, ?, ?, ?, ?, NULL, ?)`
  )
    .bind(crypto.randomUUID(), Date.now(), type, messageId, draftId ?? null, note)
    .run();
}

async function slackPostThread(
  env: Env,
  channel: string,
  threadTs: string,
  text: string,
  blocks?: Array<Record<string, unknown>>
): Promise<void> {
  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${env.SLACK_BOT_TOKEN}`,
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      channel,
      thread_ts: threadTs,
      text,
      blocks
    })
  });

  const json = (await response.json()) as { ok: boolean; error?: string };
  if (!response.ok || !json.ok) {
    throw new Error(`chat.postMessage failed: ${json.error ?? response.status}`);
  }
}

type SlackThreadReply = {
  ts?: string;
  user?: string;
  text?: string;
  bot_id?: string;
  subtype?: string;
};

async function loadThreadContext(env: Env, channel: string, threadTs: string): Promise<string> {
  const response = await fetch("https://slack.com/api/conversations.replies", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${env.SLACK_BOT_TOKEN}`,
      "content-type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      channel,
      ts: threadTs,
      limit: 20,
      inclusive: true
    })
  });

  const json = (await response.json()) as { ok: boolean; error?: string; messages?: SlackThreadReply[] };
  if (!response.ok || !json.ok) {
    throw new Error(`conversations.replies failed: ${json.error ?? response.status}`);
  }

  const comments = (json.messages ?? [])
    .filter((message) => message.ts !== threadTs)
    .filter((message) => !message.bot_id && message.subtype !== "bot_message")
    .filter((message) => Boolean(message.user) && Boolean(message.text))
    .slice(-8)
    .map((message) => `- ${message.user}: ${(message.text ?? "").replace(/\s+/g, " ").trim()}`);

  if (comments.length === 0) {
    return "(no human thread comments)";
  }

  return comments.join("\n").slice(0, 1200);
}

function draftBlocks(input: { draftId: string; draft: string; summary: string; confidence: string; messageId: string }) {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Draft reply*"
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: input.draft
      }
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Summary: ${input.summary} | Confidence: ${input.confidence}`
        }
      ]
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          action_id: "regenerate",
          text: { type: "plain_text", text: "Regenerate" },
          value: JSON.stringify({ draft_id: input.draftId, message_id: input.messageId })
        },
        {
          type: "button",
          action_id: "mark_resolved",
          text: { type: "plain_text", text: "Mark resolved" },
          value: JSON.stringify({ draft_id: input.draftId, message_id: input.messageId })
        }
      ]
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "_Draft-only mode: sending is currently disabled._"
        }
      ]
    }
  ] as Array<Record<string, unknown>>;
}

async function callOpenAI(env: Env, prompt: string): Promise<DraftResult> {
  const apiKey = await getOpenAIKey(env);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input: prompt
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI call failed: ${response.status} ${body}`);
  }

  const json = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };

  const outputText =
    json.output_text ??
    json.output
      ?.flatMap((item) => item.content ?? [])
      .map((c) => c.text ?? "")
      .join("\n")
      .trim() ??
    "";

  try {
    const parsed = JSON.parse(outputText) as DraftResult;
    return {
      summary: parsed.summary || "No summary",
      draft: parsed.draft || "",
      confidence: parsed.confidence || "med",
      questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, 2) : []
    };
  } catch {
    return {
      summary: "Model response could not be parsed as JSON.",
      draft: outputText || "Unable to generate draft.",
      confidence: "low",
      questions: []
    };
  }
}

async function loadMessage(env: Env, messageId: string): Promise<MessageRow> {
  const row = await env.COMMS_DB.prepare("SELECT * FROM messages WHERE id = ? LIMIT 1")
    .bind(messageId)
    .first<MessageRow>();

  if (!row) {
    throw new Error(`Message ${messageId} not found`);
  }

  return row;
}

async function handleDraftReply(job: QueueJob, env: Env): Promise<void> {
  const message = await loadMessage(env, job.message_id);
  const archived = await env.COMMS_ARCHIVE.get(message.r2_key);
  if (!archived) {
    throw new Error(`R2 object missing: ${message.r2_key}`);
  }

  const rawEmail = await archived.text();
  const snippet = snippetFromRaw(rawEmail);
  const threadContext = await loadThreadContext(env, job.slack_channel_id, job.slack_thread_ts);
  const prompt = formatDraftPrompt({
    from: message.from_addr,
    to: message.to_addr,
    subject: message.subject,
    snippet,
    threadContext,
    promptStyle: job.prompt_style ?? "default"
  });

  const modelResponse = await callOpenAI(env, prompt);
  const draftId = crypto.randomUUID();
  const confidence = ["low", "med", "high"].includes(modelResponse.confidence)
    ? modelResponse.confidence
    : "med";

  await env.COMMS_DB.prepare(
    `INSERT INTO drafts (
      id, message_id, created_ts, created_by, draft_text, model,
      confidence, send_status, idempotency_key
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      draftId,
      message.id,
      Date.now(),
      job.slack_user_id ?? null,
      modelResponse.draft,
      env.OPENAI_MODEL ?? "gpt-4.1-mini",
      confidence,
      "pending",
      `send:${draftId}`
    )
    .run();

  await env.COMMS_DB.prepare("UPDATE messages SET status = ? WHERE id = ?")
    .bind("drafted", message.id)
    .run();

  const questions = modelResponse.questions.length
    ? `\n\nQuestions: ${modelResponse.questions.map((q) => `- ${q}`).join(" ")}`
    : "";

  await slackPostThread(
    env,
    job.slack_channel_id,
    job.slack_thread_ts,
    "Draft ready.",
    draftBlocks({
      draftId,
      draft: `${modelResponse.draft}${questions}`,
      summary: modelResponse.summary,
      confidence,
      messageId: message.id
    })
  );

  await logEvent(env, "draft_created", message.id, "Draft generated and posted to Slack", draftId);
}

async function loadDraft(env: Env, draftId: string): Promise<DraftRow> {
  const row = await env.COMMS_DB.prepare("SELECT * FROM drafts WHERE id = ? LIMIT 1")
    .bind(draftId)
    .first<DraftRow>();

  if (!row) {
    throw new Error(`Draft ${draftId} not found`);
  }

  return row;
}

async function handleSendReply(job: QueueJob, env: Env): Promise<void> {
  if (!job.draft_id) {
    throw new Error("send_reply requires draft_id");
  }

  const draft = await loadDraft(env, job.draft_id);
  if (draft.send_status === "sent") {
    await slackPostThread(env, job.slack_channel_id, job.slack_thread_ts, "Already sent previously. Skipping.");
    return;
  }
  if (draft.send_status === "sending") {
    await slackPostThread(env, job.slack_channel_id, job.slack_thread_ts, "Send already in progress.");
    return;
  }

  const claim = await env.COMMS_DB.prepare(
    `UPDATE drafts
     SET send_status = ?, approved_ts = COALESCE(approved_ts, ?)
     WHERE id = ? AND send_status = ?`
  )
    .bind("sending", Date.now(), draft.id, "pending")
    .run();

  const claimed = Number(claim.meta.changes ?? 0) > 0;
  if (!claimed) {
    const latest = await loadDraft(env, job.draft_id);
    if (latest.send_status === "sent") {
      await slackPostThread(env, job.slack_channel_id, job.slack_thread_ts, "Already sent previously. Skipping.");
      return;
    }
    await slackPostThread(env, job.slack_channel_id, job.slack_thread_ts, "Send already in progress.");
    return;
  }

  const message = await loadMessage(env, draft.message_id);
  const toAddress = extractEmailAddress(message.from_addr);

  await sendEmail(
    {
      from: env.OUTBOUND_EMAIL_FROM,
      to: toAddress,
      subject: normalizeReplySubject(message.subject),
      text: draft.draft_text,
      inReplyTo: message.message_id_header,
      references: message.message_id_header
    },
    {
      POSTMARK_SERVER_TOKEN: env.POSTMARK_SERVER_TOKEN
    }
  );

  await env.COMMS_DB.prepare(
    `UPDATE drafts
     SET send_status = ?, sent_ts = ?, approved_ts = ?
     WHERE id = ?`
  )
    .bind("sent", Date.now(), Date.now(), draft.id)
    .run();

  await env.COMMS_DB.prepare("UPDATE messages SET status = ?, last_error = NULL WHERE id = ?")
    .bind("sent", message.id)
    .run();

  await slackPostThread(env, job.slack_channel_id, job.slack_thread_ts, `✅ Sent to ${toAddress}`);
  await logEvent(env, "email_sent", message.id, `Sent outbound email to ${toAddress}`, draft.id);
}

async function processJob(job: QueueJob, env: Env): Promise<void> {
  if (job.type === "draft_reply") {
    await handleDraftReply(job, env);
    return;
  }

  if (job.type === "send_reply") {
    await handleSendReply(job, env);
    return;
  }

  throw new Error(`Unsupported job type ${(job as { type?: string }).type ?? "unknown"}`);
}

export default {
  async queue(batch: MessageBatch<QueueJob>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await processJob(message.body, env);
        message.ack();
      } catch (error) {
        const job = message.body;
        const errText = error instanceof Error ? error.message : String(error);
        if (job?.draft_id) {
          await env.COMMS_DB.prepare(
            `UPDATE drafts
             SET send_status = ?, approved_ts = COALESCE(approved_ts, ?)
             WHERE id = ?`
          )
            .bind("failed", Date.now(), job.draft_id)
            .run();
        }
        if (job?.message_id) {
          await env.COMMS_DB.prepare("UPDATE messages SET status = ?, last_error = ? WHERE id = ?")
            .bind("failed", errText, job.message_id)
            .run();
          await logEvent(env, "job_failed", job.message_id, errText, job.draft_id);
        }
        message.retry();
      }
    }
  }
};
