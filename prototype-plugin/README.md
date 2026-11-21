# DSH-Slate — Throwaway Prototype

**Question:** does the B / project-brief direction work inside a real DSH right sidebar, and can real sessions report progress while users manually adjust it?

## Two kinds of preview

- `../prototype-preview.html` is the earlier standalone UI fixture. It contains hardcoded sample copy and is only for visual interaction.
- This plugin directory is the live DSH prototype. It contains no fixture project. Real sessions call `project_progress_report`; the right sidebar reads those reports and actual test/Bug details from a state file inside the active temporary `DSH_HOME`.

The live prototype is still throwaway code, not a production persistence or collaboration design.

## Verified with real sessions

Three Magpie DeepSeek headless sessions implemented orders, implemented pickup validation, and inspected the mobile CSS. Independent test runs confirmed 3/3 order tests and 3/3 pickup tests; the mobile test failed and produced real reported issues. A manual 65% progress adjustment survived another report from the same session.

See `../TESTING.md`, `../test-results/live-*`, and `../previews/live-real-*`. Temporary sessions, profiles, project files, and runtime were removed after capture.
