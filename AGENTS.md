# Project guidance for Codex

This workspace is **따릉이 Where?**, a static GitHub Pages app. The user's latest instructions take precedence.

## Context and ownership

Read the owning document for the task: [README](README.md) for entry points, [SPEC](SPEC.md) for behavior, [DESIGN](DESIGN.md) for appearance, [ARCHITECTURE](ARCHITECTURE.md) for modules/formats, [STATIC_SETUP](STATIC_SETUP.md) for maintenance, [DATA_SOURCES](DATA_SOURCES.md) for provenance, [REVIEW](REVIEW.md) for dated checks, [DECISIONS](DECISIONS.md) for rationale, and [plan](plan.md) for unresolved work. Backlog entries do not authorize implementation.

Here, `dist/publication` is the publication Git checkout, with `docs/` served by Pages. Edit sources, then regenerate assets. New published checkouts include a usable page; ignored raw inputs and routing build environments must be supplied separately.

## Preserve behavior

- Start without points. Map/GPS/time edits prepare a draft; Compare stations applies it. Refresh bikes updates inventory without rerouting.
- Compare five nearby departures to one destination station. Known snapshots remain stable until an explicit update; unknown counts are not zero. Historical Low does not predict when bikes will return.
- Pickup means collecting the bike, in Seoul time, from now through seven days ahead. Walking neither shifts pickup nor imposes a budget.
- Keep Route Ribbon / Slate & Teal compact. Slogans, hero panels, automatic queries, list expansion, rental summaries and large methodology blocks need a new request.
- Use plain JavaScript, Leaflet and on-device Valhalla. Python/SQLite are offline tools. The fixed HTTPS inventory feed needs no credentials; secrets stay outside browser assets.

## Development and checks

Preview over HTTP:

```sh
python3 scripts/preview_static.py --directory dist/site --port 63463
```

Use `--directory docs` in a published checkout. Follow STATIC_SETUP for builds; Python 3.11+ supports the standard-library tools. If `python3` is older, use a supported installed interpreter (`python3.14` here).

Run:

```sh
python3 -B -m unittest discover -s tests -v
node --test tests/test_frontend.cjs tests/test_static.mjs
```

Routing/SDK changes also need native/browser fixtures with matching Valhalla 3.8.3. Inspect desktop/phone layout, focus and internal scrolling after UI changes. Documentation-only changes need link/fact checks, without new tests. Comments should explain intent, assumptions and unusual handling, rather than repeat the code.

Preserve public provenance, licenses and measurement limits. Avoid large map/archive rebuilds for unrelated edits. Keep credentials ignored and outside generated files/logs. Use the allowlisted publisher and credential scan before publication. Exact-origin Oksu pier #5651 remains a known routing issue despite passing checks.

Update the owning document after behavior changes. Date evidence and distinguish choices, defaults, observations and proposals. Old benchmarks and desktop emulation must never be presented as current physical-phone evidence.
