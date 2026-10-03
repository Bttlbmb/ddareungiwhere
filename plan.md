# Remaining work

Reviewed 2026-10-03. These are known issues and proposals, not instructions to implement them unasked. Completed work and publication evidence belong in [REVIEW.md](REVIEW.md).

## Known issues and checks

1. **Oksu pier #5651:** using the pier as the exact starting point can still produce implausibly long walks. The station-side matching adjustment was only a partial fix. Investigate origin matching and OSM access geometry with native/browser fixtures; retain the access-gap checks.
2. **Physical phones:** measure first-use routing downloads, memory and first comparison on target phones and ordinary mobile connections. Check the user's reported map failure on the affected device. Desktop viewport tests establish layout under emulation, rather than device performance or resolution of that report.
3. **Live-source stability and overseas access:** the website feed worked on the tested Korean connection, but has no published versioned contract. Reproduce the exact browser POST on affected overseas networks before claiming country coverage. [DATA_SOURCES.md](DATA_SOURCES.md) records the 2026-10-01 reports and limits of the evidence. If worldwide counts are required, evaluate a shared service with verified upstream access or the documented Seoul Open Data API, keeping credentials outside browser assets. This is a proposal, not an approved runtime change.
4. **Historical evidence:** obtain complete additional months before claiming six-month coverage. Confirm hourly sampling/aggregation, station-number continuity and holiday treatment. Validate predictive claims separately; current bands describe the archive.
5. **Data maintenance:** new checkouts include the page, but raw maps, archives and routing build environments must be supplied separately. Map refreshes and station continuity have no unattended pipeline.

## External follow-through

- **Unused Cloudflare project:** the earlier Worker and Git build may still exist in the user's account. Removing local code does not disconnect or delete them.
- **Search Console:** the 2026-10-02 release includes the verification tag, language metadata and sitemap. Ownership verification, submission and indexing remain unconfirmed here. Follow [STATIC_SETUP.md](STATIC_SETUP.md), then assess traffic when actual data is available.

## Outside the current scope

Walking/cycling directions, address search, walking budgets, leave-origin or door-to-door totals, booking, accounts, saved journeys, destination-capacity forecasts, weather, alerts and background collection remain deferred.
