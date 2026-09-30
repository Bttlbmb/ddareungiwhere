# Project status and next work

Updated 2026-09-30 after reconciling the conversation, code, metadata, and checks. Backlog entries are proposed work, not standing instructions to implement them. Current behavior: [SPEC.md](SPEC.md). Rationale: [DECISIONS.md](DECISIONS.md).

## Completed

- [x] Data/API feasibility audit and Seoul Station → City Hall / Konkuk Univ. → Ttukseom Park journey tests.
- [x] April–June 2026 trips and Q4 2025 inventory imported; reproducible provenance and verified source compression.
- [x] Local Python/SQLite service, plain JavaScript/Leaflet browser app, five nearby departures, shared return, live counts, historical bands.
- [x] Manual comparisons/refresh only; empty startup, one-shot GPS origin, local street labels, late-response protection.
- [x] Map/results replacement, Back to map, straight A–B guide, compact copy and left planner.
- [x] Removed visible rental-time/history/record summaries, archive context blocks, expansion button, and slogans.
- [x] Kakao trial/cache, enlarged Valhalla comparison at 15 km/h, then replaced Kakao at runtime.
- [x] Local bicycle/walking estimates; full Seoul graph expansion and long-journey checks.
- [x] Partial Oksu repair for station endpoint attachment to overhead bridges.
- [x] 따릉이 Where? / Looking Wheels; Route Ribbon / Slate & Teal; phone metrics without sideways scrolling.
- [x] Original review repairs: freshness, import invalidation, bootstrap recovery, selection/focus, marker reuse.
- [x] Verified gzip source savings of 1,566,187,206 bytes; bounded history/route caches.
- [x] Documentation reconciliation and AGENTS.md for future chats, historical snapshots preserved separately.
- [x] Whole-project optimization: removed unused runtime history/API work, bounded archive cache, compact JSON and street index, obsolete CSS/selector cleanup, request timeout, connection/provenance fixes.

## Verification

2026-09-30 after optimization: **35 Python + 23 browser-logic tests passed** (58 total, no skips), including real local graph routes and ten independently audited historical pairs. SQLite warnings are resolved; checks also run with ResourceWarnings treated as errors. Removed obsolete rental-summary tests and added current runtime, timeout, cache-lifetime and provenance regressions.

Latest browser checks: desktop and 390/320 px, empty startup, manual comparison, Back to map; no page/table horizontal overflow on the checked phone widths. [Current screenshot](data/processed/mvp-optimized.png). GPS paths use simulated fixes/errors, not the user’s real location. Verification limits: [REVIEW.md](REVIEW.md).

Optimization checks compared sampled original/current styles at 1440/800/390/320 px and 1,004 street lookups. CSS is 36% smaller; retained street index footprint is about 79% smaller. Benchmarks include five bicycle/five walking calls and their warm-up caveats. See [REVIEW.md](REVIEW.md#optimization-pass--2026-09-30).

## Priority: unresolved Oksu walking case

**Still open.** Near #556, 53–55 minute walks to #565/#5651 were traced to overhead bridge attachment. Destination station matching now excludes bridge edges, without excluding bridges from route traversal. That near-#556 regression passes (about 1/3/5 minutes in the recorded check).

During palette verification, starting exactly at **Oksu pier #5651** still produced approximately **49–55 minute walks** to #565/#556/#523/#3550, 185–671 m away. Reproduced again during optimization: #565 50.34 min / 185 m direct; #556 53.12 min / 342 m; #523 49.00 min / 555 m; #3550 55.42 min / 671 m. [Recorded evidence](docs/evidence/optimization-2026-09-30.json). Origin-side bridge/network correlation is a hypothesis; existing destination-side tests do not resolve this case.

Proposed investigation: reproduce exact/offset pier starts against the current graph; inspect correlated edges and geometry in both directions; check access/bridge connectivity; add an exact-origin regression with a justified fix. Preserve genuine detours instead of capping long walks or silently substituting straight-line minutes.

## Remaining work, in priority order

P1 means correctness or an existing integration exposure; P2 means maintainability/storage; P3 means optional improvement. These are proposals, not unasked implementation instructions.

| Order | Priority | Work | Why / next concrete step |
| --- | --- | --- | --- |
| 1 | P1 | Exact-origin Oksu pedestrian detour | Visible implausible estimates; inspect edge matching and route geometry before changing access rules, as above. |
| 2 | P1 | Historical inventory meaning and usefulness | Verify hourly quantities/zeros/missingness and station continuity; test later holdouts before treating the old quarter as a forecast. Include holidays/season drift. |
| 3 | P1 | Secure Seoul API transport and account limits | Current tested HTTP connection exposes the key in transit; establish a supported secure endpoint and actual account quota. Do not invent provider support or disable certificate checks. |
| 4 | P2 | Smaller runtime database | Runtime no longer needs individual trips. Generate compact station/hour/day-group archive counts plus metadata/shortcuts, keep raw sources and a deliberate offline-analysis path. Verify exact counts/provenance before replacing the 1.17 GB database; do not silently delete research data. |
| 5 | P2 | Reproducible map/history refresh | Document/automate bounded map acquisition and atomic graph publication, validate walking connectivity and station moves; saved-PBF tile rebuilding already works. Agree a manual data cadence first. |
| 6 | P2 | Durable version history/backup | Workspace currently has no Git repository; temporary optimization backup is not durable. Establish a source-only history with credentials/data exclusions and a separate dataset backup policy. |
| 7 | P3 | Request cancellation and broader latency profiling | Browser timeouts now recover controls, but superseded/disconnected requests can finish server calculations. Measure concurrent/slow requests before adding cancellation/concurrency complexity; baseline warm comparisons are already fast. |
| 8 | P3 | Language/search decisions | Current English/Korean-name interface is retained. Address search/bilingual controls need a user-facing requirement, not a speculative rewrite. |

## Deferred

Turn-by-turn directions; routed map geometry; walking-budget filters or leave-origin/door-to-door totals; refill forecasts; destination availability/capacity; accounts, saved journeys, booking/payment, alerts, weather, unattended collection. Five departures are the API/UI scope; unused count=10/20 expansion was removed. CSS cleanup, SQLite warning cleanup and baseline full-comparison measurements are completed, not outstanding tasks.

## Maintain the handoff

Put requirements in SPEC, design in DESIGN, implementation in ARCHITECTURE, rationale in DECISIONS, remaining work here. Update evidence dates/limits. Do not duplicate the same reverse-chronological logs across documents. See the [documentation index](README.md#documentation-map).

## Static deployment remaining work — 2026-10-01

- GitHub Pages publication and actual hosted five-station comparison verified on 2026-10-01, including relative subdirectory paths and compressed tile transport. Continue physical-phone testing below.
- Cloudflare proxy/coordinator deployed and connected. The official website’s HTTPS ALL station feed provides a key-free alternative; retain failure/expiry safeguards and check source format/coverage during maintenance. Secure transport for the optional authenticated Open API adapter remains unresolved; its secret stays unused. Confirm provider limits before revising the protective budget.
- Test actual iPhone/Android download time and memory. Complete native tiles remain large; graph filtering saved little. Retain hierarchy unless further comparisons justify changing it.
- Acquire explicit additional archive months for a genuine six-month summary, then verify coverage and station continuity; the current export still has three observed months.
- The separate Oksu exact-origin routing defect remains.
