---
name: deploy-ios
description: Deploy the Modex/Codex Relay mobile app iOS OTA update with Hot Updater. Use when the user invokes $deploy-ios or asks to deploy from apps/mobile with `pnpm hot-updater deploy -p ios -t 1.0.0`.
allowed-tools: Bash(pnpm:*)
---

# Deploy iOS OTA

Deploy the iOS Hot Updater OTA bundle for the mobile app.

## Workflow

1. Work from the mobile app directory:

```bash
cd apps/mobile
```

2. Run the deploy command exactly:

```bash
pnpm hot-updater deploy -p ios -t 1.0.0
```

3. Wait for the command to finish. Do not stop at the build spinner.

4. Report the deployment result:

- Success requires build complete, storage upload complete, database update complete, and `Deployment Successful (...)`.
- Include the deployment id from the success line.
- If it fails, report the failing phase and the relevant error output.

## Notes

- `apps/mobule` in user prompts means `apps/mobile` for this repo.
- This command deploys to the configured Hot Updater production channel and uses target app version `1.0.0`.
- Do not change platform, target version, rollout, channel, or environment unless the user explicitly asks.
