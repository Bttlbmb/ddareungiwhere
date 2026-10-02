# 따릉이 Where?

A Seoul public-bike trip planner: choose a starting point, destination and bike pickup time, then compare five nearby departure stations by current bike counts, walking/cycling estimates and historical no-bike risk.

**[Open the app](https://bttlbmb.github.io/ddareungiwhere/)** · Source: [Bttlbmb/ddareungiwhere](https://github.com/Bttlbmb/ddareungiwhere).

The page runs entirely in the browser. GitHub Pages serves the assets; Valhalla calculates routes on the device. Live counts come directly from the official bike website’s HTTPS feed without a key. There is no Python application server, Cloudflare dependency, account system or runtime database.

## Use

1. Select points on the map or use **Current location** to set your starting point.
2. Choose bike pickup time in Seoul time, now through seven days ahead. Walking does not shift pickup.
3. Press **Compare stations**. All five departures share the same destination station; **Your destination.** shows its walk to your destination.
4. **Back to map** returns to the map, where you can edit the journey. **Refresh bikes** updates counts without rerouting.

Draft edits never compare automatically. Displayed counts stay as the last fetched snapshot until comparison or Refresh bikes updates them; unknown is not zero. For pickup more than 15 minutes ahead, historical risk describes how often the station had no bikes at that hour in the archive. It does not predict when an empty station will refill. The dashed A–B line is a straight guide, not a cycling route. Historical coverage is **October–December 2025**; the six-month export option needs additional source months. See [SPEC.md](SPEC.md) for exact rules.

The mint **ENG / 한국어** capsule in the header switches between English and [한국어](https://bttlbmb.github.io/ddareungiwhere/ko/). Click either label or anywhere on its track to toggle; keyboard Enter works too. Switching updates the language and URL without reloading or changing the journey. Both entry URLs share the same assets.

## Preview and maintain

A clone of the published repository includes the page in `docs/`. With Python 3.11+:

```sh
python3 scripts/preview_static.py --directory docs --port 63463
```

Open the printed HTTP URL. In this source workspace, use `--directory dist/site` to preview the local build; the separate publication checkout is `dist/publication`. Do not open `web/index.html` as a file: the build supplies modules, compressed data and routing assets.

Source lives in `web/`; standard-library Python scripts prepare public data offline. Building requires separately retained map, street and availability inputs plus the pinned browser SDK. They are ignored local assets, not automatically downloaded by a checkout. [STATIC_SETUP.md](STATIC_SETUP.md) documents build, data update and publication commands.

[REVIEW.md](REVIEW.md) distinguishes the published release from any changes checked only in the source workspace. Previewing `dist/site` and publishing it are separate steps.

```sh
python3 -B -m unittest discover -s tests -v
node --test tests/test_frontend.cjs tests/test_static.mjs
```

Node runs the JavaScript checks; npm can obtain the pinned SDK for a rebuild. `requirements-routing.txt` is needed only when rebuilding the routing graph or checking native/browser parity. Ordinary preview and availability/street exports require no Python packages.

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
