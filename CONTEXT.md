# Context — Planner

Shared language. Every variable, function, test, and ticket uses these terms exactly.

## The domain in one line

Planner holds **Tasks** on **Pages**, seen through swappable **Views**, where plans
can **branch**.

## Glossary

| Term | Means | Explicitly NOT |
|---|---|---|
| **Task** | The atomic unit of planning. Always carries a Frequency and a Duration — neither is optional. | Not "todo", "item", "card", or "event". |
| **Page** | A named container of Tasks. The unit a person navigates between. | Not "project", "list", or "board" — Board is a View, not a container. |
| **View** | A way of rendering the Tasks on a Page. Swapping View never changes data. | Not "mode" or "layout". |
| **Frequency** | How often a Task recurs: `once`, `daily`, `weekly`, `monthly`. | Not a cron string, not a date. |
| **Duration** | Expected minutes of effort for one occurrence. | Not a deadline, not elapsed time. |
| **Branch** | A divergent version of a plan. The word the user used — see ADR-0002, it has three readings. | — |
| **Load** | Total Duration per week implied by a set of Tasks, given their Frequencies. | Not "workload" or "capacity". |

## Load — the one derived number that matters

Frequency and Duration are only interesting together. A 15-minute daily Task is a
bigger commitment than a 90-minute monthly one. Load makes that comparable:

```
weekly load = duration × occurrences per week
  once    → 0     (no recurring commitment)
  daily   → × 7
  weekly  → × 1
  monthly → × 0.23   (12 / 52)
```

Every View surfaces Load, because a plan that looks reasonable as a list of Tasks is
often impossible once totalled.

## Open question the prototype exists to answer

**What does "branching" mean here?** Three readings, three different products —
see ADR-0002. The prototype renders one variant per reading so the question can be
answered by clicking rather than by argument.
