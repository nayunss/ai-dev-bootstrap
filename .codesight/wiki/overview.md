# common-ai-development-harness — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**common-ai-development-harness** is a javascript project built with raw-http.

## Scale

1 database models · 28 library files · 6 middleware layers · 2 environment variables

**Database:** unknown, 1 models — see [database.md](./database.md)

**Libraries:** 28 files — see [libraries.md](./libraries.md)

## High-Impact Files

Changes to these files have the widest blast radius across the codebase:

- `scripts/fullstack-materializer.mjs` — imported by **4** files
- `scripts/development-profile.mjs` — imported by **3** files
- `scripts/skill-distribution.mjs` — imported by **3** files
- `scripts/stack-profile-fixtures.mjs` — imported by **3** files
- `scripts/upstream-lock.mjs` — imported by **3** files
- `scripts/release-adoption-surfaces.mjs` — imported by **2** files

## Required Environment Variables

- `PATH` — `scripts/capability-suite.mjs`
- `QUALITY_NETWORK_ENFORCED` — `scripts/run-stack-quality.mjs`

---
_Back to [index.md](./index.md) · Generated from the repository_
