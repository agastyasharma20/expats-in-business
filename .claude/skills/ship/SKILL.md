---
name: ship
description: Prepare the current feature branch for a pull request to develop (review, docs, commit messages, PR text).
disable-model-invocation: true
---

1. Run `git status` and `git diff develop...HEAD --stat`. Flag any file that looks like a secret, personal data, a build artifact or an unrelated change.
2. Ask the `reviewer` subagent to review the diff against CLAUDE.md (security, invented facts, dead links, accessibility, hard-coded Kraków/PLN).
3. Fix blocking findings. Run `npm run check`.
4. Update docs/PROGRESS.md and, if the milestone is complete, CHANGELOG.md.
5. Output: the Conventional Commit message(s) and a pull-request description using docs/PULL_REQUEST_TEMPLATE.md. Do not push; the human pushes.
