# Product specification: 따릉이 Where?

Behavior in the source workspace, reviewed 2026-10-03. [REVIEW.md](REVIEW.md) records release and test evidence; [DESIGN.md](DESIGN.md) owns appearance and wording.

## Purpose

Help a rider choose among nearby Seoul public-bike stations for a starting point, destination and pickup time. English and Korean share the same planner; official Korean station names and numbers remain unchanged.

The comparison keeps three things separate: the last received bike count, estimated walking/cycling times, and the station's past frequency of having no bikes. A small proximity advantage should not hide the other departures. The app offers no booking, payment, accounts, navigation instructions, destination-capacity forecast or validated prediction of future availability.

## Draft and explicit actions

Start with both points unset and no A/B pins. **Compare stations** and **Fit journey** remain disabled until both are chosen. Station-data recovery preserves partial selections.

Place or drag map pins, or use **Current location** for the starting point. GPS requests one permission-controlled fix. Failed, denied or out-of-area access preserves the journey, and a late fix cannot replace a newer manual choice. With keyboard focus on the map, arrow keys move it and Enter selects the center for the active point. Markers, popups and controls retain their own keyboard behavior. Panning and pointer-centered wheel zoom leave the points unchanged.

Point labels are approximate street names without house numbers. Search within 250 m, use the selected language where available, and add “Near” / “근처” beyond 35 m. Without a road match, use meaningful station or landmark text. Ignore replies for older selections. Limit labels to two visible lines while retaining the full text.

Pickup means **collecting the bike at the station**, in Seoul time (Asia/Seoul), from now through seven days ahead. Minute-precision input allows a one-minute past tolerance. Walking does not shift pickup or impose a budget. **Now / In 30min / In 1h** use the clock at click time. Implicit Now and input limits follow the clock when the field gains focus, the tab becomes visible or comparison starts; an explicitly chosen time stays unchanged.

Editing points, GPS, pickup or map station choices clears the comparison, cancels pending work and resets its busy/error state. It does not start a comparison or live collection. **Compare stations** queries the draft; **Refresh bikes** updates inventory while retaining history and all route estimates. There is no periodic or tab-visibility collection. Short polling only completes a user-initiated request. UI operations time out after 30 seconds and release controls for retry.

## Stations and views

Compare five departures nearest to the starting point by straight-line distance, in proximity order. There is no walking-time filter or list expansion. All departures use one destination station: nearest to B by straight-line distance, unless chosen in a map popup.

Popups show **#number · station name**, **Use as departure** and **Use as destination**, without inventory information. Choosing a station moves the corresponding pin and updates its label; comparison remains manual. **Use as departure** switches the active point to destination only while B is unset. Once B exists, editing a departure preserves the active point.

Comparison replaces the map with results. **Back to map** restores the same draft; late replies cannot switch views. Above 1100 px, the planner remains beside results. At 1100 px and below, results fill the workspace and hide the planner. At 700 px and below, planning scrolls naturally with a persistent Compare dock; results stay within the viewport and scroll beneath their heading. The dashed A–B line follows both pins and is a straight guide, not cycling geometry.

## Results

| Item | Meaning |
| --- | --- |
| Station | Official name, “Station #…” number, straight-line distance and neutral rank/selection box |
| Bikes | Last received count: mint for 3+, amber for 1–2, coral for 0; unknown is a gray `/` with an accessible unavailable label |
| Walk time | Pedestrian estimate from A to the departure station, at 5.1 km/h |
| Ride time | City-bicycle estimate from the departure to the common destination station, configured at 15 km/h |
| Availability now / Historical no-bike risk | The immediate snapshot or the separate archive signal defined below |

Selection updates the numbered map marker without reordering rows. Button focus survives redraws. Phone rows place station identity and Walk/Ride on the left, counts and availability on the right; future rows retain a historical label. Tablets use full-width columns with shared headings. [DESIGN.md](DESIGN.md) gives the visual details.

**Your destination.** below the rows shows the common destination station's name/number and its forward walk to B. **Walk time**, the duration, an arrow and the applied destination label form one group; the destination label has a mint background. This estimate remains through Refresh bikes. An unavailable final walk shows a dash without hiding departure results.

Walking at exactly the same coordinates gives **0 min**. Positive walking/cycling estimates round to whole minutes, at least 1 min. Values above 60 minutes use hours and remaining minutes, for example **1h 12min** or **2h**; values through 60 minutes keep the minute format. Same-station cycling and failed/unavailable routes show a dash. Failure in one mode does not hide the other.

One footer shows the last completed bike refresh time, Valhalla / OpenStreetMap credit and **Refresh bikes**, separated by dots. It wraps within the scrolling results body. No per-row timestamps, rental summaries, destination dropdown, archive counts or methodology panel are displayed.

## Immediate pickup and retained counts

For pickup within 15 minutes of comparison:

| Count | Status |
| --- | --- |
| 0 | Empty now |
| 1–2 | Few bikes |
| 3+ | Available now |
| Missing/invalid | Unknown |

The provider supplies no observation timestamp. The footer records when a refresh completed, rather than when the provider measured the bikes. Valid count and immediate-status snapshots remain unchanged through elapsed time, returning to the tab and failed/hanging refreshes, until explicit comparison/refresh updates them. Missing evidence is never zero. Counts are snapshots, not pickup guarantees.

For immediate pickup, automatically select the nearest compared station with a positive count received within 120 seconds, excluding the destination station. This freshness rule limits the suggestion; it does not expire displayed counts. Historical Low cannot override zero for immediate pickup.

After a failed or timed-out live request, show one small red notice below the departure rows and before Your destination:

- Without valid departure counts: **Live bike counts unavailable. Some networks may be restricted.**
- With retained counts: **Live bike refresh failed. Showing last received counts.**

Hide the notice before an attempt, during refresh and after success. Draft edits/new comparison clear it. Preserve routes, history and prior receipt times. The notice does not diagnose a visitor's country or the cause of failure.

## Later pickup and the archive

More than 15 minutes ahead, show **Historical no-bike risk**. Use the station's recorded values at the chosen pickup hour, pooling Monday–Friday separately from Saturday–Sunday. Holidays currently follow weekdays. At least 20 recorded days are required; missing or invalid evidence is **Unknown**.

| Share of recorded hourly values equal to zero | Band |
| --- | --- |
| Below 5% | Low |
| 5% to below 20% | Moderate |
| 20% or more | High |

The archive covers **2025-10-01 through 2025-12-31**. Missing observations are excluded, coverage differs by station, and the source's exact hourly sampling/aggregation remains unconfirmed. These bands describe that archive; they are not calibrated future probabilities or refill forecasts. A station can have zero bikes now and historical Low for a later pickup. Destination changes and bike refreshes cannot alter the same station/hour/day-group rating. Source details and limits are in [DATA_SOURCES.md](DATA_SOURCES.md).

## Language

English uses `/`; Korean uses `/ko/`. The **ENG / 한국어** mint capsule is one native link. Clicking either label or its track, or pressing Enter, toggles once and updates copy, accessibility text and URL in place. Preserve points, pickup, selected station, applied counts/estimates, pending work, view, focus and internal scroll. Shorter translated content may clamp scrolling to its new maximum. Switching does not query or move the map; Back/forward follows the language URL. Reloading or opening the link in another tab starts an empty journey. No language storage, automatic redirect or translation request is used.

Korean pickup says **한국 시간**. **최근 조회 현황** and **자전거 없음 / 적음 / 있음** describe received inventory; **과거 자전거 없음 빈도** and **낮음 / 보통 / 높음** describe the archive. Missing evidence is **알 수 없음**, with **자전거 수를 확인할 수 없음** for missing-count accessibility text. The footer describes refresh completion time. Keep these meanings separate in both languages.

## Runtime and route limits

GitHub Pages serves the browser app. Startup loads station metadata independently of history. A station-load failure stays visible through draft edits and offers **Retry**. History, street shards and browser Valhalla load when needed; raw archives and SQLite stay offline. Missing gzip decoding reports the browser requirement.

The fixed official HTTPS bike feed needs no key, proxy or cookies. Allow one pending request and a 60-second attempt cooldown per tab. Source failure preserves received snapshots while routes/history remain usable.

Valhalla 3.8.3 uses saved OpenStreetMap data on the device; estimates do not depend on pickup time. Outside-map endpoints and missing graph/runtime show a dash. Short pedestrian access gaps are added; gaps over 100 m are rejected. Map connectivity and endpoint matching can cause incorrect detours, including the unresolved exact-origin Oksu pier #5651 case in [plan.md](plan.md). Passing tests do not validate every route.

## Acceptance criteria

1. Empty startup and retry preserve partial selections. Bootstrap/draft edits do not fetch inventory or compare; history failure cannot hide the station catalogue.
2. Comparison uses five departures and one destination station. Refresh changes counts without rerouting or requerying history.
3. Late GPS, labels and comparison replies cannot overwrite newer points or views.
4. Seoul-time validation and click-relative shortcuts work regardless of the device timezone.
5. Unknown remains distinct from zero and Low. Immediate snapshots and future archive bands keep their separate meanings.
6. Counts survive elapsed time and failed refreshes. Suggestions require recent positive reports; map popups show no inventory.
7. Zero walking, unavailable routes and same-station cycling remain distinct. Route caching respects direction, coordinates and mode.
8. Compare remains reachable above the phone safe area. Metrics and long names fit without horizontal scrolling; focus, internal scrolling and map controls work in both languages.
9. Browser assets, public routes and logs contain no secrets or raw datasets.
10. Both language entries start empty in the correct language. Capsule toggling preserves the journey and pending work; native new-tab navigation and Back/forward work.

Checks are recorded in [REVIEW.md](REVIEW.md). Known issues and features outside the current scope are in [plan.md](plan.md); physical-phone performance remains unverified.
