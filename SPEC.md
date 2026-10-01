# Product specification: 따릉이 Where?

Current static-only behavior, 2026-10-01. Rationale is in [DECISIONS.md](DECISIONS.md).

## Purpose and scope

Help a rider choose among nearby Seoul public-bike departures for a starting point, destination, and bike pickup time. Static browser app hosted on GitHub Pages. Current interface: English labels with official Korean station names/numbers; a complete language policy has not been separately settled.

Compare current bikes, local walking/cycling estimates, and a distinct historical availability signal. A 10 m proximity advantage should not hide the alternatives. No booking, payment, accounts, turn-by-turn navigation, destination-capacity forecast, or validated future empty probability is implemented.

## Inputs and manual queries

- Start with both points unset, no A/B pins, and Compare stations / Fit journey disabled until both are chosen. Metadata recovery preserves partial selections.
- Place/drag map pins, select a Popular route, or use Current location for the origin. GPS is one permission-controlled fix, not continuous tracking. Denied/failed/out-of-area access preserves the journey; manual edits supersede late fixes.
- Show approximate street names without house numbers. Local lookup searches within 250 m, prefers English where available, and adds “Near” beyond 35 m. Missing roads fall back to meaningful station/landmark text. Ignore late lookups for older selections. Labels are visually limited to two lines, with full text retained.
- Pickup means **collecting the bike at the station**, in Asia/Seoul (KST), now through seven days ahead. Minute-precision input has a one-minute past tolerance in the browser. Walking time does not shift pickup or enforce the abandoned ten-minute budget.
- Now / In 30min / In 1h set the draft relative to click time. Editing points, GPS, time, shortcuts or map station choices invalidates the old comparison, but does not query history/routes or start live collection.
- **Compare stations** explicitly queries the draft. **Refresh bikes** updates inventory only, preserving historical and route estimates. No periodic/tab-visibility collection; short polling only finishes a user-initiated refresh. Browser operations time out after 30 seconds and release controls for retry.

## Nearby stations and navigation

The browser requests five nearest departures by straight-line origin proximity. No walking-time radius/filter or list expansion. Compare all five to the same return: nearest by straight-line destination proximity unless explicitly selected through a map popup. Use as departure / Use as return moves the corresponding pin and updates the road label; queries remain manual.

Manual comparison replaces the map with results. Back to map restores the journey; late replies must not switch views. Desktop keeps the planner visible, phones hide it in results. Outer page fits the viewport, with internal scrolling if needed. The dashed A–B line updates with both pins and is a **straight guide, not a cycling route**.

## Results

| Column | Meaning |
| --- | --- |
| Departure station | Official name, “Station #…” number, straight-line distance, neutral selection/rank box, compact Nearest/current-bike tags where applicable |
| Bikes now | Fresh inventory: mint 3+, amber 1–2, coral 0. Missing/expired reports are a neutral dash. |
| Est. walk time | Valhalla pedestrian estimate from A to that departure at 5.1 km/h. Exact same coordinates → 0 min; positive results round to at least 1 min. |
| Est. ride time | Valhalla city-bicycle estimate from that departure to the common return, configured at 15 km/h. Whole minutes, minimum 1 for positive routes. |
| Availability now OR Historical no-bike risk | Current availability for immediate pickup; separate archived signal for later pickup, defined below. |

Selection updates the rank and numbered map marker consistently; button focus survives redraws. Phone metrics reflow beneath each station in two columns, without sideways table scrolling. One right-aligned refresh completion time and Valhalla / OpenStreetMap credit. No per-row timestamps, return dropdown, rental-history card/columns, archive captions/counts, slogans, or visible methodology block. See [DESIGN.md](DESIGN.md).

## Live inventory and immediate pickup

Freshness is at most 120 seconds from the feed's local receipt time. The provider supplies no observation timestamp. Reports expire even on failed/hanging refreshes, with no stale-report caption. Missing station/count, failure, or expired data is unavailable, never zero.

For pickup within 15 minutes of comparison: fresh 0 → **Empty now**; 1–2 → **Few bikes**; 3+ → **Available now**; missing/expired → **Unknown**. Historical Low never overrides fresh zero. The planner selects the closest compared fresh nonzero station (excluding the return); no unused alternative recommendation is calculated or displayed. Counts are snapshots, not pickup guarantees.

## Future pickup and historical signal

More than 15 minutes ahead, the final column is **Historical no-bike risk**, based on each station's own archive dates at the chosen pickup hour. Pool Monday–Friday versus Saturday–Sunday; holidays currently follow weekdays. Minimum 20 recorded days; invalid/missing evidence → Unknown. Share of recorded hourly values equal to zero: Low <5%; Moderate 5%–<20%; High ≥20%.

Current archive: **2025-10-01 to 2025-12-31**. Exact hourly sampling/aggregation semantics remain unresolved. These are experimental descriptive bands, not calibrated future probabilities. Missing observations are excluded; coverage differs. No blend with live counts, numerical probability, future reliability ranking, or 30-minute refill forecast is implemented. Zero now can coexist with historical Low for a future pickup; keep the meanings separate. Changing destination or refreshing bikes must not change the same station/hour/group's historical rating.

## Routing estimates

Valhalla 3.8.3 uses a saved OpenStreetMap graph on the device; estimates are independent of pickup time and require no Kakao request/key. Outside-map endpoints, same-station cycling, missing graph/runtime, and route failures show a dash. Failure in one mode does not hide the other.

Graph bounds: south 37.395, west 126.735, north 37.745, east 127.245; all 2,735 saved stations were covered in the September 30 check. OSM connectivity and endpoint matching can produce incorrect detours. Approximate short pedestrian access gaps are added; gaps over 100 m are rejected. The partial Oksu fix and remaining exact-pier origin case are recorded in [plan.md](plan.md).

## Popular routes

Five retained precomputed directional pairs from April–June 2026 rental data, descending deduplicated count, minimum 2 km straight-line station separation. The static build reads these seeds without a rental database. Exclude loops/unknown stations and greedily skip any reused endpoint. This is a filtered popularity list, not the unfiltered top five or evidence that routes are pleasant/safe. A shortcut sets both pins but never queries.

## Acceptance criteria

1. Empty startup/recovery preserves partial selection; draft edits and bootstrap cause no comparison/provider fetch.
2. Explicit comparison/refresh works; refresh does not reroute/requery history. Same return for every departure.
3. Map station choices update pin and road label; stale GPS/label/query replies cannot overwrite newer choices/views.
4. Seoul time, seven-day validation and click-relative shortcuts work independently of computer timezone.
5. Current zero overrides history for immediate pickup; future signals remain separate. Unknown is neither zero nor Low.
6. Counts/recommendations/open popup values expire despite failed/hanging refreshes.
7. Zero walking, missing routes and same-station cycling are distinct; caching respects direction, coordinates and mode.
8. All phone metrics/controls remain accessible, long names fit, and station focus/selection survives redraws.
9. Secrets/raw datasets are absent from browser assets/static routes and credential-bearing logs/errors.

Evidence is in [REVIEW.md](REVIEW.md); passing tests do not validate every OSM route or forecast.

## Deferred work

Walking **estimates are included** after the later user request. Walking directions, budget filters, leave-origin/door-to-door totals, cycle navigation/geometry, address search, accounts, saved journeys, weather forecasts, alerts, destination availability, and unattended collection remain deferred. Known issues and proposals are centralized in [plan.md](plan.md).

## Static runtime

Bootstrap loads map metadata only. Historical sufficient statistics, street shards and browser Valhalla assets load lazily; raw archives and SQLite are never downloaded. The official bike website’s fixed HTTPS feed allows direct browser requests without an API key, proxy or cookies, with one pending request and a 60-second per-tab attempt cooldown. Failed counts are Unknown; routes/history remain usable. A six-month export window is supported, but requires additional source months before six-month coverage can be claimed. Physical-phone performance remains unverified.
