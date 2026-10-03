# Decisions

Current rationale, reviewed 2026-10-03. Product rules are in [SPEC.md](SPEC.md), source limits in [DATA_SOURCES.md](DATA_SOURCES.md), and dated evidence in [REVIEW.md](REVIEW.md).

## Runtime and data

**Run the planner in the browser.** GitHub Pages serves plain JavaScript, Leaflet and on-device Valhalla. Python and SQLite prepare data offline. This keeps deployment small and removes the need for an application server. The earlier Python application and Cloudflare proxy have been removed.

**Use the official HTTPS inventory feed directly.** It accepted cross-origin requests without credentials in the dated checks. This avoids a proxy and browser secrets. The feed has no published versioned contract and may be restricted on some networks; failures must preserve received snapshots or show unknown counts. Each tab limits attempts independently.

**Publish counts that preserve the evidence.** For each station, hour and weekday/weekend group, recorded-value and zero counts reproduce the historical bands exactly. Compressing these small summaries avoids downloading the archive without approximating it. Six-month coverage still requires six months of source data.

**Retain roads needed for walking and cycling.** The graph excludes driving-only access while keeping routing hierarchy and shortcuts. OSM's “highway” category also includes paths and cycleways, so removing that entire category would break routes. Only required compressed routing assets are published. First-use downloads and memory remain material costs.

**Estimate routes from roads, rather than rental duration.** Rentals can include stops and detours. Valhalla estimates walking and cycling using the saved road graph. Rental summaries, Kakao routing and walking-budget filters were superseded; popular-route shortcuts were removed at the user's request on 2026-10-01.

## Interaction and appearance

**Keep actions deliberate and meanings separate.** Edits prepare a draft; comparison applies it; bike refresh preserves routes/history. Pickup means collection at the station. Immediate status describes the received count, while later historical bands describe the archive. Neither guarantees a bike at pickup.

**Keep displayed snapshots stable.** Approved 2026-10-01, counts and immediate status remain until manual comparison/refresh updates them. This replaces the earlier two-minute display expiry. Receipt time and the distinction between unknown and zero remain; automatic station suggestions still require recent reports.

**Keep the selected compact design.** Route Ribbon / Slate & Teal uses five candidates and one destination station. The City basket logo, selected 2026-10-02, replaces Looking Wheels. The responsive revision approved 2026-10-03 keeps Compare visible in a phone dock and uses full-width tablet results, replacing tall tablet cards. Phone availability aligns with counts, and the final duration explicitly says Walk time. Station startup is independent of history so a history failure cannot hide the catalogue.

**Share the English and Korean planner.** Approved 2026-10-02, `/` and `/ko/` share assets. A small embedded language catalogue and bilingual street shards avoid translation requests. The whole mint capsule toggles copy and URL while preserving the journey. There are no automatic redirects or stored language preferences.

**Make both entries discoverable.** Approved 2026-10-02, descriptive titles, language metadata, a public verification tag and a two-entry sitemap support search discovery without analytics. Published metadata does not establish ownership verification, indexing, rankings or traffic.

Known issues and unapproved proposals remain in [plan.md](plan.md). Desktop browser checks do not establish physical-phone performance.
