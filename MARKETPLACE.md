# Marketplace Handoff

This document is the release & DSH Marketplace submission checklist for **DSH-Slate**.

## Package

- npm package name: `dsh-slate`
- Publishable root: `plugin/` (`private: false`)
- Initial version: `0.1.0`
- License: `MIT` ([LICENSE](LICENSE))
- Keywords include `dsh-plugin`
- `dsh.bundle.patch` points to `./cordis.patch.yml`

## Publishing Checklist (npm + GitHub Release)

1. **Create public GitHub repository**: `https://github.com/light-cheng/DSH-Slate`
   - Add topics: `dsh-plugin`, `dsh`, `deepseek`, `project-progress`, `sidebar`.
   - Set default branch to `main`.
2. **Configure npm Trusted Publisher (OIDC)** on [npmjs.com](https://www.npmjs.com/) for package `dsh-slate` (first publish may require either a one-time `npm publish --access public` from `plugin/` or creating the package / organization policy, then bind Trusted Publishing):
   - **Organization / Owner**: `light-cheng`
   - **Repository**: `DSH-Slate`
   - **Workflow filename**: `release.yml`
   - **Environment**: *(leave empty)*
3. **Verify before tagging**:
   ```sh
   cd plugin
   npm run verify
   npm pack --dry-run
   ```
4. **Push & tag GitHub Release**:
   - Push `main` to `origin`.
   - Publish a GitHub Release tagged `v0.1.0` matching `plugin/package.json`'s `version`.
   - `.github/workflows/release.yml` verifies `TAG#v == version`, runs `npm run verify` inside `plugin/`, and executes `npm publish --tag latest` with automatic provenance via OIDC.

## awesome-dsh-plugin Submission

Create `data/plugins/light-cheng__DSH-Slate.yml` in [awesome-dsh-plugin/awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) (wait until the public repo passes any minimum age gate if applicable):

```yaml
url: https://github.com/light-cheng/DSH-Slate/tree/main/plugin
name: light-cheng/DSH-Slate
category: productivity
description:
  en: "Workspace-isolated project progress panel in the DSH right sidebar: automatic session progress sync, shell-verified checks separating completion from acceptance, zero-token Git/session hints, bounded Quick Init, manual overrides with one-click restore, and native monochrome UI."
  zh: "DSH 原生右侧栏项目进度面板：工作区状态严格隔离、日常会话主动同步进展、真实命令退出码核对验收、0 token Git/历史会话线索与一键快速初始化、手动覆盖保护及单色原生视觉。"
icon: https://raw.githubusercontent.com/light-cheng/DSH-Slate/main/plugin/icon.png
```

Notes verified against `dshmarket`:
- Using `/tree/main/plugin` in `url` sets `subpath = "plugin"` so `dshmarket` resolves `plugin/package.json`, `plugin/screenshots.json`, and `repository.directory = "plugin"`.
- `screenshots.json` is kept in sync at both repository root (`plugin/assets/screenshots/...`) and `plugin/screenshots.json` (`assets/screenshots/...`) with 6 verified PNGs (`<= MAX_SCREENSHOTS = 6`).
- Because npm publishing will ship `dsh-slate`, users can install directly via `dsh plugin --profile desktop add dsh-slate` or from DSH Plugin Marketplace.
