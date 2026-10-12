# Build, preview, and maintain

The live page runs on GitHub Pages without an API key or application server. These tools are for preparing and checking its files. Data provenance and limits are in [DATA_SOURCES.md](DATA_SOURCES.md); verification status is in [REVIEW.md](REVIEW.md).

## Preview

A clone includes a usable page in `docs/`:

```sh
python3 scripts/preview_static.py --port 63463
```

Open the printed HTTP URL. Python 3.11 or later is required; preview needs no package install. If `python3 --version` is older, install a newer interpreter and use it for every command in this guide.

Live quantities and background tiles need internet access. The browser needs ES modules, WebAssembly (WASM), DecompressionStream, and Web Crypto; hosted GPS needs HTTPS. Do not open `web/index.html` directly: the build supplies configuration, translations, compressed data, and routing assets.

## Build with saved inputs

The build does not download maps or archives. It needs:

| Input | Purpose |
| --- | --- |
| `data/inputs/stations.json`, `data/inputs/routing-coverage.json` | Small public catalogue and map provenance, included in source |
| `data/processed/availability.sqlite3` | Hourly availability archive |
| `data/processed/seoul_streets.json.gz` | Named-road geometry and bilingual labels |
| `data/processed/browser-routing/current.json` and its release folder | Pinned routing tiles and manifests |
| Unpacked `valhalla-browser@0.2.1`, including `dist`, LICENSE, and licenses | Browser routing engine |

Raw inputs, processed data, and SDK caches are ignored. A new checkout has the ready page but cannot rebuild it until these files are supplied. This workspace retains the SDK at `.cache/valhalla-sdk/`. For a fresh checkout, obtain it once:

```sh
mkdir -p .cache/valhalla-sdk
npm pack valhalla-browser@0.2.1 --pack-destination .cache
tar -xzf .cache/valhalla-browser-0.2.1.tgz -C .cache/valhalla-sdk --strip-components=1
```

Build and preview:

```sh
python3 -B scripts/build_static.py --sdk .cache/valhalla-sdk/dist --months 6
python3 scripts/preview_static.py --port 63463
```

The builder checks the SDK identity, the WASM hash, and each local patch. Unexpected upstream code stops the build. `--history-db PATH` selects another archive; `--output PATH` selects another dedicated generated directory instead of `docs`. An existing output must carry `.nojekyll` before replacement.

`--graph-url` can use a compatible HTTPS manifest with CORS-accessible gzip tiles and configuration instead of copying local tiles. It still reads the local `current.json`. URLs cannot carry credentials, queries, or fragments; HTTP is allowed only for `localhost` or `127.0.0.1` previews. The default build publishes the graph alongside the page.

## Update availability

Download complete original CP949 (a Korean text encoding) ZIP or CSV archives from the catalogue linked in DATA_SOURCES. Keep source fingerprints and list **every archive to retain**, repeating `--archive`:

```sh
python3 -B scripts/import_availability.py --archive data/raw/availability_2025_q4.zip
# Add the other complete quarterly or monthly archives for a longer history.
python3 -B scripts/build_static.py --sdk .cache/valhalla-sdk/dist --months 6
```

The importer builds a replacement availability-only database; it does not append, download files, or read rental history. Rows with the same station, date, and hour deduplicate when their quantities match. Conflicting quantities stop the import and preserve the existing database.

Six months means the six calendar months ending in the latest supplied month, not today. Current inputs cover only October–December 2025. Longer coverage needs additional complete archives. The browser still receives 48 cells per station; archive measurement semantics remain unconfirmed.

## Update stations

No script builds `data/inputs/stations.json`; update it by hand. The saved file holds 2,735 stations, sorted by station number. It was normalized on September 30, 2026 from three pages of the Seoul Open Data station list (OA-15493, see [DATA_SOURCES.md](DATA_SOURCES.md)); those saved requests used the Seoul Open Data API, whose address carries a personal key that is not recorded. Each entry has five fields, shaped so that live records match it (`normalized()` in `web/static/live.mjs`):

| Field | Value |
| --- | --- |
| `id` | Integer from the internal `ST-` identifier, such as 4 for `ST-4` |
| `number` | Station number as a string without leading zeros, such as `"102"` |
| `name` | Official Korean name without the number prefix |
| `lat`, `lng` | Coordinates in degrees |

Keep `id` and `number` unique. Nothing validates the file, so check these fields yourself. Then record the new source and its fingerprint in `data/manifest.json`, rebuild, and run both test suites. Renumbering and relocation are not tracked.

## Update streets or routing

Regenerate road labels from the retained OpenStreetMap (OSM) extract downloaded through the Overpass API (default `data/raw/seoul_streets_osm.json.gz`):

```sh
python3 -B scripts/import_streets.py
```

`--source PATH` selects another `.json` or `.json.gz` response inside the project. Copy external responses into ignored `data/raw/` first. An invalid source or provenance record leaves the current extract and manifest intact. The query, timestamps, and fingerprints remain recorded. Missing or empty extracts stop the build rather than silently removing labels. Re-importing the retained response supplies Korean names without a new download or routing rebuild; older extracts remain readable but lack those names.

A graph rebuild is optional and costly. Supply `data/raw/seoul-routing.osm.pbf`, then install `requirements-routing.txt` in a separate compatible environment using native Valhalla **3.8.3** at the SDK-pinned revision. Run `scripts/build_browser_graph.py` there, or pass `--native-lib PATH` for that package directory. Python 3.11 or later supports the standard tools; the optional native package also needs a compatible wheel or build.

The builder discards its temporary graph archive after recording its identity and index descriptors; individual tiles remain for publication and native checks. The graph excludes driving-only ways but keeps pedestrian and bicycle connectivity, hierarchy, and shortcuts. Do not remove all OSM `highway=*` ways: these also include residential roads, cycleways, and footpaths. Graph and SDK changes need native and browser parity and route-edge checks. Normal source and documentation updates reuse existing tiles.

## Check changes

```sh
python3 -B -m unittest discover -s tests -v
node --test tests/test_frontend.cjs tests/test_static.mjs
```

Node (tested with version 26) runs the JavaScript checks. For routing or SDK changes, generate fixtures with the matching native package:

```sh
python3 scripts/check_browser_routes.py --native-lib PATH_TO_NATIVE_383
```

Open `/__routing_check.html` in the local preview. Git ignores it. Test layout and copy changes in both languages at desktop and phone widths, including focus, Compare placement, and results scrolling.

## Language and search metadata

Edit `web/index.html`, `web/i18n.json`, and application source, not generated Korean HTML. The builder translates annotated text and attributes and embeds runtime messages. Preserve placeholder names. Both entries share assets and must agree on the capsule's selected language, target link, and accessible action. Check both labels, the track, Enter, Back and forward, and new-tab navigation; switching must retain the journey and pending work.

`web/index.html` owns the title, description, public Google verification tag, and canonical URL. Keep the tag after verification. The sitemap lists English and `/ko/`, without invented `lastmod` dates. If the public address changes, update the HTML canonical and alternate links, `web/app.js`, the Korean renderer, and `web/sitemap.xml`.

After publication, verify the URL-prefix property in Search Console, submit the [sitemap](https://bttlbmb.github.io/ddareungiwhere/sitemap.xml), and inspect both entry URLs. These files support discovery; they do not prove indexing or traffic. A project-level `robots.txt` has no effect because crawlers read it at the host root. References: [ownership verification](https://support.google.com/webmasters/answer/9008080?hl=en), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [localized pages](https://developers.google.com/search/docs/specialty/international/localized-versions), [robots location](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt).

## Release

Pages serves `main` → `/docs`. Build into `docs`, check the release, then review and commit:

```sh
python3 -B scripts/build_static.py --sdk .cache/valhalla-sdk/dist --months 6
python3 scripts/check_release.py
git status   # review source and generated files together
```

The check reads every file Git would commit. It rejects files named `.env*`, files ending in `.sqlite3`, paths containing `raw`, paths under `data/processed/`, and files of 100 MiB or more. It commits and pushes nothing and changes no cloud settings. Keep `.nojekyll` and relative URLs. Any change under `web/` or to the public data changes the asset revision in `docs/`, so commit the rebuilt output with its source. For a documentation-only release, leave `docs/` unchanged. After hosted verification, update the publication status in REVIEW.

[GitHub Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) depends on the account plan. The current feed needs no secret.
