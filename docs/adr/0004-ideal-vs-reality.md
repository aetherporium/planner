# ADR-0004 — The Blueprint is an ideal; the Log is reality; blank is neither

**Status:** Accepted

## Context

The brief set out three rules that most task apps get wrong:

1. "at default blank meaning there is no info it being done or not"
2. "when you say action done, it must be in the past... so you don't lie"
3. "not doing don't get you punished, instead you log or say the time you did it"

## Decision

### Two separate models

**Blueprint** = rules describing an ordinary day of a given kind. **Log** = entries
describing what actually happened. They never merge. The gap between them is data.

### Four states, not two

`unknown` · `done` · `skipped` · `rescheduled`

`unknown` is the default and is **not** failure. `summarise()` reports it in its own
column and computes adherence **only over answered occurrences**, so an unreviewed
week cannot drag a routine's percentage down. Pressing an already-set status clears
it back to blank — blank is a state you can return to.

### Completion is an observation about the past

`canCompleteAt()` rejects a `done` on a future day, and on a later time *today*.
The check is `(day, minute)` against `(today, now)` — a date-only check would let an
evening task be ticked at breakfast. The UI disables the button rather than failing
after the click.

`rescheduled` exists so "not now" has a non-judgemental answer.

### Reality can differ from the plan

An entry stores `atMin` — when it *actually* happened. If that differs from the
planned time the day view shows "actually 11:20" rather than overwriting the plan.
Unplanned work is logged with `unplanned: true` and counted in effort, never as an
error.

## Consequences

- No streaks, no scores, no red. The vocabulary is "said no", not "failed".
- Insights are built only from logged entries; blank days render blank.
- Cost: adherence is unavailable until something is answered, so the UI must say
  "no information yet" rather than showing 0%.
