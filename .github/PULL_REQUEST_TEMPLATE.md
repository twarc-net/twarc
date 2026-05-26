<!--
Thanks for contributing! A few things to make review faster:
- Keep PRs focused — one logical change per PR is much easier to merge.
- If this fixes an issue, write "Fixes #123" so it auto-closes on merge.
- Schema changes / new external integrations / moderation-policy changes:
  please open a Discussion first if you haven't already.
-->

## What this PR does

<!-- 1–3 sentences. Focus on the user-facing effect, not the diff. -->

## Why

<!-- Motivation — the bug it fixes, the use-case it enables, the cleanup it does. -->

## How to test

<!-- Concrete steps so a reviewer can verify locally. Include URLs, commands, and any seed data needed. -->

1. ...
2. ...
3. ...

## Screenshots / video (UI changes only)

<!-- Before / after, or a short Loom / screen recording. -->

## Checklist

- [ ] I read [CONTRIBUTING.md](../CONTRIBUTING.md) and matched the surrounding code style.
- [ ] I tested locally (API + web both run; the affected flow works end-to-end).
- [ ] If I added/changed a public API endpoint, I updated the relevant docs.
- [ ] If I added a migration, it has a working `down()` and I ran `migrate:rollback` to verify.
- [ ] This change does not loosen the SFW / no-AI / halal-only content policy.
