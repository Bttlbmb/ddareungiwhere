# Design: 따릉이 Where?

Approved appearance, reviewed 2026-10-03. [SPEC.md](SPEC.md) owns behavior; [REVIEW.md](REVIEW.md) records dated checks.

## Identity and palette

**따릉이 Where?** keeps the bike program's Korean name with a lightly playful English question. The selected appearance is **Route Ribbon / Slate & Teal** (2026-09-30): a compact planner beside a map/results panel, quiet rules and restrained teal. Bike counts provide the strongest color accents.

Use the approved **City basket** [logo](web/assets/city-basket.svg), selected 2026-10-02, in the header and favicon. It has a visible low bicycle frame, slate wheel outlines without hub dots, and a mint saddle/front basket. Keep its selected silhouette and a readable text wordmark. The visible logo edge aligns with the planner heading, accounting for the SVG's internal inset.

| Role | Colors | Use |
| --- | --- | --- |
| Canvas | `#f4f5f5` | Cool off-white form/results background |
| Slate | `#293338` | Text, primary action, A/B map markers |
| Muted teal | `#577778` | Focus, map guide, small accents |
| Light teal-gray | `#b6c7c7` | Primary-action arrow, subdued map accents |
| Dividers / table header | `#dce0e1` / `#e9edee` | Rules / header fill |
| Secondary text | `#626e72` | Supporting labels and credit |
| Bikes 3+ | `#c4e3d4` / `#24553f` | Mint fill / dark green text |
| Bikes 1–2 | `#f5d689` / `#704c10` | Amber fill / dark text |
| Bikes 0 | `#efbbb5` / `#8b302a` | Coral fill / dark text |

Mint also colors the form badges, logo accents and selected language segment. Risk badges use quieter tints; unknown stays neutral. Numbers and explicit text carry the meaning alongside color. Palette values live in `web/style.css`; logo and map colors should match.

## Header and planner

The header description is **Plan your trip with Seoul’s public bikes.**, with the selected **Right aligned** placement (2026-10-01). On desktop it sits at the header's right; on phones it sits below the wordmark, aligned with its text and allowed to wrap.

The planner heading is **From, to, and when?** Starting point, Destination and Bike pickup time labels sit outside their controls. Mint A/B badges with dark green letters connect through a thin neutral line. Point controls have a bottom rule and a subtle active underline. Long street labels occupy at most two lines, with full text retained.

**Current location** sits beside Starting point, right-aligned. Its crosshair is a centered SVG. The pickup field is followed by **Now / In 30min / In 1h**, then space before the charcoal **Compare stations** button and its light arrow. The planner ends at that action.

## Map

Station dots use mint fill, dark green outlines, full opacity, 5.5 px radius and a 1.5 px outline (selected 2026-10-01). Unselected numbered candidates use mint; the selected candidate stays slate. The destination station uses the same colors at a larger radius. Keep legend labels visible and let them wrap at any width.

Map and results share a panel. The dashed A–B guide follows the points. Keyboard focus adds a center crosshair and changes the toolbar instruction to arrow-key/Enter guidance; pointer use retains the click instruction. Popups contain **#number · station name** and the two point-selection actions, without counts or inventory messages.

## Results

**Choose your departure.** matches the planner heading's size, weight and desktop vertical position. **Back to map** sits at the top-right, outside the scrolling body. Results use horizontal rules on the page background, without an outer box or colored selected row. Rank boxes remain neutral.

Desktop columns read **Station**, **Bikes**, **Walk time**, **Ride time**, and the applicable availability heading. Station numbers read **Station #…**; no Nearest or Bikes now row indicator is shown. Counts are prominent colored boxes. Durations remain plain and use the format in [SPEC.md](SPEC.md).

Unavailable counts use **Quiet slash** (selected 2026-10-01): `/` in a neutral gray box with the same padding, radius and minimum width as known counts. After a failed request, one 12 px red notice appears below the rows and before Your destination. Its first word **Live** aligns with station text: 20 px inset on desktop, 10 px on phones. It wraps within the results scroller. The two failure messages are specified in SPEC; no extra panel, icon or retry button is added.

**Your destination.** follows the rows on the same background. A down/right arrow sits in a neutral 25 px marker with subtle lines. Station name/number and duration reuse departure typography. The walking group begins at the desktop walking column and at the station-text inset on phones. It contains **Walk time**, duration, a right arrow and the destination label, without a B circle. The explicit walking label was approved 2026-10-03.

The destination uses **Mint tag** (selected 2026-10-01): 14 px bold dark green text, mint fill, 5 px corner radius and 5 px / 10 px padding. It is a label, with no button behavior.

One right-aligned footer below this section shows refresh completion time, Valhalla / OpenStreetMap credit and **↻ Refresh bikes**, separated by dots. The refresh action uses the footer text size. Keep its preceding dot and label together when wrapping. The footer scrolls with results. The page's bottom provenance footer is also right-aligned and credits Seoul Bike and OpenStreetMap.

## Responsive layout

The revision approved 2026-10-03 uses page-width breakpoints:

| Width | Planning | Results |
| --- | --- | --- |
| Above 1100 px | Planner beside map | Planner beside results |
| 701–1100 px | Compact planner/map workspace | Full-width table with shared headings; planner hidden |
| 700 px and below | Natural page scrolling and a separate fixed Compare dock, with safe-area space reserved | Planner hidden; viewport-contained results with fixed heading and internal scrolling |

Phone rows place rank/name/number/distance on the left and the count box on the right. Walk/Ride sit below the name; availability aligns with the count's right edge. Both use 12 px type. Availability retains its status color without a filled badge; future rows include **Historical risk**. Long names and the footer wrap without horizontal scrolling. Phone results use the planner heading's size and padding. **Back to map** restores the same draft.

## Language and metadata

The approved **Mint capsule** (2026-10-02) places **ENG / 한국어** at the header's right and shares the wordmark row on phones. A neutral rounded track contains a sliding mint segment with dark green selected text; the inactive label is muted. The whole capsule is one link and focus target. Clicking either label or the track toggles language. Keep visible keyboard focus and respect reduced-motion preferences. Both languages use the same compact layout.

| Text | English | Korean |
| --- | --- | --- |
| Browser/search title | Seoul Public Bike Trip Planner — 따릉이 Where? | 서울 따릉이 대여소·이동 시간 비교 — 따릉이 Where? |
| Header description | Plan your trip with Seoul’s public bikes. | 따릉이로 이동할 계획을 세워 보세요. |
| Core labels | Station / Starting point / Destination / Bike pickup time / Compare stations | 대여소 / 출발지 / 목적지 / 자전거 대여 시각 (한국 시간) / 대여소 비교 |
| Immediate / future heading | Availability now / Historical no-bike risk | 최근 조회 현황 / 과거 자전거 없음 빈도 |

English metadata description: **Plan a Seoul public-bike trip with Ddareungi (따릉이). Compare five nearby stations, current bike counts, and estimated walking and cycling times.** Search metadata was approved 2026-10-02 and does not replace the header wording. Korean durations use 분 / 시간. Inventory and historical copy keep the separate meanings in SPEC.

## Keep the page compact

The user repeatedly removed extra copy and panels. Preserve the selected header description, actionable errors and browser permission prompt. Keep these additions out unless newly requested:

- Extra slogans, hero panels, edition/connection labels or decorative section stamps.
- Routine location success/accuracy text, pickup helper lines or automatic comparisons.
- Rental summaries, archive counts, row timestamps, history explanations or an expandable methodology block.
- Recommendation sentences, destination dropdowns, popular-route shortcuts or list-expansion actions.

Definitions and limits belong in documentation. CSS, SVG and this document define the approved design. Local verification captures referenced in REVIEW are evidence, not published assets; browser emulation does not establish physical-phone behavior.
