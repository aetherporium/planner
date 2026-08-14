# ADR-0018 — Navigation is one field that detects what you meant

**Status:** Accepted — prototype variants A and B merged; C dropped

## Context

Three navigation variants were prototyped. The user picked **B (Summon)** for
its reach and **A (Adjacency)** for its zero-cost neighbours, and asked that B
also show a calendar and accept any date format. C (Orbit) was dropped.

## Decision

**Go anywhere** — one field, no modes. The kind of thing you typed is detected,
never chosen:

| Typed | Understood as |
|---|---|
| `saturday`, `sat`, `ቅዳሜ` | the next Saturday |
| `tomorrow`, `tom` | a relative day |
| `17` | day 17 — offered in **both** calendars |
| `8/12`, `8-12`, `8.12`, `8 12` | day and month, both calendars |
| `2018-12-08` | a full date, Ethiopian or Gregorian |
| `lunch`, `ምሳ` | a task |
| `daily` | a pattern |
| `school` | a category |

Ambiguity is never resolved by guessing: a bare `17` returns Nehase 17 *and*
17 August, so neither calendar is treated as primary. A month calendar sits in
the panel, because sometimes pointing beats typing. Every result is an `<a>`,
so history keeps working. `/` or `Cmd/Ctrl-K` opens it; arrows and Enter drive
it.

**Adjacency** is kept as well: the previous and next day are rails above and
below the timeline, reachable without opening anything.

## Consequences

- `src/app/search.js` is pure and has its own 26 tests.
- `prototype-nav.jsx`, its CSS, and the `#/prototype` route are deleted — the
  question is answered, so the throwaway goes.
