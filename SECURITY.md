# Security Policy

## Supported versions

twarc is currently a single deployment of the `main` branch. We patch
vulnerabilities by rolling `main` forward and redeploying — there is no LTS
branch. If you self-host, stay current with `main`.

## Reporting a vulnerability

**Please do not open a public GitHub issue for a security report.** Public
issues are indexed immediately and would expose users before a fix is shipped.

Instead, use one of the following private channels:

- **Preferred:** [Open a private security advisory on GitHub](https://github.com/twarc-net/twarc/security/advisories/new).
  This gives us a private discussion thread, CVE allocation if applicable, and
  coordinated disclosure timeline.
- **Email:** `security@twarc.net`. Encrypt with our PGP key on request.

### What to include

- A clear description of the issue and the impact
- Steps to reproduce, or a proof-of-concept
- Any relevant logs, screenshots, or curl commands
- Your name / handle for credit (or "anonymous" if you prefer)

### What to expect

- We'll acknowledge your report within **72 hours**.
- We'll triage and confirm impact within **7 days**.
- We aim to ship a fix within **30 days** for high/critical issues, sooner if
  actively exploited.
- We'll credit you in the advisory and release notes unless you ask otherwise.

## Scope

In scope:

- The Laravel API (`apps/api`)
- The Next.js web app (`apps/web`)
- The image pipeline (imgproxy config, upload validation)
- The moderation flow (mod queue, role escalation, ban logic)
- The auth flow (Sanctum, Fortify, 2FA)
- nginx + deployment configs in `docs/runbooks/`

Out of scope:

- Third-party services we use (report directly to them: Cloudflare, Bunny,
  Backblaze, Meilisearch)
- Volumetric DoS / rate-limit bypass for known limits unless you can prove
  meaningful resource exhaustion
- Social-engineering attacks on maintainers
- Vulnerabilities requiring physical access to our servers

## Safe-harbor

We will not pursue legal action against researchers who:

- Make a good-faith effort to follow this policy
- Do not access user data beyond the minimum needed to demonstrate the issue
- Do not disclose publicly before we've had a reasonable chance to fix it
- Do not degrade service or modify data belonging to others
