# ADR-0007 — Never fabricate user data

**Status:** Accepted

## Context

The previous build seeded ~13 days of invented completion history so the charts
would look populated. That is false data: it showed the user a record of things
they never did, in an app whose core promise is an honest log.

## Decision

**The app starts empty.** The only pre-existing content is the default blueprint
(wake, breakfast, lunch, dinner, sleep) — those are *rules*, not claims that
anything happened. The log has zero entries until the user records one.

If a view has nothing to show, it says so plainly rather than inventing filler.

## Consequences

- Charts and aggregates were removed; with an empty log they had nothing honest
  to display, and inventing input to make a graph look good is the exact failure
  this ADR forbids.
- First-run looks sparse. That is correct — it reflects reality.
