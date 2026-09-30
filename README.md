# 따릉이 Where?

Static Seoul public-bike station comparison prototype. The browser compares five nearby departures, calculates walking/cycling estimates using Valhalla WebAssembly, and reads compact historical availability counts.

Site: https://bttlbmb.github.io/ddareungiwhere/

Enable **Settings → Pages → Deploy from a branch → main → /docs**. The generated site is in `docs/`; source is in `web/`, `worker/` and `scripts/`. Do not edit generated files to maintain application behavior: rebuild from source.

The connected Cloudflare proxy fetches the official bike website’s citywide station feed over HTTPS without a key. Shared caching and refresh limits protect the upstream; unavailable or expired counts become unknown. See [the account and deployment walkthrough](STATIC_SETUP.md).

History currently covers October–December 2025. The builder supports six calendar months when those source months are supplied. Historical bands are descriptive, not refill forecasts.

The publication includes an OSM-derived routing graph and street geometry, with contributor attribution and ODbL reference, and retained SDK/dependency licenses. It excludes credentials, raw station/count extracts, raw rental records and local SQLite. The existing Python app and build scripts require separately obtained local data/environment; this checkout does not automatically download them. Maintainer context and measurements are in [project notes](project-notes/README.md).

Verification: 37 Python checks and 32 Node checks passed in the source workspace; ten browser routes matched native Valhalla 3.8.3. See [dated validation](project-notes/REVIEW.md). The known Oksu pier walking detour and physical-phone performance remain open.
