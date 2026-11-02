# Static catalogue metadata cache

The browser uses `@tanstack/vue-query` for repeated TMDB catalogue reads. Pinia still owns UI/domain state; collection edits, user ratings, watchlists and realtime updates are not cached by this layer.

| Data | Fresh for | Inactive retention |
| --- | --- | --- |
| Discovery/search results | 5 minutes | 20 minutes |
| Film summaries, public info and credits | 30 minutes | 60 minutes |
| Regional watch providers | 15 minutes | 30 minutes |
| Genre catalogue | 6 hours | 6 hours |

At most 128 **completed inactive static queries** are retained, oldest completion first. Settled errors count toward this cap. Observed, pending, paused and fetching queries are not evicted, so this is not a byte limit or an absolute concurrency limit. Garbage collection also expires unused entries.

- Query keys include the actual URL/parameters and relevant language/region context. Equivalent homogeneous genre sets are normalized without changing mixed AND/OR semantics.
- Concurrent requests deduplicate. Fresh repeated requests reuse metadata; failed requests can be retried explicitly.
- Each browser app owns its QueryClient. SSR fetches directly with its request-scoped API client; no server-global cache or dehydrated cache payload is created.
- Account, session generation and login-state changes synchronously clear/abort queries. Late old-session responses cannot repopulate the new session cache.
- Data remains in memory only: no localStorage persistence, bearer tokens or score-reveal preferences. Consumers receive clones so editing imported metadata cannot modify another view's cached source.
- Details render as soon as the summary arrives. Watch availability loads independently and distinguishes subscription, rental, purchase, free and ad-supported offers for Brazil. Provider failures do not hide loaded core details.

Implementation: `src/core/query/`, `src/plugins/static-query.client.ts`, `KitService` and the static metadata methods in `MovieService`. Tests: `tests/unit/static-query*.test.ts`. Local fictional request-count fixtures are documented in `scripts/qa/README.md`.

The pinned Vue Query 5.105.1 version satisfies the repository's dependency release-age policy; no exception was added for a newer patch. See [official Vue Query documentation](https://tanstack.com/query/latest/docs/framework/vue/overview).
