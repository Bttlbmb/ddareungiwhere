# Architecture

Current implementation, reconciled 2026-09-30. Product behavior belongs in [SPEC.md](SPEC.md); visual choices in [DESIGN.md](DESIGN.md); reasons and superseded choices in [DECISIONS.md](DECISIONS.md).

## Small local stack

The browser uses plain HTML, CSS and JavaScript with vendored Leaflet 1.9.4. A Python standard-library HTTP server serves the interface and JSON API. SQLite retains processed history; runtime comparisons read only archived availability counts. Valhalla 3.9.0 runs inside Python through `pyvalhalla`, reading a local OpenStreetMap routing graph. No npm build, frontend framework, Docker container, separate routing service, or Kakao routing account is required to run the current app.

```text
Browser: web/index.html + app.js + style.css + Leaflet
  ├─ ordinary OSM background tiles → internet
  └─ localhost JSON API → app.py
       ├─ Inventory → saved station locations + Seoul live API
       ├─ Planner → read-only SQLite availability counts
       ├─ StreetNames → local named-road geometry
       └─ LocalRoutes → local Valhalla graph, bicycle + pedestrian
```

The server binds to `127.0.0.1` and accepts localhost/127.0.0.1 Host headers. This is a personal local application, not a deployed multi-user service. The repository is currently a folder without Git metadata. Downloaded data and the installed environment must be transferred or rebuilt separately if moving machines; source files alone are insufficient.

## File responsibilities

| File | Responsibility |
| --- | --- |
| `app.py` | HTTP/static serving, live inventory adapter, pickup validation, station shortlist, archive counts |
| `routing.py` | Lazy local Valhalla engine, bicycle/pedestrian estimates, endpoint matching, bounded per-engine route cache |
| `streets.py` | Local named-street lookup with packed coordinates/cell IDs |
| `web/app.js` | Draft journey, map/results views, selection, asynchronous response guards, freshness, result rendering |
| `web/style.css`, `web/index.html` | Responsive layout, design tokens, accessible controls |
| `web/assets/looking-wheels.svg` | Approved native vector logo |
| `scripts/import_data.py` | Validated history import, fingerprints and atomic database publication |
| `scripts/compress_data.py` | Verified lossless gzip compression and manifest updates |
| `scripts/import_streets.py` | Compact named-road extract for local labels |
| `scripts/build_routes.py` | Build Valhalla tiles from the saved PBF; does not download a map |
| `scripts/popular_routes.py` | Generate five filtered, non-overlapping shortcuts from deduplicated trips |
| `tests/` | Python integration/unit checks and Node browser-logic regressions |

## Requests and browser state

| Endpoint | Behavior |
| --- | --- |
| `/api/bootstrap` | Saved stations, existing in-memory inventory snapshot, dataset metadata, popular routes and server time. Does not start a live fetch. |
| `/api/place-label?lat=…&lng=…` | Local street label; no external reverse geocoder. |
| `/api/plan` | Validate points/pickup; select five stations; read cached archive counts; calculate five cycling and five walking estimates; start a throttled live refresh. |
| `/api/live` | Start a throttled inventory refresh and return its current snapshot/status. |
| `/api/live?refresh=0` | Read snapshot/status only. Used to finish a user-initiated refresh. |

Plan parameters are origin/destination latitude and longitude, `pickup` (`now` or ISO datetime), and `count=5`. Optional `return`/`departure` values are internal station IDs. Only count 5 is supported. A departure override outside the nearest five replaces the farthest candidate, retaining five rows; return overrides set the one shared return. API coordinate validation covers a broader region than the routing graph, so a valid point can still have unavailable routes.

Local browser API calls have a 30-second timeout with retryable errors; this does not cancel a running server route calculation. JSON responses use compact separators. Snapshot freshness is calculated in the browser; only compared departures receive server-side freshness checks.

The frontend keeps draft edits separate from the applied comparison. Moving pins, shortcuts, GPS, times and map station choices does not submit. Request counters protect against late address, GPS and comparison responses. Explicit Compare changes to results; late responses cannot undo Back to map. Inventory refresh redraws counts without querying history or recalculating routes. A local timer expires reports without a network request. Snapshot polling runs only while completing an explicit live refresh, not as a collector.

## Live inventory

Ignored saved `live_*.json` extracts seed station coordinates and names. Their old counts are discarded, never presented as live. The current extract has 2,735 stations. Internal live IDs (`ST-…`) and visible station numbers are retained separately; historical availability is joined by station number, rental history by mapped station ID. A station-master continuity audit remains open.

The API key comes from the environment or ignored `.env.local`; only the server uses it. Refreshes run in a background thread, with one active refresh and a minimum 60 seconds between attempts. Each page requests up to 1,000 records. A usable paginated list must reach a terminal `INFO-200`; overlapping or incomplete pages are rejected. A successful complete citywide refresh is published atomically. Known stations missing from that refresh have unknown counts, not zero.

Each page receives a fetch timestamp because the provider supplies no observation timestamp. Pages are not simultaneous measurements. Reports expire after 120 seconds. Errors preserve locations and other functionality, but expired counts become unavailable even if a new fetch fails or hangs. Credential-bearing URLs are not logged; redirects are disallowed. The tested provider connection uses HTTP port 8088, with secure transport and account quota still unresolved.

## History and import

`planner.sqlite3` contains:

- `trips`: directed endpoints, a 16-byte whole-trip fingerprint, pickup timestamp, reported minutes, elapsed minutes and recorded distance.
- `availability`: station number, date, hour, weekday flag and archived quantity, keyed by station/date/hour.
- `meta`: dataset/import metadata.

The derived database does not store a stable bicycle/rider identifier or demographics. Raw public downloads can contain those fields. Eligibility requires mapped endpoints, valid timestamps, positive reported/elapsed duration and a difference below one minute. Long rentals are retained. Popular-route generation and offline audit checks deduplicate the fingerprint. Runtime pair summaries, pooled medians and fastest-rental screening were removed because they no longer serve the interface. The retained trip table permits later offline analysis; it is not read on comparisons.

The importer chooses the newest three original CP949 monthly trip files, plain CSV or losslessly gzipped, rejecting duplicate representations. It currently recognizes the optional `availability_2025_q4.zip`; another quarter requires extending the import configuration. File hashes, bytes, names and importer/schema versions govern invalidation. It builds a temporary database and atomically replaces the published one. Read-only application connections close explicitly. Restart after a dataset replacement to reload metadata and invalidate caches.

Historical risk uses each station's own recorded dates at the selected hour and weekday/weekend group; missing dates are excluded. SQL returns only observation and zero counts for each station. Unused common-date intersections and raw day arrays are no longer built or sent. No model forecasts a refill after a present zero.

## Routing and labels

The graph covers latitude 37.395–37.745 and longitude 126.735–127.245. All 2,735 saved stations are inside these bounds; this does not guarantee correct access paths at every station. `coverage.json` records bounds, source checksum and retrieval/build provenance. Routing loads lazily and serializes access to a shared actor. Cycling uses a city bicycle at 15 km/h; walking uses pedestrian costing at 5.1 km/h. Pickup time does not change these estimates.

Walking considers nearby origin edges and excludes bridge edges when matching the destination station; bridges remain traversable. Short gaps between coordinates and mapped route endpoints are added at walking pace, with a maximum gap of 100 m. This is approximate access, not a verified footpath. Actual network detours are retained. The outstanding exact-origin Oksu pier issue is in [plan.md](plan.md). Walking and cycling failures are independent and display a dash. No route geometry is shown; A–B is a straight guide.

Street labels use a separate named-road extract, indexed in 0.005-degree cells and searched within 250 m. Coordinates are packed doubles, cell references are packed integer IDs, and repeated names are interned; lookup uses the same projection, precision and tie order. Beyond 35 m the label uses “Near”. This is a vicinity label, not a postal address. Coordinates are not persisted as personal location history. Map tiles still go to the external tile provider.

## Speed, storage and boundaries

| Cache | Limit | Persistence |
| --- | ---: | --- |
| Archive counts by sorted station numbers/hour/day group | 128 keys | Memory |
| Routed coordinate pair + travel mode | 2,048 keys total | Memory |

Successful routes share the route-cache capacity across both modes. Each engine owns its cache, so cached methods do not retain unrelated engine instances. Graph/dataset updates require a restart. The old Kakao disk cache is retained as historical evidence and is not consulted at runtime. Current route caching does not persist across restarts. A cold comparison calculates routes sequentially within its request; speed measurements from before routing was added must not be treated as current full-request benchmarks.

Most storage is historical data, not the interface or routing engine. See [REVIEW.md](REVIEW.md) for measured sizes. Imports temporarily need a second database. Graph builds use two workers and are not an atomic map swap; map acquisition and safe replacement are manual maintenance work, not an automated update pipeline.

Only explicit static paths are served. APIs and local assets use `Cache-Control: no-store`, correct MIME types and `nosniff`; raw files, keys and arbitrary workspace paths are not served. This avoids stale development assets and the unstyled `file://` launch problem. OSM tiles use normal browser caching and visible attribution; no offline tile harvesting is implemented.

There are no accounts, billing, analytics, journey persistence, automatic data downloads, scheduled collectors or production deployment. Current weaknesses and proposed optimizations belong in [plan.md](plan.md), not implicit requirements for a rewrite.

## Static browser prototype — 2026-10-01

`web/static/start.mjs` loads public configuration and installs a browser implementation of the existing API contract before loading the shared interface. `planner.mjs` selects stations and looks up compact historical counts; `streets.mjs` lazily fetches 87 coarse shards while preserving the original fine-cell ordering; `routes.mjs` runs Valhalla inside a dedicated Web Worker. `service.mjs` coordinates explicit comparisons/live refreshes. Bootstrap does not contact the provider; route and history work stays on the device. The original Python deployment remains supported.

`scripts/build_static.py` exports an explicit public allowlist to `dist/site`: normalized station locations, precomputed shortcuts, 48 observation/zero pairs per historical station, street shards, shared interface, SDK and a pinned graph. It excludes the raw inventory, key, SQLite and individual rental records. Public URLs reject credentials and insecure non-local endpoints. Assets use relative paths for a GitHub Pages project URL. Optional gzip siblings work with the local preview server; Pages compression is host-dependent.

The browser SDK is pinned to `valhalla-browser@0.2.1` / Valhalla 3.8.3 revision `a60c7cbfc83e073f50887cd27e0109d02e6b64e5`. A separate 3.8.3 builder generates compatible immutable tiles from the saved PBF without replacing the local 3.9.0 graph/environment. The SDK wrapper is patched to preserve pedestrian endpoint matching and permit full-tile delivery on ordinary static hosts and bounded decompression of explicit `.gph.gz` files; bounded decoded size, SHA-256 and native GraphId validation remain. Indexed-tar range validators are untouched. SDK/native dependency licenses are retained. Bicycle costing is the SDK-supported `hybrid` at 15 km/h; the native application's `city` value is not exposed by that SDK.

Routing fetches complete tiles on demand, with a 96 MiB decoded-tile budget and a 64 MiB initial/512 MiB maximum WASM heap. These are separate budgets, not a total device-memory limit. Routes execute sequentially and successful coordinate/mode estimates use a 2,048-entry cache. A failed estimate does not suppress the other mode. HTTP tile caching can survive reloads; decoded/native caches are session-local.

The Cloudflare Worker accepts only GET `/api/live` and shares citywide refreshes through a single SQLite Durable Object. Its default `seoul-website` source posts a fixed ALL request to the official HTTPS station-map endpoint without credentials or cookies, sums the three bike categories, discards session metadata and stamps receipt time. It rejects unsuccessful/non-ALL replies, duplicate/invalid station rows and fewer than 2,500 rows (a dated partial-response guard). Malformed quantities remain unknown. The optional `seoul-openapi` adapter preserves per-page timestamps and rejects incomplete/overlapping pages; it still requires verified HTTPS transport before secret configuration.

Refresh admission is serialized, attempts are at least 60 seconds apart, and a protective 1,000-request Seoul-day budget limits direct callers too; it is not a verified provider quota. Short edge caching never resets freshness. Browser origin is restricted to `https://bttlbmb.github.io`; CORS is not caller authentication. Errors are sanitized, observability is disabled, transport is HTTPS-only and redirects are rejected. Failed refreshes preserve old quantities/timestamps so expiry remains enforced.

`scripts/import_availability.py` accepts explicit availability archives independently of trips, rejects conflicting duplicate station/date/hour counts and atomically publishes a dedicated database plus monthly sufficient statistics. Static export defaults to six calendar months ending in the latest archived month; only actually downloaded months contribute. See [STATIC_SETUP.md](STATIC_SETUP.md) for the account/deployment walkthrough and current blockers.

Publication generates a repository-root Wrangler configuration from `worker/wrangler.jsonc`, changing only the relative entry-point path. Dashboard builds work with either the repository root or the Worker directory as their working directory, without independent configuration copies to keep in sync.
