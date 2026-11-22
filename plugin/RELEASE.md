# Release notes

See the repository root [RELEASE.md](https://github.com/light-cheng/DSH-Slate/blob/main/RELEASE.md) for the complete changelog, or read below.

## Publishing

Creating a GitHub release in `light-cheng/DSH-Slate` publishes `plugin/` (`dsh-slate`) to npm automatically via `.github/workflows/release.yml` (npm OIDC trusted publishing, no npm token). Tag the release `vX.Y.Z`, matching `version` in `package.json`.

## v0.1.0 — Initial Release Candidate

- **Workspace-isolated project store**: per-workspace persistent state under `${DSH_HOME}/storages/dsh-slate/projects/` protected by in-process queues, `O_EXCL` cross-process locks, and atomic writes.
- **Authoritative identity & shell evidence verification (`project_progress_report`)**: binds real `sessionId` and `cwd` from `exec.agent`, verifies `passed` checks against actual `exitCode === 0` shell runs, and clears stale same-task `todo` placeholders once real check results arrive across sessions.
- **Automatic reporting & compact guidance (`systemPrompt.section`)**: keeps active `taskId`s, locked goals, project acceptance criteria, and open issues in context so routine coding/testing sessions update Slate automatically without spamming read-only turns.
- **Zero-token bootstrap hints & Quick Init**: displays Git state and real sidebar session titles (excluding blank drafts) with 0 model tokens, plus bounded one-click **快速初始化** via `typertGateway`.
- **Manual overrides & native monochrome DSH sidebar**: protects manual edits with **恢复会话汇报**, supports click-through cross-session navigation, preserves dragged rightbar widths, and ships paired light/dark mineral slate icons.
