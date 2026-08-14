# ADR-0019 — Views have kinds, and expanding is not navigating

**Status:** Accepted

## Context

"One view at a time" was read too literally: every expansion became a whole
page. Clicking a pattern replaced the screen; clicking a category did too. But
opening a thing to look inside it is not the same act as going somewhere, and
collapsing the two made the app feel like a file browser.

## Decision

A view has a **kind**, chosen by what the interaction means.

| Kind | What it is | When |
|---|---|---|
| **Full** | The whole surface. A place you navigate to. | Day, Calendar, Blueprints, Task, Add |
| **Half** | A panel over the page, page still visible behind. | Go anywhere |
| **Popup** | A window over the page, sized to its content, dismissable. | Opening a pattern or a category |
| **Inline** | Grows in place inside its own row. | Small disclosures, notes |

The rule: **clicking a thing to see inside it opens a popup; clicking a thing
to go somewhere loads a full view.** Only full views change the hash and enter
history. Popups and halves close on Escape, on a click outside, and on any
navigation.

"One view at a time" still holds for full views — the day and the calendar are
never on screen together. A popup is not a second view; it is the same view
with something opened on top of it.

## Consequences

- Patterns and categories on Blueprints open as popups, not pages and not
  inline expansion.
- The Blueprints page is **primarily for adding tasks**. Patterns and
  categories are secondary furniture on it, not the point of it.
- Going back does not close a popup — Escape does. Popups are not history.
