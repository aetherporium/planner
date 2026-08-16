# ADR-0029 — Prototype mode is a switch, not a wall

**Status:** Accepted (amends ADR-0025)

## Context

Prototypes were listed in Go anywhere unconditionally. Unfinished design work
turning up in the middle of ordinary use is noise — but hiding it behind a URL
you have to remember is how prototypes get forgotten.

## Decision

A switch in Settings. Off by default.

- **Off:** prototypes do not appear in Go anywhere at all. Settings still lists
  them, so they are never unreachable.
- **On:** they appear as search results, and a thin amber line runs across the
  top of the app — you always know the mode is on.

Nothing is deleted when a new prototype arrives; the register accumulates and
entries are removed only when a question is answered.

## Consequences

- `search()` takes `prototypeMode` in its context.
- The banner is `position: fixed` and `pointer-events: none`, so it marks
  without interfering.
