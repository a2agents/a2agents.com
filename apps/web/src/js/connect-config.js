export const COHORTS = ["builders", "mentors", "investors"];

export const COHORT_EMAILS = {
  builders: "builders@a2agents.com",
  mentors: "mentors@a2agents.com",
  investors: "investors@a2agents.com"
};

// Replace with Kevin's canonical Calendly URL when available.
export const CALENDLY_URL = "https://calendar.app.google/hEthvkLHVEHGzByz9";
export const FRONTDOOR_EMAIL = "frontdoor@a2agents.com";

export function intakeUrlFor(cohort) {
  return `/intake?cohort=${encodeURIComponent(cohort)}`;
}

export function emitTrackingEvent(eventName, payload = {}) {
  const detail = {
    event: eventName,
    timestamp: Date.now(),
    ...payload
  };

  window.dispatchEvent(new CustomEvent("a2agents:track", { detail }));

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push({ event: eventName, ...payload });
  }

  if (typeof window.plausible === "function") {
    window.plausible(eventName, { props: payload });
  }

  console.info("[track]", eventName, payload);
}
