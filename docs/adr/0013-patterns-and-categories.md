# ADR-0013 — Patterns are observed, categories are authored

**Status:** Accepted (replaces the blueprint index)

## Context

Blueprints were a fixed directory of nine rules, most of them empty, each its
own page. That put nine shelves on screen when the user owned one. It also
conflated two different ideas under one word.

## Decision

Two groupings, side by side on one page, doing different jobs.

**Patterns are observed.** A pattern is the recurrence a task already has,
noticed and named. `patternsIn(tasks)` derives them from the task list:

- **Nothing empty is ever shown.** No task every weekend means no Weekends
  pattern. An empty shelf is not a thing you own.
- **Ordered by how often they fire**, most frequent first — Daily (365),
  Weekdays (261), Weekends (104), a named weekday (52), Ethiopian monthly (13),
  Gregorian monthly (12), Holidays (9).
- Names drop the word "every": *Daily*, *Weekdays*, *Monday*, *Holidays*.
- An unrecognised recurrence still gets a shelf, named `Pattern 1`, `Pattern 2`
  in first-seen order.
- They render as a **side-scrolling strip of rectangles**, so a user with
  twelve patterns scrolls rather than drowning.

**Categories are authored.** The user's own grouping — School, Home — with a
colour they pick and can change. A task holds one category and keeps whatever
pattern its recurrence implies; the two never fight. Deleting a category
releases its tasks rather than deleting them.

## Consequences

- Blueprints is now primarily a **task-adding page**: the primary affordance is
  "New task", and the explanatory card is gone.
- `#/blueprint/<id>` no longer exists. Patterns expand in place.
- Defaults are product, not user data, so a default's category is stored
  separately in `planner:defaultCats` rather than mutating the default.


## Amendment — expansion, and a vocabulary of its own

Two follow-up corrections:

**Categories expand in place.** Clicking a category opened a new view, which
broke the one-view rule and made a grouping feel like a destination. A category
now expands inline under its own header; the hash does not change.

**A blueprint is not a day.** Pattern contents reused the day page's row style,
so a blueprint looked like today. It now renders as a **schedule strip**: a
time, a proportional duration bar, a name. It shows the *shape* of a kind of
day without pretending to be a timeline — no hour ruler, no now-marker, no
24-hour canvas. Ordering runs from dawn, so Wake comes first.
