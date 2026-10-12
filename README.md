# 따릉이 Where?

Choose a starting point, destination, and bike pickup time. The planner compares five nearby Seoul public-bike stations: how many bikes were last reported, how long it may take to walk and cycle, and how often the station had no bikes in the available archive.

**[Open the app](https://bttlbmb.github.io/ddareungiwhere/)** · [한국어](https://bttlbmb.github.io/ddareungiwhere/ko/) · [Source](https://github.com/Bttlbmb/ddareungiwhere)

The page runs in your browser. GitHub Pages hosts the files, and Valhalla calculates routes on your device. Bike counts come from the official Seoul Bike website. No account or API key is needed.

## Use

1. Choose both points on the map. **Current location** can set the starting point.
2. Choose when you will collect the bike, in Seoul time, from now through seven days ahead. Walking to the station does not change this time.
3. Press **Compare stations**. All five departures use the same destination station. **Your destination.** shows the final walk from that station to your destination.
4. Use **Back to map** to edit the journey. **Refresh bikes** updates bike counts while keeping the route estimates.

Edits remain a draft until you compare. Counts remain the last received snapshot until you compare or refresh; missing counts are unknown, rather than zero. Some overseas networks may be unable to reach the bike provider.

For pickup more than 15 minutes ahead, the last column shows how often a station had no bikes at that hour in **October–December 2025**. A low frequency does not mean an empty station will refill soon. The dashed A–B line is a straight guide; it does not show a cycling route. [SPEC.md](SPEC.md) explains these rules and limits.

Click the header's **ENG / 한국어** capsule, or focus it and press Enter, to change language. The journey remains in place.

## Preview and maintain

A clone includes the generated page in `docs/`. With Python 3.11 or later:

```sh
python3 scripts/preview_static.py --port 63463
```

Open the printed HTTP address. If `python3 --version` is older than 3.11, install a newer interpreter and run the command with it. Preview `docs/`, not `web/index.html`, which lacks the built data and routing files.

Source is in `web/`. Python scripts prepare public data offline. A rebuild also needs the separately retained map, street, and availability inputs and the pinned routing SDK. Those ignored files are not supplied by a new checkout. See [STATIC_SETUP.md](STATIC_SETUP.md) for builds, data updates, and publication.

Run the project checks with Python and Node (tested with Node 26):

```sh
python3 -B -m unittest discover -s tests -v
node --test tests/test_frontend.cjs tests/test_static.mjs
```

Ordinary preview and data exports need no Python packages. `requirements-routing.txt` is for rebuilding routing data and checking that the native and browser routers agree. [REVIEW.md](REVIEW.md) records the current verification status.

## Documentation

| Document | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Guidance for contributors |
| [SPEC.md](SPEC.md) | Product behavior and acceptance criteria |
| [DESIGN.md](DESIGN.md) | Approved appearance and wording |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Modules, data formats, and caching |
| [STATIC_SETUP.md](STATIC_SETUP.md) | Build, preview, and publication instructions |
| [DATA_SOURCES.md](DATA_SOURCES.md) | Sources, licenses, and measurement limits |
| [DECISIONS.md](DECISIONS.md) | Reasons for the current choices |
| [WRITING.md](WRITING.md) | Style guide for repository documentation |
| [plan.md](plan.md) | Known issues and deferred work |
| [REVIEW.md](REVIEW.md) | Current verification status and limits |

Bike data: [Seoul Bike](https://www.bikeseoul.com/) and [Seoul Open Data Plaza](https://data.seoul.go.kr/). Maps: [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) and [Leaflet](https://leafletjs.com/). Routing: [Valhalla](https://github.com/valhalla/valhalla) and [valhalla-browser](https://github.com/tobilg/valhalla-wasm). Retain their bundled licenses and attribution. Background tiles follow the [OSM tile policy](https://operations.osmfoundation.org/policies/tiles/).
