# Remaining work

Current, 2026-10-01. These entries are proposals/issues, not instructions to implement them unasked.

1. **Exact-origin Oksu pier #5651:** nearby walking estimates can still be implausibly long. The earlier station-side correlation adjustment is only a partial fix. Investigate origin matching and OSM access geometry with native/browser fixtures; do not weaken gap checks to hide the problem.
2. **Physical-phone performance:** verify cold WASM/tile downloads, memory and first comparison on actual target phones and ordinary mobile connections. Desktop viewport checks cannot establish device performance.
3. **Live-source stability:** the official website HTTPS/CORS feed currently works without a key but lacks a published versioned API contract. Coverage thresholds are dated. Revisit if the provider changes endpoint, categories, CORS or access policy; failure must remain Unknown.
4. **Historical evidence:** obtain complete additional availability months before claiming six-month coverage; confirm hourly sampling/aggregation semantics, station-number continuity and holidays. Validate any proposed predictive claims separately. Current Low/Moderate/High are descriptive archive bands.
5. **Offline data maintenance:** a new checkout includes the usable page but not raw maps/archives/build environments. Map refresh and station-master continuity have no unattended pipeline. Shortcuts are retained derived seeds; their rental-source period must not be relabeled as current popularity.
6. **Unused cloud project:** user can disconnect/delete the earlier Cloudflare Worker and Git build. Code removal does not modify their cloud account.

Completed this pass: static-only runtime/source cleanup, dedicated availability storage, exact binary summary, lazy loading, linear live merge, bounded stable shortlist, gzip-only routing/street/station publication, single worker initialization, bounded diagnostics and static-only documentation. Evidence is in [REVIEW.md](REVIEW.md).

Deferred: turn-by-turn directions, address search, booking, accounts, saved journeys, destination-capacity forecasts, weather, alerts and background collection.
