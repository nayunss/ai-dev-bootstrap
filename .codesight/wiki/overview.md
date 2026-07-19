# common-ai-development-harness — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**common-ai-development-harness** is a javascript project built with raw-http.

## Scale

1 API routes · 1 database models · 35 library files · 6 middleware layers · 13 environment variables

## Subsystems

- **[Github-app-portal-demo](./github-app-portal-demo.md)** — 1 routes — touches: auth, cache, payment

**Database:** unknown, 1 models — see [database.md](./database.md)

**Libraries:** 35 files — see [libraries.md](./libraries.md)

## High-Impact Files

Changes to these files have the widest blast radius across the codebase:

- `scripts/release-adoption.mjs` — imported by **6** files
- `scripts/fullstack-materializer.mjs` — imported by **4** files
- `desktop/session.mjs` — imported by **3** files
- `scripts/release-adoption-surfaces.mjs` — imported by **3** files
- `scripts/development-profile.mjs` — imported by **3** files
- `scripts/skill-distribution.mjs` — imported by **3** files

## Required Environment Variables

- `GITHUB_EVENT_PATH` — `scripts/validate-web-adoption-pr.mjs`
- `GITHUB_OUTPUT` — `scripts/github-actions-adoption.mjs`
- `GITHUB_STEP_SUMMARY` — `scripts/github-actions-adoption.mjs`
- `GITHUB_WORKSPACE` — `scripts/github-actions-adoption.mjs`
- `PATH` — `scripts/capability-suite.mjs`
- `PORTAL_DEMO_PORT` — `scripts/github-app-portal-demo.mjs`
- `QUALITY_NETWORK_ENFORCED` — `scripts/run-stack-quality.mjs`
- `RUNNER_TEMP` — `scripts/github-actions-adoption.mjs`
- `WEB_ADOPTION_BASE_REF` — `scripts/validate-web-adoption-pr.mjs`
- `WEB_ADOPTION_EXPECTED_PLAN_SHA256` — `scripts/github-actions-adoption.mjs`
- `WEB_ADOPTION_MODE` — `scripts/github-actions-adoption.mjs`
- `WEB_ADOPTION_RELEASE` — `scripts/github-actions-adoption.mjs`
- _...1 more_

---
_Back to [index.md](./index.md) · Generated from the repository_
