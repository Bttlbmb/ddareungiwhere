# Verification

Dated evidence for the static-only optimization, 2026-10-01. This document reports checks, not a guarantee of every OSM route, source freshness or future availability.

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
