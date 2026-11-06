---
name: milestone
description: Start an EiB build milestone. Use when the user types /milestone <number> followed by the milestone prompt.
disable-model-invocation: true
---

You are starting EiB milestone $ARGUMENTS.

1. Read CLAUDE.md, docs/PROGRESS.md and docs/DECISIONS.md.
2. Check we are on a clean feature branch named `feat/m<NN>-<short-name>` (create it from `develop` if not; ask before switching if the tree is dirty).
3. Restate the goal and the acceptance criteria from the prompt in your own words, list the files you expect to touch, and name the risks.
4. Propose a step-by-step plan split into small commits. Wait for approval before editing files.
5. After approval, implement one step at a time. After each step run `npm run check`; fix failures before moving on.
6. When all acceptance criteria pass: run `npm run e2e` for the affected routes, update docs/PROGRESS.md
   (what was built, how to test it, known gaps), and propose Conventional Commit messages. Do not push.
