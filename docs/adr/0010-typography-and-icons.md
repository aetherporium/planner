# ADR-0010 — Type scale, system fonts, SVG icons, English-first

**Status:** Accepted (supersedes the Amharic-first UI)

## Context

The prototype used emoji as icons, ad-hoc font sizes, and Amharic for all UI
text. Emoji render differently per platform and cannot inherit colour or
stroke weight; ad-hoc sizes produce no visual rhythm.

## Decision

**Type scale.** A 1.200 minor-third scale on a 16px base, as CSS custom
properties: 11.5 / 13.3 / 16 / 19.2 / 23 / 27.6. Three line-heights
(1.25 / 1.4 / 1.6) and three letter-spacings. No size is written inline.

**Fonts.** `ui-sans-serif, system-ui` first — the platform UI face, so text
looks native and loads instantly with no network (the preview sandbox blocks
external fonts). Amharic gets `.am`, scoped to `Noto Sans Ethiopic, Nyala,
Abyssinica SIL, serif`.

**Icons.** One inline SVG sprite, 16 symbols, `viewBox="0 0 20 20"`,
`stroke="currentColor"`. They inherit text colour and sit on the same optical
grid. No emoji anywhere.

**Language.** English is the interface language. Amharic is reserved for the
calendar — month names, weekday headers, and Ethiopian dates — plus the
Amharic name of each default task on its detail page.

## Consequences

- Icons recolour with their context for free (accent in cards, gold in travel
  gaps, rose in overlap warnings).
- `font-variant-numeric: tabular-nums` globally, so times align in columns.
