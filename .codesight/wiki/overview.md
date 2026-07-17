# common-ai-development-harness — Overview

> **Navigation aid.** This article shows WHERE things live (routes, models, files). Read actual source files before implementing new features or making changes.

**common-ai-development-harness** is a javascript project built with raw-http.

## Scale

7 library files · 5 middleware layers · 1 environment variables

## High-Impact Files

Changes to these files have the widest blast radius across the codebase:

- `scripts/upstream-lock.mjs` — imported by **3** files
- `scripts/pilot-results.mjs` — imported by **2** files
- `scripts/application-inventory.mjs` — imported by **2** files
- `scripts/upgrade-core.mjs` — imported by **1** files
- `scripts/validate-production-readiness.mjs` — imported by **1** files
- `scripts/validate-skill-evolution-trial.mjs` — imported by **1** files

## Required Environment Variables

- `PATH` — `scripts/manage-dependencies.mjs`

---
_Back to [index.md](./index.md) · Generated from the repository_
