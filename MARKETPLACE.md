# Marketplace Handoff

This document is the release & DSH Marketplace submission checklist for **DSH-Slate**.

## Package

- npm package name: `@lightcheng/dsh-slate` (<https://www.npmjs.com/package/@lightcheng/dsh-slate>)
- Publishable root: `plugin/` (`private: false`)
- Latest published version: `0.1.2` (see `plugin/package.json`)
- License: `MIT` ([LICENSE](LICENSE))
- Keywords include `dsh-plugin`
- `dsh.bundle.patch` points to `./cordis.patch.yml` (`name: '@lightcheng/dsh-slate'`)

## Publishing Checklist (npm + GitHub Release — Live via OIDC)

1. **Public GitHub repository**: <https://github.com/light-cheng/DSH-Slate>
   - Topics: `dsh-plugin`, `dsh`, `deepseek`, `project-progress`, `sidebar`; default branch `main`.
2. **npm Trusted Publisher (OIDC)** configured on [npmjs.com](https://www.npmjs.com/) for `@lightcheng/dsh-slate`:
   - **Organization / Owner**: `light-cheng`
   - **Repository**: `DSH-Slate`
   - **Workflow filename**: `release.yml`
   - **Environment**: *(empty)*
3. **Verify before tagging a new release**:
   ```sh
   cd plugin
   npm run verify
   npm pack --dry-run
   ```
4. **Push & publish GitHub Release**:
   - Update `plugin/package.json` `version`, `RELEASE.md`, and `plugin/RELEASE.md`, then push `main` to `origin`.
   - Publish a GitHub Release tagged `vX.Y.Z` matching `plugin/package.json`'s `version`.
   - `.github/workflows/release.yml` verifies `TAG#v == version`, runs `npm run verify` inside `plugin/`, and executes `npm publish --access public --tag latest` with automatic provenance via OIDC (`v0.1.0`–`v0.1.2` already published).

## awesome-dsh-plugin Submission

Submitted via [awesome-dsh-plugin/awesome-dsh-plugin#17699](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/17699) (`data/plugins/light-cheng__DSH-Slate--plugin.yml`; automated `PR check` passed, waiting on the 24-hour `MIN_AGE_DAYS = 1` repository gate auto-rescan):

```yaml
url: https://github.com/light-cheng/DSH-Slate/tree/main/plugin
name: light-cheng/DSH-Slate
category: workflow
description:
  en: "Workspace-isolated project progress panel in the DSH right sidebar: automatic session progress sync, shell-verified checks separating completion from acceptance, zero-token Git/session hints, bounded Quick Init, manual overrides with one-click restore, and native monochrome UI."
  zh: "DSH 原生右侧栏项目进度面板：工作区状态严格隔离、日常会话主动同步进展、真实命令退出码核对验收、0 token Git/历史会话线索与一键快速初始化、手动覆盖保护及单色原生视觉。"
icon: https://raw.githubusercontent.com/light-cheng/DSH-Slate/main/plugin/icon.png
```

Notes verified against `dshmarket` and `awesome-dsh-plugin`:
- Using `/tree/main/plugin` in `url` sets `subpath = "plugin"` (filename slug `light-cheng__DSH-Slate--plugin.yml`) so `dshmarket` resolves `plugin/package.json`, `plugin/screenshots.json`, and `repository.directory = "plugin"`.
- `screenshots.json` is kept in sync at both repository root (`plugin/assets/screenshots/...`) and `plugin/screenshots.json` (`assets/screenshots/...`) with 6 verified PNGs (`<= MAX_SCREENSHOTS = 6`).
- Because npm publishing ships `@lightcheng/dsh-slate`, users can install directly via `dsh plugin --profile desktop add @lightcheng/dsh-slate` or from DSH Plugin Marketplace.
