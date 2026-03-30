import { CALENDLY_URL, COHORTS, COHORT_EMAILS, FRONTDOOR_EMAIL, emitTrackingEvent } from "./connect-config.js";

const OPENING_MESSAGE =
  "Hello there! Book time right now to talk with a real person, email us at frontdoor@a2agents.com, or tell me about yourself. How can we help you achieve your goals?";
const IS_LOCAL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const URL_PARAMS = new URLSearchParams(window.location.search);
const STUB_MODE = window.A2AGENTS_STUB_CHAT === true || URL_PARAMS.get("stub") === "1";
const AUTO_STUB_FALLBACK = window.A2AGENTS_AUTO_STUB_FALLBACK === true || URL_PARAMS.get("stub_fallback") === "1";
const LOCAL_API_FALLBACK = "https://a2agents-slack-app.bennyjbergstein.workers.dev";
const API_BASE_URL = window.A2AGENTS_API_BASE_URL || (IS_LOCAL ? LOCAL_API_FALLBACK : "");

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function makeStubPayload(message, cohort) {
  const emailMatch = message.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  const nameMatch = message.match(/\b(i am|i'm|my name is)\s+([A-Za-z][A-Za-z\-']+)/i);
  const goalMatch = message.match(/(?:trying to|want to|working on)\s+(.+)/i);

  const name = nameMatch?.[2] || undefined;
  const email = emailMatch?.[0] || undefined;
  const goal = goalMatch?.[1]?.trim() || undefined;
  const handoffReady = Boolean(name && email && goal);

  return {
    reply: handoffReady
      ? `Thanks ${name}. You can email us at ${FRONTDOOR_EMAIL} or book time now.`
      : "Thanks. Share your name, best email, and what you want to do in the next 3 months.",
    cohortConfirmed: cohort,
    fieldsCaptured: {
      name,
      email,
      links: [],
      tags: ["stub_mode"]
    },
    nextPrompt: handoffReady ? null : "What’s your name, best email, and one-line goal?",
    handoff: {
      suggestedAction: handoffReady ? "email" : "none",
      email: FRONTDOOR_EMAIL,
      calendlyUrl: CALENDLY_URL
    },
    traceId: `stub-${Date.now()}`
  };
}

function getCohortFromUrl() {
  const cohort = new URLSearchParams(window.location.search).get("cohort") || "builders";
  return COHORTS.includes(cohort) ? cohort : "builders";
}

function sessionId() {
  const key = "a2agents_intake_session_id";
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }
  const next = crypto.randomUUID();
  window.localStorage.setItem(key, next);
  return next;
}

function appendMessage(list, role, text) {
  const row = document.createElement("div");
  row.className = role === "assistant" ? "self-start max-w-[92%]" : "self-end max-w-[92%] text-right";

  const bubble = document.createElement("div");
  bubble.className =
    role === "assistant"
      ? "inline-block rounded-2xl bg-secondary-50 px-4 py-3 text-secondary-900"
      : "inline-block rounded-2xl bg-primary-700/10 px-4 py-3 text-primary-900";
  bubble.textContent = text;

  row.appendChild(bubble);
  list.appendChild(row);
  list.scrollTop = list.scrollHeight;
}

function renderHandoff(container, handoff, cohort) {
  container.innerHTML = "";
  if (!handoff || handoff.suggestedAction === "none") {
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "py-1";

  const actions = document.createElement("div");
  actions.className = "flex flex-wrap items-center justify-center gap-2";

  const email = document.createElement("a");
  email.href = `mailto:${handoff.email || COHORT_EMAILS[cohort]}`;
  email.className =
    "inline-flex justify-center border border-primary-300 bg-transparent px-4 py-2 text-primary-900 hover:bg-primary-50";
  email.textContent = "Email us";
  email.addEventListener("click", () => {
    emitTrackingEvent(`click_email_${cohort}`, { source: "intake_handoff" });
  });

  const calendly = document.createElement("a");
  calendly.href = "#booking";
  calendly.className = "inline-flex justify-center rounded-md bg-primary-700 px-4 py-2 text-white hover:bg-primary-800";
  calendly.textContent = "View calendar";
  calendly.addEventListener("click", (event) => {
    event.preventDefault();
    const booking = document.getElementById("booking");
    booking?.scrollIntoView({ behavior: "smooth", block: "start" });
    emitTrackingEvent(`click_calendly_${cohort}`, { source: "intake_handoff" });
  });

  actions.append(calendly, email);
  wrap.append(actions);
  container.appendChild(wrap);
}

document.addEventListener("DOMContentLoaded", () => {
  const cohort = getCohortFromUrl();
  const sid = sessionId();

  const cohortLabel = document.getElementById("cohort-label");
  const panel = document.getElementById("chat-panel");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const list = document.getElementById("chat-messages");
  const handoff = document.getElementById("handoff-actions");
  const bookingEmbed = document.getElementById("booking-embed");
  const bookingLink = document.getElementById("booking-link");

  if (bookingEmbed) {
    bookingEmbed.setAttribute("src", CALENDLY_URL);
  }
  if (bookingLink) {
    bookingLink.setAttribute("href", CALENDLY_URL);
  }

  if (cohortLabel) {
    cohortLabel.textContent = cohort;
  }
  panel.classList.remove("hidden");
  appendMessage(list, "assistant", OPENING_MESSAGE);
  renderHandoff(
    handoff,
    {
      suggestedAction: "email",
      email: FRONTDOOR_EMAIL,
      calendlyUrl: CALENDLY_URL
    },
    cohort
  );
  input.focus();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = input.value.trim();
    if (!message) {
      return;
    }

    appendMessage(list, "user", message);
    input.value = "";

    try {
      if (STUB_MODE) {
        const stubPayload = makeStubPayload(message, cohort);
        appendMessage(
          list,
          "assistant",
          stubPayload.reply || stubPayload.nextPrompt || "Thanks. What’s the best email?"
        );
        renderHandoff(handoff, stubPayload.handoff, stubPayload.cohortConfirmed || cohort);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cohort,
          sessionId: sid,
          source: "web",
          message,
          metadata: {
            page: window.location.pathname,
            referrer: document.referrer,
            client: {
              userAgent: navigator.userAgent
            }
          }
        })
      });

      const payloadText = await response.text();
      const payload = parseJsonSafe(payloadText);
      if (!response.ok) {
        if (IS_LOCAL && AUTO_STUB_FALLBACK) {
          const fallbackPayload = makeStubPayload(message, cohort);
          appendMessage(list, "assistant", `${fallbackPayload.reply} (local stub fallback)`);
          renderHandoff(handoff, fallbackPayload.handoff, fallbackPayload.cohortConfirmed || cohort);
          return;
        }
        appendMessage(
          list,
          "assistant",
          payload?.detail
            ? `Backend error: ${payload.detail}`
            : payload?.error
              ? `I hit an error: ${payload.error}`
              : `I hit an error (${response.status}).`
        );
        return;
      }

      appendMessage(
        list,
        "assistant",
        payload?.reply || payload?.nextPrompt || "Thanks. What’s the best email?"
      );
      renderHandoff(handoff, payload?.handoff, payload?.cohortConfirmed || cohort);
    } catch (_error) {
      if (IS_LOCAL && AUTO_STUB_FALLBACK) {
        const fallbackPayload = makeStubPayload(message, cohort);
        appendMessage(list, "assistant", `${fallbackPayload.reply} (local stub fallback)`);
        renderHandoff(handoff, fallbackPayload.handoff, fallbackPayload.cohortConfirmed || cohort);
        return;
      }
      appendMessage(list, "assistant", "Network error calling /api/chat.");
    }
  });
});
