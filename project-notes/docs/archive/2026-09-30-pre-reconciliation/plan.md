## Slate & Teal / Route Ribbon — 30 September 2026

Implemented the selected third color proposal with the Route Ribbon layout. Cool off-white surfaces, slate text/buttons, and sparing muted teal replace lime branding. Origin/destination controls are unframed and connected by a quiet vertical line; results use horizontal rules and a charcoal selected-station rank instead of tinted rows. Bike-count badges use stronger mint, amber (one/two), and coral (zero), independently of quieter risk badges. Logo/favicon and map markers follow the same palette. Phone results reflow each station's four metrics into two columns without horizontal scrolling. Routing and manual-query behavior are unchanged. All 22 frontend checks pass. Browser checks covered empty startup, manual comparison, return to map, and results at desktop, 390 px and 320 px; no page/table horizontal overflow at the phone sizes. Preview: data/processed/mvp-slate-teal-results.png.

## Shared brand palette — 30 September 2026

Applied the warm off-white / charcoal / lime palette to the existing site, including form controls, station selection, tables, map pins, popups, and route guide. Brand accent colors are distinct from semantic inventory/risk colors: zero remains red, one/two amber, and available/low-risk remains muted green. Surface and semantic colors use CSS variables. The current layout is retained while three further layout proposals are reviewed: Paper & Lime, Soft Corners, and Route Ribbon. All 22 frontend checks pass.

Routing follow-up discovered during visual verification: starting exactly at Oksu pier #5651 still produces 49–55 minute walks to nearby #565/#556/#523/#3550 (185–671 m). The previously fixed origin near #556 remains a different case; investigate origin-side bridge correlation as well. No routing changes were made in the palette update.

## Brand identity — 30 September 2026

The selected app name is 따릉이 Where? The approved Looking Wheels mark combines two charcoal eye/wheels with a lime saddle and handlebar. A small native SVG recreation is used in the header and as the browser favicon; the wordmark remains accessible live text. No image-generation service or font download is needed at runtime.

## Empty journey and compact location labels — 30 September 2026

Startup leaves origin and destination unset, with map-selection placeholders and no A/B pins. Metadata load/recovery preserves partial user selections and never supplies an example journey. Compare stations and Fit journey are disabled until both pins are selected. Popular routes still explicitly fill both endpoints. Long location labels are limited to two lines with an ellipsis; full names remain in the title/accessible text. Current location has a persistent crosshair icon, including while locating. The 22 frontend checks pass, including empty startup and partial-selection recovery.

## Walking endpoint correction — 30 September 2026

The Oksu report was reproduced near station #556: pedestrian routes to #565 and #5651 snapped to bridge-marked paths and crossed the Han River before returning, yielding about 55/53 minutes. Pedestrian station endpoints now exclude bridge edges during correlation only; route traversal can still use bridges. The origin considers access paths within 30 m without nearest-edge ranking; the station uses a 50 m candidate radius. Both searches stop at 100 m. Walking summaries include straight access gaps between input pins and mapped route endpoints, at 5.1 km/h; these short access gaps are approximate, not mapped directions. Snap gaps above 100 m produce an unavailable result. Genuine long network detours are not capped. An 8 m offset near #556 now yields approximately 1/3/5 minutes for #556/#565/#5651. Regression checks cover this case, access gaps, rejection of distant snapping, and retention of genuine detours; 40 local station walks also succeeded. Bicycle routing is unchanged.

## Station selection and full Seoul routing — 30 September 2026

Map popup actions Use as departure / Use as return move the corresponding pin to that station, immediately update its fallback name, and refresh the road label through the existing local lookup. Station overrides are retained and comparison remains manual. The routing map is expanded to latitude 37.395–37.745 and longitude 126.735–127.245, covering all 2,735 saved stations with a surrounding buffer. All 20 departure estimates across west–east and north–south extremes passed local routing checks, with walk estimates also available. The west-to-east extreme returned 184.82 minutes / 45.933 km at the existing 15 km/h city-bike setting. Results are recorded in data/processed/full_seoul_routing_check.json.

## Local walking time — 30 September 2026

Each departure row now includes Walk time from the starting pin, using the same local Valhalla graph with pedestrian costing and a 5.1 km/h walking speed. Walking and cycling results use separate cached keys. Routes are computed only on manual comparisons; refreshing bikes preserves both estimates. Zero is shown for a pin exactly at the station, positive times round to at least one minute, and unavailable routes show a dash. Walking time does not alter bike pickup time or the five nearest stations. This supersedes earlier decisions to defer walking estimates.

## Local Valhalla cycling estimates — 30 September 2026

Per-station bike times now use local Valhalla 3.9.0, bicycle_type=city, cycling_speed=15 km/h. Kakao routing is replaced. The table retains its whole-minute estimates and the footer credits Valhalla / OpenStreetMap. Routing graph/provenance are under data/processed/valhalla; source PBF is under data/raw; runtime is the project .venv. No temporary trial paths or external route requests are used. Coverage is latitude 37.395–37.745, longitude 126.735–127.245. Out-of-map or failed routes show unavailable estimates. Manual comparison and bike refresh behavior are unchanged. Walking estimates were added in the update above. Prior Kakao keys and cached results remain for historical comparison.

# Project plan

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

Status: localhost MVP implemented, 2026-09-30. The user lifted the planning-only boundary and requested a three-month ride-history MVP.

## 1. Product foundations

- [x] Record the user's requested outcome in [SPEC.md](../../../SPEC.md).
- [x] Locate official data sources and document access in [DATA_SOURCES.md](../../../DATA_SOURCES.md).
- [x] Separate confirmed requirements, proposals, and open decisions in [DECISIONS.md](../../../DECISIONS.md).
- [x] Confirm seven-day horizon and station pickup-time semantics. The earlier walking budget is superseded by the bike-only scope.
- [x] Adopt a side-by-side comparison of nearby departure stations, including per-station availability and average ride durations.
- [ ] Resolve map display/provider, interface language, and acceptable publication lag; walking routing is out of scope.
- [x] Choose familiar journeys: Seoul Station → City Hall and Konkuk University → Ttukseom Hangang Park.
- [ ] Confirm exact example pins when needed; walking routes are not required.

Exit: a shared scope with key definitions agreed. Unknown data properties may remain explicit audit questions.

## 2. Obtain access and inspect a small data package

The key is configured. The initial sample audit and full-month journey follow-up are complete; see [DATA_AUDIT.md](../../../DATA_AUDIT.md) and [JOURNEY_AUDIT.md](../../../JOURNEY_AUDIT.md). The subsequent MVP is now implemented.

- [x] User obtains a general Seoul API key (reported 2026-09-30).
- [x] Prepare ignored local configuration for the key.
- [x] User saves the key in `.env.local`.
- [x] Verify live access with a five-station request (`INFO-000`, 2026-09-30).
- [ ] Check live access, quota, pagination, errors, and station identity mapping.
- [ ] Inspect one trip month, one availability quarter, station metadata, and recent hourly observations.
- [x] Inspect a 5,994-trip prefix, the full Q4 2025 availability archive, two live station pages, and one recent historical hour.
- [x] Scan all 4,182,797 June 2026 trip records for candidate station pairs in the two familiar journey areas; compare Monday/hour with pooled weekday/hour coverage.
- [x] Fetch remaining live pages: 2,735 distinct station IDs observed across pages; verify terminal INFO-200 response. Time consistency, quotas, and full metadata checks remain open.
- [x] Confirm duration/distance units and demonstrate station-ID joins in the samples.
- [ ] Confirm exact hourly availability measurement semantics; the archive header and inspected documentation leave this unresolved.
- [ ] Measure missingness, publication lag, station mapping success, and sample sizes for familiar journeys.
- [x] Produce an initial feasibility report, including supported outputs, archive gaps, and limits of the partial trip sample.

Exit: demonstrate one directed station pair with valid durations and one station with interpretable availability observations. If inventory semantics do not support empty rates, revise that feature explicitly before development.

## 3. Set the baseline method and technical design

- [x] Choose pooled weekday/hour groups as the first baseline to validate.
- [ ] Validate weekday pooling, holiday handling, season groups, minimum evidence requirements, and broader-time fallback rules.
- [ ] Set the nearby-station shortlist size and expansion behavior using labeled straight-line proximity; validate bike-based recommendation rules.
- [ ] Assess a labeled nearby-station duration fallback using common destination/time cohorts, without pooling station availability or reassigning ride records.
- [x] Run an initial fixed-destination, five-departure comparison and chronological June holdout test; document mixed pooling results in [STATION_COMPARISON_AUDIT.md](../../../STATION_COMPARISON_AUDIT.md).
- [ ] Validate any pooling fallback with additional months and route checks; June alone does not establish an accuracy benefit or reliable 08:00 predictions.
- [x] Extend duration checks to all April–June records and evaluate April → May and April–May → June. Keep pooled prediction outside proposed v1 recommendation logic; bike-journey comparability remains open.
- [ ] Define duration cleaning and the record window from actual data.
- [x] Use Leaflet/OpenStreetMap for map display and labeled straight-line proximity, without walking calculations.
- [x] Remove walking routing, walking-time estimates, walking-budget filters, and the associated account setup from scope at the user's request. Prior research in MAPS_AND_WALKING.md is superseded.
- [ ] Design compact historical summaries and provenance fields.
- [x] Use a Python standard-library service, plain browser JavaScript, and indexed SQLite.
- [ ] Decide whether older historical frequencies suffice initially or whether fresh collection is required.

Exit: all user-visible numbers have a precise definition, including unavailable states. No advanced machine learning required for the baseline.

## 4. MVP implementation — complete

- [x] Map origin/destination pins, draggable markers, and the two familiar journey shortcuts.
- [x] Five nearby departures, expandable to ten/twenty; selectable departure and return stations.
- [x] Live paginated bike counts, per-page fetch times, refresh throttling, and stale/error states.
- [x] Complete April–June import into indexed SQLite; credentials and raw histories remain outside the browser.
- [x] Per-pair all-hours mean, median, count, distinct days, and screened fastest observation with its date.
- [x] Matching-date hourly archived zero-count comparison, with measurement limitations visible; no numerical empty forecast.
- [x] Explained current-bike suggestions; future availability explicitly unverified.
- [x] Responsive interface and local startup instructions in README.md.
- [x] Automated core/data-regression checks and browser checks of journey selection, return changes, future pickup, list expansion, map pin placement, and narrow-screen overflow.

The simplest baseline uses all pickup times for durations. Hour/day grouping is retained for archived inventory. No nearby-station pooling or walking features were implemented.

## 5. Validate usefulness and claims

- Compare displayed summaries against independently checked sample records.
- Exercise the acceptance scenarios in SPEC.md, including missing/stale data and midnight/timezone boundaries.
- Check that map distances are labeled straight-line and no access-time estimates are implied.
- Evaluate availability estimates on later held-out dates, separating old and new stations and reporting coverage.
- Check that suggested alternatives have comparable evidence of better bike availability.
- Confirm that almost equally near stations both appear and that broader-time or pooled-duration fallbacks are labeled with the correct source population.
- Keep only historical-frequency wording if predictive calibration is weak or untested.

## Scope and effort assessment

The map, current counts, and historical summaries fit a small personal project. The substantial uncertainty is data quality and whether there is enough history for the requested station pairs and times. Precise future availability, weather effects, complete routing, and uninterrupted collection increase the scope considerably. Estimate calendar effort after the small data audit rather than promising a schedule before access and schema checks.

## Current status

The MVP runs locally; README.md has startup and import instructions. The complete 12,149,891 April–June source rows were inspected, retaining 11,776,397 eligible rows before pair-level deduplication in a roughly 1.17 GB database. Q4 2025 archive observations support descriptive comparisons only. Live bike counts were verified in the browser. Seven automated tests pass, including the independently audited ten station pairs.

Open work concerns source measurement semantics, holidays, station continuity/closures, and statistical validation. The MVP does not estimate future empty probabilities, enforce walking budgets, deploy publicly, or run an archival collector. Browser background-map tiles and live counts need internet access.
