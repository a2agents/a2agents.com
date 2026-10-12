# Domain / DNS / TLS Working Notes — a2agents.com

_Working session: 2026-10-12. Pairing in the Treehouse: Peretz & Ben._

A live working doc for the domain, DNS, and TLS setup behind `a2agents.com`.
It captures present reality as of today and the plan for the hands-on session.
This is **not** a spec — treat it as notes we update as we go. (See the
root-level status-file convention in `CLAUDE.md`: context, not requirements.)

## Why this doc exists

Peretz and Ben are pairing today on the domain / DNS / TLS stack. This PR is the
place to capture decisions and current state so the rest of the team — and future
Claude sessions — can catch up without re-deriving everything. It's also a
low-stakes PR for Ben to review on a2agents' GitHub and get in the loop.

## Present reality (2026-10-12) — to confirm live

- **Registrar:** Porkbun (domain `a2agents.com`)
- **DNS / edge:** Cloudflare
- **Website hosting:** Cloudflare Pages (`apps/web`, per `CLAUDE.md`)
- **TLS / SSL:** Cloudflare-managed certs — confirm mode (Full vs. Full-strict)
- **Services in scope today:** Hearth, Ember (define + decide routing below)

> TODO (Peretz / Ben): verify each line above against the live Porkbun and
> Cloudflare dashboards before relying on it.

## Today's agenda

- [ ] Confirm Porkbun nameservers point at Cloudflare
- [ ] Audit current Cloudflare DNS records (A / AAAA / CNAME / MX / TXT)
- [ ] Verify SSL/TLS mode and edge-cert coverage (apex + `www` + subdomains)
- [ ] Map subdomains for Hearth / Ember and decide routing
- [ ] Document email records (MX / SPF / DKIM / DMARC) — **do not break the
      Slack Mailbot's inbound-email ingest path** (see `infra/cloudflare/`)
- [ ] Decide what belongs in-repo vs. dashboard-only

## Open questions

- What are Hearth and Ember, and do they need their own subdomains / certs?
- Which records must be preserved so the Mailbot's email ingest keeps working?

## Change log

- 2026-10-12 — Doc created as a practice PR so Ben can review on GitHub and get
  in the loop. Content to be filled in live during the session.
