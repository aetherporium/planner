# ADR-0022 — Date and frequency are requirements

**Status:** Accepted

## Context

"Minimal task adding" had been read as "almost everything is optional". But a
task with no date is not scheduled, and a task with no frequency does not say
whether it is a one-off or a habit — which means the blueprint cannot be
derived from it at all. Those two are not detail; they are what makes a task a
plan.

## Decision

Required to create a task: **name, date, start time, frequency.** Frequency
starts unset — there is no default that could be silently accepted. The submit
button states what is still missing rather than failing silently.

A **description** field is standard, not hidden. Only place and category stay
behind a disclosure, because a task is complete without them.

Minimal still holds where it should: duration defaults to 30, `0` means a
moment, and the date defaults to the day you came from.

## Consequences

- `ruleFromFrequency` is always given a real answer, so every task lands in a
  pattern (including "once", which lands in none by design).
- The three form shapes were prototyped before settling — see ADR-0023.
