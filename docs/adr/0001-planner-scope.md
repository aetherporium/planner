# ADR-0001 — Frequency and Duration are mandatory on every Task

**Status:** Accepted

## Context
The brief specified that a Task must carry a frequency and a duration.

## Decision
Both are **required fields on Task**, not optional metadata. `makeTask` throws on an
unknown Frequency or a negative Duration rather than silently defaulting.

Together they derive **Load** (CONTEXT.md) — weekly committed minutes. Every View
surfaces Load, because a plan that reads fine as a list is often impossible once
totalled.

## Consequences
- A 15-minute daily Task (105m/wk) outweighs a 90-minute monthly one (~21m/wk).
  That comparison is the reason both fields are mandatory.
- `once` contributes 0 weekly Load — it is a commitment of time, not of *recurring*
  time. If one-off work needs to show against a week's capacity, that is a new
  decision and needs its own ADR.
