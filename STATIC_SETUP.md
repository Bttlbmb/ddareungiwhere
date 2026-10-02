# Static build and GitHub Pages

Current setup, 2026-10-01. The deployed app needs no API key, Cloudflare, backend or paid domain.

## Preview

In a clone, `docs/` is ready to serve:

```sh
python3 scripts/preview_static.py --directory docs --port 63463
```

In the source workspace, preview a generated build with `--directory dist/site`. Use the HTTP URL printed by the script. Python 3.11+; no package install for preview. Internet is still required for initial public assets, live quantities and background tiles. Supported browsers need ES modules, WebAssembly, DecompressionStream and Web Crypto; HTTPS is required for hosted GPS.

## Build from retained local inputs

Required files (not downloaded by these commands):

- `data/inputs/stations.json`, `routing-coverage.json`: small public seeds included in source.
- `data/processed/availability.sqlite3`: availability-only database.
- `data/processed/seoul_streets.json.gz`: named-road extract.
- `data/processed/browser-routing/current.json` and its release folder: pinned graph.
- Unpacked `valhalla-browser@0.2.1` package, including `dist`, LICENSE and licenses.

For the SDK, download/unpack the pinned npm package once into an ignored cache; this workspace already has it at `.cache/valhalla-sdk/`. For a fresh checkout:

```sh
mkdir -p .cache/valhalla-sdk
npm pack valhalla-browser@0.2.1 --pack-destination .cache
tar -xzf .cache/valhalla-browser-0.2.1.tgz -C .cache/valhalla-sdk --strip-components=1
```

Then:

```sh
python3 -B scripts/build_static.py --sdk .cache/valhalla-sdk/dist --months 6
python3 scripts/preview_static.py --directory dist/site --port 63463
```

The SDK identity/WASM hash and every local patch are checked. Unexpected upstream code fails the build. `--history-db PATH` selects another dedicated archive; `--output PATH` selects a dedicated generated directory. The optional `--graph-url` must point to a compatible HTTPS manifest whose gzip tiles/config are accessible with CORS. Standard build publishes the graph inside the page.

## Availability updates / six months

Download complete original CP949 availability ZIP/CSV sources from the source catalogue in DATA_SOURCES, retain fingerprints/provenance, then list **all archives to retain** (repeat `--archive`):

```sh
python3 -B scripts/import_availability.py --archive data/raw/availability_2025_q4.zip
# For six months, also pass the other complete quarterly/monthly archives.
python3 -B scripts/build_static.py --sdk .cache/valhalla-sdk/dist --months 6
```

Importer replaces the availability-only database; it does not append implicitly, download files or read rental history. Duplicate station/date/hour observations deduplicate; conflicting quantities reject the build. Six months means the six calendar months ending in the latest supplied archive month, not six months ending today. Current input is only Q4 2025. The browser receives the same fixed 48 cells/station regardless of window length. The original dataset’s hourly measurement semantics remain unconfirmed.

## Streets and routing updates

Rebuild labels from an existing saved Overpass response:

```sh
python3 -B scripts/import_streets.py
```

`--source PATH` selects a deliberate replacement `.json`/`.json.gz` source. Query and provenance are retained; no geocoder call or map download occurs.

Graph rebuild is optional, costly and unrelated to ordinary code/docs updates. Supply `data/raw/seoul-routing.osm.pbf`; install `requirements-routing.txt` in a separate compatible Python environment, preserving the exact native 3.8.3 revision. Then run `scripts/build_browser_graph.py` there, or pass `--native-lib PATH` for that package directory. Driving-only ways are excluded, with pedestrian/bicycle connectivity, hierarchy and shortcuts retained. Do not remove OSM `highway=*` indiscriminately: that tag also includes residential roads, cycleways and footpaths. New graph/SDK revisions require native/browser parity and route-edge checks before publishing.

Generate a local diagnostic page with the matching native package:

```sh
python3 scripts/check_browser_routes.py --native-lib PATH_TO_NATIVE_383
```

Open `/__routing_check.html` on the local preview. This diagnostic is excluded from publication. Automated checks:

```sh
python3 -B -m unittest discover -s tests -v
node --test tests/test_frontend.cjs tests/test_static.mjs
```

## Publish

### Search metadata and Search Console

Approved 2026-10-02. `web/index.html` owns the page title, meta description, public Google site-verification tag and absolute canonical URL, `https://bttlbmb.github.io/ddareungiwhere/`. Keep the verification tag present after initial verification. `web/sitemap.xml` lists the English homepage and Korean `/ko/` entry; the build copies it into the generated site and the publisher includes it in `docs/`. Update canonical/alternate URLs, the Korean builder URL and sitemap if the public address changes. No route/data assets are sitemap entries, and no `lastmod` date is claimed.

After publishing, verify the URL-prefix property `https://bttlbmb.github.io/ddareungiwhere/` in Search Console, submit `https://bttlbmb.github.io/ddareungiwhere/sitemap.xml`, and inspect/request indexing for both language entry URLs. These files support verification and discovery; they do not confirm indexing, ranking or traffic. A project-level `robots.txt` is ineffective because crawlers read that file at the host root, `https://bttlbmb.github.io/robots.txt`. References: [Google ownership verification](https://support.google.com/webmasters/answer/9008080?hl=en), [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [robots location rules](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt).

The bilingual alternate links follow [Google’s localized-page guidance](https://developers.google.com/search/docs/specialty/international/localized-versions): both entries include the same fully qualified language alternatives.

### Localization maintenance

`web/index.html` remains the English source. Annotated `data-i18n` text and `data-i18n-aria-label` / `data-i18n-content` attributes reference English keys in `web/i18n.json`. Keep placeholder names identical. The standard builder embeds the Korean catalog and generates `ko/index.html` after asset revisioning; both languages share the same runtime/data assets. Edit source/catalog rather than generated Korean HTML. Run the normal Python/Node checks and inspect both desktop/phone layouts after copy or layout changes.

The 2026-10-02 street importer retains `name:ko` / local Korean road names in the existing extract/shards. Re-importing the retained, manifest-checked Overpass input is sufficient; no new map download or routing rebuild is required. Older extracts remain readable but cannot supply omitted Korean names.

### Publication checkout

GitHub Pages is configured for `main` → `/docs`. In this source workspace the separate SSH Git checkout is `dist/publication`:

```sh
python3 scripts/prepare_publication.py dist/publication
# Review, commit and push changes in that checkout.
```

The publisher removes obsolete server/Worker code, replaces generated assets, excludes raw/database/diagnostic files and scans known ignored local credential values. It does not commit or push. In a single checkout, generate the page in `docs` and review/commit source and that directory together; preserve `.nojekyll` and relative URLs. [GitHub Pages availability](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) depends on the account plan: GitHub Free supports public repositories; eligible paid plans also support private repositories.

An earlier Cloudflare Workers Builds connection is unnecessary. Disconnect that repository build in Cloudflare, and delete the unused Worker if desired, using the account’s web interface. Removing Worker files here does not change the cloud account; leaving the Git integration attached can cause failed builds after these removals. No secret needs to be configured anywhere for the current feed.
