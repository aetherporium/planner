# 0042 — Shaping a task is not logging it

Status: Accepted
Date: 2026-08-17

## Context

Clicking a task in Blueprints navigated to `#/task/<id>/<today>` — the day
page, where you tick it off, add an amount, mark it skipped. But Blueprints is
the list of what is *planned*. Arriving from it, the thing you want is to change
the plan; being shown a logging screen for today is an answer to a question you
did not ask.

Two different jobs had one destination.

## Decision

**A blueprint row opens editing.** The row is a `<button>` and opens a popup
holding the shape of the plan: name, description, start, duration, place,
frequency, per-date exceptions, and deletion. No logging control appears in it.

**Logging stays on the day.** Unchanged.

**Blocked dates are exceptions, not rule changes.** Cancelling one Tuesday must
not redefine "every Tuesday". A blocked date is stored as an ISO string in
`task.blocked` and filtered out in `tasksFor`; the rule is untouched and the
chip is one click to reverse.

**Built-ins are overridden, not mutated.** Defaults are rebuilt from code on
every load, so they cannot carry state. Edits go to `planner:defaultEdits` and
blocked dates to `planner:defaultBlocks`, both keyed by task id and merged in
`allTasks`. Deleting a built-in turns it off (`toggleDefault`) rather than
removing it, because it would return on the next load.

Deletion of a real task asks first and says plainly that its log goes with it.

## Consequences

`Blueprints` now holds two editing states — one for categories, one for tasks.
The task one stores an **id**, not the object: blocking a date changes the task
in the store, and a captured snapshot would keep rendering the version from
before the change. That was a real bug caught by the round-trip test.

Still missing from this form: category assignment, and the task kinds
(tally/measure/checklist) which have their own fields. Both are additive.
