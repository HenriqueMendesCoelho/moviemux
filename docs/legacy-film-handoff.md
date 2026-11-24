# Legacy film link handoff

Default: disabled. `NUXT_PUBLIC_LEGACY_FILM_HANDOFF_ENABLED=true` is an explicit
operator setting only after the exact backend release, persisted mapping, current
access checks and ACTIVE cutover have been reconciled. This setting does not
change backend phase or authorize any migration. Do not enable it in production
as part of building or publishing these sources. False retains the legacy page;
unrecognized values close the handoff instead of guessing a phase.

Only an exact canonical `/movie/{uuid}` document navigation resolves the private,
queryless legacy mapping. It never reads the legacy movie, notes, ratings or a
reveal endpoint. Success navigates to the mapped Collection landing, not a guessed
entry, and the destination independently reauthorizes. A short-lived, non-sensitive
notice cookie carries no IDs or permissions and uses SameSite=Lax. The existing
authentication cookie remains SameSite=Strict: an initial cross-site bookmark hop
may therefore arrive without authentication and receives the same neutral 404,
not a redirect or a legacy fallback. Queries and fragments are discarded.
Non-document/prefetch/write requests, absent sessions, revoked access, unavailable
state, invalid mapping and transport failures produce a neutral no-store result.
There is no retry or old-read fallback. Client navigation and persisted-page resume
return through this server boundary. Both exact API namespaces are allowed only
for authenticated, bodyless, queryless GET with the operator setting enabled.

Discover, watchlists, `/rankings` aliases and other legacy surfaces are outside this
exact handoff. Retiring all old writers, old deployed clients and PWA versions is a
separate operational gate; this feature does not infer ACTIVE from HTTP 410.
