import test from "node:test";
import assert from "node:assert/strict";

import { buildStateQueryReply, detectStateQuery, resolveEffectivePurpose } from "../src/index.ts";

test("detectStateQuery identifies supported factual queries", () => {
  assert.equal(detectStateQuery("what is this channel's purpose?"), "purpose");
  assert.equal(detectStateQuery("what is this channel's name?"), "name");
  assert.equal(detectStateQuery("what is this channel's topic?"), "topic");
  assert.equal(detectStateQuery("is this channel set up?"), "setup");
  assert.equal(detectStateQuery("help me draft a response"), "none");
});

test("resolveEffectivePurpose prefers Slack purpose over policy", () => {
  const out = resolveEffectivePurpose("Slack purpose", "Policy purpose");
  assert.equal(out.source, "slack_purpose");
  assert.equal(out.value, "Slack purpose");
  assert.equal(out.mismatch, true);
});

test("resolveEffectivePurpose falls back to policy when Slack purpose missing", () => {
  const out = resolveEffectivePurpose("", "Policy purpose");
  assert.equal(out.source, "policy_purpose");
  assert.equal(out.value, "Policy purpose");
  assert.equal(out.mismatch, false);
});

test("buildStateQueryReply(name) returns deterministic channel name", () => {
  const reply = buildStateQueryReply({
    query: "name",
    channelId: "C123",
    channelName: "project-website",
    channelTopic: null,
    channelPurpose: null,
    policyPurpose: null
  });
  assert.match(reply, /This channel is #project-website/);
});

test("buildStateQueryReply(purpose) reports mismatch and canonical source", () => {
  const reply = buildStateQueryReply({
    query: "purpose",
    channelId: "C123",
    channelName: "project-website",
    channelTopic: null,
    channelPurpose: "Use this channel for website feedback.",
    policyPurpose: "Track all product updates."
  });
  assert.match(reply, /This channel’s purpose is:/);
  assert.match(reply, /Slack purpose and policy purpose differ/);
});

test("buildStateQueryReply(setup) reports missing fields", () => {
  const reply = buildStateQueryReply({
    query: "setup",
    channelId: "C123",
    channelName: "project-website",
    channelTopic: "",
    channelPurpose: "",
    policyPurpose: ""
  });
  assert.match(reply, /partially set up/);
  assert.match(reply, /Missing: topic, purpose/);
});
