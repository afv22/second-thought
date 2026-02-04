### Commits
Use Conventional Commits format for all commit messages. The version is bumped automatically by release-please based on commit type:
- `fix: <message>` — patch bump (e.g. 1.3.0 → 1.3.1)
- `feat: <message>` — minor bump (e.g. 1.3.0 → 1.4.0)
- `feat!: <message>` or `fix!: <message>` — major bump (e.g. 1.3.0 → 2.0.0)

A scope is optional: `fix(options): <message>`, `feat(logger): <message>`.

### Publishing
Publishing is automated via GitHub Actions. On push to `main`, release-please opens a release PR that bumps the version in `manifest.json` and updates the changelog. Merging that PR triggers the publish job, which bundles the extension and uploads it to AMO as an unlisted addon. Do not manually update the version number in manifest.json.
