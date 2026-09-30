# Decisions and rationale

Reconciled 2026-09-30 from the conversation and implementation. This is a decision record, not a sequence of competing specifications. [SPEC.md](SPEC.md) describes current behavior; [DESIGN.md](DESIGN.md) owns visual choices. All changes below occurred during the initial 2026-09-30 project session. Open choices are in [plan.md](plan.md).

## Current product choices

| Decision | Why / status |
| --- | --- |
| Browser app, localhost first | User requested a small personal project. No public deployment or account system is approved. |
| Pickup now through seven days ahead, in Seoul time | User confirmed the horizon and that departure means collecting the bike at the station. Walking does not shift that time. |
| Compare several nearby stations | Almost equally close stations can offer different inventory and route times. Showing only the closest hides useful options. |
| Five nearest departures by straight-line distance, one common return | Keeps comparisons understandable and bounded. The nearest return is default; a map popup can override it. No walking budget applies. |
| Empty initial origin/destination | User requested a neutral starting state; GPS or popular routes are optional ways to fill it. |
| Manual Compare only | User explicitly rejected automatic collection/comparison on pin, station or time changes. Refresh bikes is a separate manual action. |
| Map/results share one viewport panel, with Back to map | User wanted a single-page, no outer-scroll experience. Long content scrolls inside the relevant pane. |
| Current location beside Starting point, with a small target symbol | Origin-only action; concise placement and copy. One-time browser permission, no continuous tracking. |
| Approximate street labels, no house numbers, two-line truncation | More useful than “Near #4847”; long road names must not dominate the form. Full text is retained for inspection. |
| Weekdays/weekends by hour for historical risk | User suggested “weekdays 8am” rather than “Monday 8am”. Q4 fully covered stations offer 66 weekday-08 observations versus 13 Mondays; this gains sample size but does not validate predictive accuracy. |
| Separate present availability from future historical risk | “0 bikes + Low” was confusing for pickup now. Immediate pickups use current Empty/Few/Available/Unknown; future pickups retain descriptive history separately from current counts. No 30-minute refill forecast is supported. |
| Five popular routes, at least 2 km apart, without repeated endpoint stations | User found the original most-frequent pairs too short. Filtered directional popularity gives more useful examples and variety. It is not a safety/scenery ranking. |
| Minimal user copy, clear bike-count colors | User repeatedly removed slogans, extra explanation, archive captions and redundant controls. Technical limitations remain in docs, while availability labels and actionable errors stay in the app. |

The default English interface and Korean official station names are implemented; a bilingual/language policy is not finalized. “Personal use” is the present scope, not evidence of a broader audience study.

## Duration: how the choice evolved

The original brief requested average and recent record rental times. June pair histories were sometimes sparse, so the user asked to compare nearby stations and expand to three complete available months. April–June 2026 are the latest downloaded months; “three months” does not mean the last 90 days.

The user first requested an unweighted average of station medians. One short Seodaemun–Eulji-ro comparison then showed 74.4 minutes: four contributing medians were 87, 101, 14 and 95.5, based on 1, 4, 28 and 16 rentals. The same 49 matching rentals have a pooled median of 16 minutes. Reported minutes agreed with elapsed timestamps; long rentals were not a units bug. Stops and detours cannot be separated from riding in these records.

The user approved the pooled median, then chose route estimates and removed the historical duration summary entirely. **Current display: a routed bike estimate for each station, not a rental mean, median, fastest record or cluster average.** History rows remain available for offline analysis. The now-unused runtime pair, pooled-median and record-summary code was removed in the optimization pass. The original record feature is superseded in the interface.

## Routing: Kakao to local Valhalla

Kakao was tried at low scale with a server-side key, whole-minute per-station estimates, and a persistent directed-pair cache. The user raised a local attempt limit to 800/day and briefly averaged five estimates before requesting per-row values. This is historical implementation context: that cap is not a current app quota, an account-wide allowance, or permission for paid use.

A reversible Valhalla experiment compared saved Kakao estimates without fresh Kakao requests. The initial small extract covered 12 cached pairs; a larger extract covered the other 24 at a 15 km/h city-bike setting. All 24 routed successfully; the median absolute difference was about 1.9 minutes and mean absolute difference about 2.7 minutes. This comparison supported the user's decision to switch, not a claim of measured on-road accuracy. See [retained trial evidence](docs/evidence/README.md).

**Current choice:** local Valhalla/OSM for cycling and walking, no Kakao route requests or key use. The full-Seoul graph replaced the trial extracts so long cross-city routes work. Local routing removes per-lookup routing quotas and internet dependence, while introducing map maintenance, memory/storage needs and OSM access/connectivity limitations. Kakao comparison files are reference material, not an active cache or fallback.

Walking was initially limited to a ten-minute preference, then explicitly removed (“Bike stuff only”), and later restored at the user's request as a per-station Valhalla estimate. **The estimate is current; the ten-minute filter, walking directions and door-to-door timing are not.** The ranking still uses straight-line proximity.

## Design and engineering choices

The approved name is **따릉이 Where?**. The user selected the simple eye/wheel logo and requested a more bicycle-like upper part. The implemented **Looking Wheels** SVG combines that motif with a saddle/handlebar suggestion.

The selected layout is **Route Ribbon**. The later selected palette is **Slate & Teal**: light surfaces, charcoal structure, restrained calm teal, and stronger green/yellow/red bike-count boxes. This replaces earlier brighter green/lime proposals. The exact palette, left-side navigation, mobile arrangement and removed copy are recorded in [DESIGN.md](DESIGN.md).

The small Python/SQLite/plain-JavaScript/Leaflet stack and in-process Valhalla are implemented engineering choices; the user did not require a particular framework. Keep raw histories and keys out of the browser. Verified gzip compression saved 1.57 GB without discarding rows. Bounded caches reduce repeated local work. No speculative framework migration, database rewrite or automatic collection is approved. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Optimization follow-up

The user requested a whole-project efficiency/size review. Removed runtime work and UI remnants for superseded features, kept detailed history/provenance for offline research, and used bounded archive/routing caches and a packed street index. Preserved the approved appearance against sampled desktop/phone styles. No framework or minification build chain was added. Measurements and limits are in [REVIEW.md](REVIEW.md); larger storage/schema changes remain proposed work.

## Superseded choices at a glance

| Earlier idea | Current replacement |
| --- | --- |
| Fixed Seoul Station → City Hall starting journey | Unselected start; familiar journeys retained as research cases |
| Only the closest departure | Five nearby departures |
| Walking disabled / ten-minute access budget | Walk estimates included; no access-time filter |
| Individual mean/median/record columns and aggregate history card | Per-station local routed ride time |
| Kakao five-route average, stored route cache and daily request cap | Local Valhalla per-row estimates, bounded in-memory cache |
| Examples / raw top-frequency very short routes | Five ≥2 km popular routes with no endpoint overlap |
| Show 10 nearby stations | No expansion in the UI |
| Low historical risk alongside zero for pickup now | Immediate current availability; separate future historical signal |
| Green-heavy card proposals and slogans | Route Ribbon, Slate & Teal, compact functional copy |

Earlier drafts and repair chronology are preserved in [the dated archive](docs/archive/2026-09-30-pre-reconciliation/README.md). Research audits preserve their original findings; their recommendations are not current requirements. Future changes should update the owning document and add their rationale here rather than prepend another conflicting specification.

## 2026-10-01: try a static/browser deployment

**User choice:** pursue GitHub Pages with browser Valhalla and a Cloudflare proxy; never publish the Seoul credential. The user supplied the public `Bttlbmb/ddareungiwhere` repository.

**Implementation defaults:** preserve the shared interface and local deployment; publish only an allowlisted static export. Keep exact station/hour/day-group observation and zero counts rather than only risk bands, allowing coverage validation and threshold changes without the full archive. Six months adds observations rather than browser cells. Keep a separate SDK-compatible 3.8.3 graph/runtime and explicit source hashes/licenses. Exclude driving-only graph edges, retaining hierarchy; the measured savings were small and blanket removal of `highway` tags would remove usable streets/paths. Share public live refreshes globally with a daily request budget. Require secure upstream transport, without HTTP fallback.

**Observed limits:** browser routing works in desktop checks, but tile downloads remain substantial. The tested Seoul API port rejects TLS, so live data is not connected. The same Oksu exact-origin defect remains. Static export does not acquire missing history months. These are open deployment/data issues, not resolved by changing the hosting model.

**Cloudflare authorization:** the user chose manual Cloudflare setup. The agent prepares code/configuration and explains login/deployment/secret entry; it does not authorize or deploy into the account automatically.

**Secure live source:** after the user authorized continuing integration, inspection on 2026-10-01 found the official website’s HTTPS citywide station feed, requiring no key. Use that fixed endpoint through the shared proxy and sum categories as the official map does. This avoids transmitting the Seoul credential. The website endpoint may change without an API version guarantee; retain unknown/expiry handling and the optional secure Open API adapter. GitHub-connected builds deploy authorized updates without an agent Cloudflare login.
