import { handleChatApiRequest, handleStreamApiRequest, type ChatApiEnv } from "./chat_api.ts";

export type QueueJob = {
  type: "draft_reply" | "send_reply";
  message_id: string;
  slack_channel_id: string;
  slack_thread_ts: string;
  slack_user_id?: string;
  draft_id?: string;
  prompt_style?: "default" | "summarize" | "options_3" | "friendly" | "firm" | "next_action";
};

export interface Env extends ChatApiEnv {
  COMMS_DB: D1Database;
  COMMS_JOBS: Queue<QueueJob>;
  SLACK_SIGNING_SECRET: string;
  SLACK_BOT_TOKEN: string;
  OPENAI_API_KEY?: string;
  OPENAI_API_KEY_SECRET?: { get(): Promise<string> };
  OPENAI_MODEL?: string;
  STRICT_NO_CONTENT_STORAGE?: string;
  WRITE_ACTIONS_ENABLED?: string;
  BOT_HANDLE?: string;
  INTAKE_CALENDLY_URL?: string;
}

type SlackEventEnvelope = {
  type: string;
  challenge?: string;
  event_id?: string;
  event?: {
    type: string;
    user?: string;
    text?: string;
    channel?: string;
    ts?: string;
    thread_ts?: string;
    bot_id?: string;
    subtype?: string;
  };
};

type SlackActionPayload = {
  user?: { id: string };
  channel?: { id: string };
  container?: { thread_ts?: string };
  message?: { ts?: string; thread_ts?: string };
  actions?: Array<{ action_id: string; value?: string }>;
};

type SlackMessage = {
  ts?: string;
  thread_ts?: string;
  user?: string;
  text?: string;
  bot_id?: string;
  subtype?: string;
  files?: SlackFile[];
};

type SlackFile = {
  id?: string;
  mimetype?: string;
  filetype?: string;
  name?: string;
  title?: string;
  url_private?: string;
  url_private_download?: string;
};

type SlackApiResponse = {
  ok: boolean;
  error?: string;
  ts?: string;
  messages?: SlackMessage[];
  channel?: {
    id?: string;
    name?: string;
    topic?: { value?: string };
    purpose?: { value?: string };
    num_members?: number;
  };
  response_metadata?: { next_cursor?: string };
};

type ChannelPolicyRow = {
  channel_id: string;
  purpose: string | null;
  allowed_post_types: string | null;
  disallowed_patterns: string | null;
  preferred_behavior: string | null;
  enforcement_style: string | null;
  escalation_rules: string | null;
  version: number | null;
};

type RoutingRow = {
  intent_label: string;
  keywords: string | null;
  target_channel_id: string;
  rationale: string | null;
};

type ConfirmationRow = {
  id: string;
  channel_id: string;
  thread_ts: string;
  user_id: string;
  action_name: string;
  args_json: string;
  expires_ts: number;
  status: string;
};

type PlannerToolCall = {
  name: string;
  args: Record<string, unknown>;
  reason?: string;
};

type PlannerWriteAction = {
  name: string;
  args: Record<string, unknown>;
  requires_confirmation?: boolean;
};

type PlannerOutput = {
  observations: string[];
  intent: string;
  confidence: number;
  tool_calls: PlannerToolCall[];
  proposed_policy_delta: Record<string, unknown> | null;
  write_actions: PlannerWriteAction[];
  final_reply: {
    what_i_observed: string[];
    what_i_changed: string[];
    what_i_recommend_next: string[];
  };
  follow_up_question: string | null;
};

type ChannelContext = {
  id: string;
  name: string | null;
  topic: string | null;
  purpose: string | null;
  numMembers: number | null;
};

type EventFeatures = {
  has_link: boolean;
  has_file: boolean;
  has_mention: boolean;
  has_here: boolean;
  has_channel: boolean;
  is_thread_reply: boolean;
  message_length_bucket: "short" | "medium" | "long";
  time_bucket: "morning" | "afternoon" | "evening" | "night";
};

type ToolResult = {
  tool: string;
  ok: boolean;
  output: Record<string, unknown>;
  error_code?: string;
};

const STRICT_DEFAULT = true;
const WRITE_ACTIONS_DEFAULT = true;

const FORBIDDEN_PERSIST_KEYS = new Set([
  "text",
  "blocks",
  "attachments",
  "files",
  "permalink",
  "content",
  "snippet",
  "body"
]);

const DEFAULT_POLICY_PURPOSE =
  "No channel policy configured yet. Ask admin to define purpose, routing, and etiquette.";

function nowMs(): number {
  return Date.now();
}

function toHex(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function boolFromEnv(value: string | undefined, fallback: boolean): boolean {
  if (value == null) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function stripMention(text: string): string {
  return text.replace(/<@[^>]+>/g, "").trim();
}

function isAskPurpose(text: string): boolean {
  return /what('?s| is)\s+(this\s+)?channel('?s)?\s+purpose\??/i.test(text.trim());
}

function isAskAgentPurpose(text: string): boolean {
  return /what('?s| is)\s+your\s+purpose\??/i.test(text.trim());
}

function isAskName(text: string): boolean {
  return /what('?s| is)\s+(this\s+)?channel('?s)?\s+name\??/i.test(text.trim());
}

function isAskTopic(text: string): boolean {
  return /what('?s| is)\s+(this\s+)?channel('?s)?\s+topic\??/i.test(text.trim());
}

function isAskSetup(text: string): boolean {
  return /(setup status|is this set up|is this channel set up)/i.test(text.trim());
}

function isImageQuestion(text: string): boolean {
  return /\b(image|images|screenshot|screenshots|photo|photos|picture|pictures|file|files|attachment|attached)\b/i.test(
    text
  );
}

function isFactRequest(text: string): boolean {
  return /\b(fact please|historical fact|fun fact|hit me with a fact|give me a fact)\b/i.test(text);
}

function isFactContinuation(text: string): boolean {
  return /^(another one|one more|more|again)\b/i.test(text.trim());
}

function isAffirmation(text: string): boolean {
  return /^(yes|yep|yeah|ok|okay|do it|go ahead|please do|yes please|sounds good)\b/i.test(text.trim());
}

function isReferenceToPrior(text: string): boolean {
  return /^(see above|as above|see prior|see previous|see earlier|same as above)\b/i.test(text.trim());
}

function isDraftDescriptionRequest(text: string): boolean {
  return /\b(draft|propose|suggest)\b[\s\S]*\b(channel\s+)?(description|purpose)\b/i.test(text);
}

function isSetDescriptionRequest(text: string): boolean {
  return mentionsDescriptionUpdate(text) && hasGeneralMutateIntent(text);
}

type StateQueryType = "purpose" | "name" | "topic" | "setup" | "none";

export function detectStateQuery(text: string): StateQueryType {
  if (isAskPurpose(text) || isAskAgentPurpose(text)) {
    return "purpose";
  }
  if (isAskName(text)) {
    return "name";
  }
  if (isAskTopic(text)) {
    return "topic";
  }
  if (isAskSetup(text)) {
    return "setup";
  }
  return "none";
}

function isDefaultPolicyPurpose(value: string | null): boolean {
  return !value || value.trim() === "" || value === DEFAULT_POLICY_PURPOSE;
}

export function resolveEffectivePurpose(channelPurpose: string | null, policyPurpose: string | null): {
  source: "slack_purpose" | "policy_purpose" | "unknown";
  value: string | null;
  mismatch: boolean;
} {
  const slack = channelPurpose?.trim() || null;
  const policy = isDefaultPolicyPurpose(policyPurpose) ? null : policyPurpose?.trim() || null;
  const mismatch = Boolean(slack && policy && slack !== policy);
  if (slack) {
    return { source: "slack_purpose", value: slack, mismatch };
  }
  if (policy) {
    return { source: "policy_purpose", value: policy, mismatch };
  }
  return { source: "unknown", value: null, mismatch: false };
}

type StateReplyInput = {
  query: StateQueryType;
  channelId: string;
  channelName: string | null;
  channelTopic: string | null;
  channelPurpose: string | null;
  policyPurpose: string | null;
};

export function buildStateQueryReply(input: StateReplyInput): string {
  const effectivePurpose = resolveEffectivePurpose(input.channelPurpose, input.policyPurpose);
  const channelName = input.channelName ? `#${input.channelName}` : null;
  const channelRef = `<#${input.channelId}>`;
  const topicSet = Boolean(input.channelTopic && input.channelTopic.trim() !== "");
  const purposeSet = Boolean(input.channelPurpose && input.channelPurpose.trim() !== "");
  const policySet = !isDefaultPolicyPurpose(input.policyPurpose);

  if (input.query === "name") {
    return `This channel is ${channelName ?? channelRef} (ID: ${input.channelId}).`;
  }

  if (input.query === "topic") {
    if (topicSet) {
      return `The current topic is: ${input.channelTopic}`;
    }
    return "This channel doesn’t have a topic set yet.";
  }

  if (input.query === "setup") {
    const gaps: string[] = [];
    if (!topicSet) gaps.push("topic");
    if (!purposeSet && !policySet) gaps.push("purpose");
    if (gaps.length === 0) {
      return `This channel looks set up: name ${channelName ?? channelRef}, topic set, and purpose set.`;
    }
    return `This channel is partially set up. Missing: ${gaps.join(", ")}.`;
  }

  if (effectivePurpose.value) {
    const mismatchNote = effectivePurpose.mismatch
      ? " Note: Slack purpose and policy purpose differ; I’m using Slack purpose as canonical."
      : "";
    return `This channel’s purpose is: ${effectivePurpose.value}.${mismatchNote}`;
  }
  return "I can’t find a configured purpose yet. If you want, I can propose one.";
}

function bucketMessageLength(text: string): EventFeatures["message_length_bucket"] {
  const n = text.length;
  if (n < 80) {
    return "short";
  }
  if (n < 280) {
    return "medium";
  }
  return "long";
}

function bucketTime(ts: number): EventFeatures["time_bucket"] {
  const hour = new Date(ts).getHours();
  if (hour < 6) {
    return "night";
  }
  if (hour < 12) {
    return "morning";
  }
  if (hour < 18) {
    return "afternoon";
  }
  return "evening";
}

function extractFeatures(text: string, hasFile: boolean, isThreadReply: boolean): EventFeatures {
  return {
    has_link: /https?:\/\//i.test(text),
    has_file: hasFile,
    has_mention: /<@[^>]+>/.test(text),
    has_here: /@here/i.test(text),
    has_channel: /@channel/i.test(text),
    is_thread_reply: isThreadReply,
    message_length_bucket: bucketMessageLength(text),
    time_bucket: bucketTime(nowMs())
  };
}

function assertNoContentPersistence(input: unknown, path = "root"): void {
  if (input == null) {
    return;
  }
  if (Array.isArray(input)) {
    input.forEach((item, index) => assertNoContentPersistence(item, `${path}[${index}]`));
    return;
  }
  if (typeof input === "object") {
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (FORBIDDEN_PERSIST_KEYS.has(key)) {
        throw new Error(`Content persistence forbidden key detected at ${path}.${key}`);
      }
      assertNoContentPersistence(value, `${path}.${key}`);
    }
  }
}

function redactErrorCode(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  const match = text.match(/failed:\s*([a-z_]+)/i);
  return match?.[1] ?? "unknown_error";
}

function parseJsonSafe<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function buildThreadLines(messages: SlackMessage[]): string[] {
  return messages
    .slice(-14)
    .map((m) => {
      const role = m.bot_id ? "assistant" : "user";
      const hasFiles = (m.files ?? []).length > 0;
      const raw = (m.text ?? "").replace(/\s+/g, " ").trim();
      const line = raw.slice(0, 420);
      if (!line && hasFiles) {
        return `${role}: [message contains file/image attachment; visual contents unavailable to this toolset]`;
      }
      if (line && hasFiles) {
        return `${role}: ${line} [includes file/image attachment; visual contents unavailable to this toolset]`;
      }
      return `${role}: ${line}`;
    });
}

function plannerSystemPrompt(): string {
  return [
    "You are an agentic Slack channel operator.",
    "Primary objective: produce a useful one-shot answer in the same turn.",
    "Default behavior is EXECUTE-NOW for read-only requests.",
    "For explicit mutate requests (set/update/change/apply topic/purpose), execute immediately in this turn.",
    "Never ask for permission to run read tools.",
    "Do not ask confirmation for normal topic/purpose updates unless the user explicitly asks for confirmation.",
    "Never output internal workflow narration such as 'User requested', 'Next:', or 'Should I proceed?'.",
    "Speak directly to the user as a normal assistant.",
    "Never refer to the user in third person (avoid phrases like 'User asked...' or 'User requested...').",
    "Do not output section headers like 'Observed', 'Changed', 'Tool Results', or 'Next'.",
    "Never output implementation status logs.",
    "Never invent channel metadata, policy, or setup state.",
    "You have an image tool available: describe_thread_images.",
    "If user asks about images/files/screenshots/attachments, call describe_thread_images before answering.",
    "Never guess what an image contains without tool evidence.",
    "For metadata questions (name/topic/purpose/setup), ground answers in tool evidence only.",
    "If evidence is missing, say unknown in plain language and ask at most one concrete follow-up question.",
    "Slack content is ephemeral context only; do not request persistence of content.",
    "Use minimal tool calls; prefer one read bundle and then answer.",
    "If user asks to update/change/set channel description or purpose, you MUST emit write_actions with set_channel_purpose in the same turn.",
    "If user asks to update/change/set channel topic, you MUST emit write_actions with set_channel_topic in the same turn.",
    "Channel description maps to set_channel_purpose.",
    "Never claim a channel update was applied unless the corresponding write tool succeeded.",
    "Allowed tool names: get_channel_info, read_thread, read_channel_history, describe_thread_images, add_reaction, remove_reaction, summarize_thread, produce_artifact, set_channel_topic, set_channel_purpose.",
    "Return STRICT JSON with keys:",
    "observations, intent, confidence, tool_calls, proposed_policy_delta, write_actions, final_reply, follow_up_question.",
    "final_reply must include arrays: what_i_observed, what_i_changed, what_i_recommend_next.",
    "tool_calls items: {name,args,reason}.",
    "write_actions items: {name,args,requires_confirmation}.",
    "Set requires_confirmation=false by default."
  ].join("\n");
}

function looksLikeMetaPlannerReply(text: string): boolean {
  const t = text.trim().toLowerCase();
  return (
    t.startsWith("user asked") ||
    t.startsWith("user requested") ||
    t.startsWith("user provided") ||
    t.includes("tool results") ||
    t.includes("observed") ||
    t.includes("i changed") ||
    /\bcontinue responding\b/.test(t) ||
    /\bnext:\b/.test(t)
  );
}

function botHandle(env: Env): string {
  return (env.BOT_HANDLE ?? "agent").replace(/^@/, "").trim() || "agent";
}

function normalizeHandleMentions(text: string, env: Env): string {
  const handle = botHandle(env);
  return text.replace(/@assistant\b/gi, `@${handle}`);
}

async function rewriteToDirectReply(env: Env, userPrompt: string, draftReply: string): Promise<string> {
  const rewritten = await openAIResponses(env, [
    {
      role: "system",
      content:
        `Rewrite into one natural Slack reply. Address the user directly. No meta workflow narration. No third-person references to 'user'. Keep it concise and helpful. If mentioning the bot handle, always use @${botHandle(
          env
        )}.`
    },
    {
      role: "user",
      content: JSON.stringify({
        user_prompt: userPrompt,
        draft_reply: draftReply
      })
    }
  ]);
  return normalizeHandleMentions(rewritten.trim() || draftReply, env);
}

async function generateDirectFactReply(env: Env, userPrompt: string): Promise<string> {
  const out = await openAIResponses(env, [
    {
      role: "system",
      content:
        "You are a helpful Slack assistant. Return exactly one obscure, accurate historical fact. Avoid common trivia (Great Wall, Eiffel Tower, Cleopatra, WW2 basics, shortest war). No preamble, no 'Did you know', no question back. Max 2 sentences."
    },
    { role: "user", content: userPrompt }
  ]);
  return normalizeHandleMentions(out.trim() || "In 1913, the tiny French village of Goussainville briefly had two mayors due to a disputed municipal election.", env);
}

function recentAssistantFactSnippets(messages: SlackMessage[]): string[] {
  return messages
    .filter((m) => Boolean(m.bot_id) && Boolean(m.text))
    .map((m) => (m.text ?? "").replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 0)
    .slice(-5);
}

async function generateNovelFactReply(env: Env, userPrompt: string, recentFacts: string[]): Promise<string> {
  const out = await openAIResponses(env, [
    {
      role: "system",
      content:
        "Return one obscure, accurate historical fact that is clearly different from the recent facts. Avoid repeating topic families. No preamble or follow-up question. Max 2 sentences."
    },
    {
      role: "user",
      content: JSON.stringify({
        user_prompt: userPrompt,
        avoid_topics_from_recent_facts: recentFacts
      })
    }
  ]);
  return normalizeHandleMentions(out.trim() || "In 1863, the Kingdom of Hawaii maintained formal diplomatic treaties with multiple European powers and the United States while remaining an internationally recognized sovereign state.", env);
}

function inferEffectivePrompt(userPrompt: string, threadMessages: SlackMessage[], userId: string): string {
  if (!isAffirmation(userPrompt) && !isReferenceToPrior(userPrompt)) {
    return userPrompt;
  }

  const prior = [...threadMessages]
    .reverse()
    .filter((m) => m.user === userId && !m.bot_id && Boolean(m.text))
    .map((m) => stripMention(m.text ?? ""))
    .find(
      (t) =>
        t.trim() &&
        !isAffirmation(t) &&
        !isReferenceToPrior(t) &&
        t.trim().toLowerCase() !== userPrompt.trim().toLowerCase()
    );

  return prior ?? userPrompt;
}

async function draftChannelPurposeFromContext(
  env: Env,
  args: {
    effectivePrompt: string;
    threadLines: string[];
    channelPurpose: string | null;
    policyPurpose: string | null;
  }
): Promise<string> {
  const raw = await openAIResponses(env, [
    {
      role: "system",
      content:
        "Draft one concise, generic Slack channel description/purpose sentence. Use neutral wording, no first person, no questions, no @assistant. Max 140 chars."
    },
    {
      role: "user",
      content: JSON.stringify({
        request: args.effectivePrompt,
        existing_channel_purpose: args.channelPurpose,
        existing_policy_purpose: args.policyPurpose,
        thread_context: args.threadLines.slice(-12)
      })
    }
  ]);
  const singleLine = raw.replace(/\s+/g, " ").trim().slice(0, 140);
  return normalizeHandleMentions(singleLine || "General collaboration channel for updates, requests, and follow-up discussions.", env);
}

function normalizeFollowUpQuestion(question: string | null, hasWriteActions: boolean): string | null {
  if (!question) {
    return null;
  }
  const text = question.trim();
  if (!text) {
    return null;
  }
  // Prevent conversational dead-loops for read-only turns.
  if (!hasWriteActions && /(should i proceed|would you like me to|do you want me to)/i.test(text)) {
    return null;
  }
  // Prevent confirmation loops for normal execution turns.
  if (/(should i proceed|would you like me to|do you want me to|can i apply|please confirm)/i.test(text)) {
    return null;
  }
  return text;
}

function normalizeConversationalReply(text: string): string {
  const cleaned = text
    .replace(/\bUser (requested|indicates|inquired)[^.]*\.\s*/gi, "")
    .replace(/\bSome actions could not run \([^)]+\)\.\s*/gi, "")
    .replace(/\bNext:\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return cleaned || "Done.";
}

function mentionsDescriptionUpdate(text: string): boolean {
  return /\b(set|update|change|edit)\b[\s\S]*\b(channel\s+)?(description|purpose)\b/i.test(text);
}

function mentionsTopicUpdate(text: string): boolean {
  return /\b(set|update|change|edit)\b[\s\S]*\b(channel\s+)?topic\b/i.test(text);
}

async function fallbackWriteActionFromContext(
  env: Env,
  userPrompt: string,
  threadLines: string[]
): Promise<PlannerWriteAction | null> {
  const mode = mentionsTopicUpdate(userPrompt) ? "topic" : mentionsDescriptionUpdate(userPrompt) ? "purpose" : "none";
  if (mode === "none") {
    return null;
  }

  const raw = await openAIResponses(env, [
    {
      role: "system",
      content:
        "Return STRICT JSON only. Infer the requested channel metadata update from user request + recent thread. If updating description/purpose return {\"name\":\"set_channel_purpose\",\"args\":{\"purpose\":\"...\"},\"requires_confirmation\":false}. If updating topic return {\"name\":\"set_channel_topic\",\"args\":{\"topic\":\"...\"},\"requires_confirmation\":false}. Use concise wording and do not include @assistant; use @agent if needed."
    },
    {
      role: "user",
      content: JSON.stringify({
        user_prompt: userPrompt,
        thread_context: threadLines.slice(-12)
      })
    }
  ]);

  const parsed = parseJsonSafe<PlannerWriteAction>(raw);
  if (!parsed || typeof parsed.name !== "string" || typeof parsed.args !== "object" || !parsed.args) {
    return null;
  }
  if (parsed.name !== "set_channel_purpose" && parsed.name !== "set_channel_topic") {
    return null;
  }
  return { ...parsed, requires_confirmation: false };
}

function formatFinalReply(plan: PlannerOutput, toolResults: ToolResult[]): string {
  const observed = plan.final_reply?.what_i_observed?.filter(Boolean) ?? [];
  const changed = plan.final_reply?.what_i_changed?.filter(Boolean) ?? [];
  const next = plan.final_reply?.what_i_recommend_next?.filter(Boolean) ?? [];
  const failures = toolResults.filter((r) => !r.ok).map((r) => `${r.tool}: ${r.error_code ?? "error"}`);

  const successfulWrite = toolResults.some(
    (r) => r.ok && (r.tool === "set_channel_topic" || r.tool === "set_channel_purpose")
  );
  const parts: string[] = [];
  if (observed.length > 0) {
    parts.push(observed[0]);
  }
  if (successfulWrite && changed.length > 0 && !changed[0].toLowerCase().includes("no changes")) {
    parts.push(`I changed: ${changed[0]}`);
  }
  if (failures.length > 0) {
    parts.push(`Some actions could not run (${failures.join(", ")}).`);
  }
  if (next.length > 0) {
    parts.push(`Next: ${next[0]}`);
  }
  if (plan.follow_up_question) {
    parts.push(plan.follow_up_question);
  }

  if (parts.length === 0) {
    return "I’m missing enough context to answer confidently. Can you be a bit more specific?";
  }
  return normalizeConversationalReply(parts.join(" "));
}

async function verifySlackSignature(request: Request, rawBody: string, signingSecret: string): Promise<boolean> {
  const timestamp = request.headers.get("x-slack-request-timestamp");
  const signature = request.headers.get("x-slack-signature");
  if (!timestamp || !signature) {
    return false;
  }

  const ageSeconds = Math.abs(Math.floor(nowMs() / 1000) - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) {
    return false;
  }

  const baseString = `v0:${timestamp}:${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(baseString));
  return secureCompare(`v0=${toHex(digest)}`, signature);
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
  throw new Error("Missing OpenAI key");
}

async function openAIResponses(env: Env, input: unknown): Promise<string> {
  const apiKey = await getOpenAIKey(env);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL ?? "gpt-4.1-mini",
      input
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

  return (
    json.output_text ??
    json.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .join("\n")
      .trim() ??
    ""
  );
}

async function openAIVisionDescribe(
  env: Env,
  input: Array<{ mimeType: string; dataBase64: string }>,
  userPrompt: string
): Promise<string> {
  const apiKey = await getOpenAIKey(env);
  const content: Array<Record<string, unknown>> = [
    {
      type: "text",
      text:
        "You are analyzing screenshots shared in Slack. Describe only what is visible. If uncertain, say uncertain. Keep the answer concise."
    },
    {
      type: "text",
      text: `User request: ${userPrompt}`
    }
  ];

  for (const img of input.slice(0, 4)) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${img.mimeType};base64,${img.dataBase64}`
      }
    });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL ?? "gpt-4.1-mini",
      messages: [
        {
          role: "user",
          content
        }
      ]
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI vision call failed: ${response.status} ${body}`);
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() || "";
}

async function slackApi(
  env: Env,
  method: string,
  body: Record<string, unknown>,
  mode: "post" | "get" = "post"
): Promise<SlackApiResponse> {
  const url = new URL(`https://slack.com/api/${method}`);
  let init: RequestInit;

  if (mode === "get") {
    for (const [key, value] of Object.entries(body)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
    init = {
      method: "GET",
      headers: {
        authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
      }
    };
  } else {
    init = {
      method: "POST",
      headers: {
        authorization: `Bearer ${env.SLACK_BOT_TOKEN}`,
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(body)
    };
  }

  const response = await fetch(url, init);
  const json = (await response.json()) as SlackApiResponse;
  if (!response.ok || !json.ok) {
    throw new Error(`Slack API ${method} failed: ${json.error ?? response.status}`);
  }
  return json;
}

async function actionLog(
  env: Env,
  input: {
    channel_id?: string;
    thread_ts?: string;
    message_ts?: string;
    user_id?: string;
    action_name: string;
    status: "ok" | "error" | "pending";
    error_code?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const metadata = input.metadata ?? {};
  assertNoContentPersistence(metadata);

  await env.COMMS_DB.prepare(
    `INSERT INTO action_log (
      id, ts, channel_id, thread_ts, message_ts, user_id, action_name, status, error_code, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      crypto.randomUUID(),
      nowMs(),
      input.channel_id ?? null,
      input.thread_ts ?? null,
      input.message_ts ?? null,
      input.user_id ?? null,
      input.action_name,
      input.status,
      input.error_code ?? null,
      JSON.stringify(metadata)
    )
    .run();
}

async function postThread(env: Env, channel: string, threadTs: string, text: string): Promise<void> {
  await slackApi(env, "chat.postMessage", {
    channel,
    thread_ts: threadTs,
    text
  });
}

async function getChannelInfo(env: Env, channelId: string): Promise<ChannelContext> {
  try {
    const json = await slackApi(env, "conversations.info", { channel: channelId });
    return {
      id: channelId,
      name: json.channel?.name ?? null,
      topic: json.channel?.topic?.value ?? null,
      purpose: json.channel?.purpose?.value ?? null,
      numMembers: typeof json.channel?.num_members === "number" ? json.channel.num_members : null
    };
  } catch {
    return { id: channelId, name: null, topic: null, purpose: null, numMembers: null };
  }
}

async function readThread(env: Env, channelId: string, rootTs: string, limit = 30): Promise<SlackMessage[]> {
  if (!/^\d+\.\d+$/.test(rootTs)) {
    return [];
  }
  try {
    const json = await slackApi(
      env,
      "conversations.replies",
      {
        channel: channelId,
        ts: rootTs,
        limit,
        inclusive: true
      },
      "get"
    );
    return json.messages ?? [];
  } catch {
    return [];
  }
}

async function readChannelHistory(
  env: Env,
  channelId: string,
  oldestEpochSeconds: number,
  limit = 40
): Promise<SlackMessage[]> {
  try {
    const json = await slackApi(
      env,
      "conversations.history",
      {
        channel: channelId,
        oldest: oldestEpochSeconds,
        limit
      },
      "get"
    );
    return json.messages ?? [];
  } catch {
    return [];
  }
}

function isImageFile(file: SlackFile): boolean {
  const mime = file.mimetype ?? "";
  return mime.startsWith("image/");
}

async function fetchSlackFileAsBase64(env: Env, file: SlackFile): Promise<{ mimeType: string; dataBase64: string } | null> {
  const fileUrl = file.url_private_download ?? file.url_private;
  if (!fileUrl) {
    return null;
  }
  const response = await fetch(fileUrl, {
    headers: {
      authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
    }
  });
  if (!response.ok) {
    return null;
  }
  const arr = await response.arrayBuffer();
  if (arr.byteLength === 0) {
    return null;
  }
  // Keep payload bounded for model call.
  if (arr.byteLength > 4 * 1024 * 1024) {
    return null;
  }
  const bytes = new Uint8Array(arr);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  const dataBase64 = btoa(binary);
  return {
    mimeType: file.mimetype ?? "image/png",
    dataBase64
  };
}

async function getPolicy(env: Env, channelId: string): Promise<ChannelPolicyRow> {
  const row = await env.COMMS_DB.prepare(
    `SELECT channel_id, purpose, allowed_post_types, disallowed_patterns, preferred_behavior, enforcement_style, escalation_rules, version
     FROM channel_policy
     WHERE channel_id = ?
     LIMIT 1`
  )
    .bind(channelId)
    .first<ChannelPolicyRow>();

  return (
    row ?? {
      channel_id: channelId,
      purpose: DEFAULT_POLICY_PURPOSE,
      allowed_post_types: null,
      disallowed_patterns: null,
      preferred_behavior: null,
      enforcement_style: null,
      escalation_rules: null,
      version: 1
    }
  );
}

async function getRouting(env: Env, channelId: string): Promise<RoutingRow[]> {
  const rows = await env.COMMS_DB.prepare(
    `SELECT intent_label, keywords, target_channel_id, rationale
     FROM channel_routing_map
     WHERE channel_id = ? OR channel_id = '*'
     ORDER BY channel_id DESC, intent_label ASC`
  )
    .bind(channelId)
    .all<RoutingRow>();

  return rows.results ?? [];
}

async function upsertPolicyPurpose(env: Env, channelId: string, purpose: string, userId: string | null): Promise<void> {
  await env.COMMS_DB.prepare(
    `INSERT INTO channel_policy (
      channel_id, purpose, allowed_post_types, disallowed_patterns, preferred_behavior,
      enforcement_style, escalation_rules, last_updated_by, last_updated_at, version
    ) VALUES (?, ?, NULL, NULL, NULL, NULL, NULL, ?, ?, 1)
    ON CONFLICT(channel_id)
    DO UPDATE SET purpose = excluded.purpose, last_updated_by = excluded.last_updated_by,
      last_updated_at = excluded.last_updated_at, version = COALESCE(channel_policy.version, 1) + 1`
  )
    .bind(channelId, purpose, userId, nowMs())
    .run();
}

async function getPendingConfirmation(
  env: Env,
  channelId: string,
  threadTs: string,
  userId: string
): Promise<ConfirmationRow | null> {
  const row = await env.COMMS_DB.prepare(
    `SELECT id, channel_id, thread_ts, user_id, action_name, args_json, expires_ts, status
     FROM confirmation_requests
     WHERE channel_id = ? AND thread_ts = ? AND user_id = ? AND status = 'pending' AND expires_ts > ?
     ORDER BY created_ts DESC
     LIMIT 1`
  )
    .bind(channelId, threadTs, userId, nowMs())
    .first<ConfirmationRow>();

  return row ?? null;
}

async function createConfirmation(
  env: Env,
  args: {
    channel_id: string;
    thread_ts: string;
    user_id: string;
    action_name: string;
    action_args: Record<string, unknown>;
    ttl_ms?: number;
  }
): Promise<string> {
  const id = crypto.randomUUID();
  const ttl = args.ttl_ms ?? 10 * 60 * 1000;
  const expires = nowMs() + ttl;
  assertNoContentPersistence(args.action_args);

  await env.COMMS_DB.prepare(
    `INSERT INTO confirmation_requests (
      id, channel_id, thread_ts, user_id, action_name, args_json, action_hash, status, created_ts, expires_ts
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
  )
    .bind(
      id,
      args.channel_id,
      args.thread_ts,
      args.user_id,
      args.action_name,
      JSON.stringify(args.action_args),
      await sha256Hex(`${args.action_name}:${JSON.stringify(args.action_args)}`),
      nowMs(),
      expires
    )
    .run();

  return id;
}

async function markConfirmationStatus(env: Env, id: string, status: "confirmed" | "expired" | "cancelled"): Promise<void> {
  await env.COMMS_DB.prepare(`UPDATE confirmation_requests SET status = ? WHERE id = ?`).bind(status, id).run();
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return toHex(digest);
}

function hasGeneralMutateIntent(userPrompt: string): boolean {
  const text = userPrompt.toLowerCase();
  if (/\b(what|why|how|when|where|who)\b/.test(text) && !/\b(set|update|change|apply|edit|configure)\b/.test(text)) {
    return false;
  }
  return /\b(set|update|change|apply|edit|configure|rename|create)\b/.test(text);
}

function shouldWriteActionsRun(env: Env): boolean {
  return boolFromEnv(env.WRITE_ACTIONS_ENABLED, WRITE_ACTIONS_DEFAULT);
}

function strictNoContent(env: Env): boolean {
  return boolFromEnv(env.STRICT_NO_CONTENT_STORAGE, STRICT_DEFAULT);
}

async function maybeProcessConfirmation(
  env: Env,
  channelId: string,
  threadTs: string,
  userId: string,
  userPrompt: string
): Promise<{ consumed: boolean; message?: string }> {
  if (!/^yes\b/i.test(userPrompt.trim())) {
    return { consumed: false };
  }

  const pending = await getPendingConfirmation(env, channelId, threadTs, userId);
  if (!pending) {
    return { consumed: false };
  }

  const args = parseJsonSafe<Record<string, unknown>>(pending.args_json) ?? {};
  const result = await executeWriteAction(env, pending.action_name, args, channelId, threadTs, userId, true);
  await markConfirmationStatus(env, pending.id, "confirmed");

  return {
    consumed: true,
    message: result.ok
      ? "Confirmed. I applied the requested change."
      : `I couldn't apply the confirmed action: ${result.error_code ?? "unknown_error"}`
  };
}

async function executeToolCall(
  env: Env,
  tool: PlannerToolCall,
  ctx: {
    channelId: string;
    rootTs: string;
    userId?: string;
  }
): Promise<ToolResult> {
  try {
    if (tool.name === "get_channel_info") {
      const info = await getChannelInfo(env, ctx.channelId);
      return { tool: tool.name, ok: true, output: info };
    }

    if (tool.name === "read_thread") {
      const limit = Number(tool.args.limit ?? 30);
      const thread = await readThread(env, ctx.channelId, ctx.rootTs, Number.isFinite(limit) ? limit : 30);
      return {
        tool: tool.name,
        ok: true,
        output: {
          count: thread.length,
          lines: buildThreadLines(thread)
        }
      };
    }

    if (tool.name === "read_channel_history") {
      const windowHours = Number(tool.args.window_hours ?? 24);
      const oldest = Math.floor((nowMs() - Math.max(1, windowHours) * 3600 * 1000) / 1000);
      const messages = await readChannelHistory(env, ctx.channelId, oldest, 40);
      return {
        tool: tool.name,
        ok: true,
        output: {
          count: messages.length,
          lines: buildThreadLines(messages)
        }
      };
    }

    if (tool.name === "describe_thread_images") {
      const thread = await readThread(env, ctx.channelId, ctx.rootTs, 40);
      const images = thread.flatMap((m) => m.files ?? []).filter(isImageFile).slice(0, 4);
      if (images.length === 0) {
        return {
          tool: tool.name,
          ok: true,
          output: { summary: "No image attachments found in this thread.", image_count: 0 }
        };
      }
      const fetched: Array<{ mimeType: string; dataBase64: string }> = [];
      for (const image of images) {
        const loaded = await fetchSlackFileAsBase64(env, image);
        if (loaded) {
          fetched.push(loaded);
        }
      }
      if (fetched.length === 0) {
        return {
          tool: tool.name,
          ok: false,
          output: {},
          error_code: "image_fetch_failed"
        };
      }

      const prompt = String(tool.args.user_prompt ?? "Describe the images.");
      const summary = await openAIVisionDescribe(env, fetched, prompt);
      return {
        tool: tool.name,
        ok: true,
        output: {
          image_count: fetched.length,
          summary
        }
      };
    }

    if (tool.name === "add_reaction") {
      if (!shouldWriteActionsRun(env)) {
        return { tool: tool.name, ok: false, output: {}, error_code: "write_actions_disabled" };
      }
      const emoji = String(tool.args.emoji ?? "eyes");
      const ts = String(tool.args.message_ts ?? ctx.rootTs);
      await slackApi(env, "reactions.add", { channel: ctx.channelId, timestamp: ts, name: emoji });
      return { tool: tool.name, ok: true, output: { emoji, message_ts: ts } };
    }

    if (tool.name === "remove_reaction") {
      if (!shouldWriteActionsRun(env)) {
        return { tool: tool.name, ok: false, output: {}, error_code: "write_actions_disabled" };
      }
      const emoji = String(tool.args.emoji ?? "eyes");
      const ts = String(tool.args.message_ts ?? ctx.rootTs);
      await slackApi(env, "reactions.remove", { channel: ctx.channelId, timestamp: ts, name: emoji });
      return { tool: tool.name, ok: true, output: { emoji, message_ts: ts } };
    }

    if (tool.name === "summarize_thread") {
      const thread = await readThread(env, ctx.channelId, ctx.rootTs, 40);
      const lines = buildThreadLines(thread);
      const summary = await openAIResponses(env, [
        {
          role: "system",
          content:
            "Summarize this Slack thread briefly with only operational takeaways. Avoid quotes and avoid reconstructing the conversation."
        },
        { role: "user", content: lines.join("\n") || "(no thread content)" }
      ]);
      return { tool: tool.name, ok: true, output: { summary } };
    }

    if (tool.name === "produce_artifact") {
      return {
        tool: tool.name,
        ok: true,
        output: { status: "stub", note: "Artifact generation tool is not yet wired." }
      };
    }

    return { tool: tool.name, ok: false, output: {}, error_code: "unknown_tool" };
  } catch (error) {
    return {
      tool: tool.name,
      ok: false,
      output: {},
      error_code: redactErrorCode(error)
    };
  }
}

async function executeWriteAction(
  env: Env,
  actionName: string,
  args: Record<string, unknown>,
  channelId: string,
  rootTs: string,
  userId: string,
  fromConfirmation: boolean
): Promise<ToolResult> {
  if (!shouldWriteActionsRun(env)) {
    return { tool: actionName, ok: false, output: {}, error_code: "write_actions_disabled" };
  }

  try {
    if (actionName === "set_channel_topic") {
      const topic = String(args.topic ?? "").trim();
      if (!topic) {
        return { tool: actionName, ok: false, output: {}, error_code: "invalid_args" };
      }
      await slackApi(env, "conversations.setTopic", { channel: channelId, topic });
      await actionLog(env, {
        channel_id: channelId,
        thread_ts: rootTs,
        user_id: userId,
        action_name: actionName,
        status: "ok",
        metadata: { from_confirmation: fromConfirmation }
      });
      return { tool: actionName, ok: true, output: { applied: true } };
    }

    if (actionName === "set_channel_purpose") {
      const purpose = String(args.purpose ?? args.description ?? "").trim();
      if (!purpose) {
        return { tool: actionName, ok: false, output: {}, error_code: "invalid_args" };
      }
      await slackApi(env, "conversations.setPurpose", { channel: channelId, purpose });
      await upsertPolicyPurpose(env, channelId, purpose, userId);
      await actionLog(env, {
        channel_id: channelId,
        thread_ts: rootTs,
        user_id: userId,
        action_name: actionName,
        status: "ok",
        metadata: { from_confirmation: fromConfirmation }
      });
      return { tool: actionName, ok: true, output: { applied: true } };
    }

    return { tool: actionName, ok: false, output: {}, error_code: "unknown_write_action" };
  } catch (error) {
    await actionLog(env, {
      channel_id: channelId,
      thread_ts: rootTs,
      user_id: userId,
      action_name: actionName,
      status: "error",
      error_code: redactErrorCode(error),
      metadata: { from_confirmation: fromConfirmation }
    });

    return { tool: actionName, ok: false, output: {}, error_code: redactErrorCode(error) };
  }
}

async function planner(
  env: Env,
  input: {
    channelContext: ChannelContext;
    policy: ChannelPolicyRow;
    routing: RoutingRow[];
    features: EventFeatures;
    rootTs: string;
    userPrompt: string;
    threadLines: string[];
  }
): Promise<PlannerOutput> {
  const payload = {
    bot_handle: botHandle(env),
    channel: {
      id: input.channelContext.id,
      name: input.channelContext.name,
      topic: input.channelContext.topic,
      purpose: input.channelContext.purpose,
      num_members: input.channelContext.numMembers
    },
    policy: {
      purpose: input.policy.purpose,
      allowed_post_types: input.policy.allowed_post_types,
      disallowed_patterns: input.policy.disallowed_patterns,
      preferred_behavior: input.policy.preferred_behavior,
      enforcement_style: input.policy.enforcement_style,
      escalation_rules: input.policy.escalation_rules,
      version: input.policy.version
    },
    routing_map: input.routing,
    features: input.features,
    attachment_context: {
      has_file_in_event: input.features.has_file,
      note: "file/image attachments may exist; visual contents are not available unless explicitly provided as text."
    },
    root_ts: input.rootTs,
    thread_context: input.threadLines,
    user_request: input.userPrompt
  };

  const raw = await openAIResponses(env, [
    { role: "system", content: plannerSystemPrompt() },
    { role: "user", content: JSON.stringify(payload) }
  ]);

  const parsed = parseJsonSafe<PlannerOutput>(raw);
  if (!parsed) {
    return {
      observations: ["Planner JSON parse failed"],
      intent: "unknown",
      confidence: 0.2,
      tool_calls: [],
      proposed_policy_delta: null,
      write_actions: [],
      final_reply: {
        what_i_observed: ["I could not parse planner output reliably."],
        what_i_changed: ["No changes applied."],
        what_i_recommend_next: ["Try a more specific request."]
      },
      follow_up_question: "Can you clarify the exact action you want me to take?"
    };
  }

  return {
    observations: Array.isArray(parsed.observations) ? parsed.observations : [],
    intent: typeof parsed.intent === "string" ? parsed.intent : "unknown",
    confidence: Number.isFinite(parsed.confidence) ? parsed.confidence : 0,
    tool_calls: Array.isArray(parsed.tool_calls) ? parsed.tool_calls : [],
    proposed_policy_delta: parsed.proposed_policy_delta ?? null,
    write_actions: Array.isArray(parsed.write_actions) ? parsed.write_actions : [],
    final_reply: parsed.final_reply ?? {
      what_i_observed: [],
      what_i_changed: [],
      what_i_recommend_next: []
    },
    follow_up_question: parsed.follow_up_question ?? null
  };
}

function normalizePlanForExecution(plan: PlannerOutput): PlannerOutput {
  const writeActionNames = new Set(["set_channel_topic", "set_channel_purpose"]);
  const normalizedWriteActions: PlannerWriteAction[] = [...plan.write_actions];

  for (const tool of plan.tool_calls) {
    if (!writeActionNames.has(tool.name)) {
      continue;
    }
    normalizedWriteActions.push({
      name: tool.name,
      args: tool.args ?? {},
      requires_confirmation: false
    });
  }

  const dedupWrite = new Map<string, PlannerWriteAction>();
  for (const action of normalizedWriteActions) {
    const key = `${action.name}:${JSON.stringify(action.args ?? {})}`;
    if (!dedupWrite.has(key)) {
      dedupWrite.set(key, action);
    }
  }

  const filteredToolCalls = plan.tool_calls.filter((tool) => !writeActionNames.has(tool.name));

  return {
    ...plan,
    tool_calls: filteredToolCalls,
    write_actions: Array.from(dedupWrite.values()),
    follow_up_question: normalizeFollowUpQuestion(plan.follow_up_question, dedupWrite.size > 0)
  };
}

async function applyPlannerWriteActions(
  env: Env,
  args: {
    channelId: string;
    rootTs: string;
    userId: string;
    userPrompt: string;
    writeActions: PlannerWriteAction[];
  }
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];
  const generalMutateIntent = hasGeneralMutateIntent(args.userPrompt);

  for (const action of args.writeActions) {
    if (!generalMutateIntent) {
      results.push({ tool: action.name, ok: false, output: {}, error_code: "blocked_readonly_intent" });
      continue;
    }
    if (action.requires_confirmation) {
      await createConfirmation(env, {
        channel_id: args.channelId,
        thread_ts: args.rootTs,
        user_id: args.userId,
        action_name: action.name,
        action_args: action.args
      });
      await postThread(
        env,
        args.channelId,
        args.rootTs,
        `I can apply \`${action.name}\`. Reply \`yes\` in this thread within 10 minutes to confirm.`
      );
      results.push({ tool: action.name, ok: false, output: {}, error_code: "confirmation_required" });
      continue;
    }

    const result = await executeWriteAction(
      env,
      action.name,
      action.args,
      args.channelId,
      args.rootTs,
      args.userId,
      false
    );
    results.push(result);
  }

  return results;
}

async function handleMention(env: Env, payload: SlackEventEnvelope["event"]): Promise<void> {
  if (!payload?.channel || !payload.ts) {
    return;
  }

  const channelId = payload.channel;
  const rootTs = payload.thread_ts ?? payload.ts;
  const userId = payload.user ?? "unknown";
  const rawText = payload.text ?? "";
  const userPrompt = stripMention(rawText);

  const confirmation = await maybeProcessConfirmation(env, channelId, rootTs, userId, userPrompt);
  if (confirmation.consumed) {
    await postThread(env, channelId, rootTs, confirmation.message ?? "Confirmed.");
    return;
  }

  const threadMessages = await readThread(env, channelId, rootTs, 30);
  const effectivePrompt = inferEffectivePrompt(userPrompt, threadMessages, userId);
  const eventFeatures = extractFeatures(rawText, Boolean(threadMessages.find((m) => (m.files ?? []).length > 0)), Boolean(payload.thread_ts));
  const channelContext = await getChannelInfo(env, channelId);
  const policy = await getPolicy(env, channelId);
  const routing = await getRouting(env, channelId);

  const stateQuery = detectStateQuery(effectivePrompt);
  if (stateQuery !== "none") {
    await postThread(
      env,
      channelId,
      rootTs,
      buildStateQueryReply({
        query: stateQuery,
        channelId,
        channelName: channelContext.name,
        channelTopic: channelContext.topic,
        channelPurpose: channelContext.purpose,
        policyPurpose: policy.purpose
      })
    );
    return;
  }

  if (isFactRequest(userPrompt) || (isFactContinuation(userPrompt) && buildThreadLines(threadMessages).some((l) => /\bfact\b/i.test(l)))) {
    const recentFacts = recentAssistantFactSnippets(threadMessages);
    const fact =
      recentFacts.length > 0
        ? await generateNovelFactReply(env, userPrompt, recentFacts)
        : await generateDirectFactReply(env, userPrompt);
    await postThread(env, channelId, rootTs, fact);
    return;
  }

  const threadLines = buildThreadLines(threadMessages);
  if (isDraftDescriptionRequest(effectivePrompt) || isSetDescriptionRequest(effectivePrompt)) {
    const draftedPurpose = await draftChannelPurposeFromContext(env, {
      effectivePrompt,
      threadLines,
      channelPurpose: channelContext.purpose,
      policyPurpose: policy.purpose
    });

    if (isSetDescriptionRequest(effectivePrompt)) {
      const write = await executeWriteAction(
        env,
        "set_channel_purpose",
        { purpose: draftedPurpose },
        channelId,
        rootTs,
        userId,
        false
      );
      if (write.ok) {
        await postThread(env, channelId, rootTs, `Updated channel description to: ${draftedPurpose}`);
      } else {
        await postThread(
          env,
          channelId,
          rootTs,
          `I couldn't update the channel description yet (${write.error_code ?? "unknown_error"}). Draft: ${draftedPurpose}`
        );
      }
      return;
    }

    await postThread(env, channelId, rootTs, `Draft channel description: ${draftedPurpose}`);
    return;
  }

  const threadHasAttachments = threadMessages.some((m) => (m.files ?? []).length > 0);
  const asksToInspect = /\b(see|look|describe|what\s+are|what\s+is|summarize|review|check)\b/i.test(userPrompt);
  if (isImageQuestion(userPrompt) || (threadHasAttachments && asksToInspect)) {
    const imageResult = await executeToolCall(
      env,
      { name: "describe_thread_images", args: { user_prompt: userPrompt }, reason: "user asked about images" },
      { channelId, rootTs, userId }
    );
    const text =
      imageResult.ok && typeof imageResult.output.summary === "string"
        ? imageResult.output.summary
        : "I couldn’t read the image content from this thread yet. Please make sure the files are accessible to the app and try again.";
    await postThread(env, channelId, rootTs, text);
    return;
  }

  const plan = await planner(env, {
    channelContext,
    policy,
    routing,
    features: eventFeatures,
    rootTs,
    userPrompt: effectivePrompt,
    threadLines
  });
  const normalizedPlan = normalizePlanForExecution(plan);
  if (hasGeneralMutateIntent(effectivePrompt) && normalizedPlan.write_actions.length === 0) {
    try {
      const fallback = await fallbackWriteActionFromContext(env, effectivePrompt, threadLines);
      if (fallback) {
        normalizedPlan.write_actions.push(fallback);
      }
    } catch {
      // no-op fallback
    }
  }

  const toolResults: ToolResult[] = [];
  for (const toolCall of normalizedPlan.tool_calls.slice(0, 4)) {
    const result = await executeToolCall(env, toolCall, {
      channelId,
      rootTs,
      userId
    });
    toolResults.push(result);
  }

  const writeResults = await applyPlannerWriteActions(env, {
    channelId,
    rootTs,
    userId,
    userPrompt: effectivePrompt,
    writeActions: normalizedPlan.write_actions.slice(0, 2)
  });
  toolResults.push(...writeResults);

  let reply = formatFinalReply(normalizedPlan, toolResults);
  if (looksLikeMetaPlannerReply(reply)) {
    try {
      reply = await rewriteToDirectReply(env, effectivePrompt, reply);
    } catch {
      // Keep original reply if rewrite fails.
    }
  }
  await postThread(env, channelId, rootTs, normalizeHandleMentions(reply, env));

  await actionLog(env, {
    channel_id: channelId,
    thread_ts: rootTs,
    message_ts: payload.ts,
    user_id: userId,
    action_name: "handle_mention",
    status: "ok",
    metadata: {
      root_ts_selected: rootTs,
      used_thread_ts: Boolean(payload.thread_ts),
      tool_call_count: toolResults.length,
      intent: normalizedPlan.intent,
      confidence_bucket: normalizedPlan.confidence >= 0.75 ? "high" : normalizedPlan.confidence >= 0.4 ? "med" : "low"
    }
  });
}

async function handleActions(env: Env, rawBody: string): Promise<Response> {
  const form = new URLSearchParams(rawBody);
  const payloadRaw = form.get("payload");
  if (!payloadRaw) {
    return new Response("Missing payload", { status: 400 });
  }

  const payload = parseJsonSafe<SlackActionPayload>(payloadRaw);
  const firstAction = payload?.actions?.[0];
  const channelId = payload?.channel?.id;
  const threadTs = payload?.container?.thread_ts ?? payload?.message?.thread_ts ?? payload?.message?.ts;

  if (!firstAction || !channelId || !threadTs) {
    return new Response("Invalid action payload", { status: 400 });
  }

  if (firstAction.action_id === "draft_reply" || firstAction.action_id === "summarize" || firstAction.action_id === "regenerate") {
    const parsed = parseJsonSafe<{ message_id?: string }>(firstAction.value ?? "") ?? {};
    if (!parsed.message_id) {
      return new Response("Missing message_id", { status: 400 });
    }

    await env.COMMS_JOBS.send({
      type: "draft_reply",
      message_id: parsed.message_id,
      slack_channel_id: channelId,
      slack_thread_ts: threadTs,
      prompt_style: firstAction.action_id === "summarize" ? "summarize" : "default"
    });

    await postThread(env, channelId, threadTs, firstAction.action_id === "summarize" ? "Summarizing..." : "Drafting...");
    return new Response(JSON.stringify({ response_type: "ephemeral", text: "Queued." }), {
      headers: { "content-type": "application/json" }
    });
  }

  if (firstAction.action_id === "send_reply") {
    await postThread(env, channelId, threadTs, "Send is disabled in draft-only mode.");
    return new Response(JSON.stringify({ response_type: "ephemeral", text: "Send disabled." }), {
      headers: { "content-type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ response_type: "ephemeral", text: "Action received." }), {
    headers: { "content-type": "application/json" }
  });
}

async function handleEvents(env: Env, rawBody: string): Promise<Response> {
  const payload = parseJsonSafe<SlackEventEnvelope>(rawBody);
  if (!payload) {
    return new Response("invalid payload", { status: 400 });
  }

  if (payload.type === "url_verification") {
    return new Response(payload.challenge ?? "", { status: 200 });
  }

  if (payload.type !== "event_callback" || !payload.event) {
    return new Response("ok", { status: 200 });
  }

  if (payload.event.type !== "app_mention") {
    return new Response("ok", { status: 200 });
  }

  if (payload.event.bot_id || payload.event.subtype === "bot_message") {
    return new Response("ok", { status: 200 });
  }

  const event = payload.event;
  const channelId = event.channel ?? "unknown";
  const rootTs = event.thread_ts ?? event.ts ?? "unknown";
  const userId = event.user ?? "unknown";
  const idemKey = payload.event_id ?? `slack_event:${channelId}:${rootTs}:${userId}`;

  const existing = await env.COMMS_DB.prepare(`SELECT key FROM idempotency_keys WHERE key = ? LIMIT 1`)
    .bind(idemKey)
    .first<{ key: string }>();
  if (existing?.key) {
    return new Response("ok", { status: 200 });
  }

  await env.COMMS_DB.prepare(
    `INSERT INTO idempotency_keys (key, status, created_ts, expires_ts)
     VALUES (?, 'processing', ?, ?)`
  )
    .bind(idemKey, nowMs(), nowMs() + 24 * 60 * 60 * 1000)
    .run();

  await handleMention(env, payload.event);

  await env.COMMS_DB.prepare(`UPDATE idempotency_keys SET status = 'done' WHERE key = ?`).bind(idemKey).run();
  return new Response("ok", { status: 200 });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/chat") {
      return handleChatApiRequest(request, env);
    }
    if (url.pathname === "/api/stream") {
      return handleStreamApiRequest(request, env);
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    const rawBody = await request.text();

    if (!(await verifySlackSignature(request, rawBody, env.SLACK_SIGNING_SECRET))) {
      return new Response("Invalid Slack signature", { status: 401 });
    }

    if (strictNoContent(env)) {
      // Ensures guard is active and not tree-shaken.
      assertNoContentPersistence({ metadata_only: true });
    }

    if (url.pathname === "/slack/actions") {
      return handleActions(env, rawBody);
    }

    if (url.pathname === "/slack/events") {
      const parsed = parseJsonSafe<SlackEventEnvelope>(rawBody);
      if (parsed?.type === "url_verification") {
        return new Response(parsed.challenge ?? "", { status: 200 });
      }
      // Ack quickly to prevent Slack retries; process event asynchronously.
      ctx.waitUntil(handleEvents(env, rawBody));
      return new Response("ok", { status: 200 });
    }

    return new Response("Not found", { status: 404 });
  }
};
