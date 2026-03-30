import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { inferCohortSuggestionFromSignals, shouldAskContactNow } from "../src/chat_api.ts";

test("conversational host prompt file exists with required framing", () => {
  const promptPath = path.resolve(process.cwd(), "src/prompts/intake_conversational_host.prompt");
  const prompt = fs.readFileSync(promptPath, "utf8");
  assert.match(prompt, /front-door conversational host/i);
  assert.match(prompt, /never ask for name\/email immediately/i);
  assert.match(prompt, /Keep responses under 25 words\./i);
});

test("builder transcript: no early contact ask, builder inferred", () => {
  const suggestion = inferCohortSuggestionFromSignals({ builder: 0.78, mentor: 0.12, investor: 0.1 });
  assert.equal(suggestion, "builders");

  const shouldAsk = shouldAskContactNow({
    host: {
      reply: "What stage are you at right now?",
      signals: { builder: 0.78, mentor: 0.12, investor: 0.1 },
      shouldAskContact: false,
      shouldOfferBooking: false
    },
    message: "building an AI scheduling app",
    history: [
      { role: "user", text: "hey", ts: Date.now() - 1000 },
      { role: "assistant", text: "What are you working on right now?", ts: Date.now() - 900 }
    ],
    signals: { builder: 0.78, mentor: 0.12, investor: 0.1 }
  });

  assert.equal(shouldAsk, false);
});

test("investor transcript: investor inferred without booking push", () => {
  const suggestion = inferCohortSuggestionFromSignals({ builder: 0.08, mentor: 0.14, investor: 0.81 });
  assert.equal(suggestion, "investors");

  const shouldAsk = shouldAskContactNow({
    host: {
      reply: "What kinds of teams are you most interested in backing?",
      signals: { builder: 0.08, mentor: 0.14, investor: 0.81 },
      shouldAskContact: false,
      shouldOfferBooking: false
    },
    message: "I invest in early stage tools",
    history: [{ role: "user", text: "I invest in early stage tools", ts: Date.now() }],
    signals: { builder: 0.08, mentor: 0.14, investor: 0.81 }
  });

  assert.equal(shouldAsk, false);
});

test("you tell me transcript: single lightweight framing question path", () => {
  const shouldAsk = shouldAskContactNow({
    host: {
      reply: "We usually help builders, mentors, and investors. Where do you fit these days?",
      signals: { builder: 0.33, mentor: 0.33, investor: 0.34 },
      shouldAskContact: false,
      shouldOfferBooking: false
    },
    message: "you tell me",
    history: [{ role: "user", text: "you tell me", ts: Date.now() }],
    signals: { builder: 0.33, mentor: 0.33, investor: 0.34 }
  });
  assert.equal(shouldAsk, false);
});

test("direct booking transcript: booking intent triggers contact path", () => {
  const shouldAsk = shouldAskContactNow({
    host: {
      reply: "Yes - want me to send a calendar link?",
      signals: { builder: 0.51, mentor: 0.1, investor: 0.1 },
      shouldAskContact: true,
      shouldOfferBooking: true
    },
    message: "can I book a call?",
    history: [{ role: "user", text: "can I book a call?", ts: Date.now() }],
    signals: { builder: 0.51, mentor: 0.1, investor: 0.1 }
  });
  assert.equal(shouldAsk, true);
});
