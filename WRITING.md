# Writing guide

This guide covers Markdown documentation in this repository. Public product text, such as interface labels and help text, keeps its own wording. Apply the guide to text you write or edit; leave untouched passages as they are.

## Principles

- Write for a capable reader who is new to the project. Use plain words and full sentences, including articles.
- Give each sentence one idea. Prefer the active voice and a concrete subject: “The importer rejects conflicting quantities,” not “Conflicting quantities are rejected.”
- Cut words that add nothing. Link to the guide that owns a rule instead of restating it.
- Spell out relationships instead of using slashes: “departure and destination stations” or “a departure or destination station,” not “departure/destination station.” Paths, URLs, and fixed names keep their slashes, such as `/ko/`.
- Define a term in plain words where a guide first uses it. Explain a formula in words as well as symbols.
- Spell out an abbreviation at first use, with the short form in parentheses, unless it is common, such as URL, HTML, or CSV: “WebAssembly (WASM).”
- Say plainly what is unknown or unverified, and why. Rules do not hedge: they state what to do.
- Write in the third person. Attribute decisions to their source: “The user chose stable displayed snapshots.”

## Registers

- **Rules and specifications** (AGENTS.md, SPEC.md, DESIGN.md): short instructions in the present tense. “Show the last received count,” not “The last received count should be shown.”
- **Guides and README**: plain explanation. Lead with what the reader needs to know or do, then give the reason.

Use bulleted lists for steps and parallel items, and prose for reasoning. Use tables for comparisons. Reserve bold for the one fact a reader must not miss.

## Conventions

| Topic | Convention |
| --- | --- |
| Spelling | American: behavior, color, center, license |
| Lists in a sentence | Comma before the final “and” or “or”: “stations, bikes, and routes” |
| Dates | “October 3, 2026” in prose, or “October 3” when the year is clear; ISO dates such as 2026-10-03 in filenames, code, data, and sortable tables |
| Numbers | Numerals for counts, measurements, and data, with thousands separators: 5 stations, 2,735 locations, 134,832 cells, 5.27% |
| Ranges | En dash without spaces: 5–10, October–December 2025 |
| Sizes | MiB and GiB for file and memory sizes: a 96 MiB tile budget |
| Dashes | Spaced em dash — sparingly — for an aside |
| Quotation marks | Curly quotes in prose; backticks for paths, commands, identifiers, and URL parameters, such as `stationGrpSeq=ALL` |
| Headings | Sentence case: “Loading, state and cancellation” |
| Interface names | The product's on-screen capitalization: **Compare stations**, **Refresh bikes** |
