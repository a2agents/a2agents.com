import { CALENDLY_URL, COHORT_EMAILS, COHORTS, emitTrackingEvent, intakeUrlFor } from "./connect-config.js";

function assertCohort(value) {
  return COHORTS.includes(value) ? value : "builders";
}

function buttonClass(primary = false) {
  if (primary) {
    return "inline-flex items-center justify-center rounded-lg px-4 py-3 bg-primary-700 text-white hover:bg-primary-800 transition-colors";
  }
  return "inline-flex items-center justify-center rounded-lg px-4 py-3 border border-primary-300 text-primary-900 hover:bg-primary-50 transition-colors";
}

function trackName(action, cohort) {
  return `click_${action}_${cohort}`;
}

function transitionToUrl(href) {
  if (typeof document.startViewTransition === "function") {
    document.startViewTransition(() => {
      window.location.assign(href);
    });
    return;
  }

  document.body.classList.add("page-transition-out");
  window.setTimeout(() => {
    window.location.assign(href);
  }, 160);
}

function createButton({ label, href, action, cohort, primary }) {
  const a = document.createElement("a");
  a.href = href;
  a.className = buttonClass(primary);
  a.textContent = label;
  a.addEventListener("click", (event) => {
    emitTrackingEvent(trackName(action, cohort), {
      cohort,
      href,
      action
    });
    if (action === "chat") {
      event.preventDefault();
      transitionToUrl(href);
    }
  });
  return a;
}

function renderConnectModule(node) {
  const cohort = assertCohort(node.dataset.cohort || "builders");
  const emailAddress = node.dataset.emailAddress || COHORT_EMAILS[cohort];
  const calendlyUrl = node.dataset.calendlyUrl || CALENDLY_URL;
  const intakeUrl = node.dataset.intakeUrl || intakeUrlFor(cohort);

  node.className = "rounded-2xl border border-secondary-200 bg-white/90 p-5 md:p-6 shadow-warm";
  node.innerHTML = "";

  const title = document.createElement("h3");
  title.className = "text-xl font-semibold text-primary-900";
  title.textContent = "Connect";

  const actions = document.createElement("div");
  actions.className = "mt-4 grid gap-3 sm:grid-cols-3";
  actions.append(
    createButton({
      label: "Email",
      href: `mailto:${emailAddress}`,
      action: "email",
      cohort,
      primary: false
    }),
    createButton({
      label: "Book time",
      href: calendlyUrl,
      action: "calendly",
      cohort,
      primary: true
    }),
    createButton({
      label: "Tell us about yourself",
      href: intakeUrl,
      action: "chat",
      cohort,
      primary: false
    })
  );

  const copy = document.createElement("p");
  copy.className = "mt-4 text-sm text-secondary-700";
  copy.textContent = "Fastest: book time. Async: email. Not sure where you fit: chat.";

  node.append(title, actions, copy);
}

document.addEventListener("DOMContentLoaded", () => {
  const modules = document.querySelectorAll("[data-connect-module]");
  modules.forEach((node) => renderConnectModule(node));
});
