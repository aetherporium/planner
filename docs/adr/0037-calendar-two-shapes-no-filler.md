# 0037 — The calendar has two shapes and no filler

Status: Accepted
Date: 2026-08-16
Amends: 0031 (calendar is not the core page)

## Context

The month grid padded the start of each month with empty cells:

    {Array.from({ length: lead }, (_, i) => <div className="cell blank" />)}

Those cells carried `.cell` — so they took its `aspect-ratio`, padding, border
and the 3px grid gap — and were then only partly neutralised by
`.cell.blank { pointer-events: none }`. They looked like dates. They sat in the
grid like dates. They were boxes where no day exists, and up to six of them
appeared before day one. Read as overlapping blank dates, which is what they
were.

The month also only had one shape, though `calview` prototyped three
(A grid / B day list / C both).

## Decision

**No filler cells.** The lead-in is placement, not padding: the first day gets
`grid-column-start: lead + 1` and the row begins where it should. Every element
inside `.cal-grid` is now a real day and a real link. `.cell.blank` is deleted
from both the markup and the stylesheet.

**Two shapes, prototype C.**

* *Grid* — the month as a shape. Where weekends fall, where holidays sit.
* *List* — a row per day, with a preview of what is planned beside the date,
  which the grid has no room to show.

The switch is a two-tab control in the month header, beside the steppers rather
than above them. The choice persists as `settings.calView`, so the calendar
opens in the shape you last used.

## Not yet

**No colour.** This rewrite is structural. Category colour on a day is a
separate decision and is deliberately absent — a test asserts `CalendarList`
references neither `colorOf` nor a background colour.

## Consequences

Seven columns still `repeat(7, minmax(0, 1fr))`; nothing squishes. A month with
no days before it looks the same as one with six. The day-list preview truncates
at four tasks plus a `+n`, so a dense day cannot stretch a row.

`prototype-calview.jsx` keeps its own copy of the old padded grid. Prototypes
are a record of what was considered and are never edited to match what shipped.
