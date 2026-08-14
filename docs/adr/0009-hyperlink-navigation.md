# ADR-0009 — Navigation is hyperlinks over a hash router

**Status:** Accepted

## Context

Navigation was JS click handlers calling `go()`. That gives no history: the
browser back button leaves the app entirely, and no page can be linked to.
The brief asks for hyperlink elements and for moving back and forth between
branched pages.

## Decision

Every navigation target is a real `<a href="#/...">`. Routes:

| Route | Page |
|---|---|
| `#/` | Today (main page) |
| `#/day/<jdn>` | Another day |
| `#/calendar` · `#/calendar/<ecY>-<ecM>` | Calendar, month anchored in the URL |
| `#/blueprints` | Blueprint index |
| `#/blueprint/<id>` | One blueprint |
| `#/task/<id>` | Task detail |

`hashchange` re-renders. Back and forward work, every page is shareable, and
month paging in the calendar is itself history — paging forward three months
then pressing back three times returns through them.

State-changing controls (Yes / No / toggle / remove) stay `<button>`. Only
navigation is an anchor.

## Consequences

- Task titles in the day rail are links into task detail, so the day is browsable.
- Breadcrumbs are anchors, and each blueprint page links to its siblings, so
  branches can be traversed without returning to an index.
