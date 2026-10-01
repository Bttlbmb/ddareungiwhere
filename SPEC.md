# Product specification: 따릉이 Where?

Current static-only behavior, 2026-10-01. Rationale is in [DECISIONS.md](DECISIONS.md).

## Purpose and scope

Help a rider choose among nearby Seoul public-bike departures for a starting point, destination, and bike pickup time. Static browser app hosted on GitHub Pages. Current interface: English labels with official Korean station names/numbers; a complete language policy has not been separately settled.

Compare current bikes, local walking/cycling estimates, and a distinct historical availability signal. A 10 m proximity advantage should not hide the alternatives. No booking, payment, accounts, turn-by-turn navigation, destination-capacity forecast, or validated future empty probability is implemented.

## Inputs and manual queries

- Start with both points unset, no A/B pins, and Compare stations / Fit journey disabled until both are chosen. Metadata recovery preserves partial selections.
- Place/drag map pins or use Current location for the origin. GPS is one permission-controlled fix, not continuous tracking. Denied/failed/out-of-area access preserves the journey; manual edits supersede late fixes.
- Show approximate street names without house numbers. Local lookup searches within 250 m, prefers English where available, and adds “Near” beyond 35 m. Missing roads fall back to meaningful station/landmark text. Ignore late lookups for older selections. Labels are visually limited to two lines, with full text retained.
- Pickup means **collecting the bike at the station**, in Asia/Seoul (KST), now through seven days ahead. Minute-precision input has a one-minute past tolerance in the browser. Walking time does not shift pickup or enforce the abandoned ten-minute budget.
- Now / In 30min / In 1h set the draft relative to click time. Editing points, GPS, time or map station choices invalidates the old comparison, but does not query history/routes or start live collection.
- **Compare stations** explicitly queries the draft. **Refresh bikes** updates inventory only, preserving historical and route estimates. No periodic/tab-visibility collection; short polling only finishes a user-initiated refresh. Browser operations time out after 30 seconds and release controls for retry.

## Nearby stations and navigation

The browser requests five nearest departures by straight-line origin proximity. No walking-time radius/filter or list expansion. Compare all five to the same destination station: nearest by straight-line destination proximity unless explicitly selected through a map popup. Use as departure / Use as destination moves the corresponding pin and updates the road label; queries remain manual.

Station popups show **#number · station name** and the two point-selection actions. They never display bike quantities or live-count status messages; inventory remains in comparison results.

Manual comparison replaces the map with results. Back to map restores the journey; late replies must not switch views. Desktop keeps the planner visible, phones hide it in results. Outer page fits the viewport, with internal scrolling if needed. The dashed A–B line updates with both pins and is a **straight guide, not a cycling route**.

## Results

| Column | Meaning |
| --- | --- |
| Station | Departure station's official name, “Station #…” number, straight-line distance, neutral selection/rank box; no Nearest/current-bike indicators |
| Bikes | Last fetched inventory: mint 3+, amber 1–2, coral 0. Counts remain visible until an explicit action updates them; missing reports are a gray box containing `/`, with an accessible unavailable label. |
| Walk time | Valhalla pedestrian estimate from A to that departure at 5.1 km/h. Exact same coordinates → 0 min; positive results round to at least 1 min. |
| Ride time | Valhalla city-bicycle estimate from that departure to the common destination station, configured at 15 km/h. Whole minutes, minimum 1 for positive routes. |
| Availability now OR Historical no-bike risk | Current availability for immediate pickup; separate archived signal for later pickup, defined below. |

Selection updates the rank and numbered map marker consistently; button focus survives redraws. Phone metrics reflow beneath each station in two columns, without sideways table scrolling. One right-aligned refresh completion time and Valhalla / OpenStreetMap credit. No per-row timestamps, destination dropdown, rental-history card/columns, archive captions/counts, slogans, or visible methodology block. See [DESIGN.md](DESIGN.md).

**Your destination.** beneath the departure rows shows the common destination station name/number and one forward pedestrian estimate from that station to the selected destination B, at 5.1 km/h. Its station name and duration share the departure typography; desktop duration aligns with the Walk time column. The duration is followed by an arrow and the applied destination label, emphasized in a mint tag. Exact coordinates give 0 min; unavailable routes give a dash without suppressing departure results. Refresh bikes preserves this final walking estimate. This section was added at the user's request on 2026-10-01.

Walking/cycling estimates retain whole-minute rounding. Rounded values above 60 minutes display hours and remaining minutes, e.g. **1h 12min**, or **2h** for exact hours. Values up to 60 minutes retain the minute format. Refresh bikes follows the completion time and routing credit in the same footer, separated by a dot; on narrow screens this footer wraps within the scrolling results body.

## Live inventory and immediate pickup

The provider supplies no observation timestamp. At the user's request on 2026-10-01, the last valid count and immediate-availability snapshot remain stable through elapsed time, returning to the tab, and failed/hanging refreshes. There is no count-expiry timer. The existing footer shows the last completed refresh time. Missing or invalid quantities without a prior valid snapshot are unavailable, never zero.

After a live request fails or times out, show a small red notice directly below the five departure rows, before Your destination. With no valid counts among those departures: **Live bike counts unavailable. Some networks may be restricted.** With retained counts: **Live bike refresh failed. Showing last received counts.** The notice does not assert a geographic cause. It is hidden before an attempt, during an active refresh and after successful refresh; draft edits or a new comparison clear the old notice. The word Live aligns with the Station column header text on desktop. Routes, history and previous receipt times remain intact. Selected Quiet slash design, 2026-10-01.

For pickup within 15 minutes of comparison: snapshot 0 → **Empty now**; 1–2 → **Few bikes**; 3+ → **Available now**; missing → **Unknown**. Historical Low never overrides a reported zero. The planner selects the closest compared fresh nonzero station (excluding the destination station); no unused alternative recommendation is calculated or displayed. Counts are snapshots, not pickup guarantees.

## Future pickup and historical signal

More than 15 minutes ahead, the final column is **Historical no-bike risk**, based on each station's own archive dates at the chosen pickup hour. Pool Monday–Friday versus Saturday–Sunday; holidays currently follow weekdays. Minimum 20 recorded days; invalid/missing evidence → Unknown. Share of recorded hourly values equal to zero: Low <5%; Moderate 5%–<20%; High ≥20%.

Current archive: **2025-10-01 to 2025-12-31**. Exact hourly sampling/aggregation semantics remain unresolved. These are experimental descriptive bands, not calibrated future probabilities. Missing observations are excluded; coverage differs. No blend with live counts, numerical probability, future reliability ranking, or 30-minute refill forecast is implemented. Zero now can coexist with historical Low for a future pickup; keep the meanings separate. Changing destination or refreshing bikes must not change the same station/hour/group's historical rating.

## Routing estimates

Valhalla 3.8.3 uses a saved OpenStreetMap graph on the device; estimates are independent of pickup time and require no Kakao request/key. Outside-map endpoints, same-station cycling, missing graph/runtime, and route failures show a dash. Failure in one mode does not hide the other.

Graph bounds: south 37.395, west 126.735, north 37.745, east 127.245; all 2,735 saved stations were covered in the September 30 check. OSM connectivity and endpoint matching can produce incorrect detours. Approximate short pedestrian access gaps are added; gaps over 100 m are rejected. The partial Oksu fix and remaining exact-pier origin case are recorded in [plan.md](plan.md).

## Acceptance criteria

1. Empty startup/recovery preserves partial selection; draft edits and bootstrap cause no comparison/provider fetch.
2. Explicit comparison/refresh works; refresh does not reroute/requery history. Same destination station for every departure.
3. Map station choices update pin and road label; stale GPS/label/query replies cannot overwrite newer choices/views.
4. Seoul time, seven-day validation and click-relative shortcuts work independently of computer timezone.
5. Current zero overrides history for immediate pickup; future signals remain separate. Unknown is neither zero nor Low.
6. Displayed counts remain stable through elapsed time and failed/hanging refreshes; manual refresh updates snapshots. Automatic station suggestion still requires a report within 120 seconds. Station popups omit all inventory information.
7. Zero walking, missing routes and same-station cycling are distinct; caching respects direction, coordinates and mode.
8. All phone metrics/controls remain accessible, long names fit, and station focus/selection survives redraws.
9. Secrets/raw datasets are absent from browser assets/static routes and credential-bearing logs/errors.

Evidence is in [REVIEW.md](REVIEW.md); passing tests do not validate every OSM route or forecast.

## Deferred work

Walking **estimates are included** after the later user request. Walking directions, budget filters, leave-origin/door-to-door totals, cycle navigation/geometry, address search, accounts, saved journeys, weather forecasts, alerts, destination availability, and unattended collection remain deferred. Known issues and proposals are centralized in [plan.md](plan.md).

## Static runtime

Bootstrap loads map metadata only. Historical sufficient statistics, street shards and browser Valhalla assets load lazily; raw archives and SQLite are never downloaded. The official bike website’s fixed HTTPS feed allows direct browser requests without an API key, proxy or cookies, with one pending request and a 60-second per-tab attempt cooldown. Missing counts are Unknown; a failed refresh preserves the last received snapshot and routes/history remain usable. A six-month export window is supported, but requires additional source months before six-month coverage can be claimed. Physical-phone performance remains unverified.
