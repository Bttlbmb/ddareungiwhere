# Data sources and limits

Current, 2026-10-01. Local retained-source fingerprints are in [data/manifest.json](data/manifest.json); generated history and routing manifests carry source hashes. Ignored raw/processed assets are not included in a new checkout.

## Station locations and live quantities

Public station catalogue: 2,735 saved IDs/numbers/names/coordinates in `data/inputs/stations.json`, normalized from the Seoul station inventory saved on 2026-09-30. Historical matching uses station number; runtime/live matching uses internal ST identifiers. A successful live refresh can add stations. Number continuity across relocation/renaming is unverified.

The official [Seoul Bike website](https://www.bikeseoul.com/) map posts `stationGrpSeq=ALL` to [its HTTPS realtime feed](https://www.bikeseoul.com/app/station/getStationRealtimeStatus.do). Browser requests use no key, cookie or credentials. On 2026-10-01 the response allowed cross-origin access and contained 2,748 stations. Aggregate bikes sum legacy, QR and smaller 새싹 categories (`parkingBikeTotCnt`, `parkingQRBikeCnt`, `parkingELECBikeCnt`), as the official map does. Category availability is not a bicycle-type filter.

The website feed is not a published versioned API contract. There is no verified account/global request quota here; a 60-second per-tab attempt interval is an implementation throttle. Receipt timestamps are local, not provider observations. All-station coverage checks do not establish source freshness or completeness independently. Malformed/missing quantities are unknown, never zero. Failed refreshes retain the prior received quantities and their receipt time; displayed snapshots no longer expire automatically (user choice, 2026-10-01).

**Overseas access limitation (investigated 2026-10-01).** The user reported missing counts from Germany, the UK and Pakistan. Seoul Bike's [official App Store developer responses](https://apps.apple.com/ca/app/서울자전거-따릉이/id1037272004) acknowledge overseas-IP restrictions, including a June 17 response describing restrictions on some overseas networks. This is evidence about the provider's app/access policy, not a country-by-country test of this website endpoint. A local POST with the GitHub Pages Origin returned HTTP 200, wildcard CORS and 2,748 stations; a separate IP-country lookup identified that connection as KR. The web research service received a provider firewall-block page for the official website. Its request is not equivalent to our browser POST. Overseas browser failures remain unreproduced directly, but provider network restrictions are a likely explanation. Successful Korean access and CORS headers do not establish worldwide reachability. Direct browser requests depend on each visitor's network; the current static page cannot repair an upstream IP restriction.

## Hourly availability archive

[Seoul station availability, hourly — OA-22382](https://data.seoul.go.kr/dataList/OA-22382/F/1/datasetView.do). Retained original: Q4 2025 CP949 ZIP, 6,152,132 station/date/hour observations, 2025-10-01 through 2025-12-31. Dedicated offline database stores those observations; the public page receives exact observation/zero counts, pooled by weekday/weekend and hour. Missing records are excluded; station coverage differs.

These descriptive bands are not calibrated forecasts. Exact hourly sampling/aggregation semantics remain unconfirmed. Holidays follow ordinary weekdays. At least 20 recorded observations are required; Low <5% zeros, Moderate 5–<20%, High ≥20%. Six-month export is supported, but only three months are supplied today. More months do not enlarge the per-station 48-cell shape.

## OpenStreetMap streets and routing

[OpenStreetMap attribution/license](https://www.openstreetmap.org/copyright), ODbL 1.0. Saved PBF fingerprint/queries/provider URLs are in `data/inputs/routing-coverage.json`; graph manifests record PBF SHA-256 and the pinned Valhalla revision. The coverage record retains the original native extraction version (3.9.0); the browser graph itself is built with 3.8.3. Bounds: south 37.395, west 126.735, north 37.745, east 127.245, covering the saved catalogue in the 2026-09-30 check. OSM accessibility/connectivity and endpoint matching can produce detours; estimates are not a safety/accessibility guarantee.

Named street extract: Overpass response timestamp 2026-09-30T00:15:05Z; query in `scripts/seoul_streets.overpass`, fingerprints in the manifest. Prefer English names when available. Nearest-road labels are approximate, without house numbers, not verified postal addresses. Background map tiles come from the ordinary OSM interactive service, separately from routing geometry.

## Retired rental-derived shortcuts

Popular-route shortcuts and their seed file were removed on 2026-10-01 at the user’s request. The previous five directional pairs came from deduplicated April–June 2026 public rentals, filtered for at least 2 km straight-line separation and non-reused endpoints. Their original source fingerprints remain in `data/manifest.json` as retired provenance; they are no longer build inputs or browser assets. Rental duration is not travel time.

Public runtime data contains station/location/count aggregates and roads, no rider or bicycle identifiers. Legacy rental research/raw files are outside the project and publication. No credentials belong in public assets or provenance.
