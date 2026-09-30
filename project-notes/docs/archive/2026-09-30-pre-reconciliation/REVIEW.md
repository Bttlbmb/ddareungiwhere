# MVP review — 30 September 2026

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

Validation: 22 Python and 16 browser-logic checks pass, including bootstrap without collection, draft edits without comparison/live requests, no periodic timers, explicit submit, snapshot-only polling, and live-count updates without historical queries.

## Single-screen map/results update — 30 September 2026

A dashed straight line joins the starting point A and destination B, updating after point selection, dragging, examples or location access. It is labeled as a straight line, not a cycling route. The app opens in map view. An explicit Compare stations submission switches the shared panel to results; Back to map restores the same journey and map view and recalculates Leaflet's viewport size. Background queries and live refreshes never change the selected view, including when a response arrives after Back to map. On narrow screens the form is hidden while results are shown. The outer page fits the viewport; long forms/results scroll internally so all stations and methodology remain accessible. The Back to map control remains outside the scrolling results body.

Validation: 21 Python and 14 browser-logic tests passed. Added regressions for explicit versus background queries, Back to map during an in-flight request, resize invalidation, preserved destination, and replacing line geometry without accumulating stale lines. Browser checks at 390 × 844 confirmed the outer body stayed 390 × 844 in both views, with only the results body scrolling (576 px viewport / 969 px content). The compact mobile map view keeps Compare stations and the example journeys visible. Back to map retained both point labels and restored a nonzero map height. Temporary viewport sizing was reset.

## Page-loading repair — 30 September 2026

Following a report of missing layout, both open app tabs were inspected. The stylesheet was being served with the correct text/css type, and both tabs had active CSS rules; the older tab was still running the previous seven-column interface. The original unstyled state could not be reproduced. All local responses now carry Cache-Control: no-store, including HTML, CSS and JavaScript, to prevent reuse of stale assets during development. Restarted the server on port 63462 and refreshed both app tabs. HTTP verification confirmed complete HTML/CSS bodies matching the files on disk, correct MIME types and no-store headers. Browser inspection confirmed the current stylesheet’s 152 rules and styled layout.

## Three-column comparison and provisional risk — 30 September 2026

Removed individual mean, median and fastest rental columns. The table now shows station, current bikes and a color/text historical no-bike risk badge. The unweighted station-median summary remains above it. Low / Moderate / High use prototype thresholds of below 5%, 5%–below 20%, and at least 20% archived hourly zeros, with a minimum of 20 recorded days. Unknown covers insufficient or invalid evidence. Each station uses its own dates, so list expansion cannot change its rating. This is not a validated empty probability; the archive semantics remain unresolved. The October–December 2025 date range, selected hour/group and experimental limitation are visible above the table. Expanded methodology explains thresholds, missingness and differences in date coverage.

Validation: all 21 Python and 12 browser-logic tests passed. New checks cover classification boundaries, sparse/malformed evidence, separation from current empty/stale reports, independence from destination/common-date changes, selected-hour context and three-column rendering. No backend, dependencies or data imports were needed.

Browser checks: Konkuk at weekday 09:00 shows Moderate for #3534 and Low for the other four. Independent database counts were 8/64, 0/64, 3/64, 1/64 and 2/64 archived zeros respectively. Expanding to ten preserved those five ratings and recalculated the ride summary from 8.8 to 10.4 minutes. A future weekday 08:00 pickup changed the first five ratings to Low, consistent with an independent database query, and kept current inventory separate. Returned the app to five departures and pickup now. No browser warnings/errors were observed. At 390 px, body width was 390 px and the three-column table fit within 352 px without sideways scrolling. Temporary viewport overrides were reset. Preview: [mvp-risk-comparison.png](../../../data/processed/mvp-risk-comparison.png).

## Location and summary update — 30 September 2026

Added one-shot browser location for the origin, local street labels for both pins, and an unweighted average of the displayed station medians. Removed History and Past zero counts from the table and their archive explanation from the visible methodology. The data remains available internally. A data-quality note remains for small samples.

Validation: 21 Python and 10 browser-logic tests passed. These cover permission denial, timeout, out-of-area fixes, late GPS/address response protection, street-segment proximity, missing median exclusion, equal weighting despite unequal ride counts, and five-column rendering. Real user location was not obtained; geolocation success/failure paths were tested with simulated fixes.

Browser checks confirmed Toegye-ro/Mugyo-ro for the Seoul example and Achasan-ro/Jayanggangbyeon-gil for Konkuk. The displayed group summary was 13 minutes for Seoul's five stations, 8.8 minutes for Konkuk's five, and 10.4 minutes after expansion to ten. The latter matches a separate calculation from the displayed medians. Switching the return to #588 recalculated the five-station summary to 7.6 minutes, also matching the displayed medians. No browser warnings/errors were observed. Preview: [mvp-location-summary.png](../../../data/processed/mvp-location-summary.png). At 390 px, body width was also 390 px; the five-column table scrolls within a 352 px viewport. The extracted street geometry is 3.95 MB compressed; its verified source archive is 7.31 MB. Location lookup is local and does not use a public geocoding API.

## Repair update — 30 September 2026

The user authorized the follow-up repair pass. F1, F2, F3, U1, and U2 below are now addressed: freshness expires without a successful network response; import fingerprints cover all consumed files and versions; startup retries initialize the whole page; marker and row selection update together; and station-button focus is restored after redraws. Open popup counts also expire. Map panning preserves visible marker instances, refreshed coordinates update existing markers, and Enter activates a candidate marker's selection as well as its popup.

The authored HTML, CSS, and JavaScript were formatted for readability. Read-only server database connections now close explicitly. No framework, runtime dependency, extra database index, or summary precomputation was added.

All three complete ride files were compressed and their full decompressed SHA-256 hashes checked against the original downloads before the redundant CSVs were removed. Actual savings: **1,566,187,206 bytes (1.57 GB)**. The archives total **563,968,309 bytes**. Raw plus processed data now occupies approximately **1.84 GB** in logical file sizes, down from **3.40 GB**. Original download hashes remain in the manifest alongside archive hashes.

The production database was rebuilt from gzip sources, retaining **11,776,397 eligible ride rows**, and an immediate second import correctly skipped the unchanged inputs. All **18 Python tests and 5 browser-logic tests passed**, including the independent ten-pair data audit and new failure/recovery regressions. A second code review found no critical/high-severity issues; its minor marker-coordinate finding was also fixed. Test-only timing/DOM models complement browser checks and do not replace complete end-to-end coverage.

After restarting the app, browser checks confirmed matching marker/row selection using keyboard activation, retained station-button focus, popup return selection, future-pickup messaging, and the rebuilt Konkuk history (755 trips for station #3534 → #502). At phone width the document and body were both 375 px, with a 337 px scrolling table viewport and no page-wide horizontal overflow. No browser warnings/errors were recorded. Automated pointer targeting was unreliable in this session, so a direct mouse-click end-to-end check remains incomplete; the shared selection handler is covered by regression tests and keyboard interaction. The temporary viewport override was reset. Preview: [mvp-repaired.png](../../../data/processed/mvp-repaired.png).

The rest of this document preserves the original review and measurements. Original line references and file-size figures below refer to the pre-repair source, before formatting.

Scope: the running localhost app, functionality and recovery, desktop/mobile use and layout, and code quality, speed, and storage. Three agents reviewed separate areas; findings were consolidated in the main task. This is an evaluation, not a repair pass. Application code and source datasets were left unchanged.

## Confirmed functional findings

### F1 · P2 · Failed refresh can leave expired bike counts looking current

Location: `web/app.js:141–146`, with freshness display at `152–185`.

A deterministic JavaScript test rendered eight available bikes, advanced the clock three minutes, and rejected the live refresh. Although `isFresh(station)` returned false, the row still showed **8**, the header still said **Connected to Seoul**, and the recommendation still said the station was **currently reporting bikes**. The error message does not invalidate the existing presentation. This can mislead the station choice precisely when connectivity fails.

Expire displayed counts and availability recommendations independently of successful requests. On failure, redraw freshness, the connection indicator, and the recommendation together. Add a regression test for expired data after a failed request and for a page returning from the background.

### F2 · P2 · Updating the availability archive does not trigger an import

Location: `scripts/import_data.py:26–35` and `95–125`.

An isolated import of three tiny monthly trip files without the availability ZIP succeeded. After adding a valid ZIP and rerunning, the importer reported **Dataset already built** and the availability table remained empty. Only trip filenames and byte sizes participate in the freshness check. Replacing the archive is also ignored; a same-sized trip correction or a change in cleaning rules can be missed too.

Fingerprint every consumed input, including the archive, and include an importer/schema version. Retain the atomic replacement behavior. A targeted fixture test should cover adding, replacing, and removing an optional archive.

### F3 · P3 · A temporary startup failure leaves incomplete recovery

Location: `web/app.js:202–205` and `141–145`.

After an initial bootstrap failure, a later successful live refresh loads stations but does not initialize the journey or history metadata. The original error and “The local dataset could not load” remain. Clicking a familiar journey recovers comparison functionality, but the history-date header remains uninitialized. This was reproduced with a deterministic JavaScript test; it is recoverable, not a complete blocker.

Retry initialization until bootstrap succeeds, or share a single initialization routine with recovery. Clear the startup error only after successful recovery.

## Confirmed UI findings

### U1 · P2 · Map and table disagree about the selected station

Location: `web/app.js:89` and `148–150`.

In the browser, clicking numbered map marker **3** selected table row **#379**, while the dark selected marker remained **1**. The DOM confirmed both states. Marker selection calls `selectDeparture(id, false)`, and the false flag suppresses marker updates as well as panning. Update selection styling independently of camera movement; cover both map-to-table and table-to-map selection in one regression scenario.

### U2 · P2 · Selecting a station loses keyboard focus

Location: `web/app.js:154–168`.

Focus a station-name button and press Enter: selection succeeds, but the focused element becomes the document body. Replacing the entire table body removes the active button. The same rendering path is used for periodic result updates. Preserve the row/button elements or restore focus to the equivalent control after rendering, without moving focus when the user is elsewhere.

## Layout and interaction checks

The desktop layout appeared coherent. At a 390 × 844 viewport, the table's visible area was 337 px, its full width was 810 px, and the sticky station column was about 171 px. Station names, bikes, and averages fit together; the remaining columns require horizontal scrolling. There was no page-wide horizontal overflow. This is dense but usable; mobile station cards are an optional redesign, not a necessary bug fix.

Expanding from five to ten departures worked. Selecting 1 October at 08:00 correctly displayed the future-availability limitation and retained the explanation that rental averages use all pickup times. No browser warning/error entries were observed. The popup action for selecting a return station was not completed in this review and is not counted as a pass.

Mobile evidence: [review-mobile.png](../../../data/processed/review-mobile.png).

## Measured size and speed

Byte counts below are logical file sizes, using decimal MB/GB. Filesystem allocation can differ. Screenshots added during this review slightly increase the processed directory total.

| Component | Measured size |
| --- | ---: |
| Own application code: server, importer, HTML, JS, CSS | 59,625 bytes; about 60 KB |
| Vendored browser library and related files | 163,753 bytes; about 164 KB |
| Raw data directory | 2,231,766,645 bytes; 2.23 GB |
| Processed data directory before review screenshots | 1,171,112,154 bytes; 1.17 GB |
| SQLite database | 1,170,485,248 bytes; 1.17 GB |
| Database: individual trip rows | 831,668,224 bytes |
| Database: station-pair index | 167,903,232 bytes |
| Database: availability rows | 170,893,312 bytes |
| Database: schema, metadata, statistics | 16,384 bytes |

The database has **zero free pages**. A routine VACUUM is not supported as a meaningful space-saving recommendation by this measurement.

On the running local server, 21 consecutive requests for the five-station Konkuk → Ttukseom comparison gave a first request of **21.4 ms**, then a **13.18 ms median** and **26.7 ms maximum** across the remaining 20. The response was **5,372 bytes**. This is an already-running, cached, single-user localhost measurement, not a disk-cold test, browser rendering benchmark, or provider API latency measurement.

A separate cached live-inventory request returned **513,635 bytes in 10.65 ms**. This is the full citywide station list; it is larger than a comparison response but travels over localhost. These timings do not show an urgent response-speed problem.

The optimization agent independently measured warm HTTP comparisons at medians of **8.59–14.26 ms** across both journeys and 5/20 stations. To distinguish cached speed from new comparisons, it also cleared the application's station-pair cache before in-process measurements:

| Journey | Stations | Pair cache cleared | Pair cache warm |
| --- | ---: | ---: | ---: |
| Seoul Station → City Hall | 5 | 41.33 ms | 6.03 ms |
| Seoul Station → City Hall | 20 | 113.26 ms | 7.91 ms |
| Konkuk Univ. → Ttukseom | 5 | 361.77 ms | 6.00 ms |
| Konkuk Univ. → Ttukseom | 20 | 392.29 ms | 8.05 ms |

These are application-cache comparisons; the operating-system disk cache was not flushed. Subsecond first comparisons are acceptable for this MVP, but precomputed pair summaries could remove most of this difference if the dataset grows.

The availability lookup filters about 2,205 station rows down to 66 in one examined cohort because its primary key begins with station number and date rather than hour. The measured query took about **0.087 ms**. An additional index would cost storage with little user-visible benefit today.

## Optimization priorities

1. **Fix freshness and selection consistency first.** F1, U1, and U2 affect choosing a bike, regardless of how fast a request runs. Add targeted state and interaction tests rather than many tests that merely duplicate the implementation. F2 should be fixed before the next data update; F3 can follow in the same recovery pass.
2. **Compress retained monthly source files.** The first 8 MiB of each of the three CSVs compressed in memory to 26.5–26.8% of original size with gzip level 6. If representative of the full files, this suggests roughly **1.56 GB saved** across 2.13 GB of trip CSVs. This is a sample-based estimate, not a full-file result. Teach the importer to stream compressed input, verify full decompression hashes before removing any originals, and keep provenance. Reimports trade some CPU for lower storage. Nothing was compressed or removed on disk during this review.
3. **Consider a smaller runtime database after settling the statistics.** The UI consumes summaries while the runtime database retains every eligible trip. Producing validated, directed station-pair summaries at import time could reduce both database size and uncached query time. Preserve exact deduplication, medians, distinct-day counts, and fastest-ride screening. Station-coordinate changes affect that screen and need a versioned rebuild policy. Keep compressed source files for rebuilding and research. The resulting database size has not been measured; no specific reduction is promised.
4. **Improve readability without changing architecture.** The app is small and has no package-install dependency chain. Keep the standard-library server and plain browser code. Expand the five-line CSS source and dense JavaScript into readable formatting. Separate freshness, selection, and rendering decisions enough to test them; the current scattered redraw paths caused several findings. This may increase source byte count slightly, which is immaterial beside the dataset.
5. **Make database ownership explicit.** SQLite transaction context managers do not themselves express connection closure. Use deterministic closure around short read operations (`app.py:208–224`, `265–266`) for clear resource ownership. A bounded probe of 30 plans, including with garbage collection disabled, did **not** observe retained database file descriptors on this Python runtime; do not describe this as a demonstrated leak.
6. **Defer low-value tuning.** Do not add an availability index, change frameworks, minify authored source further, or rebuild the database solely to VACUUM it. Smaller/differential live payloads, conditional caching for static files, and avoiding full map-layer redraws are reasonable later refinements if measurement identifies a real bottleneck. Browser request timeout/cancellation would improve failure handling, but an actually hanging server response was not reproduced here.

Storage is the main resource cost: roughly **3.40 GB** across raw and processed files. An atomic rebuild temporarily retains the previous database alongside the new one, so budget another database-sized allocation plus working space. Process memory was not measured because the environment restricted process inspection; no memory claim is made.

## Validation summary

- All seven existing tests passed, including directed station-pair statistics checked against the independent real-data audit.
- A malformed coordinate request returned an explanatory error.
- Additional isolated tests reproduced F1, F2, and F3. Their temporary harnesses were kept outside the product code.
- The existing tests cover statistical rules and basic input handling, but do not cover these refresh, startup recovery, or importer invalidation failures.
- Future empty-bike probabilities, station closures/moves, holiday-specific forecasts, and cycling directions remain known scope or research limits. They are not presented here as newly introduced regressions.

P2 means a meaningful correctness or usability issue to address in the next repair pass. P3 means a smaller, recoverable issue. No destructive failure or credential exposure was observed in the checks performed; this was not a comprehensive security audit.
