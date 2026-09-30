# Retained comparison and optimization evidence

The public station-pair comparison results below were recovered from the reversible local experiment and retained here on **2026-09-30** so future work does not depend on temporary folders. They contain station coordinates and estimates, not API keys or personal location fixes.

| Evidence | Scope |
| --- | --- |
| [Initial comparison](valhalla-kakao-initial-2026-09-30.json) | 36 saved Kakao pairs considered; the small trial map covered 12 and excluded 24. Compare `city15_min` for the 15 km/h variant; other Valhalla fields include the earlier default-speed trial. |
| [Expanded comparison](valhalla-kakao-expanded-2026-09-30.json) | The remaining 24 pairs, all successfully routed by Valhalla 3.9.0 with `bicycle_type=city`, `cycling_speed=15`. Bounds 37.47184,126.85368 to 37.68587,127.14985. |

Expanded results: median absolute time difference **1.895 min**, mean absolute difference **2.6875 min**, mean signed difference **+1.6267 min**; 13/24 within two minutes. Saved Kakao cache was unchanged, and no fresh Kakao requests were needed for the comparison. The user judged this sufficient to replace Kakao with local routing.

These are comparisons between routing estimates, not measured travel times, and not a representative accuracy benchmark for all Seoul routes. Build, memory and query timings describe the specific trial workload. The current app uses a larger full-Seoul map, whose provenance is in [coverage.json](../../data/processed/valhalla/coverage.json). Do not apply the smaller trial bounds or build timings to the current graph. Active behavior and known pedestrian issues are in [SPEC.md](../../SPEC.md) and [plan.md](../../plan.md).

Original temporary sources: `/private/tmp/seoul-valhalla-trial-20260930/bike-comparison.json` and `expanded-bike-comparison.json`. The copies here are byte-for-byte evidence; those temporary paths are not runtime dependencies.

## Optimization measurements

[optimization-2026-09-30.json](optimization-2026-09-30.json) retains before/after source sizes, backend comparisons and street-index measurements. Inputs were saved public station data and the existing graph, with no live-provider fetch in the timing harness. The comparison order benefits the later measurements from warm OS pages; retained index size is not whole-process RAM. See [REVIEW.md](../../REVIEW.md#optimization-pass--2026-09-30) for interpretation and verification. Temporary backup paths in the evidence are rollback references, not project dependencies.
