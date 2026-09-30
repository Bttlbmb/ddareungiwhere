# Design: 따릉이 Where?

Current, reconciled 2026-09-30. This records the user's approved design and preferences. Behavior lives in [SPEC.md](SPEC.md).

## Identity

The selected name is **따릉이 Where?**: retain the public-bike program's Korean name with a lightly playful English question. The user wanted simple, elegant, cool, possibly funny, without a corny slogan.

The approved **Looking Wheels** logo has two eye/wheel rings with pupil/hub dots, a bicycle saddle above the left wheel, and a handlebar above the right. Use [looking-wheels.svg](web/assets/looking-wheels.svg) in the header/favicon, with readable text for the wordmark. Do not restore the earlier arrow-only eye concept or substitute a generic bicycle.

## Approved appearance

The selected layout is **Route Ribbon**, with the **Slate & Teal** refinement: the third option in both relevant proposal sets. Implemented 2026-09-30. Earlier lime green felt too aggressive. Use calm teal sparingly; stronger useful color accents come from bike-count boxes. Keep the page light, elegant, and slightly playful through the logo, A/B markers, ranks, and counts.

| Role | Current colors | Use |
| --- | --- | --- |
| Canvas | `#f4f5f5` | Cool off-white, unframed form/results |
| Slate | `#293338` | Text, primary button, A/B markers |
| Muted teal | `#577778` | Logo saddle/handlebar, focus, map guide, small accents |
| Light teal-gray | `#b6c7c7` | Primary-button arrow, subdued map accents |
| Dividers / header | `#dce0e1` / `#e9edee` | Quiet rules / table header fill |
| Secondary text | `#626e72` | Supporting labels and attribution |
| Bikes 3+ | `#c4e3d4` / `#24553f` | Mint box / dark number |
| Bikes 1–2 | `#f5d689` / `#704c10` | Amber box / dark number |
| Bikes 0 | `#efbbb5` / `#8b302a` | Coral box / dark number |

Risk badges use quieter tints than inventory boxes. Unknown stays neutral. Color accompanies numbers/explicit text; it is not the sole meaning. Colors are centralized in `web/style.css`; keep logo/map colors consistent with them. The optimization pass removed obsolete styles and merged repeated selectors within responsive contexts, checking the agreed appearance against the original.

## Left planner and results

- Compact brand header, no hero/slogan.
- Starting point and Destination labels outside their controls, matching Bike pickup time.
- A/B markers connected by a thin neutral vertical line. Point controls have a bottom rule, not a large colored box; active choice gets a subtle underline.
- **⌖ Current location** sits beside Starting point, right-aligned, and only applies to origin.
- Street names instead of “Near #4847.” Long labels get at most two lines with ellipsis and full text retained.
- Pickup input, then Now / In 30min / In 1h; space above the charcoal Compare stations button and light arrow accent.
- Five Popular routes below; deduplicated popularity, no repeated station endpoints, minimum 2 km straight-line separation to avoid apartment-block trips.
- Map/results share a panel. A manual comparison opens results; Back to map restores the same journey. The dashed A–B guide is not routed geometry.
- Desktop table has horizontal rules, no large outer results box or green selected-row fill. Rank boxes stay neutral, including the first/selected station. Station numbers read “Station #…”, with headings “Est. walk time” and “Est. ride time”. Bike counts are the strongest accents; walk/ride times stay plain.
- No gray divider above the station table. One right-aligned footer credits Valhalla / OpenStreetMap and shows live-refresh completion time.
- Outer page fits the viewport; long form/results scroll internally. Phone results replace the form and reflow each station's metrics into two columns without sideways scrolling. Back to map stays outside the scrolling body.

## Copy choices to preserve

The user repeatedly simplified the page. Do not reintroduce without a new request/reason:

- Slogans, LOCAL EDITION/live connection text, RIDE HISTORY stamp, hero title, or “01 / PLAN.”
- Routine location permission/success/accuracy prose. Keep actionable failures and the actual browser permission prompt.
- Pickup helper line such as “Now · Seoul time (KST). Plan up to 7 days ahead.” Validation remains.
- History/Past zero counts, rental mean/median/record columns, or a rental-time summary card.
- Row fetch times, “live inventory,” “historical signal,” “Counts describe now,” or “Rarely zero in archive” captions.
- Historical date/hour/experimental paragraph, expandable “How to read these numbers,” recommendation sentence, or return dropdown above the table. Definitions/limitations remain in docs.
- Show 10 nearby stations / expansion actions, or automatic comparison on point selection.

## Reference

Implemented view: [mvp-slate-teal-results.png](data/processed/mvp-slate-teal-results.png). Counts are real at capture time, not current promises. Screenshots are ignored local artifacts and may be absent in another checkout; the CSS/SVG and this document are the durable design definition. Other names/layouts/lime palettes were explored but not selected.
