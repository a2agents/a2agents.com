import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";

export type Cohort = "builders" | "mentors" | "investors";

export interface ChatApiEnv {
  COMMS_DB: D1Database;
  OPENAI_API_KEY?: string;
  OPENAI_API_KEY_SECRET?: { get(): Promise<string> };
  OPENAI_MODEL?: string;
  INTAKE_CALENDLY_URL?: string;
  INTAKE_TWO_STAGE_ENABLED?: string;
}

type ChatRequestBody = {
  cohort: Cohort;
  sessionId: string;
  source: "web" | string;
  message: string;
  metadata?: {
    utm?: Record<string, unknown>;
    referrer?: string;
    page?: string;
    client?: Record<string, unknown>;
  };
};

type CapturedFields = {
  name?: string;
  email?: string;
  city?: string;
  goal?: string;
  links: string[];
  tags: string[];
};

type HistoryMessage = {
  role: "user" | "assistant";
  text: string;
  ts: number;
};

type HostSignals = {
  builder: number;
  mentor: number;
  investor: number;
};

type HostOutput = {
  reply: string;
  signals: HostSignals;
  shouldAskContact: boolean;
  shouldOfferBooking: boolean;
};

type IntakeSessionRow = {
  session_id: string;
  cohort_confirmed: Cohort;
  fields_json: string;
  updated_ts: number;
};

type IntakeExtraction = {
  reply?: string;
  name?: string;
  email?: string;
  city?: string;
  goal?: string;
  links?: string[];
  tags?: string[];
  wantsBooking?: boolean;
  wantsAsync?: boolean;
  cohortSuggestion?: Cohort | "mixed";
  cohortConfidence?: number;
};

type IntakeSessionState = {
  fields: CapturedFields;
  history: HistoryMessage[];
};

type ChatResponseBody = {
  reply: string;
  cohortConfirmed: Cohort;
  fieldsCaptured: {
    name?: string;
    email?: string;
    city?: string;
    links: string[];
    tags: string[];
  };
  nextPrompt: string | null;
  handoff: {
    suggestedAction: "email" | "calendly" | "none";
    email: string;
    calendlyUrl: string;
  };
  traceId?: string;
};

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type"
};

const DEFAULT_CALENDLY_URL = "https://calendar.app.google/hEthvkLHVEHGzByz9";

const COHORT_EMAILS: Record<Cohort, string> = {
  builders: "builders@a2agents.com",
  mentors: "mentors@a2agents.com",
  investors: "investors@a2agents.com"
};

const CONVERSATIONAL_HOST_PROMPT = `You are the front-door conversational host for a2agents.

Your job is to understand who the visitor is and what they are trying to do without making the interaction feel like a form or recruiter intake.

You are warm, concise, and perceptive.
You ask one question at a time.
You never sound like a corporate chatbot.

Primary objectives:

Determine what brought them here

Infer whether they are primarily:

a builder

a mentor

an investor

or mixed

Gather context naturally

Only move toward booking/contact after real alignment

Tone rules:

Short responses (1–2 sentences)

No scripts

No “please provide”

No intake-form language

No multiple questions at once

Mirror user vocabulary when possible

Conversation method:

Start with a simple orientation question

Reflect what they say

Ask one light follow-up

Infer role signals

Gently deepen

Offer next step only when appropriate

Never ask for name/email immediately.
Only ask after intent is clear.

If user gives minimal input:
Offer 2–3 options casually:
“Are you building something, investing, or just exploring?”

If user says “you tell me”:
Respond with lightweight framing:
“We usually help builders, mentors, and investors.
Where do you fit these days?”

If user is clearly builder:
Ask stage or bottleneck.

If mentor:
Ask what kinds of people/projects they help.

If investor:
Ask what they’re interested in backing.

Always end each message with at most one question.

Keep responses under 25 words.

Output format from conversational host

Codex: make this agent return:

{
  "reply": "string",
  "signals": {
    "builder": 0-1,
    "mentor": 0-1,
    "investor": 0-1
  },
  "shouldAskContact": true|false,
  "shouldOfferBooking": true|false
}


This is INTERNAL ONLY.
User never sees signals.`;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...CORS_HEADERS
    }
  });
}

function parseJsonSafe<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function coerceCohort(value: unknown): Cohort | null {
  if (value === "builders" || value === "mentors" || value === "investors") {
    return value;
  }
  return null;
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function escapeTemplateBraces(text: string): string {
  return text.replaceAll("{", "{{").replaceAll("}", "}}");
}

function boolFromEnv(value: string | undefined, fallback: boolean): boolean {
  if (value == null) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function twoStageEnabled(env: ChatApiEnv): boolean {
  return boolFromEnv(env.INTAKE_TWO_STAGE_ENABLED, true);
}

function normalizeLinks(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0)
    .slice(0, 4);
}

function mergeFields(current: CapturedFields, incoming: IntakeExtraction): CapturedFields {
  const incomingName = normalizeText(incoming.name);
  const incomingEmail = normalizeText(incoming.email);
  const incomingCity = normalizeText(incoming.city);
  const incomingGoal = normalizeText(incoming.goal);
  return {
    name: (current.name ?? incomingName) || undefined,
    email: (current.email ?? incomingEmail) || undefined,
    city: (current.city ?? incomingCity) || undefined,
    goal: (current.goal ?? incomingGoal) || undefined,
    links: Array.from(new Set([...current.links, ...normalizeLinks(incoming.links)])).slice(0, 4),
    tags: Array.from(new Set([...(current.tags ?? []), ...(incoming.tags ?? [])])).slice(0, 8)
  };
}

function nextPromptFor(fields: CapturedFields, askedBooking: boolean, asksContact: boolean): string | null {
  if (!fields.city) {
    return "Where are you based (city)?";
  }
  if (!fields.goal) {
    return "In one sentence: what are you trying to do in the next 3 months?";
  }
  if (!hasProfileBucketSignal(fields)) {
    return "Quick routing question: which best describes you right now - builder, mentor, or investor?";
  }
  if (!hasConnectionIntentSignal(fields)) {
    return "Who do you most want to connect with right now: builders, mentors, investors, or mixed?";
  }
  if (!asksContact) {
    return null;
  }
  if (!fields.name) {
    return "What should I call you?";
  }
  if (!fields.email) {
    return "What’s the best email to follow up?";
  }
  if (fields.links.length === 0) {
    return "Link to LinkedIn, website, or GitHub? (optional)";
  }
  if (!askedBooking) {
    return "Do you want to book time with Kevin or keep it async over email?";
  }
  return null;
}

function hasMinimumForHandoff(fields: CapturedFields): boolean {
  return Boolean(fields.name && fields.email && fields.goal);
}

function hasTagMatch(tags: string[], pattern: RegExp): boolean {
  return tags.some((tag) => pattern.test(tag));
}

function goalText(fields: CapturedFields): string {
  return (fields.goal ?? "").toLowerCase();
}

function hasProfileBucketSignal(fields: CapturedFields): boolean {
  const tags = fields.tags ?? [];
  if (hasTagMatch(tags, /\b(profile|role)_(builder|mentor|investor)s?\b/)) {
    return true;
  }
  const goal = goalText(fields);
  return /\b(builder|founder|startup|mentor|advisor|coach|investor|vc|angel)\b/.test(goal);
}

function hasConnectionIntentSignal(fields: CapturedFields): boolean {
  const tags = fields.tags ?? [];
  if (hasTagMatch(tags, /\b(connect|wants|target)_(builders?|mentors?|investors?|mixed)\b/)) {
    return true;
  }
  const goal = goalText(fields);
  return /\b(connect|meet|intro|introduce|network)\b/.test(goal);
}

function shouldRequireMoreBucketing(fields: CapturedFields, extraction: IntakeExtraction): boolean {
  if (!hasMinimumForHandoff(fields)) {
    return false;
  }
  if (extraction.wantsBooking || extraction.wantsAsync) {
    return false;
  }
  const confidence = extraction.cohortConfidence ?? 0;
  if (confidence >= 0.85 && hasProfileBucketSignal(fields)) {
    return false;
  }
  return !hasProfileBucketSignal(fields) || !hasConnectionIntentSignal(fields) || confidence < 0.7;
}

function extractJsonObject(raw: string): string {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return raw.slice(start, end + 1);
  }
  return raw;
}

function inferCohortByHeuristic(message: string): { cohort: Cohort | "mixed"; confidence: number } | null {
  const text = message.toLowerCase();
  if (/\b(investor|angel|vc|venture|capital allocation|fund manager|limited partner|lp)\b/.test(text)) {
    return { cohort: "investors", confidence: 0.92 };
  }
  if (/\b(mentor|coach|advisor|adviser|advisory|guide founders|operating partner)\b/.test(text)) {
    return { cohort: "mentors", confidence: 0.9 };
  }
  if (/\b(builder|founder|building|startup|developer|engineer|shipping product)\b/.test(text)) {
    return { cohort: "builders", confidence: 0.9 };
  }
  if (/\b(builder|mentor|investor)\b/.test(text) && /\b(and|both|mix|mixed)\b/.test(text)) {
    return { cohort: "mixed", confidence: 0.7 };
  }
  return null;
}

function normalizeSignals(signals: Partial<HostSignals> | undefined): HostSignals {
  const clamp = (value: unknown): number => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(1, n));
  };
  return {
    builder: clamp(signals?.builder),
    mentor: clamp(signals?.mentor),
    investor: clamp(signals?.investor)
  };
}

export function inferCohortSuggestionFromSignals(signals: HostSignals): Cohort | "mixed" | null {
  const active = ([
    ["builders", signals.builder],
    ["mentors", signals.mentor],
    ["investors", signals.investor]
  ] as const).filter((entry) => entry[1] > 0.5);

  if (active.length > 1) {
    return "mixed";
  }
  if (signals.builder > 0.6) return "builders";
  if (signals.mentor > 0.6) return "mentors";
  if (signals.investor > 0.6) return "investors";
  return null;
}

function cohortConfidenceFromSignals(signals: HostSignals): number {
  return Math.max(signals.builder, signals.mentor, signals.investor);
}

function signalTags(signals: HostSignals): string[] {
  const tags: string[] = [];
  if (signals.builder > 0.5) tags.push("profile_builder");
  if (signals.mentor > 0.5) tags.push("profile_mentor");
  if (signals.investor > 0.5) tags.push("profile_investor");
  return tags;
}

function shouldReassignCohort(
  defaultCohort: Cohort,
  extraction: IntakeExtraction,
  message: string,
  signals: HostSignals
): Cohort {
  const derivedSuggestion = inferCohortSuggestionFromSignals(signals);
  const suggested = coerceCohort(extraction.cohortSuggestion ?? derivedSuggestion);
  const confidence = Math.max(extraction.cohortConfidence ?? 0, cohortConfidenceFromSignals(signals));
  if (suggested && suggested !== defaultCohort && confidence >= 0.85) {
    return suggested;
  }
  const heuristic = inferCohortByHeuristic(message);
  if (heuristic && heuristic.cohort !== "mixed" && heuristic.cohort !== defaultCohort && heuristic.confidence >= 0.9) {
    return heuristic.cohort;
  }
  if (suggested && suggested !== defaultCohort && confidence >= 0.85) {
    return suggested;
  }
  return defaultCohort;
}

async function getOpenAIKey(env: ChatApiEnv): Promise<string> {
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

async function openAIResponses(env: ChatApiEnv, input: unknown): Promise<string> {
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

async function ensureIntakeTable(env: ChatApiEnv): Promise<void> {
  await env.COMMS_DB.prepare(
    `CREATE TABLE IF NOT EXISTS intake_sessions (
      session_id TEXT PRIMARY KEY,
      cohort_confirmed TEXT NOT NULL,
      fields_json TEXT NOT NULL,
      updated_ts INTEGER NOT NULL
    )`
  ).run();
}

async function loadSession(env: ChatApiEnv, sessionId: string): Promise<{ cohortConfirmed: Cohort; state: IntakeSessionState }> {
  const row = await env.COMMS_DB.prepare(
    `SELECT session_id, cohort_confirmed, fields_json, updated_ts
     FROM intake_sessions
     WHERE session_id = ?
     LIMIT 1`
  )
    .bind(sessionId)
    .first<IntakeSessionRow>();

  const fallbackState: IntakeSessionState = { fields: { links: [], tags: [] }, history: [] };
  if (!row) {
    return { cohortConfirmed: "builders", state: fallbackState };
  }

  const parsedState = parseJsonSafe<IntakeSessionState>(row.fields_json);
  const parsedFieldsLegacy = parseJsonSafe<CapturedFields>(row.fields_json);
  const parsed = parsedState
    ? parsedState
    : {
        fields: parsedFieldsLegacy ?? fallbackState.fields,
        history: []
      };
  return {
    cohortConfirmed: coerceCohort(row.cohort_confirmed) ?? "builders",
    state: {
      fields: {
        name: parsed.fields?.name,
        email: parsed.fields?.email,
        city: parsed.fields?.city,
        goal: parsed.fields?.goal,
        links: Array.isArray(parsed.fields?.links) ? parsed.fields.links : [],
        tags: Array.isArray(parsed.fields?.tags) ? parsed.fields.tags : []
      },
      history: (Array.isArray(parsed.history)
        ? parsed.history
            .map((item) => ({
              role: (item?.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
              text: normalizeText(item?.text),
              ts: Number(item?.ts) || Date.now()
            }))
            .filter((item) => item.text.length > 0)
            .slice(-20)
        : []) as HistoryMessage[]
    }
  };
}

async function saveSession(env: ChatApiEnv, sessionId: string, cohortConfirmed: Cohort, state: IntakeSessionState): Promise<void> {
  await env.COMMS_DB.prepare(
    `INSERT INTO intake_sessions (session_id, cohort_confirmed, fields_json, updated_ts)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(session_id)
     DO UPDATE SET
       cohort_confirmed = excluded.cohort_confirmed,
       fields_json = excluded.fields_json,
       updated_ts = excluded.updated_ts`
  )
    .bind(sessionId, cohortConfirmed, JSON.stringify(state), Date.now())
    .run();
}

async function runConversationalHostChain(
  env: ChatApiEnv,
  input: { cohort: Cohort; message: string; fields: CapturedFields; history: HistoryMessage[]; page: string; source: string }
): Promise<HostOutput> {
  const hostPrompt = PromptTemplate.fromTemplate(
    [
      escapeTemplateBraces(CONVERSATIONAL_HOST_PROMPT),
      "",
      "Context:",
      "Default cohort: {cohort}",
      "Source: {source}",
      "Page: {page}",
      "Known fields: {known_fields}",
      "Conversation history: {history}",
      "Latest user message: {message}"
    ].join("\n")
  );

  const chain = RunnableSequence.from([
    RunnableLambda.from(async (values: Record<string, string>) => hostPrompt.format(values)),
    RunnableLambda.from(async (promptText: string) => {
      return openAIResponses(env, [
        {
          role: "system",
          content: "Return only valid JSON with keys reply, signals, shouldAskContact, shouldOfferBooking."
        },
        {
          role: "user",
          content: promptText
        }
      ]);
    }),
    RunnableLambda.from((raw: string) => parseJsonSafe<HostOutput>(extractJsonObject(raw)))
  ]);

  const fallback: HostOutput = {
    reply: "What brought you here?",
    signals: { builder: 0.34, mentor: 0.33, investor: 0.33 },
    shouldAskContact: false,
    shouldOfferBooking: false
  };

  const output = (await chain.invoke({
    cohort: input.cohort,
    source: input.source,
    page: input.page,
    known_fields: JSON.stringify(input.fields),
    history: JSON.stringify(input.history.slice(-12)),
    message: input.message
  })) as HostOutput | null;

  return {
    reply: normalizeText(output?.reply) || fallback.reply,
    signals: normalizeSignals(output?.signals),
    shouldAskContact: Boolean(output?.shouldAskContact),
    shouldOfferBooking: Boolean(output?.shouldOfferBooking)
  };
}

async function runIntakeExtractionChain(
  env: ChatApiEnv,
  input: {
    cohort: Cohort;
    message: string;
    fields: CapturedFields;
    history: HistoryMessage[];
    assistantReply: string;
    signals: HostSignals;
    page: string;
    source: string;
  }
): Promise<IntakeExtraction> {
  const extractionPrompt = PromptTemplate.fromTemplate(
    [
      "You are an intake assistant for a2agents.",
      "Goal: capture contact basics quickly and route to human follow-up.",
      "Do not over-chat. Keep responses short.",
      "Default cohort: {cohort}",
      "Source: {source}",
      "Page: {page}",
      "Known fields JSON: {known_fields}",
      "Conversation history: {history}",
      "Latest user message: {message}",
      "Assistant reply: {assistant_reply}",
      "Signals: {signals}",
      "",
      "Return STRICT JSON with this shape and no markdown:",
      "{{",
      '  "reply": "string",',
      '  "name": "string|null",',
      '  "email": "string|null",',
      '  "city": "string|null",',
      '  "goal": "string|null",',
      '  "links": ["string"],',
      '  "tags": ["string"],',
      '  "wantsBooking": true,',
      '  "wantsAsync": false,',
      '  "cohortSuggestion": "builders|mentors|investors|mixed|null",',
      '  "cohortConfidence": 0.0',
      "}}",
      "",
      "Rules:",
      "- Extract only what user actually provided.",
      "- For name/email/city/goal: null if unknown.",
      "- wantsBooking true only if user indicates scheduling/booking/call now.",
      "- wantsAsync true only if user explicitly prefers email/async.",
      "- cohortSuggestion should only differ from default cohort if user clearly indicates a different fit.",
      "- cohortConfidence between 0 and 1.",
      "- tags should include normalized routing tags when available:",
      "  - profile_builder | profile_mentor | profile_investor",
      "  - target_builders | target_mentors | target_investors | target_mixed",
      "  - interest_fitness | interest_startup | interest_relationships (if explicitly stated)",
      "- reply must be ≤ 25 words.",
      "- reply may be 1–2 sentences.",
      "- reply must include at most one question.",
      "- cohortSuggestion rules:",
      "  - IF signals.builder > 0.6 -> builders",
      "  - IF signals.mentor > 0.6 -> mentors",
      "  - IF signals.investor > 0.6 -> investors",
      "  - IF multiple signals > 0.5 -> mixed",
      "- cohortConfidence = max signal value.",
      "- wantsBooking true if latest user message asks for a call OR assistant suggests booking.",
      "- wantsAsync true if user asks for follow-up OR contact is needed without booking."
    ].join("\n")
  );

  const chain = RunnableSequence.from([
    RunnableLambda.from(async (values: Record<string, string>) => extractionPrompt.format(values)),
    RunnableLambda.from(async (promptText: string) => {
      return openAIResponses(env, [
        {
          role: "system",
          content: "You are a strict JSON extraction assistant. Return only JSON."
        },
        {
          role: "user",
          content: promptText
        }
      ]);
    }),
    RunnableLambda.from((raw: string) => {
      const parsed = parseJsonSafe<IntakeExtraction>(extractJsonObject(raw));
      return parsed ?? {};
    })
  ]);

  return chain.invoke({
    cohort: input.cohort,
    source: input.source,
    page: input.page,
    known_fields: JSON.stringify(input.fields),
    history: JSON.stringify(input.history.slice(-12)),
    message: input.message,
    assistant_reply: input.assistantReply,
    signals: JSON.stringify(input.signals)
  });
}

function deterministicFallbackReply(nextPrompt: string | null, hasHandoff: boolean): string {
  if (nextPrompt) {
    return nextPrompt;
  }
  if (hasHandoff) {
    return "Thanks. You can book time with Kevin or continue async over email.";
  }
  return "Thanks. Tell me a bit more so I can route this well.";
}

function normalizeEmail(email: string | undefined): string | undefined {
  if (!email) {
    return undefined;
  }
  const clean = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) ? clean : undefined;
}

function stripEmpty(value: string | undefined): string | undefined {
  const clean = (value ?? "").trim();
  return clean.length > 0 ? clean : undefined;
}

function normalizeExtraction(extraction: IntakeExtraction): IntakeExtraction {
  return {
    ...extraction,
    name: stripEmpty(extraction.name),
    email: normalizeEmail(extraction.email),
    city: stripEmpty(extraction.city),
    goal: stripEmpty(extraction.goal),
    links: normalizeLinks(extraction.links),
    tags: Array.isArray(extraction.tags)
      ? extraction.tags
          .map((tag) => (typeof tag === "string" ? tag.trim().toLowerCase() : ""))
          .filter(Boolean)
      : []
  };
}

function hasExplicitBookingIntent(message: string): boolean {
  return /\b(book|booking|schedule|calendar|call|time block|time slot|meet)\b/i.test(message);
}

function hasExplicitAsyncIntent(message: string): boolean {
  return /\b(async|email|over email|by email)\b/i.test(message);
}

function asksNextSteps(message: string): boolean {
  return /\b(next step|next steps|what now|how do we proceed|what should i do next)\b/i.test(message);
}

function turnCount(history: HistoryMessage[]): number {
  return history.filter((m) => m.role === "user").length;
}

function strongAlignment(signals: HostSignals): boolean {
  const max = cohortConfidenceFromSignals(signals);
  return max >= 0.75;
}

export function shouldAskContactNow(args: {
  host: HostOutput;
  message: string;
  history: HistoryMessage[];
  signals: HostSignals;
}): boolean {
  if (hasExplicitBookingIntent(args.message) || asksNextSteps(args.message)) {
    return true;
  }
  if (turnCount(args.history) <= 2) {
    return false;
  }
  return args.host.shouldAskContact || strongAlignment(args.signals);
}

function buildReply(params: {
  extractionReply: string | undefined;
  nextPrompt: string | null;
  hasHandoff: boolean;
  handoffEmail: string;
  calendlyUrl: string;
}): string {
  const base = stripEmpty(params.extractionReply);
  if (params.hasHandoff && !params.nextPrompt) {
    if (base) {
      return `${base} You can reach us at ${params.handoffEmail} or book time: ${params.calendlyUrl}`;
    }
    return `You can reach us at ${params.handoffEmail} or book time: ${params.calendlyUrl}`;
  }
  if (base && params.nextPrompt && !base.includes("?")) {
    return `${base} ${params.nextPrompt}`;
  }
  return base ?? deterministicFallbackReply(params.nextPrompt, params.hasHandoff);
}

function validateChatRequest(input: unknown): { ok: true; value: ChatRequestBody } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Body must be a JSON object" };
  }

  const body = input as Record<string, unknown>;
  const cohort = coerceCohort(body.cohort);
  const sessionId = normalizeText(body.sessionId);
  const message = normalizeText(body.message);
  const source = normalizeText(body.source) || "web";

  if (!cohort) {
    return { ok: false, error: "cohort must be builders|mentors|investors" };
  }
  if (!sessionId) {
    return { ok: false, error: "sessionId is required" };
  }
  if (!message) {
    return { ok: false, error: "message is required" };
  }

  return {
    ok: true,
    value: {
      cohort,
      sessionId,
      source,
      message,
      metadata: typeof body.metadata === "object" && body.metadata ? (body.metadata as ChatRequestBody["metadata"]) : {}
    }
  };
}

async function handleChatLogic(requestBody: ChatRequestBody, env: ChatApiEnv): Promise<ChatResponseBody> {
  await ensureIntakeTable(env);

  const prior = await loadSession(env, requestBody.sessionId);
  const defaultCohort = prior.cohortConfirmed ?? requestBody.cohort;
  const now = Date.now();
  const incomingHistory: HistoryMessage[] = [
    ...prior.state.history,
    { role: "user" as const, text: requestBody.message, ts: now }
  ].slice(-20);

  const hostOutput: HostOutput = twoStageEnabled(env)
    ? await runConversationalHostChain(env, {
        cohort: defaultCohort,
        message: requestBody.message,
        fields: prior.state.fields,
        history: incomingHistory,
        page: requestBody.metadata?.page ?? "",
        source: requestBody.source
      })
    : {
        reply: "What brought you here?",
        signals: normalizeSignals(undefined),
        shouldAskContact: false,
        shouldOfferBooking: false
      };

  const extraction = normalizeExtraction(
    await runIntakeExtractionChain(env, {
      cohort: defaultCohort,
      message: requestBody.message,
      fields: prior.state.fields,
      history: incomingHistory,
      assistantReply: hostOutput.reply,
      signals: hostOutput.signals,
      page: requestBody.metadata?.page ?? "",
      source: requestBody.source
    })
  );
  extraction.tags = Array.from(new Set([...(extraction.tags ?? []), ...signalTags(hostOutput.signals)])).slice(0, 8);
  extraction.cohortSuggestion = extraction.cohortSuggestion ?? inferCohortSuggestionFromSignals(hostOutput.signals) ?? undefined;
  extraction.cohortConfidence = Math.max(extraction.cohortConfidence ?? 0, cohortConfidenceFromSignals(hostOutput.signals));

  const mergedFields = mergeFields(prior.state.fields, extraction);
  const cohortConfirmed = shouldReassignCohort(defaultCohort, extraction, requestBody.message, hostOutput.signals);

  const requireMoreBucketing = shouldRequireMoreBucketing(mergedFields, extraction);
  const asksContact = shouldAskContactNow({
    host: hostOutput,
    message: requestBody.message,
    history: incomingHistory,
    signals: hostOutput.signals
  });
  const wantsBooking = hasExplicitBookingIntent(requestBody.message) || hostOutput.shouldOfferBooking;
  const wantsAsync =
    hasExplicitAsyncIntent(requestBody.message) || (asksContact && !wantsBooking) || Boolean(extraction.wantsAsync);
  const handoffReady = (hasMinimumForHandoff(mergedFields) || wantsBooking) && !requireMoreBucketing && asksContact;
  const askedBooking = Boolean(wantsBooking || wantsAsync);
  const nextPrompt = handoffReady ? null : nextPromptFor(mergedFields, askedBooking, asksContact);

  const assistantReply = normalizeText(hostOutput.reply) || buildReply({
    extractionReply: extraction.reply,
    nextPrompt,
    hasHandoff: handoffReady,
    handoffEmail: COHORT_EMAILS[cohortConfirmed],
    calendlyUrl: env.INTAKE_CALENDLY_URL ?? DEFAULT_CALENDLY_URL
  });

  const updatedState: IntakeSessionState = {
    fields: mergedFields,
    history: [...incomingHistory, { role: "assistant" as const, text: assistantReply, ts: Date.now() }].slice(-20)
  };

  await saveSession(env, requestBody.sessionId, cohortConfirmed, updatedState);

  const email = COHORT_EMAILS[cohortConfirmed];
  const calendlyUrl = env.INTAKE_CALENDLY_URL ?? DEFAULT_CALENDLY_URL;

  const suggestedAction: "email" | "calendly" | "none" = !handoffReady
    ? "none"
    : wantsBooking
      ? "calendly"
      : wantsAsync
        ? "email"
        : "email";

  const traceId = crypto.randomUUID();

  return {
    reply: assistantReply,
    cohortConfirmed,
    fieldsCaptured: {
      name: mergedFields.name,
      email: mergedFields.email,
      city: mergedFields.city,
      links: mergedFields.links,
      tags: mergedFields.tags
    },
    nextPrompt,
    handoff: {
      suggestedAction,
      email,
      calendlyUrl
    },
    traceId
  };
}

export async function handleChatApiRequest(request: Request, env: ChatApiEnv): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const json = parseJsonSafe<unknown>(await request.text());
  const validated = validateChatRequest(json);
  if (!validated.ok) {
    return jsonResponse({ error: validated.error }, 400);
  }

  try {
    const payload = await handleChatLogic(validated.value, env);
    return jsonResponse(payload, 200);
  } catch (error) {
    return jsonResponse(
      {
        error: "chat_runtime_error",
        detail: error instanceof Error ? error.message : String(error)
      },
      500
    );
  }
}

export async function handleStreamApiRequest(request: Request, env: ChatApiEnv): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (request.method !== "POST" && request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let json: unknown;
  if (request.method === "GET") {
    const url = new URL(request.url);
    json = {
      cohort: url.searchParams.get("cohort"),
      sessionId: url.searchParams.get("sessionId"),
      source: url.searchParams.get("source") ?? "web",
      message: url.searchParams.get("message"),
      metadata: {
        page: url.searchParams.get("page") ?? ""
      }
    };
  } else {
    json = parseJsonSafe<unknown>(await request.text());
  }

  const validated = validateChatRequest(json);
  if (!validated.ok) {
    return jsonResponse({ error: validated.error }, 400);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      void (async () => {
        try {
          const payload = await handleChatLogic(validated.value, env);
          controller.enqueue(encoder.encode(`event: message\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          controller.enqueue(encoder.encode("event: done\n"));
          controller.enqueue(encoder.encode("data: {}\n\n"));
        } catch (error) {
          controller.enqueue(encoder.encode("event: error\n"));
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: error instanceof Error ? error.message : String(error) })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      })();
    }
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      ...CORS_HEADERS
    }
  });
}
