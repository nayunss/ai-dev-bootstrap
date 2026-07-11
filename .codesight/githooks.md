# Git Hooks

> **Note for agents:** These hooks fire automatically on git operations and will block the operation if they fail.

## `pre-commit` — husky

- **set**: `set -eu`
- **scripts/codesight-context**: `scripts/codesight-context generate`
- **git**: `git add .codesight`
- **scripts/security-check**: `scripts/security-check staged`

## `pre-push` — husky

- **set**: `set -eu`
- **scripts/security-check**: `scripts/security-check full`

_Source: .husky/pre-commit, .husky/pre-push_
