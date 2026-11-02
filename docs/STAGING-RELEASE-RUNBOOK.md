# Listening Room — staging-first release procedure

**Authority:** owner UX feedback and release workflow correction, November 2, 2026.

## Environments and meaning

- **Production:** `listeningroom.app`, Cloudflare Pages `listening-room`, GitHub branch `main`. Pushes to `main` deploy to real users automatically. **Do not merge into `main` just because CI passes.**
- **Staging:** same Cloudflare Pages project, its **preview deployment** for the dedicated GitHub `staging` branch. Cloudflare preview setting is `custom` and only includes `staging`. Cloudflare assigns a preview URL; copy a URL only when the deployment has actually completed with `latest_stage.status == success` and its deployment trigger commit is the known staging SHA.
- **Feature branches:** implement independently. Their Cloudflare deployment records may exist with `status == idle`; these are **not usable staging builds**. Feature branch CI is not a substitute for staging.

## Delivery workflow

1. Branch from `staging`; open a PR into `staging`. Avoid unrelated Event Day Companion changes, private source leakage and new third-party requests.
2. Confirm expected-head GitHub workflow checks, including the browser acceptance suite. Investigate failures; no bypass.
3. Merge to `staging` only after checks pass. Read Cloudflare's `staging` deployment and verify `environment=preview`, its exact commit SHA, `latest_stage.status=success`, then load the preview URL in a browser. Inspect desktop and mobile (280/360/1280), screen-reader names, clickable controls, actual queue behavior, absence of unrelated console errors, and responsive overflow.
4. Send the owner the staging URL and what specifically changed. **Request production go/no-go** unless separately explicitly preauthorized for this release. A pull request to `main` from `staging` is a promotion candidate, not permission to deploy.
5. Before promoting, verify `main` did not move; reconcile any changes. Require approval and passing PR checks for that exact head; then merge staging to `main` and verify that Cloudflare production finished successfully and that its deployed SHA matches the GitHub merge.
6. Record the release in the issue/PR with evidence (source head, CI run IDs, Cloudflare staging and production deployment IDs, status, links). Never claim a YouTube stub test proves real provider autoplay.

## Safety and housekeeping

- The app is public and has no private credentials in its sanitized build. Do not deploy the repo root; continue to build `public-site/` via the explicit sanitized allowlist.
- Do not automatically merge worker-bee feature PRs directly to `main`; stage and inspect.
- An idle/queued preview deployment **does not count** as staging.
- Staging is not a separate Cloudflare Pages *project* or custom domain; it is an isolated branch preview. A `staging.listeningroom.app` hostname has not been configured. Do not invent one.
- Cloudflare Pages preview deployments and GitHub CI can have distinct states; verify both.
