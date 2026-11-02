# Local QA fixtures

This server provides fictional movie/account data for UI validation. It is not an authentication service and its deliberately unsigned tokens are invalid for any real backend. Never deploy it.

With Node 26.13.0, start `node scripts/qa/mock-api.ts` in one terminal. In another, start the frontend with:

`NUXT_PUBLIC_TURNSTILE_ENABLED=false NUXT_API_UPSTREAM=http://127.0.0.1:3001 NUXT_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000 NUXT_PUBLIC_TMDB_IMAGE_BASE=http://127.0.0.1:3001 NUXT_SOCKET_UPSTREAM= pnpm dev`

Use `demo@moviemux.test` and any nonempty password. All data modifications remain in memory and reset when the mock server restarts. Browser tests against these fixtures do not establish live backend compatibility. Socket behavior requires separate mocks or a designated test socket backend.

This explicit challenge bypass is restricted to loopback fixture origins. It does not validate Turnstile; use the dedicated challenge tests and separately configure the existing widget secret for live acceptance.

## Interaction fixtures

Optional server-only fixture settings: `QA_API_PORT` (default 3001), `QA_MOVIE_COUNT` (8–120, default 8), `QA_RATING_COUNT` (1–50, default 1 or 2 for an expanded catalogue), `QA_SUMMARY_DELAY_MS`, `QA_CREDITS_DELAY_MS` and `QA_SEARCH_DELAY_MS` (0–5000, default 0). For long-scroll, pagination and loading-state checks, use 65 films, 15 ratings and 1500 ms delays. Cast fixtures include absent and failed portraits as well as a populated roster. Restarting resets all fictional edits. These settings are not frontend deployment environment variables.

`QA_SEARCH_DELAY_MS` delays only nonempty collection-title queries, so clearing can return immediately while the old search is still pending. This supports deterministic stale-response checks without production traffic.

Set `QA_SCORE_BADGES=true` only for local visual checks to give the first three fictional films exact averages of 10, 9 and 0. This makes the cyan perfect-score exception and unchanged existing ranges observable without modifying production data. Default fixtures remain unchanged.

## Progressive metadata and cache checks

`QA_PROVIDER_DELAY_MS` (0–5000, default 0) delays only the fictional provider response. Set a short summary delay and a longer provider delay to verify core details render independently. Availability fixtures explicitly distinguish subscription, rental, purchase, free and ad-supported fictional services; they are not real availability data.

The loopback fixture's read-only `GET /qa/static-metrics` returns in-memory static metadata request counts (paths and fictional search parameters only), supporting cold/repeated-open and deduplication checks. It contains no credentials or login bodies. Restart the fixture to reset counts. This diagnostic endpoint belongs only to the local QA server, not the Nuxt application or production BFF.
