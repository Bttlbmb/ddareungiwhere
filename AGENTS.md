# Project guidance for AI agents

This workspace is **따릉이 Where?**, a static GitHub Pages app. The user's latest instructions take precedence.

## Context and ownership

Read the owning document for the task: [README](README.md) for entry points, [SPEC](SPEC.md) for behavior, [DESIGN](DESIGN.md) for appearance, [ARCHITECTURE](ARCHITECTURE.md) for modules and formats, [STATIC_SETUP](STATIC_SETUP.md) for maintenance, [DATA_SOURCES](DATA_SOURCES.md) for provenance, [REVIEW](REVIEW.md) for current verification status, [DECISIONS](DECISIONS.md) for rationale, and [plan](plan.md) for unresolved work. Backlog entries do not authorize implementation. Before writing or editing documentation, read [WRITING](WRITING.md).

The project root is the Git repository. `docs/` is the generated site that GitHub Pages serves (`main` → `/docs`). Edit sources, then regenerate it. A new clone includes a usable page; ignored raw inputs and routing build environments must be supplied separately.

## Preserve behavior

- Start without points. Map, GPS, and time edits prepare a draft; Compare stations applies it. Refresh bikes updates inventory without rerouting.
- Compare five nearby departures to one destination station. Known snapshots remain stable until an explicit update; unknown counts are not zero. Historical Low does not predict when bikes will return.
- Pickup means collecting the bike, in Seoul time, from now through seven days ahead. Walking neither shifts pickup nor imposes a budget.
- Keep Route Ribbon / Slate & Teal compact. Slogans, hero panels, automatic queries, list expansion, rental summaries, and large methodology blocks need a new request; [DESIGN](DESIGN.md#keep-the-page-compact) lists more additions of this kind.
- Use plain JavaScript, Leaflet, and on-device Valhalla. Python and SQLite are offline tools. The fixed HTTPS inventory feed needs no credentials; secrets stay outside browser assets.

## Development and checks

Preview over HTTP:

```sh
python3 scripts/preview_static.py --port 63463
```

The preview serves `docs/`. Follow STATIC_SETUP for builds; Python 3.11 or later supports the standard-library tools. If `python3` is older, use a supported installed interpreter (`python3.14` here).

Run:

```sh
python3 -B -m unittest discover -s tests -v
node --test tests/test_frontend.cjs tests/test_static.mjs
```

Routing/SDK changes also need native and browser fixtures with matching Valhalla 3.8.3. Inspect desktop and phone layout, focus, and internal scrolling after UI changes. Documentation-only changes need link and fact checks, without new tests. Comments should explain intent, assumptions, and unusual handling, rather than repeat the code.

Preserve public provenance, licenses, and measurement limits. Avoid large map and archive rebuilds for unrelated edits. Keep credentials ignored and outside generated files and logs. Run `scripts/check_release.py` before committing a release. Exact-origin Oksu pier #5651 remains a known routing issue despite passing checks.

Update the owning document after behavior changes, replacing the outdated text. Date observations and distinguish choices, defaults, observations, and proposals. Old benchmarks and desktop emulation must never be presented as current physical-phone evidence.

## Keep it lean

- Each change removes what it makes obsolete: code, tests, styles, config, fixtures, scripts, doc sentences, and index rows. Search for leftover references before finishing.
- Add a file, option, abstraction, dependency, or document only for a current need, preferring the file that already owns the topic. Completed work needs no report: the owning guide states the result and the commit message records the change.
- Guides describe the current state. When a feature or rule is removed, delete its requirement rather than adding “omit X,” unless a specific regression is likely.
- Git history is the archive. Do not keep superseded documents, commented-out code, or unused compatibility paths. REVIEW.md holds only the current verification status and open limits; fold a finished check into the owning guide or drop it.
- Flag unused material noticed outside the task rather than leaving it silently.
