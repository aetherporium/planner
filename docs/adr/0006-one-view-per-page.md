# ADR-0006 — One view per page, interlinked; no chrome navigation

**Status:** Accepted (supersedes the tabbed shell in the previous build)

## Context

The first build used a persistent top bar with four tabs, and the Today page
showed a calendar in a sidebar. Feedback: show one thing at a time, navigate by
links inside the content, and give each blueprint its own page rather than a
filter.

## Decision

- **One view per page.** The Today page shows the day and nothing else — no
  calendar, no summary panel, no second column.
- **No top bar, no sidebar.** Navigation is a breadcrumb at the top plus link
  cards in the flow of the content. Every page is reachable from Today; every
  page can get back.
- **Each blueprint is a page.** `ንድፍ › በየቀኑ` is a real page, not a filter chip.
  The index lists rules with their counts and links into them.
- **No "how the day went" panel.** It was not requested and it turned a planner
  into a scorecard.
- **No insights page.** Removed entirely.

## Consequences

- Deeper navigation: seeing a blueprint takes two taps instead of one.
- Each page has a single obvious purpose, which is what makes one-thing-at-a-time
  work on a phone.
