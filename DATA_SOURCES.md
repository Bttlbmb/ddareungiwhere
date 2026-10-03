# Data sources and limits

Reviewed 2026-10-03. Each observation below keeps its own date. [data/manifest.json](data/manifest.json) records retained sources and file hashes; hashes identify the saved input versions. History and routing manifests also record their inputs. Raw/processed data is ignored and absent from new checkouts.

## Stations and bike counts

The station catalogue contains 2,735 saved IDs, numbers, names and coordinates in `data/inputs/stations.json`, normalized from [Seoul Open Data inventory — OA-15493](https://data.seoul.go.kr/dataList/OA-15493/A/1/datasetView.do) saved on 2026-09-30. Historical records match by station number; live records match by internal ST identifier. A successful refresh can add stations. Continuity after renaming, relocation or renumbering remains unverified.

The official [Seoul Bike website](https://www.bikeseoul.com/) requests all stations from [its HTTPS realtime feed](https://www.bikeseoul.com/app/station/getStationRealtimeStatus.do) using `stationGrpSeq=ALL`. On 2026-10-01, the response allowed cross-origin browser access and contained 2,748 stations. Requests need no key, cookie or account. Like the official map, the app sums legacy, QR and smaller 새싹 bikes (`parkingBikeTotCnt`, `parkingQRBikeCnt`, `parkingELECBikeCnt`). The total is not a bicycle-type filter.

This website feed has no published versioned API contract or verified global request quota. The app's 60-second per-tab interval limits its own attempts. The feed supplies no observation timestamp: receipt time tells us when data arrived, not when bikes were counted. A large station list alone cannot prove freshness or completeness. Invalid/missing counts remain unknown; failed refreshes retain prior counts and receipt times. The user chose stable displayed snapshots on 2026-10-01.

### Overseas access

On 2026-10-01, the user reported missing counts from Germany, the UK and Pakistan. [Official App Store developer responses](https://apps.apple.com/ca/app/서울자전거-따릉이/id1037272004), including a June 17 response, acknowledge restrictions on some overseas networks. That describes the provider's access policy; it does not establish which countries can reach this endpoint.

A local POST using the GitHub Pages Origin returned HTTP 200, wildcard cross-origin access and 2,748 stations. An IP-country lookup classified that connection as Korean. The research browser received a firewall-block page from the official website, but that request differed from the app's POST. The affected overseas browser requests have not been reproduced directly. Provider restrictions are a plausible explanation; successful Korean access does not establish worldwide access. The static app depends on each visitor's connection and cannot repair an upstream restriction.

## Hourly availability archive

Source: [Seoul station availability, hourly — OA-22382](https://data.seoul.go.kr/dataList/OA-22382/F/1/datasetView.do). The retained Q4 2025 CP949 ZIP contains 6,152,132 station/date/hour observations from **2025-10-01 through 2025-12-31**.

The offline database retains these observations. The page receives only exact counts of recorded values and zeros, grouped by station, hour and weekday/weekend. Missing records are excluded, and coverage differs by station. At least 20 recorded days are required: below 5% zeros is Low, 5%–below 20% Moderate, and 20% or more High. Holidays follow ordinary weekdays.

The source's exact hourly sampling/aggregation remains unconfirmed. These bands describe the archive; they have not been validated as forecasts. A six-month export is supported, but requires additional source months before six-month coverage can be claimed. More months change the evidence, not the 48 groups stored per station.

## Streets, map and routes

[OpenStreetMap](https://www.openstreetmap.org/copyright) data uses ODbL 1.0. Saved map fingerprints, extraction queries and provider URLs are in `data/inputs/routing-coverage.json`. Routing manifests record the PBF hash and pinned Valhalla revision. The coverage record retains the original native extraction version, 3.9.0; the browser graph was built with 3.8.3.

Bounds are south 37.395, west 126.735, north 37.745 and east 127.245. They covered all saved stations in the 2026-09-30 check. Road connectivity, access tags and endpoint matching can produce detours; estimates do not establish route safety or accessibility.

The named-street response is dated **2026-09-30T00:15:05Z**. Its query is in [scripts/seoul_streets.overpass](scripts/seoul_streets.overpass), with source hashes in the manifest. English prefers `name:en`; Korean prefers `name:ko` or the local name, with the existing name as fallback. Both use the same geometry. Korean names were added on 2026-10-02 by re-importing the saved response, so its timestamp/hash stayed unchanged. Labels are approximate nearby streets without house numbers, rather than verified postal addresses. Background tiles use the ordinary OSM interactive service, separately from the saved routing graph.

## Public data boundary

The OA-15493 and OA-22382 catalogues list Korea Open Government License Type 1: attribution required, with commercial use and adaptation allowed (checked 2026-10-03). Retain provider attribution alongside the OSM and software licenses.

Runtime data contains station/location/count summaries and roads, without rider or bicycle identifiers. Rental data is no longer a build input or browser asset. Its retired source records remain in the manifest; raw research files are outside the project and publication. Credentials belong outside public assets, logs and source records.
