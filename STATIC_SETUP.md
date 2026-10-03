# Build, preview and maintain

Reviewed 2026-10-03. The live page runs on GitHub Pages without an API key or application server. These tools are for preparing and checking its files. Data provenance and limits are in [DATA_SOURCES.md](DATA_SOURCES.md); release status is in [REVIEW.md](REVIEW.md).

## Preview

A clone of the published repository includes a usable page in `docs/`:

```sh
python3 scripts/preview_static.py --directory docs --port 63463
```

Open the printed HTTP URL. In this source workspace use `--directory dist/site`; `dist/publication` is the separate Git checkout. Python 3.11+ is supported, with no package install for preview. If `python3 --version` is older, use an installed supported interpreter, such as `python3.14` here.

Live quantities and background tiles need internet access. The browser needs ES modules, WebAssembly, DecompressionStream and Web Crypto; hosted GPS needs HTTPS. Do not open `web/index.html` directly: the build supplies configuration, translations, compressed data and routing assets.

## Build with saved inputs

The build does not download maps or archives. It needs:

| Input | Purpose |
| --- | --- |
| `data/inputs/stations.json`, `data/inputs/routing-coverage.json` | Small public catalogue and map provenance, included in source |
| `data/processed/availability.sqlite3` | Hourly availability archive |
| `data/processed/seoul_streets.json.gz` | Named-road geometry and bilingual labels |
| `data/processed/browser-routing/current.json` and its release folder | Pinned routing tiles and manifests |
| Unpacked `valhalla-browser@0.2.1`, including `dist`, LICENSE and licenses | Browser routing engine |

Raw inputs, processed data and SDK caches are ignored. A new checkout has the ready page but cannot rebuild it until these files are supplied. This workspace retains the SDK at `.cache/valhalla-sdk/`. For a fresh checkout, obtain it once:

```sh
mkdir -p .cache/valhalla-sdk
npm pack valhalla-browser@0.2.1 --pack-destination .cache
tar -xzf .cache/valhalla-browser-0.2.1.tgz -C .cache/valhalla-sdk --strip-components=1
```

Build and preview:

```sh
python3 -B scripts/build_static.py --sdk .cache/valhalla-sdk/dist --months 6
python3 scripts/preview_static.py --directory dist/site --port 63463
```

The builder checks SDK identity, WASM hash and each local patch. Unexpected upstream code stops the build. `--history-db PATH` selects another archive; `--output PATH` selects a dedicated generated directory. An existing output must carry `.nojekyll` before replacement.

`--graph-url` can use a compatible HTTPS manifest with CORS-accessible gzip tiles/config instead of copying local tiles. It still reads the local `current.json`. URLs cannot carry credentials, queries or fragments; HTTP is allowed only for localhost/127.0.0.1 previews. The default build publishes the graph alongside the page.

## Update availability

Download complete original CP949 ZIP/CSV archives from the catalogue linked in DATA_SOURCES. Keep source fingerprints and list **every archive to retain**, repeating `--archive`:

```sh
python3 -B scripts/import_availability.py --archive data/raw/availability_2025_q4.zip
# Add the other complete quarterly/monthly archives for a longer history.
python3 -B scripts/build_static.py --sdk .cache/valhalla-sdk/dist --months 6
```

The importer builds a replacement availability-only database; it does not append, download files or read rental history. Exact duplicate station/date/hour rows deduplicate. Conflicting quantities stop the import and preserve the existing database.

Six months means the six calendar months ending in the latest supplied month, not today. Current inputs cover only October–December 2025. Longer coverage needs additional complete archives. The browser still receives 48 cells per station; archive measurement semantics remain unconfirmed.

## Update streets or routing

Regenerate road labels from the retained Overpass response:

```sh
python3 -B scripts/import_streets.py
```

`--source PATH` selects another `.json`/`.json.gz` response inside the project. Copy external responses into ignored `data/raw/` first. Invalid source/provenance leaves the current extract and manifest intact. Query, timestamps and fingerprints remain recorded. Missing/empty extracts stop the build rather than silently removing labels. Re-importing the retained response supplies Korean names without a new download or routing rebuild; older extracts remain readable but lack those names.

A graph rebuild is optional and costly. Supply `data/raw/seoul-routing.osm.pbf`, then install `requirements-routing.txt` in a separate compatible environment using native Valhalla **3.8.3** at the SDK-pinned revision. Run `scripts/build_browser_graph.py` there, or pass `--native-lib PATH` for that package directory. Python 3.11+ supports the standard tools; the optional native package also needs a compatible wheel/build.

The builder discards its temporary graph archive after recording its identity/index descriptors; individual tiles remain for publication and native checks. The graph excludes driving-only ways but keeps pedestrian/bicycle connectivity, hierarchy and shortcuts. Do not remove all OSM `highway=*` ways: these also include residential roads, cycleways and footpaths. Graph/SDK changes need native/browser parity and route-edge checks. Normal source/docs updates reuse existing tiles.

## Check changes

```sh
python3 -B -m unittest discover -s tests -v
node --test tests/test_frontend.cjs tests/test_static.mjs
```

Node runs the JavaScript checks. For routing/SDK changes, generate fixtures with the matching native package:

```sh
python3 scripts/check_browser_routes.py --native-lib PATH_TO_NATIVE_383
```

Open `/__routing_check.html` in the local preview. It is excluded from publication. Test layout/copy changes in both languages at desktop/phone widths, including focus, Compare placement and results scrolling. Browser emulation does not establish physical-phone performance. Documentation-only changes need link/fact checks, not new tests.

## Language and search metadata

Edit `web/index.html`, `web/i18n.json` and application source, not generated Korean HTML. The builder translates annotated text/attributes and embeds runtime messages. Preserve placeholder names. Both entries share assets and must agree on the capsule's selected language, target link and accessible action. Check both labels, track, Enter, Back/forward and new-tab navigation; switching must retain the journey and pending work.

`web/index.html` owns the title, description, public Google verification tag and canonical URL. Keep the tag after verification. The sitemap lists English and `/ko/`, without invented `lastmod` dates. If the public address changes, update HTML canonical/alternate links, `web/app.js`, the Korean renderer and `web/sitemap.xml`.

After publication, verify the URL-prefix property in Search Console, submit the [sitemap](https://bttlbmb.github.io/ddareungiwhere/sitemap.xml), and inspect both entry URLs. These files support discovery; they do not prove indexing or traffic. A project-level `robots.txt` has no effect because crawlers read it at the host root. References: [ownership verification](https://support.google.com/webmasters/answer/9008080?hl=en), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [localized pages](https://developers.google.com/search/docs/specialty/international/localized-versions), [robots location](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt).

## Prepare publication

Pages serves `main` → `/docs`. In this workspace:

```sh
python3 scripts/prepare_publication.py dist/publication
# Review the full diff, then commit/push the intended release in that checkout.
```

The publisher synchronizes allowlisted source/docs, small public inputs and `dist/site` into the separate checkout. It removes stale assets and legacy server/Worker files, excludes diagnostics, scans retained Seoul Open Data key values from ignored local `.env` files and enforces GitHub's file-size limit. It does not commit, push or change cloud settings. Preserve unrelated work before preparing a checkout; the tool copies a complete release, not selected features.

For a single checkout, build into `docs` and review source and generated files together. Keep `.nojekyll` and relative URLs. For a documentation-only release, reuse the committed site. If other source changes should be excluded, prepare from the published commit in an isolated directory. Record the scope and hosted verification in REVIEW.

[GitHub Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) depends on the account plan. The retired Cloudflare build connection can be disconnected and the unused Worker removed in that account; local file removal does not do this. The current feed needs no secret.
