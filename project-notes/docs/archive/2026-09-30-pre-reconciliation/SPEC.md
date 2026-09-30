## Visual design — 30 September 2026

The approved design is Route Ribbon with Slate & Teal colors: a cool off-white canvas, slate typography and primary action, sparing muted teal accents, unframed A/B controls with a vertical connector, and a simple results table. The chosen departure uses a charcoal rank. Bike counts have clear mint, amber (1–2), and coral (0) boxes; unavailable counts stay neutral. Risk badges are quieter than inventory badges. The Looking Wheels logo uses slate wheels and muted teal saddle/handlebar. Phone station rows show the four metrics in two columns instead of requiring horizontal scrolling. The one-screen map/results navigation and manual comparisons remain intact.

## Walking endpoint correction — 30 September 2026

The Oksu report was reproduced near station #556: pedestrian routes to #565 and #5651 snapped to bridge-marked paths and crossed the Han River before returning, yielding about 55/53 minutes. Pedestrian station endpoints now exclude bridge edges during correlation only; route traversal can still use bridges. The origin considers access paths within 30 m without nearest-edge ranking; the station uses a 50 m candidate radius. Both searches stop at 100 m. Walking summaries include straight access gaps between input pins and mapped route endpoints, at 5.1 km/h; these short access gaps are approximate, not mapped directions. Snap gaps above 100 m produce an unavailable result. Genuine long network detours are not capped. An 8 m offset near #556 now yields approximately 1/3/5 minutes for #556/#565/#5651. Regression checks cover this case, access gaps, rejection of distant snapping, and retention of genuine detours; 40 local station walks also succeeded. Bicycle routing is unchanged.

## Station selection and full Seoul routing — 30 September 2026

Map popup actions Use as departure / Use as return move the corresponding pin to that station, immediately update its fallback name, and refresh the road label through the existing local lookup. Station overrides are retained and comparison remains manual. The routing map is expanded to latitude 37.395–37.745 and longitude 126.735–127.245, covering all 2,735 saved stations with a surrounding buffer. All 20 departure estimates across west–east and north–south extremes passed local routing checks, with walk estimates also available. The west-to-east extreme returned 184.82 minutes / 45.933 km at the existing 15 km/h city-bike setting. Results are recorded in data/processed/full_seoul_routing_check.json.

## Local walking time — 30 September 2026

Each departure row now includes Walk time from the starting pin, using the same local Valhalla graph with pedestrian costing and a 5.1 km/h walking speed. Walking and cycling results use separate cached keys. Routes are computed only on manual comparisons; refreshing bikes preserves both estimates. Zero is shown for a pin exactly at the station, positive times round to at least one minute, and unavailable routes show a dash. Walking time does not alter bike pickup time or the five nearest stations. This supersedes earlier decisions to defer walking estimates.

## Local Valhalla cycling estimates — 30 September 2026

Per-station bike times now use local Valhalla 3.9.0, bicycle_type=city, cycling_speed=15 km/h. Kakao routing is replaced. The table retains its whole-minute estimates and the footer credits Valhalla / OpenStreetMap. Routing graph/provenance are under data/processed/valhalla; source PBF is under data/raw; runtime is the project .venv. No temporary trial paths or external route requests are used. Coverage is latitude 37.395–37.745, longitude 126.735–127.245. Out-of-map or failed routes show unavailable estimates. Manual comparison and bike refresh behavior are unchanged. Walking estimates were added in the update above. Prior Kakao keys and cached results remain for historical comparison.

## Kakao cycling estimate — 30 September 2026

Manual comparisons obtain bicycle estimates for all displayed departure stations to the selected return station, using saved estimates first. Each table row displays its own Kakao cycling estimate rounded to whole minutes. The summary panel and historical rental duration display have been removed. The interface compares five nearby stations and offers no expansion button, limiting new routing requests. Unavailable routes display a dash with an explanatory tooltip. The estimate is not a pickup-time forecast. Bicycle roads are preferred (`BIKE_ONLY`). The map's A–B line remains a straight guide, not route geometry.

The REST key is loaded server-side from `KAKAO_REST_API_KEY` in `.env.local`. Only station coordinates go to Kakao. Successful station-pair results are saved without automatic expiry in `data/processed/kakao_routes.json`; 800 outbound attempts per Seoul calendar day are allowed, including failures, and the counter survives restarts. The cache stores no key. This local limit does not configure Kakao billing or account-wide quotas. Bike refreshes, GPS/pin changes, and initial page loading make no Kakao requests. Failed routing leaves history and inventory usable.

Official API: https://developers.kakao.com/docs/en/kakaomap/rest-api#bicycle

# Seoul bike ride planner — draft specification

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

Status: localhost MVP implemented, 2026-09-30. The user authorized implementation and a three-month ride-history window. See README.md for running it.

Evidence update: [DATA_AUDIT.md](../../../DATA_AUDIT.md) documents the initial sample inspection. Trip duration fields and station-ID joins are demonstrated. Exact hourly availability measurement semantics remain an open condition for numerical empty-risk claims.

The full-month follow-up, [JOURNEY_AUDIT.md](../../../JOURNEY_AUDIT.md), tests Seoul Station → City Hall and Konkuk University → Ttukseom Hangang Park. It demonstrates the benefit of weekday pooling and the need to distinguish mean rental duration from median duration.

[STATION_COMPARISON_AUDIT.md](../../../STATION_COMPARISON_AUDIT.md) tests five nearby departures per journey with a fixed return station. It supports exposing per-station comparisons, but does not establish a consistent accuracy benefit from combining station histories. Pooled duration remains experimental.

## Purpose

Help someone decide where to pick up a Seoul public bicycle (따릉이 / Ddareungi) for a journey, using current bike counts and historical evidence.

The user selects an origin, a destination, and a bike pickup date/time. The app compares nearby departure stations, reports bike availability and historical rental durations for each, and helps the user choose between them. The user decides how to reach the stations. Walking directions, walking-time estimates, and walking-budget filters are outside scope.

## Confirmed requirements

- Runs in a browser, initially on localhost.
- Origin and destination selected on a map.
- Departure time influences the historical comparison.
- Planning horizon is now through the next seven days.
- Departure time means collecting the bike at the station.
- Bike information only: no walking directions, walking-time estimates, or enforcement of the earlier ten-minute walking preference.
- Show a comparison of nearby departure stations at comparable proximity, including the closest, with current bike counts and average ride durations for each.
- Show historical evidence about the chance of finding no bike.
- Show average ride duration and a recent historical record duration.
- Help choose a departure station using bike availability, rental duration, and evidence quality; show a more reliable nearby alternative when supported.
- Build the MVP now, following the completed foundations; use three months of rental history, displaying the actual available dates.

Implementation defaults below are documented in README.md and DECISIONS.md. Remaining research proposals are not validated forecasts.

## First implemented version

Personal use; English interface with official Korean station names and station numbers. Select pins directly on a map. Support Seoul stations, initially validate the data on a few familiar journeys. No account, booking, payment, or turn-by-turn navigation.

A Python standard-library local service supplies a plain JavaScript/Leaflet interface with current counts and indexed SQLite historical summaries. It keeps the Seoul API key out of browser code and imports raw histories outside the browser. OpenStreetMap provides attributed background tiles for interactive viewing; no extra map account is required. Internet access is needed for live counts and map tiles.

## MVP interpretation

Use April–June 2026, the latest three complete available downloaded months, for every directed pair's all-hours descriptive mean and median. The requested pickup hour changes the archived availability comparison; it does not filter the ride average in this simplified MVP. Show dates and counts rather than imply this is July–September or a time-specific duration model. Nearby station histories remain separate.

Compare five departures initially, expandable to ten or twenty, with manual map selection. Live counts refresh at most once per minute during visible-tab use and become stale after two minutes. Near-term suggestions use current nonzero counts only. Future reliability remains unverified: display matching-date Q4 2025 zero-count records, not an empty probability or future reliability recommendation. The fastest display uses the explicitly documented heuristic screen in README.md and remains an observed rental, not a verified record. “Limited history” below 20 trips is a display caution, not a confidence threshold.

## Journey and time definitions

Confirmed planning horizon: now through seven days ahead. Proposed timezone rule: all inputs, historical grouping, and displays use Asia/Seoul time, regardless of computer timezone.

Confirmed departure semantics: time of collecting the bike at the station. Compare departure candidates at the same requested pickup time. Do not calculate when to leave the origin or silently move the selected pickup time forward. A current count is an observation, not a guarantee of availability at pickup.

Choose a departure station near the origin and a return station near the destination. Historical duration describes the directed departure-station → return-station pair. The reverse direction is a different pair. Hold the return station fixed when comparing departure alternatives in the first version.

Show station-to-station rental duration. Historical rental duration can include stops and detours; it is not a measurement of uninterrupted cycling or evidence of the route taken. Door-to-door journey time and leave-origin time are outside scope.

## Result requirements

| Item | Meaning and required context |
| --- | --- |
| Closest departure station | Station name, number, and clearly labeled straight-line distance from the origin |
| Comparable departure stations | Side-by-side rows/cards with straight-line distance, bikes now, historical availability, pair-specific mean/median rental duration, and supporting sample size |
| Return station | Station near the destination, initially selected by straight-line proximity and changeable by the user |
| Bikes now | Latest reported count, time fetched, and stale/unavailable state |
| Historical empty rate | Observed frequency of zero available bikes in comparable historical observations; dates, sample size, and evidence quality |
| Average rental duration | Arithmetic mean of eligible trips for the directed station pair, with trip count and coverage dates |
| Typical rental duration | Proposed companion median, since long stops can skew the mean |
| Fastest observed rental | Smallest eligible duration for the same directed pair within an explicitly shown data window |
| Suggested departure | Explain the practical reason for a suggestion, such as similar proximity and better-supported bike availability. Preserve the comparison and the user's choice. |
| Farther alternative | Nearby candidate with sufficiently supported better bike availability; show map location, straight-line distance, and pair-specific rental statistics |

Current bike counts always describe now, even when planning a future ride. A missing or stale count is not zero. A fetched timestamp must not be presented as the provider's observation timestamp if the API does not supply one.

## Historical availability

Trip logs alone cannot establish an empty-station probability: zero rentals may mean no demand, no bikes, or a closure, and operator redistribution is not captured by ordinary customer trips.

Use station availability observations, after validating whether the hourly values are snapshots, averages, or another aggregation. A zero snapshot can support a snapshot-based historical empty rate. An hourly mean cannot tell us whether a station was empty at some point during that hour.

Start with an interpretable baseline: comparable station observations grouped by local pickup hour, pooled weekdays versus weekends, and season where coverage permits. The user's preferred starting point is “weekdays at 8 a.m.” rather than “Monday at 8 a.m.” Retain day-of-week diagnostics to test whether pooling hides meaningful differences. Separate holidays where a reliable calendar is available. Until then, explicitly label Monday–Friday calculations as including holidays. Compare stations using compatible periods and grouping rules.

Missing rows, collection outages, and station closures are not empty observations. Deduplicate observations and report coverage in distinct days as well as row counts. Avoid treating repeated adjacent observations as independent evidence. New or moved stations may have no usable history.

The inspected Q4 2025 archive has one citywide missing date/hour slot per month and additional station-specific coverage gaps. Preserve these as missing observations. Its count header alone does not establish snapshot semantics; numerical empty-rate display remains conditional on a verified definition or suitable newly collected observations.

The initial display should say “Historically empty in X% of comparable observations,” with dates and uncertainty. Do not promise a calibrated probability for a specific future minute. Numerical display thresholds, smoothing, and the minimum improvement needed to recommend an alternative must follow the data audit and validation, not arbitrary apparent precision.

Evaluate against later held-out dates before describing an estimate as a forecast. Recent and seasonal baselines should be compared. Do not combine current count and historical frequency into a new percentage without testing that method. Weather-aware forecasting is a later extension.

## Ride durations and the record

Use trips with valid station mapping, timestamps/duration, and direction. Establish cleaning rules from the actual schema and distributions: duplicates, nonpositive durations, impossible speeds where distance is reliable, timestamp disagreements, service/test stations, and station moves. Log exclusions and retain raw input provenance. Do not automatically discard every long trip merely because it changes the average.

The June sample contains reported zero-minute rentals with positive elapsed seconds and different-station trips with zero recorded distance. Retain both reported and timestamp-derived duration for validation, and do not assume recorded distance is always suitable for speed checks. Omit rider demographics from processed product data.

Prefer comparable time/day cohorts when enough trips exist; otherwise broaden the time grouping for the same pair and visibly label the change. When the pair still has too little data, display “Not enough station-specific history.” A separately labeled pooled nearby-station estimate may be shown if its comparability has been validated as described below. Do not invent a historical duration from straight-line distance or silently substitute another station pair.

Availability and duration require separate coverage checks. Full-June examples have hundreds of trips for some pairs but only a handful during weekday 08:00–08:59. A fallback to broader same-pair history must not be labeled an 8 a.m. estimate. Long rentals can strongly separate mean and median, even after basic timestamp checks.

Proposed record window: the latest three complete months available in the imported trip dataset. Display the actual date range, never imply it means the last three calendar months if publication lags. A raw minimum is highly sensitive to errors: show a fastest value only after plausibility checks, with its date and supporting trip count. It is an observed rental duration, not a verified sporting record or a target to beat.

An alternative station's duration and fastest value must be recomputed for its own pair with the selected return station.

### Pooling nearby departure-station history

The user wants comparable nearby stations included in the result, both to inform station choice and to make more historical data useful. Keep each station's observed duration and availability distinct. Displaying several stations makes more relevant records visible; it does not itself increase the sample size for any one station pair.

Proposed additional fallback: a clearly labeled “Nearby-station estimate” combining eligible rides from a defined departure-station group to the same return station. Similar proximity to the origin is not sufficient evidence of similar bike journeys: examine location, barriers, direction, ride-distance distributions, and observed durations before pooling. Do not silently broaden return stations as well.

For a pooled descriptive mean, aggregate the underlying eligible trips once each, or equivalently weight exact means by trip counts. Do not take an unweighted average of station averages or average station medians to obtain a pooled median. Show contributing stations, their counts, date/time cohort, and total unique eligible trip count. Comparable periods and cleaning rules must be used across the group; do not mix a weekday-08 sample at one station with an all-hours sample at another.

An estimate borrowed from the group must not be labeled as that station's observed average, increase its displayed station-specific sample count, or justify ranking it faster than another member given the same borrowed estimate. Withhold pooling if differences cannot be bounded or explained. Validate pooled estimates against held-out station-pair trips before relying on them for recommendations.

Initial evidence: the June test exposes 38 and 757 trips across the two five-station shortlists, but only 9 and 15 at weekday 08. Training on June 1–20 and evaluating June 21–30 shows mixed pooling results; both morning tests have only two held-out rentals. Proximity alone does not establish comparable journeys, and this one-month test does not authorize a default pooled prediction. Additional months and route checks are required. The test's 350 m straight-line radius around reference bike stations is solely an analysis definition, not an accepted product search radius.

Follow-up evidence: April–June yields 94 and 2,494 eligible rentals across those same shortlists, but only 17 and 52 weekday-08 rentals. April → May and April–May → June checks still show no consistent pooling advantage; station-specific morning coverage is uneven. Proposed v1 policy: use station-specific summaries, allow explicitly labeled broader-time fallbacks, and omit pooled predictions from recommendation logic. Use the latest three complete available months as a proposed descriptive duration window, with actual dates shown. More history alone does not resolve station continuity, holiday handling, or route comparability.

Availability remains station-specific because nearby stations can have very different inventory patterns. Do not combine empty rates as if they describe any individual station or assume independent availability across stations. Fastest observed rentals remain tied to their actual departure/return pair; no pooled record is assigned to another station.

## Station comparison and suggestions

Use clearly labeled straight-line distance as the proposed proximity measure for the map and station list. It is not walking distance or travel time. The user chooses how to reach a station. The latest instruction removes walking routing, the ten-minute filter, the two-extra-walking-minutes rule, and door-to-door estimates. A walking API account is no longer a project dependency. Use Leaflet with OpenStreetMap tiles for rendering and pin selection only.

The core result is a shortlist. A station 240 metres away and another 250 metres away should both be visible, even if their historical availability is similar or unknown. Keep an empty nearest station visible with its status, and filter known closed or unsuitable stations where status data supports that distinction.

Proposed presentation: show roughly three to five nearby departures initially, allow expansion and manual station selection on the map, and show straight-line distances from the selected origin. Shortlist size and any geographic search radius remain proposals; no fixed distance threshold replaces the removed walking budget. Keep the return station fixed when comparing departure candidates, and allow the user to change it.

For each candidate show current bikes with fetch time, historical availability and evidence, rental mean/median, trip count, and data dates. Any estimated arrival refers to the return station and starts at the chosen bike pickup time; do not add access travel or claim arrival at the final destination.

Proposed recommendation behavior: for an immediate journey, prioritize a fresh report of available bikes among nearby options, then supported reliability and station-to-station rental duration. A currently empty station must not be presented as immediately available. For future journeys, use comparable historical evidence; today's count stays a separate fact. Explain suggestions plainly without an invented combined percentage or opaque score. A ten-metre proximity advantage must not automatically win over substantially better bike availability. Unknown risk is not low risk, and a lower mean based on a handful of rentals is not proof of a faster option.

If evidence does not establish a clear preference, say so and let the user compare. Nearby stations remain visible without requiring proof that one is more reliable than the closest.

Destination return feasibility needs its own verified rules. Do not assume nominal rack count minus bikes is the number of permissible returns.

## Acceptance scenarios for eventual implementation

1. Two map pins and a departure date/time produce departure and return station information.
2. A future journey clearly separates bikes available now from historical availability at pickup time.
3. Missing API data never appears as zero bikes; stale data is visibly marked.
4. A station with little or no history produces an honest unavailable/low-evidence result.
5. Pair-specific mean and fastest values include data dates and sample counts; reverse trips are separate.
6. When no clearly better station is established, the app still shows eligible nearby candidates and states that there is no clear recommendation.
7. Switching departure station preserves the requested pickup time and updates pair-specific rental statistics.
8. Distances are labeled straight-line and never converted into walking minutes or presented as route lengths.
9. A same-station origin/return does not misuse leisure-loop durations as transport estimates.
10. Only compact summaries reach the browser; the API credential is absent from frontend files and logs.
11. Candidates at comparable straight-line distances, including the user's 240 m versus 250 m example, are both visible with their own availability, rental averages, and sample sizes.
12. Any pooled nearby-station estimate is labeled and attributed to its contributing stations. Its sample count and fastest rental are not misrepresented as station-specific observations.
13. No walking directions, ten-minute walking filter, leave-origin time, or door-to-door duration appears in the interface.

## Deferred scope

Walking directions and times, full cycling directions, weather-adjusted predictions, accounts, saved journeys, alerts, deployment, continuous unattended collection, multi-person bike requirements, and destination availability forecasting. These can be revisited after the basic data audit.

Kakao estimates display rounded whole minutes (minimum 1). Saved routes survive restarts and daily budget resets; coordinates and routing preference identify each directional pair, so moving a station requests a new estimate. Bike reports older than two minutes appear as a plain dash, with no stale-report caption; they cannot produce an Available now badge.

The pickup-time helper line is removed; date validation and the Now / In 30min / In 1h controls remain.

Popular routes replace the example buttons. They are the five busiest directional pairs in April–June 2026 after whole-trip deduplication, requiring at least 2 km straight-line station separation and excluding same-station rides and unknown stations. Scan pairs by descending count (station IDs break ties), skipping any used endpoint. Selection only sets map points; comparisons remain manual. Rebuild after importing new history with `python3 scripts/popular_routes.py`. Results are precomputed in `data/processed/popular_routes.json` to keep startup fast. Local Kakao cap: 800 attempts per Seoul day, with saved routes exempt.
