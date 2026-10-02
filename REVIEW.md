# Verification

Dated evidence for the static-only optimization, 2026-10-01. This document reports checks, not a guarantee of every OSM route, source freshness or future availability.

## Overseas live-count investigation — 2026-10-01

The user reported missing live counts in Germany, the UK and Pakistan. Source inspection confirmed that `web/static/live.mjs` POSTs directly from the visitor's browser to the official website, with omitted credentials, CORS mode and an eight-second timeout. There is no shared relay. Network/HTTP/JSON failures become a generic unavailable error; service failures preserve existing counts and receipt times. These errors alone do not identify geography as the cause.

A local POST with `stationGrpSeq=ALL` and `Origin: https://bttlbmb.github.io` returned HTTP 200, `Access-Control-Allow-Origin: *`, a successful ALL response and 2,748 stations. The response Date was 2026-10-01 11:19:48 UTC (20:19:48 KST); a separate IP-country lookup returned KR. This was a command-line check, not an overseas browser or physical-phone check. The web research service received a firewall-block page for the official homepage; that different request path does not reproduce the browser inventory POST.

Seoul Bike's [official App Store developer responses](https://apps.apple.com/ca/app/서울자전거-따릉이/id1037272004), inspected on 2026-10-01, acknowledge restrictions on overseas IPs/networks; the June 17 response describes some overseas-network restrictions. Combined with the user reports, this makes provider access restrictions a likely explanation, without proving a blanket ban or specific country rules for the website feed. The [documented Seoul Open Data live-bike API](https://data.seoul.go.kr/dataList/datasetView.do?currentPageNo=1&infId=OA-15493&serviceKind=1&srvType=A) is a possible alternative; it requires an authentication key and limits each request to 1,000 rows. Its overseas reachability and category equivalence have not been verified here. A shared feed would require a deliberate architecture change and verified upstream access.

Updated source-limit documentation and the unresolved live-access issue. Runtime code, generated assets and publication were not changed. Documentation links and evidence were checked; no runtime test run was needed for these documentation-only changes.

## Exactness and storage

All 134,832 historical cells independently decoded from the new binary matched the prior JSON summary exactly, with identical station order and coverage. Dedicated availability storage retains all 6,152,132 station/date/hour observations in 151,662,592 bytes; the former mixed rental/availability database was about 1.17 GB and is no longer required.

Historical public payload changed from 981,216-byte JSON to 19,755-byte metadata plus 74,461-byte gzip counts (94,216 bytes total, about 90% less). The binary decodes to 539,328 bytes of uint16 pairs. Counts are lazy on first comparison rather than startup. No historical evidence was dropped or approximated.

Generated site: **42,211,740 bytes**, down from 171,280,698 bytes before this pass (about 75% smaller). Station metadata and street shards are explicit gzip downloads. No raw tile copies, unused gzip siblings or detailed rental data are published.

A local Node benchmark compared the prior published source (`c7b1bee`) with the optimized modules using the same 2,735-station catalogue, historical cells, query and mocked official-feed JSON. Median of seven batches of 100 plans: **2.075 → 0.161 ms** per shortlist/history calculation (about 13× faster). Median of 15 complete synthetic refreshes: **27.422 → 4.283 ms** (about 6× faster). These isolate local logic/JSON work; they exclude network and WASM routing, so they are not end-to-end page-speed claims.

## Checks

- **6 Python checks passed**: street import/provenance and geometric boundaries; six-month exact export, missing evidence and conflicting archive rejection preserving the published database.
- **34 Node checks passed**: manual-only queries, draft/GPS/late-response guards, expiry/zero/unknown distinctions, refresh without rerouting, KST validation, exact binary integrity, stable bounded shortlist and versioned lazy bootstrap.
- All **10 native/browser route fixtures matched** time/distance after gzip-only WASM/tile delivery, allowing the rounded pedestrian access correction. This preserves the known Oksu detour rather than validating its plausibility.
- Actual local browser bootstrap started with no points. Guro + In 1h comparison loaded gzip streets/stations/history and returned all five walk/ride estimates, historical Low bands and fresh direct-feed quantities. Refresh preserved estimates/history. Desktop appearance remained intact. The available browser viewport override did not change the actual viewport, so this pass does not claim a new phone-layout check.

## Hosted confirmation

Published source/assets commit `2420a20`, module revision `9487ab71380abb6a`, verified on GitHub Pages at **2026-10-01 09:55 KST**. The hosted Guro + In 1h comparison resolved street labels, displayed all five walking/cycling estimates and historical Low bands, and fetched fresh bike quantities **27/7/11/24/10** directly from the official feed. These are dated receipt snapshots, not current promises. The deployed gzip WASM was independently decoded and byte-matched against the pinned original. Public assets matched the generated build; no raw tiles, raw WASM, SQLite or diagnostic page was included. The known local credential scan passed before retiring the unused configuration.

Removed local server/proxy/rental/research files were moved outside the source workspace to a temporary private recovery folder; removal does not erase prior Git history. Cloudflare account/build settings were not changed. Most storage reduction comes from removing raw `.gph` duplicates and unused gzip siblings; it is not a claim that compressed routing tile downloads shrank by the same amount. WASM remains 9,861,835 decoded bytes, but explicit gzip delivery cuts its payload to about 2.1 MB (about 78% smaller); compressed graph tiles total 29,839,155 bytes and load as needed. The graph has not been rebuilt during this pass.

## Limits

Exact-origin Oksu pier #5651 remains unresolved. Current history covers only October–December 2025. Live quantities are dated snapshots with no provider observation time. Physical-phone memory/cold-download performance, endpoint/CORS longevity, and historical measurement semantics remain unverified. See [plan.md](plan.md).

## Layout refinement — 2026-10-01

The initial local layout refinement used the selected minimal green treatment (logo saddle/handlebar and mint A/B form badges), **From, to, and when?**, a centered SVG location icon, matched planner/results headings, top-right Back to map and bottom-right Refresh bikes. This entry describes the local build at that step, not a new hosted publication.

The same day, the user requested the logo saddle/handlebar match the mint fill (`#c4e3d4`) rather than the dark count text. The rendered logo was visually inspected; all 6 Python and 34 Node checks passed again.

All 6 Python checks passed with Python 3.12; all 34 Node checks passed. Headless Chromium checks at 1440×900, 390×844 and 320×568 verified equal heading size/weight, exact desktop heading alignment, icon/text center alignment within 1 px, no horizontal page overflow, keyboard station focus after selection, and Back to map navigation. Phone-sized station lists scrolled internally while both navigation/refresh controls stayed accessible. Clicking the relocated refresh invoked inventory refresh and preserved displayed walk/ride estimates. Screenshots were visually inspected. Results used synthetic counts/routes over the retained station catalogue; these checks do not establish fresh inventory, route accuracy or physical-phone performance.

## Duration labels and inline refresh — 2026-10-01

The subsequent local build formats rounded walk/ride durations above 60 minutes as hours/minutes and moves Refresh bikes into the routing/completion footer after a dot. The footer now scrolls with the station list; Back to map remains outside that scroll area.

All 6 Python and 34 Node checks passed, including extended duration checks for 60 minutes, hour rollover, 72.4-minute walking and exact-hour cycling. Headless Chromium at 1440×900, 1024×768, 390×844 and 320×568 verified **1h 12min** / **2h** in the rendered table, inline footer alignment on desktop, phone wrapping without horizontal overflow, access to Refresh bikes after internal scrolling, station keyboard focus and Back to map navigation. The footer refresh still invoked only inventory refresh and preserved displayed durations. Screenshots were visually inspected using synthetic counts/routes; this is desktop browser emulation, not physical-phone or fresh-feed evidence. The build has not been published.

## Shared return section — 2026-10-01

Implemented the user-approved **Return your bike.** section below the five departures, with a subtle down/right marker, common station name/number, and one forward station-to-destination walking estimate. Column labels are **Bikes**, **Walk time**, **Ride time**. The return name uses the same 12 px / 650-weight / 17.4 px line-height style as departure names; its walking time uses the same 14 px / 600-weight / 21 px line-height style as departure durations. The section shares the page background and adds no enclosing panel or extra destination labels.

All **6 Python** and **38 Node** checks passed. All **15 native/browser fixtures** matched the pinned Valhalla 3.8.3 time/distance, including five station-at-origin walking cases. The checked SDK station-role change preserves the previous pickup-walk correlation and applies station matching at the start of the final leg. Exact destination coordinates retain 0 min, route failures remain a dash, and bike refresh preserves the applied route and destination label. No graph rebuild or SDK upgrade was performed.

Local browser checks at 1440×900, 390×844 and 320×568 confirmed equal name/duration typography, aligned station names, duration alignment under Walk time (the second phone metric column), no horizontal page/results overflow, and access to the return section/footer by internal scrolling. A real local Guro comparison to a moved destination displayed **4 min → Gwancheon-ro** from return station #2102; refreshing bikes preserved that final walk. These are desktop browser viewport checks, not physical-phone evidence. This implementation is local and has not been published to GitHub Pages.

## Station heading — 2026-10-01

Changed the departure table heading to **Station** at the user's request. The local build was regenerated; all 6 Python and 38 Node checks passed. Destination emphasis alternatives remain proposals rather than an implemented style change.

## Mint destination tag — 2026-10-01

Implemented the user's selected **Mint tag** destination treatment: 14 px / 700-weight text in the existing dark green over the existing mint fill, with 5 px corner radius and 5 px / 10 px padding. Return station names and walk durations retain their shared departure styles. All 6 Python and 38 Node checks passed; all 15 matching native/browser route fixtures passed again before publication.

Actual local browser checks at 1440×900 and 320×568 showed **Yeonhui-ro** in the mint tag for the Mangwon → Hong-eun shortcut, equal departure/return name typography, final duration alignment, no horizontal page/results overflow, and access to the return tag/footer through internal scrolling. The phone-sized viewport was verified as 320 CSS pixels; this remains desktop emulation, not physical-phone evidence. The publication checkout was current with origin/main before preparing the allowlisted build.

Hosted code commit `0049ee1`, module revision `28af33f1087c839c`, was verified on GitHub Pages at **2026-10-01 11:19 KST** after the approved push to main. The deployed Station heading and 14 px bold mint destination style matched the local build. The hosted Mangwon → Hong-eun comparison displayed five walk/ride estimates and **0 min → Yeonhui-ro**, with return station #117 and fresh direct-feed receipt quantities. The exact-coordinate zero is expected for this shortcut. The allowlisted publication/credential scan passed; diagnostic pages were excluded. No physical-phone claim is made.

## Stable counts and destination wording — 2026-10-01

At the user's request, removed automatic display expiry. Valid bike quantities and immediate availability remain as the last fetched snapshot through elapsed time, tab visibility changes, and failed/hanging refreshes. Receipt times remain intact and the existing footer reports the completed refresh time; missing/invalid quantities remain unknown. Automatic station suggestion still uses recent reports. This supersedes the earlier expiry behavior documented above.

Removed Nearest/Bikes now row indicators, changed the section to **Your destination.** and popup action to **Use as destination**, and updated cycling/walking error/help text to use destination terminology. The bottom source-credit footer is right-aligned with the map-issue link removed; Seoul Bike/OpenStreetMap credits remain. Map station dots use shared mint/dark-green CSS colors, 5.5 px radius, 1.5 px outline and full opacity. Unselected numbered candidates and the larger destination marker share that palette; selected candidates stay slate.

All **6 Python** and **38 Node** checks passed, including simulated 24-hour retention during a hanging/failed refresh, stable popup values, valid zero versus missing quantities, and manual refresh preservation of route/history data. All **15 native/browser route fixtures** passed. Actual local browser checks at 1440×900 and 320×568 confirmed the new copy, no row indicators, no horizontal overflow, accessible internal scrolling, aligned destination walk time, right-aligned source credits, visible mint stations and retained keyboard focus after station selection. These phone-sized checks are desktop emulation, not physical-phone evidence.

## Brand left-edge alignment — 2026-10-01

Adjusted header left padding so the drawn logo aligns with **From** in the planner heading, including the roughly 1 px inset within the SVG. Local browser measurements at 1440×900 showed both at x=42 px; 390×844 and 320×568 showed both at x=22 px. Screenshots were visually inspected; no horizontal overflow occurred, brand keyboard focus remained accessible, and the phone-sized planner still scrolled internally. All 6 Python and 38 Node checks passed. This local build is not a new publication; phone-sized checks are desktop emulation.

## Station popup simplification — 2026-10-01

Map station popups now show **#number · station name** and the departure/destination selection buttons, with no quantities or live-count status. Removed the unused popup-count updater; comparison inventory is retained.

All 6 Python and 38 Node checks passed. Local headless Chromium at 1440×900, 390×844 and 320×568 opened station #3426 through the map canvas and verified the prefixed number and absence of inventory for both unknown and synthetic known counts. Both selection buttons remained available; keyboard activation of Use as departure set only the origin and did not compare. Screenshots were visually inspected without horizontal overflow. Phone-sized checks are desktop emulation; this build has not been published.

## Quiet slash live-error display — 2026-10-01

Implemented the user's selected Quiet slash proposal: missing bike quantities appear as `/` in a neutral gray box, with an accessible unavailable label. Completed live failures display a 12 px red notice below the departure table and before Your destination. Its first word Live aligns with the Station header text. A refresh failure with retained quantities explains that the last received counts remain; successful refresh hides the notice. Startup, active refresh and a changed journey do not show the failure notice. The footer retains successful refresh times and avoids duplicating the unavailable message.

All **6 Python checks** passed using the bundled Python 3.12 runtime; the default Python was too old for an existing `hashlib.file_digest` check. All **39 Node checks** passed, including refresh completion/recovery, valid zero versus missing counts, preserved quantities/timestamps/routes/history, and clearing the notice after a journey change.

Local headless Chromium at **1440×900**, **390×844** and **320×568** used the retained station/history datasets with synthetic route estimates and controlled feed responses. HTTP 403 produced five gray slash boxes and the notice. A successful response restored counts and removed the notice; subsequent failures preserved quantities, original receipt times, routes and history. The desktop run also exercised the real eight-second browser fetch timeout using a deliberately unanswered intercepted request. Station and Live text both started at **x=362 px** on desktop. Station selection retained keyboard focus, Back to map restored the journey and compare-button focus, and phone results scrolled internally with no horizontal overflow. Screenshots were visually inspected. This is browser emulation and controlled failure evidence, not physical-phone or overseas-network verification. The local build has not been published.

## Popular-route removal — 2026-10-01

Removed the Popular routes section, shortcut handlers/styles, bootstrap dataset request, and seed export/input at the user’s request. The planner now ends with Compare stations. Retired rental-source fingerprints remain in the manifest for provenance; current documentation no longer describes shortcuts as an active feature.

All 6 Python checks passed with Python 3.14 (the system `python3` is older than the required 3.11); all 38 Node checks passed, including the updated bootstrap check that now requests only station data and history metadata. The local static build completed and contains no popular-route asset or runtime references. Desktop browser checks at 1440×900, 390×844 and 320×568 showed the shortened planner without horizontal overflow. The 320-pixel form retained internal scrolling to pickup/Compare stations, and keyboard navigation reached In 1h with visible focus. Screenshots were visually inspected. These are desktop browser viewport checks, not physical-phone evidence. This build has not been published.

## City basket identity — 2026-10-02

Implemented the user's selected City basket proposal in the header and SVG favicon. The slate bicycle has a visible low frame and wheel outlines without hub dots, plus a mint saddle and front basket. Removed the superseded Looking Wheels asset; the wordmark, header dimensions, description and planner/results behavior remain unchanged. DESIGN records the new selection, including the user's choice of City basket over the question-mark variants.

All **6 Python** and **39 Node** checks passed. The standard local static build completed using retained inputs and the existing pinned SDK/graph; no maps or archives were downloaded or rebuilt. Local Chromium checks at **1440×900**, **390×844** and **320×568** confirmed the header and favicon use city-basket.svg, the image loads, no horizontal overflow occurs, the brand retains a visible keyboard focus outline, and In 1h remains reachable through the phone planner's internal scrolling. The drawn logo left edge is within 0.3 px of the planner heading on desktop and 0.1 px on phones. Screenshots were visually inspected. These are desktop browser viewport checks, not physical-phone evidence. These measurements describe the local build before publication.

## Mouse-wheel map zoom — 2026-10-02

Enabled Leaflet's pointer-centered mouse-wheel zoom at the user's request. This publication contains only wheel zoom and its documentation; the separate code/documentation audit remains local. The isolated build from the published branch passed all **6 Python** and **39 Node** checks using retained inputs and the unchanged SDK/graph. Local browser wheel gestures zoomed in and out while both points stayed unset and Compare stations stayed disabled. An independent source review confirmed zoom/pan only redraw visible stations, without comparing or refreshing bikes. The allowlisted publisher's credential/file-size scan and Git whitespace check passed. These checks are desktop browser evidence, not physical-phone or route-accuracy measurements.
