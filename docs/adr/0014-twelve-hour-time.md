# ADR-0014 — Twelve-hour time, with a mark instead of am/pm

**Status:** Accepted

## Context

The app displayed 24-hour time (`19:30`). The day it describes starts at 12 in
the morning and is read in twelve-hour form.

## Decision

Every time on screen renders as 12-hour: `12:00`, `7:30`, `12:30`, `11:45`.
`fmtTime` in the domain layer still returns 24-hour and is still what the tests
assert on — this is a display concern only, kept in `src/app/format.js`.

Morning and afternoon are told apart by a **mark, not by letters**:

- hollow ring — before noon
- filled disc — noon onwards

It sits beside the time as punctuation, needs no legend after one day of use,
and survives translation. The timeline ruler reads 12, 1, 2 … 11, 12, 1 … with
the mark on each label; the analog clock prints 12 at the top; the add form
picks morning or afternoon with two marks rather than an am/pm toggle.

## Consequences

- `parts12`, `t12`, `h12` in `src/app/format.js`; `<Mark>` and `<Time>` in
  `src/app/Mark.jsx`.
- A test asserts the strings "am"/"pm" appear nowhere in the rendered UI.
