# 따릉이 Where?

A static Seoul public-bike station comparison page: choose a starting point, destination and pickup time, then compare five nearby departures by bikes now, walking/cycling estimates and a separate historical no-bike signal.

**[Open the app](https://bttlbmb.github.io/ddareungiwhere/)** · Source: [Bttlbmb/ddareungiwhere](https://github.com/Bttlbmb/ddareungiwhere).

The page runs entirely in the browser. GitHub Pages serves the assets; Valhalla calculates routes on the device. Live counts come directly from the official bike website’s HTTPS feed without a key. There is no Python application server, Cloudflare dependency, account system or runtime database.

## Use

1. Select points on the map, choose a Popular route or use Current location for a one-time origin fix.
2. Choose bike pickup time in Seoul time, now through seven days ahead. Walking does not shift pickup.
3. Press **Compare stations**. All five departures share the same return station.
4. **Back to map** edits the journey; **Refresh bikes** updates counts without rerouting.

Draft edits never compare automatically. Reports expire after two minutes; unknown is not zero. Later pickup uses archived hourly zeros, not a forecast that an empty station will refill. The dashed A–B line is a straight guide. Historical coverage is currently **October–December 2025**, despite a six-month export window. See [SPEC.md](SPEC.md) for exact rules.

## Preview and maintain

A Git clone already includes the published page in `docs/`. With Python 3.11+:

```sh
python3 scripts/preview_static.py --directory docs --port 63463
```

Open the printed HTTP URL. To preview a new local build, use `--directory dist/site`. Do not open `web/index.html` as a file: the build supplies modules, compressed data and routing assets.

Source lives in `web/`; standard-library Python scripts prepare public data offline. Building requires separately retained map, street and availability inputs plus the pinned browser SDK. They are ignored local assets, not automatically downloaded by a checkout. [STATIC_SETUP.md](STATIC_SETUP.md) documents build, data update and publication commands.

```sh
python3 -B -m unittest discover -s tests -v
node --test tests/test_frontend.cjs tests/test_static.mjs
```

Node is required only for checks. `requirements-routing.txt` is needed only when rebuilding the routing graph or checking native/browser parity. Ordinary preview and availability/street exports require no Python packages.

## Documentation

| Document | Owns |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Project guidance and protected behavior |
| [SPEC.md](SPEC.md) | Product rules and acceptance criteria |
| [DESIGN.md](DESIGN.md) | Approved appearance, branding and copy |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Modules, formats, caches and boundaries |
| [STATIC_SETUP.md](STATIC_SETUP.md) | Rebuild, preview and publication |
| [DATA_SOURCES.md](DATA_SOURCES.md) | Provenance, coverage and measurement limits |
| [DECISIONS.md](DECISIONS.md) | Rationale and superseded choices |
| [plan.md](plan.md) | Remaining work, not implementation instructions |
| [REVIEW.md](REVIEW.md) | Dated verification and measurements |

Bike data: [Seoul Bike](https://www.bikeseoul.com/) / [Seoul Open Data Plaza](https://data.seoul.go.kr/). Maps: [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), [Leaflet](https://leafletjs.com/). Routing: [Valhalla](https://github.com/valhalla/valhalla), [valhalla-browser](https://github.com/tobilg/valhalla-wasm). Retain bundled licenses and attribution. Background tiles are ordinary interactive requests under the [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).
