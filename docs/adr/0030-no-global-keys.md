# ADR-0030 — Nothing opens itself because a key was pressed

**Status:** Accepted (revokes the shortcut from ADR-0012)

## Context

Go anywhere opened on a bare `/` or ⌘K. The handler tried to guess whether you
were typing by inspecting `document.activeElement`, which is a guess that is
wrong often: it misses contenteditable regions it does not know about, native
pickers, iframes, and — worst — it fires when the app is not the thing you are
looking at, so switching back to the tab could find a search panel open and
your keystroke swallowed.

## Decision

**Keys only act while the panel is already open.** The listener is registered
inside the open branch and torn down on close; while closed the app binds no
global keys at all. You open the panel by clicking it.

The `/` hint on the button is gone too — advertising a shortcut that no longer
exists is worse than having none.

This is a rule for the whole app, not a fix to one component: nothing may take
focus, open, or navigate because of a keystroke the user did not aim at it.

## Consequences

- Arrow keys, Enter and Escape still work inside the open panel.
