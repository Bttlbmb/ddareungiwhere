# Verification and optimization review

Current status reconciled **2026-09-30**. This document reports checks and measurements, not a guarantee that all routes or forecasts are correct. The original multi-agent review, repair chronology and earlier layout/size benchmarks are preserved in [the archived review](docs/archive/2026-09-30-pre-reconciliation/REVIEW.md). Current open work belongs in [plan.md](plan.md).

## Current checks

After the optimization pass, the installed workspace passed:

| Check | Result |
| --- | --- |
| `.venv/bin/python -B -W error::ResourceWarning -m unittest discover -s tests -v` | **35 passed**, no skips; SQLite warnings resolved |
| `node --test tests/test_frontend.cjs` | **23 passed** |

Coverage includes time boundaries, import invalidation, gzip equivalence, duplicate/long rentals, missing versus zero inventory, freshness during failed/hanging refreshes, manual submission, asynchronous response guards, empty startup, map/row selection, focus preservation, local labels, simulated GPS and local routing. Installed-graph checks include ordinary and cross-city routes. These are unit/integration and browser-logic checks, not complete end-to-end coverage of every mouse/touch/browser interaction.

The earlier SQLite warnings are resolved by closing fixture connections and the importer on failure; the popular-route script also closes its read-only connection. New regressions cover no runtime trip queries, fixed five-row overrides, hanging-request timeout, route-cache lifetime and street-import provenance. Obsolete rental-summary tests were removed; the independent ten-pair dataset audit remains.

The preceding palette implementation was checked in the browser on desktop and at 390 px and 320 px widths, including empty start, manual comparison, Back to map and internal scrolling. GPS success/errors were simulated; the user's real location was not obtained. These describe the palette implementation pass; the optimization layout checks are recorded below. Local preview: [Slate & Teal results](data/processed/mvp-slate-teal-results.png). This ignored image may not travel with source files; [DESIGN.md](DESIGN.md) and the CSS/SVG are the durable design record.

## Optimization pass — 2026-09-30

Reviewed all authored runtime code, maintenance scripts, tests and current documentation. Assessed dependencies and data by role/size; preserved vendored third-party code and source provenance. Pre-edit code/docs are backed up at `/private/tmp/seoul-optimization-o5ohzh89`, a temporary rollback aid rather than a permanent backup or runtime dependency.

Implemented:

- Removed invisible rental summaries/caches/API fields, common-date intersections, extra return lists and alternative recommendations. Comparisons no longer read detailed trips; history remains for popularity and offline analysis.
- Fixed five-row API scope, selected nearest candidates without sorting two whole station lists, cached archive counts, and stopped calculating/sending redundant citywide freshness flags. The browser still expires reports; the server checks compared departures.
- Packed street coordinates/cell IDs and interned repeated names; preserved precision/tie order and reused each lookup's projection scale.
- Removed obsolete CSS, unused palette variables and overridden declarations; merged selectors within responsive contexts. CSS: **30,194 → 19,366 bytes (36% smaller)**; **1,858 → 1,274 lines**. Core runtime/browser sources: about **88 → 76 KB**, excluding scripts/tests/vendor/docs.
- Scoped routing caches to their engine instance; reused the time formatter, scanned once for fallback station labels, removed duplicate invalidations and unused captions.
- Added a **30-second local HTTP timeout** that releases controls. Aborting the browser request does not cancel a Valhalla calculation already running on the server.
- Closed SQLite connections on failure, cached archive date parsing, avoided a second decompression of newly verified archives, streamed street-source hashes and preserved original download URLs while publishing the street manifest atomically.

[Recorded benchmark evidence](docs/evidence/optimization-2026-09-30.json):

| Measurement | Before | After |
| --- | ---: | ---: |
| Retained street index object footprint | 107.9 MB | **22.5 MB**, about 79% less |
| Street lookup median, 200 sampled points | 0.434 ms | 0.357 ms |
| Street startup peak RSS, separate processes | 248.2 MB | 228.0 MB |
| Street startup | 0.435 s | 0.474 s |
| Seoul full comparison, warmed median | 3.59 ms | 2.66 ms |
| Konkuk full comparison, warmed median | 3.54 ms | 2.72 ms |
| Seoul/Konkuk comparison JSON | 6,696 / 6,842 bytes | 2,551 / 2,642 bytes, about 61% less |

Retained index footprint is not total process RAM; startup peak includes temporary JSON parsing. Startup became slightly slower while retained memory and lookups improved. Full-comparison timings include five bicycle/five pedestrian calls, exclude HTTP/browser/live-provider latency, and had no route failures. Before ran first, so after benefited from warm OS pages. First comparisons were 474/435 ms before and 77/15 ms after: cache/engine warm-up measurements, not fair disk-cold or universal speedup claims.

**1,004 real-map street labels/distances matched exactly.** Sampled computed styles matched the original for planner and same-data results at **1440, 800, 390 and 320 px**. Current data files were neither rebuilt nor discarded. The Oksu exact-origin issue remains unresolved.

The final running interface was checked again after the server restart. [Optimized results preview](data/processed/mvp-optimized.png). This ignored screenshot is local evidence; the design record and source files remain the transferable reference.

## Routing evidence and remaining defect

The current full-Seoul map contains all 2,735 saved station coordinates. [full_seoul_routing_check.json](data/processed/full_seoul_routing_check.json) records 20 successful bicycle estimates across west/east and north/south extremes, with walking estimates also returned. One extreme west–east bicycle estimate was **184.82 minutes / 45.933 km**. Coordinate coverage and successful routing do not validate path access everywhere.

The screenshot showing roughly 53–55 minute walks to stations only 240–334 m away near Oksu led to an endpoint-matching repair. Regression cases from nearby origin pins improved to roughly 1/3/5 minutes. **A remaining case starts exactly at pier station #5651:** walks to #565, #556, #523 and #3550 were still about 49–55 minutes despite straight-line separations of roughly 185–671 m. The optimization pass reproduced 50.34 / 53.12 / 49.00 / 55.42 minutes for those four stations, with no routing error. Origin edge matching is suspected, not confirmed. Preserve this known issue until route geometry and both directions establish the cause; do not hide all detours behind a straight-line cap.

The user accepted switching from Kakao after a saved-estimate comparison at a 15 km/h city-bike setting. For the expanded trial's 24 pairs, all routed; median absolute difference was **1.895 min**, mean absolute difference **2.6875 min**, and 13/24 were within two minutes. This is agreement between models, not validation against actual riding. [Trial files](docs/evidence/README.md) preserve the smaller map bounds and parameters.

## Storage measured during reconciliation

Logical file sizes, decimal MB/GB; filesystem allocation can differ. These are a local snapshot, not installation/download guarantees.

| Component | Bytes | Approximate size |
| --- | ---: | ---: |
| Raw data | 687,830,660 | 688 MB |
| Processed data, including graph and local evidence/screenshots | 1,262,232,898 | 1.26 GB |
| Raw + processed | 1,950,063,558 | **1.95 GB** |
| SQLite history database, included above | 1,170,485,248 | 1.17 GB |
| Valhalla graph/config/provenance directory, included above | 84,802,140 | **85 MB** |
| Installed Python environment | 96,141,288 | 96 MB |
| Browser files including vendored Leaflet/assets, before optimization | 226,428 | 226 KB |
| Browser files including vendored Leaflet/assets, after optimization | 215,761 | 216 KB |

The routing source PBF is about 14 MB and is included in raw data. “Valhalla is 250 MB” was a rough discussion estimate, not the measured graph size. Memory use is separate from disk. The expanded trial recorded about 203 MB process peak and 396 MB build peak; the full-Seoul routing check recorded about 197 MB peak. Those workloads and extracts differ, so they are not general peak guarantees.

Verified gzip compression already saved **1,566,187,206 bytes** without removing history rows. The original database review found zero free pages; it did not support routine VACUUM as meaningful space recovery. Importing new history temporarily needs another database. More reductions would require measured tradeoffs, for example replacing detailed trips with verified summaries while retaining provenance and exact deduplication behavior.

## Speed and code quality

The expanded 24-route trial recorded a median route-query time of about **2.36 ms**, with an initial engine warm-up outlier. The full-Seoul extreme check recorded about **639 ms** for its first long route and roughly **46–104 ms** for subsequent extreme bicycle routes. These are routing-call measurements, not full browser lookup latency. The newer full-comparison benchmark is above; separate disk-cold/browser measurements would be needed for stronger latency claims.

Earlier 13 ms cached plan-request measurements predate local routing and the current interface; do not quote them as today's full lookup performance. Likewise old source line counts, screenshots and seven-column table measurements are historical. The browser-logic suite is not a rendering benchmark.

The current stack remains small: no frontend framework/build chain, one pinned routing dependency, local Leaflet, SQLite and bounded memory caches. Cold route estimates run sequentially and use a serialized shared routing engine. Refresh bikes avoids rerouting. Caches help repeated lookups but do not survive a restart. Historical data dominates storage.

CSS cleanup, full-comparison profiling and SQLite warning cleanup are completed. Further concurrency work needs a demonstrated bottleneck. A compact runtime archive database could reduce deployed storage while preserving detailed trips for offline analysis. The ordered backlog is in [plan.md](plan.md); no framework rewrite is justified by these measurements.

## Resolved earlier review findings

- Expire counts independently of refresh success, including failed/hanging refreshes and open popups.
- Fingerprint every consumed import source and importer/schema versions, including availability changes.
- Recover full initialization after bootstrap failure.
- Keep map/table selection consistent and restore keyboard focus after redraw.
- Reuse/update markers rather than accumulate duplicates.
- Close application read-only database connections explicitly; compress and verify source data.
- Serve correct MIME types with no-store development responses, and launch through localhost rather than `file://`.

Historical rating semantics, forecast calibration, station continuity, secure provider transport and the exact-origin Oksu defect are still unresolved. Documentation updates do not resolve those technical/data issues.

## Static prototype verification — 2026-10-01

The existing and new suites passed: **37 Python checks + 30 Node checks**. New checks cover the browser service's manual fetch boundaries, exact summary window selection, independent walking failures/access gaps, secret-redacted provider errors, HTTPS restrictions, complete pagination, shared refresh admission and conflict-safe availability imports. A Cloudflare deployment dry run succeeded; no live Worker is deployed.

Independent SQL matched **all 134,832** exported station/hour/day-group observation and zero totals. **391** exported street lookups matched the native labels/distances exactly. Summary gzip size: **89,181 bytes**, with 2,809 historical stations and actual October–December 2025 coverage; station coordinates number 2,735. The generated output includes 87 street shards and optional gzip siblings.

Ten actual browser routes were compared with native Valhalla 3.8.3 on the same filtered graph/configuration: no failures, bicycle summary times identical, walking differences entirely explained by the same access-gap adjustment. Ordinary short routes, longer west-Seoul routes and the exact Oksu origin were included. The Oksu walk remains about **50.34 min** and is not fixed.

A browser routing session's first short pedestrian route loaded **16,835,128 decoded tile bytes** and finished in about **524 ms** over localhost. Ten checks across multiple areas fetched **74,052,400 decoded tile bytes** and reached **108,724,224 bytes** of WASM heap capacity. Loader byte counts represent decoded bytes, not compressed network transfer; they exclude the 9,861,835-byte WASM binary. Local HTTP/browser caches were warm. These are desktop measurements, not mobile/internet latency or total-memory guarantees.

Original graph: **84,791,480 bytes / 13 tiles**. Filtered hierarchical browser graph: **83,148,112 bytes / 13 tiles**, largest tile **27,731,832**. Flat trial: **79,135,864 / 10 tiles**, largest **31,014,480**; this did not justify choosing it over hierarchy. The builder version changed too, so the 2% reduction is not a controlled attribution solely to road filtering. Desktop comparison returned all five walking/cycling estimates and historical bands with unknown live counts. The local HTTPS handshake to the documented Seoul API port failed without transmitting a key. Hosted delivery and physical phone behavior remain open.

Explicit gzip graph assets total **29,839,155 bytes** versus 83,148,112 decoded bytes (about **64% less transfer**). The SDK wrapper requests those assets directly and validates decoded tiles. This is a file-size measurement, not a Pages speed benchmark. The static layout was checked at **390 × 844** with actual WASM estimates, empty start, five result rows, focus and internal scrolling; it is viewport emulation, not a physical phone benchmark.

Hosted verification: https://bttlbmb.github.io/ddareungiwhere/ returned HTTP 200 after Pages activation. The actual hosted interface loaded station/shortcut data, resolved selected street labels and returned all five walking/cycling estimates plus historical bands for the Guro shortcut. Explicit gzip-tile decoding passed the ten native/browser route checks again after its loader fix. Live counts remain unknown. No Cloudflare login/deployment or secret transfer occurred; manual setup is the user’s chosen next step.
