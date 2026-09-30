# Static deployment: 따릉이 Where?

Prototype prepared 2026-10-01 for https://github.com/Bttlbmb/ddareungiwhere. The browser calculates routes and reads compact archive counts; a separate Cloudflare Worker fetches the official bike website’s HTTPS station feed without a key. The localhost app remains available.

## GitHub Pages

A public repository works with GitHub Free. A private repository requires a plan supporting private-repository Pages; its published website is ordinarily public. See [GitHub's documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

The publication checkout contains an explicitly selected source set and generated `docs/` site. Never upload this entire working folder: it contains ignored credentials, downloaded sources and local analysis. In the repository choose **Settings → Pages → Deploy from a branch → main → /docs → Save**. Expected URL: https://bttlbmb.github.io/ddareungiwhere/. HTTPS is required for browser GPS. Relative asset and data URLs support this project subdirectory.

`docs/config.json` contains the public Worker endpoint `https://ddareungiwhere-live.hey-bf4.workers.dev/api/live`, never a key. The proxy uses `LIVE_SOURCE=seoul-website`; no Seoul secret is needed. The 2026-10-01 deployment succeeded, but its upstream request fails with `website-transport` while the same HTTPS feed works from the maintainer computer. Live counts remain unavailable on the hosted site. This classification does not establish whether the cause is TLS, network filtering or another transport failure. Provider confirmation or a host able to reach the feed is still needed.

## Cloudflare, step by step

1. Create an account at https://dash.cloudflare.com/sign-up and verify your email. You do not need a domain or a paid Workers plan for this prototype. SQLite Durable Objects are supported on the free plan; see [Cloudflare's documentation](https://developers.cloudflare.com/durable-objects/).
2. Open **Workers & Pages** once to finish any initial account setup. For dashboard deployment, choose **Create application → Import a repository**, authorize GitHub for `Bttlbmb/ddareungiwhere`, and select that repository. Set the Worker name to `ddareungiwhere-live`, production branch to `main`, root directory to the repository root (`/`), build command empty, and deploy command to `npx wrangler@4.33.1 deploy --config worker/wrangler.jsonc`. Keep preview/non-production builds disabled. Click **Save and Deploy**. The explicit configuration path creates the Worker and shared storage together. [Dashboard Git integration](https://developers.cloudflare.com/workers/ci-cd/builds/).
3. **Optional Terminal alternative:** open Terminal in this project and authorize the installed Cloudflare deployment tool with `wrangler login`. Complete the Cloudflare login/authorization page yourself. Do not put Cloudflare tokens or the Seoul key in GitHub or chat.
4. For that Terminal alternative, deploy from this project with `wrangler deploy --config worker/wrangler.jsonc`. Both methods create `ddareungiwhere-live`, its SQLite-backed `INVENTORY` coordinator, and a `workers.dev` address. No Seoul credential is needed to deploy the unavailable-count state. The compatibility date uses September 30 to avoid a future date relative to Cloudflare's UTC deployment clock during the October 1 Seoul setup.
5. Leave the Seoul secret unset. The checked-in `LIVE_SOURCE=seoul-website` configuration fetches the official public station map over HTTPS without login, cookies or a key.
6. Visit the Worker's `/api/live` endpoint and check station quantities with original receipt timestamps. The GitHub Pages request origin must be `https://bttlbmb.github.io`.
7. When changing the Worker address, rebuild with `--live-url https://YOUR-WORKER.workers.dev/api/live` and publish the generated `docs/`. The current deployed address is already connected.

**Source and limits:** the official website's fixed `https://www.bikeseoul.com/app/station/getStationRealtimeStatus.do` endpoint accepts `stationGrpSeq=ALL`. Its map code sums legacy, regular QR and smaller 새싹 counts; the proxy does the same. A 2026-10-01 check returned 2,748 unique stations, including all 2,735 saved IDs. This website endpoint lacks a published versioned API contract; format changes or access restrictions can interrupt counts. Failed refreshes retain original timestamps, so expired quantities become unknown. No provider observation time is supplied: `fetched_at` means receipt time. An ALL echo, successful status, unique valid rows and a 2,500-row coverage floor reject obvious partial responses; they cannot independently prove completeness.

The optional `LIVE_SOURCE=seoul-openapi` adapter remains HTTPS-only and requires a supported secure `SEOUL_API_BASE` on `openapi.seoul.go.kr` before adding `SEOUL_OPEN_DATA_API_KEY` as a [Cloudflare secret](https://developers.cloudflare.com/workers/configuration/secrets/). Seoul documents HTTP port 8088; credential-free HTTPS probes failed or timed out. Do not use HTTP or disable certificate validation to enable that adapter.

The upstream budget is **1,000 requests per Seoul day**, a protective default, not a verified provider quota. The website source takes one request per citywide refresh; the optional Open API adapter takes about four pages. All visitors share one refresh at most once per minute, only on explicit compare/refresh actions. CORS is a browser restriction, not authentication. Shared throttling and the daily budget limit consumption even for direct callers.

## Build and preview locally

Obtain the SDK from the npm registry, pinned to `valhalla-browser@0.2.1`, and unpack its `dist` directory. The builder verifies its SDK name and WASM checksum, copies dependency notices and retains the SDK license.

```sh
.venv/bin/python -B scripts/build_static.py --sdk /path/to/package/dist
.venv/bin/python -B scripts/preview_static.py --port 63463
```

Open http://127.0.0.1:63463/. This is an ordinary static-file preview; it does not expose the Python API or load the Seoul key. Only the generated directory is served. Do not open HTML as a file URL.

The browser graph is separate from the existing native graph. To reproduce it, install `pyvalhalla==3.8.3` in a separate environment/directory, keeping the local application's 3.9.0 environment intact, then run:

```sh
.venv/bin/python -B scripts/build_browser_graph.py --native-lib /path/to/separate/site-packages
```

It checks the SDK-pinned revision, reads the saved PBF and generates an immutable release with hashes. It excludes vehicle-only edges while retaining walking/bicycle access and hierarchy. Do not remove all OSM `highway` tags: that tag also describes streets, cycleways and footpaths. Graph files are complete native tiles fetched on demand as explicit `.gph.gz` assets. The wrapper decompresses them with bounded reads and verifies original decoded size, SHA-256 and GraphId. Short routes can still load a large tile. Custom graph hosting must retain the gzip siblings. The optional `--flat` trial produces `flat.json`, leaving `current.json` unchanged.

## Expanding history

The default export selects up to six calendar months ending with the latest archived month. Current input has only October–December 2025; requesting six months does not manufacture or download the missing three months.

For additional explicit availability sources, use the separate importer:

```sh
.venv/bin/python -B scripts/import_availability.py --archive /path/to/availability_quarter1.zip --archive /path/to/availability_quarter2.zip
.venv/bin/python -B scripts/build_static.py --sdk /path/to/package/dist --history-db data/processed/availability.sqlite3 --months 6
```

ZIP/CP949 CSV/gz sources preserve station/date/hour uniqueness. Identical repeats are deduplicated; conflicting counts abort publication. Invalid quantities and missing observations do not become zero. Raw files remain local. The importer also writes station/month/hour/day-group observation and zero totals so future rolling-window assembly can reuse monthly sufficient statistics.

The public summary contains a station index and just 48 `[observations, zero]` pairs per station: 24 hours × weekday/weekend. Six months requires bigger counts, not six times as many browser cells. Recompiling changes the period and coverage metadata. Seasonal drift, holidays and station moves still affect interpretation; these remain descriptive historical bands.

## Verification and limits

Run the existing Python and frontend suites plus `node --test tests/test_static.mjs`. See [REVIEW.md](project-notes/REVIEW.md) for dated measurements. The prototype has been exercised in the desktop browser; physical iPhone/Android routing performance is still unverified. First-use routing downloads and memory are the main static-hosting tradeoff. Graph gzip assets are requested directly, so their compression does not depend on Pages content negotiation. Other `.gz` siblings remain optional server-negotiated assets. Do not use local-preview timings as internet download measurements.

Public data attribution is retained: Seoul Open Data Plaza for station/count/archive information; © OpenStreetMap contributors, [ODbL](https://www.openstreetmap.org/copyright) for the routing graph and street geometry. Native graph tiles and street shards are distributed as derived OSM data. Third-party runtime notices are bundled. Raw rental records, local SQLite, provider extracts and credentials are excluded.

## Publication maintenance

The prepared Git checkout is `dist/publication`, separate from this source workspace. Run `scripts/prepare_publication.py dist/publication` after rebuilding and updating owning documents, inspect its changes, then commit and push there. It verifies the intended HTTPS/SSH remote and scans all candidate public bytes for the locally configured Seoul credential. `docs/` is generated; `project-notes/` contains the maintained source documents.

The publication also includes a generated root `wrangler.jsonc`, derived from the canonical `worker/wrangler.jsonc` with its entry point adjusted. This allows the original dashboard command `npx wrangler@4.33.1 deploy` to work from the repository root too. Regenerate it rather than maintaining two separate configurations. After this file is published, a connected Workers Build can retry without browser access to change its build settings.

For a repeatable native/browser routing check, run `scripts/check_browser_routes.py --native-lib /path/to/separate/site-packages` after building. Open `/__routing_check.html` on the local preview, inspect the visible results and native summaries. This diagnostic page is explicitly excluded from publication.
