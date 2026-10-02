# Architecture

Static-only implementation, 2026-10-01. Product rules: [SPEC.md](SPEC.md); maintenance: [STATIC_SETUP.md](STATIC_SETUP.md).

## Runtime boundary

```text
GitHub Pages → HTML/CSS/JavaScript, compressed public datasets, WASM, routing tiles
Browser → Leaflet + draft/results UI
        → StaticService → shortlist/history, street labels, Valhalla worker
        → fixed official HTTPS bike feed, on explicit comparison/refresh
        → ordinary OpenStreetMap background tiles
Offline Python tools → availability SQLite / street extract / graph → public assets
```

No backend, proxy, secret, rental table or database download is needed at runtime. GPS is one browser-permission fix. Street lookup/routing stay on-device; background tile requests reveal viewed map areas to the tile provider. Live requests ask for all stations, not the selected journey.

## Responsibilities

| Source | Responsibility |
| --- | --- |
| `web/app.js` | Draft vs applied journey, map/results, validation feedback, stable count snapshots and asynchronous response guards |
| `web/static/start.mjs` | Versioned configuration and browser coordinator startup |
| `service.mjs` | Lazy datasets, manual operations, live merge and serial route orchestration |
| `planner.mjs` | KST validation, stable five-station shortlist, shared destination station, historical cell lookup |
| `live.mjs` | Fixed credential-free feed, category sum, coverage/row checks and receipt times |
| `data.mjs` | Explicit gzip decoding and exact historical payload/hash validation |
| `routes.mjs` | One lazy worker, bounded estimate cache, pedestrian endpoint-access correction |
| `streets.mjs` | Lazy spatial shards and nearest named-road search |
| `scripts/build_static.py` | Stage complete public build, compress required data, version modules and install pinned SDK |
| `scripts/lib/export_data.py`, `sdk.py` | Exact history/street export; narrowly checked SDK transport/correlation patches |
| `scripts/import_availability.py`, `import_streets.py` | Offline validated source imports |
| `scripts/build_browser_graph.py`, `check_browser_routes.py` | Optional pinned native graph build and browser/native diagnostic fixtures |
| `scripts/preview_static.py`, `prepare_publication.py` | File-only HTTP preview and allowlisted publication with stale-file removal |

Static module paths above are relative to `web/static/`. Existing `/api/bootstrap`, `/api/plan`, `/api/place-label` and `/api/live` strings are **internal command names** handled by `BikeStatic.request`; they never request HTTP API routes. The frontend gives operations a 30-second abort signal. Bootstrap fetches station data and history metadata, never live inventory, count cells or WASM. Count cells load on first comparison; street shards load when labeling selected points; WASM/graph load on first estimate. Failures reset initialization promises for retry.

The planner scans the catalogue once, retaining only five candidates and the nearest destination station. Stable ties retain catalogue order. Only selected rows are cloned. Explicit departure/destination-station overrides retain existing semantics; internal return keys remain compatible. Refresh uses ID maps for a linear merge, preserving the station array used by the planner. Failed refreshes preserve the last quantities and original receipt times; UI snapshots remain stable until an explicit update.

## Localization

`web/i18n.json` maps stable English messages to Korean, including placeholders and accessibility/error copy. The builder embeds the compact catalog in the shared `app.js`; switching needs no translation fetch or duplicated runtime. `scripts/lib/localization.py` renders initial Korean HTML after revisioning, rebasing only relative assets to the parent directory. Both entries resolve the same versioned styles/scripts/logo and data. Each has a self-canonical and reciprocal en/ko/x-default alternate links; the sitemap lists both entry URLs.

The URL determines the initial language. The header's two real language links also work without JavaScript or in new tabs; `aria-current` and the capsule's `data-language` identify the selected position in both initial HTML entries. Normal clicks select the link's language through History API and rerender copy only, retaining draft/applied state and cached bilingual label descriptors. Clicking the current position does not add history or rerender. Popstate updates language; late replies render in the current language. There is no storage, automatic redirect, external translation service, route/count invalidation or map reconstruction on a switch.

## Live counts

POST form `stationGrpSeq=ALL` to the fixed official HTTPS endpoint documented in DATA_SOURCES. CORS mode, omitted credentials, no redirects, eight-second upstream timeout. Reject unsuccessful/non-ALL replies, invalid/duplicate stations, and counts outside the current 2,500–10,000-row coverage guard. That guard is a dated defensive threshold, not a proof of completeness.

Aggregate `parkingBikeTotCnt` + `parkingQRBikeCnt` + `parkingELECBikeCnt`, matching the official map. Invalid quantities are unknown. Session metadata is discarded. The feed supplies no observation timestamp; receipt time stays attached to the snapshot; the 120-second freshness threshold only limits automatic station suggestions. The UI does not expire valid counts or immediate-availability snapshots. One active request and a 60-second attempt cooldown per tab follow explicit actions only. Visitors do not share a global quota/cache. No polling collector or persistent inventory storage exists.

The results UI shows missing quantities as a gray `/` box and renders a compact below-table notice from completed `live.error` state. The copy distinguishes no valid departure counts from retained counts after a failed refresh. It hides during refresh, success, draft edits and a new comparison. No browser IP lookup or inferred geographic error classification is performed. Live command exceptions use the same notice when a comparison exists; other command errors retain the ordinary error surface.

## Historical sufficient statistics

Offline `availability.sqlite3` contains availability(number, day, hour, weekday, bikes) keyed by station/date/hour plus source metadata. Conflicting duplicate quantities abort import; exact duplicates deduplicate; missing/invalid records are excluded. The import builds a replacement before publishing it. No trip table is retained.

`history.json` schema 2 carries station-number order, dates, actual observed months, method, source fingerprints, thresholds, and a content-addressed counts URL/hash. The gzip binary decodes to little-endian uint16 pairs `[observations, zero]`: 48 cells per station, weekend hours 0–23 then weekday hours 0–23. The browser checks byte length and SHA-256 before lookup. Counts remain exact; this is not probability quantization. At the allowed maximum 120-month window each group/hour count fits uint16. Six months merely changes the offline aggregation window, not the fixed browser cell dimensions.

Current table: 2,809 historical station numbers, 134,832 cells. A station without evidence is Unknown. The saved map has 2,735 station locations; live refresh can append valid new stations. Historical matching uses station number; continuity across renumbering remains unverified.

## Streets and routing

Named-road geometry is indexed in 0.005° cells, published in 0.05° gzip shards. A 32-shard cache bounds decoded lookup data. Search is within 250 m; labels beyond 35 m get Near. Geometry precision is retained. Optional Korean labels are carried alongside the original English fallback: processed ways `[English, geometry, Korean?]`, exported segments `[id, English, aLat, aLng, bLat, bLng, Korean?]`. Both Python/browser lookups retain `label` and add `label_ko`; old extracts/shards fall back to English. The UI selects the retained name without another lookup/request. No external reverse geocoder is called.

The browser SDK is pinned to valhalla-browser 0.2.1 / Valhalla 3.8.3 revision `a60c7cbfc83e073f50887cd27e0109d02e6b64e5`. WASM is unmodified and delivered as explicit gzip, with decoded size and SHA-256 checked before compilation. Offline graph includes bicycle/pedestrian access, excludes driving-only ways, and retains hierarchy/shortcuts. Bicycle costing: hybrid, 15 km/h. Pedestrian: 5.1 km/h; user-point radius 30 m, station radius 50 m, search cutoff 100 m, station bridge matching excluded. Geometry endpoints add short walking access; gaps over 100 m are rejected. Shape scanning retains endpoints rather than the whole decoded polyline. A checked boolean station role passes through the SDK client/worker so the station correlation applies at the origin for the final forward walking leg; omitted roles retain the existing destination-station default. The planner retains the applied destination coordinates, and the UI keeps its applied label through inventory refreshes.

Only `.gph.gz` tiles and `.wasm.gz` engine data are published. Full-tile requests decode explicitly for Pages, validating bounded size, SHA-256 and native GraphId. Range-transport checks remain unchanged; this deployment uses individual tiles. Graph manifest/config retain upstream archive descriptors for provenance; `graph.tar` is not published or used. Do not use archive transport against this deployment.

One initialization promise prevents duplicate workers. Tile memory budget: 96 MiB; WASM initial 64 MiB, maximum 512 MiB; 2,048 direction/mode/coordinate/station-role-keyed estimates in LRU order. HTTP assets cache across visits under host policy; decoded/native caches are session-local. Eleven serial routes (five pickup walks, five rides, one destination-station-to-point walk) avoid loading multiple workers. Diagnostic route samples are disabled in normal use, bounded to ten when explicitly enabled.

## Publication

A staged build replaces only a marked generated site. UI/module/configuration/worker/WASM URLs share a content revision that includes public data. Bootstrap data uses that revision; binary counts and graph releases have content-addressed paths. This avoids mixing cached modules/configuration/datasets after deployment. No service worker is installed.

Publication copies only source, owning docs, small public inputs/provenance and generated site. It removes legacy files and stale assets, excludes diagnostics, checks known local credentials and GitHub's per-file size limit. Deleting files does not erase previous Git commits. Offline raw inputs, SQLite, SDK cache and environments are ignored.
