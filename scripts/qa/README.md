# Local QA fixtures

This server provides fictional movie/account data for UI validation. It is not an authentication service and its deliberately unsigned tokens are invalid for any real backend. Never deploy it.

With Node 26.13.0, start `node scripts/qa/mock-api.ts` in one terminal. In another, start the frontend with:

`NUXT_PUBLIC_API_URL=http://127.0.0.1:3001 NUXT_PUBLIC_TMDB_IMAGE_BASE=http://127.0.0.1:3001 NUXT_PUBLIC_SOCKET_URL= pnpm dev`

Use `demo@moviemux.test` and any nonempty password. All data modifications remain in memory and reset when the mock server restarts. Browser tests against these fixtures do not establish live backend compatibility. Socket behavior requires separate mocks or a designated test socket backend.
