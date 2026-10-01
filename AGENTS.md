# Project guidance for Codex

This workspace is **따릉이 Where?**, a static page hosted on GitHub Pages. The user's latest instructions take precedence. The legacy Python application and Cloudflare proxy have been removed.

## Context and ownership

Read documents relevant to the task: README for entry points, SPEC for product rules, DESIGN for appearance, ARCHITECTURE for modules/formats, STATIC_SETUP for maintenance, DATA_SOURCES for provenance, REVIEW for dated checks, DECISIONS for rationale, plan for unresolved work. Backlog entries are not instructions to implement them unasked.

Source workspace and publication checkout can be separate. Here `dist/publication` is the Git checkout; its `/docs` is served by Pages. Do not edit generated assets instead of their source. New checkouts include a usable `docs` page, but ignored raw inputs and routing build environments must be supplied separately.

## Preserve behavior

- Start without points. Map/GPS/shortcut/time edits only change the draft. Compare stations requests a comparison; Refresh bikes updates inventory without rerouting.
- Compare five nearby departures to the same destination station. Known count snapshots remain stable until an explicit update; unknown counts are not zero. Historical Low never promises refill soon.
- Pickup means collection at the station in Seoul time, now through seven days ahead. Walking does not shift pickup or impose a budget.
- Keep the compact Route Ribbon / Slate & Teal appearance. No slogans, hero panels, automatic queries, list expansion, rental summaries or large methodology blocks without a new request.
- Keep plain JavaScript, Leaflet and on-device Valhalla. Python/SQLite are offline build tools only. The fixed HTTPS live endpoint needs no credential; do not reintroduce secrets into browser assets.

## Development and checks

Preview over HTTP with `python3 scripts/preview_static.py --directory dist/site --port 63463`, or `--directory docs` in a published checkout. Follow STATIC_SETUP for builds. Python 3.11+ is sufficient for standard-library tools.

Run `python3 -B -m unittest discover -s tests -v` and `node --test tests/test_frontend.cjs tests/test_static.mjs`. For routing/SDK changes also check native/browser route fixtures using matching Valhalla 3.8.3. Inspect desktop/phone UI for layout changes, focus and internal scrolling. Documentation-only changes need link/fact checks, not new tests.

Preserve public provenance, licenses and measurement limits. Do not rebuild/download large maps or archives for unrelated edits. Credentials stay ignored and outside generated files/logs. Use the allowlisted publisher and credential scan before publication. Exact-origin Oksu pier #5651 can still produce implausibly long walks; passing checks do not fix that case.

Update the owning document after behavior changes. Date evidence; distinguish choices, defaults, observations and proposals. Never relabel an old benchmark or desktop emulation as current physical-phone evidence.
