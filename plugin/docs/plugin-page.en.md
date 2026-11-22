# Slate Project Progress

A workspace-isolated, evidence-backed project progress view in the DeepSeek Harness right sidebar (`项目进度`). It tracks project goals, acceptance criteria, tasks across sessions, test verification results, and open issues in one persistent board.

- **Automatic session reporting**: syncs task progress and IDs into active sessions via `systemPrompt.section` without manual reminders while leaving read-only Q&A quiet.
- **Evidence-backed checks (`completion != acceptance`)**: verifies claimed test passes against real shell `exitCode === 0` executions, clears stale `todo` placeholders across sessions, and keeps project acceptance criteria intact on subtask reports.
- **Zero-token hints, Quick Init & manual overrides**: surfaces local Git state and real sidebar session titles before any model call, supports bounded Quick Init, and protects manual edits with one-click restore.

Full documentation, screenshots, issues, and release notes: https://github.com/light-cheng/DSH-Slate
