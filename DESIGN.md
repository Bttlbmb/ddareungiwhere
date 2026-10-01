# Design: 따릉이 Where?

Approved appearance retained in the static-only page, 2026-10-01. This records the user's approved design and preferences. Behavior lives in [SPEC.md](SPEC.md).

## Identity

The selected name is **따릉이 Where?**: retain the public-bike program's Korean name with a lightly playful English question. The user wanted simple, elegant, cool, possibly funny, without a corny slogan.

The approved **Looking Wheels** logo has two eye/wheel rings with pupil/hub dots, a bicycle saddle above the left wheel, and a handlebar above the right. Use [looking-wheels.svg](web/assets/looking-wheels.svg) in the header/favicon, with readable text for the wordmark. Do not restore the earlier arrow-only eye concept or substitute a generic bicycle.

## Approved appearance

The selected layout is **Route Ribbon**, with the **Slate & Teal** refinement: the third option in both relevant proposal sets. Implemented 2026-09-30. Earlier lime green felt too aggressive. Use calm teal sparingly; stronger useful color accents come from bike-count boxes. Keep the page light, elegant, and slightly playful through the logo, A/B markers, ranks, and counts.

| Role | Current colors | Use |
| --- | --- | --- |
| Canvas | `#f4f5f5` | Cool off-white, unframed form/results |
| Slate | `#293338` | Text, primary button, A/B markers |
| Muted teal | `#577778` | Focus, map guide, small accents |
| Light teal-gray | `#b6c7c7` | Primary-button arrow, subdued map accents |
| Dividers / header | `#dce0e1` / `#e9edee` | Quiet rules / table header fill |
| Secondary text | `#626e72` | Supporting labels and attribution |
| Bikes 3+ | `#c4e3d4` / `#24553f` | Mint box / dark number; mint A/B form badges and logo saddle/handlebar |
| Bikes 1–2 | `#f5d689` / `#704c10` | Amber box / dark number |
| Bikes 0 | `#efbbb5` / `#8b302a` | Coral box / dark number |

Risk badges use quieter tints than inventory boxes. Unknown stays neutral. Color accompanies numbers/explicit text; it is not the sole meaning. Colors are centralized in `web/style.css`; keep logo/map colors consistent with them. The optimization pass removed obsolete styles and merged repeated selectors within responsive contexts, checking the agreed appearance against the original.

## Left planner and results

- Compact brand header, with the user-selected description **Plan your trip with Seoul’s public bikes.** and **Right aligned** placement (2026-10-01). Small secondary text sits at the right of the desktop header; on phones it sits below the wordmark, aligned to its text and wrapping naturally. No hero panel. The logo's visible left edge aligns with the planner heading (**From**) on desktop and phones, accounting for the SVG's small internal inset.
- Header description checked 2026-10-01 in desktop browser emulation at 1440 × 900, 1024 × 768, 390 × 844 and 320 × 568: copy fits, no horizontal page overflow, and results focus/internal scrolling remain usable. This is browser emulation, not physical-phone evidence. All 6 Python and 38 JavaScript checks passed.
- Planner heading: **From, to, and when?**, selected 2026-10-01.
- Starting point and Destination labels outside their controls, matching Bike pickup time.
- Mint A/B form badges with dark green letters, connected by a thin neutral vertical line. Logo saddle/handlebar use the same mint as the available-bike box fill; wheels and wordmark stay slate. This minimal color treatment was selected 2026-10-01, then the logo was lightened from dark green to mint at the user's request. Point controls have a bottom rule, not a large colored box; active choice gets a subtle underline.
- **⌖ Current location** sits beside Starting point, right-aligned, and only applies to origin.
- The location crosshair is an SVG centered beside its text rather than a font glyph.
- Street names instead of “Near #4847.” Long labels get at most two lines with ellipsis and full text retained.
- Pickup input, then Now / In 30min / In 1h; space above the charcoal Compare stations button and light arrow accent.
- Five Popular routes below; deduplicated popularity, no repeated station endpoints, minimum 2 km straight-line separation to avoid apartment-block trips.
- Bike stations on the map use the existing mint fill with a dark green outline: 5.5 px radius, 1.5 px outline, full opacity. Unselected numbered candidate markers use mint too; the selected candidate stays slate. Destination station uses the same colors at a larger radius. Legend matches these colors. Selected 2026-10-01.
- Map/results share a panel. A manual comparison opens results; Back to map restores the same journey. The dashed A–B guide is not routed geometry.
- Map station popups show **#number · station name**, followed by Use as departure / Use as destination. Omit all inventory counts and unavailable-count messages, whether quantities have been fetched or not. Selected 2026-10-01.
- Desktop table has horizontal rules, no large outer results box or green selected-row fill. Rank boxes stay neutral, including the first/selected station. Station numbers read “Station #…”, with headings “Station”, “Bikes”, “Walk time” and “Ride time”. No Nearest/Bikes now row indicators. Bike counts are the strongest accents; walk/ride times stay plain. Rounded durations above 60 minutes use hours/minutes (e.g. **1h 12min**, or **2h** for exact hours); shorter durations retain **12 min**.
- **Your destination.** follows the table on the same background, with no enclosing box. The down/right arrow sits in a neutral 25 px marker with subtle lines. Destination station names/numbers reuse the departure styles and left edge; the final duration reuses the departure duration style and aligns with Walk time on desktop (the second metric column on phones). A right arrow and destination name follow it; no extra labels or B circle. The destination uses the selected **Mint tag** treatment: 14 px bold dark green text, existing mint fill, 5 px corner radius and 5 px / 10 px padding. The tag is a destination label, with no button behavior. Selected 2026-10-01.
- No gray divider above the station table. One right-aligned footer below the destination section shows live-refresh completion time, credits Valhalla / OpenStreetMap, then **↻ Refresh bikes**, separated with dots. The refresh link inherits the footer text size. On phones the footer wraps naturally, keeping the last dot and refresh link together; it scrolls with the results body.
- **Choose your departure.** starts the results header, matching the planner heading's size, weight and vertical position on desktop. **Back to map** is at the top-right outside the scrolling results body. On phones the results heading uses the same padding and size as the planner heading.
- The bottom provenance footer is right-aligned, retaining Seoul Bike and OpenStreetMap credit and omitting the map-issue link.
- Outer page fits the viewport; long form/results scroll internally. Phone results replace the form and reflow each station's metrics into two columns without sideways scrolling. Back to map stays outside the scrolling body.

## Copy choices to preserve

The user repeatedly simplified the page. Do not reintroduce without a new request/reason:

- Additional slogans beyond the selected header description, LOCAL EDITION/live connection text, RIDE HISTORY stamp, hero title, or “01 / PLAN.”
- Routine location permission/success/accuracy prose. Keep actionable failures and the actual browser permission prompt.
- Pickup helper line such as “Now · Seoul time (KST). Plan up to 7 days ahead.” Validation remains.
- History/Past zero counts, rental mean/median/record columns, or a rental-time summary card.
- Row fetch times, “live inventory,” “historical signal,” “Counts describe now,” or “Rarely zero in archive” captions.
- Historical date/hour/experimental paragraph, expandable “How to read these numbers,” recommendation sentence, or destination dropdown above the table. Definitions/limitations remain in docs.
- Show 10 nearby stations / expansion actions, or automatic comparison on point selection.

## Durable reference

The CSS/SVG and this document define the approved design. Historical local screenshots have been removed from this static-only project; no runtime screenshot dependency exists.
