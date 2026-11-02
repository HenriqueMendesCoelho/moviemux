# Local QA fixtures

This server provides fictional movie/account data for UI validation. It is not an authentication service and its deliberately unsigned tokens are invalid for any real backend. Never deploy it.

With Node 26.13.0, start `node scripts/qa/mock-api.ts` in one terminal. In another, start the frontend with:

`NUXT_PUBLIC_TURNSTILE_ENABLED=false NUXT_API_UPSTREAM=http://127.0.0.1:3001 NUXT_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 NUXT_PUBLIC_TMDB_IMAGE_BASE=http://127.0.0.1:3001 NUXT_SOCKET_UPSTREAM= pnpm dev`

Use `demo@moviemux.test` and any nonempty password. All data modifications remain in memory and reset when the mock server restarts. Browser tests against these fixtures do not establish live backend compatibility. Socket behavior requires separate mocks or a designated test socket backend.

This explicit challenge bypass is restricted to loopback fixture origins. It does not validate Turnstile; use the dedicated challenge tests and separately configure the existing widget secret for live acceptance.

## Interaction fixtures

Optional server-only fixture settings: `QA_API_PORT` (default 3001), `QA_MOVIE_COUNT` (8–120, default 8), `QA_RATING_COUNT` (1–50, default 1 or 2 for an expanded catalogue), `QA_SUMMARY_DELAY_MS` and `QA_CREDITS_DELAY_MS` (0–5000, default 0). For long-scroll, pagination and loading-state checks, use 65 films, 15 ratings and 1500 ms delays. Cast fixtures include absent and failed portraits as well as a populated roster. Restarting resets all fictional edits. These settings are not frontend deployment environment variables.
