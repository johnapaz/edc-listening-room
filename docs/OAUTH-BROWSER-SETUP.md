# Browser-only owner setup: Google OAuth

Never share client credentials, refresh tokens or access tokens in ChatGPT, GitHub code/issues, Notion or PR comments. Repository is public.

1. Open [Google Cloud Console](https://console.cloud.google.com/) in the browser. Create a dedicated project for EDC Listening Room, enable **YouTube Data API v3** and check your two separate daily quota buckets. Keep billing disabled unless separately authorized.
2. Configure the OAuth consent screen and a suitable own-account OAuth client. The write/read scope is https://www.googleapis.com/auth/youtube.force-ssl. Authorize only your own Google account initially. Testing-mode OAuth refresh tokens may expire after seven days; handle this before scheduling repeat runs.
3. Browser-only token acquisition can be done using Google's [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) with **your own** OAuth client configured for its redirect URI and offline access. Follow Google's current instructions. Use a Google-controlled account and never put credentials in chat. Note: browser-based OAuth bootstrap is a human task; this repository doesn't silently authenticate.
4. In the GitHub repo, create environment `youtube-pilot` under Settings → Environments, restrict deployment to main and enable required owner review when available. Store `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REFRESH_TOKEN` as environment secrets. If your GitHub plan does not support required reviewers for this public repo, do not assume the environment provides owner approval; rely on manual dispatch with separate owner controls and audit.
5. Review every track match and commit pilot/approved-tracks.json as approved metadata (never secrets). Run the CLI dry-run without credentials.
6. After the PR is approved and merged, in GitHub Actions run **Private pilot playlist**, enter YES for confirmation, and supply your verified remaining general quota from Cloud Console. The workflow only runs on main and cannot publish public playlists.
7. Open the emitted link in YouTube Music and play songs. Read-back verifies only API IDs, not availability/streaming rights. Report the playback outcome in Notion before public publication is considered.

## Quota guard limitations

This code enforces a **single-run budget** and requires the owner to supply an external reading of daily remaining quota. It does not aggregate YouTube quota across separate GitHub Actions runs or other apps. Until a durable shared quota ledger exists, operate at most one approved publish run per daily quota period and confirm Google Cloud quota before every dispatch. The workflow also serializes publishes using GitHub Actions concurrency.
