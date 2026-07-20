# Changesets

Changes to the published `codex-relay` package should include a changeset.

Run:

```sh
pnpm changeset
```

Select `codex-relay`, choose the appropriate semantic version bump, and write
a concise user-facing summary. Commit the generated Markdown file with the
change. Repository-only changes that do not affect the published package do
not need a changeset.

Do not edit the package version or changelog manually. On pushes to `main`, the
release workflow creates or updates a release pull request. Merging that pull
request publishes the new version to npm and creates a matching GitHub release.

## After publish: Android preview build

When `changeset publish` succeeds, the same Release workflow starts an EAS
**Android preview** build (`apps/mobile`, profile `preview`, APK) and appends
the EAS build page / artifact links to the GitHub Release notes under
**Mobile builds**.

Requirements:

1. Repository secret **`EXPO_TOKEN`** — an Expo access token for an account
   that can build project `codex-relay-android` (owner `daye2026`).
2. GitHub Actions must be allowed to create pull requests (for the Version PR)
   and to update releases (`contents: write` is already set on the workflow).

The app `version` in `apps/mobile/app.config.ts` is stamped from the published
`codex-relay` version via `APP_VERSION` and by overwriting tracked `apps/mobile/app-version.json`
during the CI build so the APK matches the GitHub Release.

### Manual re-run

If the Android job fails or you need to rebuild without publishing again, run
the **Release** workflow via **Actions → Release → Run workflow**
(`workflow_dispatch`) and provide:

- **version** — e.g. `1.5.0` (required)
- **release_tag** — e.g. `codex-relay@1.5.0` (optional; resolved from version
  when empty)

## npm publishing auth

The workflow uses npm Trusted Publishing when it is configured for
`gronxb/codex-relay` and `.github/workflows/release.yml`. A repository
`NPM_TOKEN` secret remains supported as a fallback. GitHub Actions must also
be allowed to create pull requests in the repository workflow settings.
