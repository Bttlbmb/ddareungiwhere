# Static deployment: 따릉이 Where?

Prototype prepared 2026-10-01 for https://github.com/Bttlbmb/ddareungiwhere. The browser calculates routes and reads compact archive counts; a separate Cloudflare Worker owns the Seoul credential. The localhost app remains available.

## GitHub Pages

A public repository works with GitHub Free. A private repository requires a plan supporting private-repository Pages; its published website is ordinarily public. See [GitHub's documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

The publication checkout contains an explicitly selected source set and generated `docs/` site. Never upload this entire working folder: it contains ignored credentials, downloaded sources and local analysis. In the repository choose **Settings → Pages → Deploy from a branch → main → /docs → Save**. Expected URL: https://bttlbmb.github.io/ddareungiwhere/. HTTPS is required for browser GPS. Relative asset and data URLs support this project subdirectory.

`docs/config.json` contains a public Worker endpoint, never a key. Its initial `liveUrl` is null, so the prototype shows unknown live counts while routing and historical comparisons work.

## Cloudflare, step by step

1. Create an account at https://dash.cloudflare.com/sign-up and verify your email. You do not need a domain or a paid Workers plan for this prototype. SQLite Durable Objects are supported on the free plan; see [Cloudflare's documentation](https://developers.cloudflare.com/durable-objects/).
2. Open **Workers & Pages** once to finish any initial account setup. We deploy the prepared Worker from this computer so its shared refresh coordinator and storage binding are created together. An ordinary dashboard Hello World worker alone does not include those bindings.
3. Authorize the installed Cloudflare deployment tool with `wrangler login`. Complete the Cloudflare login/authorization page yourself. Do not put Cloudflare tokens or the Seoul key in GitHub or chat.
4. From this project, deploy with `wrangler deploy --config worker/wrangler.jsonc`. It creates `ddareungiwhere-live`, its SQLite-backed `INVENTORY` coordinator, and a `workers.dev` address. No Seoul credential is needed to deploy the unavailable-count state.
5. In Cloudflare select **ddareungiwhere-live → Settings → Variables and Secrets → Add**, choose **Secret**, name it `SEOUL_OPEN_DATA_API_KEY`, paste the existing key yourself, and deploy/save the change. Only do this after a supported secure Seoul endpoint is established. [Secret storage documentation](https://developers.cloudflare.com/workers/configuration/secrets/).
6. Set `SEOUL_API_BASE` to the verified HTTPS base address. It is restricted to `openapi.seoul.go.kr`; foreign hosts, HTTP, redirects and credentials in configuration URLs are rejected. Do not disable TLS certificate validation.
7. Visit the Worker's `/api/live` endpoint. A complete snapshot must contain station quantities and their original fetch times. Check the result in the GitHub Pages app too: its request origin must be `https://bttlbmb.github.io`.
8. Rebuild with `--live-url https://ddareungiwhere-live.YOUR-SUBDOMAIN.workers.dev/api/live`, then publish the new generated `docs/`. The Worker address is public; the key remains a Cloudflare secret.

**Current live-count blocker:** Seoul documents HTTP port 8088. A credential-free HTTPS handshake to that port failed on 2026-10-01. This is evidence about the tested endpoint, not proof that Seoul has no secure alternative. The Worker intentionally has no HTTP fallback. Until a supported HTTPS endpoint is verified, live counts stay unavailable. Contact the provider or establish another approved secure data source before enabling the secret. Cloudflare protects storage of a secret, but cannot encrypt a connection to an HTTP-only origin.

The initial upstream request budget is **1,000 page requests per Seoul day**, a protective default, not a verified Seoul account quota. A citywide refresh currently takes about four page requests; adjust the budget after checking your account. All visitors share one refresh at most once per minute. The endpoint is public; CORS is a browser restriction, not authentication. Shared throttling and the daily budget limit upstream consumption even for direct callers.

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

It checks the SDK-pinned revision, reads the saved PBF and generates an immutable release with hashes. It excludes vehicle-only edges while retaining walking/bicycle access and hierarchy. Do not remove all OSM `highway` tags: that tag also describes streets, cycleways and footpaths. Graph files are complete native tiles fetched on demand; short routes can still load a large tile. The optional `--flat` trial produces `flat.json`, leaving `current.json` unchanged.

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

Run the existing Python and frontend suites plus `node --test tests/test_static.mjs`. See [REVIEW.md](project-notes/REVIEW.md) for dated measurements. The prototype has been exercised in the desktop browser; physical iPhone/Android routing performance is still unverified. First-use routing downloads and memory are the main static-hosting tradeoff. GitHub Pages does not promise to serve precompressed `.gz` siblings through content negotiation; do not use local-preview timings as internet download measurements.

Public data attribution is retained: Seoul Open Data Plaza for station/count/archive information; © OpenStreetMap contributors, [ODbL](https://www.openstreetmap.org/copyright) for the routing graph and street geometry. Native graph tiles and street shards are distributed as derived OSM data. Third-party runtime notices are bundled. Raw rental records, local SQLite, provider extracts and credentials are excluded.
