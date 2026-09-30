# Initial data feasibility audit

Historical research, inspected 2026-09-30 before the MVP was built. Findings and numerical results below are retained as evidence; proposed UI, averages/records and walking-budget tasks are not current requirements. Walking estimates were later added with Valhalla, without a walking-time filter. See [SPEC.md](SPEC.md) and [DECISIONS.md](DECISIONS.md) for current behavior. This audit does not validate routed access or future availability forecasts.


Inspected 2026-09-30, Asia/Seoul. This is a sample and schema audit, not a validated prediction model. No application code has been written.

Follow-up: [JOURNEY_AUDIT.md](JOURNEY_AUDIT.md) now covers a complete June trip-file scan for the two user-supplied journey areas and the remaining live station pages. The findings below preserve the scope of the initial audit.

## Conclusion

The data supports live station information and directed station-pair rental-duration summaries. Station identifiers can be joined across the inspected sources. Historical availability analysis is technically feasible, but exact hourly measurement semantics still need clarification before labeling a derived frequency as an empty-station probability.

The first version should show dated historical evidence and honest unavailable states. The fastest-rental feature requires explicit cleaning. This inspection does not establish sufficient trip coverage for arbitrary journeys, because the trip sample covers only part of one early morning.

## What was inspected

| Source | Material inspected | Scope |
| --- | --- | --- |
| [Individual rental history, OA-15182](https://data.seoul.go.kr/dataList/OA-15182/F/1/datasetView.do) | First 1,048,576 bytes of June 2026 CSV; last partial line excluded | 5,994 complete records; rentals on June 1 from 00:00:07 to 04:46:26. Deliberately limited prefix, not random sampling. |
| [Hourly availability archive, OA-22382](https://data.seoul.go.kr/dataList/OA-22382/F/1/datasetView.do) | Entire Q4 2025 ZIP, 99,598,295 bytes; three monthly CSVs read without extracting large copies | 6,152,132 station-hour records across October–December. |
| [Current availability, OA-15493](https://data.seoul.go.kr/dataList/OA-15493/A/1/datasetView.do) | Pages 1–1,000 and 1,001–2,000 | 2,000 distinct station IDs, fetched around 06:37 KST. This is not a complete citywide inventory. |
| [Recent hourly history, OA-20447](https://data.seoul.go.kr/dataList/OA-20447/A/1/datasetView.do) | First 1,000 rows for September 29, 2026, at 08:00 | 1,000 distinct station-hour keys, all with the requested hour. |
| [Official trip-data FAQ](https://datafile.seoul.go.kr/bigfile/iot/inf/nio_download.do?useCache=false&infId=DOWNLOAD&seqNo=&infSeq=1&seq=132) | Two-page PDF, dated March 2022 | Duration/distance definitions and maintenance-station explanation. Older guidance; newer file behavior was checked separately. |

Public raw data and verification results are retained under ignored `data/raw/`. Download links, checksums, and scope are in [data/manifest.json](data/manifest.json). The partial trip file is deliberately named `trips_202606_prefix.bin` so it cannot be mistaken for the full monthly CSV.

## Trip durations: usable, with cleaning

The trip CSV uses CP949 encoding and contains both human-facing station numbers and `ST-…` station IDs. Relevant fields are:

| Field | Meaning |
| --- | --- |
| 대여일시 / 반납일시 | Rental and return timestamps, recorded to seconds |
| 대여 대여소번호 / 반납대여소번호 | Station numbers, stored with leading zeros |
| 대여대여소ID / 반납대여소ID | Stable-format identifiers compatible with the live API |
| 이용시간(분) | Reported usage duration in minutes |
| 이용거리(M) | Reported usage distance in metres |

The official FAQ defines usage time as the interval between successful rental and successful return through the app, and distance as GPS-measured travel during that rental. These are rental records, not proof of continuous cycling along a particular route. Maintenance-centre rentals may be post-repair tests and must not be treated as public trips.

In the 5,994-record prefix:

- 133 records report zero minutes, although all timestamp-derived elapsed durations are positive. Minute precision explains many very short rentals; zero alone is not proof of a corrupt record.
- 460 return to the departure station.
- 203 have zero recorded distance, including 49 between different stations. Distance cannot be treated as universally reliable.
- For 5,940 records, reported minutes equal the floor of elapsed minutes. Thirteen differ from elapsed time by at least a minute; flooring is therefore not a universal rule.
- Two different-station rentals report zero minutes. A raw minimum is unsuitable as the displayed record.

As a calculation demonstration only, the sampled direction 서울과학기술대학교(미래관), `ST-2080`, to 서울과학기술대학교(어학교육원), `ST-2081`, has seven positive-duration records: reported mean 5 minutes, minimum 3, maximum 9. These have not passed route plausibility checks and are not a proposed user-facing estimate or record.

Recommended next rules: preserve both reported and timestamp-derived durations, flag discrepancies, exclude same-station loops from transport-pair estimates, and identify maintenance/test stations. Establish distance and speed plausibility checks only after validating their inputs. Do not decide final thresholds from this small, time-biased sample.

The raw file also contains bike identifiers and rider demographic columns. The app's summaries do not need birth year, gender, user category, or a displayed bike identity; omit them from processed product data.

## Availability: useful observations, incomplete measurement definition

The CP949 archive contains `일시` (date), `대여소번호` (station number), `대여소명` (name), `시간대` (hour), and `거치대수량` (literally rack quantity). The catalogue describes the dataset as available bicycle quantities. The values change through the day, so they are not consistent with a fixed installed-rack capacity. For example, station 102 changes from 44 at 00:00 to 8 at 21:00 on October 1.

That behavior and the catalogue description support an inventory interpretation. They do **not** establish whether the hourly value is an on-the-hour snapshot, a selected observation, an average rounded to an integer, or another aggregation. Neither the CSV header nor the inspected API specification resolves this. Do not infer the sampling rule merely because counts are integers.

| Month | Rows | Distinct station numbers | Observed date/hour slots | Zero-count rows |
| --- | ---: | ---: | ---: | ---: |
| October 2025 | 2,071,152 | 2,799 | 743 of 744 | 208,113 |
| November 2025 | 2,004,849 | 2,802 | 719 of 720 | 179,411 |
| December 2025 | 2,076,131 | 2,799 | 743 of 744 | 191,105 |

No duplicate station/date/hour keys, null cells, negative counts, or invalid hours were found in those three files. Each month has a complete absent hour: October 2 at 09:00, November 2 at 09:00, and December 2 at 09:00. The cause is unknown. Individual stations also have shorter coverage; station opening/closure dates were not available in this audit. Do not count missing rows as empty stations or assume every absent row is a collection failure.

The hourly API is `bikeListHist`, takes `yyyyMMddHH`, and returns a `getStationListHist` object. It distinguishes `rackTotCnt` from `parkingBikeTotCnt` and includes `stationDt`. The inspected hour returned explicit zeros and no duplicate station-hour keys. Its 249 zero-count rows out of 1,000 sampled stations are **not** an estimate for a future ride or the entire city. The relationship between this API's observation process and the older archive remains unverified.

## Sample sizes and station joins

- The trip sample contains 2,229 station numbers. Each maps to one `ST-…` ID within the sample; 2,218 numbers occur in the older availability quarter. The eleven absent numbers could reflect newer stations or other changes, and need investigation.
- Of those trip station mappings, 1,634 IDs appear in the two inspected live pages. All 1,634 agree with the numeric prefix in the live station name. Stations absent from a partial live extract must not be marked closed.
- The archive's numeric station identifier can therefore be linked through the trip fields for demonstrated cases. A complete production crosswalk still needs station metadata, dates, and movement/rename checks. Do not join on name alone.
- At each of example stations 102, 103, and 104, filtering to Monday at 08:00 leaves only four October observations, four November observations, and five December observations. Zero recorded empty observations out of four must not become a claim of zero future risk.

Use a larger historical window or broaden day/time groups when needed, while keeping the displayed scope explicit. Report observations and distinct days, and withhold strong comparisons when uncertainty is too large.

## Integration findings

- Both live pages succeeded but each reported `list_total_count: 1000`, matching its page size. The count field is not a reliable citywide total in these tested calls. Verify termination and ordering before implementing a complete station fetch.
- Live rows have no source observation timestamp. The recent-history rows have only an hour label. Store fetch time separately.
- All three authenticated calls succeeded over the previously verified HTTP endpoint. This audit did not resolve secure transport support, quotas, refresh intervals, or changes during pagination.
- Historical and live row order differs; joins must use IDs, never row position.
- The hourly API includes an example of 22 bikes at a station with 10 nominal racks. Do not compute return eligibility as racks minus bicycles.

## Decisions supported and remaining checks

Proceed with planning a small local app using live counts, directed-pair rental statistics, and dated historical availability evidence. No machine-learning model is needed to establish the first useful version.

Before implementing or advertising precise empty probabilities, obtain an authoritative definition of `거치대수량` and the hourly sampling process, or use newly collected, explicitly timestamped observations with sufficient coverage. A future provider inquiry should ask whether the value is a snapshot or aggregation, when it is measured, and how outages/closures appear. No inquiry has been sent.

Before relying on journey statistics, inspect a complete trip month for selected familiar journeys, including daytime coverage, station mapping, and outliers. The first-month and first-quarter inspection plan is only partly complete: the quarter was fully scanned, the trip month only sampled, and the station master not yet inspected.

Forecast calibration, weather effects, seasonal transfer from 2025 to 2026, and whether a more distant station is meaningfully more reliable remain untested.
