# Data sources and access checklist

Research date: 2026-09-30, Asia/Seoul. Catalogue research and the initial sample audit are complete. See [DATA_AUDIT.md](../../../DATA_AUDIT.md) for inspected coverage and findings, and [data/manifest.json](../../../data/manifest.json) for retained sample provenance. No collection job is running. Listed catalogue coverage is not proof that every file is complete.

## Live access verification — 2026-09-30

- The locally saved key returned `INFO-000` from `bikeList/1/5/`, with five station rows and numeric nonnegative bike counts.
- Returned fields: `parkingBikeTotCnt`, `rackTotCnt`, `shared`, `stationId`, `stationLatitude`, `stationLongitude`, and `stationName`. No observation timestamp was present in these rows; record fetch time separately.
- The successful connection used the documented HTTP endpoint on port 8088. HTTPS on that port failed with a protocol error; probes using the public sample key on ports 443 and 8089 timed out. This establishes what worked in this check, not that secure access is permanently unavailable. HTTP transmits the API key without transport encryption; secure transport remains an integration question.
- The five-row response reported `list_total_count: 5`; do not interpret this as the citywide station count. Pagination and the meaning of that field still require verification with a larger request.
- The key and credential-bearing URL were not displayed or saved in these documents. Raw response data was not saved. This check verifies live access, not historical API access or account quotas.

## Sources

| Purpose | Official source | Findings and open checks |
| --- | --- | --- |
| Current bikes | [OA-15493 — 실시간 대여정보](https://data.seoul.go.kr/dataList/OA-15493/A/1/datasetView.do) | Station bike counts, locations, names, IDs, rack counts. JSON API; authenticated access must be tested. |
| Long-term availability | [OA-22382 — 대여가능 수량](https://data.seoul.go.kr/dataList/OA-22382/F/1/datasetView.do) | Hourly availability archives; page lists 2022–2025, with 2025 quarters uploaded in June 2026. Confirm what an hourly value represents and whether zeros and missingness are reliable. |
| Recent availability | [OA-20447 — 운영현황(시간대별)](https://data.seoul.go.kr/dataList/OA-20447/A/1/datasetView.do) | Recent seven days only, hour-level time representation, up to 1,000 rows per request. Validate response semantics before retaining and merging observations. |
| Individual rental durations | [OA-15182 — 대여이력 정보](https://data.seoul.go.kr/dataList/OA-15182/F/1/datasetView.do) | Newest listed trip month is June 2026; stated publication cycle is half-yearly. June CSV is about 716 MB; 2025 ZIP about 1.74 GB. Inspect column definitions and units first. |
| Station identity/location | [OA-21235 — 대여소 마스터 정보](https://data.seoul.go.kr/dataList/OA-21235/S/1/datasetView.do) | Station identifiers, addresses, coordinates; sheet/API. Verify mapping between historical station numbers and live IDs, including renamed/moved stations. |
| Optional supplementary demand | [OA-21229 — 대여소별 대여/반납 승객수](https://data.seoul.go.kr/dataList/OA-21229/F/1/datasetView.do) | Five-minute origin/destination counts with a stated five-day publication delay. Counts are not a substitute for inventory observations or individual duration records. |

The live API's [expanded official specification](https://data.seoul.go.kr/dataList/datasetView.do?currentPageNo=1&infId=OA-15493&serviceKind=1&srvType=A) identifies service `bikeList`, fields including `parkingBikeTotCnt`, `stationId`, `stationName`, `stationLatitude`, and `stationLongitude`, and a maximum of 1,000 rows per call. Verify pagination termination from actual responses; the old two-page example is not a current station-count guarantee, and the tested count field is not a verified citywide total.

The source pages display attribution licensing (공공누리 1유형). Preserve publisher attribution, source links, retrieval dates, and any file-specific notices. Map-rendering terms are separate and must be checked after provider selection.

## What the user needs to provide

1. A Seoul Open Data Plaza account and general Open API key. Start with the [official API access guide](https://data.seoul.go.kr/together/guide/useGuide.do), sign in, and choose general key application (일반 인증키 신청), not the separate real-time subway application. Exact form requirements and account quota must be checked in the signed-in account. No paid service is selected by this plan.
2. Key configured and verified on 2026-09-30: `.env.local` contains `SEOUL_OPEN_DATA_API_KEY` and is excluded by `.gitignore`. It is intended for the future local service, not browser code. Do not paste the credential into chat or documentation. No further key setup is needed for the initial live API check.
3. If manual downloads are needed, provide the original CSV/ZIP files in a local project data folder and give their paths. Do not paste hundreds of megabytes into chat or resave through a spreadsheet editor. Public downloads may also be obtained directly in the later data-audit phase.
4. Supply two or three familiar journeys or station pairs for practical checks. Approximate landmarks are enough; exact home/work addresses are unnecessary.

The bike-sharing user account, rental credentials, and personal journey history are unnecessary.

## Smallest useful first data package

Completed first inspection: a 5,994-record prefix of June 2026 trips, all three monthly CSVs in the Q4 2025 availability archive, two 1,000-station live pages, and 1,000 station observations for 2026-09-29 at 08:00. A subsequent [journey audit](../../../JOURNEY_AUDIT.md) scanned all 4,182,797 June records for the user's test journeys and completed live pagination through a terminal INFO-200 response, yielding 2,735 distinct station IDs. The station master remains outstanding. These inspections establish structure and demonstrate joins, not sufficient evidence for every station/time combination.

Both CSV sources use CP949. The archive quantity is labeled `거치대수량` and varies by hour, but exact sampling/aggregation semantics are unconfirmed. The recent API service is `bikeListHist`; its date argument is `yyyyMMddHH`, with the response under `getStationListHist`. The older FAQ's broken `odc` download hostname was replaced with the catalogue's current official `datafile.seoul.go.kr` download host to retrieve the same FAQ reference.

After that inspection, expand as justified: all 2025 availability quarters for seasonality and April–June 2026 trips for the proposed three-month duration/record window. Consider matching-season older trips separately; do not mix different windows without labeling them. Budget several GB of disk for raw files, extracted files, and local summaries; measure actual size before downloading full years.

April–June expansion completed on 2026-09-30: the April and May downloads added 1,396,630,145 bytes. All three months contain 12,149,891 source rows; the selected fixed-destination shortlists have 2,588 eligible rows after one zero-minute exclusion. See the three-month follow-up in [STATION_COMPARISON_AUDIT.md](../../../STATION_COMPARISON_AUDIT.md). This does not expand availability coverage beyond the previously downloaded quarter, validate records, or establish station location continuity.

Do not make the browser load raw trip histories. Process locally into reusable station/hour and directed-pair summaries. An embedded database is a likely fit; choose the tool after inspecting file sizes and formats.

## Data audit checklist

- Validate encoding, delimiter, headers, units, date formats, timezone, and row coverage.
- Establish live API pagination, quota, station coverage, error handling, refresh behavior, and transport support. The documented example uses HTTP; verify supported secure access. Redact the key from URLs and logs.
- Do not copy quota limits for the separate subway API into the bike API design.
- Check whether source timestamps exist; store fetch time separately.
- Verify hourly observation/aggregation semantics with sample data and documentation.
- Check missing intervals, duplicates, zero-count behavior, closures, and newly opened stations.
- Create a checked crosswalk between all station ID systems, preserving source IDs and history. Do not join solely on names.
- Confirm trip endpoints, elapsed duration units, and whether any fields could support speed sanity checks. Do not assume trip endpoints provide route geometry.
- Measure how many proposed journeys have sufficient pair-specific records and how many stations have comparable availability history.
- Record source URL, original filename, covered dates, retrieval date, checksum, row count, and exclusions in an import manifest when imports begin.

## Optional fresh data collection

The seven-day API may allow backfilling short local interruptions, subject to verified completeness. Longer gaps cannot be assumed recoverable. A local collector cannot run while the computer is asleep or off. Continuous collection, polling frequency, and any always-on hosting are separate decisions; nothing is scheduled by this document.

Historical empty rates may initially rely on older archives. Show their age. Validate any forecast on later observations before treating it as predictive.

## Map display and station proximity

The user has removed walking features from scope. Retain map pins and station locations; use clearly labeled straight-line distance as the proposed proximity measure. Do not estimate access time, enforce a walking budget, or require a walking-directions API account. The provider decision now concerns map rendering, localhost support, attribution, and any associated map key only. The previous walking-account question is withdrawn; MAPS_AND_WALKING.md is historical research, not setup instructions for the active project.

## Local street labels — added 30 September 2026

Named OpenStreetMap highway geometries were downloaded once through [Overpass API](https://dev.overpass-api.de/overpass-doc/en/full_data/osm_types.html), following its [public-instance usage guidance](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html). The first request returned a 504; one later retry succeeded. No live per-user geocoding calls are made.

- Bounding box: south 37.413, west 126.734, north 37.715, east 127.270.
- Query: `scripts/seoul_streets.overpass`; 74,744 named ways, excluding motorway, motorway-link, and trunk-link classifications.
- Saved response: `data/raw/seoul_streets_osm.json.gz`, 7,306,942 bytes, losslessly compressed with the original content hash retained in `data/manifest.json`.
- Compact lookup: `data/processed/seoul_streets.json.gz`, 3,945,137 bytes. English street names preferred where provided, otherwise the original name.
- License/attribution: © OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright). Attribution is visible in the app. This derived extract should remain under the applicable ODbL terms if distributed.
- Lookup: nearest named street segment within 250 m; a label beginning “Near” is used beyond 35 m. This is approximate vicinity, not a verified postal address. No house-number data is used. Missing coverage falls back to a named station/landmark.

Rebuild the lookup with `python3 -B scripts/import_streets.py`. For a deliberately downloaded replacement, use `--source data/raw/seoul_streets_osm.json`; this explicitly selects the new file even if a previous compressed source is present. Restart the app afterward. The service itself never refreshes this dataset automatically or sends a user's coordinates to Overpass.

The location button uses the browser's [one-time Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition), with permission, a 15-second timeout, and a maximum cached-fix age of 30 seconds. Coordinates are not persisted by this app. Device support and permission remain browser-controlled; tests simulate fixes and errors without obtaining the user's real location.
