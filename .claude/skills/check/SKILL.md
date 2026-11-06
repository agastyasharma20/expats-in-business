---
name: check
description: Run the full local quality gate (lint, typecheck, unit tests, optional e2e) and fix what fails.
disable-model-invocation: true
allowed-tools: Bash(npm run *)
---

Run `npm run check`. If $ARGUMENTS contains "e2e", also run `npm run e2e`.
For each failure: explain the cause in one line, fix it with the smallest change, and re-run until green.
Never weaken a test or add `// @ts-ignore`/`eslint-disable` to make it pass without asking first.
Finish with a short table: check, result, what you changed.
