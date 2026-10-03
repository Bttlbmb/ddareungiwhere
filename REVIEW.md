# Verification

This records dated checks and measurements. A passing check supports the behavior it tested; it does not establish every route's plausibility, worldwide feed access or future availability. Current rules are in [SPEC.md](SPEC.md), appearance in [DESIGN.md](DESIGN.md), and unresolved work in [plan.md](plan.md).

## Publication status

Latest verified hosted runtime before this audit: **e70ee41**, module revision **85107cd7e901a9b5**, checked on GitHub Pages on **2026-10-03, 10:09–10:16 KST**. The follow-up verification record is commit **4e234dc**. The audit includes the three offline street-import/documentation changes previously retained outside that release.

The audit below records local verification of module revision **91042991f1612db2**. Hosted verification is recorded separately; a local build or prepared checkout does not establish it. Historical coverage remains October–December 2025. Search Console ownership, submission, indexing and traffic have not been confirmed here.

All phone-sized checks described here ran in desktop browsers. The user supplied physical-tablet screenshots on 2026-10-03, but this does not establish physical-phone speed, memory use or compatibility.

## Comprehensive source and documentation audit — 2026-10-03

Reviewed all maintained source, tests, public inputs/provenance, documentation and local build artifacts. Removed obsolete CSS/classes and fallbacks, redundant redraws/distance calculations and temporary inventory arrays. Refresh replies now follow the draft request guard. Street lookup keeps 32 recently used shards, caches absence within a versioned release and indexes only searched segments. Concise comments explain the state, cancellation and storage assumptions. Product behavior, approved appearance and routing settings are retained.

Offline tools use unique database staging, correctly quoted SQLite paths, streamed history packing, direct compressed street exports and bounded file hashing/compression. Invalid street geometry and missing extracts stop the operation. Publication validates a complete staged payload before changing the checkout, including credential checks inside gzip files. Preview rejects traversal and both direct/directory-index symlink escapes. Graph builds retain tiles/provenance while discarding their temporary duplicate archive. Regression checks cover these failure paths.

All ten documentation files were reviewed and rewritten around their owning purpose, with plain explanations and measured claims informed by the user's maxnurnus.com writing. Repeated release narratives were consolidated here; source dates, licenses, approved choices and unresolved limits remain. Official data catalogues and Google/GitHub/OSM guidance were checked, and all local Markdown targets resolve. The station-source link and verified catalogue attribution terms are explicit.

Removed **226,655,194 bytes (about 227 MB)** of local duplicates/backups and the obsolete Valhalla 3.9.0 environment. Before removal, the redundant 83,179,520-byte graph archive matched its recorded hash and all 13 retained tiles; the old release site's 144 files exactly matched the publication assets. Required raw archives/PBF, availability database, tile directory, pinned SDK/licenses, public provenance, Git history and review captures remain. Cleanup details are retained locally in `dist/audit-cleanup-20261003.json`.

A read-only traced local benchmark against the pre-audit exporter measured peak Python allocations of **47,562,069 → 4,860,029 bytes** for history and **57,112,682 → 4,322,737 bytes** for the largest tile's compression (27,731,832-byte input). These are about 90% and 92% lower, respectively. They measure Python allocations, not total process/phone memory or network latency. History output, all 87 street gzip shards, the tested compressed tile and every installed SDK file were byte-identical. Timing from one concurrent local run is insufficient for a speed claim.

The standard build uses retained inputs without downloading/rebuilding maps or archives. Its 90 public data files and all SDK/WASM files are byte-identical to the published baseline; all 13 decoded graph tiles match. The site contains 2,735 saved station locations, 2,809 historical numbers, October–December 2025 evidence and 87 street shards. Module revision: **91042991f1612db2**.

**25 Python / 72 Node** checks pass using Python 3.14; the default system Python 3.9 is below the documented minimum. All **15 native/browser route fixtures** pass against Valhalla 3.8.3 `a60c7cbfc`, including the unchanged long exact-origin Oksu walk. Independent peer reviews checked frontend state guards and offline failure/storage paths.

Local browser checks at **1440×900**, **840×1098**, **390×667** and **320×568** confirmed empty startup, manual keyboard point placement, five-row comparisons, real route estimates and received inventory. Phone Compare stayed visible; results scrolled internally, the last-row selection retained focus and Refresh was reachable. Refresh kept the walking/cycling estimates; Korean→English retained the journey, selected station and counts. Back restored the same points and compare-button focus. No horizontal overflow appeared at these widths. These are desktop browser viewport checks, not physical-phone evidence. Dated received counts are observations only.

All **52 local Markdown targets** resolve. The allowlisted publication checkout preserves existing offline import changes; its credential/file-size and whitespace checks pass. These checks were completed before publication.

## Responsive layout and map recovery — 2026-10-03

The user reported a hidden phone Compare action, missing station dots/inactive map taps, and sparse tablet results. The audit reproduced two layout failures in the published baseline: at 390×667 Compare lay outside the clipped planner and its center hit the Leaflet canvas; at 840×1098 station rows were about 212 px high. Earlier checks had verified horizontal overflow, keyboard reachability and internal scrolling, but missed visible action placement and tablet density. The exact cause of the user's missing dots/taps was not confirmed on that device.

The approved revision gives phone planning natural page scrolling and a separate fixed Compare dock with safe-area space. Results replace the planner at widths up to 1100 px; phones use compact rows and tablets shared headings. Results retain a fixed heading and internal scroll; Back restores the journey. Phone availability aligns with the bike box at the same 12 px size as Walk/Ride. The destination explicitly labels Walk time. Leaflet layers stay inside the map.

Station bootstrap loads only the catalogue. History waits for a comparison. Awaited startup, persistent station status/Retry, translated missing-gzip guidance, compatible startup/data cancellation helpers, touch hit tolerance and map-size observation improve recovery without changing the pinned routing SDK/graph.

Source checks passed **14 Python / 68 Node** tests. The isolated release excluded two offline guard tests and passed **12 Python / 68 Node** tests. Builds used retained inputs; no maps/archives were downloaded or rebuilt. All 32 local Markdown targets resolved, and the publisher's credential/file-size scan passed.

Local English/Korean browser checks covered 320×568, 390×667, 840×1098 and 700/701/1100/1101/1440 px boundaries. Six sampled points on Compare hit the button. Phone rows were about 95 px high, with zero difference between availability and bike-box right edges. Tablet rows were about 77 px high; five rows, destination and refresh fit. Known zero, missing counts, future bands, selected stations, destination/footer reachability and restored form state remained distinct and usable. A first live failure stayed Unknown; a later explicit attempt received counts.

Hosted verification matched **all eight changed assets** to the tested release. At 390×667 the page started empty with dots and an accessible Compare dock; a station popup and manual selection led to five results. Korean 840×1098 results retained compact rows and no overflow. Switching preserved counts and available/unavailable estimates. No console warnings/errors were observed in the completed checks. Counts **0/0/0/1/1** received at **10:11 KST** are dated snapshots, not availability promises.

## Exactness, payloads and local performance — 2026-10-01

All **134,832** binary historical cells independently matched the prior JSON summary, including station order and coverage. The availability-only database retained **6,152,132** observations in **151,662,592 bytes**, replacing a mixed rental/availability database of about 1.17 GB.

| Measurement at that step | Before | After |
| --- | ---: | ---: |
| Public history payload | 981,216-byte JSON | 19,755-byte metadata + 74,461-byte gzip counts |
| Generated site | 171,280,698 bytes | 42,211,740 bytes |
| Shortlist/history calculation, local median | 2.075 ms | 0.161 ms |
| Synthetic complete inventory refresh, local median | 27.422 ms | 4.283 ms |

History counts decode to 539,328 bytes of exact uint16 pairs and load on comparison. The timing comparison used published `c7b1bee`, the same 2,735-station catalogue/history/query and mocked official-feed JSON: seven batches of 100 plans and 15 complete refreshes. It excludes network and WASM routing, so it is not a page-speed benchmark.

Unmodified WASM is 9,861,835 decoded bytes and about 2.1 MB compressed. Compressed graph tiles total 29,839,155 bytes and load as needed. Much of the disk reduction came from removing raw public duplicates, not reducing compressed tile downloads. No graph rebuild occurred in that pass.

**6 Python / 34 Node** checks and **10 native/browser route fixtures** passed; later endpoint-role checks expanded parity coverage to 15 fixtures. A real local Guro + In 1h comparison returned five walk/ride estimates, history and direct-feed counts; Refresh preserved estimates/history. The known long Oksu walk also matched its native fixture and remained implausible.

Hosted commit **2420a20**, revision **9487ab71380abb6a**, was verified at **2026-10-01 09:55 KST**. The gzip WASM independently decoded to the pinned original. Runtime assets excluded raw tiles/WASM, SQLite and diagnostics; the retained-credential scan passed. Removed legacy research/server/proxy inputs were placed outside the workspace in a private recovery folder; Git history and Cloudflare settings were not changed.

## Live-source access — 2026-10-01

The user reported missing counts in Germany, the UK and Pakistan. The browser sends its own credential-free POST directly to Seoul Bike, with CORS and an eight-second timeout. There is no shared relay. Network/HTTP/JSON failures do not identify a geographic cause and retain previous quantities/timestamps.

A command-line POST with `stationGrpSeq=ALL` and the GitHub Pages Origin received HTTP 200, wildcard CORS and 2,748 stations at **20:19:48 KST**. A separate IP-country lookup identified that connection as KR. This was not an overseas browser test. The research service received a firewall page from the homepage through a different request path.

[Official Seoul Bike App Store responses](https://apps.apple.com/ca/app/서울자전거-따릉이/id1037272004), inspected that day, acknowledged overseas-network restrictions, including a June 17 response. This supports provider restrictions as a likely explanation without proving country-specific rules for the website feed. The [documented Seoul Open Data API](https://data.seoul.go.kr/dataList/OA-15493/A/1/datasetView.do) is a possible alternative requiring a key and requests of at most 1,000 rows; its overseas access and category equivalence were not verified. A relay would require a deliberate architecture change. No runtime change was made in this investigation.

## Interface and language checks — 2026-10-01–02

The October 1 refinements established the retained appearance: shared departure/destination typography, hour/minute durations, mint destination tag, neutral missing-count slash, stable received counts, simplified popups, inline Refresh and removed rental-derived shortcuts. Checks grew from **6 Python / 34 Node** to **6 Python / 39 Node** as those behaviors were added. Desktop 1440×900 and phone-sized 390×844/320×568 checks covered alignment, focus and internal scrolling. Controlled feed failures distinguished zero from unknown, preserved estimates/history and cleared the notice after success; a desktop check exercised the eight-second timeout. These earlier phone layouts were superseded by the October 3 revision.

City basket replaced the former logo on October 2. Source checks passed **6 Python / 39 Node** tests. At 1440×900/390×844/320×568, logo/favicon loaded, keyboard focus was visible and the drawn left edge aligned with the planner heading within 0.3 px. No routing inputs changed.

The earlier October 2 code audit added comparison cancellation, changed-draft/late-reply guards, keyboard center placement, current-clock pickup controls and isolated retries after canceled shared loads. **8 Python / 55 Node** tests passed; supported Python 3.11 was checked independently. Browser journeys at 1440×900/390×844/320×568 completed estimates and preserved history on refresh. This was initially local; the frontend audit later entered the selected-improvements release. Offline source/provenance validation remained outside the hosted release.

The bilingual release passed **13 Python / 59 Node** source checks and **11 Python / 43 Node** isolated-release checks. Two reviewers checked all 112 Korean messages for natural wording and correct zero/history/receipt meanings. Language tests covered preserved journey, focus, pending replies and no new commands. Browser checks included direct Korean startup, Back/forward, bilingual cached road labels, popups and results scrolling.

Bilingual payload measurements against `d11acc1`: app.js **24,150 → 38,938 bytes**; deterministic gzip **7,151 → 11,216 bytes**. All 87 gzip street shards together grew **7,504,838 → 7,900,362 bytes** (5.27%); median extra 2,764 bytes, p95 17,828, maximum 23,456. Geometry, cell IDs and English labels were unchanged. This measures added payload, not physical-phone latency.

The whole-capsule follow-up passed **13 Python / 60 Node** source and **11 Python / 44 Node** isolated checks. Both labels/track toggled exactly once; Enter retained focus and native modified clicks remained available. The preceding current-choice no-op design is superseded. Captures remain in ignored `dist/language-capsule-*.png` and `dist/language-toggle-*.png`.

## Published milestones

These rows identify hosted releases checked at the stated Seoul times. Later rows supersede earlier runtime behavior; test totals belong to the build described above.

| Date/time (KST) | Commit / module revision | Hosted scope |
| --- | --- | --- |
| 2026-10-01 11:19 | `0049ee1` / `28af33f1087c839c` | Station heading, shared final walk and mint destination tag |
| 2026-10-02 11:19 | `fe4c663` / `76f4cf2349ea0f25` | Pointer-centered wheel zoom; gesture set no points |
| 2026-10-02 13:20 | `d11acc1` | Approved title/description, verification tag and sitemap; hosted files matched |
| 2026-10-02 14:16–14:20 | `d4feeef` / `cff33d800117e3c0` | English/Korean entries and shared assets; hosted metadata/copy matched |
| 2026-10-02 14:56–14:59 | `b526cd4` / `95954d233fd98037` | Initial mint language capsule |
| 2026-10-02 15:12–15:14 | `e672e76` / `4dbcbb51cf61e77b` | Whole-capsule toggle; 390 px interactions passed |
| 2026-10-02 | `dd15d88` | Documentation only; app/data/tests unchanged |
| 2026-10-02 22:26–22:29 | `d068a7f` / `58117882d95b0d7b` | Selected improvements and frontend audit; seven changed assets matched |
| 2026-10-03 10:09–10:16 | `e70ee41` / `85107cd7e901a9b5` | Phone dock, tablet results and map/bootstrap recovery; eight changed assets matched |

Documentation checks on October 2 resolved 32 source/31 release local targets and 19 external destinations. Search/Pages guidance was checked against official documentation; this does not test the inventory feed. The documentation release changed nine Markdown files only.

The selected-improvements source passed **14 Python / 63 Node** tests; its isolated release passed **12 Python / 63 Node**. All **15 Valhalla 3.8.3 native/browser fixtures** passed, and engine initialization canceled after 10 ms then retried successfully. A resource-timing probe found one app-module request before configuration completed, with no startup live/history-count/street/routing download. This verifies loading order, not phone speed.

A post-release review of `f7593b0` again passed **14 Python / 63 Node** checks. Hosted 320×568 keyboard placement aligned within 0.2 px of map center; draft cancellation enabled immediate retry; focus reached Refresh. The 934/933 px container-reflow checks describe the old layout, now replaced. Captures remain in `dist/selected-improvements-live-*.jpg` and `dist/post-release-regression-live.jpg`.

## Remaining limits

Exact-origin Oksu pier #5651 can still yield implausibly long walks. Historical sampling, station-number continuity and holiday treatment need further evidence. Receipt times do not establish provider observation freshness. Overseas feed access, endpoint longevity and physical-phone performance remain unverified. Passing route parity preserves a result; it does not prove the result is sensible. See [plan.md](plan.md) for the remaining work.
