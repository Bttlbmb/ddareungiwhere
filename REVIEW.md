# Verification

Current verification status. A passing check supports only the behavior it tested; it does not establish every route's plausibility, worldwide feed access, or future availability. [SPEC.md](SPEC.md) owns behavior, [DESIGN.md](DESIGN.md) appearance, and [plan.md](plan.md) unresolved work. Git history holds earlier reports.

## Source checks

On October 12, 2026, with Python 3.14, the Python and Node suites in [AGENTS.md](AGENTS.md) pass: 24 Python and 72 Node tests. The system Python 3.9 is below the documented minimum. The 15 native and browser route fixtures against Valhalla 3.8.3 (`a60c7cbfc`) last passed on October 3, 2026, including the unchanged long Oksu pier #5651 walk. They have not been rerun since.

## Build and publication

The build in `docs/` has module revision `91042991f1612db2`. Rebuilding it on October 12, 2026 reproduced the published tree exactly. It holds 2,735 station locations, 2,809 historical station numbers (October–December 2025, 134,832 cells), 87 street shards, and 13 routing tiles. The repository is at commit `3f5bad4`, the same as `origin/main`.

The latest hosted check is commit `e70ee41`, module revision `85107cd7e901a9b5`, on GitHub Pages on October 3, 2026, 10:09–10:16 KST. It matched eight changed assets and covered the phone Compare dock, tablet results, and map recovery. The later audit release (`3f5bad4`) has no recorded hosted check.

## Browser checks

Layout checks ran in desktop browsers at 1440×900, 840×1098, 390×667, and 320×568, in both languages. They covered empty startup, keyboard point placement, five-row comparisons, Compare visibility, internal results scrolling, and language switching with the journey preserved. They are viewport emulation, not physical-phone evidence. The user supplied physical-tablet screenshots on October 3, 2026; these do not establish phone speed, memory use, or compatibility.

Received bike counts in any record are dated snapshots, not availability promises.

## Limits

- Exact-origin Oksu pier #5651 can still yield implausibly long walks. Passing route parity preserves a result; it does not show the result is sensible.
- Historical sampling, station-number continuity, and holiday treatment need further evidence.
- Receipt times do not establish when the provider counted the bikes.
- Overseas feed access, endpoint longevity, and physical-phone performance remain unverified.
- Search Console ownership, submission, indexing, and traffic are unconfirmed.
