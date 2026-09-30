# Data sources, access and provenance

Status reconciled **2026-09-30**, Asia/Seoul. Findings describe material inspected/downloaded on that date, not a promise that the catalogue or provider terms will remain unchanged. [SPEC.md](SPEC.md) owns current product semantics; [ARCHITECTURE.md](ARCHITECTURE.md) owns processing. Nothing downloads or collects history automatically.

## Seoul sources

| Purpose | Official source | Current use and limitations |
| --- | --- | --- |
| Current bikes and station locations | [OA-15493 — 실시간 대여정보](https://data.seoul.go.kr/dataList/OA-15493/A/1/datasetView.do) | Active `bikeList` API; authenticated access and complete pagination were tested. Saved extract contains 2,735 distinct IDs. Counts include no observation timestamp. |
| Historical availability | [OA-22382 — 대여가능 수량](https://data.seoul.go.kr/dataList/OA-22382/F/1/datasetView.do) | Q4 2025 archive imported. Quantity labeled `거치대수량`; exact hourly sampling/aggregation semantics remain unresolved. Used for descriptive zero-frequency bands, not a validated forecast. |
| Recent hourly observations | [OA-20447 — 운영현황(시간대별)](https://data.seoul.go.kr/dataList/OA-20447/A/1/datasetView.do) | One 1,000-station sample tested. `bikeListHist`, `yyyyMMddHH`, response `getStationListHist`; seven-day retention in inspected documentation. Not an active collector or current model input. |
| Individual rentals | [OA-15182 — 대여이력 정보](https://data.seoul.go.kr/dataList/OA-15182/F/1/datasetView.do) | Complete April–June 2026 downloads, the latest listed complete months at inspection. Full rental duration includes stops/detours; it is not moving time. |
| Station master | [OA-21235 — 대여소 마스터 정보](https://data.seoul.go.kr/dataList/OA-21235/S/1/datasetView.do) | Still needed for systematic identifier/location continuity, moves, renames and closures. Current joins use IDs/numbers in inspected live and historical files. |
| Supplementary demand | [OA-21229 — 대여소별 대여/반납 승객수](https://data.seoul.go.kr/dataList/OA-21229/F/1/datasetView.do) | Researched but unused. Five-minute demand counts cannot replace availability observations or individual rental times. |

The [live API specification](https://data.seoul.go.kr/dataList/datasetView.do?currentPageNo=1&infId=OA-15493&serviceKind=1&srvType=A) lists fields including `parkingBikeTotCnt`, `rackTotCnt`, `shared`, `stationId`, `stationName`, latitude/longitude and a maximum 1,000 rows per request. Actual pagination was followed to terminal `INFO-200`; `list_total_count` from a small page was not treated as a citywide total. Preserve publisher attribution and file-specific notices; inspected pages showed 공공누리 1유형 attribution licensing.

## Credentials and transport

The Seoul general Open API key is configured as `SEOUL_OPEN_DATA_API_KEY` in ignored `.env.local`, or can be supplied as an environment variable. It is read only by the local Python service. Setup reference: [official access guide](https://data.seoul.go.kr/together/guide/useGuide.do). No bike-sharing rental account, personal rental credentials or personal journey history is required. Do not paste keys into chat or documentation.

Authenticated `bikeList` access worked through HTTP port 8088. HTTPS on that port failed; sample-key probes on 443/8089 timed out. These are dated connection results, not proof that secure access is permanently unavailable. HTTP transport exposes the key in transit; secure provider access is an unresolved integration item. Current code suppresses credential-bearing URLs/logs and disallows redirects.

Exact account quota has not been established by these checks. The app throttles live attempts and only fetches after manual actions. Do not reuse separate subway-API limits. Kakao's old 800/day local attempt cap is historical, not a current Seoul or routing quota: current routing makes no Kakao requests.

## Downloaded history

| Trip month | Source rows | Eligible imported rows |
| --- | ---: | ---: |
| April 2026 | 3,937,822 | 3,815,795 |
| May 2026 | 4,029,272 | 3,901,286 |
| June 2026 | 4,182,797 | 4,059,316 |
| Total | **12,149,891** | **11,776,397** |

Eligibility excludes 373,494 rows under the current transformation; these totals precede whole-trip deduplication for popularity and offline audits. Details, fingerprints and exclusions are in [planner_import.json](data/processed/planner_import.json). Sources use CP949. The trip CSVs are losslessly gzipped, not spreadsheet-resaved. Import consumes the newest three monthly downloads plus the optional named Q4 archive; it does not obtain the latest calendar months or discover arbitrary quarters.

[data/manifest.json](data/manifest.json) retains source URLs, retrieval dates, original hashes/bytes and compressed provenance. Three trip archives total 563,968,309 bytes; verified compression saved 1,566,187,206 bytes. Original download hashes remain traceable under `uncompressed`. Raw public trip files may contain bicycle IDs/demographics; the derived database retains a whole-trip fingerprint rather than stable bicycle/rider identifiers. Keep raw history out of the browser.

The initial sample and journey studies are preserved in [DATA_AUDIT.md](DATA_AUDIT.md), [JOURNEY_AUDIT.md](JOURNEY_AUDIT.md), and [STATION_COMPARISON_AUDIT.md](STATION_COMPARISON_AUDIT.md). They establish structure and sparse-history findings, not forecast validation. April–June expands rental history, not availability coverage or station-location continuity.

## Maps, labels and routing

Map display uses vendored Leaflet 1.9.4 and attributed OpenStreetMap tiles for ordinary interactive viewing under the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). No offline tile harvesting or prefetching. Map data is © OpenStreetMap contributors under the [applicable ODbL terms](https://www.openstreetmap.org/copyright); preserve attribution and distribution obligations for derived data.

**Street labels:** a one-time Overpass download of named highway geometry, using [Overpass documentation](https://dev.overpass-api.de/overpass-doc/en/full_data/osm_types.html) and [public-instance guidance](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html). Bounds: 37.413,126.734 to 37.715,127.270. The query in `scripts/seoul_streets.overpass` yielded 74,744 named ways, excluding motorway, motorway-link and trunk-link. Saved source: `data/raw/seoul_streets_osm.json.gz` (7,306,942 bytes); lookup: `data/processed/seoul_streets.json.gz` (3,945,137 bytes). Prefer available English street names, otherwise the source name. Nearest named segment within 250 m; “Near” beyond 35 m. These are approximate labels, not postal addresses. No online geocoding per user action.

**Routing:** Valhalla 3.9.0 reads `data/processed/valhalla/`, built from `data/raw/seoul-routing.osm.pbf`. [coverage.json](data/processed/valhalla/coverage.json) records source checksum, bounds and retrieval/build provenance. Current bounds: latitude 37.395–37.745, longitude 126.735–127.245. The map was assembled from 17 subregions using highway/restriction queries via the maps.mail.ru, overpass.kumi.systems and overpass.private.coffee instances. All 2,735 saved station coordinates fall within it. This does not validate every pedestrian access connection. Cycling is city-bike costing at 15 km/h; walking is pedestrian costing at 5.1 km/h.

The current runtime does not query Kakao or read its key. Prior cached estimates remain as comparison evidence. The [retained Valhalla/Kakao experiment](docs/evidence/README.md) used smaller extracts; do not confuse those bounds/build timings with the current full-Seoul graph.

**Location:** the browser's [one-time Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition) requests permission, with a 15-second timeout and maximum cached-fix age of 30 seconds. The app does not persist location history. Tests use simulated fixes/errors. Background tile requests still go to the map provider.

## Maintenance and unresolved evidence

Run/rebuild commands are in [README.md](README.md). Sources and map updates are manual; a fresh source-only workspace needs the ignored data or a documented rebuild. No collection job runs while the laptop is awake or asleep. Recent-history retention cannot be assumed to backfill longer gaps.

Before claiming a forecast, resolve archive measurement semantics, missing/zero behavior, station continuity, seasonal drift and holidays, then validate against later observations. Additional data should be downloaded for a defined question, with provenance and storage measured; full years are not automatically required. Also unresolved: account quotas, secure Seoul API transport, reproducible map acquisition/refresh and Oksu-origin pedestrian matching. These are tracked in [plan.md](plan.md).

## Static derived assets — 2026-10-01

Static live counts use the [official station map](https://www.bikeseoul.com/app/station/moveStationRealtimeStatus.do) and its `getStationRealtimeStatus.do` HTTPS ALL feed without credentials. Inspected official `/js/newStation.js?ver=1127` sums `parkingBikeTotCnt` (legacy), `parkingQRBikeCnt` (regular) and `parkingELECBikeCnt` (smaller 새싹). The first five sums matched the credential-free Open API sample on 2026-10-01. A citywide response contained 2,748 unique valid stations and covered every saved station ID. Counts include all bike types, preserving aggregate-count meaning; no bike-type selection is implemented. Website session metadata is discarded. Receipt time is recorded because observation time is absent. This website endpoint lacks a published versioned API contract or verified quota; access/format changes remain a reliability limit. The local Python service retains its existing Open API source.

Browser export contains normalized public station locations, filtered popular pairs, exact archived observation/zero counts and named-road shards. Source fingerprints and actual archive coverage accompany the historical summary. No individual rental records or raw live extracts are published. A separate browser routing graph derives from the saved Seoul OSM PBF, using SDK-pinned Valhalla 3.8.3. Walking/bicycle accessible roads and paths are retained, driving-only edges excluded. Native graph tiles and named-road shards are distributed as derived OSM data with contributor attribution and ODbL reference; SDK/native dependency licenses accompany the binary. The browser build is not a newly downloaded map.

The availability-only importer accepts additional explicit quarter/month files and preserves uniqueness and conflicting-duplicate rejection. Current six-month export option still has only three observed months. Seasonal/holiday effects, station continuity and archive measurement semantics remain unresolved. See [STATIC_SETUP.md](STATIC_SETUP.md) for source extension and publication boundaries.
