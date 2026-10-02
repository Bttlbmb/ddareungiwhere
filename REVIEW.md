# Verification

Dated evidence for optimization, interface changes and publication. Entries describe the build checked at that step; later entries may supersede its behavior or publication status. This document reports checks, not a guarantee of every OSM route, source freshness or future availability.

## Release status — 2026-10-02

The latest published runtime change is **e672e76**, module revision **4dbcbb51cf61e77b**: English/Korean entries and a mint capsule where either label or the track toggles language. GitHub Pages was verified during **15:12–15:14 KST**; hosted HTML, app and stylesheet matched the tested release. This supersedes the earlier capsule's current-choice no-op. Subsequent documentation-only commits do not change that runtime revision.

The source workspace also retains an earlier unpublished audit covering keyboard map placement, comparison cancellation/busy state, shared-load retry guards, pickup-clock updates and street-import validation. Local source documents describe the code in that checkout; publication uses an isolated source based on the published commit and excludes those audit changes. Historical check counts apply to their stated build, rather than to every later checkout.

The public verification tag and two-entry sitemap are present; Search Console ownership verification, sitemap submission, indexing and traffic have not been confirmed here. Phone-sized browser checks are desktop emulation; physical-phone performance remains unverified. The retained historical archive is still October–December 2025.

## Overseas live-count investigation — 2026-10-01

The user reported missing live counts in Germany, the UK and Pakistan. Source inspection confirmed that `web/static/live.mjs` POSTs directly from the visitor's browser to the official website, with omitted credentials, CORS mode and an eight-second timeout. There is no shared relay. Network/HTTP/JSON failures become a generic unavailable error; service failures preserve existing counts and receipt times. These errors alone do not identify geography as the cause.

A local POST with `stationGrpSeq=ALL` and `Origin: https://bttlbmb.github.io` returned HTTP 200, `Access-Control-Allow-Origin: *`, a successful ALL response and 2,748 stations. The response Date was 2026-10-01 11:19:48 UTC (20:19:48 KST); a separate IP-country lookup returned KR. This was a command-line check, not an overseas browser or physical-phone check. The web research service received a firewall-block page for the official homepage; that different request path does not reproduce the browser inventory POST.

Seoul Bike's [official App Store developer responses](https://apps.apple.com/ca/app/서울자전거-따릉이/id1037272004), inspected on 2026-10-01, acknowledge restrictions on overseas IPs/networks; the June 17 response describes some overseas-network restrictions. Combined with the user reports, this makes provider access restrictions a likely explanation, without proving a blanket ban or specific country rules for the website feed. The [documented Seoul Open Data live-bike API](https://data.seoul.go.kr/dataList/OA-15493/A/1/datasetView.do) is a possible alternative; it requires an authentication key and limits each request to 1,000 rows. Its overseas reachability and category equivalence have not been verified here. A shared feed would require a deliberate architecture change and verified upstream access.

Updated source-limit documentation and the unresolved live-access issue. Runtime code, generated assets and publication were not changed. Documentation links and evidence were checked; no runtime test run was needed for these documentation-only changes.

## Exactness and storage — 2026-10-01

All 134,832 historical cells independently decoded from the new binary matched the prior JSON summary exactly, with identical station order and coverage. Dedicated availability storage retains all 6,152,132 station/date/hour observations in 151,662,592 bytes; the former mixed rental/availability database was about 1.17 GB and is no longer required.

Historical public payload changed from 981,216-byte JSON to 19,755-byte metadata plus 74,461-byte gzip counts (94,216 bytes total, about 90% less). The binary decodes to 539,328 bytes of uint16 pairs. Counts are lazy on first comparison rather than startup. No historical evidence was dropped or approximated.

Generated site: **42,211,740 bytes**, down from 171,280,698 bytes before this pass (about 75% smaller). Station metadata and street shards are explicit gzip downloads. No raw tile copies, unused gzip siblings or detailed rental data are published.

A local Node benchmark compared the prior published source (`c7b1bee`) with the optimized modules using the same 2,735-station catalogue, historical cells, query and mocked official-feed JSON. Median of seven batches of 100 plans: **2.075 → 0.161 ms** per shortlist/history calculation (about 13× faster). Median of 15 complete synthetic refreshes: **27.422 → 4.283 ms** (about 6× faster). These isolate local logic/JSON work; they exclude network and WASM routing, so they are not end-to-end page-speed claims.

## Checks — 2026-10-01

- **6 Python checks passed**: street import/provenance and geometric boundaries; six-month exact export, missing evidence and conflicting archive rejection preserving the published database.
- **34 Node checks passed**: manual-only queries, draft/GPS/late-response guards, expiry/zero/unknown distinctions, refresh without rerouting, KST validation, exact binary integrity, stable bounded shortlist and versioned lazy bootstrap.
- All **10 native/browser route fixtures matched** time/distance after gzip-only WASM/tile delivery, allowing the rounded pedestrian access correction. This preserves the known Oksu detour rather than validating its plausibility.
- Actual local browser bootstrap started with no points. Guro + In 1h comparison loaded gzip streets/stations/history and returned all five walk/ride estimates, historical Low bands and fresh direct-feed quantities. Refresh preserved estimates/history. Desktop appearance remained intact. The available browser viewport override did not change the actual viewport, so this pass does not claim a new phone-layout check.

## Hosted confirmation — 2026-10-01

Published source/assets commit `2420a20`, module revision `9487ab71380abb6a`, verified on GitHub Pages at **2026-10-01 09:55 KST**. The hosted Guro + In 1h comparison resolved street labels, displayed all five walking/cycling estimates and historical Low bands, and fetched fresh bike quantities **27/7/11/24/10** directly from the official feed. These are dated receipt snapshots, not current promises. The deployed gzip WASM was independently decoded and byte-matched against the pinned original. Public assets matched the generated build; no raw tiles, raw WASM, SQLite or diagnostic page was included. The known local credential scan passed before retiring the unused configuration.

Removed local server/proxy/rental/research files were moved outside the source workspace to a temporary private recovery folder; removal does not erase prior Git history. Cloudflare account/build settings were not changed. Most storage reduction comes from removing raw `.gph` duplicates and unused gzip siblings; it is not a claim that compressed routing tile downloads shrank by the same amount. WASM remains 9,861,835 decoded bytes, but explicit gzip delivery cuts its payload to about 2.1 MB (about 78% smaller); compressed graph tiles total 29,839,155 bytes and load as needed. The graph has not been rebuilt during this pass.

## Limits — 2026-10-01

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

## Code and documentation audit — 2026-10-02

Three agents independently reviewed the frontend, browser/offline tools and documentation. Changes stop obsolete comparison work, prevent changed drafts from comparing after metadata recovery, isolate immediate retries from canceled shared data loads, and check cancellation before live collection. New comparisons show a loading row instead of the previous journey. Draft edits clear busy/error state. Pickup bounds follow the current clock while preserving an explicitly chosen time.

Keyboard users can focus the map, move it with arrow keys and place the active point with Enter. Instructions and a center target appear only with visible keyboard focus; popup/control keys are excluded. Enter stops an unfinished pan before choosing the visible center. Street imports now reject external source paths and invalid provenance manifests before replacing existing data. README and owning documents clarify use, data limits, workspace/publication paths and maintenance; historical checks retain their original dates. All local Markdown links across ten documents resolve.

All **8 Python** checks passed with Python 3.14; all **55 Node** checks passed. Independent agents also checked the supported Python 3.11 runtime, shared-load cancellation, street shard boundaries/cache/retry behavior, and isolated build/publication boundaries. The standard build succeeded with retained inputs and the unchanged pinned SDK/graph. No maps or archives were downloaded or rebuilt; native/browser route parity was not rerun in this pass.

Local in-app browser checks at **1440×900**, **390×844** and **320×568** confirmed keyboard placement, normal point selection, explicit pickup entry, real walk/ride estimates, historical bands, received live quantities, Back to map, focus and internal scrolling. Page, form and results widths had no horizontal overflow; destination/refresh controls remained reachable. After the pan repair, the destination pin center matched the visible map center on both axes. Refresh preserved displayed route/history estimates. These are desktop browser viewport checks, not physical-phone or overseas-network evidence. Known Oksu routing, historical coverage and physical-phone limits remain in [plan.md](plan.md). This audit is local and has not been published.

The allowlisted publication checkout was prepared with module revision `a4c88b6a4efbc430`; the credential/file-size scan and Git whitespace check passed. Diagnostics were excluded. Changes remain uncommitted and unpushed.

## Mouse-wheel map zoom — 2026-10-02

Enabled Leaflet's pointer-centered mouse-wheel zoom at the user's request. All **8 Python** and **55 Node** checks passed, and the standard build completed with retained inputs. An independent source review confirmed zoom/pan only redraw visible stations, without comparing or refreshing bikes. Local browser wheel gestures changed tile zoom from 14 to 15 and back to 14 while both points remained unset and comparison stayed disabled. At 320×568, scrolling over the planner moved its internal scroll position without zooming the map or creating horizontal overflow. This is desktop browser evidence, not a physical-phone check. The allowlisted publication/credential scan and Git whitespace check passed; these measurements describe the combined local build before publication.

Published only wheel zoom and its documentation in commit `fe4c663` on `main`. The isolated publication build passed **6 Python** and **39 Node** checks, preserving the published branch's other behavior. GitHub Pages module revision `76f4cf2349ea0f25` was verified at **2026-10-02 11:19 KST**; an actual hosted wheel gesture changed zoom 14 to 15 without setting points or enabling comparison. The earlier audit remains local and unpublished. The original publication checkout was advanced to this commit with its audit work preserved; a Git stash also retains the pre-push local snapshot.

## Search metadata and verification — 2026-10-02

Implemented the approved **Seoul Public Bike Trip Planner — 따릉이 Where?** page title, the selected meta description, the user-supplied public Google verification tag, and the absolute canonical homepage URL. Added a source-owned single-URL sitemap, copied by the standard build. No `lastmod` date is claimed. DESIGN records the title/description; STATIC_SETUP records verification, sitemap submission and the host-root robots constraint.

All **8 Python** and **55 Node** checks passed in the source workspace with Python 3.11. An isolated source based on published commit `fe4c663`, containing only these metadata/build/documentation changes, passed **6 Python** and **39 Node** checks. The standard builds use the retained inputs and unchanged pinned SDK/graph; no map or archive was downloaded or rebuilt. Publication is isolated from the earlier unpublished audit. These checks do not establish Google verification, indexing, ranking or search traffic.

The generated metadata and XML sitemap were parsed and checked for the exact approved text/tag and matching canonical URL. With the same Python 3.14 build runtime as the published baseline, only generated `index.html` and the new `sitemap.xml` differ; the page body and all runtime/data/style assets are byte-identical to that baseline. The allowlisted publisher's credential/file-size scan and Git whitespace check passed.

Published only the approved SEO additions in commit `d11acc1` on `main`. The live homepage and sitemap both returned HTTP 200 and byte-matched the isolated publication files at **2026-10-02 13:20 KST**. The verification tag is present in the initial hosted HTML; Search Console ownership verification and indexing remain actions/statuses in Google's service. The original publication checkout was advanced with every working file preserved and a recoverable Git snapshot; the earlier audit remains local.

## Bilingual interface and discovery, 2026-10-02

Implemented the user-requested English/Korean interface with a compact header switch, a pretranslated `/ko/` HTML entry, shared versioned assets, self-canonicals, reciprocal en/ko/x-default links and both URLs in the sitemap. A switch changes copy/URL in place, without resetting the journey, pending work, applied routes/history/count snapshots, focus or internal scrolling. Korean street labels are retained alongside English in the existing lazy shards; no remote translation/geocoder or additional language request is introduced.

Two independent workers reviewed the full 112-message Korean catalog and desktop/390px/320px rendered context for naturalness and semantic accuracy. Corrections distinguish **자전거 수를 확인할 수 없음** from zero, use **최근 조회 현황** for retained inventory, and **과거 자전거 없음 빈도** for descriptive archive bands. Pickup explicitly says 한국 시간, and the footer says 갱신 완료 rather than claiming an upstream observation time. Both reviewers approved the final wording. A third worker reviewed state/build/cache behavior and the bilingual street formats independently.

Source checks: **13 Python** and **59 Node** pass. The release is built separately from published `d11acc1` to exclude the earlier unpublished audit; that isolated source passes **11 Python** and **43 Node** checks. Language checks cover stable zero/unknown distinctions, history and receipt meanings, no new commands on switching, preserved state/focus, and comparison/late-label completion in the current language. The standard build uses retained inputs and unchanged SDK/graph; no map or archive was downloaded or rebuilt, and routing parity was not rerun.

Local in-app browser checks at **1440×900**, **390×844** and **320×568** showed no horizontal page/results overflow, readable Korean labels, reachable footer/refresh controls through internal scrolling, preserved pickup/selected station/estimates, English/Korean road names, and Back/forward language switching. The results scroller retained 645 px across a switch. Actual central-Seoul estimates were 2/3/4/4/5 min walking and 9/8/10/8/7 min cycling, with a 2 min final walk. Initial inventory retrieval failed and displayed unknown with the translated notice; a later source-preview comparison received quantities **14/5/1/2/2** with **14:01 KST** refresh-completion time. These are dated receipt snapshots, not current promises. The separate release preview also loaded directly at `/ko/`, started empty, and completed estimates across a switch. These are desktop browser viewport checks, not physical-phone evidence.

Measured against published `d11acc1`: shared app.js grows **24,150→38,938 bytes**, or **7,151→11,216 bytes** in a deterministic gzip comparison (**+4,065 bytes**). Actual transfer compression depends on hosting. Existing 87 gzip street shards grow **7,504,838→7,900,362 bytes** (**+395,524; 5.27%** across the entire corpus); median extra per shard **2,764 bytes**, p95 **17,828**, max **23,456**. These shards remain lazy and requests/cache/geometry are unchanged. This is payload-size evidence, not a physical-phone latency benchmark or a zero-overhead claim.

The exact release preview subsequently received **14/5/1/2/3** at **14:10 KST**; route/history estimates remained unchanged. At 390px the footer was reachable by internal scrolling; at 320px the page/results had no horizontal overflow and keyboard focus reached Compare stations after the time shortcuts. An open station popup switched its two selection actions and close-button accessibility label in place. Routing/SDK/history/station assets (42 files) are byte-identical to the published baseline, and every street shard retains identical cell IDs, geometry and English labels. Only the processed street fingerprint changes semantically in the provenance manifest.

Published the bilingual release in commit **d4feeef**, module revision **cff33d800117e3c0**. During **2026-10-02 14:16–14:20 KST**, hosted English/Korean HTML, sitemap and shared app bundle returned successfully and byte-matched the tested release. Initial Korean HTML contains the verification tag, translated metadata, self-canonical and matching alternate links. The hosted Korean page loaded the map, started empty, and preserved a manually selected origin and pickup through English→Korean switching; the cached label changed Cheonggyecheon-ro↔청계천로. Search Console indexing remains unverified. The original publication checkout was advanced to the release while preserving all 195 working files and a recoverable tracked Git snapshot; prior audit changes remain local.


## 2026-10-02 — Mint capsule language selector

Implemented the user's first language-switch proposal: a compact two-position capsule labeled **ENG** / **한국어**, with the existing mint active segment and dark green selected text. Both positions remain real links. Initial English/Korean HTML identifies the current language before JavaScript; normal clicks select a language in place, current-choice clicks are a no-op, and modified clicks retain native navigation. The CSS slide respects reduced-motion preferences and links retain visible keyboard focus. No new dependency or language request is introduced.

Source checks: **13 Python** and **60 Node** pass. The isolated release from published `d4feeef` passes **11 Python** and **44 Node** checks, including preserved state/counts/routes/focus, no commands on a switch, pending work completion, current-choice no-op and native modified clicks. The standard build used retained inputs and the unchanged SDK/graph; no maps or archives were downloaded or rebuilt, and route parity was not rerun for this header change.

Local browser checks at **1440×900**, **390×844** and **320×568** showed both positions fit the header without horizontal overflow. Keyboard Enter selected Korean with visible focus on the same link. A comparison completed after a switch; selected departure, pickup and all five numeric walk/ride estimates survived another switch. Results scrolling remained at **378 px** through Korean→English; at the bottom, the browser naturally clamps to the shorter translated content's maximum. Footer controls remain reachable. The exact release opened directly in Korean, then preserved a selected origin and pickup through switching and Back/forward. These are desktop browser viewport checks, not physical-phone evidence. Earlier audit changes remain local and are excluded from this release.


Hosted release **b526cd4**, module revision **95954d233fd98037**, was verified on GitHub Pages during **2026-10-02 14:56–14:59 KST**. English/Korean HTML, the stylesheet, app bundle and sitemap returned HTTP 200 and byte-matched the tested release; the Pages deployment reported success. The actual hosted capsule displayed the shared mint color and selected Korean position at 320 px, and English→Korean switching retained one manually selected origin and pickup with keyboard focus on the Korean link. Full and header-context screenshots are retained locally in `dist/language-capsule-live.png` and `dist/language-capsule-header.png`. The publication baseline was advanced to b526cd4 with all 195 working files preserved and recoverable tracked snapshot `5c150d2`; prior audit work remains local.


## 2026-10-02 — Whole-capsule language toggle

At the user's follow-up request, clicking anywhere in the mint capsule now toggles to the other language, including the currently selected ENG or 한국어 label. The full capsule is one native language link and one focus stop; its destination and accessible action label update after each toggle. The selected mint position, fixed labels, reduced-motion treatment and capsule dimensions are retained. Native modified/new-tab navigation still opens the other language normally.

Source checks: **13 Python** and **60 Node** pass. The isolated release from published `b526cd4` passes **11 Python** and **44 Node** checks. Updated coverage exercises both labels and background in both current languages, exactly one history change per ordinary click, native modifier behavior, pretranslated link targets, and preserved journey/counts/routes/focus/pending work. Standard builds used retained inputs and unchanged SDK/graph; no map/archive download or routing rebuild occurred.

Actual local browser checks at **320×568** clicked both labels while selected and while unselected, plus the top track padding: each click changed language exactly once. At **1440×900**, keyboard Enter toggled with a visible focus outline around the entire capsule while retaining a manually selected origin and pickup. No horizontal page overflow occurred at either size. These are desktop browser viewport checks, not physical-phone evidence. Prior audit changes remain local and excluded from the isolated release.


Published commit **e672e76**, module revision **4dbcbb51cf61e77b**, verified **2026-10-02 15:12–15:14 KST**. Pages deployment reported success; hosted English/Korean HTML, app bundle and stylesheet byte-matched the tested release. At 390×844, actual hosted clicks on the current ENG label, current 한국어 label, each opposite label and track padding each toggled once; no horizontal overflow occurred. Screenshots are retained in `dist/language-toggle-live.png` and `dist/language-toggle-header.png`. The publication baseline advanced with all 195 working files preserved and recoverable tracked snapshot `76da7a5`; prior audit work remains local.

## Documentation review — 2026-10-02

Reviewed all ten owning Markdown documents against the source workspace and the isolated published baseline. Updated nine; AGENTS already matches the project. Reconciled whole-capsule interaction and keyboard behavior, mint usage, Korean 근처 wording, translation/metadata ownership, retained archive dates, screenshot status and publication scope. Added Search Console follow-through to the remaining-work list; existing historical evidence remains dated and earlier local audit changes remain unpublished.

All local Markdown targets exist: **32 references** in the source workspace and **31** in the release source. All **19 external link destinations** responded successfully after using normal GET requests where HEAD was unsupported; Google verification/sitemap/robots/localized-page rules and GitHub Pages availability were checked against their official documentation. These link checks do not establish the live inventory feed's browser functionality or overseas reachability.

Checked documented command options and file paths, and parsed the committed English/Korean HTML and sitemap to confirm verification metadata, self-canonicals, reciprocal alternatives and selected/target language attributes. Source runtime, scripts, tests, public inputs and preview assets are byte-identical to the pre-review snapshot. The release reuses the committed site; its diff contains only nine Markdown documents. The allowlisted publisher, retained-credential scan and Git whitespace check passed. No runtime test run, map/archive download or rebuild was needed for this documentation-only update.

Published the documentation-only update as **dd15d88** on `main`; GitHub’s commit endpoint and hosted README matched the release. All nine changed files are Markdown; app/data/test assets remain unchanged. The original publication checkout advanced with all 195 working files preserved and recoverable tracked snapshot `1eab84f`; earlier audit work remains local.

## Selected small improvements — 2026-10-02

Implemented the user's selected proposals **1–4 and 6**. Map legend captions remain visible at narrow widths. Results use the existing two-column station/destination layout when their available content width is at most 540 px, retaining the desktop planner; a stable scrollbar gutter prevents the threshold moving when vertical scrolling appears, and older browsers retain the original phone-width fallback. A popup departure choice advances to destination mode only if B is unset. Both language entries preload exactly the lightweight versioned app module used by the coordinator, without evaluating it before configuration. The English pickup label is unchanged.

The release also includes the previously reviewed frontend audit: keyboard map placement, current-clock pickup shortcuts/bounds, draft cancellation, obsolete-response guards and isolation of immediate metadata/history retries from canceled shared loads. Visible map-size synchronization covers translated legends and focus instructions before keyboard center placement. The offline street-import source/provenance validation changes remain local and are excluded from this isolated release, prepared from published `dd15d88`.

Source checks pass **14 Python** and **63 Node** tests; the isolated release excludes the two offline guard tests and passes **12 Python** and **63 Node** checks. Builds used retained inputs and the unchanged pinned SDK/graph, without downloading maps or archives. All **15 native/browser route fixtures** pass against Valhalla 3.8.3 `a60c7cbfc`; a real engine initialization canceled after 10 ms then retried successfully, matching its native fixture. Route parity includes the known long Oksu exact-origin result and does not resolve it.

Local browser checks at **1440×900**, **882×900**, **390×844** and **320×568** inspected layout, focus and internal scrolling. Controlled long-name results and actual central-Seoul journeys have no horizontal page/results overflow; keyboard focus reaches the final row and Refresh bikes. At 934 px the panel keeps table columns with 541 px of content; at 933 px it reflows at 540 px, while preserving the planner. At 650 px its 587 px content fits the table. These are desktop viewport checks, not physical-phone evidence. A popup-selected A was preserved by the next map click selecting B; comparisons remain manual. Dated local receipt quantities are observations, not availability promises.

A local resource-timing probe saw one app-module request begin before configuration loading; station/history metadata followed normal initialization, with no initial live, historical-count, street-shard or routing download. This verifies request ordering, not an end-to-end speed improvement on physical phones. The build's exact preload/import URL match is also covered in both languages. All local Markdown targets resolve; diagnostics are excluded from publication.

Published runtime commit **d068a7f**, module revision **58117882d95b0d7b**, verified on GitHub Pages during **2026-10-02 22:26–22:29 KST**. Deployment reported success; all seven changed hosted assets byte-match the tested release. The live 390 px page started without points, showed every legend caption and retained the English pickup label. At 882 px a manual keyboard-created comparison completed with five rows, reflowed metrics, a visible planner and no horizontal overflow. One cycling estimate was unavailable and remained a dash. Selecting the fourth departure and switching to Korean retained pickup, selection, bike quantities and all available/unavailable estimates. Counts **0/2/0/0/1** were received at **22:27 KST**, not promised availability. Live screenshots are retained locally in `dist/selected-improvements-live-phone.jpg` and `dist/selected-improvements-live-results.jpg`. These remain desktop viewport observations.

## Post-release regression review — 2026-10-02

Reviewed the selected improvements in published `f7593b0`, including asynchronous cancellation/retry, keyboard placement, pickup-clock updates, popup progression, container reflow and exact preload/import versioning. All **14 Python** and **63 Node** source checks passed. No new regression was found in this scope.

Fresh hosted checks at **320×568** started empty with visible legend captions. Keyboard placement aligned within 0.2 px of the visible map center. Canceling a comparison through a draft edit cleared busy/error state and enabled an immediate retry; that retry completed all five departure rows. Switching to Korean preserved the journey, and keyboard focus reached Refresh bikes within the internal scroller. Actual Korean results used table columns at **934×900** (541 px content) and reflowed at **933×900** (540 px content), with no horizontal overflow and the selected departure/planner preserved. No console warnings/errors were observed. These are desktop browser viewport checks. A screenshot is retained locally in `dist/post-release-regression-live.jpg`.

Publication adds this verification record; runtime and data remain the reviewed release. The three unrelated offline street-import files remain local.
