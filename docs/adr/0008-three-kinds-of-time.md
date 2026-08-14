# ADR-0008 — Planned, actual, and log time are three separate facts

**Status:** Accepted

## Context

The brief: "there are 3 types of time, planned, actual, and log — log time means
the time user put the info in the app."

## Decision

Every entry may carry all three:

| Field | Meaning | Amharic label |
|---|---|---|
| `plannedMin` | when the blueprint said it should happen | የታቀደ |
| `actualMin` | when it really happened | የተከናወነበት |
| `loggedAtMin` + `loggedAtJdn` | when the user told the app | የተመዘገበበት |

Eating dinner at 19:00 that was planned for 19:30 and logged at 23:00 is three
distinct facts. Collapsing any two loses information the user cannot recover.

The day rail shows planned time as the primary figure; when actual differs it
appears beneath in accent colour; log time appears as a caption when present.

`canCompleteAt` validates **actual** against now — never planned, and never the
log time, which is by definition the present moment.

## Consequences

- Editing "when it actually happened" is a first-class action (⋯ menu), not a
  hidden detail.
- An entry logged on a later day is detectable (`loggedLate`) and labelled.
