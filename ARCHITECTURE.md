# Architecture

Reviewed 2026-10-03. [SPEC.md](SPEC.md) defines behavior; [STATIC_SETUP.md](STATIC_SETUP.md) explains maintenance; [REVIEW.md](REVIEW.md) records what was tested and published.

## Where the work happens

GitHub Pages sends the page, public data and routing engine to the browser. The browser draws the map, compares stations and calculates routes on the device. Python tools prepare the data beforehand; they do not run when someone uses the page.

```text
Offline inputs → Python exporters → static page on GitHub Pages
                                      ↓
Browser: interface + Leaflet + station/history/street data + Valhalla worker
         ↓ explicit comparison or refresh       ↓ map viewing
         official HTTPS bike feed               OpenStreetMap background tiles
```

There is no application server, proxy, runtime database or account system. A location request takes one GPS fix with the browser's permission. Street lookup and routing stay on the device. Background tiles reveal the viewed area to the tile provider; inventory requests retrieve all stations rather than the chosen journey.

## Source responsibilities

| Source | Responsibility |
| --- | --- |
| `web/app.js` | Draft and applied journeys, map/results, validation, language, count snapshots and late-response guards |
| `web/index.html`, `web/style.css`, `web/assets/` | Initial English page, approved layout and logo |
| `web/i18n.json`, `scripts/lib/localization.py` | Korean copy and pretranslated Korean entry |
| `web/static/start.mjs` | Versioned configuration and awaited startup |
| `web/static/service.mjs` | Lazy data loading, live merge and serial route requests |
| `web/static/planner.mjs` | Seoul-time validation, five-station shortlist, shared destination station and history lookup |
| `web/static/live.mjs` | Fixed official feed, quantity/coverage checks and receipt times |
| `web/static/data.mjs` | Gzip decoding, cancellation and historical payload validation |
| `web/static/routes.mjs` | One routing worker, bounded estimate cache and short walking-access correction |
| `web/static/streets.mjs` | Spatial street shards and nearest named-road search |
| `scripts/build_static.py`, `scripts/lib/export_data.py` | Complete public build and exact data exports |
| `scripts/lib/sdk.py` | Checked patches to the pinned routing SDK's delivery and station matching |
| `scripts/import_availability.py`, `scripts/import_streets.py` | Validated offline source imports |
| `scripts/build_browser_graph.py`, `scripts/check_browser_routes.py` | Optional pinned graph build and native/browser route checks |
| `scripts/preview_static.py`, `scripts/prepare_publication.py` | HTTP preview and allowlisted publication preparation |

Third-party files in `web/vendor/` retain their licenses. Edit application source, not generated files in `dist/site` or `docs`.

## Loading, state and cancellation

Startup loads only station metadata. Historical metadata and counts load on the first comparison; street shards load when selected points need labels; the routing engine and graph tiles load on the first estimate. An app-module preload overlaps its download with configuration loading without running it early.

The frontend calls `BikeStatic.request` with internal command names such as `/api/plan`. These strings never request an HTTP API. Operations have a 30-second abort signal. Draft edits cancel an old comparison and clear its busy/error state; request identity guards keep late replies from replacing a newer journey. A late street label applies only to its matching point.

Station readiness is independent of history. Loading/failure feedback remains on the map, and Retry preserves partly chosen points. Failed initialization promises reset for the next explicit action. A new caller can restart a shared load abandoned by cancellation; ordinary failures do not retry automatically. Cancellation is checked before planning can start inventory collection. Startup/data helpers tolerate absent newer AbortSignal methods; missing gzip support produces translated guidance. The pinned SDK has its own browser requirements.

Shortlisting scans the catalogue once, keeping five nearby candidates and the nearest destination station. Equal distances retain catalogue order. Only selected rows are cloned. Explicit station overrides retain their existing meaning. Inventory merges use one ID map and preserve the catalogue array used by the planner. Displayed quantities and their receipt times stay attached to the last fetched snapshot until an explicit update. Refresh renders results once; returning to a tab updates the pickup clock without rebuilding unchanged result rows.

## Language and layout

The URL selects English or Korean. Both HTML entries share versioned scripts, styles, data and logo. The builder embeds the Korean message catalog in `app.js`, so switching needs no extra download. Korean HTML is translated before JavaScript runs and rebases relative assets to the parent directory. Each entry has its own canonical URL and reciprocal language alternatives; the sitemap lists both.

The ENG / 한국어 capsule is one native link to the other language. Ordinary clicks toggle copy and URL in place; modified clicks retain normal new-tab navigation. Back/forward follows the URL. Draft/applied points, pending work, selected station, estimates and bilingual labels survive a switch. Late replies render in the current language. There is no language storage or automatic redirect.

Phone planning at widths up to 700 px scrolls naturally and reserves space for the fixed Compare dock and safe area. Results at widths up to 1100 px replace the planner; phone rows are compact, while tablets keep shared table headings. Wider screens retain the planner beside results. Results scroll internally beneath their heading; Back to map stays outside the scroller. See [DESIGN.md](DESIGN.md) for visual details.

A ResizeObserver, where available, updates Leaflet's cached size without panning when the visible map changes size. Hidden zero-size maps are skipped. Keyboard instructions synchronize size before Enter reads the center; Back to map also refreshes size. Coarse pointers get a larger canvas hit tolerance without enlarging the station dots.

## Public data formats

### Stations and inventory

The saved catalogue has 2,735 station locations. Runtime matching uses ST identifiers; historical matching uses station numbers. A successful live refresh can add valid stations. Renumbering continuity remains unverified.

The browser POSTs `stationGrpSeq=ALL` to the fixed HTTPS feed in [DATA_SOURCES.md](DATA_SOURCES.md), with CORS, omitted credentials, no redirects and an eight-second timeout. It rejects failed/non-ALL replies, duplicate/invalid stations and replies outside a defensive 2,500–10,000-row range. That range does not prove completeness. Quantities sum the legacy, QR and smaller-bike categories; malformed quantities remain unknown. Session metadata is discarded.

Only explicit actions start collection. Each tab shares one pending request and a 60-second attempt cooldown; there is no global visitor quota, polling collector or persistent inventory store. Receipt time is local because the provider supplies no observation timestamp. Freshness limits station suggestions, not how long displayed counts remain visible. Failed refreshes retain the previous quantities and receipt times. The results notice distinguishes missing counts from a failed update with retained counts and does not infer the visitor's country.

### History

Offline SQLite stores `availability(number, day, hour, weekday, bikes)`, keyed by station/date/hour, plus source metadata. Exact duplicates deduplicate; conflicting quantities reject the import; missing/invalid records are excluded. A replacement database is built before it replaces the existing one. No rental table is retained.

`history.json` schema 2 lists station-number order, dates, actual observed months, method, fingerprints, thresholds and the counts URL/hash. Gzip counts decode to little-endian uint16 pairs `[observations, zero]`: 48 cells per station, weekend hours 0–23 followed by weekday hours 0–23. Each cell stores how many values were recorded and how many were zero. The browser checks the byte length and SHA-256 fingerprint before lookup. Counts are exact, not rounded probabilities. The supported maximum 120-month window fits this representation.

The retained archive supplies 2,809 station numbers and 134,832 cells for October–December 2025. Missing evidence is Unknown. A longer export window changes the observations included, not the 48-cell shape; six-month coverage needs more source months. Sampling and continuity limits are in DATA_SOURCES.

### Streets

Named roads use 0.005° cells, distributed in 0.05° gzip shards. The browser keeps 32 shards in least-recently-used order, including cached absence for a missing shard in that versioned release. Transient failures remain retryable. Each lookup indexes only segments in the searched cells. Search extends 250 m; labels beyond 35 m add Near / 근처. Geometry precision is retained.

Processed ways are `[English, geometry, Korean?]`; public segments are `[id, English, aLat, aLng, bLat, bLng, Korean?]`. Python/browser lookup retains `label` and optional `label_ko`. Older extracts fall back to English. The UI chooses the cached name without another request. These are approximate road labels, not postal addresses; no external geocoder is called.

## Routing and storage

The compiled routing code runs as WebAssembly (WASM) in a background worker. Routing is pinned to valhalla-browser 0.2.1 / Valhalla 3.8.3 revision `a60c7cbfc83e073f50887cd27e0109d02e6b64e5`. The graph includes bicycle/pedestrian access, hierarchy and shortcuts, excluding driving-only ways. Bicycle estimates use hybrid costing at 15 km/h; walking uses 5.1 km/h.

Pedestrian matching uses a 30 m user-point radius, 50 m station radius and 100 m search cutoff; station matching excludes bridges. The SDK carries a checked boolean station role so the final forward walk treats its origin as the station. Short gaps to the routed geometry add walking access; gaps over 100 m are rejected. Shape scanning keeps endpoints instead of a full decoded line. The exact-origin Oksu pier #5651 detour remains unresolved.

Only gzip tiles and gzip WASM are published. Decoding verifies bounded length, SHA-256 and tile GraphId before use. Range-transport checks remain intact, but this deployment uses individual tiles. Manifest archive descriptors retain build provenance; `graph.tar` is unnecessary for delivery or native tile-directory checks. WASM itself is unmodified.

One shared initialization prevents duplicate workers. The tile memory budget is 96 MiB; WASM starts at 64 MiB and can grow to 512 MiB. The cache keeps the 2,048 most recently used estimates, distinguished by direction, mode, coordinates and station role. Eleven serial estimates cover five pickup walks, five rides and one final walk. Normal use disables diagnostic samples; explicitly enabled samples are limited to ten. HTTP assets follow host caching policy; decoded/native caches last only for the session. These limits are settings, not measured peak phone memory.

## Build and publication

A staged build replaces only a marked generated site. Small UI, module, configuration, worker and WASM URLs share a content revision that includes public data; count binaries and graph releases use content-addressed paths. This keeps returning visitors from mixing release assets. No service worker is installed.

The publisher copies allowlisted source, documentation, small public inputs/provenance and the generated site, removes stale assets and excludes diagnostics. Credential and per-file size checks precede publication preparation. It never commits or pushes. Raw inputs, SQLite, SDK cache and local environments stay ignored; removing a file does not remove it from prior Git history.
