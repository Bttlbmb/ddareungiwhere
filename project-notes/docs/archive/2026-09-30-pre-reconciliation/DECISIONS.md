## Walking endpoint correction — 30 September 2026

The Oksu report was reproduced near station #556: pedestrian routes to #565 and #5651 snapped to bridge-marked paths and crossed the Han River before returning, yielding about 55/53 minutes. Pedestrian station endpoints now exclude bridge edges during correlation only; route traversal can still use bridges. The origin considers access paths within 30 m without nearest-edge ranking; the station uses a 50 m candidate radius. Both searches stop at 100 m. Walking summaries include straight access gaps between input pins and mapped route endpoints, at 5.1 km/h; these short access gaps are approximate, not mapped directions. Snap gaps above 100 m produce an unavailable result. Genuine long network detours are not capped. An 8 m offset near #556 now yields approximately 1/3/5 minutes for #556/#565/#5651. Regression checks cover this case, access gaps, rejection of distant snapping, and retention of genuine detours; 40 local station walks also succeeded. Bicycle routing is unchanged.

## Station selection and full Seoul routing — 30 September 2026

Map popup actions Use as departure / Use as return move the corresponding pin to that station, immediately update its fallback name, and refresh the road label through the existing local lookup. Station overrides are retained and comparison remains manual. The routing map is expanded to latitude 37.395–37.745 and longitude 126.735–127.245, covering all 2,735 saved stations with a surrounding buffer. All 20 departure estimates across west–east and north–south extremes passed local routing checks, with walk estimates also available. The west-to-east extreme returned 184.82 minutes / 45.933 km at the existing 15 km/h city-bike setting. Results are recorded in data/processed/full_seoul_routing_check.json.

## Current counts and future risk presentation — 30 September 2026

Current location sits beside Starting point. The results header divider is removed. Immediate pickups continue to use current availability; future pickups label the archive signal Historical no-bike risk. A current zero remains red without overriding the future archive rating. Archived hourly zero frequencies are not a forecast of recovery from an empty station within 30 minutes.

## Local walking time — 30 September 2026

Each departure row now includes Walk time from the starting pin, using the same local Valhalla graph with pedestrian costing and a 5.1 km/h walking speed. Walking and cycling results use separate cached keys. Routes are computed only on manual comparisons; refreshing bikes preserves both estimates. Zero is shown for a pin exactly at the station, positive times round to at least one minute, and unavailable routes show a dash. Walking time does not alter bike pickup time or the five nearest stations. This supersedes earlier decisions to defer walking estimates.

## Local Valhalla cycling estimates — 30 September 2026

Per-station bike times now use local Valhalla 3.9.0, bicycle_type=city, cycling_speed=15 km/h. Kakao routing is replaced. The table retains its whole-minute estimates and the footer credits Valhalla / OpenStreetMap. Routing graph/provenance are under data/processed/valhalla; source PBF is under data/raw; runtime is the project .venv. No temporary trial paths or external route requests are used. Coverage is latitude 37.395–37.745, longitude 126.735–127.245. Out-of-map or failed routes show unavailable estimates. Manual comparison and bike refresh behavior are unchanged. Walking estimates were added in the update above. Prior Kakao keys and cached results remain for historical comparison.

## Kakao cycling estimate — 30 September 2026

Manual comparisons obtain bicycle estimates for all displayed departure stations to the selected return station, using saved estimates first. Each table row displays its own Kakao cycling estimate rounded to whole minutes. The summary panel and historical rental duration display have been removed. The interface compares five nearby stations and offers no expansion button, limiting new routing requests. Unavailable routes display a dash with an explanatory tooltip. The estimate is not a pickup-time forecast. Bicycle roads are preferred (`BIKE_ONLY`). The map's A–B line remains a straight guide, not route geometry.

The REST key is loaded server-side from `KAKAO_REST_API_KEY` in `.env.local`. Only station coordinates go to Kakao. Successful station-pair results are saved without automatic expiry in `data/processed/kakao_routes.json`; 800 outbound attempts per Seoul calendar day are allowed, including failures, and the counter survives restarts. The cache stores no key. This local limit does not configure Kakao billing or account-wide quotas. Bike refreshes, GPS/pin changes, and initial page loading make no Kakao requests. Failed routing leaves history and inventory usable.

Official API: https://developers.kakao.com/docs/en/kakaomap/rest-api#bicycle

# Decisions and open questions

## Pooled rental median and immediate availability — 30 September 2026

The user approved replacing the unweighted average of station medians with the median of all matching individual rentals across displayed departures to the same return station. Whole-trip signatures remove duplicate source records; same-station loops are excluded. The API returns ride_summary with median and n, using a bounded 128-entry query cache. The card is labeled Median rental time because these observations include the full rental, not measured moving/cycling time. Stops/detours cannot be identified from these records.

The reported Seodaemun → Eulji-ro case was traced exactly to return #332. Departures #171, #198, #394 and #4267 had 1, 4, 28 and 16 rides with medians 87, 101, 14 and 95.5 minutes; #173 had none. The previous average was 74.375 (74.4 displayed); the pooled median of the same 49 trips is 16 minutes. Station separations are roughly 1.8–2.0 km. Long reported durations agree with elapsed rental timestamps; this is not a minutes/seconds conversion issue. We cannot determine why those rentals were long.

For immediate pickups (within the existing 15-minute window), the last column is Availability now: fresh zero → Empty now, fresh one/two → Few bikes, fresh three or more → Available now, missing/stale → Unknown. Historical ratings are not substituted for current availability. Future pickups retain the experimental historical risk column and archive context. Observed counts are still snapshots, not guarantees.

Now, In 30min and In 1h buttons sit below the datetime input. Offsets are relative to the click time in Seoul time; shortcuts only edit the draft, never trigger a query. Validation: 23 Python and 19 frontend checks pass, including pooled-median deduplication/loop exclusion, current-vs-future availability, expiry and shortcut arithmetic. The real-data cluster query reproduces 49 / 16 exactly.

## Results copy update — 30 September 2026

Removed the archive-frequency captions beneath risk badges, the departure-count/pickup summary, and the expandable methodology section. The ride summary now says “Average of station medians · Based on X historical rides.” X sums the eligible directed-pair trip counts for stations contributing a valid median; excluded stations and same-station loops contribute neither a median nor rides to this total. The duration calculation remains the unweighted mean of station medians, not a pooled mean. Risk remains labeled experimental beside the table. Full methodology is retained in project documentation.

## Minimal interface update — 30 September 2026

Removed the hero/title section, ride-history header, step label, header live status/local edition, branding slogans, location permission/success/accuracy helper copy, recommendation sentence and return-station dropdown. Use my location is right-aligned immediately below the origin box; failures still provide actionable messages. Return stations can still be explicitly chosen on the map; the API otherwise uses its nearest return default. Source attribution stays in the footer and data windows remain in the expandable methodology.

The table headers are simply Departure station, Bikes now and No-bike risk. Fresh counts of zero have a red badge; one or two have a yellow badge; three or more retain green. Row fetch timestamps are removed, as is Counts describe now. Unknown/stale reports remain a dash and never inherit a zero/low-stock color. The single footer refresh time remains available.

## Manual queries and compact results — 30 September 2026

Choosing pins, example journeys, GPS, pickup time, or departure/return stations only edits the draft and invalidates the old comparison. Compare stations explicitly requests results. Show more stations and Refresh bikes are also explicit user actions. Opening the app reads saved station locations and metadata without starting a live-provider fetch. There is no interval or tab-visibility network refresh. Polling can finish a user-initiated live refresh but only reads its status; it cannot start another provider fetch or rerun history. Current reports still expire after two minutes without any network request. Nearby street labels remain a local lookup as pins move.

Use my location and its status now belong directly beneath the starting-point control. Results spacing is reduced, including rows, headings, the ride-time summary and return controls. The planning-ahead paragraph and empty recommendation filler are removed. A short experimental historical-risk qualifier remains with archive dates; fuller limitations remain in the expandable methodology.

## Single-screen map/results update — 30 September 2026

A dashed straight line joins the starting point A and destination B, updating after point selection, dragging, examples or location access. It is labeled as a straight line, not a cycling route. The app opens in map view. An explicit Compare stations submission switches the shared panel to results; Back to map restores the same journey and map view and recalculates Leaflet's viewport size. Background queries and live refreshes never change the selected view, including when a response arrives after Back to map. On narrow screens the form is hidden while results are shown. The outer page fits the viewport; long forms/results scroll internally so all stations and methodology remain accessible. The Back to map control remains outside the scrolling results body.

## Table and risk update — 30 September 2026

The latest user request supersedes earlier table requirements: show only departure station, bikes now, and a **provisional historical no-bike risk signal**. Individual mean, median and fastest rental times are removed from the table; the unweighted mean of station medians remains above it. History and Past zero counts columns stay hidden.

Risk bands describe archived hourly zeros for the chosen pickup hour and weekday/weekend group: Low below 5%, Moderate 5% to below 20%, High at least 20%. Require at least 20 recorded days, otherwise Unknown. These are explicitly experimental descriptive bands, not validated probabilities or future predictions. October–December 2025 dates and the limitation are visible with the table. Exact archive measurement semantics remain unresolved; Low never means no risk. Use each station’s own recorded dates so expanding the list or changing the destination cannot change its rating. Missing records are excluded, not imputed as available. Station coverage may differ. Live counts remain separate, and recommendations still use only fresh current inventory for immediate pickups.

## Current interface update — 30 September 2026

The latest user request supersedes earlier display requirements: add one-time browser geolocation for the origin; use approximate street names without house numbers for both pins; show a cluster summary as the **unweighted arithmetic mean of displayed station-specific medians** to the same return station; remove the **History** and **Past zero counts** columns. Missing medians and same-station loops are excluded, with the contributing station count shown. This explicitly requested summary is not a pooled trip mean, pooled median, or a time-specific forecast. It updates when the comparison set or return station changes. Raw trip counts and archive observations remain internal; a small limited-data caution remains alongside affected durations.

Street labels use a local OpenStreetMap named-road extract; no external reverse-geocoding calls or continuous location tracking. Failed/denied geolocation keeps the existing journey, and manual selection supersedes a pending location fix. Street lookup falls back to a nearby station’s name or an example landmark when coverage is missing. The stored ride-history window is unchanged.

Updated: 2026-09-30. Proposed defaults are recommendations, not approvals. User answers take precedence.

## Confirmed

| Decision | Basis |
| --- | --- |
| Browser interface, localhost first | Explicit user request |
| Map origin/destination plus departure time | Explicit user request |
| Current bikes, historical empty risk, average and record duration, better nearby departure alternative | Explicit user request |
| Build the MVP after foundation work; use three months of ride history | Latest explicit user request, 2026-09-30 |
| Planning horizon: now through the next seven days | User answer, 2026-09-30 |
| Departure time means pickup at the station | User answer, 2026-09-30 |
| Bike information only; no walking directions, walking estimates, or walking-budget filter | Latest user instruction, superseding the earlier ten-minute preference, 2026-09-30 |
| Initial historical comparison should pool weekdays by hour, rather than require the same named weekday | User suggestion adopted as the baseline to validate, 2026-09-30 |
| Test journeys: Seoul Station → City Hall; Konkuk University → Ttukseom Hangang Park | User examples, 2026-09-30 |
| Compare several nearby departure stations, with availability and average ride times for each; help choose instead of showing only the closest | User refinement, 2026-09-30 |

## First discussion — resolved

| Question | User decision | Why it matters | Status |
| --- | --- | --- | --- |
| How far ahead should planning work? | Now through seven days ahead | Sets expectations for current counts versus historical patterns | Confirmed |
| Does departure mean leaving the origin or collecting the bike? | Collecting the bike | Compare candidates at the same bike pickup time | Confirmed |
| Earlier ten-minute walking preference | Superseded by bike-only scope | User judges station access; the app does not calculate or filter by walking time | Superseded |

## Next discussion — no need to settle every item immediately

| Question | Recommendation / open choice |
| --- | --- |
| Who and where is the initial audience? | Personal use, Seoul-wide station map; validate on familiar journeys before expecting useful history everywhere |
| English, Korean, or both? | English interface with official Korean station names and station numbers |
| How should nearby stations be located? | Proposed: labeled straight-line distance and map positions; the user handles station access. No walking estimates. |
| Are map pins sufficient, or is place/address search essential? | Map pins first; search later if needed |
| Is historical empty frequency with dates enough, or is a calibrated future probability essential? | Start with historical frequency; validate before making forecast claims |
| Is the mean enough? | Show the requested mean and add median as the typical duration |
| What does “recent record” mean? | Fastest plausible observed rental in latest three complete available months; visibly disclose publication lag |
| Is older trip data acceptable? | Current catalogue ends at June 2026; if last-week records are essential, seek another source before committing |
| Must data refresh while the laptop is off? | No unattended collection initially; decide separately if fresher predictions justify an always-on service |
| Any budget for map display? | Aim for no paid commitments initially; verify map-rendering terms before selection |
| Map implementation | Leaflet/OpenStreetMap for interactive display; no additional account. The walking-provider proposal remains superseded. |
| Any technology preference? | None assumed; select a small local stack after the audit |
| Exact test-journey pins? | Subway versus campus origin at Konkuk awaits user clarification. Seoul Station east side, City Hall/Seoul Plaza, and the park entrance near Jayang Station are provisional. |
| How broad is the nearby-station shortlist? | Proposed: roughly three to five nearby departures initially, with expansion and manual map selection. Geographic limits remain unconfirmed; no walking-time threshold applies. |
| Can nearby-station ride histories be pooled? | Experimental only: April–June chronological checks found no consistent accuracy benefit. Preserve each station's own count and average; availability and fastest records remain station-specific. Omit pooled predictions from proposed v1 recommendation logic; actual routes and wider validation remain open. |
| What should the initial duration window and pooling policy be? | After April–June validation: propose the latest three complete available months, date-labeled station-specific mean/median and broader-time fallbacks; omit pooled prediction from initial recommendation logic. This is a data-informed proposal, not a new user-confirmed rule. |

## Proposed engineering/product constraints

These are draft design recommendations subject to the user's review:

- Interpret dates and times in Asia/Seoul.
- Select a return station so historical station-pair duration has a defined endpoint.
- Keep raw histories out of the browser and credentials out of frontend code.
- Distinguish live count, historical frequency, and any future prediction in both naming and layout.
- Prefer an honest unavailable result over an unsupported probability or record.
- Require comparable evidence before describing an alternative as more reliable.
- Defer cycling navigation, accounts, and weather models.

## Changes

- 2026-09-30: Created initial drafts from the user's brief and official catalogue research.
- 2026-09-30: Recorded user confirmation of seven-day horizon, station pickup-time semantics, and ten-minute total walking limit. Updated SPEC.md and plan.md accordingly.
- 2026-09-30: Adopted pooled weekday/hour grouping as the initial baseline to validate and recorded the two requested test journeys. Completed the full-June journey audit in JOURNEY_AUDIT.md. Monday–Friday calculations currently include holidays; holiday treatment, final thresholds, and mean/median presentation remain design recommendations.
- 2026-09-30: Replaced the closest-first product emphasis with a comparison of similarly walkable departure stations. Added proposed shortlist bounds, transparent recommendation reasons, and a separately labeled pooled-duration fallback for validation. Numerical thresholds and pooling policy remain proposals.
- 2026-09-30: Tested five nearby departures per journey against fixed return stations. Found 38 Seoul and 757 Konkuk June trips, with just 9 and 15 weekday-08 trips. Held-out June results support preserving per-station distinctions and leave a pooled fallback unvalidated. Recorded methods and results in STATION_COMPARISON_AUDIT.md; the analysis radius is not an accepted walking threshold.
- 2026-09-30: Extended to April–June, finding 94 and 2,494 eligible shortlist trips and 17/52 weekday-08 trips. Month-to-month tests still do not establish a consistent pooling benefit. Proposed station-specific three-month summaries and researched Kakao walking/map access without activating an account or enabling paid use.

- 2026-09-30: User explicitly removed walking features: “Bike stuff only.” Removed walking directions, times, budget filters, leave-origin/door-to-door calculations, and routing-account setup from active scope. Map pins and nearby station comparison remain; straight-line proximity is the proposed distance method.

- 2026-09-30: User authorized the MVP and three-month history. Implemented Python/SQLite plus Leaflet/OpenStreetMap, all-hours April–June pair summaries, live bike counts, and matched-date archived inventory counts. Empty probability and future reliability ranking remain unimplemented pending source validation. Startup and implementation defaults are in README.md.

Kakao estimates display rounded whole minutes (minimum 1). Saved routes survive restarts and daily budget resets; coordinates and routing preference identify each directional pair, so moving a station requests a new estimate. Bike reports older than two minutes appear as a plain dash, with no stale-report caption; they cannot produce an Available now badge.

The pickup-time helper line is removed; date validation and the Now / In 30min / In 1h controls remain.

Popular routes replace the example buttons. They are the five busiest directional pairs in April–June 2026 after whole-trip deduplication, requiring at least 2 km straight-line station separation and excluding same-station rides and unknown stations. Scan pairs by descending count (station IDs break ties), skipping any used endpoint. Selection only sets map points; comparisons remain manual. Rebuild after importing new history with `python3 scripts/popular_routes.py`. Results are precomputed in `data/processed/popular_routes.json` to keep startup fast. Local Kakao cap: 800 attempts per Seoul day, with saved routes exempt.
