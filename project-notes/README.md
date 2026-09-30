# 따릉이 Where?

A small localhost app for choosing a Seoul 따릉이 departure station. Set a starting point, destination and bike pickup time; compare five nearby stations by **bikes now, walk time, estimated ride time, and current availability or historical no-bike risk**. Cycling and walking estimates use local Valhalla/OpenStreetMap; current bikes come from Seoul Open Data Plaza.

Documentation reconciled **2026-09-30** against the conversation and current implementation. Older drafts are archived; known problems and unfinished decisions are recorded explicitly rather than treated as completed work.

## Static deployment prototype

A browser-only export is now available alongside the local app. It calculates Valhalla routes on the device and reads a compact historical summary. A Cloudflare proxy is configured for the official bike website’s HTTPS station feed without an API key, but its deployed upstream connection currently fails; live counts remain unavailable. See [STATIC_SETUP.md](STATIC_SETUP.md) for build/preview instructions, GitHub Pages and the Cloudflare walkthrough.

## Run the existing workspace

The installed `.venv`, processed history, station extract, street lookup and routing graph are ready locally. From this folder:

```sh
.venv/bin/python -B app.py --port 63462
```

Open **http://localhost:63462/**. If a server already occupies that port, use its existing page or choose another port. Without `--port`, the default is **8767**; `--port 0` chooses a free port and prints the URL. Stop the server with Ctrl+C. It binds to this computer only.

Open the HTTP URL, **not `web/index.html` as a `file://` page**: the app needs its local API and served assets. There is no npm install or frontend build. The existing Python environment pins `pyvalhalla==3.9.0`. Node is only needed for browser-logic tests.

`SEOUL_OPEN_DATA_API_KEY` is already configured in ignored `.env.local`; keep it server-side and out of chat, docs and frontend files. Internet is required for live bike counts and background map tiles. Routing and street labels are local. Kakao is no longer queried and no Kakao key is needed by the current runtime. Failed/expired inventory shows unavailable counts, never an invented zero.

## Use

1. Start with empty origin/destination. Click or drag map pins, choose a popular route, or press **⌖ Current location** for a one-time origin fix. Map station popups can select departure/return points. Street labels are approximate and contain no house numbers.
2. Choose bike pickup time in Seoul time, from now through seven days ahead. **Now**, **In 30min**, and **In 1h** only edit the draft.
3. Press **Compare stations**. Results replace the map in the same panel. Five departures share one return station, chosen nearest the destination unless overridden on the map. Selection uses straight-line proximity; walking estimates do not impose a budget or shift pickup time.
4. Use **Back to map** to edit the same journey, or **Refresh bikes** to update counts without recalculating routes. There are no automatic comparisons, periodic provider fetches or scheduled collectors.

The dashed A–B line is a straight guide, not route geometry. The desktop keeps the planner on the left; phone results replace the planner until Back to map. Long content scrolls inside panels, without an outer scrolling page.

Bike estimates use a city bicycle at 15 km/h; walking uses pedestrian routing at 5.1 km/h. Values are rounded to whole minutes. The graph covers all 2,735 saved station coordinates with a Seoul-area buffer. Routing failures or endpoints outside the map show a dash; OSM data can still cause incorrect access paths. The unresolved exact-origin Oksu pier walking detour is in [plan.md](plan.md).

For pickup within 15 minutes, the last column describes **current availability**: Empty now, Few bikes, Available now or Unknown. Later pickups show **Historical no-bike risk** based on archived hourly zeros. It is not a validated forecast, and a current zero does not tell us whether a bike will return in 30 minutes. Reports expire after two minutes; the app does not show old counts as current or add a “stale report” caption. See [SPEC.md](SPEC.md) for exact thresholds and semantics.

## Documentation map

| Document | What to read / maintain there |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Short instructions for future coding agents: context, protected behavior, checks and documentation ownership |
| [SPEC.md](SPEC.md) | Current user flow, feature semantics, table contents and acceptance criteria |
| [DESIGN.md](DESIGN.md) | Approved brand/logo, Route Ribbon layout, Slate & Teal colors, density, mobile treatment and removed copy |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Components, APIs, data processing, caches, routing, privacy/security boundaries and maintenance |
| [DECISIONS.md](DECISIONS.md) | Why choices were made, user decisions, superseded alternatives and routing/history tradeoffs |
| [plan.md](plan.md) | Completed work, unresolved issues, prioritized next work and deferred ideas |
| [DATA_SOURCES.md](DATA_SOURCES.md) | Source links, local datasets, provenance, access and unresolved measurement questions |
| [REVIEW.md](REVIEW.md) | Current verification, measured storage and limits of earlier benchmarks |
| [DATA_AUDIT.md](DATA_AUDIT.md), [JOURNEY_AUDIT.md](JOURNEY_AUDIT.md), [STATION_COMPARISON_AUDIT.md](STATION_COMPARISON_AUDIT.md) | Dated research evidence, not current UI requirements |
| [MAPS_AND_WALKING.md](MAPS_AND_WALKING.md) | Current mapping/routing status and pointers to older provider research |
| [Trial evidence](docs/evidence/README.md), [earlier drafts](docs/archive/2026-09-30-pre-reconciliation/README.md) | Retained comparisons and historical context |

For a new Codex conversation, start from **this workspace root** and ask it to read `AGENTS.md`, this README and the documents relevant to the next task. The docs carry project context; a new conversation should not be assumed to remember this transcript. The root guide also tells agents to keep affected documents current and distinguish implemented behavior, approved choices, proposals and measured evidence.

The optimization pass removed hidden rental calculations and old layout styles, reduced comparison payloads, and lowered the street index memory footprint. See [REVIEW.md](REVIEW.md#optimization-pass--2026-09-30) for measurements and [plan.md](plan.md) for remaining priorities.

## Local data and updates

Current trip history is **April–June 2026**, the latest three complete downloaded months in the catalogue inspected on September 30. It is not the previous 90 days. Availability history is **October–December 2025**. There is no automatic publication monitor or download job. Raw/processed rental history remains available for offline analysis and Popular routes. Unused runtime rental-summary calculations were removed.

Rebuild history from already downloaded sources:

```sh
.venv/bin/python -B scripts/import_data.py
.venv/bin/python -B scripts/popular_routes.py
```

The importer selects the newest three `data/raw/trips_YYYYMM.csv` or `.csv.gz` files. Supply complete original CP949 monthly downloads and retain only one representation per month. It currently imports the optional `availability_2025_q4.zip`; support for another availability archive needs an explicit update. Provenance is in `data/manifest.json`, and transformation totals in `data/processed/planner_import.json`. Rebuild the popular-route shortcuts after a history import; restart the app after replacing the database.

The current import inspected **12,149,891** rows and retained **11,776,397** eligible rows before query-level deduplication. The database is about **1.17 GB**; raw and processed data together occupy about **1.95 GB** in logical file sizes. A history rebuild temporarily requires space for a second database. See [REVIEW.md](REVIEW.md) for the storage breakdown.

For new trip downloads, record source URLs, original hashes and sizes in the manifest. Verified lossless compression can remove redundant originals only after validation:

```sh
.venv/bin/python -B scripts/compress_data.py --remove-originals
```

Without that flag it keeps originals, but duplicate plain/gzip representations must be resolved before import. Compression has already saved **1,566,187,206 bytes** without dropping rows.

Rebuild street labels from the saved source:

```sh
.venv/bin/python -B scripts/import_streets.py
```

For a deliberate replacement, `--source data/raw/seoul_streets_osm.json` selects that file even if an older gzip source exists. Restart afterward. Local lookups never download new streets or send GPS coordinates to an external geocoder.

To recreate the Python environment on a platform with a compatible `pyvalhalla` package, using the same Python 3.14 version as this workspace:

```sh
python3.14 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -B scripts/build_routes.py
```

The route build needs the **saved** `data/raw/seoul-routing.osm.pbf` and coverage metadata; it does not acquire a map. The runtime resolves the graph path against the current workspace, so moving saved tiles does not itself require a graph rebuild. Recreate the Python environment as needed when moving machines. There is no fully automated map-refresh pipeline. Data/runtime directories are ignored by `.gitignore`; this folder currently has no Git repository, so that file alone is not a backup or version history.

## Checks and credits

```sh
.venv/bin/python -B -m unittest discover -s tests -v
node --test tests/test_frontend.cjs
```

Verified on 2026-09-30: **35 Python and 23 browser-logic checks passed**, with no skips in this workspace. These complement the recorded desktop/phone checks; they are not proof of correct routing at every Seoul station. Known issues remain in [plan.md](plan.md).

Bike data: [Seoul Open Data Plaza](https://data.seoul.go.kr/). Map data/tiles: [OpenStreetMap contributors](https://www.openstreetmap.org/copyright); renderer: [Leaflet](https://leafletjs.com/); local routing: [Valhalla](https://github.com/valhalla/valhalla). Preserve source attribution and licenses when distributing assets or data. Background tiles use ordinary interactive viewing under the [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/), without offline downloading or prefetching.
